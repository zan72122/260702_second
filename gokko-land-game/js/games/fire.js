// 🚒 しょうぼうし:ホースで ひを けして ねこちゃんを たすけよう!
import * as THREE from 'three';
import { GameBase } from './base.js';
import { box, cyl, sphere, cone, torus, mat, rand, pick, clamp } from '../core/utils.js';

const FIRE_COUNT = 5;

function makeFire() {
  const g = new THREE.Group();
  const flames = [];
  for (let i = 0; i < 4; i++) {
    const f = cone(rand(0.25, 0.4), rand(0.7, 1.1), i % 2 ? 0xff9a00 : 0xff5f00, 8);
    f.material = new THREE.MeshStandardMaterial({
      color: i % 2 ? 0xff9a20 : 0xff5510,
      emissive: i % 2 ? 0xff7700 : 0xff3300,
      emissiveIntensity: 2.2,
    });
    f.position.set(rand(-0.3, 0.3), rand(0.2, 0.5), rand(-0.15, 0.15));
    f.castShadow = false;
    g.add(f);
    flames.push(f);
  }
  const glow = sphere(0.4, 0xffdd66, 10);
  glow.material = new THREE.MeshBasicMaterial({ color: 0xffcc44, transparent: true, opacity: 0.4 });
  glow.castShadow = false;
  g.add(glow);
  g.userData.flames = flames;
  g.userData.hp = 1;
  return g;
}

export class FireGame extends GameBase {
  constructor(app) {
    super(app, 'fire', { top: 0x4a90d8, bottom: 0xffd9b0, clouds: 6 });
    this.build();
  }

  build() {
    const s = this.scene;

    // じめん(みち+しばふ)
    const ground = box(50, 0.4, 40, 0x8fbf72);
    ground.position.y = -0.2;
    s.add(ground);
    const road = box(50, 0.44, 10, 0x9a9aa8);
    road.position.set(0, -0.18, 3);
    s.add(road);
    // しょうかせん・カラーコーン
    const hyd = new THREE.Group();
    const hb = cyl(0.22, 0.26, 0.7, 0xff3b30, 10);
    hb.position.y = 0.35;
    hyd.add(hb);
    const hc = sphere(0.18, 0xffc400, 10);
    hc.position.y = 0.74;
    hyd.add(hc);
    hyd.position.set(6.5, 0, 1.5);
    s.add(hyd);
    for (const cx of [-6.8, 5.2]) {
      const coneMesh = cone(0.3, 0.7, 0xff7a30, 10);
      coneMesh.position.set(cx, 0.35, 5.5);
      s.add(coneMesh);
    }

    // ビル(まど 3x3)
    this.building = new THREE.Group();
    const body = box(9, 11, 4, 0xffe0c4);
    body.position.y = 5.5;
    this.building.add(body);
    const roof = box(9.6, 0.6, 4.6, 0xff8a70);
    roof.position.y = 11.2;
    this.building.add(roof);
    this.windows = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const win = box(1.7, 1.7, 0.25, 0x7a94b8, { emissive: 0.1 });
        win.position.set(-2.7 + c * 2.7, 2.6 + r * 3.1, 2.05);
        this.building.add(win);
        const frame = box(2, 2, 0.2, 0xffffff);
        frame.position.set(win.position.x, win.position.y, 1.98);
        this.building.add(frame);
        this.windows.push(win);
      }
    }
    this.building.position.z = -6;
    s.add(this.building);

    // ひのて(ランダムな まど 5かしょ)
    this.fires = [];
    const winIdx = [];
    while (winIdx.length < FIRE_COUNT) {
      const i = Math.floor(rand(9));
      if (!winIdx.includes(i)) winIdx.push(i);
    }
    for (const i of winIdx) {
      const fire = makeFire();
      const w = this.windows[i];
      fire.position.copy(w.position).add(new THREE.Vector3(0, -0.6, 0.4));
      this.building.add(fire);
      this.fires.push(fire);
    }

    // しょうぼうしゃ
    const truck = new THREE.Group();
    const tb = box(2.2, 1.4, 4.4, 0xff3b30);
    tb.position.y = 1.1;
    truck.add(tb);
    const cab = box(2, 1.1, 1.4, 0xff5f50);
    cab.position.set(0, 1, 2.4);
    truck.add(cab);
    const ladder = box(0.5, 0.16, 3.4, 0xdddddd);
    ladder.position.set(0, 1.95, -0.4);
    ladder.rotation.x = -0.25;
    truck.add(ladder);
    for (const [x, z] of [[-1.05, 1.6], [1.05, 1.6], [-1.05, -1.4], [1.05, -1.4]]) {
      const w = cyl(0.4, 0.4, 0.3, 0x33333d, 12);
      w.rotation.z = Math.PI / 2;
      w.position.set(x, 0.4, z);
      truck.add(w);
    }
    // ランプ
    this.lamp = sphere(0.22, 0xff2020, 10, { emissive: 1 });
    this.lamp.position.set(0, 1.75, 2.4);
    truck.add(this.lamp);
    truck.position.set(-4.9, 0, 1.8);
    truck.rotation.y = 1.1;
    s.add(truck);

    // ホースのノズル(みずの発射元)
    this.nozzle = new THREE.Group();
    const nz = cyl(0.16, 0.22, 0.9, 0xffc400, 10);
    nz.rotation.x = Math.PI / 2;
    this.nozzle.add(nz);
    this.nozzle.position.set(0, 1.4, 4.2);
    s.add(this.nozzle);

    // ねらいマーカー
    this.aimMark = torus(0.45, 0.06, 0x66c2ff, { emissive: 0.8 });
    this.aimMark.visible = false;
    s.add(this.aimMark);

    // みずしぶきパーティクル(自前管理)
    this.drops = [];
    this.dropPool = [];

    // ねこ(さいごに助ける)
    this.cat = null;

    // あてはん用の平面(ビルの前面)
    this.aimPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 3.8); // z = -3.8
    this.spraying = false;
    this.aimPoint = new THREE.Vector3(0, 5, -3.8);
  }

  start() {
    this.startT = this.t;
    this.extinguished = 0;
    this.app.audio.siren();
    this.app.ui.showOrder('🐱', 'たいへん! ビルが かじだよ! みずで けして!');
    this.app.ui.showMessage('がめんを タッチして\nみずを かけよう!', 2200);
    this.updateProgress();
  }

  updateProgress() {
    this.app.ui.setProgress(`🔥×${this.fires.filter((f) => f.userData.hp > 0).length}`);
  }

  _updateAim(raycaster) {
    const p = new THREE.Vector3();
    const hit = raycaster.ray.intersectPlane(this.aimPlane, p);
    if (hit) {
      p.x = clamp(p.x, -5.5, 5.5);
      p.y = clamp(p.y, 0.5, 11);
      this.aimPoint.copy(p);
      this.aimMark.position.copy(p);
    }
  }

  onPointerDown(x, y, raycaster) {
    if (this.finished) return;
    // ねこタップ判定
    if (this.cat && !this.catSaved) {
      const hits = raycaster.intersectObject(this.cat, true);
      if (hits.length) {
        this.saveCat();
        return;
      }
    }
    this.spraying = true;
    this.aimMark.visible = true;
    this._updateAim(raycaster);
  }
  onPointerMove(x, y, raycaster) {
    if (this.spraying) this._updateAim(raycaster);
  }
  onPointerUp() {
    this.spraying = false;
    this.aimMark.visible = false;
  }

  spawnDrop() {
    let d = this.dropPool.pop();
    if (!d) {
      d = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 6, 5),
        new THREE.MeshBasicMaterial({ color: 0x9fdcff, transparent: true, opacity: 0.9 })
      );
      this.scene.add(d);
    }
    d.visible = true;
    const from = this.nozzle.position.clone();
    d.position.copy(from);
    const dir = this.aimPoint.clone().sub(from);
    const dist = dir.length();
    dir.normalize();
    // ほうぶつせん風に少し上へ
    const vel = dir.multiplyScalar(16).add(new THREE.Vector3(rand(-0.8, 0.8), dist * 0.5 + rand(0, 1), rand(-0.4, 0.4)));
    d.userData = { vel, life: 1.2, t: 0 };
    this.drops.push(d);
  }

  saveCat() {
    this.catSaved = true;
    this.app.audio.fanfare();
    this.fx.emoji(this.cat.getWorldPosition(new THREE.Vector3()), '💖', 6, 0.8);
    this.app.ui.showMessage('ねこちゃんを たすけた!', 1500);
    this.catJump = 0;
  }

  update(dt) {
    super.update(dt);
    const cam = this.app.renderer.camera;
    const aspect = this.app.renderer.aspect;
    const dist = aspect < 1 ? 20 : 12.5;
    cam.position.set(Math.sin(this.t * 0.08) * 0.5, 5.8, dist - 4);
    cam.lookAt(0, 4.6, -4);

    // ランプ点滅
    this.lamp.material = mat(0xff2020, { emissive: Math.sin(this.t * 8) > 0 ? 1.4 : 0.15 });

    // ノズルはねらいの方を向く
    this.nozzle.lookAt(this.aimPoint);

    // みずを噴射
    if (this.spraying && !this.finished) {
      for (let i = 0; i < 3; i++) this.spawnDrop();
      if (Math.random() < dt * 8) this.app.audio.splash();
      this.aimMark.rotation.z += dt * 4;
      this.aimMark.scale.setScalar(1 + Math.sin(this.t * 10) * 0.12);
    }

    // みずの物理
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      d.userData.t += dt;
      d.userData.vel.y -= 14 * dt;
      d.position.addScaledVector(d.userData.vel, dt);
      let dead = d.userData.t > d.userData.life || d.position.y < 0;
      // ビルにあたった?
      if (d.position.z < -3.6) {
        dead = true;
        // ひのてに ちかい?
        for (const fire of this.fires) {
          if (fire.userData.hp <= 0) continue;
          const fp = fire.getWorldPosition(new THREE.Vector3());
          if (fp.distanceTo(d.position) < 1.4) {
            fire.userData.hp -= 0.012;
            const s = Math.max(0.01, fire.userData.hp);
            fire.scale.setScalar(s);
            if (Math.random() < 0.15) this.fx.smoke(fp, 1, 0xeeeeee);
            if (fire.userData.hp <= 0) this.onFireOut(fire, fp);
          }
        }
        this.fx.splash(d.position.clone(), 1);
      }
      if (dead) {
        d.visible = false;
        this.drops.splice(i, 1);
        this.dropPool.push(d);
      }
    }

    // ひのての ゆらめき
    for (const fire of this.fires) {
      if (fire.userData.hp <= 0) continue;
      for (const f of fire.userData.flames) {
        f.scale.y = 1 + Math.sin(this.t * 12 + f.position.x * 20) * 0.25;
        f.rotation.z = Math.sin(this.t * 9 + f.position.y * 15) * 0.12;
      }
    }

    // ねこの登場としぐさ
    if (this.cat) {
      if (this.catSaved) {
        this.catJump += dt;
        const k = Math.min(1, this.catJump / 1.2);
        this.cat.position.y = this.catBaseY + Math.sin(k * Math.PI) * 3 - k * (this.catBaseY - 0.8);
        this.cat.position.z = -3.6 + k * 7;
        this.cat.rotation.y += dt * 6;
        if (k >= 1 && !this.finished) {
          const elapsed = this.t - this.startT;
          const stars = elapsed < 35 ? 3 : elapsed < 55 ? 2 : 1;
          this.finish(stars, this.cat.position.clone().add(new THREE.Vector3(0, 2, 0)));
        }
      } else {
        this.cat.position.y = this.catBaseY + Math.abs(Math.sin(this.t * 5)) * 0.15;
      }
    }
  }

  onFireOut(fire, pos) {
    this.extinguished++;
    this.app.audio.good();
    this.fx.smoke(pos, 8, 0xffffff);
    this.fx.sparkle(pos, 8, 0x9fdcff);
    this.updateProgress();
    if (this.extinguished >= FIRE_COUNT) {
      // ぜんぶ けした → ねこ登場
      this.app.audio.whistle();
      this.app.ui.showOrder('🐱', 'たすけて〜! ねこちゃんを タップ!');
      this.app.ui.showMessage('🔥 ぜんぶ けせた!', 1400);
      const cat = new THREE.Group();
      const body = sphere(0.4, 0xffc36e, 12);
      body.position.y = 0.35;
      cat.add(body);
      const head = sphere(0.32, 0xffc36e, 12);
      head.position.y = 0.9;
      cat.add(head);
      for (const sx of [-1, 1]) {
        const ear = cone(0.1, 0.18, 0xffc36e, 4);
        ear.position.set(sx * 0.18, 1.15, 0);
        cat.add(ear);
        const eye = sphere(0.05, 0x2b2b2b, 6);
        eye.position.set(sx * 0.12, 0.95, 0.28);
        cat.add(eye);
      }
      // タップしやすい 見えない当たり判定
      const catHit = new THREE.Mesh(
        new THREE.SphereGeometry(1.1, 8, 6),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
      );
      catHit.position.y = 0.6;
      cat.add(catHit);
      const winPos = this.windows[4].position.clone(); // まんなかのまど
      cat.position.copy(winPos).add(new THREE.Vector3(0, -0.7, 0.5));
      this.catBaseY = cat.position.y;
      this.building.add(cat);
      // building空間(z=-6)→ワールド座標へ付けかえ
      this.scene.attach(cat);
      this.cat = cat;
      this.catSaved = false;
    }
  }
}
