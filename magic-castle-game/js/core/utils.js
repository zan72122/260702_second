// 共通ユーティリティ
import * as THREE from 'three';

export const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (t) => t * t * (3 - 2 * t);
export const TAU = Math.PI * 2;

export function lerpColor(out, a, b, t) {
  out.copy(a).lerp(b, t);
  return out;
}

// 角度を -PI..PI に正規化して最短方向で補間
export function lerpAngle(a, b, t) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return a + d * t;
}

export function dist2D(ax, az, bx, bz) {
  const dx = ax - bx, dz = az - bz;
  return Math.sqrt(dx * dx + dz * dz);
}

// ---- キャンバステクスチャ工房 ----
export function makeCanvas(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// 石畳テクスチャ
export function cobbleTexture(base = '#cfb8e8', line = '#a98fd0') {
  const tex = makeCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const ox = (y % 2) * 16;
        const px = x * 32 + ox, py = y * 32;
        const g = ctx.createRadialGradient(px + 16, py + 16, 4, px + 16, py + 16, 22);
        const shade = 235 + Math.floor(Math.random() * 20 - 10);
        g.addColorStop(0, `rgba(255,255,255,.28)`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.roundRect(px + 2, py + 2, 28, 28, 9); ctx.fill();
        ctx.strokeStyle = line; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.roundRect(px + 2, py + 2, 28, 28, 9); ctx.stroke();
        void shade;
      }
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// 芝生テクスチャ
export function grassTexture(base = '#7ecb6a', dot = '#95dd7f') {
  const tex = makeCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = Math.random() < 0.5 ? dot : '#6cb95a';
      const x = Math.random() * w, y = Math.random() * h;
      ctx.fillRect(x, y, 2, 4);
    }
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = ['#ffe27a', '#ffb1d8', '#ffffff'][i % 3];
      ctx.beginPath(); ctx.arc(Math.random() * w, Math.random() * h, 2.2, 0, TAU); ctx.fill();
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// 石壁テクスチャ
export function brickTexture(base = '#f3ecfd', line = '#d5c6ee') {
  const tex = makeCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = line; ctx.lineWidth = 3;
    for (let y = 0; y < 8; y++) {
      ctx.beginPath(); ctx.moveTo(0, y * 32); ctx.lineTo(w, y * 32); ctx.stroke();
      const off = (y % 2) * 32;
      for (let x = 0; x < 5; x++) {
        ctx.beginPath(); ctx.moveTo(off + x * 64, y * 32); ctx.lineTo(off + x * 64, y * 32 + 32); ctx.stroke();
      }
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// 屋根テクスチャ
export function roofTexture(base = '#7b5cd6', line = '#5d41b0') {
  const tex = makeCanvas(128, 128, (ctx, w, h) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = line;
    for (let y = 0; y < 8; y++) {
      const off = (y % 2) * 8;
      for (let x = -1; x < 9; x++) {
        ctx.beginPath();
        ctx.arc(off + x * 16 + 8, y * 16 + 16, 8, Math.PI, 0);
        ctx.lineTo(off + x * 16 + 16, y * 16 + 8);
        ctx.fill();
      }
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// ソフト円グラデ(スプライト用)
export function glowTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  return makeCanvas(64, 64, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
    g.addColorStop(0, inner);
    g.addColorStop(1, outer);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

// 星形テクスチャ
export function starTexture(color = '#fff6c8') {
  return makeCanvas(64, 64, (ctx, w, h) => {
    ctx.translate(w / 2, h / 2);
    ctx.fillStyle = color;
    ctx.shadowColor = color; ctx.shadowBlur = 12;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 26 : 11;
      const a = (i / 10) * TAU - Math.PI / 2;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill();
  });
}

// ハート形テクスチャ
export function heartTexture(color = '#ff7eb6') {
  return makeCanvas(64, 64, (ctx) => {
    ctx.translate(32, 30);
    ctx.fillStyle = color;
    ctx.shadowColor = color; ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.bezierCurveTo(-26, -12, -10, -26, 0, -10);
    ctx.bezierCurveTo(10, -26, 26, -12, 0, 10);
    ctx.fill();
  });
}

// シンプル素材ヘルパー
export function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.02, ...opts });
}
export function glowMat(color, intensity = 1.2) {
  return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.4 });
}

// メッシュに影設定を一括適用
export function shadow(obj, cast = true, receive = false) {
  obj.traverse((o) => {
    if (o.isMesh) { o.castShadow = cast; o.receiveShadow = receive; }
  });
  return obj;
}
