// 2D スペクトルレイトレーサ
// レイ = { x, y, dx, dy, l(波長nm), I(強度), inside(要素id|null) }
// 要素 kinds:
//  mirror   { ax,ay,bx,by }                     正反射
//  screen   { ax,ay,bx,by, hits[] }             当たったら記録して停止
//  absorber { ax,ay,bx,by }                     停止
//  grating  { ax,ay,bx,by, d(nm), orders }      回折格子 (透過型/反射型)
//  glass    { pts:[[x,y]..], mat }              多角形の屈折体 (プリズム・レンズ形)
//  circle   { x,y,r, mat }                      円形の屈折体 (水滴・球レンズ)
// 戻り値: セグメント列 [{x0,y0,x1,y1,l,I}] (描画用) + スクリーンへの記録

import { refIndex } from './spectrum.js';

const EPS = 1e-6;

function segHit(px, py, dx, dy, ax, ay, bx, by) {
  // レイ (p + t·d) と線分 (a→b) の交差。t>EPS, 0<=u<=1
  const ex = bx - ax, ey = by - ay;
  const den = dx * ey - dy * ex;
  if (Math.abs(den) < 1e-12) return null;
  const t = ((ax - px) * ey - (ay - py) * ex) / den;
  const u = ((ax - px) * dy - (ay - py) * dx) / den;
  if (t > EPS && u >= 0 && u <= 1) return { t, u };
  return null;
}

function circleHit(px, py, dx, dy, cx, cy, r) {
  const ox = px - cx, oy = py - cy;
  const b = ox * dx + oy * dy;
  const c = ox * ox + oy * oy - r * r;
  const disc = b * b - c;
  if (disc < 0) return null;
  const sq = Math.sqrt(disc);
  let t = -b - sq;
  if (t <= EPS) t = -b + sq;
  if (t <= EPS) return null;
  return { t };
}

function pointInPoly(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// フレネル反射率 (s/p 平均、非偏光)
export function fresnelR(cosI, n1, n2) {
  const sinT2 = (n1 / n2) * (n1 / n2) * (1 - cosI * cosI);
  if (sinT2 >= 1) return 1; // 全反射
  const cosT = Math.sqrt(1 - sinT2);
  const rs = (n1 * cosI - n2 * cosT) / (n1 * cosI + n2 * cosT);
  const rp = (n1 * cosT - n2 * cosI) / (n1 * cosT + n2 * cosI);
  return (rs * rs + rp * rp) / 2;
}

// 屈折方向 (単位ベクトル)。全反射なら null
function refractDir(dx, dy, nx, ny, n1, n2) {
  const cosI = -(dx * nx + dy * ny);
  const eta = n1 / n2;
  const k = 1 - eta * eta * (1 - cosI * cosI);
  if (k < 0) return null;
  const kk = eta * cosI - Math.sqrt(k);
  return [eta * dx + kk * nx, eta * dy + kk * ny];
}

export class Tracer {
  constructor() {
    this.elements = [];
    this.maxBounce = 14;
    this.minI = 0.015;
    this.maxSegs = 4000;
  }

  clear() { this.elements.length = 0; }
  add(el) { this.elements.push(el); return el; }

  _nearest(px, py, dx, dy, prevEl, prevSide) {
    let best = null;
    for (const el of this.elements) {
      if (el.off) continue;
      if (el.kind === 'circle') {
        const h = circleHit(px, py, dx, dy, el.x, el.y, el.r);
        if (h && (!best || h.t < best.t)) best = { t: h.t, el };
      } else if (el.kind === 'glass') {
        const pts = el.pts;
        for (let i = 0; i < pts.length; i++) {
          const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
          const h = segHit(px, py, dx, dy, ax, ay, bx, by);
          if (h && (!best || h.t < best.t)) best = { t: h.t, el, edge: i, u: h.u };
        }
      } else {
        const h = segHit(px, py, dx, dy, el.ax, el.ay, el.bx, el.by);
        if (h && (!best || h.t < best.t)) best = { t: h.t, el, u: h.u };
      }
    }
    return best;
  }

  // 1本のレイを追跡。segs に描画用線分を積み、スクリーンには hits を記録
  trace(ray, segs, depth = 0) {
    let { x, y, dx, dy, l, I } = ray;
    let inside = ray.inside || null;
    for (let b = 0; b < this.maxBounce; b++) {
      if (segs.length > this.maxSegs) return;
      const hit = this._nearest(x, y, dx, dy);
      if (!hit) {
        // 画面外へ
        segs.push({ x0: x, y0: y, x1: x + dx * 500, y1: y + dy * 500, l, I });
        return;
      }
      const hx = x + dx * hit.t, hy = y + dy * hit.t;
      segs.push({ x0: x, y0: y, x1: hx, y1: hy, l, I });
      const el = hit.el;

      if (el.kind === 'screen') {
        (el.hits || (el.hits = [])).push({ u: hit.u, l, I });
        return;
      }
      if (el.kind === 'absorber') return;

      if (el.kind === 'mirror') {
        let nx = -(el.by - el.ay), ny = el.bx - el.ax;
        const len = Math.hypot(nx, ny) || 1;
        nx /= len; ny /= len;
        const d = dx * nx + dy * ny;
        dx -= 2 * d * nx; dy -= 2 * d * ny;
        const loss = el.reflect ?? 0.92;
        I *= loss;
        if (I < this.minI) return;
        x = hx + dx * EPS * 4; y = hy + dy * EPS * 4;
        if (el.onHit) el.onHit(hx, hy, I, l);
        continue;
      }

      if (el.kind === 'grating') {
        // 回折格子: 0次 (正反射/直進) + ±orders 次
        let nx = -(el.by - el.ay), ny = el.bx - el.ax;
        const len = Math.hypot(nx, ny) || 1;
        nx /= len; ny /= len;
        if (dx * nx + dy * ny > 0) { nx = -nx; ny = -ny; }
        const tx = -ny, ty = nx; // 接線
        const sinI = dx * tx + dy * ty;
        const orders = el.orders ?? 2;
        const dSpac = el.d ?? 1600; // nm
        const refl = el.reflective !== false; // CD は反射型
        for (let m = -orders; m <= orders; m++) {
          const sinM = sinI + (m * l) / dSpac;
          if (Math.abs(sinM) >= 1) continue;
          const cosM = Math.sqrt(1 - sinM * sinM);
          const sgn = refl ? 1 : -1; // 反射型は法線側に返す
          const ndx = tx * sinM + nx * cosM * sgn;
          const ndy = ty * sinM + ny * cosM * sgn;
          const Im = I * (m === 0 ? 0.22 : 0.78 / (Math.abs(m) * 2)) * (el.gain ?? 1);
          if (Im < this.minI) continue;
          if (depth < 3) {
            this.trace({ x: hx + ndx * 0.01, y: hy + ndy * 0.01, dx: ndx, dy: ndy, l, I: Im }, segs, depth + 1);
          }
        }
        return;
      }

      // 屈折体 (glass polygon / circle)
      let nx, ny, wasInside;
      if (el.kind === 'circle') {
        nx = (hx - el.x) / el.r; ny = (hy - el.y) / el.r;
        wasInside = inside === el;
      } else {
        const [ax, ay] = el.pts[hit.edge], [bx, by] = el.pts[(hit.edge + 1) % el.pts.length];
        nx = -(by - ay); ny = bx - ax;
        const len = Math.hypot(nx, ny) || 1;
        nx /= len; ny /= len;
        wasInside = inside === el;
      }
      // 法線をレイに向ける
      if (dx * nx + dy * ny > 0) { nx = -nx; ny = -ny; }
      const nMat = refIndex(el.mat || 'glass', l) * (el.nScale ?? 1);
      const n1 = wasInside ? nMat : 1;
      const n2 = wasInside ? 1 : nMat;
      const cosI = -(dx * nx + dy * ny);
      const R = fresnelR(Math.abs(cosI), n1, n2);
      const T = refractDir(dx, dy, nx, ny, n1, n2);

      // 反射枝 (強ければ分岐して追跡)
      const Ir = I * R;
      if (Ir > this.minI * 2 && depth < 5) {
        const d0 = dx * nx + dy * ny;
        const rdx = dx - 2 * d0 * nx, rdy = dy - 2 * d0 * ny;
        this.trace({
          x: hx + rdx * 0.01, y: hy + rdy * 0.01, dx: rdx, dy: rdy, l, I: Ir,
          inside: wasInside ? el : null,
        }, segs, depth + 1);
      }
      if (!T) {
        // 全反射: 主枝が反射に
        const d0 = dx * nx + dy * ny;
        dx -= 2 * d0 * nx; dy -= 2 * d0 * ny;
        I *= 0.985;
        if (I < this.minI) return;
        x = hx + dx * 0.01; y = hy + dy * 0.01;
        continue;
      }
      // 透過が主枝
      I *= (1 - R) * (el.absorb ? 1 - el.absorb : 1);
      if (I < this.minI) return;
      dx = T[0]; dy = T[1];
      inside = wasInside ? null : el;
      x = hx + dx * 0.01; y = hy + dy * 0.01;
    }
  }

  // 白色光線: スペクトル束を1本ずつ追跡
  traceWhite(x, y, dx, dy, I, spectrum, segs) {
    for (const s of spectrum) {
      this.trace({ x, y, dx, dy, l: s.l, I: I / spectrum.length * 3 }, segs);
    }
  }
}

export { pointInPoly };
