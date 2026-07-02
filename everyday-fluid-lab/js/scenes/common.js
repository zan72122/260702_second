// シーン共通ヘルパー
import { clamp, TAU } from '../engine/utils.js';
import { rr } from '../engine/art.js';

// 一定レートで注ぐ (音も連動)
export class Pourer {
  constructor(rate = 55, speed = 55) {
    this.rate = rate; this.speed = speed;
    this.acc = 0;
    this.intensity = 0;
  }
  update(ctx, dt, on, x, y, dirX = 0, dirY = 1, spread = 2) {
    this.intensity += ((on ? 1 : 0) - this.intensity) * Math.min(1, dt * 8);
    ctx.sfx.setPour(on ? this.intensity * 0.8 : 0);
    if (!on) { this.acc = 0; return 0; }
    this.acc += this.rate * dt;
    let n = 0;
    while (this.acc >= 1) {
      this.acc -= 1;
      ctx.pour(x + (Math.random() - 0.5) * spread, y, dirX * this.speed, dirY * this.speed, this.phase ?? 0);
      n++;
    }
    return n;
  }
}

// x 位置での液面の高さを探す (上から走査)
export function surfaceY(sim, x, yFrom, yTo, step = 2) {
  for (let y = yFrom; y < yTo; y += step) {
    if (sim.densityAt(x, y) > 0.55) return y;
  }
  return yTo;
}

// ある相の粒子が縦方向にどれだけ均一に分布しているか (0..1)
export function verticalUniformity(sim, phase, bands = 5) {
  let minY = 1e9, maxY = -1e9, total = 0;
  for (let i = 0; i < sim.n; i++) {
    minY = Math.min(minY, sim.y[i]); maxY = Math.max(maxY, sim.y[i]);
  }
  if (maxY - minY < 8) return 0;
  const cnt = new Array(bands).fill(0), all = new Array(bands).fill(0);
  for (let i = 0; i < sim.n; i++) {
    const b = clamp(((sim.y[i] - minY) / (maxY - minY) * bands) | 0, 0, bands - 1);
    all[b]++;
    if (sim.phase[i] === phase) { cnt[b]++; total++; }
  }
  if (total < 30) return 0;
  // 各バンドの相比率のばらつき
  const ratios = [];
  for (let b = 0; b < bands; b++) if (all[b] > 10) ratios.push(cnt[b] / all[b]);
  if (ratios.length < 3) return 0;
  const mean = ratios.reduce((a, c) => a + c, 0) / ratios.length;
  let va = 0;
  for (const r of ratios) va += (r - mean) ** 2;
  va = Math.sqrt(va / ratios.length) / Math.max(0.05, mean);
  return clamp(1 - va, 0, 1);
}

// 色の均一度 (まぜまぜ用)
export function colorUniformity(sim) {
  const n = sim.n;
  if (n < 40) return 0;
  let mr = 0, mg = 0, mb = 0;
  for (let i = 0; i < n; i++) { mr += sim.cr[i]; mg += sim.cg[i]; mb += sim.cb[i]; }
  mr /= n; mg /= n; mb /= n;
  let v = 0;
  for (let i = 0; i < n; i++) {
    v += (sim.cr[i] - mr) ** 2 + (sim.cg[i] - mg) ** 2 + (sim.cb[i] - mb) ** 2;
  }
  v = Math.sqrt(v / n);
  return { uni: clamp(1 - v * 6, 0, 1), avg: [mr, mg, mb] };
}

// 汚れ・シミを溜めるオフスクリーンレイヤー (world 座標)
export class StainMap {
  constructor(w, h, scale = 3) {
    this.w = w; this.h = h; this.scale = scale;
    this.canvas = document.createElement('canvas');
    this.canvas.width = Math.ceil(w * scale);
    this.canvas.height = Math.ceil(h * scale);
    this.g = this.canvas.getContext('2d');
    this.g.scale(scale, scale);
    this.count = 0;
  }
  stamp(x, y, r, color) {
    const g = this.g;
    g.fillStyle = color;
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.fill();
    this.count++;
  }
  erase(x, y, r) {
    const g = this.g;
    g.save();
    g.globalCompositeOperation = 'destination-out';
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    g.restore();
  }
  drawTo(g, x = 0, y = 0) {
    g.drawImage(this.canvas, x, y, this.w, this.h);
  }
}

// 汎用ピッチャー(ミルクポット等)を描く。angle: 傾き(注いでいる感)
export function drawPitcher(g, x, y, angle, bodyColor = '#fff', liquid = '#fdfdf4') {
  g.save();
  g.translate(x, y);
  g.rotate(angle);
  // 本体
  g.fillStyle = bodyColor;
  g.strokeStyle = 'rgba(0,0,0,0.15)';
  g.lineWidth = 0.5;
  g.beginPath();
  g.moveTo(-7, -9);
  g.lineTo(-9.5, -12);   // 注ぎ口
  g.lineTo(-5.5, -12.5);
  g.lineTo(6, -10);
  g.lineTo(7.5, 4);
  g.quadraticCurveTo(7, 8, 3, 8);
  g.lineTo(-4, 8);
  g.quadraticCurveTo(-8, 8, -8, 4);
  g.closePath();
  g.fill(); g.stroke();
  // 取っ手
  g.strokeStyle = bodyColor;
  g.lineWidth = 1.8;
  g.beginPath();
  g.arc(8, -2, 4.5, -Math.PI * 0.45, Math.PI * 0.45);
  g.stroke();
  // 中の液体(口もと)
  g.fillStyle = liquid;
  g.beginPath();
  g.moveTo(-9, -12);
  g.lineTo(-5.8, -12.3);
  g.lineTo(-6.5, -10.8);
  g.closePath();
  g.fill();
  g.restore();
}

// 汎用シロップボトル
export function drawSyrupBottle(g, x, y, angle, color, cap = '#e8e8e8') {
  g.save();
  g.translate(x, y);
  g.rotate(angle);
  // ノズル
  g.fillStyle = cap;
  rr(g, -1.3, 6, 2.6, 5, 1);
  g.fill();
  // ボトル (逆さ持ち)
  g.fillStyle = color;
  g.strokeStyle = 'rgba(0,0,0,0.18)';
  g.lineWidth = 0.5;
  rr(g, -5, -14, 10, 20, 4);
  g.fill(); g.stroke();
  // ラベル
  g.fillStyle = 'rgba(255,255,255,0.85)';
  rr(g, -3.6, -10, 7.2, 8, 1.5);
  g.fill();
  // つや
  g.fillStyle = 'rgba(255,255,255,0.4)';
  rr(g, -4.2, -13, 1.6, 14, 0.8);
  g.fill();
  g.restore();
}
