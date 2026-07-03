// カメラ + MediaPipe HandLandmarker のライフサイクル管理
// - モデル/wasm はすべてローカル同梱 (lib/tasks-vision/, assets/) — CDN 不使用
// - 検出は数フレームに1回 (detectEvery) に間引いて 60fps を守る
// - 手の対応づけ: 前フレームの手首位置に最も近い検出を同じスロットへ
// - 見失っても 0.3 秒はカプセルを保持 (おわんの水が一瞬でこぼれない)

import { HandFilter } from './smoothing.js';

const WASM_DIR = 'lib/tasks-vision/wasm';
const MODEL_URL = 'assets/hand_landmarker.task';
const HOLD_TIME = 0.3;   // 見失い猶予 (秒)

export class Tracker {
  constructor() {
    this.video = null;
    this.stream = null;
    this.landmarker = null;
    this.cameraState = 'idle';   // idle | starting | on | denied | error
    this.modelState = 'idle';    // idle | loading | ready | error
    this.modelProgress = 0;
    this.detectMs = 0;           // 直近の検出所要時間 (デバッグ表示用)
    this._lastVideoTime = -1;
    this._lastTs = 0;
    // 手スロット (最大2)
    this.slots = [
      { present: false, lostT: 99, norm: new Float32Array(42), filter: new HandFilter(), wx: 0.5, wy: 0.5 },
      { present: false, lostT: 99, norm: new Float32Array(42), filter: new HandFilter(), wx: 0.5, wy: 0.5 },
    ];
  }

  get running() { return this.cameraState === 'on' && this.modelState === 'ready'; }

  async startCamera() {
    if (this.cameraState === 'on' || this.cameraState === 'starting') return this.cameraState === 'on';
    this.cameraState = 'starting';
    try {
      // facingMode は ideal (ソフト制約) — 前面カメラが無い環境でも失敗させない
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'user' }, width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
      } catch (e1) {
        if (e1.name === 'NotAllowedError' || e1.name === 'SecurityError') throw e1;
        this.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      const v = document.createElement('video');
      v.setAttribute('playsinline', '');
      v.muted = true;
      v.autoplay = true;
      v.srcObject = this.stream;
      await v.play().catch(() => {});
      // メタデータ待ち (videoWidth が入るまで)
      if (!v.videoWidth) {
        await new Promise((res) => {
          const to = setTimeout(res, 4000);
          v.addEventListener('loadedmetadata', () => { clearTimeout(to); res(); }, { once: true });
        });
      }
      this.video = v;
      this.cameraState = 'on';
      return true;
    } catch (e) {
      this.cameraState = (e && (e.name === 'NotAllowedError' || e.name === 'SecurityError')) ? 'denied' : 'error';
      return false;
    }
  }

  stopCamera() {
    if (this.stream) {
      for (const t of this.stream.getTracks()) t.stop();
      this.stream = null;
    }
    this.video = null;
    this.cameraState = 'idle';
    for (const s of this.slots) { s.present = false; s.lostT = 99; }
  }

  async loadModel(onProgress) {
    if (this.modelState === 'ready' || this.modelState === 'loading') return this.modelState === 'ready';
    this.modelState = 'loading';
    try {
      const { FilesetResolver, HandLandmarker } = await import('../../lib/tasks-vision/vision_bundle.mjs');
      const fileset = await FilesetResolver.forVisionTasks(WASM_DIR);
      this.modelProgress = 0.2;  // wasm ロード完了ぶん
      onProgress?.(0.2);
      // モデルを進捗つきでフェッチ
      const res = await fetch(MODEL_URL);
      if (!res.ok) throw new Error('model fetch: ' + res.status);
      const total = +res.headers.get('Content-Length') || 7800000;
      const reader = res.body.getReader();
      const chunks = [];
      let got = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        got += value.length;
        this.modelProgress = 0.2 + 0.75 * Math.min(1, got / total);
        onProgress?.(this.modelProgress);
      }
      const buf = new Uint8Array(got);
      let off = 0;
      for (const c of chunks) { buf.set(c, off); off += c.length; }
      const opts = (delegate) => ({
        baseOptions: { modelAssetBuffer: buf, delegate },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      try {
        this.landmarker = await HandLandmarker.createFromOptions(fileset, opts('GPU'));
      } catch (e) {
        console.warn('GPU delegate 失敗 → CPU で再試行', e);
        this.landmarker = await HandLandmarker.createFromOptions(fileset, opts('CPU'));
      }
      this.modelState = 'ready';
      this.modelProgress = 1;
      onProgress?.(1);
      return true;
    } catch (e) {
      console.warn('手認識モデルのロード失敗', e);
      this.modelState = 'error';
      return false;
    }
  }

  // 毎フレーム呼ぶ。doDetect=true のフレームだけ実際に検出を回す。
  // 戻り値: slots (present/norm 更新済み)
  update(dt, doDetect) {
    for (const s of this.slots) s.lostT += dt;

    if (this.running && doDetect && this.video && this.video.readyState >= 2 &&
        this.video.currentTime !== this._lastVideoTime) {
      this._lastVideoTime = this.video.currentTime;
      let ts = performance.now();
      if (ts <= this._lastTs) ts = this._lastTs + 0.1;  // 単調増加を保証
      this._lastTs = ts;
      const t0 = performance.now();
      let result = null;
      try {
        result = this.landmarker.detectForVideo(this.video, ts);
      } catch (e) { /* 一時的な検出エラーは無視 */ }
      this.detectMs = this.detectMs * 0.8 + (performance.now() - t0) * 0.2;
      if (result) this._assign(result, dt);
    }

    // 猶予切れの手を解放
    for (const s of this.slots) {
      if (s.present && s.lostT > HOLD_TIME) {
        s.present = false;
        s.filter.reset();
      }
    }
    return this.slots;
  }

  // 検出結果を既存スロットへ (手首位置の近さで対応づけ)
  _assign(result, dt) {
    const dets = result.landmarks || [];
    const used = [false, false];
    const claimed = [false, false];
    // 1st pass: 近いスロットにマッチ
    const order = [];
    for (let d = 0; d < Math.min(2, dets.length); d++) {
      for (let s = 0; s < 2; s++) {
        if (!this.slots[s].present) continue;
        const dx = dets[d][0].x - this.slots[s].wx;
        const dy = dets[d][0].y - this.slots[s].wy;
        order.push([dx * dx + dy * dy, d, s]);
      }
    }
    order.sort((a, b) => a[0] - b[0]);
    const pairs = [];
    for (const [dist2, d, s] of order) {
      if (used[d] || claimed[s] || dist2 > 0.16) continue;
      used[d] = true; claimed[s] = true;
      pairs.push([d, s]);
    }
    // 2nd pass: 残りは空きスロットへ
    for (let d = 0; d < Math.min(2, dets.length); d++) {
      if (used[d]) continue;
      for (let s = 0; s < 2; s++) {
        if (claimed[s]) continue;
        used[d] = true; claimed[s] = true;
        pairs.push([d, s]);
        if (!this.slots[s].present) this.slots[s].filter.reset();
        break;
      }
    }
    for (const [d, s] of pairs) {
      const slot = this.slots[s];
      const lm = dets[d];
      const raw = slot.norm;
      for (let i = 0; i < 21; i++) {
        raw[i * 2] = lm[i].x;
        raw[i * 2 + 1] = lm[i].y;
      }
      // 検出間隔ぶんの dt でフィルター (30Hz なら ~0.033)
      slot.filter.filter(raw, Math.max(dt, 0.016));
      slot.wx = lm[0].x; slot.wy = lm[0].y;
      slot.present = true;
      slot.lostT = 0;
    }
  }
}
