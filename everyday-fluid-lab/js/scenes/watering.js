// シーン: じょうろで おはなに水やり
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad, sun, cloud, softShadow } from '../engine/art.js';
import { Pourer } from './common.js';

const FLOWER_COLORS = ['#ff6b8a', '#ffb43a', '#8a6bff'];

export default {
  id: 'watering',
  name: 'おはなに水やり',
  emoji: '🌻',
  desc: 'じょうろの水で ぐんぐん育つ',
  goal: '🎯 3つの おはなを さかせよう!',
  clearMsg: 'おはな が まんかい!',
  maxParticles: 2200,
  view: { shine: 1.3, refract: 1.0, thresh: 0.36 },
  tilt: false,

  init(ctx) {
    const d = ctx.data;
    d.pourer = new Pourer(65, 30);
    d.pots = [];
    d.butterflies = [];
    d.bloomToast = new Set();
    ctx.sim.definePhase(0, {
      sigma: 2.5, beta: 1.4, grav: 1, mix: 0,
      color: [0.55, 0.75, 0.9], alpha: 0.45,
    });
    ctx.setHint('タッチした場所から じょうろで 水やり!');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data, s = ctx.sim;
    d.groundY = H - 14;
    const n = 3;
    const spacing = Math.min(W / (n + 0.4), 64);
    const x0 = W / 2 - spacing * (n - 1) / 2;
    const old = d.pots;
    d.pots = [];
    for (let i = 0; i < n; i++) {
      const x = x0 + i * spacing;
      const pw = Math.min(spacing * 0.62, 30);
      const pot = {
        x, w: pw, top: d.groundY - 18, bottom: d.groundY,
        water: old[i]?.water || 0, stage: old[i]?.stage || 0, sway: rand(TAU),
        color: FLOWER_COLORS[i],
      };
      d.pots.push(pot);
      // 鉢のコライダー (内側に土)
      s.colliders.push(
        { kind: 'capsule', ax: x - pw / 2 - 2, ay: pot.top - 2, bx: x - pw / 2 + 1, by: pot.bottom, r: 1.6 },
        { kind: 'capsule', ax: x + pw / 2 + 2, ay: pot.top - 2, bx: x + pw / 2 - 1, by: pot.bottom, r: 1.6 },
      );
    }
  },

  update(ctx, dt) {
    const d = ctx.data, s = ctx.sim, p = ctx.primary;
    const pouring = !!p;
    d.pourer.phase = 0;
    // じょうろの口はタッチ位置の少し左下、シャワー状に
    if (pouring) {
      d.pourer.rate = 70;
      const sx = p.x - 9, sy = p.y + 2;
      d.pourer.update(ctx, dt, true, sx, sy, -0.15, 1, 5);
    } else d.pourer.update(ctx, dt, false, 0, 0);

    // 土が水を吸う
    for (const pot of d.pots) {
      const soilY = pot.top + 6;
      for (let i = s.n - 1; i >= 0; i--) {
        if (Math.abs(s.x[i] - pot.x) < pot.w / 2 && s.y[i] > soilY - 2 && s.y[i] < pot.bottom + 2) {
          if (Math.random() < dt * 3.2) {
            pot.water = Math.min(1.6, pot.water + 0.01);
            s.kill(i);
          }
        }
      }
      // 成長
      const st = pot.water > 1.0 ? 3 : pot.water > 0.55 ? 2 : pot.water > 0.18 ? 1 : 0;
      if (st > pot.stage) {
        pot.stage = st;
        ctx.backDirty();
        ctx.sfx.pop(1.6);
        for (let k = 0; k < 6; k++) ctx.fx.addSpark(pot.x + rand(-6, 6), pot.top - 14 - rand(0, 12), '#c8ffa0');
        if (st === 3 && !d.bloomToast.has(pot.x)) {
          d.bloomToast.add(pot.x);
          ctx.toast('🌸 さいた!');
          ctx.sfx.chime();
        }
      }
    }
    const bloomed = d.pots.filter((q) => q.stage >= 3).length;
    const partial = d.pots.reduce((a, q) => a + Math.min(1, q.water), 0);
    ctx.progress(clamp((bloomed >= 3 ? 1 : partial / 3 * 0.9), 0, 1));

    // ちょうちょ
    if (bloomed >= 3 && d.butterflies.length < 3 && Math.random() < dt) {
      d.butterflies.push({ x: -10, y: rand(10, ctx.H * 0.4), t: rand(TAU), hue: rand(0, 60) });
    }
    for (const b of d.butterflies) {
      b.t += dt * 3;
      b.x += (22 + Math.sin(b.t * 0.7) * 12) * dt;
      b.y += Math.sin(b.t) * 14 * dt;
      if (b.x > ctx.W + 12) { b.x = -10; b.y = rand(10, ctx.H * 0.4); }
    }
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    g.fillStyle = vgrad(g, 0, H, [[0, '#8ecdf5'], [0.7, '#c8e8fa'], [1, '#e0f4ff']]);
    g.fillRect(0, 0, W, H);
    sun(g, W * 0.15, 14, 6);
    cloud(g, W * 0.6, 16, 1, 0.9);
    cloud(g, W * 0.88, 28, 0.7, 0.75);
    // フェンス
    g.fillStyle = '#e8dcc8';
    const fenceTop = d.groundY - 46;
    for (let x = 4; x < W; x += 12) {
      rr(g, x, fenceTop, 6, 46, 3);
      g.fill();
    }
    g.fillStyle = '#ddcfb8';
    g.fillRect(0, fenceTop + 10, W, 4);
    g.fillRect(0, fenceTop + 30, W, 4);
    // 地面
    g.fillStyle = vgrad(g, d.groundY, H, [[0, '#9ac96a'], [1, '#7cab4e']]);
    g.fillRect(0, d.groundY, W, H - d.groundY);
    // 鉢と植物
    for (const pot of d.pots) {
      softShadow(g, pot.x, pot.bottom + 1, pot.w * 0.8, 2, 0.14);
      // 植物 (成長段階)
      const baseY = pot.top + 5;
      g.strokeStyle = '#4a8a3a';
      g.lineWidth = 1.6;
      if (pot.stage >= 1) {
        // 芽
        const hgt = pot.stage === 1 ? 8 : pot.stage === 2 ? 22 : 34;
        g.beginPath();
        g.moveTo(pot.x, baseY);
        g.quadraticCurveTo(pot.x + 2, baseY - hgt / 2, pot.x, baseY - hgt);
        g.stroke();
        // 葉
        g.fillStyle = '#5aa04a';
        g.beginPath();
        g.ellipse(pot.x - 3.4, baseY - hgt * 0.45, 3.6, 1.7, -0.5, 0, TAU);
        g.fill();
        if (pot.stage >= 2) {
          g.beginPath();
          g.ellipse(pot.x + 3.4, baseY - hgt * 0.65, 3.6, 1.7, 0.5, 0, TAU);
          g.fill();
        }
        if (pot.stage === 2) {
          // つぼみ
          g.fillStyle = '#7ab860';
          g.beginPath();
          g.ellipse(pot.x, baseY - hgt - 2.5, 2.6, 3.4, 0, 0, TAU);
          g.fill();
        }
        if (pot.stage >= 3) {
          // 花
          const fy = baseY - hgt - 3;
          g.fillStyle = pot.color;
          for (let i = 0; i < 6; i++) {
            const a = i / 6 * TAU + 0.3;
            g.beginPath();
            g.ellipse(pot.x + Math.cos(a) * 4.4, fy + Math.sin(a) * 4.4, 3.2, 2.2, a, 0, TAU);
            g.fill();
          }
          g.fillStyle = '#ffe27a';
          g.beginPath(); g.arc(pot.x, fy, 3, 0, TAU); g.fill();
          g.fillStyle = 'rgba(200,120,30,0.8)';
          g.beginPath(); g.arc(pot.x - 0.8, fy - 0.5, 0.5, 0, TAU); g.fill();
          g.beginPath(); g.arc(pot.x + 1, fy + 0.6, 0.5, 0, TAU); g.fill();
        }
      }
      // 土
      const wet = clamp(pot.water, 0, 1);
      g.fillStyle = `rgb(${140 - wet * 60},${95 - wet * 40},${60 - wet * 22})`;
      rr(g, pot.x - pot.w / 2, pot.top + 3, pot.w, 5, 2);
      g.fill();
      // 鉢
      g.fillStyle = '#d0743a';
      g.beginPath();
      g.moveTo(pot.x - pot.w / 2 - 3, pot.top);
      g.lineTo(pot.x + pot.w / 2 + 3, pot.top);
      g.lineTo(pot.x + pot.w / 2 - 1, pot.bottom);
      g.lineTo(pot.x - pot.w / 2 + 1, pot.bottom);
      g.closePath();
      g.fill();
      g.fillStyle = '#b95f2e';
      rr(g, pot.x - pot.w / 2 - 4, pot.top - 1, pot.w + 8, 5, 2);
      g.fill();
      // 水分メーター
      g.fillStyle = 'rgba(255,255,255,0.7)';
      rr(g, pot.x - 8, pot.bottom + 3, 16, 3, 1.5);
      g.fill();
      g.fillStyle = '#3a9ae8';
      rr(g, pot.x - 7.4, pot.bottom + 3.6, Math.max(0.01, 14.8 * wet), 1.8, 0.9);
      g.fill();
    }
  },

  drawFront(ctx, g) {
    const d = ctx.data, p = ctx.primary;
    // ちょうちょ
    for (const b of d.butterflies) {
      const flap = Math.sin(b.t * 6);
      g.save();
      g.translate(b.x, b.y);
      g.fillStyle = `hsl(${b.hue + 300}, 80%, 70%)`;
      g.beginPath();
      g.ellipse(-1.6, 0, 2.2 * Math.abs(flap) + 0.4, 2.6, -0.3, 0, TAU);
      g.fill();
      g.beginPath();
      g.ellipse(1.6, 0, 2.2 * Math.abs(flap) + 0.4, 2.6, 0.3, 0, TAU);
      g.fill();
      g.fillStyle = '#5a4a3a';
      rr(g, -0.5, -2.2, 1, 4.4, 0.5);
      g.fill();
      g.restore();
    }
    // じょうろ
    if (p) {
      g.save();
      g.translate(p.x + 6, p.y - 4);
      g.rotate(-0.35 + Math.sin(ctx.t * 4) * 0.03);
      g.fillStyle = '#4aa8d8';
      rr(g, -8, -8, 17, 14, 3);
      g.fill();
      // 注ぎ口
      g.beginPath();
      g.moveTo(-7, -4);
      g.lineTo(-16, 2);
      g.lineTo(-14.5, 5);
      g.lineTo(-6, 0);
      g.closePath();
      g.fill();
      // シャワーヘッド
      g.fillStyle = '#3a90c0';
      g.beginPath();
      g.arc(-15.2, 3.5, 2.6, 0, TAU);
      g.fill();
      // 取っ手
      g.strokeStyle = '#3a90c0';
      g.lineWidth = 1.8;
      g.beginPath();
      g.arc(1, -9, 5.5, Math.PI, TAU);
      g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.3)';
      rr(g, -6, -6.5, 3, 10, 1.5);
      g.fill();
      g.restore();
    }
  },
};
