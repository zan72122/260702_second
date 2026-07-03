/* やわらかラボ — tools: cutter / heat / cold / color / topping / cream piping.
 * Tools drive the material via sim's public primitives; when a non-hand tool is
 * active the finger's physics mode is 'none' so the solver ignores it and the
 * tool acts instead. drawGhost paints cute previews on the fx canvas. */
(function () {
  'use strict';
  const U = YL.U;

  // ---- unit polygons (y-down, coords ~ -1..1, closed) --------------------
  function starPoly() {
    const pts = [];
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
      const r = (k & 1) ? 0.42 : 1;
      pts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    return pts;
  }
  function heartPoly() {
    const pts = [], N = 18;
    for (let k = 0; k < N; k++) {
      const t = (k / N) * Math.PI * 2;
      const x = 16 * Math.pow(Math.sin(t), 3);
      // canvas y-down: negate so the lobes sit at the top
      const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      pts.push([x / 17, y / 17]);
    }
    return pts;
  }
  function flowerPoly() {
    const pts = [], N = 20;
    for (let k = 0; k < N; k++) {
      const a = (k / N) * Math.PI * 2;
      const r = 0.58 + 0.42 * Math.abs(Math.cos(2.5 * a)); // 5 scalloped petals
      pts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    return pts;
  }
  function circlePoly() {
    const pts = [], N = 16;
    for (let k = 0; k < N; k++) {
      const a = (k / N) * Math.PI * 2;
      pts.push([Math.cos(a), Math.sin(a)]);
    }
    return pts;
  }

  const SHAPES = [starPoly(), heartPoly(), flowerPoly(), circlePoly()];

  // vivid-but-soft kid palette
  const COLORS = [
    [255, 150, 190],  // pink
    [255, 224, 110],  // yellow
    [125, 200, 255],  // sky blue
    [150, 232, 190],  // mint green
    [196, 160, 255],  // purple
    [255, 176, 110],  // orange
  ];

  const TOPPINGS = ['star', 'heart', 'flower', 'eye'];

  const list = [
    { id: 'hand' },
    { id: 'cutter', subs: 4 },
    { id: 'heat' },
    { id: 'cold' },
    { id: 'color', subs: 6 },
    { id: 'topping', subs: 4 },
  ];

  const state = { tool: 'hand', sub: 0 };

  function setTool(id, sub) {
    if (sub === undefined) {
      if (id !== state.tool) sub = 0; else sub = state.sub;
    }
    state.tool = id;
    state.sub = sub | 0;
  }

  // nearest particle to (x,y) within maxD, else null
  function nearestParticle(sim, x, y, maxD) {
    let best = null, bd = maxD * maxD;
    const P = sim.particles;
    for (let i = 0; i < P.length; i++) {
      const p = P[i];
      const dx = p.x - x, dy = p.y - y, d2 = dx * dx + dy * dy;
      if (d2 < bd) { bd = d2; best = p; }
    }
    return best;
  }

  function pushSticker(sim, st) {
    sim.stickers.push(st);
    if (sim.stickers.length > 40) sim.stickers.splice(0, sim.stickers.length - 40);
  }

  // ---- per-frame logic ---------------------------------------------------
  function update(sim, fingers, dt) {
    const tool = state.tool;
    const pipe = !!(sim.mat && sim.mat.special && sim.mat.special.pipe);

    for (const f of fingers) {
      // set physics mode: only 'hand' tool couples fingers to the solver
      f.mode = (tool === 'hand') ? 'hand' : 'none';

      switch (tool) {
        case 'hand':
          // piping (cream): a finger that lands on EMPTY table lays a rope of
          // fresh material along its path instead of dragging physics
          if (pipe && f.down) {
            if (f.justDown) {
              f._piping = !nearestParticle(sim, f.x, f.y, 55);
              if (f._piping) {
                f._pipeX = f.x; f._pipeY = f.y;
                if (sim.particles.length <= 560) sim.spawnLump(f.x, f.y, 15, null);
              }
            }
            if (f._piping) {
              f.mode = 'none'; // don't drag the rope we just laid
              if (U.dist(f.x, f.y, f._pipeX, f._pipeY) >= 14 && sim.particles.length <= 560) {
                sim.spawnLump(f.x, f.y, 15, null);
                f._pipeX = f.x; f._pipeY = f.y;
              }
            }
          }
          break;

        case 'heat':
          if (f.down) {
            sim.addHeat(f.x, f.y, 70, 0.9 * dt);
            if (YL.FX && Math.random() < 0.2) YL.FX.emit('heatGlow', { x: f.x, y: f.y });
          }
          break;

        case 'cold':
          if (f.down) {
            sim.addHeat(f.x, f.y, 70, -1.1 * dt);
            if (YL.FX && Math.random() < 0.2) YL.FX.emit('frost', { x: f.x, y: f.y });
          }
          break;

        case 'color':
          if (f.justDown) sim.injectColor(f.x, f.y, COLORS[state.sub] || COLORS[0]);
          break;

        case 'topping':
          if (f.justDown) placeTopping(sim, f.x, f.y);
          break;

        case 'cutter':
          if (f.justUp) sim.stampCut(SHAPES[state.sub] || SHAPES[0], f.x, f.y, 55);
          break;
      }
    }
  }

  function placeTopping(sim, x, y) {
    const type = TOPPINGS[state.sub] || TOPPINGS[0];
    const p = nearestParticle(sim, x, y, 70);
    if (!p) return;
    if (type === 'eye') {
      // googly eyes come as a pair
      pushSticker(sim, { type: 'eye', p, dx: -9, dy: -4, rot: 0, s: 7, seed: Math.random() * 10 });
      pushSticker(sim, { type: 'eye', p, dx: 9, dy: -4, rot: 0, s: 7, seed: Math.random() * 10 });
    } else {
      const dx = U.clamp(x - p.x, -12, 12), dy = U.clamp(y - p.y, -12, 12);
      pushSticker(sim, {
        type, p, dx, dy,
        rot: U.rand(-Math.PI, Math.PI),
        s: U.rand(8, 11),
        seed: Math.random() * 10,
      });
    }
    if (YL.FX) YL.FX.emit('sparkle', { x, y, n: 3 });
    sim.events.push({ t: 'sprinkle', x, y, v: 1 });
  }

  // ---- ghost preview -----------------------------------------------------
  function drawGhost(ctx, fingers, sim) {
    const tool = state.tool;
    if (tool === 'hand') return;
    const now = performance.now();

    for (const f of fingers) {
      if (!f.down) continue;
      const x = f.x, y = f.y;

      if (tool === 'cutter') {
        const shape = SHAPES[state.sub] || SHAPES[0];
        const sc = 55 * (1 + 0.05 * Math.sin(now / 150));
        ctx.save();
        ctx.beginPath();
        for (let i = 0; i < shape.length; i++) {
          const px = x + shape[i][0] * sc, py = y + shape[i][1] * sc;
          if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fill();
        ctx.setLineDash([7, 7]);
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(255,120,160,0.9)';
        ctx.stroke();
        ctx.restore();

      } else if (tool === 'heat' || tool === 'cold') {
        const hot = tool === 'heat';
        ctx.save();
        const g = ctx.createRadialGradient(x, y, 0, x, y, 70);
        if (hot) {
          g.addColorStop(0, 'rgba(255,170,70,0.18)');
          g.addColorStop(1, 'rgba(255,170,70,0)');
        } else {
          g.addColorStop(0, 'rgba(150,200,255,0.18)');
          g.addColorStop(1, 'rgba(150,200,255,0)');
        }
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, 70, 0, 7); ctx.fill();
        ctx.lineCap = 'round';
        ctx.lineWidth = 3;
        if (hot) {
          ctx.strokeStyle = 'rgba(255,160,60,0.5)';
          const wob = Math.sin(now / 220) * 0.2;
          for (let k = 0; k < 8; k++) {
            const a = (k / 8) * Math.PI * 2 + wob;
            const r0 = 30, r1 = 42;
            ctx.beginPath();
            ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0);
            ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
            ctx.stroke();
          }
        } else {
          ctx.strokeStyle = 'rgba(150,200,255,0.6)';
          for (let k = 0; k < 6; k++) {
            const a = (k / 6) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + Math.cos(a) * 20, y + Math.sin(a) * 20);
            ctx.stroke();
          }
        }
        ctx.restore();

      } else if (tool === 'color') {
        const c = COLORS[state.sub] || COLORS[0];
        ctx.save();
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = U.rgb(c);
        ctx.beginPath(); ctx.arc(x, y, 12, 0, 7); ctx.fill();
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath(); ctx.arc(x - 3.5, y - 4, 3, 0, 7); ctx.fill();
        ctx.restore();

      } else if (tool === 'topping') {
        drawToppingPreview(ctx, x, y, TOPPINGS[state.sub] || TOPPINGS[0], now);
      }
    }
  }

  function drawToppingPreview(ctx, x, y, type, now) {
    const s = 9;
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.translate(x, y);
    if (type === 'eye') {
      for (const ex of [-9, 9]) {
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = 'rgba(60,50,45,0.75)';
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(ex, -4, 7, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#3a3230';
        ctx.beginPath(); ctx.arc(ex, -4, 3, 0, 7); ctx.fill();
      }
    } else if (type === 'star') {
      ctx.fillStyle = '#ffd34d'; ctx.strokeStyle = 'rgba(200,140,0,0.6)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
        const r = (k & 1) ? s * 0.45 : s;
        ctx[k ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (type === 'heart') {
      ctx.fillStyle = '#ff7fa5'; ctx.strokeStyle = 'rgba(200,60,110,0.6)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(0, s * 0.75);
      ctx.bezierCurveTo(-s * 1.35, -s * 0.15, -s * 0.55, -s * 1.05, 0, -s * 0.35);
      ctx.bezierCurveTo(s * 0.55, -s * 1.05, s * 1.35, -s * 0.15, 0, s * 0.75);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    } else { // flower
      ctx.fillStyle = '#c9a0ff';
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        ctx.beginPath(); ctx.arc(Math.cos(a) * s * 0.55, Math.sin(a) * s * 0.55, s * 0.42, 0, 7); ctx.fill();
      }
      ctx.fillStyle = '#ffe066';
      ctx.beginPath(); ctx.arc(0, 0, s * 0.34, 0, 7); ctx.fill();
    }
    ctx.restore();
  }

  YL.Tools = {
    SHAPES, COLORS, TOPPINGS, list, state,
    setTool, update, drawGhost,
  };
})();
