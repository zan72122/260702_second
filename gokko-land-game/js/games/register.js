// 🛒 スーパーのレジ:ながれてくる しょうひんを ピッ!とスキャンしよう
import * as THREE from 'three';
import { GameBase } from './base.js';
import { box, cyl, sphere, cone, mat, rand, pick, clamp } from '../core/utils.js';
import { buildAnimal, animateAnimal, ANIMAL_FACES } from '../chars/chara.js';

const ITEM_SPECS = [
  { id: 'apple',  name: 'りんご',   price: 100 },
  { id: 'milk',   name: 'ぎゅうにゅう', price: 200 },
  { id: 'bread',  name: 'パン',     price: 150 },
  { id: 'carrot', name: 'にんじん', price: 80 },
  { id: 'juice',  name: 'ジュース', price: 120 },
  { id: 'fish',   name: 'おさかな', price: 300 },
  { id: 'egg',    name: 'たまご',   price: 180 },
  { id: 'banana', name: 'バナナ',   price: 130 },
];
const ITEM_TOTAL = 8;

function makeItem(spec) {
  const g = new THREE.Group();
  switch (spec.id) {
    case 'apple': {
      const b = sphere(0.34, 0xff4d4d, 14);
      b.position.y = 0.3;
      g.add(b);
      const stem = cyl(0.03, 0.03, 0.2, 0x6b4a2e, 6);
      stem.position.y = 0.62;
      g.add(stem);
      const leaf = sphere(0.08, 0x59c94a, 6);
      leaf.scale.set(1.6, 0.5, 0.8);
      leaf.position.set(0.1, 0.66, 0);
      g.add(leaf);
      break;
    }
    case 'milk': {
      const b = box(0.4, 0.62, 0.4, 0xffffff);
      b.position.y = 0.31;
      g.add(b);
      const top = cone(0.29, 0.2, 0xffffff, 4);
      top.rotation.y = Math.PI / 4;
      top.position.y = 0.72;
      g.add(top);
      const label = box(0.42, 0.2, 0.42, 0x66a8ff);
      label.position.y = 0.3;
      g.add(label);
      break;
    }
    case 'bread': {
      const b = box(0.66, 0.36, 0.4, 0xe8b870);
      b.position.y = 0.26;
      g.add(b);
      const top = sphere(0.33, 0xd99a50, 12);
      top.scale.set(1, 0.55, 0.6);
      top.position.y = 0.44;
      g.add(top);
      break;
    }
    case 'carrot': {
      const b = cone(0.2, 0.7, 0xff8a3b, 10);
      b.rotation.z = Math.PI;
      b.position.y = 0.35;
      g.add(b);
      const leaf = cone(0.12, 0.3, 0x59c94a, 8);
      leaf.position.y = 0.8;
      g.add(leaf);
      break;
    }
    case 'juice': {
      const b = cyl(0.2, 0.2, 0.62, 0xffa03b, 12);
      b.position.y = 0.31;
      g.add(b);
      const cap = cyl(0.12, 0.12, 0.08, 0xffffff, 10);
      cap.position.y = 0.66;
      g.add(cap);
      break;
    }
    case 'fish': {
      const b = sphere(0.32, 0x66a8ff, 12);
      b.scale.set(1.7, 0.7, 0.6);
      b.position.y = 0.25;
      g.add(b);
      const tail = cone(0.16, 0.3, 0x4a86d8, 6);
      tail.rotation.z = -Math.PI / 2;
      tail.position.set(0.62, 0.25, 0);
      g.add(tail);
      const eye = sphere(0.05, 0x2b2b2b, 6);
      eye.position.set(-0.4, 0.32, 0.16);
      g.add(eye);
      break;
    }
    case 'egg': {
      const carton = box(0.6, 0.2, 0.44, 0xd0e8d0);
      carton.position.y = 0.12;
      g.add(carton);
      for (let i = 0; i < 3; i++) {
        const e = sphere(0.1, 0xfff6e0, 8);
        e.scale.y = 1.25;
        e.position.set(-0.18 + i * 0.18, 0.26, 0);
        g.add(e);
      }
      break;
    }
    case 'banana': {
      for (let i = 0; i < 3; i++) {
        const b = sphere(0.13, 0xffd95f, 10);
        b.scale.set(2.4, 0.8, 0.8);
        b.rotation.z = 0.5;
        b.position.set(0, 0.2 + i * 0.13, -0.1 + i * 0.1);
        g.add(b);
      }
      break;
    }
  }
  // タップしやすいように 見えない大きめの当たり判定を付ける
  const hit = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 1.1, 1.1),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  hit.position.y = 0.4;
  g.add(hit);
  g.userData.spec = spec;
  return g;
}

export class RegisterGame extends GameBase {
  constructor(app) {
    super(app, 'register', { top: 0xffb95f, bottom: 0xfff0d0, clouds: 5 });
    this.scene.fog = new THREE.Fog(0xffedd0, 30, 90);
    this.build();
  }

  build() {
    const s = this.scene;

    // 店内
    const floor = box(30, 0.4, 24, 0xf0e0c0);
    floor.position.y = -0.2;
    s.add(floor);
    const wall = box(30, 12, 0.5, 0xfff4dc);
    wall.position.set(0, 5.8, -8);
    s.add(wall);
    // 商品だな(かざり)
    for (let i = 0; i < 3; i++) {
      const sx = -7.5 + i * 7.5;
      const back = box(6.5, 3.8, 0.3, 0xffc98a);
      back.position.set(sx, 1.9, -7.5);
      s.add(back);
      for (const [j, by] of [[0, 1.1], [1, 2.5]].values()) {
        const board = box(6.5, 0.16, 1, 0xffe0b0);
        board.position.set(sx, by, -7);
        s.add(board);
        for (let c = 0; c < 4; c++) {
          const it = makeItem(pick(ITEM_SPECS));
          it.scale.setScalar(0.75);
          it.position.set(sx - 2.3 + c * 1.55, by + 0.08, -7);
          s.add(it);
        }
      }
    }

    // ベルトコンベア(みぎ→ひだり)
    const beltBase = box(12, 1.2, 2.4, 0x8a8a96);
    beltBase.position.set(0, 0.6, 0.5);
    s.add(beltBase);
    this.beltTop = box(12, 0.14, 2.2, 0x4a4a58);
    this.beltTop.position.set(0, 1.28, 0.5);
    s.add(this.beltTop);
    // ベルトのしま(ながれて見えるように)
    this.beltStripes = [];
    for (let i = 0; i < 8; i++) {
      const st = box(0.24, 0.16, 2.2, 0x6a6a7a);
      st.position.set(-6 + i * 1.6, 1.29, 0.5);
      s.add(st);
      this.beltStripes.push(st);
    }

    // スキャナー(まんなか、ひかる台)
    this.scanner = new THREE.Group();
    const scBase = box(2.8, 0.2, 2.5, 0xffffff);
    scBase.position.y = 1.24;
    this.scanner.add(scBase);
    this.scanGlow = box(2.5, 0.06, 2.1, 0x66e07a, { emissive: 1 });
    this.scanGlow.position.y = 1.33;
    this.scanner.add(this.scanGlow);
    // 両側のポール+ランプ
    for (const px of [-1.5, 1.5]) {
      const pole = cyl(0.09, 0.12, 1.1, 0xff6b5f, 8);
      pole.position.set(px, 1.95, -0.6);
      this.scanner.add(pole);
      const lamp = sphere(0.16, 0x66e07a, 10, { emissive: 0.8 });
      lamp.position.set(px, 2.55, -0.6);
      this.scanner.add(lamp);
    }
    this.scanner.position.set(0, 0, 0.5);
    s.add(this.scanner);

    // レジスター(きんがく表示)
    const regBody = box(1.3, 0.9, 0.9, 0xff9a3b);
    regBody.position.set(3.2, 1.85, -0.8);
    regBody.rotation.y = -0.3;
    s.add(regBody);
    const regScreen = box(1, 0.5, 0.1, 0x2b3a4a, { emissive: 0.4 });
    regScreen.position.set(3.05, 2.15, -0.42);
    regScreen.rotation.y = -0.3;
    s.add(regScreen);

    // かいものカゴ(ひだり)
    const basket = new THREE.Group();
    const bb = box(2.2, 1.2, 1.8, 0xff8fb0);
    bb.position.y = 0.9;
    basket.add(bb);
    const bi = box(1.9, 1.1, 1.5, 0xffc2d8);
    bi.position.y = 1.02;
    basket.add(bi);
    basket.position.set(-5.4, 0.6, 0.5);
    s.add(basket);
    this.bagPos = new THREE.Vector3(-5.4, 2.2, 0.5);

    // おきゃくさん
    this.customer = buildAnimal();
    this.customer.position.set(3.6, 0, 3);
    this.customer.rotation.y = -0.6;
    this.customer.scale.setScalar(1.25);
    s.add(this.customer);

    this.items = [];
    this.flying = [];
  }

  start() {
    this.scanned = 0;
    this.missed = 0;
    this.total = 0;
    this.spawnT = 0;
    this.spawnIndex = 0;
    this.queue = [];
    for (let i = 0; i < ITEM_TOTAL; i++) this.queue.push(pick(ITEM_SPECS));
    const face = ANIMAL_FACES[this.customer.userData.animalType];
    this.app.ui.showOrder(face, 'おかいもの おねがいね! ぜんぶ ピッ!してね');
    this.app.ui.showMessage('スキャナーの うえで\nしょうひんを タップ!', 2200);
    this.updateProgress();
  }

  updateProgress() {
    this.app.ui.setProgress(`🛒 ${this.scanned}/${ITEM_TOTAL}`);
  }

  onPointerDown(x, y, raycaster) {
    if (this.finished) return;
    const hits = raycaster.intersectObjects(this.items, true);
    if (!hits.length) return;
    let g = hits[0].object;
    while (g && !g.userData.spec) g = g.parent;
    if (!g) return;
    // スキャナーゾーン(x -1.2〜1.2)にあるか
    if (Math.abs(g.position.x) < 1.35) {
      this.scanItem(g);
    } else {
      this.app.audio.tap();
      this.app.ui.showMessage('スキャナーの うえでね!', 700);
    }
  }

  scanItem(item) {
    this.app.audio.beep();
    this.scanned++;
    this.total += item.userData.spec.price;
    this.items.splice(this.items.indexOf(item), 1);
    item.userData.fly = { t: 0, from: item.position.clone() };
    this.flying.push(item);
    this.fx.sparkle(item.position.clone().add(new THREE.Vector3(0, 0.5, 0)), 6, 0x66e07a);
    this.fx.emoji(item.position.clone().add(new THREE.Vector3(0, 1, 0)), '💴', 1, 0.5);
    this.app.ui.showMessage(`${item.userData.spec.name} ${item.userData.spec.price}えん!`, 700);
    this.updateProgress();
    this.scanFlash = 0.2;
  }

  update(dt) {
    super.update(dt);
    const cam = this.app.renderer.camera;
    const aspect = this.app.renderer.aspect;
    const dist = aspect < 1 ? 10.5 : 8;
    cam.position.set(0, 5, dist);
    cam.lookAt(0, 1.2, 0);

    animateAnimal(this.customer, this.t);

    // しま模様をながす
    for (const st of this.beltStripes) {
      st.position.x -= dt * 1.6;
      if (st.position.x < -6.2) st.position.x += 12.8;
    }

    // 商品スポーン
    if (!this.finished && this.spawnIndex < this.queue.length) {
      this.spawnT -= dt;
      if (this.spawnT <= 0 && this.items.length < 3) {
        this.spawnT = 2.2;
        const item = makeItem(this.queue[this.spawnIndex]);
        item.position.set(6.5, 1.35, 0.5);
        this.scene.add(item);
        this.items.push(item);
        this.spawnIndex++;
      }
    }

    // 商品ながれる
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.position.x -= dt * 1.6;
      // とおりすぎ → もう一回ながす(やさしい)
      if (item.position.x < -4.4) {
        this.missed++;
        this.app.audio.bad();
        this.app.ui.showMessage('あら、もういちど!', 800);
        item.position.x = 6.5;
      }
    }

    // スキャンした商品がカゴへ飛ぶ
    for (let i = this.flying.length - 1; i >= 0; i--) {
      const item = this.flying[i];
      item.userData.fly.t += dt * 1.8;
      const k = Math.min(1, item.userData.fly.t);
      item.position.lerpVectors(item.userData.fly.from, this.bagPos, k);
      item.position.y += Math.sin(k * Math.PI) * 1.6;
      item.rotation.y += dt * 7;
      item.scale.setScalar(1 - k * 0.4);
      if (k >= 1) {
        this.scene.remove(item);
        this.flying.splice(i, 1);
        this.app.audio.pop();
        if (this.scanned >= ITEM_TOTAL && this.flying.length === 0 && !this.finished) {
          this.checkout();
        }
      }
    }

    // スキャナーの光
    if (this.scanFlash > 0) {
      this.scanFlash -= dt;
      this.scanGlow.material = mat(0xffffff, { emissive: 2 });
    } else {
      this.scanGlow.material = mat(0x66e07a, { emissive: 0.6 + Math.sin(this.t * 4) * 0.3 });
    }
  }

  checkout() {
    this.app.audio.coin();
    this.app.ui.showOrder(ANIMAL_FACES[this.customer.userData.animalType], `ぜんぶで ${this.total}えん! ありがとう!`);
    this.fx.emoji(this.customer.position.clone().add(new THREE.Vector3(0, 2.4, 0)), '💖', 4, 0.8);
    const stars = this.missed === 0 ? 3 : this.missed <= 2 ? 2 : 1;
    setTimeout(() => {
      if (!this.finished) this.finish(stars, new THREE.Vector3(0, 3, 0.5));
    }, 900);
  }
}
