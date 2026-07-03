/* やわらかラボ — utils */
(function () {
  'use strict';
  window.YL = window.YL || {};
  const U = {
    clamp(v, a, b) { return v < a ? a : v > b ? b : v; },
    lerp(a, b, t) { return a + (b - a) * t; },
    dist(x0, y0, x1, y1) { const dx = x1 - x0, dy = y1 - y0; return Math.sqrt(dx * dx + dy * dy); },
    len(dx, dy) { return Math.sqrt(dx * dx + dy * dy); },
    rand(a, b) { return a + Math.random() * (b - a); },
    randInt(a, b) { return Math.floor(U.rand(a, b + 1)); },
    pick(arr) { return arr[(Math.random() * arr.length) | 0]; },
    smoothstep(e0, e1, x) {
      const t = U.clamp((x - e0) / (e1 - e0), 0, 1);
      return t * t * (3 - 2 * t);
    },
    // exponential ease toward target, frame-rate independent
    ease(cur, target, rate, dt) { return cur + (target - cur) * (1 - Math.exp(-rate * dt)); },
    mixCol(a, b, t) {
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    },
    rgb(c, alpha) {
      return alpha === undefined
        ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`
        : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${alpha})`;
    },
    hexToRgb(h) {
      const n = parseInt(h.replace('#', ''), 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    },
    shade(c, f) { // f>0 lighten toward white, f<0 darken
      if (f >= 0) return [c[0] + (255 - c[0]) * f, c[1] + (255 - c[1]) * f, c[2] + (255 - c[2]) * f];
      const g = 1 + f;
      return [c[0] * g, c[1] * g, c[2] * g];
    },
    // point-in-polygon (pts = [[x,y]...])
    inPoly(pts, x, y) {
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      }
      return inside;
    },
    // segment (a-b) vs segment (c-d) intersection test
    segX(ax, ay, bx, by, cx, cy, dx, dy) {
      const d1 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
      const d2 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
      const d3 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx);
      const d4 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
      return d1 * d2 < 0 && d3 * d4 < 0;
    },
  };
  YL.U = U;
})();
