// 自然:木・花・ちょうちょ・ほたる・小鳥
import * as THREE from 'three';
import { mat, glowMat, shadow, rand, pick, TAU, glowTexture } from '../core/utils.js';
import { BUGS } from '../game/data.js';

export function buildNature(scene) {
  const colliders = [];
  const trees = [];   // { x, z, honey: bool, group }
  const group = new THREE.Group();
  scene.add(group);

  // ---------- 木 ----------
  const trunkMat = mat(0x8a5a30, { roughness: 0.95 });
  function tree(x, z, type = 'green') {
    const g = new THREE.Group();
    const h = rand(2.4, 3.4);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, h, 8), trunkMat);
    trunk.position.y = h / 2;
    g.add(trunk);
    const leafColor = { green: 0x5cb860, sakura: 0xffb7d9, gold: 0xffd76e }[type];
    const leafM = mat(leafColor, { roughness: 0.9 });
    const n = 3;
    for (let i = 0; i < n; i++) {
      const s = rand(1.1, 1.7);
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(s, 10, 8), leafM);
      leaf.position.set(rand(-0.7, 0.7), h + rand(0, 1.1), rand(-0.7, 0.7));
      leaf.scale.y = 0.85;
      g.add(leaf);
    }
    // りんご or 花のかざり
    if (type === 'green' && Math.random() < 0.5) {
      for (let i = 0; i < 4; i++) {
        const apple = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), mat(0xe84a4a, { roughness: 0.5 }));
        const a = rand(TAU);
        apple.position.set(Math.cos(a) * rand(0.8, 1.4), h + rand(0.2, 1), Math.sin(a) * rand(0.8, 1.4));
        g.add(apple);
      }
      g.userData.fruit = 'apple';
    }
    if (type === 'sakura') g.userData.fruit = Math.random() < 0.6 ? 'honey' : null;
    g.position.set(x, 0, z);
    g.rotation.y = rand(TAU);
    shadow(g, true, false);
    group.add(g);
    colliders.push({ x, z, r: 0.6 });
    trees.push({ x, z, group: g, fruit: g.userData.fruit, cooldown: 0 });
    return g;
  }

  // 外周リング + ところどころ
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * TAU + rand(-0.08, 0.08);
    const r = rand(42, 58);
    tree(Math.cos(a) * r, Math.sin(a) * r, pick(['green', 'green', 'sakura', 'gold']));
  }
  tree(-8, 22, 'sakura');
  tree(8, 24, 'green');
  tree(24, 10, 'sakura');
  tree(-28, 2, 'green');
  tree(28, -6, 'gold');
  tree(-12, -22, 'sakura');
  tree(12, -22, 'green');

  // ---------- お花畑(インスタンス) ----------
  const FLW_N = 90;
  const headGeo = new THREE.IcosahedronGeometry(0.14, 0);
  const headMat = new THREE.MeshStandardMaterial({ roughness: 0.7 });
  const heads = new THREE.InstancedMesh(headGeo, headMat, FLW_N);
  const stemGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.3, 5);
  const stems = new THREE.InstancedMesh(stemGeo, mat(0x4a9e5c), FLW_N);
  const dummy = new THREE.Object3D();
  const palette = [0xff8fc0, 0xffd76e, 0xffffff, 0xc3a6ff, 0xff9e5e, 0x8fd0ff];
  for (let i = 0; i < FLW_N; i++) {
    let x, z, d;
    do {
      const a = rand(TAU), r = rand(16, 44);
      x = Math.cos(a) * r; z = Math.sin(a) * r;
      d = Math.hypot(x + 24, z + 16); // 池を避ける
    } while (d < 10);
    dummy.position.set(x, 0.34, z);
    dummy.rotation.set(rand(-0.2, 0.2), rand(TAU), rand(-0.2, 0.2));
    dummy.updateMatrix();
    heads.setMatrixAt(i, dummy.matrix);
    heads.setColorAt(i, new THREE.Color(pick(palette)));
    dummy.position.y = 0.15;
    dummy.updateMatrix();
    stems.setMatrixAt(i, dummy.matrix);
  }
  heads.instanceMatrix.needsUpdate = true;
  if (heads.instanceColor) heads.instanceColor.needsUpdate = true;
  group.add(heads);
  group.add(stems);

  // ---------- ちょうちょ / ほたる ----------
  const bugs = [];  // {group, def, t, cx, cz, r, speed, alive}
  const fireflyTex = glowTexture('rgba(210,255,140,1)', 'rgba(210,255,140,0)');

  function makeButterfly(def) {
    const g = new THREE.Group();
    const color = { bug_pink: 0xffb7d9, bug_blue: 0x8fd0ff, bug_gold: 0xffd76e, bug_fairy: 0xd8b8ff }[def.id] || 0xffffff;
    const wingMat = new THREE.MeshStandardMaterial({
      color, side: THREE.DoubleSide, roughness: 0.6,
      emissive: color, emissiveIntensity: def.rarity >= 3 ? 0.5 : 0.1,
    });
    const wingGeo = new THREE.CircleGeometry(0.28, 8);
    const wl = new THREE.Mesh(wingGeo, wingMat);
    wl.position.x = -0.16;
    const wr = new THREE.Mesh(wingGeo, wingMat);
    wr.position.x = 0.16;
    g.add(wl, wr);
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.24, 3, 6), mat(0x553a22));
    body.rotation.x = Math.PI / 2;
    g.add(body);
    g.userData.wings = [wl, wr];
    return g;
  }

  function makeFirefly(def) {
    const g = new THREE.Group();
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: fireflyTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    sp.scale.setScalar(0.7);
    g.add(sp);
    g.userData.sprite = sp;
    return g;
  }

  function spawnBug(isNight) {
    const candidates = BUGS.filter((b) => !!b.night === isNight);
    // レア度で重みづけ
    const weighted = [];
    for (const b of candidates) weighted.push(...Array(Math.max(1, 5 - b.rarity)).fill(b));
    const def = pick(weighted);
    const g = def.night ? makeFirefly(def) : makeButterfly(def);
    const a = rand(TAU), r = rand(8, 34);
    const bug = {
      group: g, def,
      t: rand(100),
      cx: Math.cos(a) * r, cz: Math.sin(a) * r,
      r: rand(2, 5), speed: rand(0.5, 1.1),
      alive: true, night: !!def.night,
    };
    g.position.set(bug.cx, rand(0.8, 1.8), bug.cz);
    group.add(g);
    bugs.push(bug);
  }

  for (let i = 0; i < 5; i++) spawnBug(false);

  let respawnT = 0;

  return {
    colliders,
    trees,
    bugs,
    catchBug(bug) {
      bug.alive = false;
      group.remove(bug.group);
      const i = bugs.indexOf(bug);
      if (i >= 0) bugs.splice(i, 1);
    },
    update(dt, t, nightF) {
      const isNight = nightF > 0.6;
      // 昼夜で入れ替え
      respawnT -= dt;
      if (respawnT <= 0) {
        respawnT = rand(3, 7);
        // 時間帯に合わない虫を消す
        for (let i = bugs.length - 1; i >= 0; i--) {
          if (bugs[i].night !== isNight) {
            group.remove(bugs[i].group);
            bugs.splice(i, 1);
          }
        }
        const maxN = isNight ? 5 : 6;
        if (bugs.length < maxN) spawnBug(isNight);
      }
      // 飛行
      for (const b of bugs) {
        b.t += dt * b.speed;
        const px = b.cx + Math.cos(b.t) * b.r + Math.sin(b.t * 2.3) * 0.8;
        const pz = b.cz + Math.sin(b.t * 0.9) * b.r;
        const py = 1.1 + Math.sin(b.t * 1.7) * 0.5 + (b.night ? 0.3 : 0);
        const dir = Math.atan2(px - b.group.position.x, pz - b.group.position.z);
        b.group.rotation.y = dir;
        b.group.position.set(px, py, pz);
        if (b.group.userData.wings) {
          const flap = Math.sin(b.t * 18) * 0.9;
          b.group.userData.wings[0].rotation.y = flap;
          b.group.userData.wings[1].rotation.y = -flap;
        }
        if (b.group.userData.sprite) {
          b.group.userData.sprite.material.opacity = 0.55 + Math.sin(b.t * 6) * 0.45;
        }
      }
    },
  };
}
