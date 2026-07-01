// キラキラ・ハート・花びらのパーティクル
import * as THREE from 'three';
import { rand } from '../core/utils.js';

function makeSpriteTexture(kind) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  if (kind === 'glow') {
    const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,240,250,.8)');
    g.addColorStop(1, 'rgba(255,220,245,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  } else if (kind === 'star') {
    ctx.translate(32, 32);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#fff0b8';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const r = i % 2 === 0 ? 26 : 7;
      i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
  } else if (kind === 'heart') {
    ctx.translate(32, 30);
    ctx.fillStyle = '#ff8fc0';
    ctx.shadowColor = '#ffc0dd';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(0, 18);
    ctx.bezierCurveTo(-30, -8, -13, -28, 0, -10);
    ctx.bezierCurveTo(13, -28, 30, -8, 0, 18);
    ctx.fill();
  } else if (kind === 'petal') {
    ctx.translate(32, 32);
    ctx.fillStyle = '#ffc9de';
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 20, 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const TEXTURES = {};
function tex(kind) {
  if (!TEXTURES[kind]) TEXTURES[kind] = makeSpriteTexture(kind);
  return TEXTURES[kind];
}

// ---------- ずっとただよう環境キラキラ ----------
export class AmbientSparkles {
  constructor(scene, bounds, count = 60) {
    this.bounds = bounds;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    this.speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = rand(bounds.minX, bounds.maxX);
      pos[i * 3 + 1] = rand(0.2, 4.6);
      pos[i * 3 + 2] = rand(bounds.minZ, bounds.maxZ);
      this.speeds[i] = rand(0.08, 0.3);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.mat = new THREE.PointsMaterial({
      map: tex('glow'), size: 0.14, transparent: true, opacity: 0.8,
      blending: THREE.AdditiveBlending, depthWrite: false, color: '#fff0fa',
    });
    this.points = new THREE.Points(geo, this.mat);
    this.t = 0;
    scene.add(this.points);
  }
  update(dt) {
    this.t += dt;
    const pos = this.points.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i) + this.speeds[i] * dt;
      if (y > 4.8) y = 0.2;
      pos.setY(i, y);
      pos.setX(i, pos.getX(i) + Math.sin(this.t * 0.8 + i) * dt * 0.06);
    }
    pos.needsUpdate = true;
    this.mat.opacity = 0.55 + Math.sin(this.t * 2.2) * 0.25;
  }
  setVisible(v) { this.points.visible = v; }
  dispose(scene) {
    scene.remove(this.points);
    this.points.geometry.dispose();
  }
}

// ---------- 一発もののバースト ----------
class Burst {
  constructor(scene, pos, opts) {
    const { kind = 'star', count = 24, color = '#fff6d8', speed = 2.2, up = 2.2, size = 0.22, life = 1.1, gravity = -3 } = opts;
    this.life = life;
    this.age = 0;
    this.gravity = gravity;
    const geo = new THREE.BufferGeometry();
    const p = new Float32Array(count * 3);
    this.vel = [];
    for (let i = 0; i < count; i++) {
      p[i * 3] = pos.x; p[i * 3 + 1] = pos.y; p[i * 3 + 2] = pos.z;
      const a = rand(Math.PI * 2), b = rand(-0.4, 1);
      this.vel.push(new THREE.Vector3(Math.cos(a) * speed * rand(0.3, 1), up * rand(0.4, 1) * (b > 0 ? 1 : 0.4), Math.sin(a) * speed * rand(0.3, 1)));
    }
    geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    this.mat = new THREE.PointsMaterial({
      map: tex(kind), size, transparent: true, opacity: 1,
      blending: kind === 'glow' || kind === 'star' ? THREE.AdditiveBlending : THREE.NormalBlending,
      depthWrite: false, color,
    });
    this.points = new THREE.Points(geo, this.mat);
    this.scene = scene;
    scene.add(this.points);
  }
  update(dt) {
    this.age += dt;
    const pos = this.points.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const v = this.vel[i];
      v.y += this.gravity * dt;
      pos.setXYZ(i, pos.getX(i) + v.x * dt, Math.max(0.02, pos.getY(i) + v.y * dt), pos.getZ(i) + v.z * dt);
    }
    pos.needsUpdate = true;
    this.mat.opacity = Math.max(0, 1 - this.age / this.life);
    if (this.age >= this.life) {
      this.scene.remove(this.points);
      this.points.geometry.dispose();
      this.mat.dispose();
      return false;
    }
    return true;
  }
}

export class ParticleManager {
  constructor(scene) {
    this.scene = scene;
    this.bursts = [];
  }
  burst(pos, opts = {}) {
    this.bursts.push(new Burst(this.scene, pos, opts));
  }
  placeEffect(pos) {
    this.burst(pos, { kind: 'star', count: 22, color: '#fff2b8', speed: 1.6, up: 2.4, size: 0.2 });
    this.burst(pos, { kind: 'glow', count: 14, color: '#ffd0ec', speed: 1.1, up: 1.6, size: 0.3, life: 0.8 });
  }
  heartEffect(pos) {
    this.burst(pos, { kind: 'heart', count: 10, color: '#ffffff', speed: 0.8, up: 2.0, size: 0.3, life: 1.3, gravity: -0.8 });
  }
  ceremonyEffect(center, w, d) {
    for (let i = 0; i < 7; i++) {
      setTimeout(() => {
        const p = new THREE.Vector3(center.x + rand(-w / 2, w / 2), rand(0.5, 3.5), center.z + rand(-d / 2, d / 2));
        this.burst(p, { kind: 'star', count: 30, color: '#fff6c8', speed: 2.4, up: 3, size: 0.26, life: 1.5 });
        this.burst(p, { kind: 'heart', count: 12, speed: 1.4, up: 2.4, size: 0.32, life: 1.6, gravity: -0.9 });
        this.burst(p, { kind: 'petal', count: 16, color: '#ffdaea', speed: 1.8, up: 2.0, size: 0.26, life: 1.8, gravity: -0.6 });
      }, i * 260);
    }
  }
  update(dt) {
    this.bursts = this.bursts.filter((b) => b.update(dt));
  }
}
