// 城下町:広場・噴水・おみせ・街灯・池・ステージ
import * as THREE from 'three';
import { mat, glowMat, shadow, cobbleTexture, grassTexture, brickTexture, roofTexture, makeCanvas, rand, TAU } from '../core/utils.js';

export function buildTown(scene) {
  const colliders = [];
  const updatables = [];
  const town = new THREE.Group();
  scene.add(town);

  // ---------- 地面 ----------
  const grassTex = grassTexture();
  grassTex.repeat.set(18, 18);
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(70, 48),
    new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  town.add(ground);

  // 広場(石畳)
  const cobTex = cobbleTexture();
  cobTex.repeat.set(6, 6);
  const plaza = new THREE.Mesh(
    new THREE.CircleGeometry(15, 40),
    new THREE.MeshStandardMaterial({ map: cobTex, roughness: 0.95 })
  );
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.y = 0.02;
  plaza.receiveShadow = true;
  town.add(plaza);

  // 道
  function path(x1, z1, x2, z2, w = 3) {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const tex = cobbleTexture('#e0cdf2', '#bda3dd');
    tex.repeat.set(w / 3, len / 3);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, len), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
    p.rotation.x = -Math.PI / 2;
    p.rotation.z = -Math.atan2(x2 - x1, z2 - z1);
    p.position.set((x1 + x2) / 2, 0.015, (z1 + z2) / 2);
    p.receiveShadow = true;
    town.add(p);
  }
  path(0, -13, 0, -27, 5);      // 広場 → お城
  path(-10, 8, -16, 10, 3);     // 広場 → はたけ
  path(10, 3, 16, 4, 3);        // 広場 → ベーカリー
  path(-11, -8, -18, -12, 3);   // 広場 → いけ
  path(11, -9, 17, -16, 3);     // 広場 → ほしみの塔

  // ---------- 噴水 ----------
  const fountain = new THREE.Group();
  const stoneMat = mat(0xe8ddf5, { roughness: 0.7 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.6, 0.9, 24), stoneMat);
  base.position.y = 0.45;
  fountain.add(base);
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x7ed4f0, transparent: true, opacity: 0.85,
    roughness: 0.15, metalness: 0.1, emissive: 0x2288aa, emissiveIntensity: 0.15,
  });
  const water = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 2.9, 0.5, 24), waterMat);
  water.position.y = 0.75;
  fountain.add(water);
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 2.4, 12), stoneMat);
  pillar.position.y = 2;
  fountain.add(pillar);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 0.9, 0.5, 16), stoneMat);
  bowl.position.y = 3.2;
  fountain.add(bowl);
  // 上のおほしさま
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.55), glowMat(0xffd76e, 0.8));
  star.position.y = 4.1;
  fountain.add(star);
  // 水のカーテン(半透明コーン)
  const jets = [];
  for (let i = 0; i < 5; i++) {
    const jet = new THREE.Mesh(
      new THREE.ConeGeometry(0.16, 1.6, 8, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xbfeaff, transparent: true, opacity: 0.65, side: THREE.DoubleSide })
    );
    const a = (i / 5) * TAU;
    jet.position.set(Math.cos(a) * 0.9, 3.6, Math.sin(a) * 0.9);
    jet.rotation.z = Math.cos(a) * 0.5;
    jet.rotation.x = -Math.sin(a) * 0.5;
    fountain.add(jet);
    jets.push(jet);
  }
  shadow(fountain, true, true);
  town.add(fountain);
  colliders.push({ x: 0, z: 0, r: 4 });
  updatables.push((dt, t, nightF) => {
    star.rotation.y = t * 1.2;
    star.material.emissiveIntensity = 0.8 + nightF * 1.4 + Math.sin(t * 3) * 0.2;
    water.material.emissiveIntensity = 0.15 + nightF * 0.5;
    for (let i = 0; i < jets.length; i++) {
      jets[i].scale.y = 1 + Math.sin(t * 5 + i) * 0.18;
      jets[i].material.opacity = 0.5 + Math.sin(t * 7 + i * 2) * 0.18;
    }
  });

  // ---------- おうち(ベーカリー・ブティックなど) ----------
  const brick = brickTexture('#fff4e6', '#ecd7bd');
  function house(x, z, ry, roofColor, sign, w = 6, d = 5, h = 3.4) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ map: brick, roughness: 0.9 }));
    body.position.y = h / 2;
    g.add(body);
    const rTex = roofTexture(roofColor.base, roofColor.line);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.82, h * 0.75, 4), new THREE.MeshStandardMaterial({ map: rTex, roughness: 0.8 }));
    roof.position.y = h + h * 0.37;
    roof.rotation.y = Math.PI / 4;
    g.add(roof);
    // ドア
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2, 0.15), mat(0x8a5a30));
    door.position.set(0, 1, d / 2 + 0.05);
    g.add(door);
    // まど(夜あかり)
    const winMats = [];
    for (const wx of [-w / 4 - 0.3, w / 4 + 0.3]) {
      const wm = new THREE.MeshStandardMaterial({ color: 0x8fdcf0, emissive: 0xffe089, emissiveIntensity: 0 });
      const win = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), wm);
      win.position.set(wx, 1.9, d / 2 + 0.03);
      g.add(win);
      winMats.push(wm);
    }
    // かんばん
    if (sign) {
      const signTex = makeCanvas(128, 128, (ctx) => {
        ctx.fillStyle = '#fff8ec';
        ctx.beginPath(); ctx.arc(64, 64, 58, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#c99b5f'; ctx.lineWidth = 8; ctx.stroke();
        ctx.font = '64px serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(sign, 64, 70);
      });
      const s = new THREE.Mesh(new THREE.CircleGeometry(0.7, 20), new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.8 }));
      s.position.set(0, h - 0.5, d / 2 + 0.06);
      g.add(s);
    }
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    shadow(g, true, true);
    town.add(g);
    colliders.push({ x, z, r: Math.max(w, d) * 0.68 });
    updatables.push((dt, t, nightF) => {
      for (const wm of winMats) wm.emissiveIntensity = nightF * 1.2;
    });
    return g;
  }

  house(17, 4, -Math.PI / 2 - 0.2, { base: '#e46fae', line: '#b84e8c' }, '🍰');   // マロンのベーカリー
  house(14, 14, -Math.PI / 2 + 0.4, { base: '#7b5cd6', line: '#5d41b0' }, '👗'); // ブティック
  house(-17, 16, Math.PI / 2 + 0.3, { base: '#5eb890', line: '#3f8f6c' }, '🌷'); // ルナのおうち

  // ほしみの塔(ジジ)
  const towerG = new THREE.Group();
  const tBody = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.4, 7, 12), new THREE.MeshStandardMaterial({ map: brick, roughness: 0.9 }));
  tBody.position.y = 3.5;
  towerG.add(tBody);
  const tRoof = new THREE.Mesh(new THREE.ConeGeometry(2.8, 3.4, 12), mat(0x3b2478));
  tRoof.position.y = 8.6;
  towerG.add(tRoof);
  const tStar = new THREE.Mesh(new THREE.OctahedronGeometry(0.5), glowMat(0xffe089, 1));
  tStar.position.y = 10.6;
  towerG.add(tStar);
  const scopeMat = mat(0xc9a86a, { metalness: 0.5, roughness: 0.4 });
  const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 2.4, 10), scopeMat);
  scope.position.set(0, 7.4, 1.2);
  scope.rotation.x = -0.8;
  towerG.add(scope);
  towerG.position.set(20, 0, -20);
  shadow(towerG, true, true);
  town.add(towerG);
  colliders.push({ x: 20, z: -20, r: 3.2 });
  updatables.push((dt, t, nightF) => {
    tStar.rotation.y = t;
    tStar.material.emissiveIntensity = 0.6 + nightF * 1.6;
  });

  // ---------- ダンスステージ ----------
  const stage = new THREE.Group();
  const stageTex = cobbleTexture('#ffe7f4', '#f0b8d8');
  stageTex.repeat.set(3, 3);
  const stageFloor = new THREE.Mesh(
    new THREE.CylinderGeometry(5, 5.4, 0.5, 24),
    new THREE.MeshStandardMaterial({ map: stageTex, roughness: 0.8 })
  );
  stageFloor.position.y = 0.25;
  stage.add(stageFloor);
  // 光る縁
  const stageRim = new THREE.Mesh(new THREE.TorusGeometry(5.05, 0.14, 8, 40), glowMat(0xff9ecf, 0.7));
  stageRim.rotation.x = Math.PI / 2;
  stageRim.position.y = 0.52;
  stage.add(stageRim);
  // アーチかざり
  for (let i = 0; i < 3; i++) {
    const a = Math.PI + (i - 1) * 0.7;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 4.2, 8), mat(0xf0e0ff));
    pole.position.set(Math.cos(a) * 4.4, 2.1, Math.sin(a) * 4.4);
    stage.add(pole);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), glowMat(0xffd76e, 0.8));
    orb.position.set(Math.cos(a) * 4.4, 4.4, Math.sin(a) * 4.4);
    stage.add(orb);
  }
  stage.position.set(0, 0, 20);
  shadow(stage, true, true);
  town.add(stage);
  updatables.push((dt, t, nightF) => {
    stageRim.material.emissiveIntensity = 0.7 + nightF * 1.2 + Math.sin(t * 4) * 0.3;
  });

  // ---------- いけ ----------
  const pondG = new THREE.Group();
  const pondWaterMat = new THREE.MeshStandardMaterial({
    color: 0x5ec8ec, transparent: true, opacity: 0.88,
    roughness: 0.12, metalness: 0.15, emissive: 0x1a6688, emissiveIntensity: 0.2,
  });
  const pond = new THREE.Mesh(new THREE.CircleGeometry(8, 32), pondWaterMat);
  pond.rotation.x = -Math.PI / 2;
  pond.position.y = 0.04;
  pondG.add(pond);
  const pondEdge = new THREE.Mesh(new THREE.TorusGeometry(8, 0.5, 8, 32), mat(0xd8c8ef, { roughness: 0.8 }));
  pondEdge.rotation.x = Math.PI / 2;
  pondEdge.position.y = 0.12;
  pondG.add(pondEdge);
  // スイレンの葉
  for (let i = 0; i < 6; i++) {
    const lily = new THREE.Mesh(new THREE.CircleGeometry(rand(0.5, 0.9), 12), mat(0x4a9e5c, { roughness: 0.9 }));
    lily.rotation.x = -Math.PI / 2;
    const a = rand(TAU), r = rand(2, 7);
    lily.position.set(Math.cos(a) * r, 0.08, Math.sin(a) * r);
    pondG.add(lily);
    if (i % 2 === 0) {
      const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), glowMat(0xffb7d9, 0.4));
      bloom.position.copy(lily.position).setY(0.22);
      pondG.add(bloom);
    }
  }
  pondG.position.set(-24, 0, -16);
  shadow(pondG, false, true);
  town.add(pondG);
  colliders.push({ x: -24, z: -16, r: 8.6, pond: true });
  updatables.push((dt, t, nightF) => {
    pond.position.y = 0.04 + Math.sin(t * 1.8) * 0.02;
    pondWaterMat.emissiveIntensity = 0.2 + nightF * 0.4;
  });

  // ---------- 街灯 ----------
  const lampGlassMats = [];
  const lampLights = [];
  function lamp(x, z, withLight = false) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 3.2, 8), mat(0x4a3f66, { metalness: 0.4, roughness: 0.5 }));
    pole.position.y = 1.6;
    g.add(pole);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.5, 8), mat(0x4a3f66, { metalness: 0.4, roughness: 0.5 }));
    cap.position.y = 3.65;
    g.add(cap);
    const glassMat = new THREE.MeshStandardMaterial({ color: 0xfff2c8, emissive: 0xffd76e, emissiveIntensity: 0, transparent: true, opacity: 0.9 });
    const glass = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), glassMat);
    glass.position.y = 3.3;
    g.add(glass);
    lampGlassMats.push(glassMat);
    if (withLight) {
      const l = new THREE.PointLight(0xffd9a0, 0, 14, 1.8);
      l.position.y = 3.3;
      g.add(l);
      lampLights.push(l);
    }
    g.position.set(x, 0, z);
    shadow(g, true, false);
    town.add(g);
    colliders.push({ x, z, r: 0.42 });
  }
  const lampR = 13.4;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + 0.26;
    lamp(Math.cos(a) * lampR, Math.sin(a) * lampR, i % 2 === 0);
  }
  lamp(-4, 24, true);
  lamp(-16, 10);
  lamp(16, -12);
  updatables.push((dt, t, nightF) => {
    for (const m of lampGlassMats) m.emissiveIntensity = nightF * (1.6 + Math.sin(t * 8 + m.id) * 0.12);
    for (const l of lampLights) l.intensity = nightF * 8;
  });

  // ---------- ベンチ ----------
  function bench(x, z, ry) {
    const g = new THREE.Group();
    const wood = mat(0xa06a3c, { roughness: 0.85 });
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2, 0.14, 0.6), wood);
    seat.position.y = 0.55;
    g.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 0.1), wood);
    back.position.set(0, 0.95, -0.26);
    g.add(back);
    for (const sx of [-0.8, 0.8]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.55, 0.5), wood);
      leg.position.set(sx, 0.27, 0);
      g.add(leg);
    }
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    shadow(g, true, false);
    town.add(g);
    colliders.push({ x, z, r: 1 });
  }
  bench(-8, -10, 0.8);
  bench(8, -10, -0.8);
  bench(-10, 16, 2.4);

  // ---------- はたけ(ガーデン)エリアの土台 ----------
  const gardenBase = new THREE.Mesh(
    new THREE.BoxGeometry(11, 0.24, 8),
    mat(0xb08a5a, { roughness: 1 })
  );
  gardenBase.position.set(-16, 0.1, 8);
  gardenBase.receiveShadow = true;
  town.add(gardenBase);
  // 柵
  const fenceMat = mat(0xfff4e0, { roughness: 0.8 });
  function fencePost(x, z) {
    const f = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.9, 6), fenceMat);
    f.position.set(x, 0.45, z);
    f.castShadow = true;
    town.add(f);
  }
  for (let i = 0; i <= 6; i++) {
    fencePost(-21.5 + i * 1.85, 3.8);
    fencePost(-21.5 + i * 1.85, 12.2);
  }
  for (let i = 1; i < 4; i++) {
    fencePost(-21.5, 3.8 + i * 2.1);
    fencePost(-10.4, 3.8 + i * 2.1);
  }

  // ガーデンの植えつけ位置(farming が使う)
  const gardenPlots = [];
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) {
      gardenPlots.push({ x: -19.2 + c * 3.2, z: 6.2 + r * 3.6 });
    }
  }

  return {
    colliders,
    gardenPlots,
    pondCenter: { x: -24, z: -16, r: 8.6 },
    stageCenter: { x: 0, z: 20, r: 5 },
    update(dt, t, nightF) {
      for (const u of updatables) u(dt, t, nightF);
    },
  };
}
