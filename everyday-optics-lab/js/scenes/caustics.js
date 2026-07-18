// シーン: プールのゆらめく光 (波がレンズ — 本物のコースティクス計算)
// 太陽の平行光を波面の法線で屈折させ、底への到達密度=明るさ
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad, sun as drawSun } from '../engine/art.js';
import { refIndex } from '../engine/spectrum.js';

const NRAY = 240;
const BINS = 120;

export default {
  id: 'caustics',
  name: 'プールのゆらめく光',
  emoji: '🌊',
  desc: '底でおどる 光のあみもよう',
  goal: '🎯 波をおこして「光のあみ」→ しずめて「まっ平ら」両方を観察!',
  clearMsg: '波の谷がレンズになって 光をあつめていた!',
  spectrumN: 8,

  init(ctx) {
    const d = ctx.data;
    d.ph = new Array(6).fill(0).map((_, i) => rand(0, 6));
    d.amp = 0.8;
    d.sawWavy = 0; d.sawCalm = 0;
    d.ripples = [];
    ctx.setTools([
      { id: 'wave', icon: '🌊', label: 'なみをおこす' },
      { id: 'calm', icon: '🫧', label: 'しずめる' },
    ]);
    ctx.setHint('水面をタップしても 波もんが広がるよ');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.surfY = H * 0.3;
    d.floorY = Math.min(H - 20, H * 0.85);
    d.depth = d.floorY - d.surfY;
  },

  _height(d, x, t) {
    // 波面 h(x,t): 定常波 + ユーザーの波紋
    let h = 0;
    const ks = [0.08, 0.13, 0.21, 0.34, 0.55, 0.89];
    for (let i = 0; i < 6; i++) {
      h += Math.sin(x * ks[i] + t * (1 + i * 0.4) + d.ph[i]) * d.amp / (1 + i * 0.7);
    }
    for (const rp of d.ripples) {
      const r2 = Math.abs(x - rp.x);
      const wavefront = rp.age * 26;
      h += Math.exp(-((r2 - wavefront) ** 2) / 30) * Math.sin((r2 - wavefront) * 0.9) * rp.a * 2;
    }
    return h;
  },

  update(ctx, dt) {
    const d = ctx.data, W = ctx.W;
    // 波紋の伝播
    for (let i = d.ripples.length - 1; i >= 0; i--) {
      const rp = d.ripples[i];
      rp.age += dt;
      rp.a *= 1 - dt * 0.7;
      if (rp.a < 0.05) d.ripples.splice(i, 1);
    }
    d.amp = clamp(d.amp + ((d.targetAmp ?? 0.8) - d.amp) * dt * 1.2, 0.02, 2);
    // コースティクス: 各光線を波面法線で屈折→底の x をビン集計
    const n = refIndex('water', 550);
    const bins = new Float32Array(BINS);
    const e = 0.7;
    const t = ctx.t;
    for (let i = 0; i < NRAY; i++) {
      const x = (i / (NRAY - 1)) * W;
      const slope = (this._height(d, x + e, t) - this._height(d, x - e, t)) / (2 * e);
      // 表面法線角 ≈ atan(slope)。垂直入射光の屈折角 (スネル)
      const thI = Math.atan(slope);
      const thT = Math.asin(clamp(Math.sin(thI) / n, -1, 1));
      const dev = thI - thT; // 光の曲がり
      const hx = x + Math.tan(dev) * d.depth;
      // バイリニア分配 (量子化ノイズを消す)
      const fb = (hx / W) * BINS - 0.5;
      const i0 = Math.floor(fb), fr = fb - i0;
      if (i0 >= 0 && i0 < BINS) bins[i0] += 1 - fr;
      if (i0 + 1 >= 0 && i0 + 1 < BINS) bins[i0 + 1] += fr;
    }
    d.bins = bins;
    // コントラスト = 変動係数
    let mu = 0;
    for (const b of bins) mu += b;
    mu /= BINS;
    let sd = 0;
    for (const b of bins) sd += (b - mu) ** 2;
    sd = Math.sqrt(sd / BINS);
    d.contrast = mu > 0 ? sd / mu : 0;
    // 観察ゲージ
    if (d.contrast > 0.55) d.sawWavy = Math.min(1, d.sawWavy + dt * 0.5);
    if (d.contrast < 0.18) d.sawCalm = Math.min(1, d.sawCalm + dt * 0.55);
    if (d.sawWavy >= 1 && !d.saidW) { d.saidW = true; ctx.sfx.chime(); ctx.toast('🕸️ 光のあみ!波の谷 (へこみ) がレンズになってる'); }
    if (d.sawCalm >= 1 && !d.saidC) { d.saidC = true; ctx.sfx.chime(); ctx.toast('🫧 まっ平ら!波がないと光はまっすぐ'); }
    ctx.progress(Math.min(1, (d.sawWavy + d.sawCalm) / 2));
  },

  onDown(ctx, p) {
    const d = ctx.data;
    if (p.y < d.floorY) {
      d.ripples.push({ x: p.x, age: 0, a: 1 });
      ctx.sfx.drip();
    }
  },

  onTool(ctx, id) {
    const d = ctx.data;
    if (id === 'wave') {
      d.targetAmp = 1.8;
      for (let k = 0; k < 3; k++) d.ripples.push({ x: rand(0, ctx.W), age: 0, a: 1 });
      ctx.toast('🌊 ざぶんざぶん!');
    }
    if (id === 'calm') {
      d.targetAmp = 0.04;
      d.ripples.length = 0;
      ctx.toast('🫧 しーん…水面が鏡みたいに');
    }
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    g.fillStyle = vgrad(g, 0, d.surfY, [[0, '#aadcf4'], [1, '#d8eefa']]);
    g.fillRect(0, 0, W, d.surfY);
    drawSun(g, W * 0.82, 10, 4.5);
    // プールの水
    g.fillStyle = vgrad(g, d.surfY, H, [[0, '#5ab8dc'], [1, '#2a7aa8']]);
    g.fillRect(0, d.surfY, W, H - d.surfY);
    // 底のタイル
    g.fillStyle = '#7ac8e0';
    g.fillRect(0, d.floorY, W, H - d.floorY);
    g.strokeStyle = 'rgba(40,110,150,0.5)';
    g.lineWidth = 0.5;
    for (let x = 0; x < W; x += 10) {
      g.beginPath(); g.moveTo(x, d.floorY); g.lineTo(x, H); g.stroke();
    }
    g.beginPath(); g.moveTo(0, d.floorY + 6); g.lineTo(W, d.floorY + 6); g.stroke();
  },

  drawFront(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    if (!d.bins) return;
    // 水面のライン
    g.strokeStyle = 'rgba(255,255,255,0.8)';
    g.lineWidth = 0.8;
    g.beginPath();
    for (let x = 0; x <= W; x += 2) {
      const y = d.surfY + this._height(d, x, ctx.t) * 1.6;
      x === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    g.stroke();
    // 光線 (まびいて表示)
    g.save();
    g.globalCompositeOperation = 'lighter';
    const n = refIndex('water', 550);
    g.strokeStyle = 'rgba(255,250,210,0.10)';
    g.lineWidth = 0.5;
    for (let i = 0; i < NRAY; i += 6) {
      const x = (i / (NRAY - 1)) * W;
      const e = 0.7;
      const slope = (this._height(d, x + e, ctx.t) - this._height(d, x - e, ctx.t)) / (2 * e);
      const thI = Math.atan(slope);
      const dev = thI - Math.asin(clamp(Math.sin(thI) / n, -1, 1));
      const y0 = d.surfY + this._height(d, x, ctx.t) * 1.6;
      g.beginPath();
      g.moveTo(x, Math.max(16, y0 - 20));
      g.lineTo(x, y0);
      g.lineTo(x + Math.tan(dev) * d.depth, d.floorY);
      g.stroke();
    }
    // 底のコースティクス (ビン密度 → 明るさ)
    const bw = W / BINS;
    for (let b = 0; b < BINS; b++) {
      const v = d.bins[b] / (NRAY / BINS); // 1=均一
      if (v < 0.15) continue;
      const a = clamp((v - 0.6) * 0.5, 0, 0.85);
      if (a <= 0.01) continue;
      g.fillStyle = `rgba(255,252,225,${a})`;
      g.fillRect(b * bw, d.floorY, bw + 0.3, H - d.floorY);
      // 水中にも光の柱がうっすら
      g.fillStyle = `rgba(255,252,225,${a * 0.16})`;
      g.fillRect(b * bw, d.surfY + 6, bw + 0.3, d.depth - 6);
    }
    g.restore();
    // メーター
    g.fillStyle = 'rgba(255,255,255,0.92)';
    rr(g, 4, 16, 46, 13, 3);
    g.fill();
    g.fillStyle = '#556';
    g.font = 'bold 2.6px sans-serif';
    g.fillText(`あみ目コントラスト ${((d.contrast ?? 0) * 100) | 0}%`, 7, 20.6);
    g.fillStyle = d.sawWavy >= 1 ? '#2a9a4a' : '#bbb';
    g.fillText('🕸️なみなみ', 7, 25.5);
    g.fillStyle = d.sawCalm >= 1 ? '#2a9a4a' : '#bbb';
    g.fillText('🫧しずか', 27, 25.5);
  },
};
