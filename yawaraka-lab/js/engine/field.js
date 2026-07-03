/* やわらかラボ — density field + marching squares contour extraction.
 * Blobs are rendered as iso-contours of a particle density field, so tearing,
 * merging and any topology change "just work" visually. */
(function () {
  'use strict';
  const U = YL.U;

  class Field {
    constructor(cell) {
      this.cell = cell || 9;
      this.nx = 0; this.ny = 0;      // node counts
      this.v = null;                  // Float32Array of node values
      this.iso = 0.45;
    }

    resize(w, h) {
      this.w = w; this.h = h;
      this.nx = Math.max(4, Math.ceil(w / this.cell) + 3);
      this.ny = Math.max(4, Math.ceil(h / this.cell) + 3);
      this.v = new Float32Array(this.nx * this.ny);
    }

    clear() { this.v.fill(0); }

    // Splat a smooth kernel: contribution (1-t^2)^2, t = d/R, R = r*2.
    // A lone particle reads ~0.45 at d≈1.15r, so iso 0.45 hugs single particles
    // while nearby particles sum into gooey bridges.
    splat(x, y, r, w) {
      const cell = this.cell, R = r * 2, R2 = R * R, nx = this.nx, ny = this.ny;
      const gx0 = Math.max(0, Math.floor((x - R) / cell)), gx1 = Math.min(nx - 1, Math.ceil((x + R) / cell));
      const gy0 = Math.max(0, Math.floor((y - R) / cell)), gy1 = Math.min(ny - 1, Math.ceil((y + R) / cell));
      const amp = w === undefined ? 1 : w;
      for (let gy = gy0; gy <= gy1; gy++) {
        const dy = gy * cell - y, dy2 = dy * dy, row = gy * nx;
        for (let gx = gx0; gx <= gx1; gx++) {
          const dx = gx * cell - x;
          const d2 = dx * dx + dy2;
          if (d2 >= R2) continue;
          const q = 1 - d2 / R2;
          this.v[row + gx] += q * q * amp;
        }
      }
    }

    // Marching squares with directed segments (inside kept on the LEFT, y-down),
    // chained into closed loops. Outer loops and holes wind oppositely, so a
    // single Path2D filled with 'nonzero' renders holes correctly.
    contours() {
      const nx = this.nx, ny = this.ny, v = this.v, iso = this.iso, cell = this.cell;
      // edge ids: horizontal edge right of node(i,j) => (j*nx+i)*2 ; vertical below => *2+1
      const segs = new Map(); // fromEdgeId -> {to, x0,y0,x1,y1}
      const pt = (i0, j0, i1, j1) => { // interpolated crossing on edge between two nodes
        const a = v[j0 * nx + i0], b = v[j1 * nx + i1];
        const t = (iso - a) / (b - a);
        return [(i0 + (i1 - i0) * t) * cell, (j0 + (j1 - j0) * t) * cell];
      };
      const eT = (i, j) => (j * nx + i) * 2;         // top edge of cell(i,j)
      const eB = (i, j) => ((j + 1) * nx + i) * 2;   // bottom
      const eL = (i, j) => (j * nx + i) * 2 + 1;     // left
      const eR = (i, j) => (j * nx + i + 1) * 2 + 1; // right
      for (let j = 0; j < ny - 1; j++) {
        for (let i = 0; i < nx - 1; i++) {
          const tl = v[j * nx + i] >= iso, tr = v[j * nx + i + 1] >= iso;
          const br = v[(j + 1) * nx + i + 1] >= iso, bl = v[(j + 1) * nx + i] >= iso;
          const c = (tl ? 1 : 0) | (tr ? 2 : 0) | (br ? 4 : 0) | (bl ? 8 : 0);
          if (c === 0 || c === 15) continue;
          const T = () => pt(i, j, i + 1, j), B = () => pt(i, j + 1, i + 1, j + 1);
          const L = () => pt(i, j, i, j + 1), R = () => pt(i + 1, j, i + 1, j + 1);
          const add = (fe, te, p0, p1) => segs.set(fe, { to: te, x0: p0[0], y0: p0[1], x1: p1[0], y1: p1[1] });
          switch (c) {
            case 1: add(eL(i, j), eT(i, j), L(), T()); break;
            case 2: add(eT(i, j), eR(i, j), T(), R()); break;
            case 4: add(eR(i, j), eB(i, j), R(), B()); break;
            case 8: add(eB(i, j), eL(i, j), B(), L()); break;
            case 3: add(eL(i, j), eR(i, j), L(), R()); break;
            case 6: add(eT(i, j), eB(i, j), T(), B()); break;
            case 12: add(eR(i, j), eL(i, j), R(), L()); break;
            case 9: add(eB(i, j), eT(i, j), B(), T()); break;
            case 7: add(eL(i, j), eB(i, j), L(), B()); break;
            case 14: add(eT(i, j), eL(i, j), T(), L()); break;
            case 13: add(eR(i, j), eT(i, j), R(), T()); break;
            case 11: add(eB(i, j), eR(i, j), B(), R()); break;
            case 5: { // ambiguous: sample cell center
              const mid = (v[j * nx + i] + v[j * nx + i + 1] + v[(j + 1) * nx + i] + v[(j + 1) * nx + i + 1]) / 4;
              if (mid >= iso) { add(eR(i, j), eT(i, j), R(), T()); add(eL(i, j), eB(i, j), L(), B()); }
              else { add(eL(i, j), eT(i, j), L(), T()); add(eR(i, j), eB(i, j), R(), B()); }
              break;
            }
            case 10: {
              const mid = (v[j * nx + i] + v[j * nx + i + 1] + v[(j + 1) * nx + i] + v[(j + 1) * nx + i + 1]) / 4;
              if (mid >= iso) { add(eT(i, j), eL(i, j), T(), L()); add(eB(i, j), eR(i, j), B(), R()); }
              else { add(eT(i, j), eR(i, j), T(), R()); add(eB(i, j), eL(i, j), B(), L()); }
              break;
            }
          }
        }
      }
      // chain directed segments into loops
      const loops = [];
      const used = new Set();
      for (const [start, seg0] of segs) {
        if (used.has(start)) continue;
        const loop = [];
        let key = start, seg = seg0, guard = 0;
        while (seg && !used.has(key) && guard++ < 100000) {
          used.add(key);
          loop.push(seg.x0, seg.y0);
          key = seg.to;
          seg = segs.get(key);
          if (key === start) break;
        }
        if (loop.length >= 8) loops.push(loop); // >=4 points
      }
      return loops; // flat [x,y,x,y,...] per loop
    }

    // Smooth closed loop -> Path2D via midpoint quadratic curves
    static loopPath(path, loop) {
      const n = loop.length / 2;
      let mx = (loop[0] + loop[(n - 1) * 2]) / 2, my = (loop[1] + loop[(n - 1) * 2 + 1]) / 2;
      path.moveTo(mx, my);
      for (let k = 0; k < n; k++) {
        const cx = loop[k * 2], cy = loop[k * 2 + 1];
        const nxt = (k + 1) % n;
        const nx2 = (cx + loop[nxt * 2]) / 2, ny2 = (cy + loop[nxt * 2 + 1]) / 2;
        path.quadraticCurveTo(cx, cy, nx2, ny2);
      }
      path.closePath();
    }
  }

  YL.Field = Field;
})();
