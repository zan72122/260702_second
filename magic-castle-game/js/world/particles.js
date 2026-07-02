// キラキラ・パーティクル総合(スパークル / ハート / 花火 / 紙ふぶき)
import * as THREE from 'three';
import { rand, pick, TAU, glowTexture, starTexture, heartTexture } from '../core/utils.js';

const MAX = 900;

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.pool = [];
    this.active = [];

    this.texGlow = glowTexture();
    this.texStar = starTexture();
    this.texHeart = heartTexture();

    for (let i = 0; i < MAX; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.texGlow,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }));
      sp.visible = false;
      sp.scale.setScalar(0.3);
      scene.add(sp);
      this.pool.push(sp);
    }
  }

  _spawn(x, y, z, opt) {
    const sp = this.pool.pop();
    if (!sp) return;
    sp.visible = true;
    sp.position.set(x, y, z);
    sp.material.map = opt.map || this.texGlow;
    sp.material.color.set(opt.color ?? 0xffffff);
    sp.material.opacity = 1;
    sp.material.blending = opt.normalBlend ? THREE.NormalBlending : THREE.AdditiveBlending;
    const p = {
      sp,
      vx: opt.vx ?? 0, vy: opt.vy ?? 0, vz: opt.vz ?? 0,
      g: opt.g ?? -3,
      drag: opt.drag ?? 0.99,
      life: opt.life ?? 1,
      age: 0,
      size: opt.size ?? 0.35,
      spin: opt.spin ?? 0,
      twinkle: opt.twinkle ?? false,
    };
    this.active.push(p);
  }

  // ✨ スパークルバースト(魔法)
  sparkle(pos, n = 24, color = 0xffe9a8) {
    for (let i = 0; i < n; i++) {
      const a = rand(TAU), r = rand(0.5, 3.2);
      this._spawn(pos.x, pos.y + rand(0.1, 0.6), pos.z, {
        vx: Math.cos(a) * r, vy: rand(1.5, 4.5), vz: Math.sin(a) * r,
        g: -4, life: rand(0.5, 1.1), size: rand(0.15, 0.45),
        color: pick([color, 0xffffff, 0xffb0ff]),
        map: Math.random() < 0.4 ? this.texStar : this.texGlow,
        twinkle: true,
      });
    }
  }

  // 💖 ハート
  hearts(pos, n = 8) {
    for (let i = 0; i < n; i++) {
      const a = rand(TAU);
      this._spawn(pos.x + Math.cos(a) * rand(0.4), pos.y + rand(1, 2), pos.z + Math.sin(a) * rand(0.4), {
        vx: Math.cos(a) * 0.6, vy: rand(1, 2.2), vz: Math.sin(a) * 0.6,
        g: 0.6, life: rand(0.8, 1.4), size: rand(0.25, 0.5),
        color: pick([0xff7eb6, 0xff9ecf, 0xffc0e0]),
        map: this.texHeart,
      });
    }
  }

  // 🎉 紙ふぶき
  confetti(pos, n = 40) {
    for (let i = 0; i < n; i++) {
      const a = rand(TAU), r = rand(1, 4);
      this._spawn(pos.x, pos.y + rand(2, 4), pos.z, {
        vx: Math.cos(a) * r, vy: rand(2, 6), vz: Math.sin(a) * r,
        g: -5, drag: 0.96, life: rand(1, 2), size: rand(0.14, 0.3),
        color: pick([0xff7eb6, 0xffd76e, 0x7ee0ff, 0x9fffb3, 0xc3a6ff]),
        normalBlend: true,
      });
    }
  }

  // 🎆 花火
  firework(pos, color) {
    const c = color ?? pick([0xff7eb6, 0xffd76e, 0x7ee0ff, 0xc3a6ff, 0x9fffb3, 0xffffff]);
    const n = 70;
    for (let i = 0; i < n; i++) {
      // 球状に分布
      const th = rand(TAU), ph = Math.acos(rand(-1, 1));
      const sp = rand(4, 7.5);
      this._spawn(pos.x, pos.y, pos.z, {
        vx: Math.sin(ph) * Math.cos(th) * sp,
        vy: Math.cos(ph) * sp,
        vz: Math.sin(ph) * Math.sin(th) * sp,
        g: -2.4, drag: 0.965, life: rand(1.1, 1.9),
        size: rand(0.25, 0.5),
        color: Math.random() < 0.85 ? c : 0xffffff,
        map: Math.random() < 0.3 ? this.texStar : this.texGlow,
        twinkle: true,
      });
    }
  }

  // 水しぶき
  splash(pos, n = 16) {
    for (let i = 0; i < n; i++) {
      const a = rand(TAU), r = rand(0.5, 2);
      this._spawn(pos.x, pos.y, pos.z, {
        vx: Math.cos(a) * r, vy: rand(2, 4), vz: Math.sin(a) * r,
        g: -9, life: rand(0.4, 0.8), size: rand(0.12, 0.3),
        color: pick([0x9fdcff, 0xd0f0ff, 0xffffff]),
      });
    }
  }

  // 走りエフェクト(足元の小さな砂ぼこり風キラ)
  dust(pos) {
    this._spawn(pos.x + rand(-0.2, 0.2), pos.y + 0.1, pos.z + rand(-0.2, 0.2), {
      vx: rand(-0.3, 0.3), vy: rand(0.3, 0.8), vz: rand(-0.3, 0.3),
      g: -0.5, life: 0.5, size: rand(0.1, 0.22),
      color: 0xfff2d8,
    });
  }

  update(dt) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.age += dt;
      if (p.age >= p.life) {
        p.sp.visible = false;
        this.pool.push(p.sp);
        this.active.splice(i, 1);
        continue;
      }
      p.vx *= p.drag; p.vz *= p.drag;
      p.vy = p.vy * p.drag + p.g * dt;
      p.sp.position.x += p.vx * dt;
      p.sp.position.y += p.vy * dt;
      p.sp.position.z += p.vz * dt;
      const k = 1 - p.age / p.life;
      const tw = p.twinkle ? (0.7 + 0.3 * Math.sin(p.age * 30 + p.sp.id)) : 1;
      p.sp.material.opacity = k * tw;
      p.sp.scale.setScalar(p.size * (0.5 + k * 0.7));
    }
  }
}
