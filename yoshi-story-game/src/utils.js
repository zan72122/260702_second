// 共通ユーティリティ: 乱数・補間・AABB 判定・Canvas テクスチャ生成
import * as THREE from 'three';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
// フレームレート非依存の指数減衰補間
export const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
export const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// AABB: {x: 中心X, y: 中心Y, hw: 半幅, hh: 半高}
export function aabbOverlap(a, b) {
  return Math.abs(a.x - b.x) < a.hw + b.hw && Math.abs(a.y - b.y) < a.hh + b.hh;
}

// ---------- Canvas テクスチャ ----------

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

export function canvasTexture(c, repeatX = 1, repeatY = 1) {
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 4;
  return tex;
}

// フェルト/紙のような質感 (ベース色 + ノイズ + ステッチ風の縁)
export function feltTexture(base, noiseAmp = 14, size = 128) {
  const [c, g] = makeCanvas(size, size);
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  const img = g.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 2 * noiseAmp;
    d[i] = clamp(d[i] + n, 0, 255);
    d[i + 1] = clamp(d[i + 1] + n, 0, 255);
    d[i + 2] = clamp(d[i + 2] + n, 0, 255);
  }
  g.putImageData(img, 0, 0);
  return c;
}

// 草地: フェルト + ランダムな草の短線
export function grassCanvas(base = '#7ecb4f', blade = '#5cab35', size = 128) {
  const c = feltTexture(base, 10, size);
  const g = c.getContext('2d');
  g.strokeStyle = blade;
  g.lineWidth = 2;
  g.lineCap = 'round';
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * size, y = Math.random() * size;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + rand(-3, 3), y - rand(3, 7));
    g.stroke();
  }
  return c;
}

// 土: フェルト + 小石ドット
export function dirtCanvas(base = '#b97a48', dot = '#9a5f33', size = 128) {
  const c = feltTexture(base, 16, size);
  const g = c.getContext('2d');
  g.fillStyle = dot;
  for (let i = 0; i < 40; i++) {
    g.beginPath();
    g.arc(Math.random() * size, Math.random() * size, rand(1.5, 4), 0, Math.PI * 2);
    g.fill();
  }
  return c;
}

// タマゴの緑スポット
export function eggSpotCanvas() {
  const [c, g] = makeCanvas(128, 128);
  g.fillStyle = '#fffef2';
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#3fae4a';
  const spots = [[24, 30, 15], [78, 18, 12], [110, 60, 14], [46, 78, 16], [90, 104, 13], [10, 108, 11]];
  for (const [x, y, r] of spots) {
    g.beginPath();
    g.ellipse(x, y, r, r * 0.82, 0.4, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}

// ヘイホー風のお面
export function maskCanvas() {
  const [c, g] = makeCanvas(128, 128);
  g.fillStyle = '#f6f3e8';
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#222';
  // 目
  g.beginPath(); g.ellipse(44, 52, 9, 14, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(84, 52, 9, 14, 0, 0, Math.PI * 2); g.fill();
  // 口
  g.beginPath(); g.ellipse(64, 92, 12, 15, 0, 0, Math.PI * 2); g.fill();
  return c;
}

// スマイルフラワーの顔
export function flowerFaceCanvas(size = 128) {
  const [c, g] = makeCanvas(size, size);
  g.fillStyle = '#ffd94d';
  g.fillRect(0, 0, size, size);
  g.fillStyle = '#4a2c12';
  g.beginPath(); g.ellipse(size * .34, size * .40, size * .055, size * .09, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(size * .66, size * .40, size * .055, size * .09, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#4a2c12';
  g.lineWidth = size * .05;
  g.lineCap = 'round';
  g.beginPath(); g.arc(size * .5, size * .58, size * .2, 0.25 * Math.PI, 0.75 * Math.PI); g.stroke();
  // ほっぺ
  g.fillStyle = 'rgba(255,120,120,.55)';
  g.beginPath(); g.arc(size * .2, size * .62, size * .08, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(size * .8, size * .62, size * .08, 0, Math.PI * 2); g.fill();
  return c;
}

// キラキラ用の星形スプライト
export function sparkleCanvas(color = '#fff') {
  const [c, g] = makeCanvas(64, 64);
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, color);
  grad.addColorStop(0.35, color);
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  g.globalCompositeOperation = 'lighter';
  g.strokeStyle = color;
  g.lineWidth = 4;
  g.lineCap = 'round';
  g.beginPath(); g.moveTo(32, 6); g.lineTo(32, 58); g.moveTo(6, 32); g.lineTo(58, 32); g.stroke();
  return c;
}

// トゥーン用 3 段階グラデーションマップ
export function toonGradientMap() {
  const data = new Uint8Array([90, 160, 235, 255]);
  const tex = new THREE.DataTexture(data, 4, 1, THREE.RedFormat);
  tex.needsUpdate = true;
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  return tex;
}
