// Canvas で描くプロシージャルテクスチャ(壁紙・布地・ゆか・そら)
import * as THREE from 'three';
import { PALETTES } from '../items/style.js';
import { shadeColor } from '../core/utils.js';

const cache = new Map();

function makeCanvas(size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return [c, c.getContext('2d')];
}

function toTexture(canvas, repeatX = 1, repeatY = 1) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 4;
  return tex;
}

// ---------- 柄の描画パーツ ----------
function drawRose(ctx, x, y, r, color, leafColor) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = leafColor;
  for (const a of [0.8, 2.4, 4.2]) {
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * r * 1.15, Math.sin(a) * r * 1.15, r * 0.55, r * 0.28, a, 0, Math.PI * 2);
    ctx.fill();
  }
  // うずまきのバラ
  ctx.strokeStyle = color;
  ctx.lineWidth = r * 0.42;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let t = 0; t < Math.PI * 4.6; t += 0.15) {
    const rr = r * 0.16 + (t / (Math.PI * 4.6)) * r * 0.82;
    const px = Math.cos(t) * rr, py = Math.sin(t) * rr;
    t === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();
}

function drawHeart(ctx, x, y, s, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s / 100, s / 100);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 32);
  ctx.bezierCurveTo(-52, -12, -22, -48, 0, -18);
  ctx.bezierCurveTo(22, -48, 52, -12, 0, 32);
  ctx.fill();
  ctx.restore();
}

function drawStar(ctx, x, y, r, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    i === 0 ? ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawLaceRow(ctx, y, size, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  const n = 8, w = size / n;
  ctx.beginPath();
  for (let i = 0; i < n; i++) ctx.arc(i * w + w / 2, y, w / 2 - 2, Math.PI, 0);
  ctx.stroke();
  ctx.fillStyle = color;
  for (let i = 0; i <= n; i++) {
    ctx.beginPath();
    ctx.arc(i * w, y - 2, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

// パターンを一枚のキャンバスに敷き詰める
function paintPattern(ctx, size, pattern, pal, opts = {}) {
  const bg = opts.bg ?? pal.sub;
  const fg = opts.fg ?? pal.main;
  const accent = opts.accent ?? pal.accent;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);
  const g = size / 4;
  switch (pattern) {
    case 'plain': {
      // うっすら布目
      ctx.globalAlpha = 0.05;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1;
      for (let i = 0; i < size; i += 5) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'rose':
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        const off = (j % 2) * g * 0.5;
        drawRose(ctx, ((i * g + off + g / 2) % size), j * g + g / 2, g * 0.24, fg, opts.leaf ?? '#9ecf9a');
      }
      break;
    case 'heart':
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        const off = (j % 2) * g * 0.5;
        drawHeart(ctx, ((i * g + off + g / 2) % size), j * g + g / 2, g * 0.4, (i + j) % 2 ? fg : accent);
      }
      break;
    case 'stripe':
      ctx.fillStyle = fg;
      for (let i = 0; i < 4; i++) ctx.fillRect(i * g, 0, g * 0.5, size);
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.5;
      for (let i = 0; i < 4; i++) ctx.fillRect(i * g + g * 0.7, 0, g * 0.08, size);
      ctx.globalAlpha = 1;
      break;
    case 'dot':
      ctx.fillStyle = fg;
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        const off = (j % 2) * g * 0.5;
        ctx.beginPath();
        ctx.arc((i * g + off + g / 2) % size, j * g + g / 2, g * 0.16, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'star':
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        const off = (j % 2) * g * 0.5;
        drawStar(ctx, (i * g + off + g / 2) % size, j * g + g / 2, g * 0.2, (i + j) % 2 ? fg : opts.trim ?? pal.trim);
      }
      break;
    case 'lace':
      for (let j = 0; j < 4; j++) drawLaceRow(ctx, j * g + g * 0.6, size, fg);
      break;
    case 'check': {
      ctx.fillStyle = fg;
      ctx.globalAlpha = 0.55;
      for (let i = 0; i < 4; i++) ctx.fillRect(i * g, 0, g * 0.5, size);
      for (let j = 0; j < 4; j++) ctx.fillRect(0, j * g, size, g * 0.5);
      ctx.globalAlpha = 1;
      break;
    }
  }
}

// ---------- 公開API ----------

// 布地(家具のクッション・カーテンなど)
export function fabricTexture(paletteId, patternId, repeat = 1) {
  const key = `fab:${paletteId}:${patternId}:${repeat}`;
  if (cache.has(key)) return cache.get(key);
  const pal = PALETTES[paletteId];
  const [c, ctx] = makeCanvas(256);
  paintPattern(ctx, 256, patternId, pal);
  const tex = toTexture(c, repeat, repeat);
  cache.set(key, tex);
  return tex;
}

// 壁紙: 参考画像風 = パステル縦ストライプ + 柄
export function wallpaperTexture(paletteId, patternId) {
  const key = `wall:${paletteId}:${patternId}`;
  if (cache.has(key)) return cache.get(key);
  const pal = PALETTES[paletteId];
  const size = 256;
  const [c, ctx] = makeCanvas(size);
  // 下地: サブカラーのごく淡い縦ストライプ
  ctx.fillStyle = shadeColor(pal.sub, 0.5);
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = pal.sub;
  for (let i = 0; i < 8; i++) ctx.fillRect(i * 32, 0, 16, size);
  // その上に柄
  if (patternId !== 'plain') {
    ctx.globalAlpha = 0.9;
    const g = size / 2;
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      const x = i * g + g / 2 + (j % 2) * g * 0.5, y = j * g + g / 2;
      if (patternId === 'rose') drawRose(ctx, x % size, y, 26, pal.main, '#9ecf9a');
      else if (patternId === 'heart') drawHeart(ctx, x % size, y, 44, pal.main);
      else if (patternId === 'star') drawStar(ctx, x % size, y, 22, pal.main);
      else if (patternId === 'dot') { ctx.fillStyle = pal.main; ctx.beginPath(); ctx.arc(x % size, y, 14, 0, Math.PI * 2); ctx.fill(); }
    }
    if (patternId === 'stripe') {
      ctx.fillStyle = pal.main;
      for (let i = 0; i < 4; i++) ctx.fillRect(i * 64 + 8, 0, 20, size);
    }
    if (patternId === 'lace') for (let j = 0; j < 4; j++) drawLaceRow(ctx, j * 64 + 40, size, pal.main);
    if (patternId === 'check') {
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = pal.main;
      for (let i = 0; i < 4; i++) ctx.fillRect(i * 64, 0, 32, size);
      for (let j = 0; j < 4; j++) ctx.fillRect(0, j * 64, size, 32);
    }
    ctx.globalAlpha = 1;
  }
  const tex = toTexture(c, 2.2, 1.2);
  cache.set(key, tex);
  return tex;
}

// ゆか材
export function floorTexture(type, paletteId) {
  const key = `floor:${type}:${paletteId}`;
  if (cache.has(key)) return cache.get(key);
  const pal = PALETTES[paletteId];
  const size = 256;
  const [c, ctx] = makeCanvas(size);
  if (type === 'wood') {
    ctx.fillStyle = pal.main;
    ctx.fillRect(0, 0, size, size);
    for (let j = 0; j < 8; j++) {
      ctx.fillStyle = j % 2 ? shadeColor(pal.main, -0.08) : shadeColor(pal.main, 0.06);
      ctx.fillRect(0, j * 32, size, 30);
      ctx.strokeStyle = shadeColor(pal.main, -0.25);
      ctx.lineWidth = 2;
      ctx.strokeRect((j % 3) * 90 - 10, j * 32, 110, 30);
      // 木目
      ctx.globalAlpha = 0.15;
      ctx.strokeStyle = shadeColor(pal.accent, -0.2);
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.moveTo(0, j * 32 + 6 + k * 8);
        ctx.bezierCurveTo(80, j * 32 + k * 8, 170, j * 32 + 14 + k * 8, 256, j * 32 + 8 + k * 8);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  } else if (type === 'tile') {
    ctx.fillStyle = pal.sub;
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      ctx.fillStyle = (i + j) % 2 ? pal.main : pal.sub;
      ctx.fillRect(i * 64 + 2, j * 64 + 2, 60, 60);
    }
    // ダイヤのアクセント
    ctx.fillStyle = pal.trim;
    for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) {
      ctx.save(); ctx.translate(i * 64, j * 64); ctx.rotate(Math.PI / 4);
      ctx.fillRect(-5, -5, 10, 10); ctx.restore();
    }
  } else if (type === 'carpet') {
    paintPattern(ctx, size, 'plain', pal, { bg: pal.main });
    ctx.globalAlpha = 0.12;
    for (let i = 0; i < 800; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#ffffff' : pal.accent;
      ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
    }
    ctx.globalAlpha = 1;
  } else if (type === 'checker') {
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
      ctx.fillStyle = (i + j) % 2 ? pal.main : '#fdfaf7';
      ctx.fillRect(i * 32, j * 32, 32, 32);
    }
  } else if (type === 'heartTile') {
    ctx.fillStyle = pal.sub;
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      drawHeart(ctx, i * 64 + 32 + (j % 2) * 32, j * 64 + 32, 30, (i + j) % 2 ? pal.main : '#ffffff');
    }
  }
  const tex = toTexture(c, 3, 3);
  cache.set(key, tex);
  return tex;
}

// 窓の外のそら(昼/夕/夜)
export function skyTexture(time = 'day') {
  const key = `sky:${time}`;
  if (cache.has(key)) return cache.get(key);
  const [c, ctx] = makeCanvas(256);
  const grads = {
    day: ['#8fd4f5', '#c9ecfa', '#e8f8ff'],
    evening: ['#f5a86a', '#f8c9a0', '#ffe8d0'],
    night: ['#1a2050', '#33407a', '#5a6ab0'],
  };
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  const cols = grads[time] ?? grads.day;
  g.addColorStop(0, cols[0]); g.addColorStop(0.6, cols[1]); g.addColorStop(1, cols[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  if (time === 'night') {
    ctx.fillStyle = '#fff8d0';
    for (let i = 0; i < 40; i++) {
      const r = Math.random() * 1.6 + 0.4;
      ctx.beginPath(); ctx.arc(Math.random() * 256, Math.random() * 200, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.beginPath(); ctx.arc(190, 50, 22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = cols[0];
    ctx.beginPath(); ctx.arc(182, 44, 19, 0, Math.PI * 2); ctx.fill();
  } else {
    // ふわふわ雲
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    for (let i = 0; i < 5; i++) {
      const x = Math.random() * 256, y = 40 + Math.random() * 120, r = 14 + Math.random() * 16;
      for (let k = 0; k < 4; k++) {
        ctx.beginPath(); ctx.arc(x + k * r * 0.7, y + (k % 2) * r * 0.3, r - k * 2, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  const tex = toTexture(c);
  cache.set(key, tex);
  return tex;
}

// 絵画の中身(プリンセス調のランダム風景)
export function paintingTexture(seedIdx = 0, paletteId = 'pink') {
  const key = `paint:${seedIdx}:${paletteId}`;
  if (cache.has(key)) return cache.get(key);
  const pal = PALETTES[paletteId];
  const [c, ctx] = makeCanvas(256);
  const variants = seedIdx % 3;
  if (variants === 0) {
    // 空と丘と傘の風景(参考画像の額絵風)
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#7fc4e8'); g.addColorStop(0.65, '#cfeaf8');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 180);
    ctx.fillStyle = '#8fca75'; ctx.beginPath();
    ctx.ellipse(128, 250, 190, 90, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(40 + i * 80, 46 + (i % 2) * 20, 18, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = pal.main; ctx.beginPath(); ctx.arc(150, 130, 30, Math.PI, 0); ctx.fill(); // 傘
    ctx.strokeStyle = pal.accent; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(150, 130); ctx.lineTo(150, 190); ctx.stroke();
  } else if (variants === 1) {
    // お城のシルエット
    ctx.fillStyle = pal.sub; ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = pal.main;
    ctx.fillRect(78, 110, 100, 120);
    for (const x of [60, 160]) { ctx.fillRect(x, 90, 36, 140); ctx.beginPath(); ctx.moveTo(x - 6, 92); ctx.lineTo(x + 18, 40); ctx.lineTo(x + 42, 92); ctx.fill(); }
    ctx.beginPath(); ctx.moveTo(96, 112); ctx.lineTo(128, 60); ctx.lineTo(160, 112); ctx.fill();
    drawStar(ctx, 128, 30, 14, pal.trim);
  } else {
    // バラの花束
    ctx.fillStyle = pal.sub; ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 7; i++) drawRose(ctx, 70 + (i % 3) * 55, 80 + Math.floor(i / 3) * 50, 24, i % 2 ? pal.main : pal.accent, '#88bb77');
  }
  // 額縁ぶんの余白
  ctx.strokeStyle = 'rgba(255,255,255,.5)';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, 246, 246);
  const tex = toTexture(c);
  cache.set(key, tex);
  return tex;
}
