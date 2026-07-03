/* やわらかラボ — SVG icon factory. Pure code-drawn icons, no external refs,
 * no text glyphs. YL.Icons.make(kind, opts) -> SVGElement (viewBox 0 0 64 64).
 * kind = material id | tool id | sub-icon id. opts = {base, accent, col}. */
(function () {
  'use strict';
  window.YL = window.YL || {};

  const NS = 'http://www.w3.org/2000/svg';

  function mk(tag, attrs) {
    const e = document.createElementNS(NS, tag);
    if (attrs) {
      for (const k in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
      }
    }
    return e;
  }

  function svgRoot() {
    return mk('svg', { viewBox: '0 0 64 64', 'aria-hidden': 'true', focusable: 'false' });
  }

  // ---- small kawaii face: two dot eyes + a soft smile --------------------
  function addFace(svg, cx, cy, spread, opts) {
    opts = opts || {};
    const eyeR = opts.eyeR || 2.1;
    const col = opts.col || '#3a3230';
    svg.appendChild(mk('circle', { cx: cx - spread, cy, r: eyeR, fill: col }));
    svg.appendChild(mk('circle', { cx: cx + spread, cy, r: eyeR, fill: col }));
    const my = cy + spread * 0.9;
    svg.appendChild(mk('path', {
      d: `M${cx - spread * 0.7},${my} Q${cx},${my + spread * 0.55} ${cx + spread * 0.7},${my}`,
      fill: 'none', stroke: col, 'stroke-width': 1.6, 'stroke-linecap': 'round',
    }));
  }

  // ---- wobbly blob path helpers -------------------------------------------
  function smoothClosedPath(pts) {
    const n = pts.length;
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const m0 = mid(pts[n - 1], pts[0]);
    let d = `M${m0[0].toFixed(1)},${m0[1].toFixed(1)} `;
    for (let i = 0; i < n; i++) {
      const nxt = pts[(i + 1) % n];
      const m = mid(pts[i], nxt);
      d += `Q${pts[i][0].toFixed(1)},${pts[i][1].toFixed(1)} ${m[0].toFixed(1)},${m[1].toFixed(1)} `;
    }
    return d + 'Z';
  }

  function blobPath(cx, cy, r, n, amp, phase) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const rr = r * (1 + amp * Math.sin(a * 3 + phase) + amp * 0.5 * Math.sin(a * 5 - phase));
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.92]);
    }
    return smoothClosedPath(pts);
  }

  // ---- polygon helpers (star/heart/flower/circle) -------------------------
  function starPts(cx, cy, rOuter, rInner, n) {
    n = n || 10;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      const r = (i % 2 === 0) ? rOuter : rInner;
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    return pts;
  }
  function heartPts(cx, cy, scale) {
    const pts = [], N = 18;
    for (let i = 0; i < N; i++) {
      const t = (i / N) * Math.PI * 2;
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      pts.push([cx + (x / 17) * scale, cy + (y / 17) * scale]);
    }
    return pts;
  }
  function flowerPts(cx, cy, scale) {
    const pts = [], N = 20;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const r = (0.58 + 0.42 * Math.abs(Math.cos(2.5 * a))) * scale;
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    return pts;
  }
  function polyPath(pts) {
    let d = '';
    for (let i = 0; i < pts.length; i++) {
      d += (i === 0 ? 'M' : 'L') + pts[i][0].toFixed(1) + ',' + pts[i][1].toFixed(1) + ' ';
    }
    return d + 'Z';
  }
  function teardrop(cx, cy, r) {
    return `M${cx},${cy - r} C${cx + r},${cy - r * 0.1} ${cx + r * 0.75},${cy + r} ${cx},${cy + r} ` +
      `C${cx - r * 0.75},${cy + r} ${cx - r},${cy - r * 0.1} ${cx},${cy - r} Z`;
  }
  function polarXY(cx, cy, r, deg) {
    const rad = (deg - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }
  function arcPath(cx, cy, r, startDeg, endDeg) {
    const start = polarXY(cx, cy, r, endDeg);
    const end = polarXY(cx, cy, r, startDeg);
    const large = endDeg - startDeg <= 180 ? 0 : 1;
    return `M${start.x.toFixed(1)},${start.y.toFixed(1)} A${r},${r} 0 ${large} 0 ${end.x.toFixed(1)},${end.y.toFixed(1)}`;
  }

  // =========================================================================
  // 12 material blobs — silhouette in ui.base/accent + a tiny kawaii face
  // =========================================================================
  const MATERIAL_DRAW = {

    nendo(svg, o) {
      const base = o.base || '#c96e48', accent = o.accent || '#e6a878';
      svg.appendChild(mk('path', { d: blobPath(32, 34, 22, 10, 0.09, 0.4), fill: base }));
      svg.appendChild(mk('ellipse', { cx: 26, cy: 24, rx: 8, ry: 5, fill: accent, opacity: 0.55 }));
      addFace(svg, 32, 34, 6.5);
    },

    slime(svg, o) {
      const base = o.base || '#7ee787', accent = o.accent || '#a5f3b8';
      svg.appendChild(mk('path', { d: blobPath(32, 28, 19, 10, 0.1, 1.1), fill: base, opacity: 0.92 }));
      svg.appendChild(mk('path', { d: 'M28,44 Q26,54 30,57 Q34,54 32,44 Z', fill: base, opacity: 0.88 }));
      svg.appendChild(mk('ellipse', { cx: 25, cy: 21, rx: 7, ry: 4, fill: accent, opacity: 0.6 }));
      addFace(svg, 32, 28, 6.3);
    },

    mochi(svg, o) {
      const base = o.base || '#faf5f5', accent = o.accent || '#fadce4';
      svg.appendChild(mk('circle', { cx: 22, cy: 37, r: 14, fill: base }));
      svg.appendChild(mk('circle', { cx: 42, cy: 37, r: 14, fill: base }));
      svg.appendChild(mk('ellipse', { cx: 18, cy: 31, rx: 4, ry: 3, fill: accent, opacity: 0.6 }));
      svg.appendChild(mk('ellipse', { cx: 38, cy: 31, rx: 4, ry: 3, fill: accent, opacity: 0.6 }));
      addFace(svg, 32, 37, 9);
    },

    pan(svg, o) {
      const base = o.base || '#f0e1be', accent = o.accent || '#f5edd8';
      svg.appendChild(mk('path', { d: 'M10,44 Q10,18 32,16 Q54,18 54,44 Q54,50 32,50 Q10,50 10,44 Z', fill: base }));
      svg.appendChild(mk('path', { d: 'M22,25 Q32,21 42,25', fill: 'none', stroke: accent, 'stroke-width': 2.4, 'stroke-linecap': 'round', opacity: 0.8 }));
      svg.appendChild(mk('path', { d: 'M20,31 Q32,27 44,31', fill: 'none', stroke: accent, 'stroke-width': 2, 'stroke-linecap': 'round', opacity: 0.6 }));
      addFace(svg, 32, 39, 7);
    },

    purin(svg, o) {
      const base = o.base || '#ffe082', accent = o.accent || '#c8964a';
      svg.appendChild(mk('path', { d: 'M18,46 L22,20 Q32,16 42,20 L46,46 Q32,52 18,46 Z', fill: base }));
      svg.appendChild(mk('ellipse', { cx: 32, cy: 20, rx: 10, ry: 4, fill: accent, opacity: 0.85 }));
      addFace(svg, 32, 35, 6.5);
    },

    cream(svg, o) {
      const base = o.base || '#fffcf8', accent = o.accent || '#fff1f2';
      svg.appendChild(mk('ellipse', { cx: 32, cy: 47, rx: 18, ry: 8, fill: base }));
      svg.appendChild(mk('ellipse', { cx: 32, cy: 37, rx: 13, ry: 7, fill: base }));
      svg.appendChild(mk('ellipse', { cx: 32, cy: 28, rx: 9, ry: 6, fill: base }));
      svg.appendChild(mk('ellipse', { cx: 32, cy: 20, rx: 5, ry: 4, fill: base }));
      svg.appendChild(mk('ellipse', { cx: 27, cy: 41, rx: 4, ry: 2.4, fill: accent, opacity: 0.7 }));
      addFace(svg, 32, 39, 6);
    },

    choco(svg, o) {
      const base = o.base || '#78482d', accent = o.accent || '#965f3c';
      svg.appendChild(mk('rect', { x: 12, y: 16, width: 40, height: 36, rx: 8, fill: base }));
      svg.appendChild(mk('path', { d: 'M12,34 L52,34', stroke: accent, 'stroke-width': 2, opacity: 0.6 }));
      svg.appendChild(mk('path', { d: 'M32,16 L32,52', stroke: accent, 'stroke-width': 2, opacity: 0.6 }));
      addFace(svg, 32, 32, 6.5, { col: '#f5e6d8' });
    },

    cookie(svg, o) {
      const base = o.base || '#deb478', accent = o.accent || '#9a6b3c';
      svg.appendChild(mk('path', { d: blobPath(32, 32, 21, 12, 0.05, 0.7), fill: base }));
      const chips = [[24, 22], [40, 24], [20, 37], [38, 39], [30, 45]];
      chips.forEach((c) => svg.appendChild(mk('circle', { cx: c[0], cy: c[1], r: 2.4, fill: accent })));
      addFace(svg, 32, 30, 6.5);
    },

    jelly(svg, o) {
      const base = o.base || '#ff5a6e', accent = o.accent || '#ff9a80';
      svg.appendChild(mk('path', { d: 'M12,46 Q10,22 32,18 Q54,22 52,46 Q32,54 12,46 Z', fill: base, opacity: 0.72 }));
      svg.appendChild(mk('ellipse', { cx: 24, cy: 26, rx: 6, ry: 3.5, fill: accent, opacity: 0.6 }));
      addFace(svg, 32, 36, 6.5, { col: '#5a1f2c' });
    },

    mallow(svg, o) {
      const base = o.base || '#fffafa', accent = o.accent || '#ffe1e8';
      svg.appendChild(mk('rect', { x: 16, y: 20, width: 32, height: 28, rx: 14, fill: base }));
      svg.appendChild(mk('ellipse', { cx: 32, cy: 20, rx: 16, ry: 6, fill: accent, opacity: 0.7 }));
      addFace(svg, 32, 37, 7);
    },

    sand(svg, o) {
      const base = o.base || '#e1cda5', accent = o.accent || '#a89060';
      svg.appendChild(mk('path', { d: 'M12,48 Q12,30 32,28 Q52,30 52,48 Z', fill: base }));
      svg.appendChild(mk('rect', { x: 16, y: 22, width: 6, height: 8, fill: base }));
      svg.appendChild(mk('rect', { x: 29, y: 18, width: 6, height: 12, fill: base }));
      svg.appendChild(mk('rect', { x: 42, y: 22, width: 6, height: 8, fill: base }));
      svg.appendChild(mk('path', { d: 'M14,44 Q32,40 50,44', stroke: accent, 'stroke-width': 1.6, fill: 'none', opacity: 0.6 }));
      addFace(svg, 32, 41, 6.5);
    },

    awa(svg, o) {
      const base = o.base || '#e1f0ff', accent = o.accent || '#f0f8ff';
      svg.appendChild(mk('circle', { cx: 24, cy: 37, r: 12, fill: base, opacity: 0.85 }));
      svg.appendChild(mk('circle', { cx: 43, cy: 34, r: 10, fill: base, opacity: 0.85 }));
      svg.appendChild(mk('circle', { cx: 34, cy: 21, r: 8, fill: base, opacity: 0.85 }));
      svg.appendChild(mk('ellipse', { cx: 20, cy: 32, rx: 3, ry: 2, fill: accent, opacity: 0.8 }));
      addFace(svg, 30, 37, 6, { col: '#6a89a8' });
    },
  };

  // =========================================================================
  // tool / control icons
  // =========================================================================
  const TOOL_DRAW = {

    hand(svg) {
      const skin = '#ffd9b0', line = '#d9a878';
      svg.appendChild(mk('rect', { x: 18, y: 30, width: 28, height: 20, rx: 10, fill: skin }));
      [21, 28, 35, 42].forEach((fx) => {
        svg.appendChild(mk('rect', { x: fx, y: 12, width: 5, height: 20, rx: 2.5, fill: skin }));
      });
      svg.appendChild(mk('rect', { x: 8, y: 34, width: 14, height: 8, rx: 4, fill: skin, transform: 'rotate(-25 15 38)' }));
      svg.appendChild(mk('path', { d: 'M20,31 Q32,27 44,31', stroke: line, 'stroke-width': 1.4, fill: 'none', opacity: 0.5 }));
    },

    cutter(svg) {
      const pts = starPts(32, 32, 20, 9, 10);
      svg.appendChild(mk('path', { d: polyPath(pts), fill: 'none', stroke: '#b9c4cf', 'stroke-width': 4, 'stroke-linejoin': 'round' }));
      svg.appendChild(mk('path', { d: polyPath(pts), fill: 'none', stroke: '#eef3f7', 'stroke-width': 1.6, 'stroke-linejoin': 'round' }));
    },

    heat(svg) {
      svg.appendChild(mk('path', {
        d: 'M32,14 Q40,20 38,30 Q46,28 44,38 Q38,50 32,50 Q26,50 20,38 Q18,28 26,30 Q24,20 32,14 Z',
        fill: '#ffb84d',
      }));
      svg.appendChild(mk('path', { d: 'M32,26 Q36,32 34,38 Q32,42 30,38 Q28,33 32,26 Z', fill: '#fff1c4' }));
    },

    cold(svg) {
      const col = '#8fc4f0';
      for (let i = 0; i < 3; i++) {
        const a = i * Math.PI / 3;
        const dx = Math.cos(a), dy = Math.sin(a);
        const x1 = 32 + dx * 18, y1 = 32 + dy * 18;
        const x2 = 32 - dx * 18, y2 = 32 - dy * 18;
        svg.appendChild(mk('line', { x1, y1, x2, y2, stroke: col, 'stroke-width': 3, 'stroke-linecap': 'round' }));
        [[x1, y1], [x2, y2]].forEach((p) => {
          const px = 32 + (p[0] - 32) * 0.6, py = 32 + (p[1] - 32) * 0.6;
          const perp = a + Math.PI / 2;
          svg.appendChild(mk('line', {
            x1: px + Math.cos(perp) * 5, y1: py + Math.sin(perp) * 5,
            x2: px - Math.cos(perp) * 5, y2: py - Math.sin(perp) * 5,
            stroke: col, 'stroke-width': 2, 'stroke-linecap': 'round',
          }));
        });
      }
      svg.appendChild(mk('circle', { cx: 32, cy: 32, r: 3, fill: col }));
    },

    color(svg) {
      const drops = [[24, 30, '#ff96be'], [40, 26, '#7dc8ff'], [32, 42, '#ffe06e']];
      drops.forEach((d) => svg.appendChild(mk('path', { d: teardrop(d[0], d[1], 9), fill: d[2], opacity: 0.92 })));
    },

    topping(svg) {
      svg.appendChild(mk('rect', { x: 18, y: 24, width: 28, height: 28, rx: 6, fill: '#fffdf6', stroke: '#e0c9a8', 'stroke-width': 2 }));
      svg.appendChild(mk('rect', { x: 20, y: 16, width: 24, height: 10, rx: 4, fill: '#e8c9a0' }));
      const sprinkles = [['#ff96be', 24, 32, 20], ['#7dc8ff', 34, 30, -15], ['#ffd34d', 30, 40, 40], ['#8fe0a8', 40, 40, -30]];
      sprinkles.forEach((s) => {
        svg.appendChild(mk('rect', {
          x: s[1] - 3, y: s[2] - 1, width: 6, height: 2, rx: 1, fill: s[0],
          transform: `rotate(${s[3]} ${s[1]} ${s[2]})`,
        }));
      });
    },

    reset(svg) {
      svg.appendChild(mk('path', { d: arcPath(32, 32, 18, 20, 300), fill: 'none', stroke: '#9ac48a', 'stroke-width': 4, 'stroke-linecap': 'round' }));
      svg.appendChild(mk('path', { d: 'M46,16 L50,22 L42,23 Z', fill: '#9ac48a' }));
      svg.appendChild(mk('circle', { cx: 32, cy: 32, r: 9, fill: '#f0d9b0' }));
      addFace(svg, 32, 32, 3.2, { eyeR: 1.3 });
    },

    soundOn(svg) {
      svg.appendChild(mk('path', { d: 'M14,26 L22,26 L32,16 L32,48 L22,38 L14,38 Z', fill: '#c9a06a' }));
      svg.appendChild(mk('path', { d: 'M38,22 Q46,32 38,42', stroke: '#c9a06a', fill: 'none', 'stroke-width': 3, 'stroke-linecap': 'round' }));
      svg.appendChild(mk('path', { d: 'M43,16 Q54,32 43,48', stroke: '#c9a06a', fill: 'none', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0.65 }));
    },

    soundOff(svg) {
      svg.appendChild(mk('path', { d: 'M14,26 L22,26 L32,16 L32,48 L22,38 L14,38 Z', fill: '#b7a99a' }));
      svg.appendChild(mk('line', { x1: 38, y1: 20, x2: 50, y2: 44, stroke: '#b7a99a', 'stroke-width': 3.4, 'stroke-linecap': 'round', opacity: 0.85 }));
    },
  };

  // =========================================================================
  // sub-tray icons: shapes / color dot / topping minis
  // =========================================================================
  const SUB_DRAW = {

    'shape-star'(svg) {
      svg.appendChild(mk('path', { d: polyPath(starPts(32, 32, 20, 9, 10)), fill: 'none', stroke: '#ff9ab0', 'stroke-width': 3.5, 'stroke-linejoin': 'round' }));
    },
    'shape-heart'(svg) {
      svg.appendChild(mk('path', { d: polyPath(heartPts(32, 30, 22)), fill: 'none', stroke: '#ff7fa5', 'stroke-width': 3.5, 'stroke-linejoin': 'round' }));
    },
    'shape-flower'(svg) {
      svg.appendChild(mk('path', { d: polyPath(flowerPts(32, 32, 20)), fill: 'none', stroke: '#c9a0ff', 'stroke-width': 3.5, 'stroke-linejoin': 'round' }));
    },
    'shape-circle'(svg) {
      svg.appendChild(mk('circle', { cx: 32, cy: 32, r: 19, fill: 'none', stroke: '#7dc8ff', 'stroke-width': 3.5 }));
    },

    'color-dot'(svg, o) {
      const col = (o && o.col) || '#ff96be';
      svg.appendChild(mk('circle', { cx: 32, cy: 32, r: 19, fill: col }));
      svg.appendChild(mk('ellipse', { cx: 26, cy: 25, rx: 5, ry: 3, fill: '#ffffff', opacity: 0.65 }));
    },

    'top-star'(svg) {
      svg.appendChild(mk('path', { d: polyPath(starPts(32, 32, 18, 8, 10)), fill: '#ffd34d', stroke: '#c88c00', 'stroke-width': 1.6, 'stroke-linejoin': 'round' }));
    },
    'top-heart'(svg) {
      svg.appendChild(mk('path', { d: polyPath(heartPts(32, 30, 20)), fill: '#ff7fa5', stroke: '#c83c6e', 'stroke-width': 1.6, 'stroke-linejoin': 'round' }));
    },
    'top-flower'(svg) {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        svg.appendChild(mk('circle', { cx: 32 + Math.cos(a) * 10, cy: 32 + Math.sin(a) * 10, r: 8, fill: '#c9a0ff' }));
      }
      svg.appendChild(mk('circle', { cx: 32, cy: 32, r: 6, fill: '#ffe066' }));
    },
    'top-eye'(svg) {
      [22, 42].forEach((ex) => {
        svg.appendChild(mk('circle', { cx: ex, cy: 32, r: 9, fill: '#fff', stroke: 'rgba(60,50,45,0.75)', 'stroke-width': 1.8 }));
        svg.appendChild(mk('circle', { cx: ex + 2, cy: 30, r: 4, fill: '#3a3230' }));
      });
    },
  };

  function make(kind, opts) {
    opts = opts || {};
    const svg = svgRoot();
    const fn = MATERIAL_DRAW[kind] || TOOL_DRAW[kind] || SUB_DRAW[kind];
    if (fn) {
      fn(svg, opts);
    } else {
      svg.appendChild(mk('circle', { cx: 32, cy: 32, r: 20, fill: opts.base || '#e0d0c0' }));
    }
    return svg;
  }

  YL.Icons = { make };
})();
