// パーティクル(紙吹雪・果汁・土煙・キラキラ・花火)と画面シェイク
import * as THREE from 'three';
import { rand, pick, sparkleCanvas, canvasTexture } from './utils.js';

const MAX_PARTICLES = 500;

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.pool = [];
    this.active = [];
    this.shake = 0;

    this._sparkleTex = canvasTexture(sparkleCanvas('#ffffff'));
    this._circleTex = this._makeCircleTex();

    const quadGeo = new THREE.PlaneGeometry(1, 1);
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const mat = new THREE.MeshBasicMaterial({
        transparent: true, depthWrite: false, side: THREE.DoubleSide,
      });
      const m = new THREE.Mesh(quadGeo, mat);
      m.visible = false;
      m.userData.p = { vx: 0, vy: 0, vz: 0, life: 0, maxLife: 1, grav: 0, spin: 0, size: 1, shrink: true };
      scene.add(m);
      this.pool.push(m);
    }
  }

  _makeCircleTex() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#fff';
    g.beginPath();
    g.arc(32, 32, 30, 0, Math.PI * 2);
    g.fill();
    return canvasTexture(c);
  }

  _spawn(opts) {
    const m = this.pool.pop();
    if (!m) return null;
    const p = m.userData.p;
    m.position.set(opts.x, opts.y, opts.z ?? 0.5);
    p.vx = opts.vx ?? 0; p.vy = opts.vy ?? 0; p.vz = opts.vz ?? 0;
    p.life = p.maxLife = opts.life ?? 1;
    p.grav = opts.grav ?? 0;
    p.spin = opts.spin ?? 0;
    p.size = opts.size ?? 0.3;
    p.shrink = opts.shrink ?? true;
    m.scale.setScalar(p.size);
    m.rotation.z = rand(Math.PI * 2);
    m.material.map = opts.tex ?? this._circleTex;
    m.material.color.set(opts.color ?? '#ffffff');
    m.material.opacity = 1;
    m.material.blending = opts.additive ? THREE.AdditiveBlending : THREE.NormalBlending;
    m.visible = true;
    this.active.push(m);
    return m;
  }

  update(dt) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const m = this.active[i];
      const p = m.userData.p;
      p.life -= dt;
      if (p.life <= 0) {
        m.visible = false;
        this.active.splice(i, 1);
        this.pool.push(m);
        continue;
      }
      p.vy -= p.grav * dt;
      m.position.x += p.vx * dt;
      m.position.y += p.vy * dt;
      m.position.z += p.vz * dt;
      m.rotation.z += p.spin * dt;
      const r = p.life / p.maxLife;
      if (p.shrink) m.scale.setScalar(p.size * (0.3 + 0.7 * r));
      m.material.opacity = Math.min(1, r * 2);
    }
    this.shake = Math.max(0, this.shake - dt * 3.2);
  }

  addShake(v) { this.shake = Math.min(1, this.shake + v); }

  // ---------- プリセット ----------

  // フルーツ取得: 果汁ポップ + キラキラ
  juicePop(x, y, color) {
    for (let i = 0; i < 12; i++) {
      const a = rand(Math.PI * 2), s = rand(2, 5.5);
      this._spawn({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s + 2, grav: 9, life: rand(.4, .7), size: rand(.12, .3), color });
    }
    for (let i = 0; i < 6; i++) {
      this._spawn({
        x: x + rand(-.4, .4), y: y + rand(-.2, .5), vy: rand(1, 3), life: rand(.5, .9),
        size: rand(.25, .5), color: '#fffbe0', tex: this._sparkleTex, additive: true, spin: rand(-4, 4),
      });
    }
  }

  // 着地の土煙
  dust(x, y, n = 6) {
    for (let i = 0; i < n; i++) {
      this._spawn({
        x: x + rand(-.4, .4), y: y + rand(0, .15), vx: rand(-1.6, 1.6), vy: rand(.6, 2),
        life: rand(.3, .55), size: rand(.2, .45), color: '#e8dcc8',
      });
    }
  }

  // 敵を倒した時のポン!
  poof(x, y, color = '#ffffff') {
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      this._spawn({
        x, y, vx: Math.cos(a) * rand(2, 4), vy: Math.sin(a) * rand(2, 4),
        life: rand(.35, .6), size: rand(.25, .5), color,
      });
    }
    this._spawn({ x, y, life: .3, size: 1.4, color: '#ffffff', tex: this._sparkleTex, additive: true });
  }

  // コンボ紙吹雪
  confetti(x, y, n = 26) {
    const colors = ['#ff5b6e', '#ffd94d', '#5bd75b', '#5bb8ff', '#c98fff', '#ff9d5b'];
    for (let i = 0; i < n; i++) {
      this._spawn({
        x: x + rand(-.5, .5), y: y + rand(0, .5), z: rand(.2, 1.2),
        vx: rand(-3.5, 3.5), vy: rand(3, 8), grav: 6, spin: rand(-12, 12),
        life: rand(.8, 1.5), size: rand(.14, .26), color: pick(colors), shrink: false,
      });
    }
  }

  // スーパーハッピーの虹オーラ
  happyAura(x, y) {
    const colors = ['#ff6b6b', '#ffb84d', '#ffe74d', '#6bff8a', '#6bc8ff', '#c86bff'];
    for (let i = 0; i < 2; i++) {
      this._spawn({
        x: x + rand(-.6, .6), y: y + rand(-.6, .8), vy: rand(1.5, 3.2),
        life: rand(.4, .8), size: rand(.2, .45), color: pick(colors),
        tex: this._sparkleTex, additive: true, spin: rand(-6, 6),
      });
    }
  }

  // タマゴ命中のスター
  starBurst(x, y) {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + rand(.3);
      this._spawn({
        x, y, vx: Math.cos(a) * 4.5, vy: Math.sin(a) * 4.5,
        life: .45, size: .4, color: '#fff2a8', tex: this._sparkleTex, additive: true, spin: 5,
      });
    }
  }

  // ゴール花火
  firework(x, y) {
    const color = pick(['#ff6b9d', '#ffd94d', '#6bffb8', '#6bc8ff', '#e08fff']);
    for (let i = 0; i < 40; i++) {
      const a = rand(Math.PI * 2), s = rand(3, 9);
      this._spawn({
        x, y, z: rand(-1, 1), vx: Math.cos(a) * s, vy: Math.sin(a) * s, grav: 4,
        life: rand(.7, 1.4), size: rand(.15, .35), color,
        tex: this._sparkleTex, additive: true, shrink: false,
      });
    }
  }

  // 花びらが散る
  petalScatter(x, y) {
    for (let i = 0; i < 8; i++) {
      this._spawn({
        x, y, vx: rand(-3, 3), vy: rand(2, 5), grav: 3.5, spin: rand(-8, 8),
        life: rand(.7, 1.2), size: rand(.2, .35), color: '#ffb2c8', shrink: false,
      });
    }
  }
}
