// タウンハブ:おみせがならぶ広場。タップでお店に入る
import * as THREE from 'three';
import { box, cyl, sphere, cone, torus, mat, makeSign, rand, pick, clamp, damp, disposeScene } from '../core/utils.js';
import { createSky, createLights } from './sky.js';
import { FX } from './fx.js';
import { buildKid, buildAnimal, animateKid, animateAnimal, setKidHat, ANIMAL_KEYS } from '../chars/chara.js';
import { GAME_INFO } from '../ui/ui.js';

const SHOPS = [
  { key: 'cake',     angle: -0.62, color: 0xffb0d8, roof: 0xff6fa5 },
  { key: 'sushi',    angle: 0.0,   color: 0xa8dcff, roof: 0x3d8bff },
  { key: 'delivery', angle: 0.62,  color: 0xc4f0b0, roof: 0x59c94a },
  { key: 'fire',     angle: 1.24,  color: 0xffc2b8, roof: 0xff3b30 },
  { key: 'register', angle: -1.24, color: 0xffe0a8, roof: 0xff9a3b },
];
const R_SHOP = 11.5;

function makeTree(scale = 1) {
  const g = new THREE.Group();
  const trunk = cyl(0.14 * scale, 0.2 * scale, 0.9 * scale, 0x8a5a2e, 8);
  trunk.position.y = 0.45 * scale;
  g.add(trunk);
  const colors = [0x59c94a, 0x6fd75f, 0x4bb840];
  for (let i = 0; i < 3; i++) {
    const puff = sphere(rand(0.5, 0.7) * scale, pick(colors), 12);
    puff.position.set(rand(-0.3, 0.3) * scale, (1.1 + i * 0.35) * scale, rand(-0.3, 0.3) * scale);
    g.add(puff);
  }
  return g;
}

function makeShop(spec) {
  const info = GAME_INFO[spec.key];
  const g = new THREE.Group();

  // 本体
  const body = box(4.2, 3, 3.4, spec.color);
  body.position.y = 1.5;
  g.add(body);

  // 屋根(お店ごとに個性)
  if (spec.key === 'fire') {
    const roof = box(4.6, 0.5, 3.8, spec.roof);
    roof.position.y = 3.2;
    g.add(roof);
    const tower = box(1.1, 1.6, 1.1, 0xffffff);
    tower.position.set(1.3, 4, 0);
    g.add(tower);
    const bell = sphere(0.3, 0xffc400, 10, { metal: 0.5, rough: 0.3 });
    bell.position.set(1.3, 5, 0);
    g.add(bell);
  } else if (spec.key === 'cake') {
    const roof = cone(3.1, 1.8, spec.roof, 4);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 3.9;
    g.add(roof);
    const berry = sphere(0.45, 0xff4d6d, 12);
    berry.position.y = 5;
    g.add(berry);
    const cream = torus(0.5, 0.16, 0xfff6e8);
    cream.rotation.x = Math.PI / 2;
    cream.position.y = 4.72;
    g.add(cream);
  } else if (spec.key === 'sushi') {
    const roof = box(4.8, 0.4, 3.8, spec.roof);
    roof.position.y = 3.2;
    g.add(roof);
    const roof2 = box(3.6, 0.4, 3, 0x2a6ad0);
    roof2.position.y = 3.9;
    g.add(roof2);
    // 大きなおすしのオブジェ
    const rice = sphere(0.6, 0xffffff, 12);
    rice.scale.set(1.4, 0.7, 0.9);
    rice.position.y = 4.5;
    g.add(rice);
    const neta = box(1.5, 0.25, 0.9, 0xff7a5c);
    neta.position.y = 4.95;
    g.add(neta);
  } else if (spec.key === 'delivery') {
    const roof = box(4.6, 0.5, 3.8, spec.roof);
    roof.position.y = 3.2;
    g.add(roof);
    const parcel = box(1, 1, 1, 0xd9a066);
    parcel.position.set(-1.2, 4, 0);
    parcel.rotation.y = 0.5;
    g.add(parcel);
    const ribbon = box(1.06, 0.2, 0.24, 0xff5f5f);
    ribbon.position.set(-1.2, 4, 0);
    ribbon.rotation.y = 0.5;
    g.add(ribbon);
  } else {
    const roof = box(4.6, 0.5, 3.8, spec.roof);
    roof.position.y = 3.2;
    g.add(roof);
    // しましまオーニング
    for (let i = 0; i < 5; i++) {
      const strip = box(0.84, 0.1, 1.1, i % 2 ? 0xffffff : spec.roof);
      strip.position.set(-1.68 + i * 0.84, 2.35, 1.9);
      strip.rotation.x = 0.35;
      g.add(strip);
    }
  }

  // ドア・まど
  const door = box(1.2, 1.7, 0.15, 0x8a5a2e);
  door.position.set(0, 0.85, 1.72);
  g.add(door);
  const knob = sphere(0.08, 0xffc400, 8);
  knob.position.set(0.4, 0.85, 1.85);
  g.add(knob);
  for (const sx of [-1.35, 1.35]) {
    const win = box(0.9, 0.9, 0.12, 0xbfe8ff, { emissive: 0.25 });
    win.position.set(sx, 1.7, 1.72);
    g.add(win);
    const frame = box(1.05, 1.05, 0.1, 0xffffff);
    frame.position.set(sx, 1.7, 1.68);
    g.add(frame);
  }

  // かんばん
  const sign = makeSign(info.icon, info.name, '#ffffff');
  sign.position.set(0, 2.6, 1.85);
  g.add(sign);

  // ふわふわ浮くアイコン
  const iconBase = new THREE.Group();
  iconBase.position.set(0, 5.6, 0);
  g.add(iconBase);
  g.userData.floatIcon = iconBase;

  g.userData.gameKey = spec.key;
  return g;
}

function makeGachaMachine() {
  const g = new THREE.Group();
  const base = cyl(0.7, 0.85, 1.1, 0xff5f9e, 16);
  base.position.y = 0.55;
  g.add(base);
  const dome = sphere(0.75, 0xcfefff, 18, { rough: 0.15 });
  dome.material = new THREE.MeshStandardMaterial({ color: 0xdff4ff, roughness: 0.1, metalness: 0, transparent: true, opacity: 0.55 });
  dome.position.y = 1.7;
  g.add(dome);
  // 中のカプセル
  const capColors = [0xff5f5f, 0xffc400, 0x66e07a, 0x66c2ff, 0xb388ff];
  for (let i = 0; i < 8; i++) {
    const c = sphere(0.16, pick(capColors), 10);
    const a = rand(Math.PI * 2);
    const r = rand(0.1, 0.45);
    c.position.set(Math.cos(a) * r, 1.45 + rand(0.5), Math.sin(a) * r);
    g.add(c);
  }
  const handle = torus(0.18, 0.05, 0xffc400);
  handle.position.set(0, 0.6, 0.72);
  g.add(handle);
  const slot = box(0.4, 0.24, 0.1, 0x552244);
  slot.position.set(0, 0.28, 0.82);
  g.add(slot);
  g.userData.gacha = true;
  return g;
}

function makeFerrisWheel() {
  const g = new THREE.Group();
  const wheel = new THREE.Group();
  wheel.position.y = 6.4;
  const rim = torus(4.4, 0.14, 0xffffff);
  wheel.add(rim);
  const cabColors = [0xff5f9e, 0xffc400, 0x66e07a, 0x66c2ff, 0xb388ff, 0xff9a3b];
  const cabins = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const spoke = box(0.1, 4.4, 0.1, 0xdddddd);
    spoke.position.set(Math.cos(a) * 2.2, Math.sin(a) * 2.2, 0);
    spoke.rotation.z = a + Math.PI / 2;
    wheel.add(spoke);
    const cab = sphere(0.55, cabColors[i], 12);
    cab.scale.y = 0.85;
    cab.position.set(Math.cos(a) * 4.4, Math.sin(a) * 4.4, 0);
    wheel.add(cab);
    cabins.push(cab);
  }
  const hub = cyl(0.35, 0.35, 0.5, 0xffc400, 12);
  hub.rotation.x = Math.PI / 2;
  wheel.add(hub);
  g.add(wheel);
  for (const sx of [-1, 1]) {
    const leg = box(0.3, 6.6, 0.3, 0xff8fb0);
    leg.position.set(sx * 1.4, 3.2, 0);
    leg.rotation.z = sx * -0.22;
    g.add(leg);
  }
  g.userData.wheel = wheel;
  g.userData.cabins = cabins;
  return g;
}

export class TownScene {
  constructor(app) {
    this.app = app;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xbfe8ff, 40, 130);
    this.fx = new FX(this.scene);
    this.sky = createSky(this.scene, { clouds: 12 });
    createLights(this.scene, { shadowSize: 26 });

    this.t = 0;
    this.camAngle = Math.PI / 2; // 正面(sushi側)から
    this.camTargetAngle = this.camAngle;
    this.dragging = false;
    this.dragMoved = 0;
    this.tapTargets = [];
    this.walkTarget = null;
    this.pendingEnter = null;
    this.entering = false;

    this.build();
  }

  build() {
    const s = this.scene;

    // 地面(大きな丸い芝生+広場)
    const grass = cyl(60, 60, 0.5, 0x7ed07a, 48);
    grass.position.y = -0.25;
    grass.receiveShadow = true;
    s.add(grass);
    const plaza = cyl(8.2, 8.2, 0.54, 0xffe9c4, 48);
    plaza.position.y = -0.22;
    plaza.receiveShadow = true;
    s.add(plaza);
    const rim = torus(8.2, 0.18, 0xffb84d);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.06;
    s.add(rim);
    this.groundMeshes = [grass, plaza];

    // お店
    this.shops = [];
    for (const spec of SHOPS) {
      const shop = makeShop(spec);
      const x = Math.cos(spec.angle + Math.PI / 2) * R_SHOP;
      const z = -Math.sin(spec.angle + Math.PI / 2) * R_SHOP;
      shop.position.set(x, 0, z);
      shop.lookAt(0, 0, 0);
      s.add(shop);
      this.shops.push(shop);
      this.tapTargets.push(shop);

      // お店までの小道
      const dir = new THREE.Vector3(x, 0, z).normalize();
      for (let i = 0; i < 4; i++) {
        const stone = cyl(0.45, 0.45, 0.08, 0xfff3d8, 10);
        stone.position.copy(dir.clone().multiplyScalar(8.6 + i * 0.9));
        stone.position.y = 0.04;
        s.add(stone);
      }
    }

    // ふんすい
    const fBase = cyl(1.6, 1.9, 0.6, 0x9fd9ff, 20);
    fBase.position.y = 0.3;
    s.add(fBase);
    const fPole = cyl(0.18, 0.24, 1.2, 0xcfefff, 10);
    fPole.position.y = 1.1;
    s.add(fPole);
    const fTop = sphere(0.35, 0x66c2ff, 12, { emissive: 0.3 });
    fTop.position.y = 1.8;
    s.add(fTop);
    this.fountainPos = new THREE.Vector3(0, 1.8, 0);
    this.fountainT = 0;

    // ガチャマシン
    this.gacha = makeGachaMachine();
    this.gacha.position.set(4.6, 0, 4.6);
    s.add(this.gacha);
    this.tapTargets.push(this.gacha);

    // かんらんしゃ(遠景)
    this.ferris = makeFerrisWheel();
    this.ferris.position.set(-17, 0, -30);
    this.ferris.scale.setScalar(1.6);
    s.add(this.ferris);

    // おはな(広場のまわり)
    const flowerColors = [0xff8fc2, 0xffe36e, 0xff9a5f, 0xb388ff, 0xffffff];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + 0.22;
      const fl = new THREE.Group();
      const stem = cyl(0.03, 0.03, 0.3, 0x59c94a, 5);
      stem.position.y = 0.15;
      fl.add(stem);
      const c = pick(flowerColors);
      for (let p = 0; p < 5; p++) {
        const pa = (p / 5) * Math.PI * 2;
        const petal = sphere(0.07, c, 6);
        petal.scale.y = 0.5;
        petal.position.set(Math.cos(pa) * 0.09, 0.33, Math.sin(pa) * 0.09);
        fl.add(petal);
      }
      const core = sphere(0.06, 0xffc400, 6);
      core.position.y = 0.35;
      fl.add(core);
      fl.position.set(Math.cos(a) * 9.1, 0, Math.sin(a) * 9.1);
      s.add(fl);
    }

    // 木
    for (let i = 0; i < 16; i++) {
      const tree = makeTree(rand(0.8, 1.4));
      const a = rand(Math.PI * 2);
      const r = rand(16, 28);
      tree.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      s.add(tree);
    }

    // ふうせん
    this.balloons = [];
    const balloonColors = [0xff5f9e, 0xffc400, 0x66e07a, 0x66c2ff, 0xb388ff];
    for (let i = 0; i < 6; i++) {
      const b = new THREE.Group();
      const ball = sphere(0.5, pick(balloonColors), 14, { emissive: 0.15 });
      ball.scale.y = 1.15;
      b.add(ball);
      const str = cyl(0.012, 0.012, 1.6, 0xffffff, 4);
      str.position.y = -1.2;
      b.add(str);
      const a = rand(Math.PI * 2);
      const r = rand(9, 18);
      b.position.set(Math.cos(a) * r, rand(4, 7), Math.sin(a) * r);
      b.userData.phase = rand(Math.PI * 2);
      s.add(b);
      this.balloons.push(b);
    }

    // プレイヤー
    this.kid = buildKid({ hat: this.app.state.equippedHat });
    this.kid.position.set(0, 0, 5.5);
    s.add(this.kid);
    this.kidMoving = 0;

    // NPC(おさんぽ)
    this.npcs = [];
    for (let i = 0; i < 4; i++) {
      const npc = buildAnimal(ANIMAL_KEYS[i % ANIMAL_KEYS.length]);
      const a = rand(Math.PI * 2);
      npc.position.set(Math.cos(a) * rand(3, 7), 0, Math.sin(a) * rand(3, 7));
      npc.userData.wanderT = rand(2, 5);
      npc.userData.target = npc.position.clone();
      s.add(npc);
      this.npcs.push(npc);
    }

    // とり
    this.birds = [];
    for (let i = 0; i < 3; i++) {
      const bird = new THREE.Group();
      const body = sphere(0.2, pick([0xffffff, 0xffe36e, 0x9fd9ff]), 10);
      bird.add(body);
      for (const sx of [-1, 1]) {
        const wing = box(0.5, 0.04, 0.22, 0xffffff);
        wing.position.set(sx * 0.3, 0.05, 0);
        bird.add(wing);
        bird.userData[sx < 0 ? 'wingL' : 'wingR'] = wing;
      }
      bird.userData.angle = rand(Math.PI * 2);
      bird.userData.r = rand(10, 16);
      bird.userData.h = rand(7, 11);
      bird.userData.speed = rand(0.25, 0.5);
      s.add(bird);
      this.birds.push(bird);
    }
  }

  activate() {
    this.app.renderer.setScene(this.scene);
    this.app.ui.showHub();
    this.app.ui.setHubHint('あそびたい おみせを タップしてね!');
    this.app.audio.playBgm('town');
  }

  // ---- 入力 ----
  onPointerDown(x, y) {
    this.dragging = true;
    this.dragMoved = 0;
    this.lastX = x;
  }
  onPointerMove(x, y) {
    if (!this.dragging) return;
    const dx = x - this.lastX;
    this.lastX = x;
    this.dragMoved += Math.abs(dx);
    this.camTargetAngle -= dx * 2.2;
  }
  onPointerUp(x, y, raycaster) {
    this.dragging = false;
    if (this.dragMoved > 0.03 || this.entering) return; // ドラッグは回転操作

    // NPCタップ → よろこぶ
    const npcHits = raycaster.intersectObjects(this.npcs, true);
    if (npcHits.length > 0) {
      let n = npcHits[0].object;
      while (n && !n.userData.animalType) n = n.parent;
      if (n) {
        this.app.audio.pop();
        n.userData.hopT = 0;
        this.fx.emoji(n.position.clone().add(new THREE.Vector3(0, 2, 0)), '💖', 2, 0.6);
        return;
      }
    }

    // お店・ガチャ判定
    const hits = raycaster.intersectObjects(this.tapTargets, true);
    if (hits.length > 0) {
      let g = hits[0].object;
      while (g && !g.userData.gameKey && !g.userData.gacha) g = g.parent;
      if (g && g.userData.gacha) {
        this.app.audio.pop();
        this.fx.sparkle(this.gacha.position.clone().add(new THREE.Vector3(0, 1.7, 0)), 8);
        this.app.openGacha();
        return;
      }
      if (g && g.userData.gameKey) {
        this.app.audio.pop();
        const info = GAME_INFO[g.userData.gameKey];
        this.app.ui.setHubHint(`${info.icon} ${info.name} へ いこう!`);
        // お店の前まで歩いてから入店
        const front = g.position.clone().normalize().multiplyScalar(R_SHOP - 3.2);
        this.walkTarget = front;
        this.pendingEnter = g.userData.gameKey;
        return;
      }
    }

    // 地面タップで移動
    const groundHits = raycaster.intersectObjects(this.groundMeshes, false);
    if (groundHits.length > 0) {
      const p = groundHits[0].point;
      const r = Math.hypot(p.x, p.z);
      if (r < 9.5) {
        this.walkTarget = new THREE.Vector3(p.x, 0, p.z);
        this.pendingEnter = null;
        this.app.audio.tap();
        this.fx.ring(new THREE.Vector3(p.x, 0.12, p.z), 0xffd93b);
      }
    }
  }

  update(dt) {
    this.t += dt;
    this.sky.update(dt);
    this.fx.update(dt);

    // カメラ(ゆっくり追従・縦画面では引く)
    this.camAngle = damp(this.camAngle, this.camTargetAngle, 6, dt);
    const aspect = this.app.renderer.aspect;
    const dist = aspect < 1 ? 21 : 16;
    const h = aspect < 1 ? 10.5 : 8;
    const cam = this.app.renderer.camera;
    cam.position.set(Math.cos(this.camAngle) * dist, h, Math.sin(this.camAngle) * dist);
    cam.lookAt(0, 1.6, 0);

    // プレイヤー移動
    if (this.walkTarget) {
      const to = this.walkTarget.clone().sub(this.kid.position);
      to.y = 0;
      const d = to.length();
      if (d > 0.15) {
        to.normalize();
        this.kid.position.addScaledVector(to, dt * 3.4);
        const targetRot = Math.atan2(to.x, to.z);
        this.kid.rotation.y = damp(this.kid.rotation.y, targetRot, 10, dt);
        this.kidMoving = Math.min(1, this.kidMoving + dt * 5);
      } else {
        this.walkTarget = null;
        if (this.pendingEnter && !this.entering) {
          this.entering = true;
          const key = this.pendingEnter;
          this.pendingEnter = null;
          this.app.audio.good();
          setTimeout(() => this.app.enterGame(key), 150);
        }
      }
    } else {
      this.kidMoving = Math.max(0, this.kidMoving - dt * 6);
    }
    animateKid(this.kid, this.t, this.kidMoving);

    // NPC おさんぽ
    for (const npc of this.npcs) {
      npc.userData.wanderT -= dt;
      if (npc.userData.wanderT <= 0) {
        npc.userData.wanderT = rand(3, 7);
        const a = rand(Math.PI * 2);
        npc.userData.target = new THREE.Vector3(Math.cos(a) * rand(2, 7.5), 0, Math.sin(a) * rand(2, 7.5));
      }
      const to = npc.userData.target.clone().sub(npc.position);
      to.y = 0;
      if (to.length() > 0.2) {
        to.normalize();
        npc.position.addScaledVector(to, dt * 1.1);
        npc.rotation.y = damp(npc.rotation.y, Math.atan2(to.x, to.z), 6, dt);
        npc.position.y = Math.abs(Math.sin(this.t * 8 + npc.id)) * 0.08;
      } else {
        npc.position.y = 0;
      }
      // タップされたら ぴょん!
      if (npc.userData.hopT !== undefined && npc.userData.hopT < 0.6) {
        npc.userData.hopT += dt;
        npc.position.y += Math.sin(Math.min(1, npc.userData.hopT / 0.6) * Math.PI) * 0.9;
      }
      animateAnimal(npc, this.t);
    }

    // かんらんしゃ
    this.ferris.userData.wheel.rotation.z += dt * 0.18;
    for (const cab of this.ferris.userData.cabins) {
      // キャビンは水平を保つ
      cab.rotation.z = -this.ferris.userData.wheel.rotation.z;
    }

    // ふうせん・とり
    for (const b of this.balloons) {
      b.position.y += Math.sin(this.t * 0.9 + b.userData.phase) * dt * 0.35;
      b.rotation.z = Math.sin(this.t * 0.7 + b.userData.phase) * 0.08;
    }
    for (const bird of this.birds) {
      bird.userData.angle += dt * bird.userData.speed;
      const a = bird.userData.angle;
      bird.position.set(Math.cos(a) * bird.userData.r, bird.userData.h + Math.sin(a * 3) * 0.6, Math.sin(a) * bird.userData.r);
      bird.rotation.y = -a;
      const flap = Math.sin(this.t * 14) * 0.6;
      bird.userData.wingL.rotation.z = flap;
      bird.userData.wingR.rotation.z = -flap;
    }

    // お店の浮きアイコン+ガチャのゆらぎ
    for (const shop of this.shops) {
      shop.userData.floatIcon.position.y = 5.6 + Math.sin(this.t * 2 + shop.position.x) * 0.2;
    }
    this.gacha.rotation.y = Math.sin(this.t * 0.8) * 0.06;

    // ふんすいの水
    this.fountainT += dt;
    if (this.fountainT > 0.12) {
      this.fountainT = 0;
      this.fx.splash(this.fountainPos, 2);
    }
  }

  refreshHat() {
    setKidHat(this.kid, this.app.state.equippedHat);
  }

  dispose() {
    this.fx.clear();
    disposeScene(this.scene);
  }
}
