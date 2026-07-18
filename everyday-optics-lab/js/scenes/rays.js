// シーン: 薄明光線 (雲の切れ間から 天使のはしご)
// 光柱の輝度 ∝ 散乱係数 × 透過率 exp(-βL) を柱ごとに計算 (チンダル現象)
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad } from '../engine/art.js';
import { DragMgr } from './common.js';

export default {
  id: 'rays',
  name: '薄明光線',
  emoji: '☀️',
  desc: '雲間から 天使のはしご',
  goal: '🎯 雲を動かし ちりを調整して 光のはしごを3本 地上にとどけよう!',
  clearMsg: '見えない光の道が ちりで見えるようになった!',
  spectrumN: 8,

  init(ctx) {
    const d = ctx.data;
    d.haze = 0.12;
    d.mgr = new DragMgr();
    d.okT = 0;
    ctx.setTools([
      { id: 'hazeUp', icon: '🌫️', label: 'ちりをふやす' },
      { id: 'hazeDn', icon: '🍃', label: 'ちりをへらす' },
    ]);
    ctx.setHint('雲をドラッグして すきまをつくろう。ちりゼロだと光の道は見えない');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.ground = Math.min(H - 20, H * 0.86);
    d.cloudY = H * 0.22;
    d.sunX = W * 0.5;
    // 雲 4つ (ドラッグで動かす)
    const old = d.mgr.items.slice();
    d.mgr.items.length = 0;
    d.clouds = [];
    for (let k = 0; k < 4; k++) {
      const prev = old[k];
      d.clouds.push(d.mgr.add({
        x: prev?.x ?? W * (0.14 + k * 0.24),
        y: d.cloudY + (k % 2) * 3,
        r: 13, w: 11 + (k % 2) * 3,
        boundsX: [2, W - 2], boundsY: [d.cloudY - 4, d.cloudY + 8],
        hideRing: true,
      }));
    }
  },

  update(ctx, dt) {
    const d = ctx.data, W = ctx.W;
    // 雲のすきま検出: x走査で雲に覆われていない区間
    const covered = new Array(60).fill(false);
    for (const c of d.clouds) {
      const x0 = Math.floor((c.x - c.w) / W * 60), x1 = Math.ceil((c.x + c.w) / W * 60);
      for (let i = Math.max(0, x0); i <= Math.min(59, x1); i++) covered[i] = true;
    }
    // すきま (連続した open 区間) → 光柱
    d.beams = [];
    let start = -1;
    for (let i = 0; i <= 60; i++) {
      const open = i < 60 && !covered[i];
      if (open && start < 0) start = i;
      if (!open && start >= 0) {
        const wFrac = (i - start) / 60;
        if (wFrac > 0.025) {
          d.beams.push({ x0: (start / 60) * W, x1: (i / 60) * W, w: wFrac });
        }
        start = -1;
      }
    }
    // 各光柱の物理: 見え方 = ちり散乱 β·exp(-βs)、地面到達 = exp(-βL)
    const beta = d.haze * 0.028;
    const L = d.ground - d.cloudY;
    let reach = 0;
    for (const b of d.beams) {
      b.shaft = clamp(beta * 55 * Math.exp(-beta * L * 0.35), 0, 1); // 柱の輝き
      b.groundI = Math.exp(-beta * L * 0.5);                          // 地面到達
      b.ok = b.shaft > 0.3 && b.groundI > 0.35;
      if (b.ok) reach++;
    }
    d.reach = reach;
    if (reach >= 3) {
      d.okT += dt;
      ctx.progress(Math.min(1, d.okT / 1.6));
      if (!d.saidOk) { d.saidOk = true; ctx.toast('👼 天使のはしご 3本!'); }
    } else {
      d.okT = Math.max(0, d.okT - dt * 0.6);
      d.saidOk = false;
      if (!ctx._cleared) {
        const anyShaft = d.beams.length ? Math.max(...d.beams.map((b) => b.shaft)) : 0;
        ctx.progress(clamp(reach / 3 * 0.7 + anyShaft * 0.25, 0, 0.95));
      }
    }
  },

  onDown(ctx, p) { ctx.data.mgr.down(p); },
  onMove(ctx, p) { ctx.data.mgr.move(p, ctx); },
  onUp(ctx) { ctx.data.mgr.up(); },

  onTool(ctx, id) {
    const d = ctx.data;
    if (id === 'hazeUp') d.haze = clamp(d.haze + 0.14, 0, 1);
    if (id === 'hazeDn') d.haze = clamp(d.haze - 0.14, 0, 1);
    ctx.toast(`🌫️ 空気中のちり ${(d.haze * 100) | 0}% ${d.haze < 0.1 ? '(すきとおりすぎて見えない)' : d.haze > 0.8 ? '(かすみすぎ)' : ''}`);
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    // 夕方ちかくの空
    g.fillStyle = vgrad(g, 0, H, [[0, '#8aaed0'], [0.5, '#c8d4e0'], [1, '#e8e2d4']]);
    g.fillRect(0, 0, W, H);
    // 海と地上
    g.fillStyle = vgrad(g, d.ground, H, [[0, '#4a7a9a'], [1, '#38607e']]);
    g.fillRect(0, d.ground, W, H - d.ground);
  },

  drawFront(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    // 太陽のにじみ (雲の上)
    g.save();
    g.globalCompositeOperation = 'lighter';
    const sg = g.createRadialGradient(d.sunX, d.cloudY - 10, 0, d.sunX, d.cloudY - 10, 26);
    sg.addColorStop(0, 'rgba(255,250,225,0.9)');
    sg.addColorStop(1, 'rgba(255,240,200,0)');
    g.fillStyle = sg;
    g.beginPath(); g.arc(d.sunX, d.cloudY - 10, 26, 0, TAU); g.fill();
    // 光柱 (すきまごと)
    for (const b of d.beams ?? []) {
      if (b.shaft < 0.02) continue;
      // 太陽方向へすぼまる台形 (放射状)
      const spread = 1.25;
      const gx0 = b.x0 + (b.x0 - d.sunX) * (spread - 1);
      const gx1 = b.x1 + (b.x1 - d.sunX) * (spread - 1);
      const steps = 14;
      for (let s2 = 0; s2 < steps; s2++) {
        const t0 = s2 / steps, t1 = (s2 + 1) / steps;
        const a = b.shaft * 0.36 * (1 - t0 * 0.55);
        if (a < 0.01) continue;
        g.fillStyle = `rgba(255,246,214,${a})`;
        const y0 = d.cloudY + 4 + t0 * (d.ground - d.cloudY - 4);
        const y1 = d.cloudY + 4 + t1 * (d.ground - d.cloudY - 4);
        g.beginPath();
        g.moveTo(b.x0 + (gx0 - b.x0) * t0, y0);
        g.lineTo(b.x1 + (gx1 - b.x1) * t0, y0);
        g.lineTo(b.x1 + (gx1 - b.x1) * t1, y1);
        g.lineTo(b.x0 + (gx0 - b.x0) * t1, y1);
        g.closePath();
        g.fill();
      }
      // 地面 (海) の光だまり
      if (b.groundI > 0.05) {
        const cx = (gx0 + gx1) / 2;
        const gg = g.createRadialGradient(cx, d.ground + 2, 0, cx, d.ground + 2, (gx1 - gx0) * 0.9 + 4);
        gg.addColorStop(0, `rgba(255,250,225,${b.groundI * 0.55})`);
        gg.addColorStop(1, 'rgba(255,250,225,0)');
        g.fillStyle = gg;
        g.beginPath();
        g.ellipse(cx, d.ground + 2, (gx1 - gx0) * 0.9 + 4, 4, 0, 0, TAU);
        g.fill();
      }
    }
    g.restore();
    // 雲 (ドラッグ対象)
    for (const c of d.clouds) {
      g.fillStyle = 'rgba(90,100,120,0.92)';
      for (const [ox, oy, r2] of [[-c.w * 0.5, 0, 5.5], [0, -2.5, 7], [c.w * 0.45, 0, 5.5], [0, 1.5, 6]]) {
        g.beginPath();
        g.arc(c.x + ox, c.y + oy, r2, 0, TAU);
        g.fill();
      }
      // ふちの銀色 (silver lining!)
      g.strokeStyle = 'rgba(255,250,230,0.65)';
      g.lineWidth = 0.8;
      g.beginPath();
      g.arc(c.x, c.y - 2.5, 7, Math.PI * 1.15, Math.PI * 1.85);
      g.stroke();
    }
    // メーター
    g.fillStyle = 'rgba(255,255,255,0.92)';
    rr(g, 4, 16, 40, 13, 3);
    g.fill();
    g.fillStyle = '#556';
    g.font = 'bold 2.6px sans-serif';
    g.fillText(`はしご ${d.reach ?? 0}/3本`, 7, 20.6);
    g.fillStyle = '#889';
    g.font = '2.4px sans-serif';
    g.fillText(`ちり ${(d.haze * 100) | 0}% (β∝ちり)`, 7, 25.2);
  },
};
