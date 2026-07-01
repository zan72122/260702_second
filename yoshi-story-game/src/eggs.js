// タマゴ: 後ろをついてくるトレイル・照準・投擲
import * as THREE from 'three';
import { canvasTexture, eggSpotCanvas, clamp } from './utils.js';

let _eggTex = null;
function eggMaterial() {
  _eggTex ??= canvasTexture(eggSpotCanvas());
  return new THREE.MeshStandardMaterial({ map: _eggTex, roughness: 0.5 });
}

export function makeEggMesh(scale = 1) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.3 * scale, 16, 12), eggMaterial());
  m.scale.y = 1.25;
  m.castShadow = true;
  return m;
}

export const MAX_EGGS = 6;

// プレイヤーの移動履歴に沿ってゾロゾロついてくるタマゴたち
export class EggTrail {
  constructor(scene) {
    this.scene = scene;
    this.meshes = [];
    this.history = []; // [{x, y}] 新しい順
  }
  get count() { return this.meshes.length; }

  add() {
    if (this.count >= MAX_EGGS) return false;
    const m = makeEggMesh();
    this.scene.add(m);
    this.meshes.push(m);
    return true;
  }

  // 先頭のタマゴを消費 (投げる)
  take() {
    const m = this.meshes.shift();
    if (!m) return null;
    const pos = m.position.clone();
    this.scene.remove(m);
    return pos;
  }

  record(x, y) {
    const last = this.history[0];
    if (!last || Math.hypot(last.x - x, last.y - y) > 0.09) {
      this.history.unshift({ x, y });
      if (this.history.length > 220) this.history.pop();
    }
  }

  update(dt, time) {
    const GAP = 9; // 履歴サンプル間隔
    this.meshes.forEach((m, i) => {
      const h = this.history[Math.min((i + 1) * GAP, this.history.length - 1)];
      if (!h) return;
      const k = 1 - Math.exp(-12 * dt);
      m.position.x += (h.x - m.position.x) * k;
      m.position.y += (h.y + 0.35 + Math.sin(time * 5 + i) * 0.06 - m.position.y) * k;
      m.rotation.z = Math.sin(time * 4 + i * 1.3) * 0.2;
    });
  }

  clear() {
    for (const m of this.meshes) this.scene.remove(m);
    this.meshes.length = 0;
    this.history.length = 0;
  }
}

// 照準カーソル (本家のように上下に揺れる)
export class Reticle {
  constructor(scene) {
    this.grp = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: '#ff4d6b', transparent: true, opacity: 0.95 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.06, 8, 20), mat);
    this.grp.add(ring);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), mat);
    this.grp.add(dot);
    this.grp.visible = false;
    scene.add(this.grp);
    this.t = 0;
    this.angle = 0;
  }
  show() { this.grp.visible = true; this.t = 0; }
  hide() { this.grp.visible = false; }
  update(dt, px, py, dir) {
    if (!this.grp.visible) return;
    this.t += dt;
    // -10°〜80° を往復
    const deg = 35 + Math.sin(this.t * 3.4) * 45;
    this.angle = (deg * Math.PI) / 180;
    const r = 3.1;
    this.grp.position.set(px + Math.cos(this.angle) * r * dir, py + 0.4 + Math.sin(this.angle) * r, 0);
    this.grp.rotation.z += dt * 4;
    const s = 1 + Math.sin(this.t * 10) * 0.1;
    this.grp.scale.setScalar(s);
  }
}

// 投げたタマゴ
export class EggProjectile {
  constructor(scene, x, y, angle, dir) {
    this.mesh = makeEggMesh(0.95);
    this.mesh.position.set(x, y, 0);
    scene.add(this.mesh);
    const SPEED = 17;
    this.vx = Math.cos(angle) * SPEED * dir;
    this.vy = Math.sin(angle) * SPEED;
    this.bounces = 0;
    this.life = 2.6;
    this.dead = false;
    this.aabb = { x, y, hw: 0.3, hh: 0.34 };
  }

  update(dt, solids, oneWays) {
    if (this.dead) return;
    this.life -= dt;
    this.vy -= 16 * dt;
    const px = this.mesh.position.x + this.vx * dt;
    const py = this.mesh.position.y + this.vy * dt;
    this.mesh.position.set(px, py, 0);
    this.mesh.rotation.z -= this.vx * dt * 2;
    this.aabb.x = px;
    this.aabb.y = py;

    // 地形で跳ねる (2回まで)
    for (const p of solids) {
      if (Math.abs(px - p.x) < p.hw + 0.3 && Math.abs(py - p.y) < p.hh + 0.3) {
        if (this.bounces >= 2) { this.pop(); return; }
        this.bounces++;
        // 上面なら跳ね返り、側面なら反射
        const fromTop = py > p.y + p.hh - 0.4 && this.vy < 0;
        if (fromTop) {
          this.mesh.position.y = p.y + p.hh + 0.32;
          this.vy = Math.abs(this.vy) * 0.6 + 3;
        } else {
          this.vx = -this.vx * 0.8;
          this.mesh.position.x = px + Math.sign(this.vx) * 0.2;
        }
        return;
      }
    }
    if (this.life <= 0 || py < -12) this.pop();
  }

  pop() { this.dead = true; }
}
