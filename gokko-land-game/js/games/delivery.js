// 🚚 たくはいびん:トラックにのって おうちに にもつを とどけよう!
import * as THREE from 'three';
import { GameBase } from './base.js';
import { box, cyl, sphere, cone, mat, rand, pick, clamp } from '../core/utils.js';
import { buildAnimal, ANIMAL_FACES } from '../chars/chara.js';

const TARGET_COUNT = 5;
const HOUSE_COLORS = [
  { name: 'あか',   color: 0xff6b5f, icon: '🔴' },
  { name: 'あお',   color: 0x66a8ff, icon: '🔵' },
  { name: 'きいろ', color: 0xffd95f, icon: '🟡' },
  { name: 'みどり', color: 0x7ed07a, icon: '🟢' },
  { name: 'ピンク', color: 0xff9ec2, icon: '🩷' },
];

function makeTruck() {
  const g = new THREE.Group();
  const body = box(1.6, 1.3, 2.4, 0x7ed07a);
  body.position.set(0, 1.15, -0.5);
  g.add(body);
  const cabin = box(1.5, 0.9, 1.1, 0xffffff);
  cabin.position.set(0, 0.95, 1.15);
  g.add(cabin);
  const glass = box(1.3, 0.5, 0.1, 0xaee2ff, { emissive: 0.2 });
  glass.position.set(0, 1.1, 1.71);
  g.add(glass);
  // にもつマーク
  const markC = box(0.7, 0.7, 0.05, 0xffffff);
  markC.position.set(0.83, 1.2, -0.5);
  markC.rotation.y = Math.PI / 2;
  g.add(markC);
  const mark = box(0.4, 0.4, 0.06, 0xd9a066);
  mark.position.set(0.85, 1.2, -0.5);
  mark.rotation.y = Math.PI / 2;
  g.add(mark);
  // タイヤ
  g.userData.wheels = [];
  for (const [x, z] of [[-0.8, 1.1], [0.8, 1.1], [-0.8, -1.1], [0.8, -1.1]]) {
    const w = cyl(0.36, 0.36, 0.3, 0x33333d, 14);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.36, z);
    g.add(w);
    g.userData.wheels.push(w);
    const cap = cyl(0.14, 0.14, 0.32, 0xdddddd, 10);
    cap.rotation.z = Math.PI / 2;
    cap.position.set(x, 0.36, z);
    g.add(cap);
  }
  return g;
}

function makeHouse(spec) {
  const g = new THREE.Group();
  const body = box(2.6, 2.2, 2.4, 0xfff3e0);
  body.position.y = 1.1;
  g.add(body);
  const roof = cone(2.2, 1.4, spec.color, 4);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 2.9;
  g.add(roof);
  const door = box(0.8, 1.2, 0.12, 0x8a5a2e);
  door.position.set(0, 0.6, 1.22);
  g.add(door);
  const win = box(0.7, 0.7, 0.1, 0xbfe8ff, { emissive: 0.2 });
  win.position.set(0.8, 1.5, 1.22);
  g.add(win);
  // いろの旗じるし
  const pole = cyl(0.05, 0.05, 2, 0xffffff, 6);
  pole.position.set(-1.6, 1, 1);
  g.add(pole);
  const flag = box(0.7, 0.45, 0.06, spec.color, { emissive: 0.25 });
  flag.position.set(-1.25, 1.8, 1);
  g.add(flag);
  g.userData.flag = flag;
  return g;
}

export class DeliveryGame extends GameBase {
  constructor(app) {
    super(app, 'delivery', { top: 0x5fb0ff, bottom: 0xd8f4e0, clouds: 10 });
    this.scene.fog = new THREE.Fog(0xcfefdc, 30, 100);
    this.build();
  }

  build() {
    const s = this.scene;

    // じめん・みち(トラックは z- へ進む)
    const ground = box(60, 0.4, 400, 0x8ed88a);
    ground.position.set(0, -0.2, -150);
    s.add(ground);
    const road = box(6, 0.44, 400, 0x8a8a96);
    road.position.set(0, -0.18, -150);
    s.add(road);
    // 白線
    for (let i = 0; i < 60; i++) {
      const line = box(0.3, 0.46, 2.4, 0xffffff);
      line.position.set(0, -0.16, 8 - i * 6);
      s.add(line);
    }

    // トラック
    this.truck = makeTruck();
    this.truck.position.set(1.6, 0, 6);
    this.truck.rotation.y = Math.PI; // z-向き
    s.add(this.truck);

    // おうち(ターゲット5けん+かざりのおうち)
    this.targets = [];
    const colors = [];
    while (colors.length < TARGET_COUNT) {
      const c = pick(HOUSE_COLORS);
      if (colors[colors.length - 1] !== c) colors.push(c);
    }
    for (let i = 0; i < TARGET_COUNT; i++) {
      const spec = colors[i];
      const house = makeHouse(spec);
      const z = -18 - i * 26;
      house.position.set(5.6, 0, z);
      house.rotation.y = -Math.PI / 2; // みちのほうを向く
      s.add(house);
      // 住人
      const npc = buildAnimal();
      npc.visible = false;
      npc.position.set(4.2, 0, z);
      npc.rotation.y = -Math.PI / 2;
      s.add(npc);
      this.targets.push({ house, spec, z, npc, done: false });
    }
    // かざりのおうち・木
    for (let i = 0; i < 22; i++) {
      const z = -8 - i * 12 + rand(-3, 3);
      const side = i % 2 === 0 ? -1 : 1;
      if (side === 1 && this.targets.some((t) => Math.abs(t.z - z) < 8)) continue;
      const deco = makeHouse(pick(HOUSE_COLORS));
      deco.userData.flag.visible = false;
      deco.position.set(side * rand(6.5, 10), 0, z);
      deco.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
      deco.scale.setScalar(rand(0.8, 1));
      s.add(deco);
    }
    for (let i = 0; i < 30; i++) {
      const tr = new THREE.Group();
      const trunk = cyl(0.15, 0.2, 1, 0x8a5a2e, 6);
      trunk.position.y = 0.5;
      tr.add(trunk);
      const leaf = sphere(rand(0.6, 1), pick([0x59c94a, 0x6fd75f]), 10);
      leaf.position.y = 1.6;
      tr.add(leaf);
      tr.position.set(pick([-1, 1]) * rand(8, 16), 0, -rand(0, 160));
      s.add(tr);
    }

    // にもつ(投げる用)
    this.parcel = new THREE.Group();
    const pbox = box(0.6, 0.6, 0.6, 0xd9a066);
    this.parcel.add(pbox);
    const rib1 = box(0.64, 0.14, 0.64, 0xff5f5f);
    this.parcel.add(rib1);
    const rib2 = box(0.14, 0.64, 0.64, 0xff5f5f);
    this.parcel.add(rib2);
    this.parcel.visible = false;
    s.add(this.parcel);
  }

  start() {
    this.targetIndex = 0;
    this.successCount = 0;
    this.missCount = 0;
    this.speed = 7;
    this.throwing = null;
    this.updateOrderUI();
    this.app.ui.setActions([
      { id: 'horn', icon: '📣', label: 'クラクション', onTap: () => { this.app.audio.horn(); this.fx.emoji(this.truck.position.clone().add(new THREE.Vector3(0, 2.2, 1)), '🎵', 2, 0.6); } },
      { id: 'deliver', icon: '📦', label: 'とどける!', wide: true, onTap: () => this.deliver() },
    ]);
    this.app.ui.showMessage('はたの いろの おうちに\nとどけよう!', 2200);
  }

  currentTarget() { return this.targets[this.targetIndex]; }

  updateOrderUI() {
    const t = this.currentTarget();
    if (!t) return;
    this.app.ui.showOrder('📦', `${t.spec.icon} ${t.spec.name}の おうちへ おとどけ!`);
    this.app.ui.setProgress(`📦 ${this.successCount}/${TARGET_COUNT}`);
  }

  deliver() {
    if (this.finished || this.throwing) return;
    const t = this.currentTarget();
    if (!t) return;
    const dz = Math.abs(this.truck.position.z - t.z);
    if (dz < 3.6) {
      // せいこう:にもつを ほうりなげる
      this.app.audio.pop();
      this.throwing = { t: 0, from: this.truck.position.clone().add(new THREE.Vector3(0, 1.6, 0)), to: new THREE.Vector3(t.house.position.x - 1.2, 0.5, t.z), target: t, hit: true };
      this.parcel.visible = true;
    } else {
      // とおすぎ:にもつが みちに ころん
      this.app.audio.bad();
      this.missCount++;
      this.app.ui.showMessage('まだ とおいよ〜', 900);
      this.throwing = { t: 0, from: this.truck.position.clone().add(new THREE.Vector3(0, 1.6, 0)), to: this.truck.position.clone().add(new THREE.Vector3(-2, 0.3, -4)), target: null, hit: false };
      this.parcel.visible = true;
    }
  }

  update(dt) {
    super.update(dt);

    // トラック前進
    if (!this.finished) {
      this.truck.position.z -= this.speed * dt;
      for (const w of this.truck.userData.wheels) w.rotation.x -= this.speed * dt * 2.6;
      this.truck.position.y = Math.abs(Math.sin(this.t * 9)) * 0.05;
    }

    // カメラ:トラックの ななめうしろ
    const cam = this.app.renderer.camera;
    const aspect = this.app.renderer.aspect;
    const back = aspect < 1 ? 11 : 8.5;
    const h = aspect < 1 ? 6 : 4.6;
    cam.position.set(this.truck.position.x - 3.2, h, this.truck.position.z + back);
    cam.lookAt(this.truck.position.x + 1, 1.2, this.truck.position.z - 4);

    const t = this.currentTarget();
    if (t && !this.finished) {
      // ちかづくと はたが ピカピカ+リング
      const dz = Math.abs(this.truck.position.z - t.z);
      const near = dz < 3.6;
      t.house.userData.flag.material = mat(t.spec.color, { emissive: near ? 0.9 : 0.25 });
      t.house.userData.flag.scale.setScalar(near ? 1 + Math.sin(this.t * 10) * 0.15 : 1);
      if (near && !this.wasNear) this.app.audio.beep();
      this.wasNear = near;

      // とおりすぎたら ミス
      if (this.truck.position.z < t.z - 4 && !this.throwing) {
        this.missCount++;
        this.app.audio.bad();
        this.app.ui.showMessage('とおりすぎちゃった!', 1000);
        this.nextTarget(false);
      }
    }

    // にもつの ほうぶつせん
    if (this.throwing) {
      this.throwing.t += dt * 1.6;
      const k = Math.min(1, this.throwing.t);
      this.parcel.position.lerpVectors(this.throwing.from, this.throwing.to, k);
      this.parcel.position.y += Math.sin(k * Math.PI) * 2.2;
      this.parcel.rotation.x += dt * 6;
      this.parcel.rotation.y += dt * 4;
      if (k >= 1) {
        const th = this.throwing;
        this.throwing = null;
        this.parcel.visible = false;
        if (th.hit && th.target) {
          this.app.audio.ding();
          this.successCount++;
          const npc = th.target.npc;
          npc.visible = true;
          this.fx.confetti(th.to.clone().add(new THREE.Vector3(0, 1, 0)), 16, 2);
          this.fx.emoji(th.to.clone().add(new THREE.Vector3(0, 2, 0)), '💖', 3, 0.7);
          this.app.ui.showMessage('おとどけ かんりょう!', 1000);
          this.nextTarget(true);
        } else {
          this.fx.smoke(th.to, 4, 0xccbbaa);
        }
      }
    }

    if (this.finished) return;
  }

  nextTarget(success) {
    this.targetIndex++;
    if (this.targetIndex >= TARGET_COUNT) {
      const stars = this.successCount >= 5 ? 3 : this.successCount >= 4 ? 2 : 1;
      setTimeout(() => {
        if (!this.finished) this.finish(stars, this.truck.position.clone().add(new THREE.Vector3(0, 2.5, -2)));
      }, 600);
    } else {
      this.updateOrderUI();
    }
    this.app.ui.setProgress(`📦 ${this.successCount}/${TARGET_COUNT}`);
  }
}
