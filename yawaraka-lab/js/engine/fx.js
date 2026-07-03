/* やわらかラボ — decorative FX particles.
 * Pooled 2D particle system: sparkle/steam/frost/flour/crumb/pop/cutflash/
 * heart/ring/drop/heatGlow. Fixed-size pool (no per-frame allocation),
 * cheap shapes only. Soft pastel kawaii style. */
(function () {
  'use strict';
  const U = YL.U;
  const TAU = Math.PI * 2;
  const POOL_SIZE = 300;

  // ---- default palettes -----------------------------------------------
  const SPARK_COLS = [[255, 244, 168], [255, 196, 224], [255, 255, 255], [255, 220, 150]];
  const FROST_COL = [205, 232, 255];
  const STEAM_COL = [255, 255, 255];
  const FLOUR_COL = [255, 252, 245];
  const CRUMB_COLS = [[150, 102, 63], [168, 118, 75], [130, 88, 54]];
  const HEART_COL = [255, 140, 183];
  const RING_COL = [255, 248, 232];
  const GLOW_COL = [255, 168, 90];
  const POP_RING_COL = [255, 255, 255];
  const POP_DROP_COL = [214, 238, 255];
  const CUT_RING_COL = [255, 250, 240];
  const DROP_DEFAULT_COL = [140, 190, 255];

  // ---- pool -------------------------------------------------------------
  function makeParticle() {
    return {
      alive: false, kind: '',
      x: 0, y: 0, vx: 0, vy: 0, ax: 0, ay: 0, drag: 0,
      age: 0, maxLife: 0.6,
      size0: 4, size1: 4, size: 4,
      rot: 0, vrot: 0,
      r: 255, g: 255, b: 255, alphaMax: 0.7, alpha: 0,
      fadeIn: 0.15, fadeOut: 0.4,
      swayAmp: 0, swayFreq: 0, seed: 0,
      twinkleAmt: 0, twinkleFreq: 6,
      aspect: 1,
    };
  }

  const pool = [];
  const freeStack = [];
  for (let i = 0; i < POOL_SIZE; i++) { pool.push(makeParticle()); freeStack.push(i); }
  let freeTop = POOL_SIZE;

  function alloc() {
    if (freeTop <= 0) return null;
    return pool[freeStack[--freeTop]];
  }

  function reset(p, kind, x, y) {
    p.alive = true; p.kind = kind; p.x = x; p.y = y;
    p.vx = 0; p.vy = 0; p.ax = 0; p.ay = 0; p.drag = 0;
    p.age = 0; p.maxLife = 0.6;
    p.size0 = 4; p.size1 = 4; p.size = 4;
    p.rot = 0; p.vrot = 0;
    p.r = 255; p.g = 255; p.b = 255; p.alphaMax = 0.7; p.alpha = 0;
    p.fadeIn = 0.15; p.fadeOut = 0.4;
    p.swayAmp = 0; p.swayFreq = 0; p.seed = Math.random() * TAU;
    p.twinkleAmt = 0; p.twinkleFreq = 6;
    p.aspect = 1;
    return p;
  }

  function setCol(p, c) { p.r = c[0]; p.g = c[1]; p.b = c[2]; }

  // ---- color parsing (hex / rgb() / [r,g,b]) -----------------------------
  function parseCol(col) {
    if (!col) return null;
    if (Array.isArray(col)) return col;
    if (typeof col === 'string') {
      const s = col.trim();
      if (s[0] === '#') {
        let h = s.slice(1);
        if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        const n = parseInt(h, 16);
        if (!isNaN(n)) return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
      }
      const m = s.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
      if (m) return [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])];
    }
    return null;
  }

  function cnt(min, max, n) { return Math.max(1, Math.round(U.randInt(min, max) * (n || 1))); }

  function envelope(t, fadeIn, fadeOut) {
    if (fadeIn > 0 && t < fadeIn) return t / fadeIn;
    if (fadeOut > 0 && t > 1 - fadeOut) return Math.max(0, (1 - t) / fadeOut);
    return 1;
  }

  // ---- emitters -----------------------------------------------------------
  function emitSparkle(x, y, n, col) {
    const count = cnt(2, 6, n);
    const base = parseCol(col);
    for (let i = 0; i < count; i++) {
      const p = alloc(); if (!p) break;
      reset(p, 'star', x, y);
      const ang = U.rand(0, TAU), spd = U.rand(30, 90);
      p.vx = Math.cos(ang) * spd; p.vy = Math.sin(ang) * spd - U.rand(10, 40);
      p.ay = 60; p.drag = 3.5;
      p.maxLife = U.rand(0.45, 0.65);
      p.size0 = U.rand(3, 5); p.size1 = 0.5;
      p.rot = U.rand(0, TAU); p.vrot = U.rand(-6, 6);
      setCol(p, base ? U.shade(base, U.rand(-0.06, 0.06)) : U.pick(SPARK_COLS));
      p.alphaMax = U.rand(0.6, 0.85);
      p.fadeIn = 0.1; p.fadeOut = 0.55;
      p.twinkleAmt = 0.35; p.twinkleFreq = U.rand(5, 9);
    }
  }

  function emitSteam(x, y, n, col) {
    const count = cnt(1, 1, n);
    const base = parseCol(col) || STEAM_COL;
    for (let i = 0; i < count; i++) {
      const p = alloc(); if (!p) break;
      reset(p, 'circ', x + U.rand(-3, 3), y);
      p.vx = U.rand(-4, 4); p.vy = -U.rand(14, 26);
      p.ay = -6; p.drag = 0.4;
      p.maxLife = U.rand(1.0, 1.4);
      p.size0 = U.rand(3, 5); p.size1 = U.rand(13, 19);
      setCol(p, base); p.alphaMax = U.rand(0.22, 0.32);
      p.fadeIn = 0.08; p.fadeOut = 0.65;
      p.swayAmp = U.rand(6, 12); p.swayFreq = U.rand(1.6, 2.6);
    }
  }

  function emitFrost(x, y, n, col) {
    const count = cnt(2, 3, n);
    const base = parseCol(col) || FROST_COL;
    for (let i = 0; i < count; i++) {
      const p = alloc(); if (!p) break;
      reset(p, 'flake', x + U.rand(-6, 6), y + U.rand(-6, 6));
      p.vx = U.rand(-8, 8); p.vy = U.rand(8, 20);
      p.ay = 4; p.drag = 0.3;
      p.maxLife = U.rand(0.85, 1.15);
      p.size0 = U.rand(3, 5); p.size1 = p.size0 * U.rand(0.85, 1.05);
      setCol(p, base); p.alphaMax = U.rand(0.5, 0.75);
      p.fadeIn = 0.15; p.fadeOut = 0.45;
      p.vrot = U.rand(-1, 1);
      p.twinkleAmt = 0.5; p.twinkleFreq = U.rand(4, 7);
    }
  }

  function emitFlour(x, y, n, col) {
    const count = cnt(4, 6, n);
    const base = parseCol(col) || FLOUR_COL;
    for (let i = 0; i < count; i++) {
      const p = alloc(); if (!p) break;
      reset(p, 'circ', x, y);
      const ang = U.rand(0, TAU), spd = U.rand(20, 55);
      p.vx = Math.cos(ang) * spd; p.vy = Math.sin(ang) * spd - U.rand(15, 35);
      p.ay = 30; p.drag = 2.5;
      p.maxLife = U.rand(0.6, 0.9);
      p.size0 = U.rand(1.5, 3); p.size1 = U.rand(7, 12);
      setCol(p, U.shade(base, U.rand(-0.03, 0.03))); p.alphaMax = U.rand(0.5, 0.7);
      p.fadeIn = 0.06; p.fadeOut = 0.55;
    }
  }

  function emitCrumb(x, y, n, col) {
    const count = cnt(3, 5, n);
    const forceCol = parseCol(col);
    for (let i = 0; i < count; i++) {
      const p = alloc(); if (!p) break;
      reset(p, 'sq', x, y);
      const ang = U.rand(0, TAU), spd = U.rand(25, 70);
      p.vx = Math.cos(ang) * spd; p.vy = Math.sin(ang) * spd - U.rand(30, 60);
      p.ay = 140; p.drag = 0.8;
      p.maxLife = U.rand(0.7, 0.95);
      p.size0 = U.rand(2.5, 4.5); p.size1 = p.size0 * 0.7;
      p.aspect = U.rand(0.7, 1.3);
      p.vrot = U.rand(-8, 8);
      setCol(p, forceCol || U.pick(CRUMB_COLS)); p.alphaMax = U.rand(0.7, 0.85);
      p.fadeIn = 0.04; p.fadeOut = 0.4;
    }
  }

  function emitPop(x, y, n, col) {
    let p = alloc();
    if (p) {
      reset(p, 'ring', x, y);
      setCol(p, parseCol(col) || POP_RING_COL);
      p.maxLife = U.rand(0.42, 0.52);
      p.size0 = U.rand(3, 5); p.size1 = U.rand(16, 20);
      p.alphaMax = 0.5; p.fadeIn = 0.05; p.fadeOut = 0.75;
    }
    const count = cnt(4, 6, n);
    const dcol = parseCol(col) || POP_DROP_COL;
    for (let i = 0; i < count; i++) {
      p = alloc(); if (!p) break;
      reset(p, 'circ', x, y);
      const ang = U.rand(0, TAU), spd = U.rand(40, 110);
      p.vx = Math.cos(ang) * spd; p.vy = Math.sin(ang) * spd - U.rand(10, 30);
      p.ay = 200; p.drag = 1.2;
      p.maxLife = U.rand(0.32, 0.48);
      p.size0 = U.rand(1.5, 3); p.size1 = p.size0 * 0.6;
      setCol(p, dcol); p.alphaMax = U.rand(0.55, 0.8);
      p.fadeIn = 0.05; p.fadeOut = 0.5;
    }
  }

  function emitCutflash(x, y, n, col) {
    let p = alloc();
    if (p) {
      reset(p, 'ring', x, y);
      setCol(p, parseCol(col) || CUT_RING_COL);
      p.maxLife = 0.7; p.size0 = 4; p.size1 = U.rand(22, 28);
      p.alphaMax = 0.42; p.fadeIn = 0.04; p.fadeOut = 0.8;
    }
    const base = parseCol(col);
    const count = Math.max(1, Math.round(6 * (n || 1)));
    for (let i = 0; i < count; i++) {
      p = alloc(); if (!p) break;
      reset(p, 'star', x, y);
      const ang = U.rand(0, TAU), spd = U.rand(50, 120);
      p.vx = Math.cos(ang) * spd; p.vy = Math.sin(ang) * spd - U.rand(10, 30);
      p.ay = 50; p.drag = 3;
      p.maxLife = U.rand(0.4, 0.6);
      p.size0 = U.rand(3, 5); p.size1 = 0.5;
      setCol(p, base ? U.shade(base, U.rand(-0.05, 0.15)) : U.pick(SPARK_COLS));
      p.alphaMax = U.rand(0.6, 0.8);
      p.rot = U.rand(0, TAU); p.vrot = U.rand(-5, 5);
      p.fadeIn = 0.08; p.fadeOut = 0.55;
    }
  }

  function emitHeart(x, y, n, col) {
    const count = cnt(1, 3, n);
    const base = parseCol(col) || HEART_COL;
    for (let i = 0; i < count; i++) {
      const p = alloc(); if (!p) break;
      reset(p, 'heart', x + U.rand(-6, 6), y);
      p.vx = U.rand(-4, 4); p.vy = -U.rand(18, 32);
      p.ay = -4; p.drag = 0.6;
      p.maxLife = U.rand(0.85, 1.15);
      p.size0 = U.rand(5, 7); p.size1 = U.rand(7, 10);
      setCol(p, U.shade(base, U.rand(-0.05, 0.08))); p.alphaMax = U.rand(0.65, 0.85);
      p.fadeIn = 0.12; p.fadeOut = 0.45;
      p.swayAmp = U.rand(8, 16); p.swayFreq = U.rand(2.5, 4);
    }
  }

  function emitRing(x, y, n, col) {
    const count = cnt(1, 1, n);
    const base = parseCol(col) || RING_COL;
    for (let i = 0; i < count; i++) {
      const p = alloc(); if (!p) break;
      reset(p, 'ring', x, y);
      p.maxLife = U.rand(0.7, 0.9);
      p.size0 = U.rand(4, 7); p.size1 = U.rand(26, 34);
      setCol(p, base); p.alphaMax = 0.5;
      p.fadeIn = 0.04; p.fadeOut = 0.75;
    }
  }

  function emitDrop(x, y, n, col) {
    const base = parseCol(col) || DROP_DEFAULT_COL;
    let p = alloc();
    if (p) {
      reset(p, 'ring', x, y);
      p.maxLife = U.rand(0.45, 0.55); p.size0 = 3; p.size1 = U.rand(10, 14);
      setCol(p, base); p.alphaMax = 0.4; p.fadeIn = 0.05; p.fadeOut = 0.7;
    }
    const count = cnt(5, 5, n);
    for (let i = 0; i < count; i++) {
      p = alloc(); if (!p) break;
      reset(p, 'circ', x, y);
      const ang = U.rand(0, TAU), spd = U.rand(35, 90);
      p.vx = Math.cos(ang) * spd; p.vy = Math.sin(ang) * spd - U.rand(15, 35);
      p.ay = 180; p.drag = 1;
      p.maxLife = U.rand(0.35, 0.55);
      p.size0 = U.rand(2, 3.5); p.size1 = p.size0 * 0.6;
      setCol(p, U.shade(base, U.rand(-0.06, 0.06))); p.alphaMax = U.rand(0.6, 0.85);
      p.fadeIn = 0.05; p.fadeOut = 0.5;
    }
  }

  function emitHeatGlow(x, y, n, col) {
    const count = cnt(1, 2, n);
    const base = parseCol(col) || GLOW_COL;
    for (let i = 0; i < count; i++) {
      const p = alloc(); if (!p) break;
      reset(p, 'glow', x + U.rand(-5, 5), y);
      p.vx = U.rand(-3, 3); p.vy = -U.rand(8, 16);
      p.ay = -3; p.drag = 0.4;
      p.maxLife = 0.7;
      p.size0 = U.rand(5, 7); p.size1 = U.rand(11, 15);
      setCol(p, base); p.alphaMax = U.rand(0.16, 0.26);
      p.fadeIn = 0.2; p.fadeOut = 0.55;
    }
  }

  const EMITTERS = {
    sparkle: emitSparkle, steam: emitSteam, frost: emitFrost, flour: emitFlour,
    crumb: emitCrumb, pop: emitPop, cutflash: emitCutflash, heart: emitHeart,
    ring: emitRing, drop: emitDrop, heatGlow: emitHeatGlow,
  };

  // ---- shape drawing --------------------------------------------------
  function rgbStr(p) { return `rgb(${p.r | 0},${p.g | 0},${p.b | 0})`; }

  function drawStar(ctx, p) {
    const s = p.size;
    ctx.fillStyle = rgbStr(p);
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.28, -s * 0.28);
    ctx.lineTo(s, 0);
    ctx.lineTo(s * 0.28, s * 0.28);
    ctx.lineTo(0, s);
    ctx.lineTo(-s * 0.28, s * 0.28);
    ctx.lineTo(-s, 0);
    ctx.lineTo(-s * 0.28, -s * 0.28);
    ctx.closePath();
    ctx.fill();
  }

  function drawCirc(ctx, p) {
    ctx.fillStyle = rgbStr(p);
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(0.3, p.size), 0, TAU);
    ctx.fill();
  }

  function drawFlake(ctx, p) {
    const s = Math.max(0.5, p.size);
    ctx.strokeStyle = rgbStr(p);
    ctx.lineWidth = Math.max(0.6, s * 0.18);
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = i * Math.PI / 3;
      const dx = Math.cos(a) * s, dy = Math.sin(a) * s;
      ctx.moveTo(-dx, -dy); ctx.lineTo(dx, dy);
    }
    ctx.stroke();
  }

  function drawSq(ctx, p) {
    const s = p.size;
    ctx.fillStyle = rgbStr(p);
    ctx.fillRect(-s / 2, -(s * p.aspect) / 2, s, s * p.aspect);
  }

  function drawRing(ctx, p) {
    const s = Math.max(0.5, p.size);
    ctx.strokeStyle = rgbStr(p);
    ctx.lineWidth = Math.max(1, s * 0.14);
    ctx.beginPath();
    ctx.arc(0, 0, s, 0, TAU);
    ctx.stroke();
  }

  function drawHeart(ctx, p) {
    const s = p.size * 0.5;
    ctx.fillStyle = rgbStr(p);
    ctx.beginPath();
    ctx.moveTo(0, s * 0.35);
    ctx.bezierCurveTo(-s, -s * 0.6, -s * 1.3, s * 0.55, 0, s * 1.25);
    ctx.bezierCurveTo(s * 1.3, s * 0.55, s, -s * 0.6, 0, s * 0.35);
    ctx.closePath();
    ctx.fill();
  }

  function drawGlow(ctx, p) {
    const s = Math.max(1, p.size);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s);
    g.addColorStop(0, `rgba(${p.r | 0},${p.g | 0},${p.b | 0},1)`);
    g.addColorStop(1, `rgba(${p.r | 0},${p.g | 0},${p.b | 0},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, s, 0, TAU);
    ctx.fill();
  }

  const SHAPE_DRAW = { star: drawStar, circ: drawCirc, flake: drawFlake, sq: drawSq, ring: drawRing, heart: drawHeart, glow: drawGlow };
  const ADDITIVE = { star: true, ring: true, glow: true };

  // ---- public API -------------------------------------------------------
  const FX = {
    emit(name, opts) {
      opts = opts || {};
      const fn = EMITTERS[name];
      if (!fn) return;
      fn(opts.x || 0, opts.y || 0, opts.n || 1, opts.col);
    },

    update(dt) {
      for (let i = 0; i < POOL_SIZE; i++) {
        const p = pool[i];
        if (!p.alive) continue;
        p.age += dt;
        if (p.age >= p.maxLife) { p.alive = false; freeStack[freeTop++] = i; continue; }
        p.vx += p.ax * dt; p.vy += p.ay * dt;
        if (p.drag) { const k = Math.max(0, 1 - p.drag * dt); p.vx *= k; p.vy *= k; }
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.swayAmp) p.x += Math.sin(p.age * p.swayFreq + p.seed) * p.swayAmp * dt;
        p.rot += p.vrot * dt;
        const t = p.age / p.maxLife;
        p.size = p.size0 + (p.size1 - p.size0) * t;
        let a = envelope(t, p.fadeIn, p.fadeOut) * p.alphaMax;
        if (p.twinkleAmt) a *= (1 - p.twinkleAmt * 0.5 + p.twinkleAmt * 0.5 * Math.sin(p.age * p.twinkleFreq + p.seed));
        p.alpha = a < 0 ? 0 : a > 0.85 ? 0.85 : a;
      }
    },

    draw(ctx) {
      for (let i = 0; i < POOL_SIZE; i++) {
        const p = pool[i];
        if (!p.alive || p.alpha <= 0.003) continue;
        const drawShape = SHAPE_DRAW[p.kind];
        if (!drawShape) continue;
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        if (p.rot) ctx.rotate(p.rot);
        if (ADDITIVE[p.kind]) ctx.globalCompositeOperation = 'lighter';
        drawShape(ctx, p);
        ctx.restore();
      }
    },
  };

  YL.FX = FX;
})();
