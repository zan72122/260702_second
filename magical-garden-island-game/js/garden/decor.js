// デコレーション(かざり)の3Dモデルと配置管理
import * as THREE from 'three';
import { rand, TAU } from '../core/utils.js';
import { groundHeight, isOnLand } from '../world/island.js';

const woodMat = new THREE.MeshLambertMaterial({ color: 0xc98a5a });
const whiteMat = new THREE.MeshLambertMaterial({ color: 0xfff4fa });
const pinkMat = new THREE.MeshLambertMaterial({ color: 0xff9ecb });
const goldMat = new THREE.MeshLambertMaterial({ color: 0xffd166, emissive: 0x805a10, emissiveIntensity: 0.25 });
const greenMat = new THREE.MeshLambertMaterial({ color: 0x5fbf58 });

// ---------- 各デコのビルダー ----------
const BUILDERS = {
  bench(g) {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.12, 0.55), woodMat);
    seat.position.y = 0.5;
    g.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.5, 0.1), woodMat);
    back.position.set(0, 0.85, -0.24);
    back.rotation.x = -0.15;
    g.add(back);
    for (const sx of [-0.7, 0.7]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.5), woodMat);
      leg.position.set(sx, 0.25, 0);
      g.add(leg);
    }
    // はしに小花
    for (const sx of [-0.85, 0.85]) {
      const fl = new THREE.Mesh(new THREE.SphereGeometry(0.12, 7, 5), pinkMat);
      fl.position.set(sx, 0.62, 0.2);
      g.add(fl);
    }
  },

  lantern(g) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 1.7, 7), new THREE.MeshLambertMaterial({ color: 0x8a6aa8 }));
    pole.position.y = 0.85;
    g.add(pole);
    const cage = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 7), new THREE.MeshPhongMaterial({
      color: 0xfff0c0, emissive: 0xffc86a, emissiveIntensity: 0.9, transparent: true, opacity: 0.95,
    }));
    cage.position.y = 1.85;
    g.add(cage);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.28, 8), goldMat);
    cap.position.y = 2.15;
    g.add(cap);
    g.userData.lightMesh = cage;
    g.userData.light = new THREE.PointLight(0xffc86a, 0, 8, 1.8);
    g.userData.light.position.y = 1.85;
    g.add(g.userData.light);
  },

  arch(g) {
    const mat = whiteMat;
    const r = 1.3;
    const torus = new THREE.Mesh(new THREE.TorusGeometry(r, 0.1, 8, 22, Math.PI), mat);
    torus.position.y = 1.5;
    g.add(torus);
    for (const sx of [-r, r]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.5, 7), mat);
      pole.position.set(sx, 0.75, 0);
      g.add(pole);
    }
    // バラをまきつける
    for (let i = 0; i < 10; i++) {
      const t = i / 9;
      const a = Math.PI * t;
      const rose = new THREE.Mesh(new THREE.SphereGeometry(0.11, 7, 5),
        i % 2 ? pinkMat : new THREE.MeshLambertMaterial({ color: 0xe8305a }));
      rose.position.set(Math.cos(a) * r, 1.5 + Math.sin(a) * r, rand(-0.08, 0.08));
      g.add(rose);
      if (i % 2) {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), greenMat);
        leaf.position.set(Math.cos(a) * (r + 0.14), 1.44 + Math.sin(a) * r, 0.05);
        g.add(leaf);
      }
    }
  },

  teatable(g) {
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.08, 16), whiteMat);
    top.position.y = 0.62;
    g.add(top);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 0.6, 8), whiteMat);
    leg.position.y = 0.31;
    g.add(leg);
    // ティーポットとカップ
    const pot = new THREE.Mesh(new THREE.SphereGeometry(0.18, 9, 7), pinkMat);
    pot.position.set(0, 0.8, 0);
    g.add(pot);
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), goldMat);
    lid.position.set(0, 0.94, 0);
    g.add(lid);
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.22, 6), pinkMat);
    spout.position.set(0.2, 0.84, 0);
    spout.rotation.z = -0.9;
    g.add(spout);
    for (const a of [1, 3]) {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.09, 8), whiteMat);
      cup.position.set(Math.cos(a) * 0.42, 0.71, Math.sin(a) * 0.42);
      g.add(cup);
    }
    // ケーキ
    const cake = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.1, 10), new THREE.MeshLambertMaterial({ color: 0xfff0d8 }));
    cake.position.set(-0.3, 0.71, 0.2);
    g.add(cake);
    const berry = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), new THREE.MeshLambertMaterial({ color: 0xe8305a }));
    berry.position.set(-0.3, 0.8, 0.2);
    g.add(berry);
  },

  swing(g) {
    const frameMat = whiteMat;
    for (const sx of [-1, 1]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.3, 7), frameMat);
      pole.position.set(sx, 1.15, 0);
      g.add(pole);
    }
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.3, 7), frameMat);
    beam.rotation.z = Math.PI / 2;
    beam.position.y = 2.3;
    g.add(beam);
    // ゆれる部分
    const seatG = new THREE.Group();
    seatG.position.y = 2.3;
    for (const sx of [-0.35, 0.35]) {
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.45, 5), pinkMat);
      rope.position.set(sx, -0.72, 0);
      seatG.add(rope);
    }
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.4), woodMat);
    seat.position.y = -1.45;
    seatG.add(seat);
    // おはなのかざり
    for (let i = 0; i < 4; i++) {
      const fl = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), i % 2 ? pinkMat : goldMat);
      fl.position.set(-0.45 + i * 0.3, -1.4, 0.2);
      seatG.add(fl);
    }
    g.add(seatG);
    g.userData.swingSeat = seatG;
  },

  fountain(g) {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.3, 0.4, 18), whiteMat);
    base.position.y = 0.2;
    g.add(base);
    const water = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.02, 0.1, 18),
      new THREE.MeshPhongMaterial({ color: 0x8fe8ff, emissive: 0x2a88aa, emissiveIntensity: 0.35, transparent: true, opacity: 0.9 }));
    water.position.y = 0.42;
    g.add(water);
    const mid = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.8, 10), whiteMat);
    mid.position.y = 0.8;
    g.add(mid);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.2, 0.24, 12), whiteMat);
    bowl.position.y = 1.2;
    g.add(bowl);
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0),
      new THREE.MeshPhongMaterial({ color: 0x9be8ff, emissive: 0x44aadd, emissiveIntensity: 0.8, transparent: true, opacity: 0.95 }));
    gem.position.y = 1.6;
    g.add(gem);
    g.userData.gem = gem;
    g.userData.isFountain = true;
  },

  topiary(g) {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.26, 0.4, 10), new THREE.MeshLambertMaterial({ color: 0xe8a0c0 }));
    pot.position.y = 0.2;
    g.add(pot);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.8, 6), woodMat);
    stem.position.y = 0.7;
    g.add(stem);
    // ハート型(球2つ+回転コーン)
    const heart = new THREE.Group();
    heart.position.y = 1.45;
    for (const sx of [-0.18, 0.18]) {
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), greenMat);
      ball.position.set(sx, 0.12, 0);
      heart.add(ball);
    }
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.55, 4), greenMat);
    tip.rotation.x = Math.PI;
    tip.rotation.y = Math.PI / 4;
    tip.position.y = -0.2;
    heart.add(tip);
    // 小花をちりばめ
    for (let i = 0; i < 6; i++) {
      const fl = new THREE.Mesh(new THREE.SphereGeometry(0.05, 5, 4), pinkMat);
      const a = rand(TAU);
      fl.position.set(Math.cos(a) * 0.32, rand(-0.2, 0.3), Math.sin(a) * 0.28);
      heart.add(fl);
    }
    g.add(heart);
  },

  unicorn(g) {
    const bodyMat = new THREE.MeshPhongMaterial({ color: 0xfff8ff, emissive: 0x8888cc, emissiveIntensity: 0.12, shininess: 60 });
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.0, 0.5, 14), whiteMat);
    pedestal.position.y = 0.25;
    g.add(pedestal);
    // どう
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 9), bodyMat);
    body.scale.set(1.5, 1, 1);
    body.position.y = 1.25;
    g.add(body);
    // くび〜あたま
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.7, 8), bodyMat);
    neck.position.set(0.5, 1.7, 0);
    neck.rotation.z = -0.5;
    g.add(neck);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), bodyMat);
    head.scale.set(1.4, 1, 1);
    head.position.set(0.78, 2.0, 0);
    g.add(head);
    // つの
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.5, 7), goldMat);
    horn.position.set(0.85, 2.35, 0);
    horn.rotation.z = -0.3;
    g.add(horn);
    g.userData.horn = horn;
    // あし
    for (const [lx, lz] of [[-0.4, 0.2], [-0.4, -0.2], [0.4, 0.2], [0.4, -0.2]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.8, 7), bodyMat);
      leg.position.set(lx, 0.85, lz);
      g.add(leg);
    }
    // たてがみ(にじいろ)
    const cols = [0xff8ac2, 0xffd166, 0x7de8a2, 0x66c7ff, 0xb388ff];
    for (let i = 0; i < 5; i++) {
      const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), new THREE.MeshLambertMaterial({ color: cols[i] }));
      tuft.position.set(0.32 + i * 0.1, 2.12 - i * 0.14, 0);
      g.add(tuft);
    }
    // しっぽ
    for (let i = 0; i < 3; i++) {
      const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), new THREE.MeshLambertMaterial({ color: cols[(i + 2) % 5] }));
      tuft.position.set(-0.65 - i * 0.07, 1.2 - i * 0.14, 0);
      g.add(tuft);
    }
  },

  gazebo(g) {
    const r = 1.6;
    // ゆか
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(r, r + 0.15, 0.25, 8), whiteMat);
    floor.position.y = 0.13;
    g.add(floor);
    // はしら
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.1, 8), whiteMat);
      pole.position.set(Math.cos(a) * (r - 0.2), 1.3, Math.sin(a) * (r - 0.2));
      g.add(pole);
    }
    // やね
    const roof = new THREE.Mesh(new THREE.ConeGeometry(r + 0.3, 1.1, 8), pinkMat);
    roof.position.y = 2.9;
    g.add(roof);
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), goldMat);
    finial.position.y = 3.55;
    g.add(finial);
    // 旗
    const flag = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.4, 4), goldMat);
    flag.rotation.z = -Math.PI / 2;
    flag.position.set(0.22, 3.72, 0);
    g.add(flag);
    // 手すり
    for (let i = 0; i < 6; i++) {
      if (i === 0) continue; // 入り口
      const a1 = (i / 6) * TAU, a2 = ((i + 1) / 6) * TAU;
      const mx = (Math.cos(a1) + Math.cos(a2)) / 2 * (r - 0.2);
      const mz = (Math.sin(a1) + Math.sin(a2)) / 2 * (r - 0.2);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.07, 0.07), whiteMat);
      rail.position.set(mx, 0.75, mz);
      rail.rotation.y = -((a1 + a2) / 2) + Math.PI / 2;
      g.add(rail);
    }
    g.userData.isGazebo = true;
  },
};

export function buildDecorMesh(type) {
  const g = new THREE.Group();
  BUILDERS[type]?.(g);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

export class DecorManager {
  constructor(scene, state, particles) {
    this.scene = scene;
    this.state = state;
    this.particles = particles;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.items = []; // {mesh, data}
    this.state.data.decors.forEach((d) => this.addMesh(d));
  }

  addMesh(data) {
    const mesh = buildDecorMesh(data.type);
    mesh.position.set(data.x, groundHeight(data.x, data.z), data.z);
    mesh.rotation.y = data.rot || 0;
    mesh.traverse((o) => { o.userData.decor = true; });
    this.group.add(mesh);
    this.items.push({ mesh, data });
    return mesh;
  }

  place(type, x, z, rot) {
    if (!isOnLand(x, z)) return false;
    const data = { type, x, z, rot };
    this.state.data.decors.push(data);
    this.state.stat('decorPlaced');
    this.state.save();
    const mesh = this.addMesh(data);
    this.particles.burst(mesh.position.clone().add(new THREE.Vector3(0, 1, 0)), 0xc9a6ff, 16, 2.2);
    return true;
  }

  update(dt, env) {
    const nm = env.nightMix;
    this.items.forEach(({ mesh }) => {
      // ランタンは夜ひかる
      if (mesh.userData.light) {
        mesh.userData.light.intensity = nm * 2.2;
        mesh.userData.lightMesh.material.emissiveIntensity = 0.35 + nm * 1.1;
      }
      // ブランコがゆれる
      if (mesh.userData.swingSeat) {
        mesh.userData.swingSeat.rotation.x = Math.sin(env.elapsed * 1.1 + mesh.position.x) * 0.28;
      }
      // ふんすいの水しぶき
      if (mesh.userData.isFountain && Math.random() < dt * 12) {
        this.particles.fountainSpray(mesh.position.clone().add(new THREE.Vector3(0, 1.6, 0)));
      }
      if (mesh.userData.gem) mesh.userData.gem.rotation.y += dt * 1.2;
      if (mesh.userData.horn) {
        // ユニコーンのつのがきらめく
        if (Math.random() < dt * 1.5) {
          const wp = new THREE.Vector3();
          mesh.userData.horn.getWorldPosition(wp);
          this.particles.sparkleTrail(wp, 0xffe9a0);
        }
      }
    });
  }
}
