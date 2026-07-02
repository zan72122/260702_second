// 🍣 おすしやさん:ちゅうもんの ネタをのせて どんどん にぎろう!
import * as THREE from 'three';
import { GameBase } from './base.js';
import { box, cyl, sphere, cone, mat, rand, pick, damp } from '../core/utils.js';
import { buildAnimal, animateAnimal, ANIMAL_FACES } from '../chars/chara.js';

const NETAS = [
  { id: 'maguro', name: 'まぐろ', icon: '🔴', color: 0xff5f6e },
  { id: 'salmon', name: 'サーモン', icon: '🟠', color: 0xff9a5f },
  { id: 'tamago', name: 'たまご', icon: '🟡', color: 0xffd95f },
  { id: 'ebi',    name: 'えび',   icon: '🦐', color: 0xff8a70 },
  { id: 'kappa',  name: 'かっぱまき', icon: '🥒', color: 0x6fc95f },
];
const ORDER_COUNT = 6;

function makeNetaMesh(spec) {
  const g = new THREE.Group();
  if (spec.id === 'kappa') {
    // のりまき
    const nori = cyl(0.28, 0.28, 0.5, 0x2a3a28, 12);
    g.add(nori);
    const riceIn = cyl(0.22, 0.22, 0.52, 0xffffff, 12);
    g.add(riceIn);
    const kyuri = cyl(0.08, 0.08, 0.54, 0x6fc95f, 8);
    g.add(kyuri);
    g.rotation.z = Math.PI / 2;
    g.position.y = 0.28;
  } else if (spec.id === 'ebi') {
    const body = sphere(0.3, spec.color, 12);
    body.scale.set(1.6, 0.5, 0.8);
    g.add(body);
    // しましま
    for (let i = 0; i < 3; i++) {
      const st = box(0.09, 0.12, 0.5, 0xffffff);
      st.position.x = -0.25 + i * 0.25;
      st.position.y = 0.08;
      g.add(st);
    }
    const tail = cone(0.12, 0.24, 0xff6a50, 6);
    tail.rotation.z = -1.2;
    tail.position.set(0.52, 0.1, 0);
    g.add(tail);
    g.position.y = 0.3;
  } else {
    const slab = sphere(0.3, spec.color, 12);
    slab.scale.set(1.7, 0.4, 0.9);
    g.add(slab);
    if (spec.id === 'salmon') {
      for (let i = 0; i < 3; i++) {
        const st = box(0.06, 0.1, 0.5, 0xffe0d0);
        st.rotation.y = 0.3;
        st.position.set(-0.28 + i * 0.28, 0.07, 0);
        g.add(st);
      }
    }
    if (spec.id === 'tamago') {
      const nori = box(0.2, 0.14, 0.62, 0x2a3a28);
      g.add(nori);
    }
    g.position.y = 0.28;
  }
  return g;
}

function makeNigiri(netaSpec = null) {
  const g = new THREE.Group();
  const rice = sphere(0.32, 0xffffff, 14);
  rice.scale.set(1.5, 0.7, 0.9);
  rice.position.y = 0.2;
  g.add(rice);
  if (netaSpec) {
    const neta = makeNetaMesh(netaSpec);
    neta.position.y += 0.18;
    g.add(neta);
  }
  return g;
}

export class SushiGame extends GameBase {
  constructor(app) {
    super(app, 'sushi', { top: 0x6fb8ff, bottom: 0xe0f4ff, clouds: 5 });
    this.build();
  }

  build() {
    const s = this.scene;

    // 店内(わふう)
    const floor = box(30, 0.4, 24, 0xd9b98a);
    floor.position.y = -0.2;
    s.add(floor);
    const wall = box(30, 12, 0.5, 0xf5e8d0);
    wall.position.set(0, 5.8, -8);
    s.add(wall);
    // のれん
    for (let i = 0; i < 5; i++) {
      const n = box(1.4, 2, 0.08, i % 2 ? 0x3d6bb0 : 0x4a80cc);
      n.position.set(-3 + i * 1.5, 5.4, -7.6);
      s.add(n);
    }
    // ちょうちん
    for (const sx of [-5.5, 5.5]) {
      const lantern = sphere(0.6, 0xff6a50, 12, { emissive: 0.5 });
      lantern.scale.y = 1.3;
      lantern.position.set(sx, 4.6, -7.2);
      s.add(lantern);
    }

    // カウンター
    const counter = box(11, 1.5, 2.6, 0xe8d0a8);
    counter.position.set(0, 0.75, 1.2);
    s.add(counter);
    const counterTop = box(11.4, 0.22, 3, 0xf8ecd8);
    counterTop.position.set(0, 1.6, 1.2);
    s.add(counterTop);

    // かいてんレーン
    this.lane = new THREE.Group();
    const laneBase = box(12, 0.5, 1.6, 0x4a4a58);
    laneBase.position.set(0, 1.35, -1.6);
    s.add(laneBase);
    s.add(this.lane);
    this.lanePlates = [];
    for (let i = 0; i < 8; i++) {
      const plate = new THREE.Group();
      const dish = cyl(0.55, 0.62, 0.1, pick([0xff8fb0, 0x8fd0ff, 0xffe36e, 0xb0ffb8]), 16);
      plate.add(dish);
      const sushi = makeNigiri(pick(NETAS));
      sushi.scale.setScalar(0.8);
      plate.add(sushi);
      plate.position.set(-6 + i * 1.7, 1.72, -1.6);
      this.lane.add(plate);
      this.lanePlates.push(plate);
    }

    // にぎり台(プレイヤーの前)
    this.workPlate = new THREE.Group();
    const wDish = cyl(0.75, 0.85, 0.12, 0x3d6bb0, 18);
    this.workPlate.add(wDish);
    this.workRice = makeNigiri(null);
    this.workRice.scale.setScalar(1.15);
    this.workPlate.add(this.workRice);
    this.workPlate.position.set(0, 1.78, 1.2);
    s.add(this.workPlate);

    // おきゃくさん(3にんが順番に)
    this.customerSpot = new THREE.Vector3(0, 1.1, -3.6);
    this.customer = null;

    // 板前ぼうし(プレイヤーの手だけ見える演出は省略)

    this.servedPlates = new THREE.Group();
    s.add(this.servedPlates);
  }

  start() {
    this.orderIndex = 0;
    this.mistakes = 0;
    this.combo = 0;
    this.state = 'wait'; // wait -> order -> serving
    this.serveT = 0;
    this.newCustomer();
    this.app.ui.setActions(NETAS.map((n) => ({
      id: n.id, icon: n.icon, label: n.name,
      onTap: (id) => this.chooseNeta(id),
    })));
    this.updateProgress();
    this.app.ui.showMessage('ちゅうもんの ネタを えらんでね!', 1800);
  }

  updateProgress() {
    this.app.ui.setProgress(`🍣 ${this.orderIndex}/${ORDER_COUNT}`);
  }

  newCustomer() {
    if (this.customer) this.scene.remove(this.customer);
    this.customer = buildAnimal();
    this.customer.position.set(0, 0.9, -3.4); // カウンターのむこうに立つ
    this.customer.scale.setScalar(1.3);
    this.scene.add(this.customer);

    this.currentOrder = pick(NETAS);
    const face = ANIMAL_FACES[this.customer.userData.animalType];
    this.app.ui.showOrder(face, `${this.currentOrder.name}の おすし ください!`);
    this.state = 'order';
  }

  chooseNeta(id) {
    if (this.state !== 'order' || this.finished) return;
    const spec = NETAS.find((n) => n.id === id);
    if (id === this.currentOrder.id) {
      // せいかい:ネタをのせて おきゃくさんへ
      this.app.audio.good();
      this.combo++;
      if (this.combo >= 3) this.app.ui.showMessage(`🔥 ${this.combo} れんぞく!`, 900);
      else this.app.ui.showMessage('へい おまち!', 900);
      const neta = makeNetaMesh(spec);
      neta.position.y += 0.32;
      neta.scale.setScalar(0.01);
      neta.userData.pop = 0;
      this.workRice.add(neta);
      this.currentNeta = neta;
      this.state = 'serving';
      this.serveT = 0;
      this.fx.sparkle(this.workPlate.position.clone().add(new THREE.Vector3(0, 0.6, 0)), 8, spec.color);
    } else {
      this.app.audio.bad();
      this.mistakes++;
      this.combo = 0;
      this.app.ui.showMessage('ちがうネタだよ〜', 900);
      // おきゃくさんが首をふる
      this.customerShake = 0.6;
    }
  }

  update(dt) {
    super.update(dt);
    const cam = this.app.renderer.camera;
    const aspect = this.app.renderer.aspect;
    const dist = aspect < 1 ? 10 : 7.5;
    cam.position.set(0, 4.6, dist);
    cam.lookAt(0, 1.4, -1);

    // レーンの回転
    for (const p of this.lanePlates) {
      p.position.x += dt * 1.1;
      if (p.position.x > 7) p.position.x = -7;
      p.rotation.y += dt * 0.8;
    }

    if (this.customer) {
      animateAnimal(this.customer, this.t);
      if (this.customerShake > 0) {
        this.customerShake -= dt;
        this.customer.userData.head.rotation.y = Math.sin(this.t * 24) * 0.35;
      } else {
        this.customer.userData.head.rotation.y = 0;
      }
    }

    // ネタのぽよん
    if (this.currentNeta && this.currentNeta.userData.pop < 1) {
      this.currentNeta.userData.pop = Math.min(1, this.currentNeta.userData.pop + dt * 5);
      const k = this.currentNeta.userData.pop;
      this.currentNeta.scale.setScalar(k * (1 + Math.sin(k * Math.PI) * 0.3));
    }

    // おすしを おきゃくさんへ すーっ
    if (this.state === 'serving') {
      this.serveT += dt;
      const k = Math.min(1, this.serveT / 0.9);
      const from = new THREE.Vector3(0, 1.78, 1.2);
      const to = this.customer.position.clone().add(new THREE.Vector3(0, 0.9, 0.8));
      this.workPlate.position.lerpVectors(from, to, k);
      this.workPlate.position.y += Math.sin(k * Math.PI) * 0.8;
      if (k >= 1) {
        // たべる!
        this.app.audio.pop();
        this.fx.emoji(this.customer.position.clone().add(new THREE.Vector3(0, 2.2, 0)), '💖', 3, 0.7);
        this.fx.sparkle(this.workPlate.position.clone(), 6);
        // リセット
        while (this.workRice.children.length > 1) this.workRice.remove(this.workRice.children[1]);
        this.currentNeta = null;
        this.workPlate.position.set(0, 1.78, 1.2);
        this.orderIndex++;
        this.updateProgress();
        if (this.orderIndex >= ORDER_COUNT) {
          const stars = this.mistakes === 0 ? 3 : this.mistakes <= 2 ? 2 : 1;
          this.app.ui.hideOrder();
          this.finish(stars, this.customer.position.clone().add(new THREE.Vector3(0, 2.5, 0)));
        } else {
          this.newCustomer();
        }
      }
    }
  }
}
