// シーン: 木もれ日とピンホールカメラ (小さな穴は レンズいらずのカメラ)
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad, woodTable, sun as drawSun, softShadow } from '../engine/art.js';

export default {
  id: 'pinhole',
  name: '木もれ日とピンホール',
  emoji: '📷',
  desc: '穴をとおると 逆さまにうつる',
  goal: '🎯 穴の大きさを調整して ロウソクの逆さ像を くっきり映そう!',
  clearMsg: '木もれ日が丸いのは 太陽の像だから!',
  spectrumN: 8,

  init(ctx) {
    const d = ctx.data;
    d.hole = 4.2;   // 穴の直径 (大きい=ぼやけ・明るい)
    d.okT = 0;
    ctx.setTools([
      { id: 'small', icon: '🔽', label: '穴を小さく' },
      { id: 'big', icon: '🔼', label: '穴を大きく' },
    ]);
    ctx.setHint('上の木もれ日も ぜんぶ「太陽の像」。穴がカメラになる!');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.floorY = Math.min(H - 16, H * 0.9);
    d.cy = H * 0.58;
    // ロウソク (物体) / 箱 (カメラ)
    d.candleX = W * 0.16;
    d.candleH = 15;
    d.boxX = W * 0.52;          // 穴の位置 (箱の前面)
    d.boxW = Math.min(W * 0.4, 42);
    d.screenX = d.boxX + d.boxW; // 箱の奥 (スクリーン)
    // 木もれ日 (上部の飾り+教育)
    d.leafY = 26;
  },

  update(ctx, dt) {
    const d = ctx.data, p = ctx.primary;
    if (p) {
      // ロウソクを左右に動かせる (像の大きさが変わる)
      d.candleX = clamp(p.x, 8, d.boxX - 12);
    }
    // 像の性質: 倍率 m = 箱の奥行 / 物体距離、ボケ半径 ≈ 穴径/2 × (1 + m)
    const u = d.boxX - d.candleX;
    const v = d.boxW;
    d.m = v / u;
    d.blur = (d.hole / 2) * (1 + d.m);
    d.bright = clamp(d.hole * d.hole * 0.14, 0, 1);
    // くっきり (ボケ小) かつ 見える明るさ
    const sharp = d.blur < 2.0;
    const visible = d.bright > 0.1;
    if (sharp && visible) {
      d.okT += dt;
      ctx.progress(Math.min(1, d.okT / 1.5));
      if (!d.saidOk) { d.saidOk = true; ctx.toast('📷 くっきり!ちいさな穴=ピンホールカメラ'); }
    } else {
      d.okT = Math.max(0, d.okT - dt);
      if (!ctx._cleared) {
        ctx.progress(clamp(0.3 + (2.0 / Math.max(d.blur, 2.0)) * 0.4 + (visible ? 0.2 : 0), 0, 0.95));
      }
      if (!visible && !d.saidDark) { d.saidDark = true; ctx.toast('🌑 穴が小さすぎると 暗すぎて見えない…'); }
      if (visible) d.saidDark = false;
    }
  },

  onTool(ctx, id) {
    const d = ctx.data;
    if (id === 'small') d.hole = clamp(d.hole - 0.8, 0.6, 7);
    if (id === 'big') d.hole = clamp(d.hole + 0.8, 0.6, 7);
    ctx.backDirty();
    ctx.toast(`⚫ 穴 ${d.hole.toFixed(1)}mm — 小さいほど くっきり&暗く`);
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    g.fillStyle = vgrad(g, 0, H, [[0, '#bfe0f0'], [0.5, '#dcedf6'], [1, '#eef6fa']]);
    g.fillRect(0, 0, W, H);
    // 木もれ日: 葉のすきま → 地面に丸い光 (どんな形の隙間でも太陽の像=丸)
    g.fillStyle = '#4a7a3a';
    for (let k = 0; k < 24; k++) {
      const lx = (k * 37 % 100) / 100 * W;
      const ly = 6 + (k * 53 % 100) / 100 * d.leafY;
      g.beginPath();
      g.ellipse(lx, ly, 6 + (k % 3) * 2, 3.5 + (k % 2), (k % 5) * 0.6, 0, TAU);
      g.fill();
    }
    // 地面の丸い木もれ日
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 7; k++) {
      const lx = W * 0.1 + (k * 43 % 80) / 100 * W;
      g.fillStyle = 'rgba(255,245,200,0.5)';
      g.beginPath();
      g.ellipse(lx, 40 + (k * 29 % 10), 2.6, 1.5, 0, 0, TAU);
      g.fill();
    }
    g.restore();
    g.fillStyle = 'rgba(70,90,60,0.85)';
    g.font = '2.6px sans-serif';
    g.fillText('↑ 木もれ日は ぜんぶ丸い (太陽の像)', W * 0.1, 48);
    woodTable(g, W, d.floorY, H, 1);
    // カメラの箱
    softShadow(g, d.boxX + d.boxW / 2, d.floorY, d.boxW * 0.6, 2.5, 0.2);
    g.fillStyle = '#4a4038';
    rr(g, d.boxX, d.cy - 24, d.boxW, 48, 2);
    g.fill();
    g.fillStyle = '#2e2822';
    rr(g, d.boxX + 2, d.cy - 22, d.boxW - 4, 44, 1.5);
    g.fill();
    // スクリーン (すりガラスの奥面)
    g.fillStyle = '#e8e2d2';
    rr(g, d.screenX - 3.5, d.cy - 20, 3, 40, 1);
    g.fill();
    // 前面の穴
    g.fillStyle = '#0a0806';
    g.beginPath();
    g.ellipse(d.boxX + 1, d.cy, 1.2, d.hole / 2, 0, 0, TAU);
    g.fill();
  },

  drawFront(ctx, g) {
    const d = ctx.data;
    // ロウソク (物体) — 炎がゆらめく
    const cx = d.candleX, base = d.cy + 12;
    g.fillStyle = '#f2ead8';
    rr(g, cx - 2, base - d.candleH, 4, d.candleH, 1);
    g.fill();
    const ft = ctx.t * 7;
    const fy = base - d.candleH - 4 + Math.sin(ft) * 0.4;
    g.save();
    g.globalCompositeOperation = 'lighter';
    const fg = g.createRadialGradient(cx, fy, 0, cx, fy, 5);
    fg.addColorStop(0, 'rgba(255,240,180,0.9)');
    fg.addColorStop(1, 'rgba(255,150,60,0)');
    g.fillStyle = fg;
    g.beginPath(); g.arc(cx, fy, 5, 0, TAU); g.fill();
    g.fillStyle = '#ffd27a';
    g.beginPath();
    g.ellipse(cx, fy, 1.1 + Math.sin(ft * 1.7) * 0.15, 2.4, Math.sin(ft * 0.9) * 0.12, 0, TAU);
    g.fill();
    // 光線: 炎の上端/ロウソク下端 → 穴 → スクリーン (交差して逆さに)
    g.strokeStyle = 'rgba(255,220,120,0.35)';
    g.lineWidth = 0.45;
    const hx = d.boxX + 1;
    for (const [ox, oy] of [[cx, fy - 2], [cx, base]]) {
      for (const hh of [-d.hole / 2, d.hole / 2]) {
        const dyr = (d.cy + hh - oy) / (hx - ox);
        g.beginPath();
        g.moveTo(ox, oy);
        g.lineTo(hx, d.cy + hh);
        g.lineTo(d.screenX - 3, d.cy + hh + dyr * (d.screenX - 3 - hx));
        g.stroke();
      }
    }
    // スクリーン上の逆さ像 (ボケ=穴径ぶんの平行移動合成)
    const m = d.m;
    const imgH = (d.candleH + 6) * m;
    const iy0 = d.cy + (base - d.cy) * -m; // ロウソク下端の像 (上へ)
    g.globalAlpha = clamp(d.bright, 0.06, 0.85);
    const steps = 5;
    for (let s2 = 0; s2 < steps; s2++) {
      const off = (s2 / (steps - 1) - 0.5) * d.blur * 2;
      // 逆さロウソク
      g.fillStyle = '#e8dcc2';
      rr(g, d.screenX - 3.2, iy0 + off, 2.4, d.candleH * m, 0.5);
      g.fill();
      // 逆さ炎 (下側)
      g.fillStyle = '#ffb85a';
      g.beginPath();
      g.ellipse(d.screenX - 2, iy0 + d.candleH * m + 2.5 * m + off, 0.9 * m + 0.3, 2 * m + 0.4, 0, 0, TAU);
      g.fill();
    }
    g.globalAlpha = 1;
    g.restore();
    // メーター
    g.fillStyle = 'rgba(255,255,255,0.92)';
    rr(g, ctx.W - 42, 16, 40, 14, 3);
    g.fill();
    g.fillStyle = '#556';
    g.font = 'bold 2.6px sans-serif';
    g.fillText(`穴 ${d.hole.toFixed(1)}mm`, ctx.W - 39, 20.5);
    g.fillStyle = d.blur < 2.0 ? '#2a9a4a' : '#a86';
    g.font = '2.3px sans-serif';
    g.fillText(`ボケ ${d.blur?.toFixed(1)}`, ctx.W - 39, 24.4);
    g.fillStyle = d.bright > 0.1 ? '#2a9a4a' : '#a86';
    g.fillText(`明るさ ${((d.bright ?? 0) * 100) | 0}%`, ctx.W - 22, 24.4);
    g.fillStyle = '#889';
    g.fillText('👆ロウソクも動かせる', ctx.W - 39, 28.2);
  },
};
