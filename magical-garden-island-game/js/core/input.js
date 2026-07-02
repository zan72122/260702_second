// タッチ入力: バーチャルジョイスティック / カメラ回転 / ピンチズーム / タップ
import { clamp } from './utils.js';

const TAP_TIME = 320;   // ms
const TAP_DIST = 14;    // px

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.pointers = new Map(); // pointerId -> info
    this.joystick = null;      // {id, cx, cy, dx, dy}
    this.onTap = null;         // (x, y) => {}
    this.onDragCamera = null;  // (dx, dy) => {}
    this.onPinch = null;       // (scaleDelta) => {}
    this.onJoystick = null;    // ({x, y} | null) => {}
    this.enabled = true;

    // ジョイスティックの見た目
    this.joyBase = document.createElement('div');
    this.joyKnob = document.createElement('div');
    Object.assign(this.joyBase.style, {
      position: 'absolute', width: '110px', height: '110px', borderRadius: '50%',
      border: '3px solid rgba(255,255,255,.65)', background: 'rgba(255,182,220,.22)',
      transform: 'translate(-50%,-50%)', pointerEvents: 'none', display: 'none', zIndex: 30,
      boxShadow: '0 0 18px rgba(255,150,200,.35)',
    });
    Object.assign(this.joyKnob.style, {
      position: 'absolute', width: '52px', height: '52px', borderRadius: '50%',
      background: 'radial-gradient(circle at 35% 30%, #fff, #ffb3d9)',
      transform: 'translate(-50%,-50%)', pointerEvents: 'none', display: 'none', zIndex: 31,
      boxShadow: '0 3px 10px rgba(150,50,110,.45)',
    });
    document.getElementById('app').append(this.joyBase, this.joyKnob);

    canvas.addEventListener('pointerdown', (e) => this.down(e));
    canvas.addEventListener('pointermove', (e) => this.move(e));
    canvas.addEventListener('pointerup', (e) => this.up(e));
    canvas.addEventListener('pointercancel', (e) => this.up(e));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  down(e) {
    if (!this.enabled) return;
    this.canvas.setPointerCapture?.(e.pointerId);
    const info = {
      id: e.pointerId, x0: e.clientX, y0: e.clientY,
      x: e.clientX, y: e.clientY, t0: performance.now(),
      role: 'tap',
    };
    this.pointers.set(e.pointerId, info);

    // 2本目の指 → ピンチへ
    const ids = [...this.pointers.values()];
    if (ids.length === 2) {
      this.pinchDist = Math.hypot(ids[0].x - ids[1].x, ids[0].y - ids[1].y);
      ids.forEach((p) => { if (p.role !== 'joystick') p.role = 'pinch'; });
    }
  }

  move(e) {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    p.x = e.clientX; p.y = e.clientY;
    const dx = p.x - p.x0, dy = p.y - p.y0;
    const dist = Math.hypot(dx, dy);

    if (p.role === 'tap' && dist > TAP_DIST) {
      // 左側 40% で始まったドラッグはジョイスティック、それ以外はカメラ
      const isLeft = p.x0 < window.innerWidth * 0.42 && p.y0 > window.innerHeight * 0.3;
      if (isLeft && !this.joystick) {
        p.role = 'joystick';
        this.joystick = p;
        this.joyBase.style.display = 'block';
        this.joyKnob.style.display = 'block';
        this.joyBase.style.left = `${p.x0}px`;
        this.joyBase.style.top = `${p.y0}px`;
      } else {
        p.role = 'camera';
      }
    }

    if (p.role === 'joystick') {
      const R = 55;
      const jx = clamp(dx / R, -1, 1);
      const jy = clamp(dy / R, -1, 1);
      const len = Math.hypot(jx, jy);
      const nx = len > 1 ? jx / len : jx;
      const ny = len > 1 ? jy / len : jy;
      this.joyKnob.style.left = `${p.x0 + nx * R}px`;
      this.joyKnob.style.top = `${p.y0 + ny * R}px`;
      this.onJoystick?.({ x: nx, y: ny });
    } else if (p.role === 'camera') {
      const mdx = e.movementX ?? (p.x - (p.px ?? p.x));
      const mdy = e.movementY ?? (p.y - (p.py ?? p.y));
      this.onDragCamera?.(mdx, mdy);
    } else if (p.role === 'pinch') {
      const ids = [...this.pointers.values()].filter((q) => q.role === 'pinch');
      if (ids.length === 2) {
        const d = Math.hypot(ids[0].x - ids[1].x, ids[0].y - ids[1].y);
        if (this.pinchDist) this.onPinch?.(d / this.pinchDist);
        this.pinchDist = d;
      }
    }
    p.px = p.x; p.py = p.y;
  }

  up(e) {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    this.pointers.delete(e.pointerId);

    if (p.role === 'joystick') {
      this.joystick = null;
      this.joyBase.style.display = 'none';
      this.joyKnob.style.display = 'none';
      this.onJoystick?.(null);
    } else if (p.role === 'tap' && this.enabled) {
      const dt = performance.now() - p.t0;
      const dist = Math.hypot(p.x - p.x0, p.y - p.y0);
      if (dt < TAP_TIME && dist < TAP_DIST) this.onTap?.(p.x, p.y);
    }
    if (this.pointers.size < 2) this.pinchDist = null;
  }
}
