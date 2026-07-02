// キラキラ・水しぶき・花びら・ホタル などのパーティクル
import * as THREE from 'three';
import { rand, TAU } from '../core/utils.js';

const MAX = 900;

function makeSparkTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 1, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.8)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  // 十字のきらめき
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(32, 6); ctx.lineTo(32, 58);
  ctx.moveTo(6, 32); ctx.lineTo(58, 32);
  ctx.stroke();
  return new THREE.CanvasTexture(c);
}

export class Particles {
  constructor(scene) {
    this.positions = new Float32Array(MAX * 3);
    this.colors = new Float32Array(MAX * 3);
    this.sizes = new Float32Array(MAX);
    this.vel = new Float32Array(MAX * 3);
    this.life = new Float32Array(MAX);      // 残り寿命
    this.maxLife = new Float32Array(MAX);
    this.grav = new Float32Array(MAX);      // 重力係数
    this.flutter = new Float32Array(MAX);   // ひらひら係数
    this.baseSize = new Float32Array(MAX);
    this.cursor = 0;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTex: { value: makeSparkTexture() } },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (140.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform sampler2D uTex;
        varying vec3 vColor;
        void main() {
          vec4 t = texture2D(uTex, gl_PointCoord);
          gl_FragColor = vec4(vColor, 1.0) * t;
        }`,
      vertexColors: true,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.tmpColor = new THREE.Color();

    // 全部を遠くへ
    for (let i = 0; i < MAX; i++) this.positions[i * 3 + 1] = -999;
  }

  spawn(x, y, z, opts = {}) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % MAX;
    const {
      color = 0xffe9a0, vx = rand(-1, 1), vy = rand(0.5, 2), vz = rand(-1, 1),
      life = rand(0.6, 1.4), size = rand(0.25, 0.6), grav = 0, flutter = 0,
    } = opts;
    this.positions[i * 3] = x;
    this.positions[i * 3 + 1] = y;
    this.positions[i * 3 + 2] = z;
    this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    this.tmpColor.set(color);
    this.colors[i * 3] = this.tmpColor.r;
    this.colors[i * 3 + 1] = this.tmpColor.g;
    this.colors[i * 3 + 2] = this.tmpColor.b;
    this.life[i] = this.maxLife[i] = life;
    this.baseSize[i] = size;
    this.grav[i] = grav;
    this.flutter[i] = flutter;
  }

  // ---------- プリセット ----------
  burst(pos, color, n = 14, speed = 2.2) {
    for (let i = 0; i < n; i++) {
      const ang = rand(TAU), up = rand(0.4, 1);
      this.spawn(pos.x, pos.y, pos.z, {
        color,
        vx: Math.cos(ang) * speed * rand(0.3, 1),
        vy: up * speed,
        vz: Math.sin(ang) * speed * rand(0.3, 1),
        life: rand(0.5, 1.1), size: rand(0.3, 0.7), grav: 2.2,
      });
    }
  }

  sparkleTrail(pos, color = 0xfff0b0) {
    this.spawn(pos.x + rand(-0.2, 0.2), pos.y + rand(-0.1, 0.2), pos.z + rand(-0.2, 0.2), {
      color, vx: 0, vy: rand(0.2, 0.6), vz: 0, life: rand(0.4, 0.9), size: rand(0.15, 0.35),
    });
  }

  waterDrops(pos, n = 4) {
    for (let i = 0; i < n; i++) {
      const ang = rand(TAU);
      this.spawn(pos.x + Math.cos(ang) * 0.3, pos.y + rand(0.6, 1.2), pos.z + Math.sin(ang) * 0.3, {
        color: 0x9be8ff,
        vx: Math.cos(ang) * rand(0.3, 0.8), vy: rand(-0.4, 0.4), vz: Math.sin(ang) * rand(0.3, 0.8),
        life: rand(0.4, 0.8), size: rand(0.2, 0.4), grav: 4,
      });
    }
  }

  petals(pos, color, n = 8) {
    for (let i = 0; i < n; i++) {
      this.spawn(pos.x + rand(-0.4, 0.4), pos.y + rand(0.3, 1), pos.z + rand(-0.4, 0.4), {
        color,
        vx: rand(-0.7, 0.7), vy: rand(0.3, 1.2), vz: rand(-0.7, 0.7),
        life: rand(1.2, 2.4), size: rand(0.3, 0.55), grav: 0.5, flutter: 3,
      });
    }
  }

  firefly(x, y, z) {
    this.spawn(x, y, z, {
      color: Math.random() < 0.5 ? 0xd0ffa0 : 0xfff0a0,
      vx: rand(-0.3, 0.3), vy: rand(-0.1, 0.3), vz: rand(-0.3, 0.3),
      life: rand(1.5, 3), size: rand(0.2, 0.4), flutter: 1.5,
    });
  }

  fountainSpray(pos) {
    const ang = rand(TAU);
    this.spawn(pos.x, pos.y, pos.z, {
      color: 0xaef4ff,
      vx: Math.cos(ang) * rand(0.4, 1.4), vy: rand(2.5, 4), vz: Math.sin(ang) * rand(0.4, 1.4),
      life: rand(0.7, 1.2), size: rand(0.25, 0.5), grav: 5,
    });
  }

  rainbowBurst(pos, n = 40) {
    const cols = [0xff6b8a, 0xffb347, 0xffe066, 0x7de8a2, 0x66c7ff, 0xb388ff];
    for (let i = 0; i < n; i++) {
      const ang = rand(TAU), sp = rand(1.5, 4.5);
      this.spawn(pos.x, pos.y, pos.z, {
        color: cols[i % cols.length],
        vx: Math.cos(ang) * sp, vy: rand(1, 4.5), vz: Math.sin(ang) * sp,
        life: rand(0.8, 1.8), size: rand(0.4, 0.9), grav: 2.5,
      });
    }
  }

  update(dt, elapsed) {
    const p = this.positions, v = this.vel;
    for (let i = 0; i < MAX; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) { p[i * 3 + 1] = -999; this.sizes[i] = 0; continue; }
      const fl = this.flutter[i];
      p[i * 3] += (v[i * 3] + (fl ? Math.sin(elapsed * 3 + i) * fl * 0.3 : 0)) * dt;
      p[i * 3 + 1] += v[i * 3 + 1] * dt;
      p[i * 3 + 2] += (v[i * 3 + 2] + (fl ? Math.cos(elapsed * 2.6 + i * 1.3) * fl * 0.3 : 0)) * dt;
      v[i * 3 + 1] -= this.grav[i] * dt;
      const k = this.life[i] / this.maxLife[i];
      this.sizes[i] = this.baseSize[i] * (k < 0.7 ? k / 0.7 : 1) * (0.8 + Math.sin(elapsed * 8 + i) * 0.2);
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.size.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }
}
