// パーティクル演出(紙ふぶき・キラキラ・ハート・水しぶき・けむり)
import * as THREE from 'three';
import { rand, pick, makeEmojiSprite } from '../core/utils.js';

const CONFETTI_COLORS = [0xff5f9e, 0xffd93b, 0x66e07a, 0x66c2ff, 0xb388ff, 0xff9a3b];

export class FX {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
  }

  _add(obj, data) {
    obj.userData.fx = data;
    this.scene.add(obj);
    this.items.push(obj);
  }

  // 紙ふぶき(大成功時)
  confetti(pos, count = 40, spread = 4) {
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(0.16, 0.24),
        new THREE.MeshBasicMaterial({ color: pick(CONFETTI_COLORS), side: THREE.DoubleSide })
      );
      m.position.copy(pos);
      this._add(m, {
        vel: new THREE.Vector3(rand(-spread, spread), rand(3, 8), rand(-spread, spread)),
        rot: new THREE.Vector3(rand(-6, 6), rand(-6, 6), rand(-6, 6)),
        life: rand(1.4, 2.4),
        t: 0,
        gravity: 6,
        flutter: true,
      });
    }
  }

  // キラキラ
  sparkle(pos, count = 10, color = 0xffe36e) {
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(
        new THREE.OctahedronGeometry(rand(0.06, 0.14)),
        new THREE.MeshBasicMaterial({ color })
      );
      m.position.copy(pos).add(new THREE.Vector3(rand(-0.4, 0.4), rand(-0.2, 0.4), rand(-0.4, 0.4)));
      this._add(m, {
        vel: new THREE.Vector3(rand(-1.2, 1.2), rand(1, 3), rand(-1.2, 1.2)),
        rot: new THREE.Vector3(rand(-8, 8), rand(-8, 8), 0),
        life: rand(0.5, 0.9),
        t: 0,
        gravity: 1.5,
        shrink: true,
      });
    }
  }

  // ハート・音符などの絵文字
  emoji(pos, emoji = '💖', count = 5, size = 0.7) {
    for (let i = 0; i < count; i++) {
      const sp = makeEmojiSprite(emoji, size * rand(0.8, 1.3));
      sp.position.copy(pos).add(new THREE.Vector3(rand(-0.6, 0.6), rand(0, 0.4), rand(-0.6, 0.6)));
      this._add(sp, {
        vel: new THREE.Vector3(rand(-0.6, 0.6), rand(1.4, 2.6), rand(-0.6, 0.6)),
        life: rand(0.9, 1.5),
        t: 0,
        gravity: -0.6, // ふわっと上昇
        shrink: false,
        fade: true,
      });
    }
  }

  // 水しぶき
  splash(pos, count = 8) {
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(rand(0.05, 0.12), 6, 5),
        new THREE.MeshBasicMaterial({ color: 0x9fdcff, transparent: true, opacity: 0.85 })
      );
      m.position.copy(pos);
      this._add(m, {
        vel: new THREE.Vector3(rand(-2, 2), rand(1, 3.5), rand(-2, 2)),
        life: rand(0.4, 0.7),
        t: 0,
        gravity: 8,
        shrink: true,
      });
    }
  }

  // けむり(消火・オーブン)
  smoke(pos, count = 6, color = 0xdddddd) {
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(rand(0.15, 0.3), 8, 6),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.65 })
      );
      m.position.copy(pos).add(new THREE.Vector3(rand(-0.3, 0.3), 0, rand(-0.3, 0.3)));
      this._add(m, {
        vel: new THREE.Vector3(rand(-0.4, 0.4), rand(1, 2), rand(-0.4, 0.4)),
        life: rand(0.7, 1.3),
        t: 0,
        gravity: -0.4,
        grow: true,
        fade: true,
      });
    }
  }

  // ポップリング(タップ位置の輪)
  ring(pos, color = 0xffffff) {
    const m = new THREE.Mesh(
      new THREE.TorusGeometry(0.3, 0.05, 8, 24),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 })
    );
    m.position.copy(pos);
    m.rotation.x = -Math.PI / 2;
    this._add(m, { vel: new THREE.Vector3(), life: 0.5, t: 0, gravity: 0, grow: true, fade: true });
  }

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const o = this.items[i];
      const d = o.userData.fx;
      d.t += dt;
      if (d.t >= d.life) {
        this.scene.remove(o);
        if (o.geometry) o.geometry.dispose();
        if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); }
        this.items.splice(i, 1);
        continue;
      }
      d.vel.y -= (d.gravity || 0) * dt;
      o.position.addScaledVector(d.vel, dt);
      if (d.rot) {
        o.rotation.x += d.rot.x * dt;
        o.rotation.y += d.rot.y * dt;
        o.rotation.z += d.rot.z * dt;
      }
      if (d.flutter) o.rotation.y += Math.sin(d.t * 10) * dt * 4;
      const k = 1 - d.t / d.life;
      if (d.shrink) o.scale.setScalar(Math.max(0.001, k));
      if (d.grow) o.scale.setScalar(1 + d.t * 3);
      if (d.fade && o.material) o.material.opacity = k;
    }
  }

  clear() {
    for (const o of this.items) {
      this.scene.remove(o);
      if (o.geometry) o.geometry.dispose();
      if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); }
    }
    this.items.length = 0;
  }
}
