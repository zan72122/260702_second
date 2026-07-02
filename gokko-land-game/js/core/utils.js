// 汎用ヘルパー
import * as THREE from 'three';

export const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
export const easeOut = (t) => 1 - Math.pow(1 - t, 3);
export const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// マテリアルは色ごとにキャッシュして使い回す
const matCache = new Map();
export function mat(color, opts = {}) {
  const key = `${color}|${opts.rough ?? 0.85}|${opts.metal ?? 0}|${opts.emissive ?? 0}|${opts.flat ?? 0}`;
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshStandardMaterial({
      color,
      roughness: opts.rough ?? 0.85,
      metalness: opts.metal ?? 0,
      emissive: opts.emissive ? new THREE.Color(color).multiplyScalar(opts.emissive) : 0x000000,
      flatShading: !!opts.flat,
    }));
  }
  return matCache.get(key);
}

export function box(w, h, d, color, opts) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, opts));
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
export function cyl(rt, rb, h, color, seg = 20, opts) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(color, opts));
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
export function sphere(r, color, seg = 18, opts) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(8, seg * 0.7)), mat(color, opts));
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
export function cone(r, h, color, seg = 18, opts) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat(color, opts));
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
export function torus(r, t, color, opts) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(r, t, 12, 28), mat(color, opts));
  m.castShadow = true;
  return m;
}

// 缶バッジ風の看板テクスチャ(絵文字+テキストをCanvasで描く)
export function makeSignTexture(emoji, text, bg = '#ffffff', fg = '#7a4a00') {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.beginPath();
  // roundRect は iOS15 以前に無いので手描き
  const x = 4, y = 4, w = 248, h = 120, r = 26;
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
  g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.12)';
  g.lineWidth = 6;
  g.stroke();
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = '56px sans-serif';
  g.fillText(emoji, 52, 66);
  g.fillStyle = fg;
  // 長い店名は自動で縮める
  let size = 34;
  do {
    g.font = `900 ${size}px "Hiragino Maru Gothic ProN", sans-serif`;
    size -= 2;
  } while (g.measureText(text).width > 156 && size > 16);
  g.fillText(text, 162, 66);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function makeSign(emoji, text, bg, fg, w = 2.4) {
  const tex = makeSignTexture(emoji, text, bg, fg);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, w * 0.5),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true })
  );
  return m;
}

// 絵文字スプライト(注文アイコンなどを空中に出す)
export function makeEmojiSprite(emoji, size = 1) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '96px sans-serif';
  g.fillText(emoji, 64, 72);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.scale.setScalar(size);
  return sp;
}

// フキダシ付き絵文字(注文表示用)
export function makeBubbleSprite(emoji, size = 1.6) {
  const c = document.createElement('canvas');
  c.width = 160; c.height = 160;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.arc(80, 68, 58, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.moveTo(64, 118); g.lineTo(80, 152); g.lineTo(96, 118);
  g.fill();
  g.strokeStyle = '#ffb84d';
  g.lineWidth = 7;
  g.beginPath();
  g.arc(80, 68, 58, 0, Math.PI * 2);
  g.stroke();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '64px sans-serif';
  g.fillText(emoji, 80, 72);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.scale.setScalar(size);
  return sp;
}

// シーン破棄(ジオメトリ/テクスチャの後始末。共有マテリアルは残す)
export function disposeScene(root) {
  const cached = new Set(matCache.values());
  root.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (m.map) m.map.dispose();
        if (!cached.has(m)) m.dispose();
      }
    }
  });
}
