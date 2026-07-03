// てのひら水路ラボ — アプリ本体
//
// カメラに映る自分の手が、そのまま水路・ダム・器になる実験あそび。
// ジェスチャーコマンドは一切なし: 手の形と動きが直接物理として働く。
//
// レイヤー構成 (下から):
//   #back  … ミラー表示のカメラ映像 + 青いトーン + ガジェット背景 (半解像度)
//   #fluid … WebGL2 スクリーンスペース流体 (背景を屈折 → 水ごしに自分の手が見える)
//   #over  … 手のグロー輪郭・おもちゃ・ガジェット前景・エフェクト

import { FluidSim } from './engine/sim.js';
import { FluidRenderer } from './engine/renderer.js';
import { Effects } from './engine/fx.js';
import { Sfx } from './engine/audio.js';
import { Toys } from './engine/toys.js';
import { PointerInput } from './engine/input.js';
import { clamp } from './engine/utils.js';
import { Tracker } from './hand/tracker.js';
import { Mapper } from './hand/mapping.js';
import { HandShape } from './hand/colliders.js';
import { TouchHands } from './hand/touchhands.js';
import { FakeHands } from './hand/fakehands.js';
import { Spouts } from './game/spouts.js';
import { Gadgets } from './game/gadgets.js';
import { drawHands, contactFeedback } from './game/handviz.js';
import { UI } from './game/ui.js';

const $ = (s) => document.querySelector(s);
const BACK_SCALE = 0.5;          // 背景キャンバスの解像度 (dpr比)
const ATTRACT_AFTER = 15;        // 無操作でおばけの手が出るまでの秒数

// 適応品質ティア: [水粒子上限, 検出間隔(フレーム), 背景アップロード間隔, 屈折]
const TIERS = [
  { cap: 1800, detectEvery: 2, backEvery: 1, refract: 1.1, rate: 1.0 },
  { cap: 1300, detectEvery: 2, backEvery: 2, refract: 1.1, rate: 0.8 },
  { cap: 900, detectEvery: 3, backEvery: 2, refract: 0, rate: 0.6 },
];

class App {
  constructor() {
    this.debug = location.search.includes('debug');
    this.fakeMode = location.search.includes('fakehands');

    // ---- エンジン ----
    this.sim = new FluidSim(2600);
    this.sim.h = 3.6;
    this.sim.gravityY = 430;
    this.sim.substeps = 2;
    // 相: 0=みず 1=にじいろ 2=あわ
    this.sim.definePhase(0, { sigma: 6, beta: 0.8, grav: 1, mix: 0.35, group: 0, color: [0.38, 0.66, 1.0], alpha: 0.85 });
    this.sim.definePhase(1, { sigma: 6, beta: 0.8, grav: 1, mix: 0.9, group: 0, color: [1.0, 0.62, 0.8], alpha: 0.9 });
    this.sim.definePhase(2, { sigma: 3.5, beta: 0.4, grav: -0.35, mix: 0, group: 1, repel: 0.35, color: [0.82, 0.94, 1.0], alpha: 0.45 });

    this.fx = new Effects();
    this.sfx = new Sfx();
    this.toys = new Toys(110);
    this.spouts = new Spouts();
    this.gadgets = new Gadgets(this.sim, this.fx, this.sfx);
    this.ui = new UI();

    // ---- 手 ----
    this.tracker = new Tracker();
    this.mapper = new Mapper();
    this.touchHands = new TouchHands();
    this.hands = [new HandShape(0), new HandShape(1)];         // カメラ (または fakehands) の手
    this.ghosts = [new HandShape(0), new HandShape(1)];        // アトラクトのおばけの手
    for (const g of this.ghosts) g.ghost = true;
    this.fake = this.fakeMode ? new FakeHands() : null;
    if (this.fake) this.fake.scripted = location.search.includes('script');
    this.attractFake = new FakeHands();
    this._tmp42 = new Float32Array(42);
    this._touchShape = { id: 1, alpha: 1, ghost: false, capsules: [] };

    // ---- 状態 ----
    this.playing = false;
    this.idleT = 0;              // 手もタッチもない時間 (アトラクト用)
    this.attract = false;
    this.tier = 0;
    this.frame = 0;
    this.frameMs = 16;
    this._tierT = 0;
    this._recycle = 0;
    this._seenHandToast = false;
    this._backCount = 0;

    // ---- キャンバス ----
    this.backC = $('#back');
    this.fluidC = $('#fluid');
    this.overC = $('#over');
    this.backG = this.backC.getContext('2d');
    this.overG = this.overC.getContext('2d');
    this.renderer = new FluidRenderer(this.fluidC);

    // ---- 入力 ----
    this.pointer = new PointerInput($('#stage'), (cx, cy) => {
      const r = $('#stage').getBoundingClientRect();
      return [(cx - r.left) * this.u, (cy - r.top) * this.u];
    });
    this.pointer.onDown = (p) => {
      this.sfx.unlock();
      this.idleT = 0;
      this.touchHands.down(p);
      this.fx.addRing(p.x, p.y, 5, 0.5);
    };
    this.pointer.onMove = (p) => { this.touchHands.move(p); };
    this.pointer.onUp = (p) => { this.touchHands.up(p); };

    // ---- UI ----
    this.ui.bind();
    this.ui.setSound(this.sfx.muted);
    this.ui.onStart = () => this.start();
    this.ui.onSpout = (id) => {
      this.sfx.unlock(); this.sfx.pop(1.2);
      this.spouts.setType(id);
      this.ui.setSpout(id);
    };
    this.ui.onDuck = () => {
      this.sfx.unlock();
      // 手が出ていればその上に、いなければ雲から落とす
      const hand = this.hands.find((h) => h.alpha > 0.5);
      const [dx] = hand ? hand.palmCenter() : [this.spouts.x];
      this.gadgets.addDuck(clamp(dx, 8, this.W - 8), 6);
    };
    this.ui.onReset = () => {
      this.sfx.unlock(); this.sfx.pop(0.8);
      this.resetWorld();
      this.ui.toast('まっさらに したよ!');
    };
    this.ui.onSound = () => {
      this.sfx.unlock();
      this.sfx.setMuted(!this.sfx.muted);
      this.ui.setSound(this.sfx.muted);
    };
    this.ui.onCamera = () => {
      this.sfx.unlock();
      if (this.tracker.cameraState === 'on') {
        this.tracker.stopCamera();
        this.ui.setCameraBadge('touch');
        this.ui.toast('ゆびモードに したよ');
      } else {
        this.startCameraFlow(true);
      }
    };
    this.ui.setSpout('water');

    // ---- サイズ ----
    window.addEventListener('resize', () => this._resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this._resize(), 250));
    this._resize();

    if (this.debug || this.fakeMode) window.__app = this;
    if (location.search.includes('autostart')) this.start();

    this.last = performance.now();
    requestAnimationFrame((t) => this._loop(t));
  }

  // ---- 開始フロー ----
  start() {
    this.sfx.unlock();
    this.ui.hideBoot();
    this.playing = true;
    this.sfx.chime();
    if (this.fakeMode) {
      this.ui.setCameraBadge('touch');
      return;                      // テスト時はカメラを触らない
    }
    this.startCameraFlow(false);
  }

  async startCameraFlow(fromButton) {
    this.ui.setCameraBadge('loading');
    this.ui.setLoadProgress(0.02);
    const [camOk, modelOk] = await Promise.all([
      this.tracker.startCamera(),
      this.tracker.loadModel((v) => this.ui.setLoadProgress(v * 0.98)),
    ]);
    if (camOk && modelOk) {
      this.ui.setLoadProgress(1);
      this.ui.setCameraBadge('on');
      this.fx.burstConfetti(this.W / 2, this.H * 0.3, 40);
      this.sfx.fanfare();
      this.ui.toast('カメラに てを うつしてみて!', 3200);
      this.mapper.update(this.tracker.video?.videoWidth, this.tracker.video?.videoHeight, this.W, this.H);
    } else {
      this.ui.setLoadProgress(null);
      this.ui.setCameraBadge('touch');
      if (this.tracker.cameraState === 'denied') {
        this.ui.toast('カメラが つかえないから ゆびで あそぼう!', 3600);
      } else if (!modelOk) {
        this.ui.toast('ゆびで あそぼう! (よみこみ しっぱい)', 3600);
      } else {
        this.ui.toast('ゆびで あそぼう!', 3000);
      }
      if (fromButton && this.tracker.cameraState === 'denied') {
        this.ui.toast('カメラを ゆるして もういちど おしてね', 3600);
      }
    }
  }

  resetWorld() {
    this.sim.n = 0;
    this.sim.solids.length = 0;
    this.gadgets.ducks.length = 0;
    this.gadgets.fish.length = 0;
    this.gadgets.pools.length = 0;
    this.toys.clear();
    this.fx.clear();
  }

  // ---- サイズ / 座標 ----
  _resize() {
    const stage = $('#stage');
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.dpr = dpr;
    this.pxPerUnit = Math.min(w, h) / 100;
    this.u = 1 / this.pxPerUnit;
    const oldW = this.W, oldH = this.H;
    this.W = w * this.u;
    this.H = h * this.u;
    this.backC.width = Math.round(w * dpr * BACK_SCALE);
    this.backC.height = Math.round(h * dpr * BACK_SCALE);
    this.overC.width = Math.round(w * dpr);
    this.overC.height = Math.round(h * dpr);
    this.renderer.resize(Math.round(w * dpr), Math.round(h * dpr));
    // 粒子・剛体を相似変換して画面回転に追従
    if (oldW && oldH && (oldW !== this.W || oldH !== this.H)) {
      const kx = this.W / oldW, ky = this.H / oldH;
      const s = this.sim;
      for (let i = 0; i < s.n; i++) {
        s.x[i] *= kx; s.y[i] *= ky;
        s.px[i] = s.x[i]; s.py[i] = s.y[i];
        s.vx[i] = 0; s.vy[i] = 0;
      }
      for (const so of s.solids) { so.x *= kx; so.y *= ky; }
    }
    this.sim.setBounds(this.W, this.H, { top: false, bottom: false, left: true, right: true });
    this.mapper.update(this.tracker.video?.videoWidth, this.tracker.video?.videoHeight, this.W, this.H);
    this.gadgets.layout(this.W, this.H);
  }

  // 満杯でも注げる放出 (静かな古い粒子をリサイクル)
  pour(x, y, vx, vy, phase) {
    const s = this.sim;
    const cap = Math.min(s.max, TIERS[this.tier].cap);
    if (s.n >= cap - 1) {
      let tries = 0, i = this._recycle;
      while (tries < 60) {
        i = (i + 1) % s.n;
        if (s.rest[i] > 3 || s.age[i] > 22) break;
        tries++;
      }
      this._recycle = i;
      s.kill(i % s.n);
    }
    return s.emit(x, y, vx + (Math.random() - 0.5) * 8, vy + (Math.random() - 0.5) * 8, phase);
  }

  // 正規化ランドマーク → HandShape 更新 (60fpsへのなめらか補間つき)
  _driveHand(shape, norm, dt) {
    const target = this.mapper.mapAll(norm, this._tmp42);
    if (!shape.eased) shape.eased = new Float32Array(42);
    if (!shape.active) {
      shape.eased.set(target);
      shape.active = true;
      shape.hasPrev = false;
    } else {
      const k = 1 - Math.exp(-dt * 26);
      for (let i = 0; i < 42; i++) shape.eased[i] += (target[i] - shape.eased[i]) * k;
    }
    shape.updateFromWorld(shape.eased, dt);
  }

  // ---- メインループ ----
  _loop(now) {
    requestAnimationFrame((t) => this._loop(t));
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (dt <= 0) return;
    dt = Math.min(dt, 1 / 30);
    this.frameMs = this.frameMs * 0.95 + dt * 1000 * 0.05;
    this.frame++;
    if (!this.playing) return;

    const { sim, fx, W, H } = this;
    const tier = TIERS[this.tier];
    this.pointer.tick(dt);
    this.touchHands.update(dt, this.pointer.pointers);

    // ---- 手の更新 ----
    let anyHand = false;
    if (this.fake) {
      // テスト: FakeHands が本物のパイプラインへ流れる
      const fh = this.fake.scripted ? this.fake.update(dt) : this.fake.hands;
      for (let i = 0; i < 2; i++) {
        const shape = this.hands[i];
        if (fh[i].present) {
          this._driveHand(shape, fh[i].norm, dt);
          shape.lostT = 0;
          anyHand = true;
        } else {
          shape.release();
        }
        shape.alpha = clamp(shape.alpha + ((fh[i].present ? 1 : 0) - shape.alpha) * Math.min(1, dt * 7), 0, 1);
      }
    } else if (this.tracker.running) {
      const doDetect = this.frame % tier.detectEvery === 0;
      const slots = this.tracker.update(dt, doDetect);
      for (let i = 0; i < 2; i++) {
        const slot = slots[i], shape = this.hands[i];
        if (slot.present) {
          // 検出は数フレームおきだが、毎フレーム最後のターゲットへ補間し続ける。
          // 見失い猶予中もターゲットが動かないだけで、速度は自然に減衰する。
          this._driveHand(shape, slot.filter.out, dt);
          anyHand = true;
        } else if (shape.active) {
          shape.release();
        }
        shape.alpha = clamp(shape.alpha + ((slot.present ? 1 : 0) - shape.alpha) * Math.min(1, dt * 7), 0, 1);
      }
      if (anyHand && !this._seenHandToast) {
        this._seenHandToast = true;
        this.ui.toast('てが みえたよ! みずを うけてみて', 3000);
        this.sfx.chime();
      }
    }

    // ---- アトラクトモード (おばけの手のお手本) ----
    const touching = this.pointer.pointers.size > 0;
    if (anyHand || touching) { this.idleT = 0; if (this.attract) this._stopAttract(); }
    else if (!this.fakeMode) {
      this.idleT += dt;
      if (!this.attract && this.idleT > ATTRACT_AFTER) {
        this.attract = true;
        this.attractFake.reset();
        this.ui.toast('てを かざしてね!', 2800);
      }
    }
    if (this.attract) {
      const fh = this.attractFake.update(dt);
      for (let i = 0; i < 2; i++) {
        const shape = this.ghosts[i];
        if (fh[i].present) { this._driveHand(shape, fh[i].norm, dt); shape.lostT = 0; }
        else shape.release();
        shape.alpha = clamp(shape.alpha + ((fh[i].present ? 0.8 : 0) - shape.alpha) * Math.min(1, dt * 5), 0, 1);
      }
    }

    // ---- コライダー合成: ガジェット → 手 → タッチ ----
    this.gadgets.update(dt, W, H);
    sim.colliders.length = 0;
    sim.drains.length = 0;
    for (const c of this.gadgets.colliders) sim.colliders.push(c);
    const liveShapes = [];
    const pushShape = (shape) => {
      liveShapes.push(shape);
      for (const c of shape.capsules) sim.colliders.push(c);
      for (const d of shape.drains) if (d.on) sim.drains.push(d);
    };
    for (const shape of this.hands) {
      if (shape.active && shape.alpha > 0.15) pushShape(shape);
    }
    if (this.attract) {
      for (const shape of this.ghosts) {
        if (shape.active && shape.alpha > 0.15) pushShape(shape);
      }
    }
    for (const c of this.touchHands.capsules) sim.colliders.push(c);
    this._touchShape.capsules = this.touchHands.capsules;

    // ---- 放出 & 物理 ----
    this.spouts.rate = tier.rate;
    this.spouts.update(dt, W, H, (x, y, vx, vy, ph) => this.pour(x, y, vx, vy, ph), this.toys, sim);
    sim.step(dt);
    this.toys.update(dt, sim, sim.colliders, W, H, 430);
    fx.update(dt, sim);

    // ---- 画面外の回収 & あわのポップ ----
    const m = 25;
    for (let i = sim.n - 1; i >= 0; i--) {
      if (sim.phase[i] === 2 && sim.y[i] < 4) {
        fx.addFoam(sim.x[i], Math.max(2, sim.y[i]), 1.2, 2.5);
        if (Math.random() < 0.12) this.sfx.bubblePop(0.9 + Math.random() * 0.4);
        sim.kill(i);
        continue;
      }
      if (sim.y[i] > H + m || sim.x[i] < -m || sim.x[i] > W + m || sim.y[i] < -H) sim.kill(i);
    }

    // ---- 因果フィードバック (水 × 手) ----
    const contact = contactFeedback(sim, liveShapes.concat(this._touchShape.capsules.length ? [this._touchShape] : []), fx);
    if (contact > 0.1 && Math.random() < contact * 0.25) this.sfx.plink();
    let speed = 0;
    for (const s of liveShapes) speed = Math.max(speed, s.meanSpeed());
    this.sfx.setSwoosh(clamp(speed / 130, 0, 1) * clamp(contact * 3, 0.15, 1));
    const pouring = this.spouts.current === 'water' || this.spouts.current === 'rainbow';
    this.sfx.setPour(pouring ? 0.5 + contact * 0.3 : 0, 1 + contact * 0.5);

    // ---- 描画 ----
    this._drawBack(tier);
    this.renderer.render(sim, { W, H, shine: 1.0, refract: tier.refract, thresh: 0.36, radius: 1.0 });
    this._drawOver(dt);

    // ---- 適応品質 ----
    this._tierT += dt;
    if (this._tierT > 2) {
      this._tierT = 0;
      if (this.frameMs > 24 && this.tier < TIERS.length - 1) this.tier++;
      else if (this.frameMs < 14 && this.tier > 0) this.tier--;
    }
  }

  _drawBack(tier) {
    this._backCount++;
    if (this._backCount % tier.backEvery !== 0 && this._backUploaded) return;
    const g = this.backG;
    const s = this.dpr * BACK_SCALE * this.pxPerUnit;
    g.setTransform(s, 0, 0, s, 0, 0);
    const { W, H } = this;
    const video = this.tracker.video;
    if (video && this.tracker.cameraState === 'on' && video.readyState >= 2) {
      this.mapper.drawVideo(g, video);
      // 世界に「入った」感じの青いトーン + 底へのグラデーション
      g.fillStyle = 'rgba(10,24,52,0.42)';
      g.fillRect(0, 0, W, H);
      const grad = g.createLinearGradient(0, H * 0.55, 0, H);
      grad.addColorStop(0, 'rgba(8,18,40,0)');
      grad.addColorStop(1, 'rgba(8,18,40,0.55)');
      g.fillStyle = grad;
      g.fillRect(0, H * 0.5, W, H * 0.5);
    } else {
      // カメラなし: 深い水色の背景と光のすじ
      const grad = g.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#1d3a6b');
      grad.addColorStop(1, '#0c1a33');
      g.fillStyle = grad;
      g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(120,180,255,0.05)';
      for (let i = 0; i < 3; i++) {
        const x = W * (0.25 + i * 0.25) + Math.sin(performance.now() / 3000 + i * 2) * 4;
        g.beginPath();
        g.moveTo(x - 6, 0); g.lineTo(x + 6, 0);
        g.lineTo(x + 16, H); g.lineTo(x - 16, H);
        g.fill();
      }
    }
    this.gadgets.drawBack(g);
    this.renderer.uploadBackdrop(this.backC);
    this._backUploaded = true;
  }

  _drawOver(dt) {
    const g = this.overG;
    g.setTransform(this.dpr * this.pxPerUnit, 0, 0, this.dpr * this.pxPerUnit, 0, 0);
    g.clearRect(0, 0, this.W, this.H);
    this.spouts.draw(g, this.W, this.H);
    this.gadgets.drawFront(g);
    this.toys.draw(g);
    // 手 (カメラ + おばけ + タッチ)
    const shapes = [];
    for (const h of this.hands) if (h.alpha > 0.01) shapes.push(h);
    if (this.attract) for (const h of this.ghosts) if (h.alpha > 0.01) shapes.push(h);
    if (this._touchShape.capsules.length) shapes.push(this._touchShape);
    drawHands(g, shapes, performance.now() / 1000);
    this.fx.draw(g);
    if (this.debug) {
      g.fillStyle = '#0f0';
      g.font = '3px monospace';
      g.fillText(
        `${this.frameMs.toFixed(1)}ms n=${this.sim.n} tier=${this.tier} detect=${this.tracker.detectMs.toFixed(1)}ms cam=${this.tracker.cameraState} model=${this.tracker.modelState}`,
        2, this.H - 2,
      );
    }
  }

  _stopAttract() {
    this.attract = false;
    this.idleT = 0;
    for (const shape of this.ghosts) { shape.release(); shape.alpha = 0; }
  }
}

addEventListener('DOMContentLoaded', () => new App());
