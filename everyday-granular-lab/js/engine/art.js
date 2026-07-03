// 背景・小物の共通描画ヘルパー (world 座標系)
import { TAU } from './utils.js';

export function rr(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

export function vgrad(g, y0, y1, stops) {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  for (const [t, c] of stops) gr.addColorStop(t, c);
  return gr;
}

export function softShadow(g, x, y, rx, ry, a = 0.18) {
  g.fillStyle = `rgba(30,20,40,${a})`;
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, TAU);
  g.fill();
}

// 木のテーブル
export function woodTable(g, W, yTop, yBottom, tone = 0) {
  const cols = tone === 0
    ? ['#c8935f', '#b9814e', '#a97243']
    : ['#e7c496', '#dcb279', '#cfa063'];
  g.fillStyle = vgrad(g, yTop, yBottom, [[0, cols[0]], [1, cols[2]]]);
  g.fillRect(-2, yTop, W + 4, yBottom - yTop + 2);
  g.strokeStyle = 'rgba(90,55,25,0.18)';
  g.lineWidth = 0.5;
  for (let i = 0; i < 7; i++) {
    const y = yTop + (yBottom - yTop) * (0.12 + i * 0.14);
    g.beginPath();
    g.moveTo(0, y);
    g.bezierCurveTo(W * 0.3, y + 1.5, W * 0.6, y - 1.5, W, y + 0.6);
    g.stroke();
  }
  g.fillStyle = 'rgba(255,255,255,0.10)';
  g.fillRect(-2, yTop, W + 4, 1.2);
}

// キッチンのタイル壁
export function tileWall(g, W, yTop, yBottom, base = '#dfeef2') {
  g.fillStyle = base;
  g.fillRect(-2, yTop, W + 4, yBottom - yTop);
  g.strokeStyle = 'rgba(120,150,160,0.25)';
  g.lineWidth = 0.4;
  const s = 12;
  for (let y = yTop; y < yBottom; y += s) {
    g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
  }
  for (let x = 0; x < W + s; x += s) {
    g.beginPath(); g.moveTo(x, yTop); g.lineTo(x, yBottom); g.stroke();
  }
}

// 夕方/昼の空
export function sky(g, W, yTop, yBottom, kind = 'day') {
  const stops = kind === 'day'
    ? [[0, '#7ec8f7'], [0.6, '#b8e2fb'], [1, '#e8f7ff']]
    : [[0, '#3c62b0'], [0.5, '#7d90d8'], [1, '#f7c8a0']];
  g.fillStyle = vgrad(g, yTop, yBottom, stops);
  g.fillRect(-2, yTop, W + 4, yBottom - yTop);
}

export function cloud(g, x, y, s, a = 0.9) {
  g.fillStyle = `rgba(255,255,255,${a})`;
  g.beginPath();
  g.arc(x, y, 4 * s, 0, TAU);
  g.arc(x + 4 * s, y + 1 * s, 3.2 * s, 0, TAU);
  g.arc(x - 4 * s, y + 1.2 * s, 3 * s, 0, TAU);
  g.arc(x + 1 * s, y - 2 * s, 3 * s, 0, TAU);
  g.fill();
}

export function sun(g, x, y, r) {
  const gr = g.createRadialGradient(x, y, r * 0.2, x, y, r * 2.4);
  gr.addColorStop(0, 'rgba(255,236,150,0.95)');
  gr.addColorStop(0.4, 'rgba(255,220,110,0.5)');
  gr.addColorStop(1, 'rgba(255,220,110,0)');
  g.fillStyle = gr;
  g.beginPath(); g.arc(x, y, r * 2.4, 0, TAU); g.fill();
  g.fillStyle = '#ffe27a';
  g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
}

// ガラスのハイライト(縦長容器)
export function glassShine(g, x, y, w, h) {
  g.fillStyle = 'rgba(255,255,255,0.35)';
  rr(g, x, y, w * 0.14, h * 0.7, w * 0.07);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.18)';
  rr(g, x + w * 0.2, y + h * 0.05, w * 0.05, h * 0.5, w * 0.025);
  g.fill();
}

// 可愛い目 (キャラ共通)
export function eye(g, x, y, r, look = 0) {
  g.fillStyle = '#fff';
  g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  g.fillStyle = '#222';
  g.beginPath(); g.arc(x + look * r * 0.3, y, r * 0.55, 0, TAU); g.fill();
  g.fillStyle = '#fff';
  g.beginPath(); g.arc(x + r * 0.18, y - r * 0.2, r * 0.18, 0, TAU); g.fill();
}

// 星形パス
export function star(g, x, y, r, points = 5) {
  g.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = -Math.PI / 2 + i * Math.PI / points;
    const rad = i % 2 === 0 ? r : r * 0.45;
    g.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  g.closePath();
}
