// シーン: コップのストローが折れて見える (屈折による見かけの位置)
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad, woodTable, softShadow, eye as drawEyeArt } from '../engine/art.js';
import { refIndex } from '../engine/spectrum.js';

export default {
  id: 'straw',
  name: 'コップのストロー',
  emoji: '🥤',
  desc: 'まっすぐなのに 折れて見える?',
  goal: '🎯 目の位置をさがして 折れ角 12° 以上で観察しよう!',
  clearMsg: '水面で光が曲がる=屈折、体感完了!',
  spectrumN: 8,

  init(ctx) {
    const d = ctx.data;
    d.level = 0.62;   // 水位 0..1
    d.okT = 0;
    ctx.setTools([
      { id: 'pour', icon: '🚰', label: '水をたす' },
      { id: 'drain', icon: '🕳️', label: '水をへらす' },
    ]);
    ctx.setHint('👁️ をドラッグ!ななめ上から見るほど 大きく折れて見える');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.cx = W * 0.56;
    d.gw = Math.min(W * 0.34, 36);
    d.bottom = Math.min(H - 18, H * 0.88);
    d.top = d.bottom - Math.min(H * 0.34, 58);
    d.eye = d.eye ?? { x: W * 0.2, y: d.top - 26 };
    // ストロー: グラス右上から左下へ
    d.strawTop = { x: d.cx + d.gw * 0.32, y: d.top - 18 };
    d.strawBot = { x: d.cx - d.gw * 0.22, y: d.bottom - 3 };
  },

  update(ctx, dt) {
    const d = ctx.data, p = ctx.primary;
    if (p) {
      d.eye.x = clamp(p.x, 6, ctx.W - 6);
      d.eye.y = clamp(p.y, 20, d.bottom - 4);
    }
    const surfY = d.bottom - (d.bottom - d.top) * d.level;
    d.surfY = surfY;
    const n = refIndex('water', 550);
    // 見かけのストロー: 水中の各点が目からどう見えるか
    // 目→水面→点 の光路 (スネル) を満たす水面位置 xs を反復で解き、
    // その方向に「見かけの点」を置く (視線を伸ばした位置)
    const above = d.eye.y < surfY;
    d.apparent = [];
    const N = 14;
    for (let k = 0; k <= N; k++) {
      const t = k / N;
      const px = d.strawTop.x + (d.strawBot.x - d.strawTop.x) * t;
      const py = d.strawTop.y + (d.strawBot.y - d.strawTop.y) * t;
      if (py < surfY || !above) {
        d.apparent.push([px, py, false]);
        continue;
      }
      // 水中の点: 屈折点 xs を二分法で解く
      const ex = d.eye.x, ey = d.eye.y;
      let lo = Math.min(ex, px) - 40, hi = Math.max(ex, px) + 40;
      let xs = (ex + px) / 2;
      for (let it = 0; it < 24; it++) {
        xs = (lo + hi) / 2;
        const sinI = (xs - ex) / Math.hypot(xs - ex, surfY - ey);
        const sinT = (px - xs) / Math.hypot(px - xs, py - surfY);
        // スネル: sinI = n·sinT (空気側 i, 水側 t)
        const f = sinI - n * sinT;
        const sgnDir = px >= ex ? 1 : -1;
        if (f * sgnDir < 0) lo = xs; else hi = xs;
      }
      // 見かけの位置 = 目→屈折点 の視線を水中へまっすぐ伸ばした先 (光路長ぶん)
      const airLen = Math.hypot(xs - ex, surfY - ey);
      const waterLen = Math.hypot(px - xs, py - surfY);
      const dirX = (xs - ex) / airLen, dirY = (surfY - ey) / airLen;
      const appLen = waterLen / n; // 見かけの深さは 1/n に縮む
      d.apparent.push([xs + dirX * appLen, surfY + dirY * appLen, true, xs]);
    }
    // 折れ角: 水面上のストロー方向 vs 見かけの水中ストロー方向
    const realA = Math.atan2(d.strawBot.y - d.strawTop.y, d.strawBot.x - d.strawTop.x);
    const subs = d.apparent.filter((a) => a[2]);
    let bend = 0;
    if (subs.length >= 2 && above) {
      const a0 = subs[0], a1 = subs[subs.length - 1];
      const appA = Math.atan2(a1[1] - a0[1], a1[0] - a0[0]);
      bend = Math.abs(appA - realA) * 180 / Math.PI;
      if (bend > 180) bend = 360 - bend;
    }
    d.bend = bend;
    if (bend >= 12 && above) {
      d.okT += dt;
      ctx.progress(Math.min(1, d.okT / 1.2));
    } else {
      d.okT = 0;
      if (!ctx._cleared) ctx.progress(clamp(bend / 12, 0, 0.95));
    }
  },

  onTool(ctx, id) {
    const d = ctx.data;
    if (id === 'pour') d.level = clamp(d.level + 0.16, 0.15, 0.92);
    if (id === 'drain') d.level = clamp(d.level - 0.16, 0.15, 0.92);
    ctx.sfx.splash(0.4);
    ctx.backDirty();
    ctx.toast(`水位 ${(d.level * 100) | 0}% — 折れる場所が動く!`);
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    g.fillStyle = vgrad(g, 0, H, [[0, '#fdf4e4'], [1, '#f2e2c8']]);
    g.fillRect(0, 0, W, H);
    woodTable(g, W, d.bottom + 4, H, 1);
    softShadow(g, d.cx, d.bottom + 4, d.gw * 0.8, 2.5, 0.16);
  },

  drawFront(ctx, g) {
    const d = ctx.data;
    const surfY = d.surfY ?? d.top;
    // 水
    g.fillStyle = 'rgba(140,195,235,0.4)';
    rr(g, d.cx - d.gw / 2, surfY, d.gw, d.bottom - surfY, 1);
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.7)';
    g.lineWidth = 0.6;
    g.beginPath();
    g.moveTo(d.cx - d.gw / 2, surfY);
    g.lineTo(d.cx + d.gw / 2, surfY);
    g.stroke();
    // ほんとうのストロー (うすく)
    g.strokeStyle = 'rgba(230,90,110,0.25)';
    g.lineWidth = 1.8;
    g.beginPath();
    g.moveTo(d.strawTop.x, d.strawTop.y);
    g.lineTo(d.strawBot.x, d.strawBot.y);
    g.stroke();
    // 見かけのストロー (目に見える姿)
    if (d.apparent?.length) {
      g.strokeStyle = '#e85a72';
      g.lineWidth = 2;
      g.lineCap = 'round';
      g.beginPath();
      let started = false;
      for (const [ax, ay] of d.apparent) {
        if (!started) { g.moveTo(ax, ay); started = true; }
        else g.lineTo(ax, ay);
      }
      g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.5)';
      g.lineWidth = 0.5;
      g.beginPath();
      started = false;
      for (const [ax, ay] of d.apparent) {
        if (!started) { g.moveTo(ax - 0.5, ay); started = true; }
        else g.lineTo(ax - 0.5, ay);
      }
      g.stroke();
    }
    // 視線 (目→屈折点→ストロー先)
    const sub = d.apparent?.filter((a) => a[2]);
    if (sub?.length && d.eye.y < surfY) {
      const last = sub[sub.length - 1];
      g.strokeStyle = 'rgba(120,150,200,0.5)';
      g.lineWidth = 0.4;
      g.setLineDash([1.4, 1.2]);
      g.beginPath();
      g.moveTo(d.eye.x, d.eye.y);
      g.lineTo(last[3], surfY);
      g.lineTo(d.strawBot.x, d.strawBot.y);
      g.stroke();
      g.setLineDash([]);
    }
    // グラス
    g.strokeStyle = 'rgba(150,190,220,0.9)';
    g.lineWidth = 1;
    rr(g, d.cx - d.gw / 2 - 1.4, d.top - 3, d.gw + 2.8, d.bottom - d.top + 4, 2.5);
    g.stroke();
    // 目
    g.save();
    g.translate(d.eye.x, d.eye.y);
    g.fillStyle = '#fff';
    g.beginPath();
    g.ellipse(0, 0, 4.4, 3, 0, 0, TAU);
    g.fill();
    g.strokeStyle = '#445';
    g.lineWidth = 0.5;
    g.stroke();
    const la = Math.atan2(surfY - d.eye.y, d.cx - d.eye.x);
    g.fillStyle = '#334';
    g.beginPath();
    g.arc(Math.cos(la) * 1.6, Math.sin(la) * 1.1, 1.5, 0, TAU);
    g.fill();
    g.restore();
    // 折れ角メーター
    g.fillStyle = 'rgba(255,255,255,0.92)';
    rr(g, 4, 16, 36, 11, 3);
    g.fill();
    g.fillStyle = '#556';
    g.font = 'bold 2.8px sans-serif';
    g.fillText(`折れ角 ${(d.bend ?? 0).toFixed(1)}°`, 7, 21);
    g.fillStyle = (d.bend ?? 0) >= 12 ? '#2a9a4a' : '#a86';
    g.font = '2.4px sans-serif';
    g.fillText((d.bend ?? 0) >= 12 ? 'いいかんじ!キープ!' : 'めやす 12° 以上', 7, 25);
  },
};
