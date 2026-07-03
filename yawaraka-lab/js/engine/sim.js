/* やわらかラボ — soft-body particle simulation.
 * Verlet particles + distance bonds with stiffness / plasticity / breaking /
 * re-bonding. One material occupies the stage at a time;色は粒子ごと(混色可)。
 * Pseudo-height h gives squish volume (pressing flattens & widens). */
(function () {
  'use strict';
  const U = YL.U;

  const MAX_PARTICLES = 620;
  const FINGER_R = 50;          // touch influence radius (css px)
  const SUBSTEPS = 2, ITERS = 4;

  class Sim {
    constructor() {
      this.particles = [];
      this.bonds = [];
      this.stickers = [];
      this.cracks = [];          // {x0,y0,x1,y1,age} fading crack hairlines
      this.events = [];
      this.stats = { press: 0, stretch: 0, jiggle: 0, knead: 0, heat: 0, size: 0 };
      this.bounds = { x: 0, y: 0, w: 800, h: 600 };
      this.mat = null;
      this.time = 0;
      this._kneadPulse = 0;
      this._grid = new Map();
      this._initialCount = 0;
    }

    setBounds(b) {
      this.bounds = b;
      const m = 6;
      for (const p of this.particles) {
        p.x = U.clamp(p.x, b.x + m, b.x + b.w - m);
        p.y = U.clamp(p.y, b.y + m, b.y + b.h - m);
      }
    }

    setMaterial(mat, opts) {
      this.mat = mat;
      this.particles.length = 0;
      this.bonds.length = 0;
      this.stickers.length = 0;
      this.cracks.length = 0;
      this.events.length = 0;
      if (!opts || opts.fresh !== false) {
        const b = this.bounds;
        this.spawnLump(b.x + b.w / 2, b.y + b.h / 2, mat.lumpR, null, true);
        this._initialCount = this.particles.length;
        this.events.push({ t: 'spawn', x: b.x + b.w / 2, y: b.y + b.h / 2, v: 1 });
      }
    }

    // Hex-packed lump. `compressed` spawns it squeezed so it boings outward.
    spawnLump(cx, cy, R, colorOverride, compressed) {
      const mat = this.mat, s = mat.spacing, first = this.particles.length;
      const rows = Math.ceil(R / (s * 0.866));
      for (let iy = -rows; iy <= rows; iy++) {
        const y = iy * s * 0.866;
        const off = (iy & 1) ? s / 2 : 0;
        for (let ix = -Math.ceil(R / s) - 1; ix <= Math.ceil(R / s) + 1; ix++) {
          const x = ix * s + off;
          if (x * x + y * y > R * R) continue;
          if (this.particles.length >= MAX_PARTICLES) break;
          const k = compressed ? 0.55 : 1;
          const jx = U.rand(-1, 1), jy = U.rand(-1, 1);
          const base = colorOverride || U.pick(mat.palette);
          const col = U.shade(base, U.rand(-0.045, 0.045));
          this.particles.push({
            x: cx + x * k + jx, y: cy + y * k + jy,
            px: cx + x * k + jx, py: cy + y * k + jy,
            r: mat.pr, h: mat.restH,
            col: [col[0], col[1], col[2]],
            temp: 0, air: 0, bake: 0, wet: 0,
            bc: 0, _sm: 1, _bm: 1, _pm: 1,
          });
        }
      }
      // bond neighbours within 1.9*spacing (first + second ring -> stable jiggle)
      const cut = s * 1.9, cut2 = cut * cut;
      for (let i = first; i < this.particles.length; i++) {
        for (let j = i + 1; j < this.particles.length; j++) {
          const a = this.particles[i], bp = this.particles[j];
          const dx = (bp.x - a.x) / (compressed ? 0.55 : 1), dy = (bp.y - a.y) / (compressed ? 0.55 : 1);
          const d2 = dx * dx + dy * dy;
          if (d2 < cut2) this._addBond(i, j, Math.sqrt(d2));
        }
      }
      // also bond new lump to existing nearby particles (dropping onto old dough merges)
      if (first > 0) {
        for (let i = first; i < this.particles.length; i++) {
          const a = this.particles[i];
          for (let j = 0; j < first; j++) {
            const bp = this.particles[j];
            if (U.dist(a.x, a.y, bp.x, bp.y) < cut) this._addBond(i, j, s);
          }
        }
      }
    }

    _addBond(i, j, rest) {
      const s = this.mat.spacing;
      rest = U.clamp(rest, s * 0.6, s * 2);
      this.bonds.push({ i, j, rest, rest0: rest, broken: false });
      this.particles[i].bc++; this.particles[j].bc++;
    }

    // ---- public tool primitives -------------------------------------------

    stampCut(pts, cx, cy, scale) {
      const poly = pts.map(p => [cx + p[0] * scale, cy + p[1] * scale]);
      const P = this.particles;
      let cut = 0;
      for (const b of this.bonds) {
        if (b.broken) continue;
        const a = P[b.i], c = P[b.j];
        const inA = U.inPoly(poly, a.x, a.y), inC = U.inPoly(poly, c.x, c.y);
        if (inA !== inC) { this._breakBond(b, false); cut++; }
      }
      if (cut > 0) {
        // nudge boundary apart so the cut opens visibly
        for (const p of P) {
          let best = 1e9, nx = 0, ny = 0;
          for (let e = 0; e < poly.length; e++) {
            const q0 = poly[e], q1 = poly[(e + 1) % poly.length];
            const t = U.clamp(((p.x - q0[0]) * (q1[0] - q0[0]) + (p.y - q0[1]) * (q1[1] - q0[1])) /
              (Math.pow(q1[0] - q0[0], 2) + Math.pow(q1[1] - q0[1], 2) + 1e-6), 0, 1);
            const ex = q0[0] + (q1[0] - q0[0]) * t, ey = q0[1] + (q1[1] - q0[1]) * t;
            const d = U.dist(p.x, p.y, ex, ey);
            if (d < best) { best = d; nx = p.x - ex; ny = p.y - ey; }
          }
          if (best < this.mat.spacing * 0.9 && best > 0.01) {
            const inside = U.inPoly(poly, p.x, p.y) ? -1 : 1;
            p.x += (nx / best) * 3.5 * inside * -1;
            p.y += (ny / best) * 3.5 * inside * -1;
          }
        }
        this.events.push({ t: 'cut', x: cx, y: cy, v: Math.min(1, cut / 30) });
      }
      return cut;
    }

    injectColor(x, y, rgb) {
      let n = 0;
      for (const p of this.particles) {
        const d = U.dist(x, y, p.x, p.y);
        if (d < 56) {
          const w = 1 - d / 56;
          p.col = U.mixCol(p.col, rgb, 0.55 + 0.45 * w); // vivid dab that kneading then marbles
          n++;
        }
      }
      if (n) this.events.push({ t: 'drop', x, y, v: 1 });
      return n;
    }

    addHeat(x, y, r, amount) { // amount per second, +hot / -cold
      for (const p of this.particles) {
        const d = U.dist(x, y, p.x, p.y);
        if (d < r) {
          const w = 1 - d / r;
          p.temp = U.clamp(p.temp + amount * w, -1, 1);
        }
      }
    }

    popAt(x, y, r) {
      const idx = [];
      for (let i = 0; i < this.particles.length && idx.length < 4; i++) {
        const p = this.particles[i];
        if (U.dist(x, y, p.x, p.y) < r && p.air > 0.15) idx.push(i);
      }
      if (!idx.length) return 0;
      this._removeParticles(new Set(idx));
      this.events.push({ t: 'pop', x, y, v: Math.min(1, idx.length / 3) });
      return idx.length;
    }

    _removeParticles(set) {
      const remap = new Map();
      const np = [];
      this.particles.forEach((p, i) => { if (!set.has(i)) { remap.set(i, np.length); np.push(p); } });
      const nb = [];
      for (const b of this.bonds) {
        if (b.broken || set.has(b.i) || set.has(b.j)) continue;
        b.i = remap.get(b.i); b.j = remap.get(b.j);
        nb.push(b);
      }
      this.stickers = this.stickers.filter(st => {
        const i = this.particles.indexOf(st.p);
        return !set.has(i);
      });
      this.particles = np; this.bonds = nb;
    }

    _breakBond(b, isTear) {
      if (b.broken) return;
      b.broken = true;
      this.particles[b.i].bc--; this.particles[b.j].bc--;
      const a = this.particles[b.i], c = this.particles[b.j];
      const x = (a.x + c.x) / 2, y = (a.y + c.y) / 2;
      const hard = (a._sm + c._sm) / 2 > 1.8;
      if (hard) {
        this.cracks.push({ x0: a.x, y0: a.y, x1: c.x, y1: c.y, age: 0 });
        if (this.events.length < 60 && Math.random() < 0.4) this.events.push({ t: 'crack', x, y, v: 1 });
      } else if (isTear && this.events.length < 60 && Math.random() < 0.35) {
        this.events.push({ t: 'tear', x, y, v: 1 }); // sampled: crumbly materials break in bursts
      }
    }

    // ---- main step ---------------------------------------------------------

    step(dt, fingers) {
      dt = Math.min(dt, 1 / 30);
      this.time += dt;
      const mat = this.mat;
      if (!mat || !this.particles.length) { this._computeStats(dt, fingers, 0, 0); return; }

      // thermal pass: ambient decay + material hook -> per-particle multipliers
      let heatSum = 0;
      for (const p of this.particles) {
        p.temp = U.ease(p.temp, 0, 0.10, dt);
        p._sm = 1; p._bm = 1; p._pm = 1;
        if (mat.thermal) {
          const m = mat.thermal(p, mat, dt);
          if (m) { p._sm = m.stiffMul || 1; p._bm = m.breakMul || 1; p._pm = m.plasticMul || 1; }
        }
        heatSum += Math.max(0, p.temp);
      }

      const h = dt / SUBSTEPS;
      let maxStrain = 0, pressAmt = 0;
      for (let ss = 0; ss < SUBSTEPS; ss++) {
        pressAmt = Math.max(pressAmt, this._applyFingers(h, fingers, ss === 0 ? dt : 0));
        this._integrate(h);
        maxStrain = Math.max(maxStrain, this._solveBonds(h));
        this._contacts(h);
        this._boundsClamp();
      }
      this._heightAndFlow(dt, fingers);
      if (mat.special && mat.special.popAir) this._regrowFoam(dt);
      this._computeStats(dt, fingers, maxStrain, pressAmt, heatSum);

      for (const c of this.cracks) c.age += dt;
      if (this.cracks.length > 40) this.cracks.splice(0, this.cracks.length - 40);
      if (this.events.length > 60) this.events.length = 60;
    }

    _applyFingers(h, fingers, fullDt) {
      const mat = this.mat;
      let pressOut = 0;
      for (const f of fingers) {
        if (!f.down || f.mode !== 'hand') continue;
        const fdx = (f.x - f.px) / SUBSTEPS, fdy = (f.y - f.py) / SUBSTEPS;
        const speed = U.len(f.x - f.px, f.y - f.py) / Math.max(fullDt || 1 / 60, 1 / 240);
        const still = U.clamp(1 - speed / 260, 0, 1);   // slow finger => press/squish
        let touching = 0;
        for (const p of this.particles) {
          const dx = p.x - f.x, dy = p.y - f.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d > FINGER_R) continue;
          const w = Math.pow(1 - d / FINGER_R, 1.5);
          touching = Math.max(touching, w);
          // drag coupling: carry most of the motion, keep a bit as velocity
          const grab = 0.92 * w;
          p.x += fdx * grab; p.y += fdy * grab;
          p.px += fdx * grab * 0.82; p.py += fdy * grab * 0.82;
          if (still > 0.25) {
            // press: flatten + radial ooze outward
            p.h = Math.max(0.12, p.h - h * 2.6 * w * still);
            if (d > 1) {
              const push = h * 34 * w * still * (1 - p.h);
              p.x += (dx / d) * push; p.y += (dy / d) * push;
            }
            // sticky hold: extra damping under a resting finger
            p.px = U.lerp(p.px, p.x, 0.25 * w);
            p.py = U.lerp(p.py, p.y, 0.25 * w);
          }
          if (mat.frictionHeat > 0 && speed > 90) {
            p.temp = U.clamp(p.temp + mat.frictionHeat * w * Math.min(speed / 600, 1) * h * 6, -1, 1);
          }
        }
        if (touching > 0.05) {
          pressOut = Math.max(pressOut, still * touching);
          // knead detection: direction reversals while touching
          if (fullDt > 0) {
            const dot = fdx * (f._ldx || 0) + fdy * (f._ldy || 0);
            if (dot < -0.4 && speed > 120) this._kneadPulse = Math.min(1, this._kneadPulse + 0.28);
            f._ldx = fdx; f._ldy = fdy;
          }
        }
      }
      return pressOut;
    }

    _integrate(h) {
      const damp = this.mat.damp;
      const k = Math.pow(1 - damp, h * 60);
      const vCap = this.mat.spacing * 0.85; // per-substep speed cap (anti-explosion)
      for (const p of this.particles) {
        let vx = (p.x - p.px) * k, vy = (p.y - p.py) * k;
        const v = Math.sqrt(vx * vx + vy * vy);
        if (v > vCap) { vx *= vCap / v; vy *= vCap / v; }
        p.px = p.x; p.py = p.y;
        p.x += vx; p.y += vy;
      }
    }

    _solveBonds(h) {
      const mat = this.mat, P = this.particles;
      let maxStrain = 0;
      for (let it = 0; it < ITERS; it++) {
        for (const b of this.bonds) {
          if (b.broken) continue;
          const a = P[b.i], c = P[b.j];
          const dx = c.x - a.x, dy = c.y - a.y;
          let d = Math.sqrt(dx * dx + dy * dy);
          if (d < 1e-4) d = 1e-4;
          const airMul = 1 + 0.4 * (a.air + c.air) / 2;
          const rest = b.rest * airMul;
          const stiff = mat.stiff * Math.min(3, (a._sm + c._sm) / 2);
          const diff = ((d - rest) / d) * 0.5 * Math.min(1, stiff);
          a.x += dx * diff; a.y += dy * diff;
          c.x -= dx * diff; c.y -= dy * diff;
        }
      }
      // bond-normal velocity damping: kills high-frequency buzz from stiff
      // constraints while preserving whole-body jiggle/wobble modes
      for (const b of this.bonds) {
        if (b.broken) continue;
        const a = P[b.i], c = P[b.j];
        const dx = c.x - a.x, dy = c.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1e-4;
        const nx = dx / d, ny = dy / d;
        const vn = ((c.x - c.px) - (a.x - a.px)) * nx + ((c.y - c.py) - (a.y - a.py)) * ny;
        const jimp = vn * 0.125; // β/2
        a.px -= nx * jimp; a.py -= ny * jimp;
        c.px += nx * jimp; c.py += ny * jimp;
      }
      // plasticity / memory / breaking (once per substep, on final geometry)
      const dt60 = h * 60;
      // colors blend only while the child is working the material — an
      // untouched marble pattern stays put for them to admire
      const act = 0.06 + 0.94 * Math.min(1, this.stats.press + this.stats.knead + this.stats.jiggle);
      for (const b of this.bonds) {
        if (b.broken) continue;
        const a = P[b.i], c = P[b.j];
        const d = U.dist(a.x, a.y, c.x, c.y);
        // strain measured against the air-inflated rest, so puffing (bread,
        // marshmallow, foam) doesn't tear the material by itself
        const airMul = 1 + 0.4 * (a.air + c.air) / 2;
        const strain = d / (b.rest0 * airMul);
        maxStrain = Math.max(maxStrain, strain);
        const breakAt = mat.breakStrain * (a._bm + c._bm) / 2;
        if (strain > breakAt) { this._breakBond(b, true); continue; }
        const dev = d - b.rest * airMul;
        const yieldLen = mat.plastic.yield * b.rest0;
        if (Math.abs(dev) > yieldLen) {
          b.rest += dev * mat.plastic.rate * (a._pm + c._pm) / 2 * dt60 * 0.35;
        }
        if (mat.memory > 0) b.rest += (b.rest0 - b.rest) * mat.memory * dt60 * 0.12;
        if (mat.spread > 0 && b.rest < b.rest0 * 1.55) {
          b.rest += mat.spread * dt60 * 0.05;
        }
        b.rest = U.clamp(b.rest, b.rest0 * 0.55, b.rest0 * mat.breakStrain);
        // color diffusion across bonds (kneading blends)
        if (mat.mixRate > 0 && d < b.rest0 * 1.3) {
          // slow diffusion: the fun is WATCHING marble swirls blend over time
          const t = mat.mixRate * dt60 * 0.2 * act;
          const mr = (a.col[0] + c.col[0]) / 2, mg = (a.col[1] + c.col[1]) / 2, mb = (a.col[2] + c.col[2]) / 2;
          a.col[0] += (mr - a.col[0]) * t; a.col[1] += (mg - a.col[1]) * t; a.col[2] += (mb - a.col[2]) * t;
          c.col[0] += (mr - c.col[0]) * t; c.col[1] += (mg - c.col[1]) * t; c.col[2] += (mb - c.col[2]) * t;
        }
      }
      this.bonds = this.bonds.filter(b => !b.broken);
      return maxStrain;
    }

    // spatial hash: contact repulsion for non-bonded pairs + re-bonding (merge/knead)
    _contacts(h) {
      const mat = this.mat, P = this.particles, s = mat.spacing;
      const cell = s * 1.6, grid = this._grid;
      grid.clear();
      for (let i = 0; i < P.length; i++) {
        const key = (Math.floor(P[i].x / cell) * 73856093) ^ (Math.floor(P[i].y / cell) * 19349663);
        let arr = grid.get(key);
        if (!arr) { arr = []; grid.set(key, arr); }
        arr.push(i);
      }
      const bonded = new Set();
      for (const b of this.bonds) bonded.add(b.i < b.j ? b.i * 4096 + b.j : b.j * 4096 + b.i);
      const minD = s * 0.85, rbD = s * mat.rebond.dist;
      const rbProb = 1 - Math.exp(-mat.rebond.rate * h * 60 * 0.25);
      for (let i = 0; i < P.length; i++) {
        const a = P[i];
        const gx = Math.floor(a.x / cell), gy = Math.floor(a.y / cell);
        for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
          const arr = grid.get(((gx + ox) * 73856093) ^ ((gy + oy) * 19349663));
          if (!arr) continue;
          for (const j of arr) {
            if (j <= i) continue;
            const c = P[j];
            const dx = c.x - a.x, dy = c.y - a.y;
            const d2 = dx * dx + dy * dy;
            if (d2 > rbD * rbD) continue;
            const key = i * 4096 + j;
            const isBonded = bonded.has(key);
            const d = Math.sqrt(d2) || 1e-4;
            if (!isBonded) {
              const airMul = 1 + 0.4 * (a.air + c.air) / 2;
              if (d < minD * airMul) { // contact repulsion
                const diff = ((d - minD * airMul) / d) * 0.35;
                a.x += dx * diff; a.y += dy * diff;
                c.x -= dx * diff; c.y -= dy * diff;
              }
              if (a.bc < 8 && c.bc < 8 && Math.random() < rbProb) {
                // rest never below ~spacing: prevents a contraction ratchet
                // where churned short bonds slowly crush the blob
                this._addBond(i, j, Math.max(d, s * 0.98));
                bonded.add(key);
                if (this.events.length < 60 && Math.random() < 0.08) {
                  this.events.push({ t: 'rebond', x: (a.x + c.x) / 2, y: (a.y + c.y) / 2, v: 0.4 });
                }
              }
            }
          }
        }
      }
    }

    _boundsClamp() {
      const b = this.bounds, m = 8;
      for (const p of this.particles) {
        if (p.x < b.x + m) { p.x = b.x + m; p.px = U.lerp(p.px, p.x, 0.5); }
        else if (p.x > b.x + b.w - m) { p.x = b.x + b.w - m; p.px = U.lerp(p.px, p.x, 0.5); }
        if (p.y < b.y + m) { p.y = b.y + m; p.py = U.lerp(p.py, p.y, 0.5); }
        else if (p.y > b.y + b.h - m) { p.y = b.y + b.h - m; p.py = U.lerp(p.py, p.y, 0.5); }
      }
    }

    _heightAndFlow(dt, fingers) {
      const mat = this.mat;
      for (const p of this.particles) {
        p.h = U.ease(p.h, mat.restH + 0.25 * p.air, mat.hRecover, dt);
        if (mat.spread > 0) p.h = Math.min(p.h, U.ease(p.h, 0.38, mat.spread * 0.35, dt));
      }
    }

    _regrowFoam(dt) {
      if (this.particles.length >= this._initialCount || this.particles.length === 0) return;
      if (Math.random() < dt * 2.2) {
        const src = U.pick(this.particles);
        const a = Math.random() * Math.PI * 2;
        const i = this.particles.length;
        const col = U.pick(this.mat.palette);
        this.particles.push({
          x: src.x + Math.cos(a) * 6, y: src.y + Math.sin(a) * 6,
          px: src.x + Math.cos(a) * 6, py: src.y + Math.sin(a) * 6,
          r: this.mat.pr, h: 0.3, col: [col[0], col[1], col[2]],
          temp: 0, air: 0.05, bake: 0, wet: 0, bc: 0, _sm: 1, _bm: 1, _pm: 1,
        });
        const srcIdx = this.particles.indexOf(src);
        if (srcIdx >= 0) this._addBond(srcIdx, i, this.mat.spacing * 0.8);
      }
    }

    _computeStats(dt, fingers, maxStrain, pressAmt, heatSum) {
      const st = this.stats, n = this.particles.length || 1;
      let sp = 0;
      for (const p of this.particles) sp += U.len(p.x - p.px, p.y - p.py);
      sp = sp / n * 60; // avg speed px/s
      this._kneadPulse = Math.max(0, this._kneadPulse - dt * 1.6);
      st.press = U.ease(st.press, pressAmt, 12, dt);
      st.stretch = U.ease(st.stretch, U.clamp((maxStrain - 1.05) / Math.max(0.3, this.mat ? this.mat.breakStrain - 1 : 1), 0, 1), 10, dt);
      st.jiggle = U.ease(st.jiggle, U.clamp(sp / 220, 0, 1), 8, dt);
      st.knead = this._kneadPulse;
      st.heat = U.ease(st.heat, U.clamp((heatSum || 0) / n * 2.2, 0, 1), 4, dt);
      st.size = n / 420;
    }
  }

  YL.Sim = Sim;
})();
