// シーン共通ヘルパー
import { clamp } from '../engine/utils.js';

// 一定レートで粒を注ぐ (音つき)
export class Pourer {
  constructor(rate = 90, speed = 30) {
    this.rate = rate; this.speed = speed;
    this.acc = 0; this.mat = 0;
    this.intensity = 0;
  }
  update(ctx, dt, on, x, y, spread = 2, dirX = 0, dirY = 1) {
    this.intensity += ((on ? 1 : 0) - this.intensity) * Math.min(1, dt * 8);
    if (!on) { this.acc = 0; return 0; }
    this.acc += this.rate * dt;
    let n = 0;
    while (this.acc >= 1) {
      this.acc -= 1;
      ctx.pour(x + (Math.random() - 0.5) * spread, y, dirX * this.speed, dirY * this.speed, this.mat);
      n++;
    }
    return n;
  }
}

// 指で持つ道具 (カプセル群で形を作り、動かすと粒を押せる)
// segs: [[x0,y0,x1,y1], ...] ローカル座標
export class ToolRig {
  constructor(sim, segs, r = 1.3, mu = 0.4) {
    this.segs = segs;
    this.cols = segs.map(() => {
      const c = { kind: 'capsule', ax: -999, ay: -999, bx: -999, by: -998, r, vx: 0, vy: 0, off: true, noSolid: true, mu };
      sim.colliders.push(c);
      return c;
    });
    this.x = -999; this.y = -999; this.ang = 0;
    this.scale = 1;
  }
  place(x, y, ang, dt) {
    const co = Math.cos(ang), si = Math.sin(ang);
    const firstTime = this.x < -500;
    for (let i = 0; i < this.segs.length; i++) {
      const [lx0, ly0, lx1, ly1] = this.segs[i];
      const c = this.cols[i];
      const oldAx = c.ax, oldAy = c.ay;
      c.ax = x + (lx0 * co - ly0 * si) * this.scale;
      c.ay = y + (lx0 * si + ly0 * co) * this.scale;
      c.bx = x + (lx1 * co - ly1 * si) * this.scale;
      c.by = y + (lx1 * si + ly1 * co) * this.scale;
      if (firstTime || dt <= 0) { c.vx = 0; c.vy = 0; }
      else {
        c.vx = (c.ax - oldAx) / dt;
        c.vy = (c.ay - oldAy) / dt;
      }
      c.off = false;
    }
    this.x = x; this.y = y; this.ang = ang;
  }
  hide() {
    for (const c of this.cols) { c.off = true; c.ax = c.bx = -999; c.vx = c.vy = 0; }
    this.x = -999;
  }
}

// ある矩形内の粒数
export function countInRect(sim, x0, y0, x1, y1, matId = -1) {
  let c = 0;
  for (let i = 0; i < sim.n; i++) {
    if (sim.x[i] >= x0 && sim.x[i] <= x1 && sim.y[i] >= y0 && sim.y[i] <= y1 &&
        (matId < 0 || sim.mat[i] === matId)) c++;
  }
  return c;
}

// 液面ならぬ「粒面」が目標ラインにどれだけ近いか (0..1, ぴったり=1)
export function levelProgress(sim, cx, lineY, bottomY, tol = 3) {
  const top = Math.min(sim.topAt(cx - 6, 3), sim.topAt(cx, 3), sim.topAt(cx + 6, 3));
  const diff = top - lineY; // 正: まだ足りない
  if (Math.abs(diff) <= tol) return { done: true, frac: 1, top };
  const frac = clamp(1 - Math.max(0, diff) / Math.max(1, bottomY - lineY), 0, 1);
  return { done: false, frac: Math.min(0.92, frac * 0.92), top };
}
