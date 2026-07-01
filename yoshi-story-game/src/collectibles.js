// フルーツ・コイン・ハート・クレート・ばね床・チェックポイント
import * as THREE from 'three';
import { rand, pick, canvasTexture, feltTexture, toonGradientMap } from './utils.js';
import { makeSmileyFlower } from './world.js';

export const FRUIT_INFO = {
  apple:  { emoji: '🍎', color: '#ff5b4d', score: 100 },
  melon:  { emoji: '🍉', color: '#5bd75b', score: 150 }, // メロンはヨッシーの大好物
  grape:  { emoji: '🍇', color: '#b06be0', score: 100 },
  banana: { emoji: '🍌', color: '#ffd94d', score: 100 },
  heart:  { emoji: '💖', color: '#ff8fc8', score: 300 }, // スーパーハッピー!
};

let _toonMap = null;
function toonMap() { return (_toonMap ??= toonGradientMap()); }

function melonCanvas() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#5bc84f';
  g.fillRect(0, 0, 128, 128);
  g.strokeStyle = '#2e7a2e';
  g.lineWidth = 7;
  for (let i = 0; i < 6; i++) {
    const x = i * 22 + 6;
    g.beginPath();
    g.moveTo(x, 0);
    for (let y = 0; y <= 128; y += 8) g.lineTo(x + Math.sin(y * 0.2 + i) * 4, y);
    g.stroke();
  }
  return c;
}

let _melonTex = null;

// ---------- フルーツ ----------
export function makeFruitMesh(type) {
  const grp = new THREE.Group();
  const gm = toonMap();
  switch (type) {
    case 'apple': {
      const body = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 18, 14),
        new THREE.MeshToonMaterial({ color: '#ff4d3d', gradientMap: gm })
      );
      body.scale.y = 0.92;
      grp.add(body);
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.05, 0.24, 6),
        new THREE.MeshStandardMaterial({ color: '#7a4a20' })
      );
      stem.position.y = 0.44;
      grp.add(stem);
      const leaf = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 8, 6),
        new THREE.MeshToonMaterial({ color: '#5bbf4a', gradientMap: gm })
      );
      leaf.scale.set(1.6, 0.5, 0.7);
      leaf.position.set(0.14, 0.48, 0);
      leaf.rotation.z = -0.5;
      grp.add(leaf);
      break;
    }
    case 'melon': {
      _melonTex ??= canvasTexture(melonCanvas());
      const body = new THREE.Mesh(
        new THREE.SphereGeometry(0.46, 20, 16),
        new THREE.MeshStandardMaterial({ map: _melonTex, roughness: 0.6 })
      );
      body.scale.set(1, 0.86, 1);
      grp.add(body);
      break;
    }
    case 'grape': {
      const mat = new THREE.MeshToonMaterial({ color: '#a05bd7', gradientMap: gm });
      const g1 = new THREE.SphereGeometry(0.15, 10, 8);
      const offs = [
        [0, 0.18], [-0.15, 0.02], [0.15, 0.02], [0, -0.05],
        [-0.08, -0.2], [0.08, -0.2], [0, -0.33],
      ];
      for (const [dx, dy] of offs) {
        for (const dz of [-0.08, 0.09]) {
          const b = new THREE.Mesh(g1, mat);
          b.position.set(dx, dy, dz);
          grp.add(b);
        }
      }
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 0.2, 6),
        new THREE.MeshStandardMaterial({ color: '#7a4a20' })
      );
      stem.position.y = 0.4;
      grp.add(stem);
      break;
    }
    case 'banana': {
      const body = new THREE.Mesh(
        new THREE.TorusGeometry(0.3, 0.12, 10, 16, Math.PI * 1.05),
        new THREE.MeshToonMaterial({ color: '#ffd94d', gradientMap: gm })
      );
      body.rotation.z = Math.PI * 0.97;
      grp.add(body);
      const tip = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 8, 6),
        new THREE.MeshStandardMaterial({ color: '#8a6a2a' })
      );
      tip.position.set(0.3, 0.05, 0);
      grp.add(tip);
      break;
    }
    case 'heart': {
      const shape = new THREE.Shape();
      shape.moveTo(0, -0.32);
      shape.bezierCurveTo(-0.5, 0.05, -0.28, 0.42, 0, 0.18);
      shape.bezierCurveTo(0.28, 0.42, 0.5, 0.05, 0, -0.32);
      const geo = new THREE.ExtrudeGeometry(shape, {
        depth: 0.16, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2,
      });
      geo.center();
      const body = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
        color: '#ff7ab8', emissive: '#ff4a9a', emissiveIntensity: 0.9, roughness: 0.4,
      }));
      grp.add(body);
      break;
    }
  }
  return grp;
}

export class Fruit {
  constructor(scene, x, y, type) {
    this.type = type;
    this.mesh = makeFruitMesh(type);
    this.mesh.position.set(x, y, 0);
    this.mesh.castShadow = true;
    scene.add(this.mesh);
    this.baseY = y;
    this.phase = rand(Math.PI * 2);
    this.aabb = { x, y, hw: 0.45, hh: 0.45 };
    this.dead = false;
  }
  update(dt, time) {
    const y = this.baseY + Math.sin(time * 2.4 + this.phase) * 0.16;
    this.mesh.position.y = y;
    this.mesh.rotation.y = time * 1.4 + this.phase;
    this.aabb.y = y;
  }
  collect(scene) {
    this.dead = true;
    scene.remove(this.mesh);
  }
}

// ---------- コイン ----------
export class Coin {
  constructor(scene, x, y) {
    this.mesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.3, 0.11, 10, 20),
      new THREE.MeshStandardMaterial({
        color: '#ffd700', emissive: '#c89a00', emissiveIntensity: 0.55, metalness: 0.7, roughness: 0.3,
      })
    );
    this.mesh.position.set(x, y, 0);
    scene.add(this.mesh);
    this.baseY = y;
    this.phase = rand(Math.PI * 2);
    this.aabb = { x, y, hw: 0.38, hh: 0.38 };
    this.dead = false;
  }
  update(dt, time) {
    this.mesh.rotation.y = time * 3.4 + this.phase;
    const y = this.baseY + Math.sin(time * 2 + this.phase) * 0.1;
    this.mesh.position.y = y;
    this.aabb.y = y;
  }
  collect(scene) { this.dead = true; scene.remove(this.mesh); }
}

// ---------- 回復ハート (花びらが戻る) ----------
export class HeartPickup {
  constructor(scene, x, y) {
    this.mesh = makeFruitMesh('heart');
    this.mesh.scale.setScalar(0.8);
    this.mesh.children[0].material = new THREE.MeshStandardMaterial({
      color: '#ff4d4d', emissive: '#c82a2a', emissiveIntensity: 0.7, roughness: 0.4,
    });
    this.mesh.position.set(x, y, 0);
    scene.add(this.mesh);
    this.baseY = y;
    this.phase = rand(Math.PI * 2);
    this.aabb = { x, y, hw: 0.4, hh: 0.4 };
    this.dead = false;
  }
  update(dt, time) {
    const y = this.baseY + Math.sin(time * 2.2 + this.phase) * 0.14;
    this.mesh.position.y = y;
    this.mesh.rotation.y = time * 2;
    this.aabb.y = y;
  }
  collect(scene) { this.dead = true; scene.remove(this.mesh); }
}

// ---------- クレート (こわすとフルーツが飛び出す) ----------
function woodCanvas() {
  const c = feltTexture('#c8965a', 12);
  const g = c.getContext('2d');
  g.strokeStyle = '#8a5a2a';
  g.lineWidth = 5;
  g.strokeRect(4, 4, 120, 120);
  g.beginPath(); g.moveTo(4, 4); g.lineTo(124, 124); g.moveTo(124, 4); g.lineTo(4, 124); g.stroke();
  return c;
}
let _woodTex = null;

export class Crate {
  constructor(scene, x, groundY) {
    _woodTex ??= canvasTexture(woodCanvas());
    const S = 1.15;
    this.mesh = new THREE.Mesh(
      new THREE.BoxGeometry(S, S, S),
      new THREE.MeshStandardMaterial({ map: _woodTex, roughness: 0.9 })
    );
    this.mesh.position.set(x, groundY + S / 2, 0);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    scene.add(this.mesh);
    this.aabb = { x, y: groundY + S / 2, hw: S / 2, hh: S / 2, top: groundY + S, oneWay: false };
    this.dead = false;
  }
  break_(scene) { this.dead = true; scene.remove(this.mesh); }
}

// ---------- ばね床 ----------
function dotsCanvas() {
  const c = feltTexture('#ff5b5b', 10);
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  for (const [x, y] of [[30, 34], [86, 26], [58, 70], [24, 96], [96, 88]]) {
    g.beginPath(); g.arc(x, y, 11, 0, Math.PI * 2); g.fill();
  }
  return c;
}
let _dotsTex = null;

export class Spring {
  constructor(scene, x, groundY) {
    _dotsTex ??= canvasTexture(dotsCanvas());
    this.grp = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.5, 0.3, 14),
      new THREE.MeshStandardMaterial({ color: '#e8e0d0' })
    );
    base.position.y = 0.15;
    this.grp.add(base);
    this.cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ map: _dotsTex, roughness: 0.7 })
    );
    this.cap.position.y = 0.3;
    this.cap.scale.y = 1.15;
    this.cap.castShadow = true;
    this.grp.add(this.cap);
    this.grp.position.set(x, groundY, 0);
    scene.add(this.grp);
    this.aabb = { x, y: groundY + 0.45, hw: 0.55, hh: 0.45 };
    this.squash = 0;
  }
  trigger() { this.squash = 1; }
  update(dt) {
    this.squash = Math.max(0, this.squash - dt * 4);
    const s = this.squash > 0.6 ? 1 - (this.squash - 0.6) * 1.5 : 1 + this.squash * 0.35;
    this.cap.scale.set(2 - s, s * 1.15, 2 - s);
  }
}

// ---------- チェックポイント (スマイルフラワー) ----------
export class Checkpoint {
  constructor(scene, x, groundY) {
    this.grp = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.12, 2.4, 8),
      new THREE.MeshStandardMaterial({ color: '#4a9a3a' })
    );
    pole.position.y = 1.2;
    this.grp.add(pole);
    this.flower = makeSmileyFlower(0.6, '#c8c8c8');
    this.flower.position.y = 2.8;
    this.grp.add(this.flower);
    this.grp.position.set(x, groundY, 0);
    scene.add(this.grp);
    this.aabb = { x, y: groundY + 1.5, hw: 0.8, hh: 1.5 };
    this.x = x;
    this.y = groundY;
    this.activated = false;
    this.spin = 0;
  }
  activate() {
    if (this.activated) return false;
    this.activated = true;
    this.spin = Math.PI * 4;
    // 花びらをピンクに
    this.flower.traverse((o) => {
      if (o.isMesh && o.material.color && o.material.color.getHexString() === 'c8c8c8') {
        o.material = o.material.clone();
        o.material.color.set('#ff9ac8');
      }
    });
    return true;
  }
  update(dt, time) {
    if (this.spin > 0) {
      const d = Math.min(this.spin, dt * 10);
      this.flower.rotation.y += d;
      this.spin -= d;
    } else {
      this.flower.rotation.y = 0;
    }
    this.flower.position.y = 2.8 + Math.sin(time * 2) * 0.08;
  }
}
