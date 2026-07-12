// 粒状物 (granular) 物理エンジン
// 2D DEM を Position-Based Dynamics で解く:
//   - 粒子ペアの非貫入射影 + クーロン摩擦 (静止/動摩擦) → 安息角が創発して山が積める
//   - 付着 (雪・ぬれた砂)、反発 (ガムボール)、転がり抵抗、接触スリップからの回転近似
//   - スリープ機構 (静止した山は計算スキップ)、剛体円との双方向連成、可動コライダー
// 参考: Macklin et al. "Unified Particle Physics for Real-Time Applications" (2014)

import { clamp } from './utils.js';

export class GrainSim {
  constructor(max = 9000) {
    this.max = max;
    this.n = 0;
    const F = Float32Array;
    this.x = new F(max); this.y = new F(max);
    this.px = new F(max); this.py = new F(max);
    this.vx = new F(max); this.vy = new F(max);
    this.r = new F(max);
    this.ang = new F(max); this.angV = new F(max);
    this.mat = new Uint8Array(max);
    this.cr = new F(max); this.cg = new F(max); this.cb = new F(max);
    this.sprite = new F(max);
    this.age = new F(max);
    this.rest = new F(max);      // 静止時間 → スリープ
    this.contacts = new Uint8Array(max);
    this.aux = new F(max);       // シーン用 (加熱タイマー等)
    this.pack = new F(max);      // 締固め度 0..1 (雪の圧雪など)

    this.gravityX = 0;
    this.gravityY = 430;
    this._lastGx = 0; this._lastGy = 430;
    this.substeps = 2;
    this.iterations = 4;
    this.contactDamp = 9;        // 接触中の粒の速度減衰 (山を落ち着かせる)
    this.fricFloor = 0.08;       // 静止摩擦の下限 (pen≈0 でも滑らない)
    this.sleepV = 14;            // これ未満の速度が続くと眠る (斜面の保持に効く)
    this.sleepTime = 0.15;
    this.staticLatch = 4;        // 静止接触の摩擦倍率 (山の斜面を保持)
    this.wakePen = 0.2;          // 眠った粒を起こすのに必要な食い込み (rsum比)
    this.wakeSpeed = 24;         // 起こす側に必要な速度 (小さいと山が煮え続ける)
    this._time = 0;
    this.collisionEnergy = 0;    // 音用: 今フレームの衝突量

    // 素材 (最大 8)
    this.mats = [];
    for (let i = 0; i < 8; i++) this.defineMaterial(i, {});

    this.bounds = { w: 100, h: 160, top: false, left: true, right: true, bottom: true };
    this.colliders = [];  // {kind:'box'|'circle'|'capsule', mu, off, vx, vy, noSolid}
    this.solids = [];     // 動的剛体円
    this.onKill = null;

    this.cellSize = 3;
    this.activeCount = 0;        // 起きている粒の数 (性能スケーリング用)
    // 素材プロパティの高速参照キャッシュ (ホットループ用)
    const FM = () => new Float32Array(8);
    this._muA = FM(); this._ilA = FM(); this._cohA = FM(); this._bounceA = FM();
    this._gravA = FM(); this._vmaxA = FM(); this._flutterA = FM(); this._sleepKA = FM();
    this._packableA = new Uint8Array(8);
    this._setupGrid();
  }

  _refreshMatCache() {
    for (let k = 0; k < 8; k++) {
      const m = this.mats[k];
      if (!m) continue;
      this._muA[k] = m.mu; this._ilA[k] = m.interlock; this._cohA[k] = m.coh;
      this._bounceA[k] = m.bounce; this._gravA[k] = m.grav; this._vmaxA[k] = m.vmax;
      this._flutterA[k] = m.flutter; this._sleepKA[k] = m.sleepK;
      this._packableA[k] = m.packable ? 1 : 0;
    }
  }

  defineMaterial(id, p) {
    this.mats[id] = Object.assign({
      r: 0.85, rJit: 0.12,
      mu: 0.5,          // 粒間摩擦 (安息角のもと)
      muWall: 0.45,
      bounce: 0.0,      // 反発 (0..0.9)
      coh: 0,           // 付着強さ (0..1) 雪など
      rollRes: 3.0,     // 回転の減衰
      grav: 1,
      vmax: 110,        // 終端速度 (細かい粒ほど遅い)
      interlock: 1,     // 粒のかみ合い (角ばった粒ほど大: 安息角が急になる)
      flutter: 0,       // 空中でのひらひら (雪・軽い粒)
      packable: false,  // 圧力で締固まる (雪)
      sleepK: 1,        // スリープしやすさ (球は転がり続けるので小さく)
      sprite: 0,
      colors: [[0.9, 0.8, 0.55]],
      stretch: 1,       // 描画の縦横比 (米=2.1 など)
    }, p);
    return this.mats[id];
  }

  // 定義済み素材から格子サイズを決める (最大粒径の 2.2 倍)
  finalizeMaterials() {
    let rmax = 0.6;
    for (const m of this.mats) if (m && m.r + m.rJit > rmax) rmax = m.r + m.rJit;
    this.cellSize = Math.max(2.0, rmax * 2.2);
    this._setupGrid();
  }

  setBounds(w, h, opts = {}) {
    this.bounds = Object.assign({ w, h, top: false, left: true, right: true, bottom: true }, opts, { w, h });
    this._setupGrid();
  }

  _setupGrid() {
    const cs = this.cellSize;
    this.gw = Math.max(4, Math.ceil(this.bounds.w / cs) + 2);
    this.gh = Math.max(4, Math.ceil(this.bounds.h / cs) + 2);
    const cells = this.gw * this.gh;
    this.cellCount = new Int32Array(cells + 1);
    this.cellStart = new Int32Array(cells + 1);
    this.cellPart = new Int32Array(this.max);
    this.cellOf = new Int32Array(this.max);
  }

  clear() {
    this.n = 0;
    this.solids.length = 0;
    this.colliders.length = 0;
    this.collisionEnergy = 0;
  }

  emit(x, y, vx, vy, matId, jitter = 0.4) {
    if (this.n >= this.max) return -1;
    const i = this.n++;
    const m = this.mats[matId];
    this.x[i] = x + (Math.random() - 0.5) * jitter;
    this.y[i] = y + (Math.random() - 0.5) * jitter;
    this.px[i] = this.x[i]; this.py[i] = this.y[i];
    this.vx[i] = vx; this.vy[i] = vy;
    this.r[i] = m.r + (Math.random() - 0.5) * 2 * m.rJit;
    this.ang[i] = Math.random() * 6.2832;
    this.angV[i] = 0;
    this.mat[i] = matId;
    const c = m.colors[(Math.random() * m.colors.length) | 0];
    this.cr[i] = c[0]; this.cg[i] = c[1]; this.cb[i] = c[2];
    this.sprite[i] = m.sprite;
    this.age[i] = 0; this.rest[i] = 0; this.aux[i] = 0; this.pack[i] = 0;
    this.contacts[i] = 0;
    return i;
  }

  kill(i) {
    if (this.onKill) this.onKill(this.x[i], this.y[i], this.mat[i], i);
    const l = --this.n;
    if (i !== l) {
      for (const a of [this.x, this.y, this.px, this.py, this.vx, this.vy, this.r,
        this.ang, this.angV, this.cr, this.cg, this.cb, this.sprite, this.age, this.rest, this.aux, this.pack]) {
        a[i] = a[l];
      }
      this.mat[i] = this.mat[l];
      this.contacts[i] = this.contacts[l];
    }
  }

  addSolid(s) {
    const o = Object.assign({
      x: 0, y: 0, r: 5, vx: 0, vy: 0, px: 0, py: 0,
      angle: 0, va: 0,
      mass: 40,           // 粒の mass=r^2 と同じ次元
      mu: 0.5,
      grav: 1,
      kinematic: false,   // true: 指で持つ道具 (押されない)
      collideGrains: true,
      hitWall: null,
      data: {},
    }, s);
    o.px = o.x; o.py = o.y;
    this.solids.push(o);
    return o;
  }

  wakeAll() {
    for (let i = 0; i < this.n; i++) this.rest[i] = 0;
  }

  // ---- 格子 ----
  _buildGrid() {
    const { gw, gh, n } = this;
    const inv = 1 / this.cellSize;
    const cc = this.cellCount; cc.fill(0);
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

  // ---- メイン ----
  step(dt) {
    // 重力が変わったら全員起こす (傾け遊び)
    if (Math.abs(this.gravityX - this._lastGx) + Math.abs(this.gravityY - this._lastGy) > 12) {
      this.wakeAll();
    }
    this._lastGx = this.gravityX; this._lastGy = this.gravityY;
    this.collisionEnergy *= 0.6;
    this._refreshMatCache();
    // 大規模なだれ (全起床) 時は反復を自動で下げて 60fps を守る
    this._iterEff = this.activeCount > 3600 ? 2 : (this.activeCount > 2300 ? 3 : this.iterations);

    const sub = this.substeps, sdt = dt / sub;
    for (let s = 0; s < sub; s++) this._substep(sdt);

    for (let i = 0; i < this.n; i++) {
      this.age[i] += dt;
      this.ang[i] += this.angV[i] * dt;
      this.angV[i] *= Math.max(0, 1 - this.mats[this.mat[i]].rollRes * dt);
    }
  }

  _substep(sdt) {
    const n = this.n;
    const X = this.x, Y = this.y, PX = this.px, PY = this.py, VX = this.vx, VY = this.vy;
    const R = this.rest, gx = this.gravityX, gy = this.gravityY;
    const mats = this.mats, MT = this.mat;
    const cs = this.cellSize;
    const vmax = 0.8 * cs / sdt, vmax2 = vmax * vmax;

    // 1) 積分 (眠っている粒はスキップ)
    this._time += sdt;
    const tt = this._time;
    const gravA = this._gravA, vmaxA = this._vmaxA, flutA = this._flutterA;
    for (let i = 0; i < n; i++) {
      if (R[i] > this.sleepTime) { PX[i] = X[i]; PY[i] = Y[i]; VX[i] = 0; VY[i] = 0; continue; }
      const mt = MT[i];
      VX[i] += gx * gravA[mt] * sdt;
      VY[i] += gy * gravA[mt] * sdt;
      // ひらひら舞い落ちる (雪など、空中のみ)
      if (flutA[mt] > 0 && this.contacts[i] === 0) {
        VX[i] += Math.sin(tt * 2.6 + i * 1.71) * flutA[mt] * sdt;
      }
      // 終端速度 (空気抵抗) と CFL クランプ
      const vlim = Math.min(vmaxA[mt], vmax);
      const v2 = VX[i] * VX[i] + VY[i] * VY[i];
      if (v2 > vlim * vlim) { const k = vlim / Math.sqrt(v2); VX[i] *= k; VY[i] *= k; }
      PX[i] = X[i]; PY[i] = Y[i];
      X[i] += VX[i] * sdt; Y[i] += VY[i] * sdt;
    }

    // 2) 剛体の積分
    this._integrateSolids(sdt);

    // 3) 接触
    this._buildGrid();
    this.contacts.fill(0);
    const iter = this._iterEff || this.iterations;
    for (let it = 0; it < iter; it++) {
      this._solveContacts(it === iter - 1);
      this._collideColliders(sdt);
      this._collideSolids(sdt);
      this._collideBounds(sdt, it === 0);
    }

    // 4) 速度更新 + 接触減衰 + スリープ/締固め判定
    const inv = 1 / sdt;
    const CT = this.contacts;
    const PK = this.pack;
    const bounceA = this._bounceA, sleepKA = this._sleepKA, packA = this._packableA;
    let active = 0;
    for (let i = 0; i < n; i++) {
      if (R[i] > this.sleepTime) {
        R[i] += sdt; // 眠っていても静止時間は進める
        // 眠っている雪はゆっくり締固まる
        if (packA[MT[i]] && PK[i] < 1) PK[i] = Math.min(1, PK[i] + sdt * 0.06);
        continue;
      }
      active++;
      VX[i] = (X[i] - PX[i]) * inv;
      VY[i] = (Y[i] - PY[i]) * inv;
      const mt = MT[i];
      // 接触している粒は揺れを減衰 → 山が固まる (弾む素材は弱く)
      if (CT[i] >= 2) {
        const k = Math.max(0, 1 - this.contactDamp * (1 - bounceA[mt]) * sdt);
        VX[i] *= k; VY[i] *= k;
      }
      const sp = Math.abs(VX[i]) + Math.abs(VY[i]);
      if (sp < this.sleepV * sleepKA[mt] && CT[i] >= 2) R[i] += sdt;
      else R[i] = 0;
      // 締固め: 押されて多接触なら締まる、高速で飛べばほぐれる
      if (packA[mt]) {
        if (CT[i] >= 5 && sp < 25) PK[i] = Math.min(1, PK[i] + sdt * 0.35);
        else if (CT[i] === 0 && sp > 70) PK[i] = Math.max(0, PK[i] - sdt * 1.6);
      }
    }
    this.activeCount = active;
    for (const s of this.solids) {
      if (s.kinematic) continue;
      s.vx = (s.x - s.px) * inv;
      s.vy = (s.y - s.py) * inv;
    }
  }

  _solveContacts(lastIter) {
    const n = this.n;
    const X = this.x, Y = this.y, PX = this.px, PY = this.py;
    const VX = this.vx, VY = this.vy;
    const RR = this.r, RS = this.rest, MT = this.mat;
    const CT = this.contacts, AV = this.angV, PK = this.pack;
    const muA = this._muA, ilA = this._ilA, cohA = this._cohA, bounceA = this._bounceA;
    const { gw, gh } = this;
    const inv = 1 / this.cellSize;
    const st = this.sleepTime;

    for (let i = 0; i < n; i++) {
      // 眠っている粒は外側ループから除外 (ペアは起きている側が処理する)
      if (RS[i] > st) continue;
      const xi = X[i], yi = Y[i], ri = RR[i];
      const cx = clamp((xi * inv + 1) | 0, 0, gw - 1);
      const cy = clamp((yi * inv + 1) | 0, 0, gh - 1);
      const mti = MT[i];
      const massI = ri * ri;
      const y1 = Math.min(gh - 1, cy + 1), x1 = Math.min(gw - 1, cx + 1);
      for (let gy2 = Math.max(0, cy - 1); gy2 <= y1; gy2++) {
        for (let gx2 = Math.max(0, cx - 1); gx2 <= x1; gx2++) {
          const c = gy2 * gw + gx2;
          for (let k = this.cellStart[c], e = this.cellStart[c + 1]; k < e; k++) {
            const j = this.cellPart[k];
            if (j === i || j >= n) continue;
            const jAsleep = RS[j] > st;
            // 起き-起きペアはインデックス順で1回、起き-寝ペアは起きている側が処理
            if (!jAsleep && j < i) continue;
            const dx = X[j] - X[i], dy = Y[j] - Y[i];
            const rsum = ri + RR[j];
            const d2 = dx * dx + dy * dy;
            // 早期棄却 (付着レンジ 1.14 倍を上限に)
            const reachMax = rsum * 1.14;
            if (d2 >= reachMax * reachMax || d2 < 1e-9) continue;
            const mtj = MT[j];
            // 付着レンジ (雪) — 締固まった雪ほど強く固まる
            const packBoost = 1 + (PK[i] + PK[j]) * 0.9;
            const coh = Math.min(cohA[mti], cohA[mtj]) * packBoost;
            const reach = coh > 0 ? reachMax : rsum;
            if (d2 >= reach * reach) continue;
            const d = Math.sqrt(d2);
            const nx = dx / d, ny = dy / d;
            const massJ = RR[j] * RR[j];
            const wi = massJ / (massI + massJ), wj = 1 - wi;
            const pen = rsum - d;

            if (pen > 0) {
              CT[i]++; CT[j]++;
              // 動いている粒が強く食い込んできたら眠っている粒を起こす
              // (静的な深部の食い込みでは起こさない — 深い山ごと眠れる)
              if (jAsleep && pen > rsum * this.wakePen &&
                  Math.abs(VX[i]) + Math.abs(VY[i]) > this.wakeSpeed) {
                RS[j] = 0;
              }
              const relax = 0.85;
              const cxp = nx * pen * relax, cyp = ny * pen * relax;
              X[i] -= cxp * wi; Y[i] -= cyp * wi;
              X[j] += cxp * wj; Y[j] += cyp * wj;

              // クーロン摩擦 (このサブステップの接線相対変位を制限)
              // fricFloor×interlock: 角ばった粒のかみ合い。締固めでさらに強く。
              // 両方が静止気味の接触は「かみ合いラッチ」でさらに強く保持 (安息角の要)
              const mu = (muA[mti] + muA[mtj]) * 0.5;
              let il = (ilA[mti] + ilA[mtj]) * 0.5 * packBoost;
              if (RS[i] > 0.05 && RS[j] > 0.05) il *= this.staticLatch;
              const budget = mu * (pen + this.fricFloor * rsum * il);
              let ux = (X[i] - PX[i]) - (X[j] - PX[j]);
              let uy = (Y[i] - PY[i]) - (Y[j] - PY[j]);
              const un = ux * nx + uy * ny;
              ux -= un * nx; uy -= un * ny;
              const ut = Math.sqrt(ux * ux + uy * uy);
              if (ut > 1e-7) {
                const f = ut <= budget ? 1 : budget / ut; // 1=静止摩擦, <1=動摩擦
                const fx = ux * f, fy = uy * f;
                X[i] -= fx * wi; Y[i] -= fy * wi;
                X[j] += fx * wj; Y[j] += fy * wj;
                if (lastIter) {
                  // 残りスリップ → 見た目の回転
                  const slip = ut * (1 - f);
                  const sgn = (ux * -ny + uy * nx) > 0 ? 1 : -1;
                  AV[i] += sgn * slip / ri * 18;
                  AV[j] += sgn * slip / RR[j] * 18;
                  this.collisionEnergy += pen;
                }
              }
              // 衝突の非弾性吸収: 接近する法線相対速度を殺す (砂は跳ねない)
              if (lastIter && un < -0.02) {
                const kAbs = (1 - Math.max(bounceA[mti], bounceA[mtj])) * 0.85;
                const c = un * kAbs;
                PX[i] += nx * c * wi; PY[i] += ny * c * wi;
                PX[j] -= nx * c * wj; PY[j] -= ny * c * wj;
              }
            } else if (coh > 0) {
              // すき間があるが付着レンジ内 → 引き寄せ (雪の団結)
              const gap = d - rsum;
              const pull = gap * coh * 0.5;
              X[i] += nx * pull * wi; Y[i] += ny * pull * wi;
              X[j] -= nx * pull * wj; Y[j] -= ny * pull * wj;
              CT[i]++; CT[j]++;
            }
          }
        }
      }
    }
  }

  // ---- 静的コライダー ----
  _collideBounds(sdt, firstIter) {
    const b = this.bounds, n = this.n;
    const X = this.x, Y = this.y, RR = this.r, CT = this.contacts;
    const muW = 0.5;
    const RS = this.rest, st = this.sleepTime;
    for (let i = 0; i < n; i++) {
      if (RS[i] > st) continue; // 眠っている粒は動かないので境界チェック不要
      const r = RR[i];
      let hit = 0, nx = 0, ny = 0, pen = 0;
      if (b.left && X[i] < r) { pen = r - X[i]; X[i] = r; nx = 1; ny = 0; hit = 1; }
      else if (b.right && X[i] > b.w - r) { pen = X[i] - (b.w - r); X[i] = b.w - r; nx = -1; ny = 0; hit = 1; }
      if (b.bottom && Y[i] > b.h - r) { pen = Y[i] - (b.h - r); Y[i] = b.h - r; nx = 0; ny = -1; hit = 1; }
      else if (b.top && Y[i] < r) { pen = r - Y[i]; Y[i] = r; nx = 0; ny = 1; hit = 1; }
      if (hit) {
        CT[i] += 2; // 床は支えとみなす
        const bnc = this.mats[this.mat[i]].bounce;
        if (bnc > 0 && firstIter) this._wallBounce(i, nx, ny, bnc, sdt);
        this._wallFriction(i, nx, ny, pen, muW);
      }
    }
  }

  // 反発: 速度を反射するように前位置を書き換える (ガムボール等)
  _wallBounce(i, nx, ny, e, sdt) {
    const vx = (this.x[i] - this.px[i]) / sdt;
    const vy = (this.y[i] - this.py[i]) / sdt;
    const vn = vx * nx + vy * ny;
    if (vn >= -12) return; // ゆっくりなら弾まない
    const rvx = vx - (1 + e) * vn * nx;
    const rvy = vy - (1 + e) * vn * ny;
    this.px[i] = this.x[i] - rvx * sdt;
    this.py[i] = this.y[i] - rvy * sdt;
    this.collisionEnergy += -vn * 0.01;
  }

  _wallFriction(i, nx, ny, pen, mu) {
    // 壁接触の接線変位を制限
    let ux = this.x[i] - this.px[i], uy = this.y[i] - this.py[i];
    const un = ux * nx + uy * ny;
    ux -= un * nx; uy -= un * ny;
    const ut = Math.sqrt(ux * ux + uy * uy);
    if (ut > 1e-7) {
      const f = ut <= mu * pen ? 1 : mu * pen / ut;
      this.x[i] -= ux * f;
      this.y[i] -= uy * f;
      if (this.rest[i] <= this.sleepTime) {
        this.angV[i] += ((ux * -ny + uy * nx) > 0 ? 1 : -1) * ut * (1 - f) / this.r[i] * 18;
      }
    }
  }

  _collideColliders(sdt) {
    for (const c of this.colliders) {
      if (c.off) continue;
      const moving = (c.vx || c.vy);
      const cvx = clamp(c.vx || 0, -260, 260), cvy = clamp(c.vy || 0, -260, 260);
      const mu = c.mu ?? 0.5;
      if (c.kind === 'circle') {
        const Rq = c.r;
        this._forEachNear(c.x, c.y, Rq + this.cellSize, (i) => {
          if (!moving && this.rest[i] > this.sleepTime) return;
          const dx = this.x[i] - c.x, dy = this.y[i] - c.y;
          const rr = Rq + this.r[i];
          const d2 = dx * dx + dy * dy;
          if (d2 >= rr * rr) return;
          const d = Math.sqrt(d2) || 0.001;
          const nx = dx / d, ny = dy / d, pen = rr - d;
          if (moving) {
            this.rest[i] = 0;
            if (this.mats[this.mat[i]].packable) this.pack[i] = Math.min(1, this.pack[i] + 0.05);
          }
          this.x[i] = c.x + nx * rr; this.y[i] = c.y + ny * rr;
          this.contacts[i] += 2;
          const bnc = this.mats[this.mat[i]].bounce;
          if (bnc > 0) this._wallBounce(i, nx, ny, bnc, sdt);
          this._wallFriction(i, nx, ny, pen, mu);
          if (moving) { this.x[i] += cvx * sdt * 0.9; this.y[i] += cvy * sdt * 0.9; }
        });
      } else if (c.kind === 'capsule') {
        this._capsuleCollide(c, cvx, cvy, mu, sdt, moving);
      } else if (c.kind === 'box') {
        this._boxCollide(c, cvx, cvy, mu, sdt, moving);
      }
    }
  }

  _capsuleCollide(c, cvx, cvy, mu, sdt, moving) {
    const ax = c.ax, ay = c.ay;
    const ex = c.bx - ax, ey = c.by - ay;
    const el2 = ex * ex + ey * ey || 1e-6;
    const el = Math.sqrt(el2);
    // カプセルの AABB 範囲のセルだけ走査
    const pad = c.r + this.cellSize;
    const x0 = Math.min(ax, c.bx) - pad, x1 = Math.max(ax, c.bx) + pad;
    const y0 = Math.min(ay, c.by) - pad, y1 = Math.max(ay, c.by) + pad;
    this._forEachInAabb(x0, y0, x1, y1, (i) => {
      if (!moving && this.rest[i] > this.sleepTime) return;
      let t = ((this.x[i] - ax) * ex + (this.y[i] - ay) * ey) / el2;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const qx = ax + ex * t, qy = ay + ey * t;
      const dx = this.x[i] - qx, dy = this.y[i] - qy;
      const rr = c.r + this.r[i];
      const d2 = dx * dx + dy * dy;
      if (d2 >= rr * rr) return;
      const d = Math.sqrt(d2) || 0.001;
      const nx = dx / d, ny = dy / d, pen = rr - d;
      if (moving) {
        this.rest[i] = 0;
        if (this.mats[this.mat[i]].packable) this.pack[i] = Math.min(1, this.pack[i] + 0.05);
      }
      this.x[i] = qx + nx * rr; this.y[i] = qy + ny * rr;
      this.contacts[i] += 2;
      const bnc = this.mats[this.mat[i]].bounce;
      if (bnc > 0) this._wallBounce(i, nx, ny, bnc, sdt);
      this._wallFriction(i, nx, ny, pen, mu);
      if (moving) { this.x[i] += cvx * sdt * 0.9; this.y[i] += cvy * sdt * 0.9; }
    });
  }

  _boxCollide(c, cvx, cvy, mu, sdt, moving) {
    const pad = this.cellSize;
    this._forEachInAabb(c.x - c.hw - pad, c.y - c.hh - pad, c.x + c.hw + pad, c.y + c.hh + pad, (i) => {
      if (!moving && this.rest[i] > this.sleepTime) return;
      const r = this.r[i];
      const x0 = c.x - c.hw - r, x1 = c.x + c.hw + r;
      const y0 = c.y - c.hh - r, y1 = c.y + c.hh + r;
      const x = this.x[i], y = this.y[i];
      if (x <= x0 || x >= x1 || y <= y0 || y >= y1) return;
      const dx0 = x - x0, dx1 = x1 - x, dy0 = y - y0, dy1 = y1 - y;
      const m = Math.min(dx0, dx1, dy0, dy1);
      let nx = 0, ny = 0;
      if (m === dy0) { this.y[i] = y0; nx = 0; ny = -1; }
      else if (m === dy1) { this.y[i] = y1; nx = 0; ny = 1; }
      else if (m === dx0) { this.x[i] = x0; nx = -1; ny = 0; }
      else { this.x[i] = x1; nx = 1; ny = 0; }
      if (moving) {
        this.rest[i] = 0;
        if (this.mats[this.mat[i]].packable) this.pack[i] = Math.min(1, this.pack[i] + 0.05);
      }
      this.contacts[i] += 2;
      this._wallFriction(i, nx, ny, m, mu);
      if (moving) { this.x[i] += cvx * sdt * 0.9; this.y[i] += cvy * sdt * 0.9; }
    });
  }

  // ---- 剛体円 (動的) ----
  _integrateSolids(sdt) {
    const b = this.bounds;
    for (const s of this.solids) {
      s.px = s.x; s.py = s.y;
      if (s.kinematic) continue;
      s.vy += this.gravityY * s.grav * sdt;
      s.vx += this.gravityX * s.grav * sdt;
      s.x += s.vx * sdt; s.y += s.vy * sdt;
      s.angle += s.va * sdt;
      s.va *= (1 - 1.2 * sdt);
      // 画面境界
      if (s.x < s.r) { s.x = s.r; if (s.vx < 0) { if (s.hitWall && -s.vx > 30) s.hitWall(-s.vx); s.vx *= -0.35; } }
      if (s.x > b.w - s.r) { s.x = b.w - s.r; if (s.vx > 0) { if (s.hitWall && s.vx > 30) s.hitWall(s.vx); s.vx *= -0.35; } }
      if (s.y > b.h - s.r) {
        s.y = b.h - s.r;
        if (s.vy > 0) { if (s.hitWall && s.vy > 30) s.hitWall(s.vy); s.vy *= -0.35; s.vx *= 0.9; s.va = s.vx / s.r; }
      }
      if (b.top && s.y < s.r) { s.y = s.r; if (s.vy < 0) s.vy *= -0.35; }
      // 静的コライダー
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
          if (o.kinematic) { s.x += nx * pen; s.y += ny * pen; }
          else {
            const wi = o.mass / (s.mass + o.mass);
            s.x += nx * pen * wi; s.y += ny * pen * wi;
            o.x -= nx * pen * (1 - wi); o.y -= ny * pen * (1 - wi);
          }
        }
      }
    }
  }

  _solidVsCollider(s, c) {
    if (c.kind === 'capsule') {
      const ex = c.bx - c.ax, ey = c.by - c.ay;
      const el2 = ex * ex + ey * ey || 1e-6;
      let t = ((s.x - c.ax) * ex + (s.y - c.ay) * ey) / el2;
      t = clamp(t, 0, 1);
      const qx = c.ax + ex * t, qy = c.ay + ey * t;
      const dx = s.x - qx, dy = s.y - qy;
      const d = Math.sqrt(dx * dx + dy * dy) || 0.001;
      const R = c.r + s.r;
      if (d >= R) return;
      s.x = qx + dx / d * R; s.y = qy + dy / d * R;
      const rel = s.vx * dx / d + s.vy * dy / d;
      if (rel < 0) { s.vx -= rel * dx / d * 1.35; s.vy -= rel * dy / d * 1.35; }
    } else if (c.kind === 'circle') {
      const dx = s.x - c.x, dy = s.y - c.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 0.001;
      const R = c.r + s.r;
      if (d >= R) return;
      s.x = c.x + dx / d * R; s.y = c.y + dy / d * R;
      const rel = s.vx * dx / d + s.vy * dy / d;
      if (rel < 0) { s.vx -= rel * dx / d * 1.35; s.vy -= rel * dy / d * 1.35; }
    } else if (c.kind === 'box') {
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

  _collideSolids(sdt) {
    for (const s of this.solids) {
      if (!s.collideGrains) continue;
      const smass = s.mass;
      let fx = 0, fy = 0;
      this._forEachNear(s.x, s.y, s.r + this.cellSize, (i) => {
        const dx = this.x[i] - s.x, dy = this.y[i] - s.y;
        const rr = s.r + this.r[i];
        const d2 = dx * dx + dy * dy;
        if (d2 >= rr * rr || d2 < 1e-9) return;
        const d = Math.sqrt(d2);
        const nx = dx / d, ny = dy / d, pen = rr - d;
        const gm = this.r[i] * this.r[i];
        const wG = smass / (smass + gm);   // 粒がほぼ動く
        this.rest[i] = 0;
        if (this.mats[this.mat[i]].packable) this.pack[i] = Math.min(1, this.pack[i] + 0.04);
        this.x[i] += nx * pen * wG; this.y[i] += ny * pen * wG;
        this.contacts[i] += 2;
        // 粒 → 剛体への反力 (山の上に乗れる)
        fx -= nx * pen * (1 - wG);
        fy -= ny * pen * (1 - wG);
        // 剛体の運動を粒へ
        const sv = Math.hypot(s.vx, s.vy);
        if (sv > 4) {
          this.x[i] += clamp(s.vx, -260, 260) * sdt * 0.7;
          this.y[i] += clamp(s.vy, -260, 260) * sdt * 0.7;
          // 転がる剛体 (雪玉) の回転を粒スリップから
          s.va = s.vx / s.r;
        }
      });
      if (!s.kinematic) { s.x += fx; s.y += fy; }
    }
  }

  // ---- ユーティリティ ----
  _forEachNear(x, y, rad, cb) {
    this._forEachInAabb(x - rad, y - rad, x + rad, y + rad, cb);
  }

  _forEachInAabb(x0, y0, x1, y1, cb) {
    const inv = 1 / this.cellSize, gw = this.gw, gh = this.gh;
    const cx0 = clamp((x0 * inv + 1) | 0, 0, gw - 1);
    const cx1 = clamp((x1 * inv + 1) | 0, 0, gw - 1);
    const cy0 = clamp((y0 * inv + 1) | 0, 0, gh - 1);
    const cy1 = clamp((y1 * inv + 1) | 0, 0, gh - 1);
    for (let gy = cy0; gy <= cy1; gy++) {
      for (let gx = cx0; gx <= cx1; gx++) {
        const c = gy * gw + gx;
        for (let k = this.cellStart[c], e = this.cellStart[c + 1]; k < e; k++) {
          const i = this.cellPart[k];
          if (i < this.n) cb(i);
        }
      }
    }
  }

  forEachInCircle(x, y, rad, cb) {
    const r2 = rad * rad;
    this._forEachNear(x, y, rad, (i) => {
      const dx = this.x[i] - x, dy = this.y[i] - y;
      if (dx * dx + dy * dy < r2) cb(i);
    });
  }

  countInCircle(x, y, rad) {
    let c = 0;
    this.forEachInCircle(x, y, rad, () => c++);
    return c;
  }

  impulse(x, y, rad, ix, iy) {
    this.forEachInCircle(x, y, rad, (i) => {
      const dx = this.x[i] - x, dy = this.y[i] - y;
      const q = 1 - Math.sqrt(dx * dx + dy * dy) / rad;
      this.rest[i] = 0;
      this.vx[i] += ix * q; this.vy[i] += iy * q;
    });
  }

  countMat(matId) {
    let c = 0;
    for (let i = 0; i < this.n; i++) if (this.mat[i] === matId) c++;
    return c;
  }

  // x 列での積みあがり高さ (上面の y)
  topAt(x, halfW = 1.5, yFrom = 0) {
    let top = this.bounds.h;
    for (let i = 0; i < this.n; i++) {
      if (Math.abs(this.x[i] - x) < halfW && this.y[i] >= yFrom && this.y[i] < top) top = this.y[i];
    }
    return top;
  }
}
