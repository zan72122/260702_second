// マルチタッチ / ポインター入力 (everyday-fluid-lab の PointerInput と同じ)

export class PointerInput {
  constructor(el, toWorld) {
    this.el = el;
    this.toWorld = toWorld;       // (clientX, clientY) → [wx, wy]
    this.pointers = new Map();    // id → {x,y,px,py,vx,vy,down,t}
    this.onDown = null; this.onMove = null; this.onUp = null;

    const opts = { passive: false };
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      el.setPointerCapture?.(e.pointerId);
      const [x, y] = this.toWorld(e.clientX, e.clientY);
      const p = { id: e.pointerId, x, y, px: x, py: y, vx: 0, vy: 0, down: true, t: 0 };
      this.pointers.set(e.pointerId, p);
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
      this.onUp && this.onUp(p);
    };
    el.addEventListener('pointerup', up, opts);
    el.addEventListener('pointercancel', up, opts);
    // iOS でのダブルタップズーム等を抑止
    el.addEventListener('touchstart', (e) => e.preventDefault(), opts);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  tick(dt) {
    for (const p of this.pointers.values()) {
      p.vx = (p.x - p.px) / Math.max(dt, 1e-3);
      p.vy = (p.y - p.py) / Math.max(dt, 1e-3);
      p.px = p.x; p.py = p.y;
      p.t += dt;
    }
  }
}
