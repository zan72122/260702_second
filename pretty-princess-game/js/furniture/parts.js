// 家具づくりの共通パーツ・ヘルパー
import * as THREE from 'three';
import { PALETTES } from '../items/style.js';
import { fabricTexture } from '../world/textures.js';

// ---------- メッシュ生成ヘルパー ----------
export function mesh(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
export const box = (mat, w, h, d, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z);
export const cyl = (mat, rt, rb, h, x, y, z, seg = 20) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat, x, y, z);
export const sph = (mat, r, x, y, z, sx = 1, sy = 1, sz = 1) => {
  const m = mesh(new THREE.SphereGeometry(r, 18, 14), mat, x, y, z);
  m.scale.set(sx, sy, sz);
  return m;
};
export const cone = (mat, r, h, x, y, z, seg = 20) => mesh(new THREE.ConeGeometry(r, h, seg), mat, x, y, z);
export const torus = (mat, r, tube, x, y, z, rx = 0) => {
  const m = mesh(new THREE.TorusGeometry(r, tube, 12, 28), mat, x, y, z);
  m.rotation.x = rx;
  return m;
};
export function lathe(mat, points, x = 0, y = 0, z = 0, seg = 24) {
  const pts = points.map((p) => new THREE.Vector2(p[0], p[1]));
  return mesh(new THREE.LatheGeometry(pts, seg), mat, x, y, z);
}

// ---------- 形状 ----------
export function heartShape(s = 1) {
  const sh = new THREE.Shape();
  sh.moveTo(0, -0.32 * s);
  sh.bezierCurveTo(0.52 * s, 0.12 * s, 0.22 * s, 0.48 * s, 0, 0.18 * s);
  sh.bezierCurveTo(-0.22 * s, 0.48 * s, -0.52 * s, 0.12 * s, 0, -0.32 * s);
  return sh;
}
export function starShape(s = 1) {
  const sh = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const r = i % 2 === 0 ? s : s * 0.45;
    i === 0 ? sh.moveTo(Math.cos(a) * r, Math.sin(a) * r) : sh.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  sh.closePath();
  return sh;
}
export function extrude(mat, shape, depth, x = 0, y = 0, z = 0) {
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: depth * 0.2, bevelThickness: depth * 0.2, bevelSegments: 2 });
  return mesh(geo, mat, x, y, z);
}

// ねこあし(猫脚): 上が太く優雅にくびれた脚
export function catLeg(mat, h = 0.5, r = 0.06) {
  return lathe(mat, [
    [0.001, 0], [r * 0.9, 0], [r * 0.55, h * 0.12], [r * 0.42, h * 0.3],
    [r * 0.5, h * 0.55], [r * 0.75, h * 0.8], [r * 1.15, h * 0.94], [r * 1.05, h],
  ], 0, 0, 0, 14);
}

// 4本のねこあしを座面サイズに合わせて配置
export function catLegs(mat, w, d, h, inset = 0.08) {
  const g = new THREE.Group();
  const hw = w / 2 - inset, hd = d / 2 - inset;
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    g.add(mesh(catLeg(mat, h).geometry, mat, hw * sx, 0, hd * sz));
  }
  return g;
}

// リボンのちょうちょ結び
export function bow(mat, s = 0.12) {
  const g = new THREE.Group();
  const knot = sph(mat, s * 0.35, 0, 0, 0);
  const l = sph(mat, s, -s * 0.95, 0, 0, 1, 0.62, 0.42);
  const r = sph(mat, s, s * 0.95, 0, 0, 1, 0.62, 0.42);
  g.add(knot, l, r);
  return g;
}

// 王冠
export function crown(mat, r = 0.14, h = 0.16) {
  const g = new THREE.Group();
  const base = cyl(mat, r, r * 0.92, h * 0.55, 0, h * 0.27, 0, 16);
  g.add(base);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    g.add(cone(mat, r * 0.22, h * 0.7, Math.cos(a) * r * 0.8, h * 0.8, Math.sin(a) * r * 0.8, 8));
  }
  g.add(sph(mat, r * 0.12, 0, h * 1.1, 0));
  return g;
}

// フリル(スカラップ)つきの円盤 — テーブルクロスやランプシェードの縁に
export function frillDisc(mat, r = 0.5, frills = 10, depth = 0.06) {
  const g = new THREE.Group();
  g.add(cyl(mat, r, r, 0.02, 0, 0, 0, 28));
  for (let i = 0; i < frills; i++) {
    const a = (i / frills) * Math.PI * 2;
    g.add(sph(mat, r * 0.16, Math.cos(a) * r, -depth / 2, Math.sin(a) * r, 1, depth / (r * 0.16), 1));
  }
  return g;
}

// ---------- マテリアル ----------
const matCache = new Map();

export function makeMats(paletteId, patternId = 'plain') {
  const key = `${paletteId}:${patternId}`;
  if (matCache.has(key)) return matCache.get(key);
  const pal = PALETTES[paletteId];
  const gold = pal.trim === '#e8b84b';
  const mats = {
    pal,
    palId: paletteId,
    patId: patternId,
    main: new THREE.MeshStandardMaterial({ color: pal.main, roughness: 0.62 }),
    sub: new THREE.MeshStandardMaterial({ color: pal.sub, roughness: 0.75 }),
    accent: new THREE.MeshStandardMaterial({ color: pal.accent, roughness: 0.55 }),
    trim: new THREE.MeshStandardMaterial({ color: pal.trim, metalness: gold ? 0.8 : 0.15, roughness: gold ? 0.3 : 0.5 }),
    gold: new THREE.MeshStandardMaterial({ color: '#e8b84b', metalness: 0.8, roughness: 0.3 }),
    white: new THREE.MeshStandardMaterial({ color: '#fdfaf7', roughness: 0.6 }),
    cloth: new THREE.MeshStandardMaterial({ map: fabricTexture(paletteId, patternId, 2), roughness: 0.88 }),
    clothBig: new THREE.MeshStandardMaterial({ map: fabricTexture(paletteId, patternId, 4), roughness: 0.88 }),
    glass: new THREE.MeshStandardMaterial({ color: '#d8eef8', transparent: true, opacity: 0.4, roughness: 0.08, metalness: 0.1 }),
    lampLit: new THREE.MeshStandardMaterial({ color: '#fff4d8', emissive: '#ffd98a', emissiveIntensity: 0.85 }),
    candle: new THREE.MeshStandardMaterial({ color: '#fff8ec', roughness: 0.6 }),
    flame: new THREE.MeshStandardMaterial({ color: '#ffe9a8', emissive: '#ffb040', emissiveIntensity: 2.2 }),
    green: new THREE.MeshStandardMaterial({ color: '#7fbf6a', roughness: 0.8 }),
    greenDark: new THREE.MeshStandardMaterial({ color: '#4e8a42', roughness: 0.8 }),
    soil: new THREE.MeshStandardMaterial({ color: '#6a4a34', roughness: 0.95 }),
    cream: new THREE.MeshStandardMaterial({ color: '#fff6e8', roughness: 0.7 }),
    choco: new THREE.MeshStandardMaterial({ color: '#7a4a30', roughness: 0.65 }),
    water: new THREE.MeshStandardMaterial({ color: '#9fd8f0', transparent: true, opacity: 0.7, roughness: 0.15 }),
    silver: new THREE.MeshStandardMaterial({ color: '#d8dce5', metalness: 0.85, roughness: 0.25 }),
  };
  matCache.set(key, mats);
  return mats;
}
