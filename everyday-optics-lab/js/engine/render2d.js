// レイ (波長つき線分) の加算発光描画
import { waveToRgb, gamma } from './spectrum.js';

const colorCache = new Map();
export function waveCss(l, a = 1) {
  const key = Math.round(l / 4) * 4;
  let rgb = colorCache.get(key);
  if (!rgb) {
    const [r, g, b] = waveToRgb(key);
    const mx = Math.max(r, g, b, 1e-6);
    rgb = [gamma(r / mx) * 255, gamma(g / mx) * 255, gamma(b / mx) * 255];
    colorCache.set(key, rgb);
  }
  return `rgba(${rgb[0] | 0},${rgb[1] | 0},${rgb[2] | 0},${a})`;
}

// segs: [{x0,y0,x1,y1,l,I}] を 2パス (グロー+コア) で描く
export function drawRays(g, segs, opts = {}) {
  const glowW = opts.glowWidth ?? 2.2;
  const coreW = opts.coreWidth ?? 0.55;
  const gain = opts.gain ?? 1;
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.lineCap = 'round';
  for (let pass = 0; pass < 2; pass++) {
    g.lineWidth = pass === 0 ? glowW : coreW;
    const aScale = (pass === 0 ? 0.10 : 0.5) * gain;
    for (const s of segs) {
      const a = Math.min(1, s.I * aScale * 3);
      if (a < 0.012) continue;
      g.strokeStyle = waveCss(s.l, a);
      g.beginPath();
      g.moveTo(s.x0, s.y0);
      g.lineTo(s.x1, s.y1);
      g.stroke();
    }
  }
  g.restore();
}

// スクリーン要素の hits をスペクトル→色の帯として描く
export function drawScreenGlow(g, el, opts = {}) {
  const hits = el.hits || [];
  if (!hits.length) return;
  const bins = opts.bins ?? 48;
  const acc = Array.from({ length: bins }, () => [0, 0, 0]);
  for (const h of hits) {
    const bi = Math.min(bins - 1, Math.max(0, (h.u * bins) | 0));
    const [r, gg, b] = waveToRgb(h.l);
    const mx = Math.max(r, gg, b, 1e-6);
    acc[bi][0] += (r / mx) * h.I;
    acc[bi][1] += (gg / mx) * h.I;
    acc[bi][2] += (b / mx) * h.I;
  }
  const dx = (el.bx - el.ax) / bins, dy = (el.by - el.ay) / bins;
  const w = opts.width ?? 2.4;
  let nx = -(el.by - el.ay), ny = el.bx - el.ax;
  const len = Math.hypot(nx, ny) || 1;
  nx = (nx / len) * w; ny = (ny / len) * w;
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < bins; i++) {
    const [r, gg, b] = acc[i];
    const mx = Math.max(r, gg, b);
    if (mx < 0.02) continue;
    const k = Math.min(1, mx * (opts.gain ?? 0.9));
    g.fillStyle = `rgba(${(gamma(Math.min(1, r)) * 255) | 0},${(gamma(Math.min(1, gg)) * 255) | 0},${(gamma(Math.min(1, b)) * 255) | 0},${k})`;
    const x = el.ax + dx * i, y = el.ay + dy * i;
    g.beginPath();
    g.moveTo(x - nx, y - ny);
    g.lineTo(x + dx - nx, y + dy - ny);
    g.lineTo(x + dx + nx, y + dy + ny);
    g.lineTo(x + nx, y + ny);
    g.closePath();
    g.fill();
  }
  g.restore();
}
