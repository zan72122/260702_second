// ステージ構築: 地形・空・雲・丘・木・花・ばね床・動く床・ゴール
import * as THREE from 'three';
import {
  rand, pick, lerp, canvasTexture, grassCanvas, dirtCanvas,
  flowerFaceCanvas, feltTexture, toonGradientMap,
} from './utils.js';

// ---------- ステージ定義 ----------

function ground(x0, x1, top = 0) {
  return { x: x0 + (x1 - x0) / 2, y: top - 5, hw: (x1 - x0) / 2, hh: 5, top, oneWay: false };
}
function float_(x, y, w = 3) {
  return { x, y: y - 0.35, hw: w / 2, hh: 0.35, top: y, oneWay: true };
}
function fruitLine(arr, x0, x1, y, n, type) {
  for (let i = 0; i < n; i++) arr.push({ x: lerp(x0, x1, n === 1 ? 0.5 : i / (n - 1)), y, type });
}
function fruitArc(arr, cx, topY, r, n, type) {
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    arr.push({ x: cx + (t - 0.5) * 2 * r, y: topY - Math.pow((t - 0.5) * 2, 2) * r * 0.8, type });
  }
}

function buildStage1() {
  const platforms = [
    ground(-8, 30), ground(34, 58), ground(63, 86, 0), ground(80, 96, 3),
    ground(100, 126), ground(131, 150, 0), ground(146, 162, 2.5), ground(166, 196),
    ground(200, 232),
    float_(31.8, 2.2), float_(60.3, 2.4), float_(15, 3.4, 4), float_(21, 5.2, 3),
    float_(42, 3.2, 4), float_(50, 5.0, 3), float_(70, 3.4, 4), float_(108, 3.2, 4),
    float_(114, 5.4, 3), float_(120, 3.2, 4), float_(128.5, 2.6), float_(140, 3.4, 4),
    float_(155, 5.6, 3), float_(174, 3.2, 4), float_(182, 5.2, 4), float_(198, 2.6),
  ];
  const fruits = [];
  fruitLine(fruits, 4, 12, 1.2, 5, 'apple');
  fruitLine(fruits, 15, 21, 4.4, 4, 'melon');
  fruitArc(fruits, 32, 4.2, 4, 5, 'banana');
  fruitLine(fruits, 36, 46, 1.2, 5, 'grape');
  fruitLine(fruits, 42, 50, 6.2, 4, 'melon');
  fruitArc(fruits, 60.5, 4.4, 4, 5, 'apple');
  fruitLine(fruits, 65, 75, 1.2, 5, 'banana');
  fruitLine(fruits, 82, 92, 4.2, 5, 'melon');
  fruitArc(fruits, 98, 4, 3.5, 4, 'grape');
  fruitLine(fruits, 104, 122, 1.2, 6, 'apple');
  fruitLine(fruits, 108, 120, 6.6, 4, 'melon');
  fruitLine(fruits, 134, 144, 1.2, 4, 'grape');
  fruitLine(fruits, 150, 158, 3.8, 4, 'banana');
  fruits.push({ x: 155, y: 7.2, type: 'heart' });
  fruitLine(fruits, 170, 186, 1.4, 5, 'melon');
  fruitLine(fruits, 174, 182, 6.6, 3, 'apple');
  fruitLine(fruits, 204, 218, 1.2, 5, 'grape');
  return {
    name: 'ステージ 1', subtitle: 'うきうき草原',
    theme: {
      skyTop: '#3f9bf0', skyBottom: '#bfeaff', fog: '#bfeaff',
      hemiSky: '#cfe8ff', hemiGround: '#9fd08a', sunColor: '#fff3c0', sunIntensity: 2.6,
      hills: ['#8fd97a', '#5fbf6f', '#3f9f68'], grass: '#7ecb4f', blade: '#5cab35',
      dirt: '#b97a48', tree: 'round', night: false, water: false, sunPos: [-40, 55, -120],
    },
    platforms,
    fruits,
    movers: [
      { x: 96.5, y: 1.8, w: 3.2, dx: 0, dy: 2.6, speed: 1.1, phase: 0 },
      { x: 163.5, y: 2.2, w: 3.2, dx: 2.4, dy: 0, speed: 1.0, phase: 1.6 },
    ],
    springs: [{ x: 26, y: 0 }, { x: 111, y: 0 }, { x: 152, y: 2.5 }],
    crates: [{ x: 54, y: 0 }, { x: 123.5, y: 0 }, { x: 192, y: 0 }],
    coins: [
      { x: 21, y: 6.4 }, { x: 32, y: 5.8 }, { x: 50, y: 6.2 }, { x: 96.5, y: 5.6 },
      { x: 114, y: 6.6 }, { x: 128.5, y: 4 }, { x: 182, y: 6.4 }, { x: 198, y: 4 },
    ],
    enemies: [
      { type: 'walker', x: 18, y: 0 }, { type: 'walker', x: 44, y: 0 },
      { type: 'plant', x: 78, y: 0 }, { type: 'walker', x: 88, y: 3 },
      { type: 'flyer', x: 98, y: 4.5 }, { type: 'walker', x: 116, y: 0 },
      { type: 'plant', x: 136, y: 0 }, { type: 'walker', x: 143, y: 0 },
      { type: 'flyer', x: 164, y: 4.5 }, { type: 'walker', x: 178, y: 0 },
      { type: 'walker', x: 210, y: 0 },
    ],
    checkpoints: [{ x: 68, y: 0 }, { x: 148, y: 2.5 }],
    hearts: [{ x: 128.5, y: 3.6 }],
    goal: { x: 224, y: 0 },
    length: 232,
  };
}

function buildStage2() {
  const platforms = [
    ground(-8, 22), ground(27, 40), ground(46, 60, 0), ground(66, 84, 0),
    ground(90, 108, 0), ground(114, 134), ground(140, 152, 0), ground(158, 186),
    ground(192, 224),
    float_(24.3, 2.6), float_(43, 2.8), float_(63, 3.0), float_(87, 3.2), float_(111, 2.8),
    float_(12, 3.6, 4), float_(33, 4.4, 3), float_(52, 4.8, 3.6), float_(56, 7.0, 2.6),
    float_(74, 4.2, 4), float_(98, 4.6, 4), float_(120, 3.6, 4), float_(126, 5.8, 3),
    float_(137, 2.8), float_(146, 4.4, 3), float_(155, 3.0), float_(168, 3.8, 4),
    float_(176, 6.0, 3), float_(189, 2.8),
  ];
  const fruits = [];
  fruitLine(fruits, 2, 10, 1.2, 4, 'banana');
  fruitLine(fruits, 10, 14, 4.6, 3, 'melon');
  fruitArc(fruits, 24.5, 4.6, 3.5, 4, 'grape');
  fruitLine(fruits, 29, 37, 1.2, 4, 'apple');
  fruitArc(fruits, 43, 4.8, 3.5, 4, 'banana');
  fruitLine(fruits, 48, 58, 1.2, 4, 'melon');
  fruitLine(fruits, 51, 57, 5.8, 3, 'grape');
  fruits.push({ x: 56, y: 8.6, type: 'heart' });
  fruitArc(fruits, 63, 5, 3.5, 4, 'apple');
  fruitLine(fruits, 68, 82, 1.2, 5, 'banana');
  fruitLine(fruits, 71, 77, 5.2, 3, 'melon');
  fruitArc(fruits, 87, 5.2, 3.5, 4, 'grape');
  fruitLine(fruits, 92, 106, 1.2, 5, 'apple');
  fruitArc(fruits, 111, 4.8, 3.5, 4, 'melon');
  fruitLine(fruits, 116, 130, 1.2, 5, 'banana');
  fruitLine(fruits, 118, 128, 6.8, 4, 'grape');
  fruitLine(fruits, 142, 150, 1.2, 4, 'melon');
  fruitLine(fruits, 160, 172, 1.2, 5, 'apple');
  fruitLine(fruits, 166, 178, 7.0, 4, 'melon');
  fruitLine(fruits, 196, 214, 1.2, 6, 'grape');
  return {
    name: 'ステージ 2', subtitle: 'ゆうやけビーチ',
    theme: {
      skyTop: '#7a5bbf', skyBottom: '#ffb26b', fog: '#ffc08a',
      hemiSky: '#ffd7a8', hemiGround: '#c98a5a', sunColor: '#ffb36b', sunIntensity: 2.2,
      hills: ['#e8a86b', '#c97a5a', '#9a5a6a'], grass: '#e8d08a', blade: '#cbb26b',
      dirt: '#c98a58', tree: 'palm', night: false, water: true, hillScale: 0.45, sunPos: [30, 14, -140],
    },
    platforms,
    fruits,
    movers: [
      { x: 63, y: 1.4, w: 3.2, dx: 0, dy: 3.2, speed: 1.2, phase: 0.5 },
      { x: 137, y: 1.2, w: 3.2, dx: 0, dy: 3.4, speed: 1.15, phase: 2.2 },
      { x: 189, y: 1.4, w: 3.2, dx: 2.2, dy: 1.6, speed: 1.0, phase: 0 },
    ],
    springs: [{ x: 18, y: 0 }, { x: 94, y: 0 }, { x: 163, y: 0 }],
    crates: [{ x: 38, y: 0 }, { x: 104, y: 0 }, { x: 182, y: 0 }],
    coins: [
      { x: 12, y: 6.2 }, { x: 24.3, y: 4.4 }, { x: 56, y: 9.6 }, { x: 74, y: 6.6 },
      { x: 87, y: 5 }, { x: 111, y: 4.6 }, { x: 126, y: 8 }, { x: 176, y: 8.4 }, { x: 189, y: 4.6 },
    ],
    enemies: [
      { type: 'walker', x: 14, y: 0 }, { type: 'flyer', x: 24, y: 4.8 },
      { type: 'walker', x: 33, y: 0 }, { type: 'plant', x: 50, y: 0 },
      { type: 'flyer', x: 63, y: 5.4 }, { type: 'walker', x: 76, y: 0 },
      { type: 'plant', x: 95, y: 0 }, { type: 'flyer', x: 111, y: 5 },
      { type: 'walker', x: 122, y: 0 }, { type: 'walker', x: 146, y: 0 },
      { type: 'plant', x: 170, y: 0 }, { type: 'walker', x: 200, y: 0 },
      { type: 'flyer', x: 189, y: 5.4 },
    ],
    checkpoints: [{ x: 70, y: 0 }, { x: 144, y: 0 }],
    hearts: [{ x: 98, y: 5.6 }],
    goal: { x: 216, y: 0 },
    length: 224,
  };
}

function buildStage3() {
  const platforms = [
    ground(-8, 20), ground(26, 42), ground(48, 62, 0), ground(70, 88, 2),
    ground(94, 112), ground(118, 132, 0), ground(140, 158, 0), ground(164, 188, 2),
    ground(194, 228),
    float_(23, 2.8), float_(45, 3.0), float_(65.5, 3.6), float_(91, 4.0), float_(115, 2.8),
    float_(135.5, 3.0), float_(161, 4.2),
    float_(8, 3.8, 3.6), float_(14, 6.0, 3), float_(30, 4.2, 4), float_(36, 6.4, 3),
    float_(54, 4.6, 3.6), float_(58, 7.0, 2.6), float_(76, 6.2, 4), float_(82, 8.4, 3),
    float_(100, 4.0, 4), float_(106, 6.4, 3), float_(122, 4.4, 3.6), float_(128, 6.8, 3),
    float_(146, 4.4, 4), float_(152, 6.8, 3), float_(170, 6.4, 4), float_(178, 8.6, 3),
    float_(200, 4.0, 4), float_(208, 6.2, 3),
  ];
  const fruits = [];
  fruitLine(fruits, 0, 10, 1.2, 4, 'melon');
  fruitLine(fruits, 8, 16, 7.2, 4, 'grape');
  fruitArc(fruits, 23, 5, 3.5, 4, 'apple');
  fruitLine(fruits, 28, 40, 1.2, 4, 'banana');
  fruitLine(fruits, 30, 38, 7.6, 4, 'melon');
  fruitArc(fruits, 45, 5.2, 3.5, 4, 'grape');
  fruitLine(fruits, 50, 60, 1.2, 4, 'apple');
  fruits.push({ x: 58, y: 8.6, type: 'heart' });
  fruitLine(fruits, 72, 86, 3.2, 5, 'melon');
  fruitLine(fruits, 76, 84, 9.8, 4, 'banana');
  fruitArc(fruits, 91, 6, 3.5, 4, 'grape');
  fruitLine(fruits, 96, 110, 1.2, 5, 'apple');
  fruitLine(fruits, 100, 108, 7.6, 4, 'melon');
  fruitLine(fruits, 120, 130, 1.2, 4, 'banana');
  fruitLine(fruits, 122, 128, 8.0, 3, 'grape');
  fruitLine(fruits, 142, 156, 1.2, 5, 'melon');
  fruitLine(fruits, 146, 152, 8.0, 3, 'apple');
  fruits.push({ x: 178, y: 10.4, type: 'heart' });
  fruitLine(fruits, 166, 186, 3.4, 6, 'grape');
  fruitLine(fruits, 170, 178, 7.8, 3, 'banana');
  fruitLine(fruits, 198, 216, 1.2, 6, 'melon');
  fruitLine(fruits, 200, 210, 7.4, 4, 'apple');
  return {
    name: 'ステージ 3', subtitle: 'きらきらスターナイト',
    theme: {
      skyTop: '#141f52', skyBottom: '#4a5cb0', fog: '#39498f',
      hemiSky: '#7a8ad0', hemiGround: '#3a4a80', sunColor: '#dfe8ff', sunIntensity: 2.0,
      hills: ['#4a5ba0', '#3a4a88', '#2a3868'], grass: '#5b7fc0', blade: '#4a6aa8',
      dirt: '#4a5488', tree: 'star', night: true, water: false, sunPos: [50, 60, -130],
    },
    platforms,
    fruits,
    movers: [
      { x: 65.5, y: 1.6, w: 3.2, dx: 0, dy: 3.6, speed: 1.25, phase: 0 },
      { x: 115, y: 1.2, w: 3.2, dx: 2.6, dy: 0, speed: 1.2, phase: 1 },
      { x: 161, y: 1.8, w: 3.2, dx: 0, dy: 3.4, speed: 1.3, phase: 2 },
      { x: 191, y: 2.0, w: 3.2, dx: 2.2, dy: 1.8, speed: 1.1, phase: 0.7 },
    ],
    springs: [{ x: 4, y: 0 }, { x: 72.5, y: 2 }, { x: 143, y: 0 }, { x: 174, y: 2 }],
    crates: [{ x: 40, y: 0 }, { x: 110, y: 0 }, { x: 186, y: 2 }],
    coins: [
      { x: 14, y: 7.2 }, { x: 36, y: 7.6 }, { x: 58, y: 8.2 }, { x: 82, y: 9.6 },
      { x: 106, y: 7.6 }, { x: 128, y: 8 }, { x: 152, y: 8 }, { x: 178, y: 9.8 }, { x: 208, y: 7.4 },
    ],
    enemies: [
      { type: 'walker', x: 12, y: 0 }, { type: 'flyer', x: 23, y: 5.2 },
      { type: 'walker', x: 34, y: 0 }, { type: 'plant', x: 52, y: 0 },
      { type: 'flyer', x: 45, y: 5.6 }, { type: 'walker', x: 80, y: 2 },
      { type: 'flyer', x: 91, y: 6.6 }, { type: 'walker', x: 102, y: 0 },
      { type: 'plant', x: 124, y: 0 }, { type: 'flyer', x: 135.5, y: 5.4 },
      { type: 'walker', x: 150, y: 0 }, { type: 'plant', x: 172, y: 2 },
      { type: 'flyer', x: 161, y: 7 }, { type: 'walker', x: 204, y: 0 },
      { type: 'walker', x: 214, y: 0 },
    ],
    checkpoints: [{ x: 75, y: 2 }, { x: 144, y: 0 }],
    hearts: [{ x: 115, y: 4 }],
    goal: { x: 220, y: 0 },
    length: 228,
  };
}

export const STAGES = [buildStage1(), buildStage2(), buildStage3()];

// ---------- 装飾ジオメトリ ----------

function flowerSpriteCanvas() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.strokeStyle = '#4a9a3a';
  g.lineWidth = 4;
  g.beginPath(); g.moveTo(32, 62); g.lineTo(32, 34); g.stroke();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.ellipse(32 + Math.cos(a) * 10, 24 + Math.sin(a) * 10, 7, 7, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = '#ffd94d';
  g.beginPath(); g.arc(32, 24, 7.5, 0, Math.PI * 2); g.fill();
  return c;
}

export function makeSmileyFlower(size = 1, petalColor = '#ffffff') {
  const grp = new THREE.Group();
  const faceTex = canvasTexture(flowerFaceCanvas());
  const center = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5 * size, 0.5 * size, 0.18 * size, 24),
    [
      new THREE.MeshStandardMaterial({ color: '#e8b83a' }),
      new THREE.MeshStandardMaterial({ map: faceTex, emissive: '#332200', emissiveIntensity: 0.25 }),
      new THREE.MeshStandardMaterial({ color: '#e8b83a' }),
    ]
  );
  center.rotation.x = Math.PI / 2;
  grp.add(center);
  const petalGeo = new THREE.SphereGeometry(0.28 * size, 12, 10);
  petalGeo.scale(1, 1.7, 0.45);
  const petalMat = new THREE.MeshStandardMaterial({ color: petalColor, roughness: 0.85 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const p = new THREE.Mesh(petalGeo, petalMat);
    p.position.set(Math.cos(a) * 0.78 * size, Math.sin(a) * 0.78 * size, 0);
    p.rotation.z = a - Math.PI / 2;
    grp.add(p);
  }
  return grp;
}

// ---------- World ----------

export class World {
  constructor(scene, stageIndex) {
    this.scene = scene;
    this.stage = STAGES[stageIndex];
    this.theme = this.stage.theme;
    this.stageIndex = stageIndex;
    this.killY = -9;
    this.time = 0;
    this.movers = [];
    this.decoAnims = [];

    this._buildLights();
    this._buildSky();
    this._buildTerrain();
    this._buildBackdrop();
    this._buildProps();
    this._buildGoal();
  }

  _buildLights() {
    const t = this.theme;
    this.hemi = new THREE.HemisphereLight(t.hemiSky, t.hemiGround, t.night ? 1.05 : 1.0);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(t.sunColor, t.sunIntensity);
    this.sun.position.set(-8, 14, 10);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const cam = this.sun.shadow.camera;
    cam.left = -18; cam.right = 18; cam.top = 16; cam.bottom = -14;
    cam.near = 1; cam.far = 60;
    this.sun.shadow.bias = -0.002;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);
    this.scene.fog = new THREE.Fog(t.fog, 40, 150);
  }

  _buildSky() {
    const t = this.theme;
    const geo = new THREE.SphereGeometry(420, 24, 16);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        top: { value: new THREE.Color(t.skyTop) },
        bottom: { value: new THREE.Color(t.skyBottom) },
      },
      vertexShader: `
        varying vec3 vPos;
        void main() { vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `
        uniform vec3 top; uniform vec3 bottom; varying vec3 vPos;
        void main() {
          float h = clamp(normalize(vPos).y * 1.6 + 0.25, 0.0, 1.0);
          gl_FragColor = vec4(mix(bottom, top, h), 1.0);
        }`,
    });
    this.skyDome = new THREE.Mesh(geo, mat);
    this.scene.add(this.skyDome);

    // 太陽 / 月 (ブルームで光る)
    const sunMesh = new THREE.Mesh(
      new THREE.SphereGeometry(t.night ? 9 : 13, 24, 18),
      new THREE.MeshBasicMaterial({ color: t.night ? '#e8f0ff' : '#fff6c8', fog: false })
    );
    sunMesh.position.set(...t.sunPos);
    this.skyDome.add(sunMesh);
    if (t.night) {
      // 月のクレーター
      const craterMat = new THREE.MeshBasicMaterial({ color: '#b8c8e8', fog: false });
      for (const [dx, dy, r] of [[-3, 2, 1.6], [2.5, -2, 2.1], [3, 4, 1.2]]) {
        const cr = new THREE.Mesh(new THREE.CircleGeometry(r, 12), craterMat);
        cr.position.set(dx, dy, 8.9);
        sunMesh.add(cr);
      }
      // 星空
      const starGeo = new THREE.BufferGeometry();
      const N = 500;
      const pos = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        const a = rand(Math.PI * 2), b = rand(0.05, Math.PI / 2.1);
        const r = 400;
        pos[i * 3] = Math.cos(a) * Math.cos(b) * r;
        pos[i * 3 + 1] = Math.sin(b) * r;
        pos[i * 3 + 2] = Math.sin(a) * Math.cos(b) * r;
      }
      starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      this.stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
        color: '#ffffff', size: 2.4, sizeAttenuation: false, fog: false,
        transparent: true, opacity: 0.9,
      }));
      this.skyDome.add(this.stars);
    }
  }

  _buildTerrain() {
    const t = this.theme;
    const grassTex = canvasTexture(grassCanvas(t.grass, t.blade), 2, 2);
    const dirtTex = canvasTexture(dirtCanvas(t.dirt), 2, 2);
    const grassMat = new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.95 });
    const dirtMat = new THREE.MeshStandardMaterial({ map: dirtTex, roughness: 1 });
    const DEPTH = 5;

    this.platforms = [];
    for (const p of this.stage.platforms) {
      this.platforms.push(p);
      const w = p.hw * 2, h = p.hh * 2;
      if (p.oneWay) {
        // 浮遊島: 草キャップ + 丸い土台
        const cap = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, 3), grassMat);
        cap.position.set(p.x, p.top - 0.25, 0);
        cap.receiveShadow = true;
        this.scene.add(cap);
        const base = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), dirtMat);
        base.scale.set(w / 2, 0.65, 1.4);
        base.position.set(p.x, p.top - 0.55, 0);
        this.scene.add(base);
      } else {
        const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, DEPTH), dirtMat);
        body.position.set(p.x, p.y, 0);
        body.receiveShadow = true;
        this.scene.add(body);
        const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.28, 0.6, DEPTH + 0.35), grassMat);
        cap.position.set(p.x, p.top - 0.3, 0);
        cap.receiveShadow = true;
        this.scene.add(cap);
      }
    }

    // 動く床
    const moverMat = new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.9, color: '#eaffea' });
    for (const m of this.stage.movers) {
      const mesh = new THREE.Group();
      const cap = new THREE.Mesh(new THREE.BoxGeometry(m.w, 0.5, 3), moverMat);
      cap.receiveShadow = true;
      cap.castShadow = true;
      mesh.add(cap);
      const base = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), dirtMat);
      base.scale.set(m.w / 2, 0.6, 1.4);
      base.position.y = -0.35;
      mesh.add(base);
      // ガイドの点線 (移動範囲を示す・床とは独立してシーンに置く)
      const guideMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35 });
      const L = Math.hypot(m.dx, m.dy) * 2 || 1;
      const dots = Math.round(L * 2.5);
      for (let i = 0; i <= dots; i++) {
        const s = i / dots - 0.5;
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 6), guideMat);
        dot.position.set(m.x + s * 2 * m.dx, m.y + s * 2 * m.dy, -1.8);
        this.scene.add(dot);
      }
      this.scene.add(mesh);
      this.movers.push({
        def: m, mesh,
        aabb: { x: m.x, y: m.y - 0.25, hw: m.w / 2, hh: 0.25, top: m.y, oneWay: true },
        prevX: m.x, prevY: m.y, dxFrame: 0, dyFrame: 0,
      });
    }
  }

  // 飛び出す絵本のような多層の丘
  _buildBackdrop() {
    const t = this.theme;
    const len = this.stage.length + 120;
    const hillScale = t.hillScale ?? 1;
    t.hills.forEach((color, layer) => {
      const shape = new THREE.Shape();
      shape.moveTo(-60, -30);
      const baseH = (5 + layer * 7) * hillScale;
      const step = 9 + layer * 5;
      for (let x = -60; x < len; x += step) {
        const h = baseH + (Math.sin(x * 0.37 + layer * 12.3) * (2.5 + layer * 2) + Math.sin(x * 0.11 + layer * 5) * 2) * hillScale;
        shape.lineTo(x, Math.max(1.5, h));
      }
      shape.lineTo(len, -30);
      shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, { depth: 2, bevelEnabled: false });
      const mat = new THREE.MeshLambertMaterial({ color });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(0, -6 - layer * 1.5, -9 - layer * 9);
      this.scene.add(mesh);
    });

    // 雲 (ふわふわ移動)
    this.clouds = [];
    const cloudMat = new THREE.MeshLambertMaterial({
      color: t.night ? '#8a9ac8' : '#ffffff', transparent: true, opacity: t.night ? 0.6 : 0.95,
      fog: false,
    });
    const nClouds = t.night ? 7 : 14;
    for (let i = 0; i < nClouds; i++) {
      const cl = new THREE.Group();
      const parts = 3 + Math.floor(rand(3));
      for (let j = 0; j < parts; j++) {
        const s = rand(0.8, 1.6);
        const b = new THREE.Mesh(new THREE.SphereGeometry(s, 10, 8), cloudMat);
        b.position.set(j * rand(0.9, 1.4) - parts * 0.55, rand(-0.25, 0.35), rand(-0.3, 0.3));
        b.scale.y = 0.62;
        cl.add(b);
      }
      cl.position.set(rand(-30, this.stage.length + 30), rand(8, 20), rand(-45, -18));
      cl.userData.speed = rand(0.3, 0.9);
      this.scene.add(cl);
      this.clouds.push(cl);
    }

    // 海 (ビーチステージ)
    if (t.water) {
      const waterMat = new THREE.MeshStandardMaterial({
        color: '#3a8ac8', transparent: true, opacity: 0.85, roughness: 0.25, metalness: 0.1,
      });
      this.water = new THREE.Mesh(new THREE.PlaneGeometry(len + 200, 260, 48, 8), waterMat);
      this.water.rotation.x = -Math.PI / 2;
      this.water.position.set(len / 2 - 60, -6.8, -60);
      this.scene.add(this.water);
      this._waterGeo = this.water.geometry;
      this._waterBase = Float32Array.from(this._waterGeo.attributes.position.array);
    }
  }

  _buildProps() {
    const t = this.theme;
    const toonMap = toonGradientMap();

    // 木
    const grounds = this.stage.platforms.filter((p) => !p.oneWay);
    const trunkMat = new THREE.MeshToonMaterial({ color: '#8a5a30', gradientMap: toonMap });
    for (const g of grounds) {
      const n = Math.floor(g.hw / 7);
      for (let i = 0; i < n; i++) {
        const x = g.x + rand(-g.hw + 2, g.hw - 2);
        const z = rand(-1.9, -1.1);
        const tree = this._makeTree(t.tree, trunkMat, toonMap);
        tree.position.set(x, g.top, z);
        tree.rotation.y = rand(Math.PI * 2);
        this.scene.add(tree);
      }
    }

    // 花と草 (InstancedMesh)
    const flowerTex = canvasTexture(flowerSpriteCanvas());
    const flowerMat = new THREE.MeshBasicMaterial({
      map: flowerTex, transparent: true, alphaTest: 0.15, side: THREE.DoubleSide,
    });
    const flowerGeo = new THREE.PlaneGeometry(0.62, 0.62);
    const spots = [];
    for (const g of grounds) {
      const n = Math.floor(g.hw * 1.2);
      for (let i = 0; i < n; i++) {
        spots.push([g.x + rand(-g.hw + 0.4, g.hw - 0.4), g.top + 0.3, rand(-2.1, 2.1)]);
      }
    }
    const inst = new THREE.InstancedMesh(flowerGeo, flowerMat, spots.length);
    const M = new THREE.Matrix4();
    spots.forEach(([x, y, z], i) => {
      M.makeRotationY(rand(-0.5, 0.5));
      M.setPosition(x, y, z);
      inst.setMatrixAt(i, M);
    });
    this.scene.add(inst);
  }

  _makeTree(kind, trunkMat, toonMap) {
    const grp = new THREE.Group();
    if (kind === 'palm') {
      const seg = 5;
      for (let i = 0; i < seg; i++) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.32 - i * 0.03, 8, 6), trunkMat);
        s.position.set(Math.sin(i * 0.28) * 0.7, 0.5 + i * 0.62, 0);
        grp.add(s);
      }
      const leafMat = new THREE.MeshToonMaterial({ color: '#4aa848', gradientMap: toonMap });
      const topX = Math.sin((seg - 1) * 0.28) * 0.7, topY = 0.5 + (seg - 1) * 0.62;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), leafMat);
        leaf.scale.set(1.8, 0.28, 0.55);
        leaf.position.set(topX + Math.cos(a) * 0.85, topY + 0.35, Math.sin(a) * 0.85);
        leaf.rotation.z = -Math.cos(a) * 0.5;
        leaf.rotation.y = -a;
        grp.add(leaf);
      }
    } else if (kind === 'star') {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 2.2, 8), trunkMat);
      trunk.position.y = 1.1;
      grp.add(trunk);
      const colors = ['#ffd94d', '#8ad7ff', '#ff9ad7'];
      const starMat = new THREE.MeshStandardMaterial({
        color: pick(colors), emissive: pick(colors), emissiveIntensity: 0.85,
      });
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.55), starMat);
      star.position.y = 2.7;
      grp.add(star);
      this.decoAnims.push((time) => { star.rotation.y = time * 1.2; });
    } else {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 1.6, 8), trunkMat);
      trunk.position.y = 0.8;
      trunk.castShadow = true;
      grp.add(trunk);
      const leafMat = new THREE.MeshToonMaterial({
        color: pick(['#5fbf5f', '#6fcf6f', '#4faf5f']), gradientMap: toonMap,
      });
      for (const [dx, dy, r] of [[0, 2.3, 1.1], [-0.8, 1.8, 0.75], [0.85, 1.9, 0.7]]) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 9), leafMat);
        s.position.set(dx, dy, 0);
        s.castShadow = true;
        grp.add(s);
      }
    }
    return grp;
  }

  _buildGoal() {
    const g = this.stage.goal;
    this.goalGroup = new THREE.Group();
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.22, 3.2, 10),
      new THREE.MeshStandardMaterial({ color: '#4a9a3a' })
    );
    stem.position.y = 1.6;
    this.goalGroup.add(stem);
    this.goalFlower = makeSmileyFlower(1.35);
    this.goalFlower.position.y = 4.2;
    this.goalGroup.add(this.goalFlower);
    this.goalGroup.position.set(g.x, g.y, 0);
    this.scene.add(this.goalGroup);
    this.goalAABB = { x: g.x, y: g.y + 3, hw: 1.6, hh: 3 };
  }

  update(dt, playerX) {
    this.time += dt;

    // 太陽光がプレイヤーを追従 (影の範囲を節約)
    this.sun.position.set(playerX - 8, 16, 12);
    this.sun.target.position.set(playerX, 0, 0);
    this.skyDome.position.x = playerX;

    // 動く床
    for (const m of this.movers) {
      const d = m.def;
      const s = Math.sin(this.time * d.speed + d.phase);
      const nx = d.x + s * d.dx;
      const ny = d.y + s * d.dy;
      m.dxFrame = nx - m.prevX;
      m.dyFrame = ny - m.prevY;
      m.prevX = nx; m.prevY = ny;
      m.mesh.position.set(nx, ny, 0);
      m.aabb.x = nx;
      m.aabb.y = ny - 0.25;
      m.aabb.top = ny;
    }

    // 雲
    for (const cl of this.clouds) {
      cl.position.x += cl.userData.speed * dt;
      if (cl.position.x > this.stage.length + 40) cl.position.x = -40;
    }

    // 海の波
    if (this.water) {
      const pos = this._waterGeo.attributes.position;
      const base = this._waterBase;
      for (let i = 0; i < pos.count; i++) {
        const x = base[i * 3], y = base[i * 3 + 1];
        pos.setZ(i, Math.sin(x * 0.12 + this.time * 1.4) * 0.35 + Math.cos(y * 0.2 + this.time) * 0.25);
      }
      pos.needsUpdate = true;
    }

    // ゴールの花: くるくる + ぼよん
    this.goalFlower.rotation.z = Math.sin(this.time * 1.8) * 0.18;
    this.goalFlower.position.y = 4.2 + Math.sin(this.time * 2.2) * 0.18;
    const sc = 1 + Math.sin(this.time * 4.4) * 0.04;
    this.goalFlower.scale.setScalar(sc);

    for (const fn of this.decoAnims) fn(this.time);
  }
}
