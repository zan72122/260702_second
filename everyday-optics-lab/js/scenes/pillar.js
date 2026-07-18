// シーン: 太陽柱 (板状氷晶の鏡面反射 — 柱の長さは氷晶のゆれ角で決まる)
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad } from '../engine/art.js';

export default {
  id: 'pillar',
  name: '太陽柱',
  emoji: '🧊',
  desc: '冬の朝 光の柱が立つ',
  goal: '🎯 風をしずめ 氷晶をふやし 太陽を低く…高い光の柱を立てよう!',
  clearMsg: '空気中の小さな鏡 (氷晶) が 太陽をうつしてた!',
  spectrumN: 8,

  init(ctx) {
    const d = ctx.data;
    d.crystals = 0.15;   // 氷晶の量 0..1
    d.wind = 0.75;       // 風 (ゆれ角 σ を増やす)
    d.sunEl = 12;        // 太陽高度
    d.okT = 0;
    d.flakes = [];
    ctx.setTools([
      { id: 'ice', icon: '❄️', label: '氷晶をふやす' },
      { id: 'wind', icon: '🌬️', label: '風をふかす/しずめる' },
    ]);
    ctx.setHint('板の氷晶は 水平にふわふわ落ちる=空にうかぶ小さな鏡');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.ground = Math.min(H - 26, H * 0.84);
    d.sunX = W * 0.5;
  },

  update(ctx, dt) {
    const d = ctx.data, p = ctx.primary;
    if (p && p.y < d.ground) {
      d.sunEl = clamp((1 - p.y / d.ground) * 55, 2, 50);
      d.sunX = clamp(p.x, ctx.W * 0.2, ctx.W * 0.8);
    }
    // 物理: 柱の長さ ∝ 氷晶のゆれ角 2σ (揺れが大きいほど長いが薄い)
    //        見え = 氷晶量 × 太陽の低さ (低いほど反射条件の氷晶が多い)
    d.sigma = 1.5 + d.wind * 14;                     // ゆれ角 [deg]
    d.pillarLen = d.sigma * 2 * 2.2;                 // 表示長 (角度→長さ)
    const lowSun = clamp(1 - d.sunEl / 30, 0, 1);
    d.pillarVis = clamp(d.crystals * 1.4, 0, 1) * (0.35 + lowSun * 0.65) / (1 + d.wind * 1.1);
    const good = d.pillarVis > 0.5 && d.sunEl < 18 && d.crystals > 0.5 && d.wind < 0.3;
    if (good) {
      d.okT += dt;
      ctx.progress(Math.min(1, d.okT / 2));
      if (!d.saidOk) { d.saidOk = true; ctx.toast('🕯️ りっぱな太陽柱!無数の氷晶ミラーのしわざ'); }
    } else {
      d.okT = Math.max(0, d.okT - dt * 0.5);
      d.saidOk = false;
      if (!ctx._cleared) {
        ctx.progress(clamp(d.pillarVis * 0.8 + (d.sunEl < 18 ? 0.15 : 0), 0, 0.95));
      }
    }
    // 氷晶キラキラ
    const want = d.crystals * 46;
    while (d.flakes.length < want) {
      d.flakes.push({ x: rand(0, ctx.W), y: rand(14, d.ground), ph: rand(0, 6), vy: rand(1.5, 3.5) });
    }
    while (d.flakes.length > want + 4) d.flakes.pop();
    for (const f of d.flakes) {
      f.y += f.vy * dt * 2;
      f.x += Math.sin(ctx.t * (1 + d.wind * 3) + f.ph) * d.wind * dt * 14;
      if (f.y > d.ground) { f.y = 14; f.x = rand(0, ctx.W); }
    }
  },

  onTool(ctx, id) {
    const d = ctx.data;
    if (id === 'ice') {
      d.crystals = d.crystals >= 0.95 ? 0.15 : clamp(d.crystals + 0.28, 0, 1);
      ctx.toast(`❄️ 氷晶 ${(d.crystals * 100) | 0}% (ダイヤモンドダスト!)`);
    }
    if (id === 'wind') {
      d.wind = d.wind > 0.35 ? 0.08 : 0.75;
      ctx.toast(d.wind < 0.35 ? '🌬️→😌 風がやんだ…氷晶が水平にそろう' : '🌬️ ビュー!氷晶がバラバラにゆれる');
    }
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    // 冬の夜明けの空
    g.fillStyle = vgrad(g, 0, H, [[0, '#2a3050'], [0.5, '#6a5a70'], [0.85, '#e8a878'], [1, '#f8d0a0']]);
    g.fillRect(0, 0, W, d.ground);
    // 雪の街
    g.fillStyle = vgrad(g, d.ground - 4, H, [[0, '#e8ecf4'], [1, '#c8d2e2']]);
    g.fillRect(0, d.ground - 2, W, H - d.ground + 2);
    for (let k = 0; k < 5; k++) {
      const hx = W * (0.08 + k * 0.2);
      g.fillStyle = '#3a4058';
      rr(g, hx - 6, d.ground - 14, 12, 13, 1);
      g.fill();
      g.fillStyle = '#e8ecf4';
      g.beginPath();
      g.moveTo(hx - 7.5, d.ground - 13);
      g.lineTo(hx, d.ground - 20);
      g.lineTo(hx + 7.5, d.ground - 13);
      g.closePath();
      g.fill();
      g.fillStyle = 'rgba(255,214,120,0.9)';
      rr(g, hx - 2, d.ground - 10, 3, 3.5, 0.6);
      g.fill();
    }
  },

  drawFront(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    const sy = (1 - d.sunEl / 55) * d.ground;
    g.save();
    g.globalCompositeOperation = 'lighter';
    // 太陽
    const sg = g.createRadialGradient(d.sunX, sy, 0, d.sunX, sy, 8);
    sg.addColorStop(0, 'rgba(255,240,210,0.95)');
    sg.addColorStop(1, 'rgba(255,190,120,0)');
    g.fillStyle = sg;
    g.beginPath(); g.arc(d.sunX, sy, 8, 0, TAU); g.fill();
    // 太陽柱 (上下にのびる光の柱 — 氷晶ミラーの反射像の集まり)
    if (d.pillarVis > 0.02) {
      const len = d.pillarLen;
      const grad = g.createLinearGradient(0, sy - len, 0, sy + len);
      grad.addColorStop(0, 'rgba(255,190,130,0)');
      grad.addColorStop(0.5, `rgba(255,210,150,${d.pillarVis * 0.75})`);
      grad.addColorStop(1, 'rgba(255,190,130,0)');
      g.fillStyle = grad;
      const w2 = 3 + d.wind * 2;
      g.beginPath();
      g.moveTo(d.sunX - w2, sy - len);
      g.quadraticCurveTo(d.sunX - w2 * 1.7, sy, d.sunX - w2, sy + len);
      g.lineTo(d.sunX + w2, sy + len);
      g.quadraticCurveTo(d.sunX + w2 * 1.7, sy, d.sunX + w2, sy - len);
      g.closePath();
      g.fill();
    }
    // 氷晶のきらめき (水平の小さな板)
    for (const f of d.flakes) {
      const tw = Math.abs(Math.sin(ctx.t * 2.4 + f.ph));
      const near = Math.abs(f.x - d.sunX) < 10 && f.y < sy;
      g.fillStyle = `rgba(255,235,200,${0.25 + tw * 0.5 + (near ? 0.25 : 0)})`;
      const tilt = Math.sin(ctx.t * (1 + d.wind * 4) + f.ph) * d.sigma * 0.05;
      g.save();
      g.translate(f.x, f.y);
      g.rotate(tilt);
      g.fillRect(-1, -0.25, 2, 0.5);
      g.restore();
    }
    g.restore();
    // メーター
    g.fillStyle = 'rgba(255,255,255,0.92)';
    rr(g, 4, 16, 46, 16, 3);
    g.fill();
    g.fillStyle = '#556';
    g.font = 'bold 2.6px sans-serif';
    g.fillText(`氷晶${(d.crystals * 100) | 0}% 風${(d.wind * 100) | 0}% 太陽${d.sunEl | 0}°`, 7, 20.5);
    g.fillText('柱のかがやき', 7, 25);
    g.fillStyle = '#ddd';
    rr(g, 26, 22.8, 20, 2.6, 1.3);
    g.fill();
    g.fillStyle = (d.pillarVis ?? 0) > 0.5 ? '#5ad06a' : '#f0b840';
    rr(g, 26, 22.8, Math.max(0.01, 20 * (d.pillarVis ?? 0)), 2.6, 1.3);
    g.fill();
    g.fillStyle = '#889';
    g.font = '2.3px sans-serif';
    g.fillText('☀️ドラッグで高さも変わる', 7, 29.2);
  },
};
