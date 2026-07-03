// 粒子ベース流体ソルバー (everyday-fluid-lab の FluidSim を拡張)
// Clavet, Beaudoin, Poulin "Particle-based Viscoelastic Fluid Simulation" (2005) の
// ダブル密度緩和 (double density relaxation) 方式。
// 粘性・多相流体(混ざる/混ざらない)・比重差(浮力)・剛体との相互作用に対応。
// このゲーム向けの拡張:
//  - カプセル衝突を空間グリッドで枝刈り (手のカプセルが約40本あるため必須)
//  - pooledClusters(): 静止した水のまとまり(手のおわんに溜まった水)の検出

import { clamp } from './utils.js';

const MAXN = 26; // 1粒子あたりの近傍数の上限

export class FluidSim {
  constructor(max = 3600) {
    this.max = max;
    this.n = 0;
    const F = Float32Array;
    this.x = new F(max); this.y = new F(max);
    this.px = new F(max); this.py = new F(max);
    this.vx = new F(max); this.vy = new F(max);
    this.cr = new F(max); this.cg = new F(max); this.cb = new F(max);
    this.ca = new F(max);            // 見た目の不透明度 (0..1)
    this.phase = new Uint8Array(max);
    this.age = new F(max);
    this.rest = new F(max);          // 静止時間(秒) — ケチャップの定着などに使う

    // ソルバー定数 (world 単位: 短辺=100)
    this.h = 3.6;                 // 相互作用半径
    this.restDensity = 1.3;       // Σ(1-q)^2 の目標値
    this.stiffness = 240;
    this.nearStiffness = 2400;
    this.gravityX = 0;
    this.gravityY = 430;
    this.maxSpeedK = 0.45;        // CFL: サブステップあたり h*この係数まで
    this.substeps = 2;

    // 相 (最大6)
    // sigma/beta: 粘性(線形/二次), grav: 比重, repel: 他相との反発(非混和),
    // mix: 同グループ内の色拡散率, group: 混ざり合うグループ id
    this.phases = [];
    for (let i = 0; i < 6; i++) this.definePhase(i, {});

    this.bounds = { w: 100, h: 160, top: false, left: true, right: true, bottom: true };
    this.colliders = [];   // {kind:'box'|'circle'|'capsule', ...}
    this.solids = [];      // 剛体円 (浮くもの)
    // 排水路 (開いた指のすき間): {ax,ay,bx,by,r,hand}
    // このゾーン内の粒子は同じ hand のカプセル衝突を無視する
    // (3D世界で指の間の穴から手の奥へ抜け落ちる水の 2.5D 近似)
    this.drains = [];
    this._drainMark = new Int32Array(max);
    this._drainStamp = 0;

    // 近傍リスト
    this.nCount = new Uint8Array(max);
    this.nList = new Int32Array(max * MAXN);
    this.nDist = new F(max * MAXN);
    this.pBuf = new F(max);   // 圧力
    this.pnBuf = new F(max);  // 近距離圧力

    this._grid = null;
    this.onKill = null;       // 粒子が消える時のフック(x,y,phase)
    this._setupGrid();
  }

  definePhase(id, p) {
    this.phases[id] = Object.assign({
      sigma: 8, beta: 1.2, grav: 1, repel: 0, mix: 0, group: id,
      color: [0.3, 0.6, 1], alpha: 0.8,
    }, p);
    return this.phases[id];
  }

  setBounds(w, h, opts = {}) {
    this.bounds = Object.assign({ w, h, top: false, left: true, right: true, bottom: true }, opts, { w, h });
    this._setupGrid();
  }

  _setupGrid() {
    const cs = this.h;
    this.gw = Math.max(4, Math.ceil(this.bounds.w / cs) + 2);
    this.gh = Math.max(4, Math.ceil(this.bounds.h / cs) + 2);
    const cells = this.gw * this.gh;
    this.cellCount = new Int32Array(cells + 1);
    this.cellStart = new Int32Array(cells + 1);
    this.cellPart = new Int32Array(this.max);
    this.cellOf = new Int32Array(this.max);
  }

  clear() { this.n = 0; this.solids.length = 0; this.colliders.length = 0; }

  emit(x, y, vx, vy, phase, jitter = 0.6) {
    if (this.n >= this.max) return -1;
    const i = this.n++;
    const ph = this.phases[phase];
    this.x[i] = x + (Math.random() - 0.5) * jitter;
    this.y[i] = y + (Math.random() - 0.5) * jitter;
    this.px[i] = this.x[i]; this.py[i] = this.y[i];
    this.vx[i] = vx; this.vy[i] = vy;
    const c = ph.color;
    this.cr[i] = c[0]; this.cg[i] = c[1]; this.cb[i] = c[2];
    this.ca[i] = ph.alpha;
    this.phase[i] = phase;
    this.age[i] = 0; this.rest[i] = 0;
    this.nCount[i] = 0;
    return i;
  }

  kill(i) {
    if (this.onKill) this.onKill(this.x[i], this.y[i], this.phase[i], i);
    const l = --this.n;
    if (i !== l) {
      this.x[i] = this.x[l]; this.y[i] = this.y[l];
      this.px[i] = this.px[l]; this.py[i] = this.py[l];
      this.vx[i] = this.vx[l]; this.vy[i] = this.vy[l];
      this.cr[i] = this.cr[l]; this.cg[i] = this.cg[l]; this.cb[i] = this.cb[l];
      this.ca[i] = this.ca[l]; this.phase[i] = this.phase[l];
      this.age[i] = this.age[l]; this.rest[i] = this.rest[l];
      this.nCount[i] = 0;
    }
  }

  addSolid(s) {
    const o = Object.assign({
      x: 0, y: 0, r: 5, vx: 0, vy: 0, angle: 0, va: 0,
      density: 0.5,      // 流体比 (1未満で浮く)
      drag: 3.5,         // 流体追従の強さ
      upright: 0,        // 起き上がりトルク (アヒル用)
      collide: true,     // 流体を押しのけるか
      wet: 0,            // 水没率 (出力)
      static: false,
      hitWall: null,     // 壁ヒット時フック(speed)
      data: {},
    }, s);
    this.solids.push(o);
    return o;
  }

  // ---- 近傍構築 ----
  _buildGrid() {
    const { gw, gh, h, n } = this;
    const cc = this.cellCount; cc.fill(0);
    const inv = 1 / h;
    for (let i = 0; i < n; i++) {
      const cx = clamp((this.x[i] * inv + 1) | 0, 0, gw - 1);
      const cy = clamp((this.y[i] * inv + 1) | 0, 0, gh - 1);
      const c = cy * gw + cx;
      this.cellOf[i] = c;
      cc[c]++;
    }
    let sum = 0;
    for (let c = 0; c < gw * gh; c++) { this.cellStart[c] = sum; sum += cc[c]; cc[c] = this.cellStart[c]; }
    this.cellStart[gw * gh] = sum;
    for (let i = 0; i < n; i++) this.cellPart[cc[this.cellOf[i]]++] = i;
  }

  _buildNeighbors() {
    const { gw, gh, h, n } = this;
    const h2 = h * h, inv = 1 / h;
    const X = this.x, Y = this.y, nc = this.nCount, nl = this.nList, nd = this.nDist;
    const cs = this.cellStart, cp = this.cellPart;
    for (let i = 0; i < n; i++) {
      const xi = X[i], yi = Y[i];
      const cx = clamp((xi * inv + 1) | 0, 0, gw - 1);
      const cy = clamp((yi * inv + 1) | 0, 0, gh - 1);
      let cnt = 0;
      const base = i * MAXN;
      const y0 = Math.max(0, cy - 1), y1 = Math.min(gh - 1, cy + 1);
      const x0 = Math.max(0, cx - 1), x1 = Math.min(gw - 1, cx + 1);
      for (let gy = y0; gy <= y1 && cnt < MAXN; gy++) {
        for (let gx = x0; gx <= x1 && cnt < MAXN; gx++) {
          const c = gy * gw + gx;
          for (let k = cs[c], e = cs[c + 1]; k < e && cnt < MAXN; k++) {
            const j = cp[k];
            if (j === i) continue;
            const dx = X[j] - xi, dy = Y[j] - yi;
            const d2 = dx * dx + dy * dy;
            if (d2 < h2 && d2 > 1e-8) {
              nl[base + cnt] = j;
              nd[base + cnt] = Math.sqrt(d2);
              cnt++;
            }
          }
        }
      }
      nc[i] = cnt;
    }
  }

  // ---- メインステップ ----
  step(dt) {
    const sub = this.substeps;
    const sdt = dt / sub;
    for (let s = 0; s < sub; s++) this._substep(sdt);
    this._mixColors(dt);
    // 静止時間・年齢
    for (let i = 0; i < this.n; i++) {
      this.age[i] += dt;
      const sp = Math.abs(this.vx[i]) + Math.abs(this.vy[i]);
      this.rest[i] = sp < 14 ? this.rest[i] + dt : 0;
    }
  }

  _substep(sdt) {
    const n = this.n, h = this.h;
    const X = this.x, Y = this.y, VX = this.vx, VY = this.vy;
    const gx = this.gravityX, gy = this.gravityY;
    const PH = this.phase, phs = this.phases;

    // 1) 重力 (相ごとの比重)
    for (let i = 0; i < n; i++) {
      const g = phs[PH[i]].grav;
      VX[i] += gx * g * sdt;
      VY[i] += gy * g * sdt;
    }

    // 2) 粘性 (前サブステップの近傍リストを流用)
    this._viscosity(sdt);

    // 3) 移流
    const vmax = this.maxSpeedK * h / sdt, vmax2 = vmax * vmax;
    for (let i = 0; i < n; i++) {
      const v2 = VX[i] * VX[i] + VY[i] * VY[i];
      if (v2 > vmax2) { const k = vmax / Math.sqrt(v2); VX[i] *= k; VY[i] *= k; }
      this.px[i] = X[i]; this.py[i] = Y[i];
      X[i] += VX[i] * sdt; Y[i] += VY[i] * sdt;
    }

    // 4) 近傍再構築
    this._buildGrid();
    this._buildNeighbors();

    // 5) ダブル密度緩和
    this._relax(sdt);

    // 6) 衝突
    this._collideSolids(sdt);
    this._collideStatic(sdt);

    // 7) 速度更新
    const inv = 1 / sdt;
    for (let i = 0; i < n; i++) {
      VX[i] = (X[i] - this.px[i]) * inv;
      VY[i] = (Y[i] - this.py[i]) * inv;
    }
  }

  _viscosity(sdt) {
    const n = this.n, h = this.h;
    const X = this.x, Y = this.y, VX = this.vx, VY = this.vy;
    const nc = this.nCount, nl = this.nList, nd = this.nDist;
    const PH = this.phase, phs = this.phases;
    for (let i = 0; i < n; i++) {
      const base = i * MAXN, cnt = nc[i];
      const pi = phs[PH[i]];
      for (let k = 0; k < cnt; k++) {
        const j = nl[base + k];
        if (j >= n || j <= i) continue; // ペアは1回だけ
        const d = nd[base + k];
        const q = d / h; if (q >= 1) continue;
        let rx = X[j] - X[i], ry = Y[j] - Y[i];
        const dl = Math.sqrt(rx * rx + ry * ry) || 1;
        rx /= dl; ry /= dl;
        const u = (VX[i] - VX[j]) * rx + (VY[i] - VY[j]) * ry;
        if (u <= 0) continue;
        const pj = phs[PH[j]];
        const sig = (pi.sigma + pj.sigma) * 0.5, bet = (pi.beta + pj.beta) * 0.5;
        let I = sdt * (1 - q) * (sig * u + bet * u * u);
        if (I > u) I = u; // 過剰減衰防止
        const ix = I * 0.5 * rx, iy = I * 0.5 * ry;
        VX[i] -= ix; VY[i] -= iy;
        VX[j] += ix; VY[j] += iy;
      }
    }
  }

  _relax(sdt) {
    const n = this.n, h = this.h;
    const X = this.x, Y = this.y;
    const nc = this.nCount, nl = this.nList, nd = this.nDist;
    const P = this.pBuf, PN = this.pnBuf;
    const k = this.stiffness, kn = this.nearStiffness, rho0 = this.restDensity;
    const PH = this.phase, phs = this.phases;
    const dt2 = sdt * sdt;

    // 密度→圧力
    for (let i = 0; i < n; i++) {
      const base = i * MAXN, cnt = nc[i];
      let rho = 0, rhoN = 0;
      for (let kk = 0; kk < cnt; kk++) {
        const q = 1 - nd[base + kk] / h;
        if (q <= 0) continue;
        rho += q * q; rhoN += q * q * q;
      }
      P[i] = k * (rho - rho0);
      PN[i] = kn * rhoN;
    }

    // 変位分配
    const maxD = h * 0.35;
    for (let i = 0; i < n; i++) {
      const base = i * MAXN, cnt = nc[i];
      const pi = P[i], pni = PN[i];
      const phi = PH[i], gi = phs[phi];
      let dxi = 0, dyi = 0;
      for (let kk = 0; kk < cnt; kk++) {
        const j = nl[base + kk];
        if (j >= n) continue;
        let rx = X[j] - X[i], ry = Y[j] - Y[i];
        const d = Math.sqrt(rx * rx + ry * ry);
        if (d < 1e-6 || d >= h) continue;
        const q = 1 - d / h;
        // 非混和: 異相間は圧力を割り増しして界面を作る
        let m = 1;
        if (PH[j] !== phi) {
          const gj = phs[PH[j]];
          m = 1 + Math.max(gi.repel, gj.repel);
        }
        let D = dt2 * (pi * q + pni * q * q) * m;
        if (D > maxD) D = maxD; else if (D < -maxD) D = -maxD;
        const s = D / d * 0.5;
        const ddx = rx * s, ddy = ry * s;
        X[j] += ddx; Y[j] += ddy;
        dxi -= ddx; dyi -= ddy;
      }
      X[i] += dxi; Y[i] += dyi;
    }
  }

  // ---- 衝突 ----
  _collideStatic(sdt) {
    const n = this.n, b = this.bounds, r = this.h * 0.28;
    const X = this.x, Y = this.y;
    for (let i = 0; i < n; i++) {
      if (b.left && X[i] < r) X[i] = r + (Math.random() * 0.01);
      if (b.right && X[i] > b.w - r) X[i] = b.w - r;
      if (b.bottom && Y[i] > b.h - r) Y[i] = b.h - r;
      if (b.top && Y[i] < r) Y[i] = r;
    }
    this._markDrains();
    for (const c of this.colliders) {
      if (c.off) continue;
      if (c.kind === 'box') this._colBox(c);
      else if (c.kind === 'circle') this._colCircle(c, sdt);
      else if (c.kind === 'capsule') this._colCapsule(c, sdt);
    }
  }

  // 排水路の中にいる粒子に印をつける (グリッドで枝刈り)
  _markDrains() {
    this._drainStamp++;
    if (!this.drains.length) return;
    const X = this.x, Y = this.y;
    const inv = 1 / this.h, gw = this.gw, gh = this.gh;
    const cs = this.cellStart, cp = this.cellPart, n = this.n;
    const mark = this._drainMark;
    for (const d of this.drains) {
      const ex = d.bx - d.ax, ey = d.by - d.ay;
      const el2 = ex * ex + ey * ey || 1e-6;
      const R = d.r, R2 = R * R;
      const stampVal = (this._drainStamp << 1) | (d.hand & 1);
      const x0 = clamp((((Math.min(d.ax, d.bx) - R) * inv + 1) | 0) - 1, 0, gw - 1);
      const x1 = clamp((((Math.max(d.ax, d.bx) + R) * inv + 1) | 0) + 1, 0, gw - 1);
      const y0 = clamp((((Math.min(d.ay, d.by) - R) * inv + 1) | 0) - 1, 0, gh - 1);
      const y1 = clamp((((Math.max(d.ay, d.by) + R) * inv + 1) | 0) + 1, 0, gh - 1);
      for (let gy = y0; gy <= y1; gy++) {
        for (let gx = x0; gx <= x1; gx++) {
          const cell = gy * gw + gx;
          for (let k = cs[cell], e = cs[cell + 1]; k < e; k++) {
            const i = cp[k];
            if (i >= n) continue;
            const px = X[i] - d.ax, py = Y[i] - d.ay;
            let t = (px * ex + py * ey) / el2;
            t = t < 0 ? 0 : t > 1 ? 1 : t;
            const dx = X[i] - (d.ax + ex * t), dy = Y[i] - (d.ay + ey * t);
            if (dx * dx + dy * dy < R2) mark[i] = stampVal;
          }
        }
      }
    }
  }

  _colBox(c) {
    const n = this.n, X = this.x, Y = this.y, r = this.h * 0.25;
    const x0 = c.x - c.hw - r, x1 = c.x + c.hw + r;
    const y0 = c.y - c.hh - r, y1 = c.y + c.hh + r;
    for (let i = 0; i < n; i++) {
      const x = X[i], y = Y[i];
      if (x <= x0 || x >= x1 || y <= y0 || y >= y1) continue;
      // 最小押し出し
      const dx0 = x - x0, dx1 = x1 - x, dy0 = y - y0, dy1 = y1 - y;
      const m = Math.min(dx0, dx1, dy0, dy1);
      if (m === dy0) Y[i] = y0;
      else if (m === dy1) Y[i] = y1;
      else if (m === dx0) X[i] = x0;
      else X[i] = x1;
    }
  }

  _colCircle(c, sdt) {
    const n = this.n, X = this.x, Y = this.y;
    const R = c.r + this.h * 0.25, R2 = R * R;
    const cvx = clamp(c.vx || 0, -260, 260), cvy = clamp(c.vy || 0, -260, 260);
    for (let i = 0; i < n; i++) {
      const dx = X[i] - c.x, dy = Y[i] - c.y;
      const d2 = dx * dx + dy * dy;
      if (d2 >= R2) continue;
      const d = Math.sqrt(d2) || 0.001;
      const nx = dx / d, ny = dy / d;
      X[i] = c.x + nx * R; Y[i] = c.y + ny * R;
      // 動く円は運動を伝える
      if (cvx || cvy) { X[i] += cvx * sdt * 0.9; Y[i] += cvy * sdt * 0.9; }
    }
  }

  // グリッド枝刈り版: カプセルAABBが重なるセルの粒子だけを調べる。
  // 手のカプセル約40本 × 粒子1800個 の総当たりを避ける。
  _colCapsule(c, sdt) {
    const X = this.x, Y = this.y;
    const ax = c.ax, ay = c.ay;
    const ex = c.bx - ax, ey = c.by - ay;
    const el2 = ex * ex + ey * ey || 1e-6;
    // スキンは薄め (h*0.18): 開いた指の間を水がすり抜けられる余地を残す
    const R = c.r + this.h * 0.18, R2 = R * R;
    const cvx = clamp(c.vx || 0, -260, 260), cvy = clamp(c.vy || 0, -260, 260);
    const inv = 1 / this.h, gw = this.gw, gh = this.gh;
    // ±1セルの余白: グリッド構築後に粒子が緩和で動いても取りこぼさない
    const x0 = clamp((((Math.min(ax, c.bx) - R) * inv + 1) | 0) - 1, 0, gw - 1);
    const x1 = clamp((((Math.max(ax, c.bx) + R) * inv + 1) | 0) + 1, 0, gw - 1);
    const y0 = clamp((((Math.min(ay, c.by) - R) * inv + 1) | 0) - 1, 0, gh - 1);
    const y1 = clamp((((Math.max(ay, c.by) + R) * inv + 1) | 0) + 1, 0, gh - 1);
    const cs = this.cellStart, cp = this.cellPart, n = this.n;
    // 開いた指のすき間 (排水路) の中にいる粒子はこの手と衝突しない
    const isHand = c.hand !== undefined;
    const drainVal = isHand ? ((this._drainStamp << 1) | (c.hand & 1)) : 0;
    const mark = this._drainMark;
    for (let gy = y0; gy <= y1; gy++) {
      for (let gx = x0; gx <= x1; gx++) {
        const cell = gy * gw + gx;
        for (let k = cs[cell], e = cs[cell + 1]; k < e; k++) {
          const i = cp[k];
          if (i >= n) continue;
          if (isHand && mark[i] === drainVal) continue;
          const px = X[i] - ax, py = Y[i] - ay;
          let t = (px * ex + py * ey) / el2;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          const qx = ax + ex * t, qy = ay + ey * t;
          const dx = X[i] - qx, dy = Y[i] - qy;
          const d2 = dx * dx + dy * dy;
          if (d2 >= R2) continue;
          const d = Math.sqrt(d2) || 0.001;
          X[i] = qx + dx / d * R; Y[i] = qy + dy / d * R;
          if (cvx || cvy) { X[i] += cvx * sdt * 0.9; Y[i] += cvy * sdt * 0.9; }
        }
      }
    }
  }

  // ---- 剛体(浮体) ----
  _collideSolids(sdt) {
    const b = this.bounds;
    for (const s of this.solids) {
      if (s.static) { this._solidFluidPush(s, sdt); continue; }
      // 流体サンプリング: 円内の粒子数と平均速度
      let cnt = 0, fvx = 0, fvy = 0, cxs = 0;
      const rr = s.r + this.h * 0.6;
      this._forEachNear(s.x, s.y, rr, (i) => {
        cnt++; fvx += this.vx[i]; fvy += this.vy[i];
        cxs += (this.x[i] - s.x); // 左右非対称→回転のきっかけ
      });
      const spacing = this.h * 0.55;
      const expect = Math.PI * rr * rr / (spacing * spacing);
      const wet = clamp(cnt / Math.max(1, expect * 0.7), 0, 1);
      s.wet = wet;
      if (cnt > 0) { fvx /= cnt; fvy /= cnt; }
      // 重力 + 浮力
      const g = this.gravityY, gxx = this.gravityX;
      s.vy += g * sdt;
      s.vx += gxx * sdt;
      const buoy = wet * (1 / Math.max(0.08, s.density)) * 0.9;
      s.vy -= g * buoy * sdt * Math.min(1, wet * 1.4);
      s.vx -= gxx * buoy * sdt * Math.min(1, wet * 1.4);
      // 流体への追従(抗力)
      const dragK = clamp(s.drag * wet * sdt, 0, 0.85);
      s.vx += (fvx - s.vx) * dragK;
      s.vy += (fvy - s.vy) * dragK;
      // 回転: 流れ由来の微小トルク + 起き上がり
      if (cnt > 0) s.va += (cxs / cnt / s.r) * wet * sdt * 2;
      if (s.upright) s.va += -Math.sin(s.angle) * s.upright * sdt - s.va * 2 * sdt;
      s.va *= (1 - 0.8 * sdt);
      s.angle += s.va * sdt * 60;
      // 積分
      s.x += s.vx * sdt; s.y += s.vy * sdt;
      // 壁
      const hitV = 30;
      if (s.x < s.r) { if (-s.vx > hitV && s.hitWall) s.hitWall(-s.vx); s.x = s.r; s.vx *= -0.4; }
      if (s.x > b.w - s.r) { if (s.vx > hitV && s.hitWall) s.hitWall(s.vx); s.x = b.w - s.r; s.vx *= -0.4; }
      if (s.y > b.h - s.r) { if (s.vy > hitV && s.hitWall) s.hitWall(s.vy); s.y = b.h - s.r; s.vy *= -0.4; s.vx *= 0.92; }
      if (b.top && s.y < s.r) { s.y = s.r; s.vy *= -0.4; }
      // 静的コライダーと
      for (const c of this.colliders) {
        if (c.off || c.noSolid) continue;
        this._solidVsCollider(s, c);
      }
      // 剛体同士
      for (const o of this.solids) {
        if (o === s) continue;
        const dx = s.x - o.x, dy = s.y - o.y;
        const rs = s.r + o.r, d2 = dx * dx + dy * dy;
        if (d2 < rs * rs && d2 > 1e-6) {
          const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, pen = rs - d;
          if (o.static) { s.x += nx * pen; s.y += ny * pen; }
          else { s.x += nx * pen * 0.5; s.y += ny * pen * 0.5; o.x -= nx * pen * 0.5; o.y -= ny * pen * 0.5; }
          const rel = (s.vx - o.vx) * nx + (s.vy - o.vy) * ny;
          if (rel < 0) {
            s.vx -= rel * nx * 0.6; s.vy -= rel * ny * 0.6;
            if (!o.static) { o.vx += rel * nx * 0.6; o.vy += rel * ny * 0.6; }
            if (s.hitWall && -rel > 25) s.hitWall(-rel);
          }
        }
      }
      if (s.collide) this._solidFluidPush(s, sdt);
    }
  }

  _solidVsCollider(s, c) {
    let qx, qy;
    if (c.kind === 'circle') {
      const dx = s.x - c.x, dy = s.y - c.y, d = Math.sqrt(dx * dx + dy * dy) || 0.001;
      const R = c.r + s.r;
      if (d >= R) return;
      s.x = c.x + dx / d * R; s.y = c.y + dy / d * R;
      const rel = s.vx * dx / d + s.vy * dy / d;
      if (rel < 0) { s.vx -= rel * dx / d * 1.4; s.vy -= rel * dy / d * 1.4; }
      return;
    }
    if (c.kind === 'capsule') {
      let ex = c.bx - c.ax, ey = c.by - c.ay;
      const el2 = ex * ex + ey * ey || 1e-6;
      let t = ((s.x - c.ax) * ex + (s.y - c.ay) * ey) / el2;
      t = clamp(t, 0, 1);
      qx = c.ax + ex * t; qy = c.ay + ey * t;
      const dx = s.x - qx, dy = s.y - qy, d = Math.sqrt(dx * dx + dy * dy) || 0.001;
      const R = c.r + s.r;
      if (d >= R) return;
      const nx = dx / d, ny = dy / d;
      s.x = qx + nx * R; s.y = qy + ny * R;
      const rel = s.vx * nx + s.vy * ny;
      if (rel < 0) { s.vx -= rel * nx * 1.4; s.vy -= rel * ny * 1.4; }
      return;
    }
    if (c.kind === 'box') {
      const x0 = c.x - c.hw - s.r, x1 = c.x + c.hw + s.r;
      const y0 = c.y - c.hh - s.r, y1 = c.y + c.hh + s.r;
      if (s.x <= x0 || s.x >= x1 || s.y <= y0 || s.y >= y1) return;
      const dx0 = s.x - x0, dx1 = x1 - s.x, dy0 = s.y - y0, dy1 = y1 - s.y;
      const m = Math.min(dx0, dx1, dy0, dy1);
      if (m === dy0) { s.y = y0; if (s.vy > 0) s.vy *= -0.3; }
      else if (m === dy1) { s.y = y1; if (s.vy < 0) s.vy *= -0.3; }
      else if (m === dx0) { s.x = x0; if (s.vx > 0) s.vx *= -0.3; }
      else { s.x = x1; if (s.vx < 0) s.vx *= -0.3; }
    }
  }

  _solidFluidPush(s, sdt) {
    const X = this.x, Y = this.y;
    const R = s.r + this.h * 0.2, R2 = R * R;
    this._forEachNear(s.x, s.y, R, (i) => {
      const dx = X[i] - s.x, dy = Y[i] - s.y;
      const d2 = dx * dx + dy * dy;
      if (d2 >= R2) return;
      const d = Math.sqrt(d2) || 0.001;
      X[i] = s.x + dx / d * R; Y[i] = s.y + dy / d * R;
      X[i] += s.vx * sdt * 0.8; Y[i] += s.vy * sdt * 0.8;
    });
  }

  // ---- ユーティリティ ----
  _forEachNear(x, y, r, cb) {
    const inv = 1 / this.h, gw = this.gw, gh = this.gh;
    const x0 = clamp(((x - r) * inv + 1) | 0, 0, gw - 1);
    const x1 = clamp(((x + r) * inv + 1) | 0, 0, gw - 1);
    const y0 = clamp(((y - r) * inv + 1) | 0, 0, gh - 1);
    const y1 = clamp(((y + r) * inv + 1) | 0, 0, gh - 1);
    const r2 = r * r;
    for (let gy = y0; gy <= y1; gy++) {
      for (let gx = x0; gx <= x1; gx++) {
        const c = gy * gw + gx;
        for (let k = this.cellStart[c], e = this.cellStart[c + 1]; k < e; k++) {
          const i = this.cellPart[k];
          if (i >= this.n) continue;
          const dx = this.x[i] - x, dy = this.y[i] - y;
          if (dx * dx + dy * dy < r2) cb(i);
        }
      }
    }
  }

  forEachInCircle(x, y, r, cb) { this._forEachNear(x, y, r, cb); }

  densityAt(x, y) {
    let rho = 0;
    const h = this.h;
    this._forEachNear(x, y, h, (i) => {
      const dx = this.x[i] - x, dy = this.y[i] - y;
      const q = 1 - Math.sqrt(dx * dx + dy * dy) / h;
      if (q > 0) rho += q * q;
    });
    return rho;
  }

  velocityAt(x, y) {
    let vx = 0, vy = 0, w = 0;
    const h = this.h;
    this._forEachNear(x, y, h, (i) => {
      const dx = this.x[i] - x, dy = this.y[i] - y;
      const q = 1 - Math.sqrt(dx * dx + dy * dy) / h;
      if (q > 0) { vx += this.vx[i] * q; vy += this.vy[i] * q; w += q; }
    });
    if (w > 0) { vx /= w; vy /= w; }
    return [vx, vy, w];
  }

  impulse(x, y, r, ix, iy) {
    this._forEachNear(x, y, r, (i) => {
      const dx = this.x[i] - x, dy = this.y[i] - y;
      const q = 1 - Math.sqrt(dx * dx + dy * dy) / r;
      if (q > 0) { this.vx[i] += ix * q; this.vy[i] += iy * q; }
    });
  }

  // たまった水のまとまり(プール)を検出する。
  // 手のおわんに溜まった水・ダムでせき止めた水などを見つけて、
  // 魚の出現や「たまった!」演出のトリガーに使う。
  // 判定は「近傍が多い(=水中) かつ 速すぎない」粒子。注がれ続けて揺れる
  // おわんの水も拾えるように、静止時間ではなく近傍数を使う。
  // 粗いセル(2h)単位でBFSするので毎フレーム呼んでも軽い。
  pooledClusters(minNeighbors = 8, minCount = 40, maxSpeed = 55) {
    const cs = this.h * 2, inv = 1 / cs;
    const cw = Math.max(2, Math.ceil(this.bounds.w * inv) + 1);
    const ch = Math.max(2, Math.ceil(this.bounds.h * inv) + 1);
    const cnt = new Int16Array(cw * ch);
    const sx = new Float32Array(cw * ch);
    const sy = new Float32Array(cw * ch);
    for (let i = 0; i < this.n; i++) {
      if (this.nCount[i] < minNeighbors) continue;
      if (this.phase[i] > 1) continue; // 水系の相のみ
      if (Math.abs(this.vx[i]) + Math.abs(this.vy[i]) > maxSpeed) continue;
      const gx = clamp((this.x[i] * inv) | 0, 0, cw - 1);
      const gy = clamp((this.y[i] * inv) | 0, 0, ch - 1);
      const c = gy * cw + gx;
      cnt[c]++; sx[c] += this.x[i]; sy[c] += this.y[i];
    }
    const seen = new Uint8Array(cw * ch);
    const clusters = [];
    const stack = [];
    for (let c0 = 0; c0 < cw * ch; c0++) {
      if (seen[c0] || cnt[c0] < 2) continue;
      let total = 0, cx = 0, cy = 0, minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
      stack.length = 0; stack.push(c0); seen[c0] = 1;
      while (stack.length) {
        const c = stack.pop();
        const gx = c % cw, gy = (c / cw) | 0;
        total += cnt[c]; cx += sx[c]; cy += sy[c];
        const wx = (gx + 0.5) * cs, wy = (gy + 0.5) * cs;
        if (wx < minX) minX = wx; if (wx > maxX) maxX = wx;
        if (wy < minY) minY = wy; if (wy > maxY) maxY = wy;
        for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = gx + ox, ny = gy + oy;
          if (nx < 0 || ny < 0 || nx >= cw || ny >= ch) continue;
          const nc = ny * cw + nx;
          if (!seen[nc] && cnt[nc] >= 2) { seen[nc] = 1; stack.push(nc); }
        }
      }
      if (total >= minCount) {
        clusters.push({
          cx: cx / total, cy: cy / total, count: total,
          r: Math.max(maxX - minX, maxY - minY) * 0.5 + cs * 0.5,
        });
      }
    }
    return clusters;
  }

  // 色の拡散 (同グループ内のみ)
  _mixColors(dt) {
    const n = this.n, nc = this.nCount, nl = this.nList;
    const PH = this.phase, phs = this.phases;
    const CR = this.cr, CG = this.cg, CB = this.cb, CA = this.ca;
    for (let i = 0; i < n; i++) {
      const pi = phs[PH[i]];
      if (pi.mix <= 0) continue;
      const base = i * MAXN, cnt = nc[i];
      for (let k = 0; k < cnt; k++) {
        const j = nl[base + k];
        if (j >= n || j <= i) continue;
        const pj = phs[PH[j]];
        if (pj.group !== pi.group || pj.mix <= 0) continue;
        const rate = Math.min(0.5, Math.min(pi.mix, pj.mix) * dt);
        const mr = (CR[j] - CR[i]) * rate, mg = (CG[j] - CG[i]) * rate,
              mb = (CB[j] - CB[i]) * rate, ma = (CA[j] - CA[i]) * rate;
        CR[i] += mr; CR[j] -= mr;
        CG[i] += mg; CG[j] -= mg;
        CB[i] += mb; CB[j] -= mb;
        CA[i] += ma; CA[j] -= ma;
      }
    }
  }
}

export { MAXN };
