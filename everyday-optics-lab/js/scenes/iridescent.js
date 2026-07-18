// シーン: 彩雲 (雲つぶの回折 — リング角 θ≈1.22λ/d を波長ごとに計算)
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad, cloud } from '../engine/art.js';
import { gamma } from '../engine/spectrum.js';

export default {
  id: 'iridescent',
  name: '彩雲',
  emoji: '🌈',
  desc: '雲がパステル色に光る日',
  goal: '🎯 雲つぶを小さく・そろえて あざやかな彩雲を出そう!',
  clearMsg: '小さくそろった水滴=回折リングがくっきり!',
  spectrumN: 14,

  init(ctx) {
    const d = ctx.data;
    d.drop = 18;      // 雲つぶ直径 [µm]
    d.sigma = 0.5;    // 粒サイズのばらつき 0..1
    d.okT = 0;
    ctx.setTools([
      { id: 'small', icon: '💧', label: 'つぶを小さく' },
      { id: 'big', icon: '🫧', label: 'つぶを大きく' },
      { id: 'even', icon: '✨', label: 'つぶをそろえる' },
    ]);
    ctx.setHint('新しくできたばかりの雲は 粒が小さくてそろってる → 彩雲チャンス!');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.sunX = W * 0.5;
    d.sunY = H * 0.3;
    d.degPx = Math.min(W, H) * 0.028; // 1°の長さ
    d.ground = Math.min(H - 24, H * 0.88);
    this._ringLUT(ctx);
  },

  // 角度→色の LUT (回折: 各λのリング θ=1.22λ/d ± ばらつきぼかし)
  _ringLUT(ctx) {
    const d = ctx.data;
    const N = 90; // 0..9°
    const lut = [];
    for (let i = 0; i < N; i++) lut.push([0, 0, 0]);
    for (const s of ctx.spectrum) {
      const th = 1.22 * (s.l / 1000) / d.drop * (180 / Math.PI); // deg
      const width = 0.35 + d.sigma * 2.2 + th * 0.18;            // ばらつきでぼける
      for (let i = 0; i < N; i++) {
        const a = (i / N) * 9;
        // 1次リング + 中心のオーレオール
        const ring = Math.exp(-((a - th) ** 2) / (width * width)) * 0.9;
        const aureole = Math.exp(-a * a / (th * th * 0.5)) * 0.6;
        const v = ring + aureole;
        lut[i][0] += s.rgb[0] * v;
        lut[i][1] += s.rgb[1] * v;
        lut[i][2] += s.rgb[2] * v;
      }
    }
    // 彩度 (色のあざやかさ) を測る: リング帯の平均彩度
    let sat = 0, n2 = 0;
    for (let i = 10; i < N; i++) {
      const [r, g2, b] = lut[i];
      const mx = Math.max(r, g2, b), mn = Math.min(r, g2, b);
      if (mx > 0.05) { sat += (mx - mn) / mx; n2++; }
    }
    d.vivid = n2 ? sat / n2 : 0;
    d.lut = lut;
  },

  update(ctx, dt) {
    const d = ctx.data, p = ctx.primary;
    if (p) {
      // 太陽の位置も少し動かせる (雲のうすい所をねらう)
      d.sunX = clamp(p.x, ctx.W * 0.25, ctx.W * 0.75);
      d.sunY = clamp(p.y, 24, d.ground * 0.6);
    }
    const good = d.vivid > 0.42 && d.drop < 14;
    if (good) {
      d.okT += dt;
      ctx.progress(Math.min(1, d.okT / 2));
      if (!d.saidOk) { d.saidOk = true; ctx.toast('🌈 あざやか!パイロットが見る彩雲もこれ'); }
    } else {
      d.okT = Math.max(0, d.okT - dt * 0.5);
      d.saidOk = false;
      if (!ctx._cleared) ctx.progress(clamp(d.vivid / 0.42 * 0.7 + (d.drop < 14 ? 0.2 : 0), 0, 0.95));
    }
  },

  onTool(ctx, id) {
    const d = ctx.data;
    if (id === 'small') d.drop = clamp(d.drop - 3, 6, 30);
    if (id === 'big') d.drop = clamp(d.drop + 3, 6, 30);
    if (id === 'even') d.sigma = clamp(d.sigma - 0.2, 0.05, 1);
    this._ringLUT(ctx);
    ctx.toast(`💧 つぶ ${d.drop}µm / ばらつき ${(d.sigma * 100) | 0}% — リング角 θ∝λ/d`);
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    g.fillStyle = vgrad(g, 0, H, [[0, '#7ab8e8'], [0.7, '#a8d4f0'], [1, '#cfe8f8']]);
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#8fbf72';
    g.beginPath();
    g.moveTo(0, d.ground + 8);
    g.quadraticCurveTo(W * 0.5, d.ground - 4, W, d.ground + 8);
    g.lineTo(W, H); g.lineTo(0, H);
    g.closePath();
    g.fill();
  },

  drawFront(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    // 太陽 (雲にかくれ気味)
    g.save();
    g.globalCompositeOperation = 'lighter';
    const sg = g.createRadialGradient(d.sunX, d.sunY, 0, d.sunX, d.sunY, 9);
    sg.addColorStop(0, 'rgba(255,255,240,0.95)');
    sg.addColorStop(1, 'rgba(255,240,200,0)');
    g.fillStyle = sg;
    g.beginPath(); g.arc(d.sunX, d.sunY, 9, 0, TAU); g.fill();
    // 彩雲リング (LUT を同心円で描画)
    const N = d.lut.length;
    for (let i = 1; i < N; i++) {
      const [r, g2, b] = d.lut[i];
      const mx = Math.max(r, g2, b);
      if (mx < 0.02) continue;
      const k = 2.6;
      const a = clamp(mx * 1.1, 0, 0.55);
      g.strokeStyle = `rgba(${(gamma(clamp(r * k, 0, 1)) * 255) | 0},${(gamma(clamp(g2 * k, 0, 1)) * 255) | 0},${(gamma(clamp(b * k, 0, 1)) * 255) | 0},${a})`;
      g.lineWidth = (9 / N) * d.degPx + 0.4;
      g.beginPath();
      g.arc(d.sunX, d.sunY, Math.max(0.5, (i / N) * 9 * d.degPx), 0, TAU);
      g.stroke();
    }
    g.restore();
    // うす雲 (彩雲が「見える」場所のテクスチャ)
    g.globalAlpha = 0.5;
    cloud(g, d.sunX - 8, d.sunY + 3, 1.4, 0.5);
    cloud(g, d.sunX + 10, d.sunY - 2, 1.1, 0.4);
    cloud(g, d.sunX + 2, d.sunY + 8, 1.2, 0.45);
    g.globalAlpha = 1;
    // ふつうの雲
    cloud(g, W * 0.15, H * 0.14, 1, 0.9);
    cloud(g, W * 0.85, H * 0.2, 0.9, 0.85);
    // メーター
    g.fillStyle = 'rgba(255,255,255,0.92)';
    rr(g, 4, 16, 46, 16, 3);
    g.fill();
    g.fillStyle = '#556';
    g.font = 'bold 2.6px sans-serif';
    g.fillText(`つぶ ${d.drop}µm / ばらつき ${(d.sigma * 100) | 0}%`, 7, 20.5);
    g.fillText('あざやかさ', 7, 25);
    g.fillStyle = '#ddd';
    rr(g, 22, 22.8, 24, 2.6, 1.3);
    g.fill();
    g.fillStyle = (d.vivid ?? 0) > 0.42 ? '#5ad06a' : '#f0b840';
    rr(g, 22, 22.8, Math.max(0.01, 24 * clamp((d.vivid ?? 0) / 0.7, 0, 1)), 2.6, 1.3);
    g.fill();
    g.fillStyle = '#889';
    g.font = '2.3px sans-serif';
    g.fillText('リング角 θ=1.22λ/d (赤が外側)', 7, 30);
  },
};
