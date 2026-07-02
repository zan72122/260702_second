// 🍰 ケーキやさん:まぜる→やく→クリーム→トッピング→プレゼント!
import * as THREE from 'three';
import { GameBase } from './base.js';
import { box, cyl, sphere, cone, torus, mat, rand, pick, clamp, damp } from '../core/utils.js';
import { buildAnimal, animateAnimal, ANIMAL_FACES } from '../chars/chara.js';

const CREAMS = [
  { id: 'white', name: 'しろ',   icon: '🍦', color: 0xfff6e8 },
  { id: 'pink',  name: 'ピンク', icon: '🌸', color: 0xffb0d8 },
  { id: 'choco', name: 'チョコ', icon: '🍫', color: 0x8a5a3e },
];
const FRUITS = [
  { id: 'strawberry', name: 'いちご',    icon: '🍓', color: 0xff4d6d },
  { id: 'blueberry',  name: 'ブルーベリー', icon: '🫐', color: 0x5f6fd0 },
  { id: 'orange',     name: 'オレンジ',  icon: '🍊', color: 0xffa03b },
];

export class CakeGame extends GameBase {
  constructor(app) {
    super(app, 'cake', { top: 0xffb7d9, bottom: 0xfff2d8, clouds: 6 });
    this.scene.fog = new THREE.Fog(0xffe8f2, 30, 90);
    this.build();
  }

  build() {
    const s = this.scene;

    // ゆか・かべ(パティスリーの店内)
    const floor = box(30, 0.4, 24, 0xffe0ec);
    floor.position.y = -0.2;
    s.add(floor);
    // チェック床
    for (let i = -5; i <= 5; i++) {
      for (let j = -4; j <= 4; j++) {
        if ((i + j) % 2 === 0) continue;
        const tile = box(1.4, 0.05, 1.4, 0xfff5f9);
        tile.position.set(i * 1.5, 0.02, j * 1.5);
        s.add(tile);
      }
    }
    const wall = box(30, 12, 0.5, 0xfff0f6);
    wall.position.set(0, 5.8, -6);
    s.add(wall);
    // たな+ケーキかざり
    for (let i = 0; i < 3; i++) {
      const shelf = box(7, 0.25, 1.2, 0xffc9de);
      shelf.position.set(-4 + i * 4.5, 3.2 + (i % 2) * 1.4, -5.4);
      s.add(shelf);
      for (let k = 0; k < 3; k++) {
        const mini = cyl(0.4, 0.45, 0.5, pick([0xffb0d8, 0xfff6e8, 0x8a5a3e]), 12);
        mini.position.set(shelf.position.x - 2 + k * 2, shelf.position.y + 0.4, -5.4);
        s.add(mini);
        const cherry = sphere(0.12, 0xff4d6d, 8);
        cherry.position.copy(mini.position).add(new THREE.Vector3(0, 0.35, 0));
        s.add(cherry);
      }
    }

    // カウンター
    const counter = box(8, 1.4, 3, 0xffffff);
    counter.position.set(0, 0.7, 0);
    s.add(counter);
    const counterTop = box(8.4, 0.2, 3.4, 0xffc9de);
    counterTop.position.set(0, 1.5, 0);
    s.add(counterTop);

    // ボウル
    this.bowl = new THREE.Group();
    const bowlMesh = cyl(0.95, 0.6, 0.8, 0xa8dcff, 20);
    bowlMesh.position.y = 0.4;
    this.bowl.add(bowlMesh);
    this.batter = cyl(0.8, 0.8, 0.15, 0xffe8b0, 18);
    this.batter.position.y = 0.62;
    this.bowl.add(this.batter);
    this.spoon = new THREE.Group();
    const handle = cyl(0.05, 0.05, 1.1, 0xd9a066, 8);
    handle.rotation.z = 0.5;
    handle.position.set(0.35, 1.1, 0);
    this.spoon.add(handle);
    this.bowl.add(this.spoon);
    this.bowl.position.set(0, 1.6, 0.4);
    s.add(this.bowl);

    // オーブン
    this.oven = new THREE.Group();
    const ovenBody = box(2.4, 2.4, 2, 0xff9a3b);
    ovenBody.position.y = 1.2;
    this.oven.add(ovenBody);
    const ovenDoor = box(1.8, 1.4, 0.15, 0x7a4a20);
    ovenDoor.position.set(0, 1, 1.02);
    this.oven.add(ovenDoor);
    this.ovenWindow = box(1.4, 0.9, 0.05, 0x3a2410, { emissive: 0 });
    this.ovenWindow.material = new THREE.MeshStandardMaterial({ color: 0x3a2410, emissive: 0xff6a00, emissiveIntensity: 0 });
    this.ovenWindow.position.set(0, 1, 1.12);
    this.oven.add(this.ovenWindow);
    this.oven.position.set(5.4, 0, -2.4);
    this.oven.rotation.y = -0.5;
    s.add(this.oven);

    // ケーキ(最初は見えない)
    this.cake = new THREE.Group();
    this.cakeBody = cyl(1.1, 1.1, 0.9, 0xffdf9e, 24);
    this.cakeBody.position.y = 0.45;
    this.cake.add(this.cakeBody);
    this.cream = new THREE.Group();
    this.cake.add(this.cream);
    this.toppings = new THREE.Group();
    this.cake.add(this.toppings);
    const plate = cyl(1.5, 1.5, 0.08, 0xffffff, 24);
    plate.position.y = 0;
    this.cake.add(plate);
    this.cake.position.set(0, 1.6, 0.4);
    this.cake.visible = false;
    s.add(this.cake);

    // お客さん
    this.customer = buildAnimal();
    this.customer.position.set(-2.5, 0, 2.4);
    this.customer.rotation.y = 0.7;
    this.customer.scale.setScalar(1.25);
    s.add(this.customer);
  }

  start() {
    // ちゅうもんを決める
    this.order = {
      cream: pick(CREAMS),
      fruit: pick(FRUITS),
      count: 3 + Math.floor(rand(3)), // 3〜5こ
    };
    this.face = ANIMAL_FACES[this.customer.userData.animalType];
    this.app.ui.showOrder(this.face,
      `${this.order.cream.name}クリームに ${this.order.fruit.name}を ${this.order.count}こ のせてね!`);

    this.phase = 'mix';
    this.mixCount = 0;
    this.mixNeed = 8;
    this.bakePerfect = false;
    this.creamMatch = false;
    this.fruitMatch = false;
    this.placedCount = 0;
    this.bakeT = 0;
    this.gaugeV = 0;

    this.app.ui.showMessage('まぜまぜ しよう!', 1400);
    this.app.ui.showGauge(1, 0); // ゾーンなしのただの進捗
    this.app.ui.setGauge(0);
    this.app.ui.setActions([{
      id: 'mix', icon: '🥄', label: 'まぜる!', wide: true,
      onTap: () => this.doMix(),
    }]);
    this.app.ui.setProgress('🍰');
  }

  doMix() {
    if (this.phase !== 'mix') return;
    this.mixCount++;
    this.app.audio.pop();
    this.mixShake = 0.25;
    this.spoon.rotation.y += 1.4;
    this.batter.scale.setScalar(1 + this.mixCount / this.mixNeed * 0.12);
    this.fx.sparkle(this.bowl.position.clone().add(new THREE.Vector3(0, 0.8, 0)), 3, 0xffe8b0);
    this.app.ui.setGauge(this.mixCount / this.mixNeed);
    if (this.mixCount >= this.mixNeed) {
      this.app.audio.good();
      this.app.ui.showMessage('つぎは オーブンで やこう!', 1500);
      this.phase = 'toOven';
      this.phaseT = 0;
      this.app.ui.clearActions();
      this.app.ui.setGauge(0);
    }
  }

  startBake() {
    this.phase = 'bake';
    this.bakeT = 0;
    this.ovenWindow.material.emissiveIntensity = 0.8;
    this.app.audio.sizzle();
    this.app.ui.showGauge(0.55, 0.28); // みどりのゾーンでストップ!
    this.app.ui.setActions([{
      id: 'stop', icon: '🛑', label: 'ストップ!', wide: true,
      onTap: () => this.stopBake(),
    }]);
    this.app.ui.showMessage('みどりで ストップ!', 1400);
  }

  stopBake() {
    if (this.phase !== 'bake') return;
    const v = this.gaugeV;
    this.ovenWindow.material.emissiveIntensity = 0;
    this.app.ui.hideGauge();
    this.app.ui.clearActions();
    if (v >= 0.55 && v <= 0.83) {
      this.bakePerfect = true;
      this.app.audio.ding();
      this.app.ui.showMessage('こんがり やけた!', 1400);
      this.cakeBody.material = mat(0xffc97a);
    } else if (v > 0.83) {
      this.app.audio.bad();
      this.app.ui.showMessage('ちょっと こげちゃった…', 1400);
      this.cakeBody.material = mat(0x9a6a3e);
      this.fx.smoke(this.oven.position.clone().add(new THREE.Vector3(0, 2.6, 0)), 8, 0x888888);
    } else {
      this.app.audio.bad();
      this.app.ui.showMessage('まだ はやかったかな?', 1400);
      this.cakeBody.material = mat(0xffe8b0);
    }
    this.phase = 'fromOven';
    this.phaseT = 0;
  }

  showCreamChoices() {
    this.phase = 'cream';
    this.app.ui.showMessage('クリームを えらんでね!', 1400);
    this.app.ui.setActions(CREAMS.map((c) => ({
      id: c.id, icon: c.icon, label: c.name,
      onTap: (id) => this.applyCream(id),
    })));
  }

  applyCream(id) {
    if (this.phase !== 'cream') return;
    const spec = CREAMS.find((c) => c.id === id);
    this.creamMatch = id === this.order.cream.id;
    this.app.audio.pop();
    // クリーム本体
    const top = sphere(1.12, spec.color, 24);
    top.scale.y = 0.35;
    top.position.y = 0.92;
    this.cream.add(top);
    // ふちのしずく
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const drip = sphere(0.14, spec.color, 10);
      drip.scale.y = rand(1.4, 2.2);
      drip.position.set(Math.cos(a) * 1.05, 0.72, Math.sin(a) * 1.05);
      this.cream.add(drip);
    }
    this.fx.sparkle(this.cake.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 1.4, 0)), 10, spec.color);
    this.app.audio.sparkle();
    setTimeout(() => this.showFruitChoices(), 500);
  }

  showFruitChoices() {
    this.phase = 'topping';
    this.selectedFruit = this.order.fruit.id; // 最初から正解を選択状態に
    this.app.ui.showMessage(`ケーキを タップして\n${this.order.fruit.name}を ${this.order.count}こ のせよう!`, 2200);
    this.app.ui.setActions(FRUITS.map((f) => ({
      id: f.id, icon: f.icon, label: f.name,
      onTap: (id) => {
        this.selectedFruit = id;
        this.app.audio.tap();
        this.app.ui.selectAction(id);
      },
    })));
    this.app.ui.selectAction(this.selectedFruit);
    this.updateToppingProgress();
  }

  updateToppingProgress() {
    const f = FRUITS.find((x) => x.id === this.order.fruit.id);
    this.app.ui.setProgress(`${f.icon} ${this.placedCount}/${this.order.count}`);
  }

  onPointerUp(x, y, raycaster) {
    if (this.phase !== 'topping' || this.finished) return;
    const hits = raycaster.intersectObject(this.cakeBody, false);
    // クリーム部分にも当たり判定
    const creamHits = raycaster.intersectObjects(this.cream.children, false);
    const hit = hits[0] || creamHits[0];
    if (!hit) return;
    if (this.placedCount >= this.order.count) return;

    const spec = FRUITS.find((f) => f.id === this.selectedFruit);
    const local = this.cake.worldToLocal(hit.point.clone());
    const r = Math.hypot(local.x, local.z);
    const rr = Math.min(r, 0.85);
    const a = Math.atan2(local.z, local.x);
    const fruitG = new THREE.Group();
    if (spec.id === 'strawberry') {
      const b = cone(0.16, 0.26, spec.color, 10);
      b.rotation.x = Math.PI;
      b.position.y = 0.13;
      fruitG.add(b);
      const leaf = sphere(0.06, 0x59c94a, 6);
      leaf.position.y = 0.26;
      fruitG.add(leaf);
    } else if (spec.id === 'blueberry') {
      const b = sphere(0.13, spec.color, 10);
      b.position.y = 0.1;
      fruitG.add(b);
    } else {
      const b = sphere(0.15, spec.color, 10);
      b.scale.y = 0.55;
      b.position.y = 0.08;
      fruitG.add(b);
      const seg = torus(0.08, 0.02, 0xffd9a0);
      seg.rotation.x = Math.PI / 2;
      seg.position.y = 0.16;
      fruitG.add(seg);
    }
    fruitG.position.set(Math.cos(a) * rr, 1.18, Math.sin(a) * rr);
    fruitG.scale.setScalar(0.01);
    fruitG.userData.pop = 0;
    this.toppings.add(fruitG);
    this.placedCount++;
    if (this.selectedFruit === this.order.fruit.id) this.fruitMatch = true;
    else this.fruitMatch = false;
    this.app.audio.pop();
    this.fx.sparkle(hit.point, 5, spec.color);
    this.updateToppingProgress();

    if (this.placedCount >= this.order.count) {
      this.phase = 'serve';
      this.phaseT = 0;
      this.app.ui.clearActions();
      this.app.audio.good();
      this.app.ui.showMessage('かんせい〜!', 1200);
    }
  }

  update(dt) {
    super.update(dt);
    const cam = this.app.renderer.camera;
    const aspect = this.app.renderer.aspect;
    const dist = aspect < 1 ? 9.5 : 7;
    cam.position.set(Math.sin(this.t * 0.1) * 0.3, 4.2, dist);
    cam.lookAt(0, 1.5, 0);

    animateAnimal(this.customer, this.t);

    // ボウルのゆれ
    if (this.mixShake > 0) {
      this.mixShake -= dt;
      this.bowl.rotation.z = Math.sin(this.t * 40) * 0.08 * this.mixShake * 4;
    } else {
      this.bowl.rotation.z = 0;
    }
    if (this.phase === 'mix') {
      this.spoon.rotation.y += dt * 2;
    }

    // ボウル→オーブンへ移動
    if (this.phase === 'toOven') {
      this.phaseT += dt;
      const k = Math.min(1, this.phaseT / 1);
      const from = new THREE.Vector3(0, 1.6, 0.4);
      const to = this.oven.position.clone().add(new THREE.Vector3(0, 1.6, 0.6));
      this.bowl.position.lerpVectors(from, to, k);
      this.bowl.position.y += Math.sin(k * Math.PI) * 1.2;
      if (k >= 1) {
        this.bowl.visible = false;
        this.startBake();
      }
    }

    // やき進行(ゲージが行ったり来たりではなく1回だけ進む)
    if (this.phase === 'bake') {
      this.bakeT += dt;
      this.gaugeV = Math.min(1, this.bakeT / 3.6);
      this.app.ui.setGauge(this.gaugeV);
      if (Math.random() < dt * 3) {
        this.fx.smoke(this.oven.position.clone().add(new THREE.Vector3(rand(-0.5, 0.5), 2.6, 0)), 1, 0xffffff);
      }
      if (this.gaugeV >= 1) this.stopBake(); // やりすぎ
    }

    // オーブン→カウンターへケーキ登場
    if (this.phase === 'fromOven') {
      this.phaseT += dt;
      const k = Math.min(1, this.phaseT / 1);
      if (!this.cake.visible) {
        this.cake.visible = true;
        this.app.audio.whistle();
      }
      const from = this.oven.position.clone().add(new THREE.Vector3(0, 1.6, 0.6));
      const to = new THREE.Vector3(0, 1.6, 0.4);
      this.cake.position.lerpVectors(from, to, k);
      this.cake.position.y += Math.sin(k * Math.PI) * 1.2;
      if (k >= 1) this.showCreamChoices();
    }

    // トッピングのぽよん
    for (const f of this.toppings.children) {
      if (f.userData.pop < 1) {
        f.userData.pop = Math.min(1, f.userData.pop + dt * 4);
        const k = f.userData.pop;
        const s = 1 + Math.sin(k * Math.PI) * 0.4;
        f.scale.setScalar(k * s);
      }
    }

    // お客さんへプレゼント
    if (this.phase === 'serve') {
      this.phaseT += dt;
      const k = Math.min(1, this.phaseT / 1.4);
      const from = new THREE.Vector3(0, 1.6, 0.4);
      const to = this.customer.position.clone().add(new THREE.Vector3(0.6, 1.2, 0.6));
      this.cake.position.lerpVectors(from, to, k);
      this.cake.position.y += Math.sin(k * Math.PI) * 1.6;
      this.cake.rotation.y += dt * 2;
      if (k >= 1 && !this.finished) {
        // おきゃくさん大よろこび
        this.customer.position.y = Math.abs(Math.sin(this.t * 10)) * 0.3;
        this.fx.emoji(this.customer.position.clone().add(new THREE.Vector3(0, 2, 0)), '💖', 3, 0.8);
        let stars = 1;
        if (this.bakePerfect) stars++;
        if (this.creamMatch && this.fruitMatch) stars++;
        this.finish(stars, this.customer.position.clone().add(new THREE.Vector3(0, 2.5, 0)));
      }
    }
  }
}
