// 敵キャラ: ヘイホー風ウォーカー / プロペラフライヤー / パックンフラワー風
import * as THREE from 'three';
import { rand, pick, canvasTexture, maskCanvas, toonGradientMap } from './utils.js';

let _maskTex = null;
let _gm = null;
function gm() { return (_gm ??= toonGradientMap()); }

class EnemyBase {
  constructor() {
    this.dead = false;      // 完全消滅
    this.dying = 0;         // つぶれアニメ中 (>0)
    this.edible = true;     // 舌で食べられるか
    this.stompable = true;  // 踏めるか
  }
  // やられ演出開始
  defeat() {
    if (this.dying > 0 || this.dead) return false;
    this.dying = 0.45;
    return true;
  }
  updateDying(dt, scene) {
    this.dying -= dt;
    const r = Math.max(0, this.dying / 0.45);
    this.grp.scale.set(1 + (1 - r) * 0.6, Math.max(0.08, r), 1);
    if (this.dying <= 0) {
      this.dead = true;
      scene.remove(this.grp);
    }
    return this.dead;
  }
  removeNow(scene) {
    this.dead = true;
    scene.remove(this.grp);
  }
}

// ---------- ヘイホー風ウォーカー ----------
export class Walker extends EnemyBase {
  constructor(scene, x, groundY, platforms) {
    super();
    _maskTex ??= canvasTexture(maskCanvas());
    this.grp = new THREE.Group();
    const color = pick(['#ff5b5b', '#5b8aff', '#5bd75b', '#ffb25b']);
    // ローブ (ぽってり)
    const robe = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 16, 12),
      new THREE.MeshToonMaterial({ color, gradientMap: gm() })
    );
    robe.scale.set(1, 1.15, 1);
    robe.position.y = 0.48;
    robe.castShadow = true;
    this.grp.add(robe);
    // お面
    const face = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.26, 0.1, 16),
      new THREE.MeshStandardMaterial({ map: _maskTex })
    );
    face.rotation.x = Math.PI / 2;
    face.rotation.y = Math.PI / 2;
    face.position.set(0, 0.62, 0.36);
    this.faceMesh = face;
    this.grp.add(face);
    // 足
    const footMat = new THREE.MeshToonMaterial({ color: '#4a3aa0', gradientMap: gm() });
    this.feet = [];
    for (const dx of [-0.18, 0.18]) {
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), footMat);
      f.scale.set(1, 0.7, 1.4);
      f.position.set(dx, 0.1, 0.05);
      this.grp.add(f);
      this.feet.push(f);
    }
    this.grp.position.set(x, groundY, 0);
    scene.add(this.grp);

    this.x = x;
    this.y = groundY;
    this.dir = pick([-1, 1]);
    this.speed = rand(1.1, 1.7);
    this.aabb = { x, y: groundY + 0.55, hw: 0.42, hh: 0.55 };
    this.walkPhase = rand(Math.PI * 2);

    // パトロール範囲: スポーン地点の足場の端まで
    const plat = platforms.find((p) => !p.oneWay && Math.abs(p.top - groundY) < 0.1 &&
      x > p.x - p.hw - 0.1 && x < p.x + p.hw + 0.1);
    this.minX = plat ? p2l(plat) + 0.6 : x - 4;
    this.maxX = plat ? p2r(plat) - 0.6 : x + 4;
    function p2l(p) { return p.x - p.hw; }
    function p2r(p) { return p.x + p.hw; }
  }

  update(dt, time, scene) {
    if (this.dying > 0) return this.updateDying(dt, scene);
    this.x += this.dir * this.speed * dt;
    if (this.x < this.minX) { this.x = this.minX; this.dir = 1; }
    if (this.x > this.maxX) { this.x = this.maxX; this.dir = -1; }
    this.walkPhase += dt * 11;
    this.grp.position.x = this.x;
    this.grp.position.y = this.y + Math.abs(Math.sin(this.walkPhase)) * 0.07;
    this.grp.rotation.y = this.dir > 0 ? 0.35 : Math.PI - 0.35;
    this.feet[0].position.z = 0.05 + Math.sin(this.walkPhase) * 0.14;
    this.feet[1].position.z = 0.05 - Math.sin(this.walkPhase) * 0.14;
    this.aabb.x = this.x;
    this.aabb.y = this.grp.position.y + 0.55;
    return false;
  }
}

// ---------- プロペラフライヤー ----------
export class Flyer extends EnemyBase {
  constructor(scene, x, y) {
    super();
    _maskTex ??= canvasTexture(maskCanvas());
    this.grp = new THREE.Group();
    const color = pick(['#e08fff', '#5bd7d7', '#ffb2c8']);
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 16, 12),
      new THREE.MeshToonMaterial({ color, gradientMap: gm() })
    );
    body.castShadow = true;
    this.grp.add(body);
    const face = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 0.1, 16),
      new THREE.MeshStandardMaterial({ map: _maskTex })
    );
    face.rotation.x = Math.PI / 2;
    face.rotation.y = Math.PI / 2;
    face.position.set(0, 0.08, 0.34);
    this.grp.add(face);
    // プロペラ
    const propMat = new THREE.MeshStandardMaterial({ color: '#ffd94d', side: THREE.DoubleSide });
    this.prop = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const blade = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.12), propMat);
      blade.rotation.y = (i / 3) * Math.PI * 2;
      blade.position.x = Math.cos((i / 3) * Math.PI * 2) * 0.22;
      blade.position.z = -Math.sin((i / 3) * Math.PI * 2) * 0.22;
      this.prop.add(blade);
    }
    this.prop.position.y = 0.58;
    this.grp.add(this.prop);
    this.grp.position.set(x, y, 0);
    scene.add(this.grp);

    this.cx = x;
    this.cy = y;
    this.phase = rand(Math.PI * 2);
    this.aabb = { x, y, hw: 0.42, hh: 0.42 };
  }

  update(dt, time, scene) {
    if (this.dying > 0) return this.updateDying(dt, scene);
    const x = this.cx + Math.sin(time * 0.7 + this.phase) * 2.6;
    const y = this.cy + Math.sin(time * 1.7 + this.phase) * 0.7;
    const goingRight = Math.cos(time * 0.7 + this.phase) > 0;
    this.grp.position.set(x, y, 0);
    this.grp.rotation.y = goingRight ? 0.3 : Math.PI - 0.3;
    this.prop.rotation.y += dt * 22;
    this.aabb.x = x;
    this.aabb.y = y;
    return false;
  }
}

// ---------- パックンフラワー風 (タマゴでしか倒せない) ----------
export class Plant extends EnemyBase {
  constructor(scene, x, groundY) {
    super();
    this.edible = false;
    this.stompable = false;
    this.grp = new THREE.Group();
    // 植木鉢
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.3, 0.5, 12),
      new THREE.MeshStandardMaterial({ color: '#c8703a' })
    );
    pot.position.y = 0.25;
    pot.castShadow = true;
    this.grp.add(pot);
    // 茎
    this.stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.1, 0.9, 8),
      new THREE.MeshToonMaterial({ color: '#4aa848', gradientMap: gm() })
    );
    this.stem.position.y = 0.9;
    this.grp.add(this.stem);
    // 頭 (上あご/下あご)
    this.head = new THREE.Group();
    const headMat = new THREE.MeshToonMaterial({ color: '#ff4d6b', gradientMap: gm() });
    const lipMat = new THREE.MeshToonMaterial({ color: '#ffffff', gradientMap: gm() });
    this.jawTop = new THREE.Group();
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), headMat);
    this.jawTop.add(top);
    const lipT = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.06, 8, 16), lipMat);
    lipT.rotation.x = Math.PI / 2;
    this.jawTop.add(lipT);
    this.jawBot = new THREE.Group();
    const bot = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), headMat);
    this.jawBot.add(bot);
    // 白い斑点
    const spotMat = new THREE.MeshStandardMaterial({ color: '#ffffff' });
    for (const [a, b] of [[0.5, 0.7], [2.2, 0.5], [4.0, 0.8], [5.4, 0.4]]) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), spotMat);
      s.position.set(Math.cos(a) * 0.3, Math.sin(b) * 0.28, Math.sin(a) * 0.3);
      this.jawTop.add(s);
    }
    this.head.add(this.jawTop);
    this.head.add(this.jawBot);
    this.head.position.y = 1.5;
    this.head.castShadow = true;
    this.grp.add(this.head);
    this.grp.position.set(x, groundY, 0);
    scene.add(this.grp);

    this.x = x;
    this.y = groundY;
    this.phase = rand(Math.PI * 2);
    this.aabb = { x, y: groundY + 1.3, hw: 0.42, hh: 0.75 };
  }

  update(dt, time, scene) {
    if (this.dying > 0) return this.updateDying(dt, scene);
    // パクパク
    const bite = Math.max(0, Math.sin(time * 3.2 + this.phase));
    this.jawTop.position.y = 0.06 + bite * 0.16;
    this.jawTop.rotation.x = -bite * 0.35;
    this.jawBot.position.y = -bite * 0.1;
    this.stem.scale.y = 1 + Math.sin(time * 1.6 + this.phase) * 0.06;
    this.head.position.y = 1.5 + Math.sin(time * 1.6 + this.phase) * 0.08;
    this.head.rotation.z = Math.sin(time * 0.9 + this.phase) * 0.12;
    this.aabb.y = this.y + this.head.position.y - 0.1;
    return false;
  }
}

export function spawnEnemy(scene, def, platforms) {
  switch (def.type) {
    case 'walker': return new Walker(scene, def.x, def.y, platforms);
    case 'flyer': return new Flyer(scene, def.x, def.y);
    case 'plant': return new Plant(scene, def.x, def.y);
  }
}
