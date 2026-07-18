// タッチ / ポインター / 端末の傾き・シェイク入力

export class PointerInput {
  constructor(el, toWorld) {
    this.el = el;
    this.toWorld = toWorld;       // (clientX, clientY) → [wx, wy]
    this.pointers = new Map();    // id → {x,y,px,py,down,t}
    this.onDown = null; this.onMove = null; this.onUp = null;
    this.primary = null;

    const opts = { passive: false };
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      el.setPointerCapture?.(e.pointerId);
      const [x, y] = this.toWorld(e.clientX, e.clientY);
      const p = { id: e.pointerId, x, y, px: x, py: y, vx: 0, vy: 0, down: true, t: 0 };
      this.pointers.set(e.pointerId, p);
      if (!this.primary || !this.pointers.has(this.primary.id)) this.primary = p;
      this.onDown && this.onDown(p);
    }, opts);
    el.addEventListener('pointermove', (e) => {
      const p = this.pointers.get(e.pointerId);
      if (!p) return;
      e.preventDefault();
      const [x, y] = this.toWorld(e.clientX, e.clientY);
      p.x = x; p.y = y;
      this.onMove && this.onMove(p);
    }, opts);
    const up = (e) => {
      const p = this.pointers.get(e.pointerId);
      if (!p) return;
      this.pointers.delete(e.pointerId);
      if (this.primary === p) this.primary = this.pointers.values().next().value || null;
      this.onUp && this.onUp(p);
    };
    el.addEventListener('pointerup', up, opts);
    el.addEventListener('pointercancel', up, opts);
    // iOS でのダブルタップズーム等を抑止
    el.addEventListener('touchstart', (e) => e.preventDefault(), opts);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // フレームごとに速度を更新
  tick(dt) {
    for (const p of this.pointers.values()) {
      p.vx = (p.x - p.px) / Math.max(dt, 1e-3);
      p.vy = (p.y - p.py) / Math.max(dt, 1e-3);
      p.px = p.x; p.py = p.y;
      p.t += dt;
    }
  }
}

export class TiltInput {
  constructor() {
    this.enabled = false;
    this.available = typeof DeviceOrientationEvent !== 'undefined';
    this.gx = 0; this.gy = 1; // 正規化重力方向 (デフォルト下向き)
    this.shakeMag = 0;
    this.onShake = null;
    this._bound = false;
  }

  async enable() {
    if (!this.available) return false;
    try {
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        const res = await DeviceOrientationEvent.requestPermission();
        if (res !== 'granted') return false;
      }
      if (typeof DeviceMotionEvent !== 'undefined' &&
          typeof DeviceMotionEvent.requestPermission === 'function') {
        try { await DeviceMotionEvent.requestPermission(); } catch (e) { /* 任意 */ }
      }
    } catch (e) { return false; }
    if (!this._bound) {
      window.addEventListener('deviceorientation', (e) => this._onOrient(e));
      window.addEventListener('devicemotion', (e) => this._onMotion(e));
      this._bound = true;
    }
    this.enabled = true;
    return true;
  }

  disable() { this.enabled = false; this.gx = 0; this.gy = 1; }

  _onOrient(e) {
    if (!this.enabled || e.beta === null) return;
    // beta: 前後傾き(x軸), gamma: 左右傾き(y軸)
    const rad = Math.PI / 180;
    const beta = e.beta * rad, gamma = e.gamma * rad;
    // 端末座標系での重力ベクトル
    let gx = Math.sin(gamma) * Math.cos(beta);
    let gy = Math.sin(beta);
    // 画面回転補正
    const ang = (screen.orientation?.angle ?? window.orientation ?? 0) * rad;
    const c = Math.cos(ang), s = Math.sin(ang);
    const rx = gx * c + gy * s;
    const ry = -gx * s + gy * c;
    // 平らに持つと真下、立てると画面下向き
    const mag = Math.hypot(rx, ry);
    const flat = Math.max(0, 1 - mag * 1.4);
    this.gx = rx + 0 * flat;
    this.gy = ry + flat; // 平置き時は画面下向きに落ちる
    const m = Math.hypot(this.gx, this.gy) || 1;
    this.gx /= m; this.gy /= m;
  }

  _onMotion(e) {
    if (!this.enabled) return;
    const a = e.acceleration;
    if (!a || a.x === null) return;
    const mag = Math.hypot(a.x, a.y, a.z || 0);
    this.shakeMag = this.shakeMag * 0.85 + mag * 0.15;
    if (this.shakeMag > 12 && this.onShake) this.onShake(this.shakeMag);
  }
}
