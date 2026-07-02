// 島の地形・木・小道・まほうのふんすい・にじのはし
import * as THREE from 'three';
import { rand, TAU, clamp, smoothstep } from '../core/utils.js';

export const ISLAND_R = 26;          // メイン島の半径
export const ISLE2_CENTER = new THREE.Vector3(0, 0, -44); // ひみつのにわ
export const ISLE2_R = 12;

// 地形の高さ関数(歩行にも使う)
export function groundHeight(x, z) {
  const d1 = Math.hypot(x, z);
  const d2 = Math.hypot(x - ISLE2_CENTER.x, z - ISLE2_CENTER.z);
  let h = -2.2;
  // メイン島: なだらかなおか(ふちは水面下までしずむ)
  if (d1 < ISLAND_R + 6) {
    const k = smoothstep(ISLAND_R + 2, ISLAND_R - 6, d1);
    const hill = 0.5 * Math.cos(d1 * 0.09) + 0.2 * Math.sin(x * 0.18) * Math.cos(z * 0.15);
    h = Math.max(h, k * (1.65 + hill) - 1.0);
  }
  // ひみつのにわ
  if (d2 < ISLE2_R + 5) {
    const k = smoothstep(ISLE2_R + 3.5, ISLE2_R - 3, d2);
    h = Math.max(h, k * 1.85 - 1.0);
  }
  return h;
}

export function isOnLand(x, z) {
  return groundHeight(x, z) > 0.05;
}

// はしの上か(にじのはし: メイン島とひみつのにわの間)
export function isOnBridge(x, z) {
  return Math.abs(x) < 2.2 && z < -22 && z > -35.5;
}

export class Island {
  constructor(scene, state) {
    this.scene = scene;
    this.state = state;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.animated = []; // update(dt, env) を持つもの

    this.buildTerrain();
    this.buildBeachFoam();
    this.buildPaths();
    this.buildTrees();
    this.buildRocksAndGrass();
    this.buildMagicFountain();
    this.buildBridge();
    this.buildAmbientFlowers();
  }

  // ---------- 地形 ----------
  buildTerrain() {
    const geo = new THREE.PlaneGeometry(130, 130, 110, 110);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const grass = new THREE.Color(0x6fce59);
    const grassDark = new THREE.Color(0x4fae4b);
    const sand = new THREE.Color(0xf7e3a8);
    const tmp = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const h = groundHeight(x, z);
      pos.setY(i, h);
      // 高さと乱数で色を決める
      if (h < 0.28) tmp.copy(sand);
      else {
        tmp.copy(grass).lerp(grassDark, clamp((Math.sin(x * 0.5) * Math.cos(z * 0.45) + 1) * 0.32 + rand(0.08), 0, 1));
        // すなとの境目をなじませる
        if (h < 0.55) tmp.lerp(sand, (0.55 - h) / 0.3);
      }
      colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.terrain = new THREE.Mesh(geo, mat);
    this.terrain.receiveShadow = true;
    this.group.add(this.terrain);
  }

  // ---------- 波うちぎわの泡 ----------
  buildBeachFoam() {
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false });
    const mk = (cx, cz, r) => {
      const ring = new THREE.Mesh(new THREE.RingGeometry(r, r + 1.1, 64), mat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(cx, -0.32, cz);
      this.group.add(ring);
      this.animated.push({
        update: (dt, env) => {
          const s = 1 + Math.sin(env.elapsed * 0.9 + cx) * 0.03;
          ring.scale.setScalar(s);
          ring.material.opacity = 0.4 + Math.sin(env.elapsed * 0.9 + cx) * 0.18;
        },
      });
    };
    mk(0, 0, ISLAND_R - 0.5);
    mk(ISLE2_CENTER.x, ISLE2_CENTER.z, ISLE2_R + 0.5);
  }

  // ---------- 小道 ----------
  buildPaths() {
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0xf2d9e8 });
    const stoneMat2 = new THREE.MeshLambertMaterial({ color: 0xe8c8f0 });
    const addStone = (x, z, i) => {
      const s = rand(0.55, 0.8);
      const stone = new THREE.Mesh(
        new THREE.CylinderGeometry(s, s * 1.08, 0.14, 7),
        i % 2 ? stoneMat : stoneMat2,
      );
      stone.position.set(x, groundHeight(x, z) + 0.06, z);
      stone.rotation.y = rand(TAU);
      stone.receiveShadow = true;
      this.group.add(stone);
    };
    // ふんすいから4方向へ
    for (let dir = 0; dir < 4; dir++) {
      const ang = dir * Math.PI / 2 + Math.PI / 4;
      for (let i = 2; i < 14; i++) {
        const r = i * 1.5 + 2.5;
        if (r > ISLAND_R - 5.5) break;
        const wob = Math.sin(i * 0.9 + dir) * 0.9;
        addStone(Math.cos(ang) * r + Math.cos(ang + Math.PI / 2) * wob, Math.sin(ang) * r + Math.sin(ang + Math.PI / 2) * wob, i);
      }
    }
    // 北(はし)へまっすぐ
    for (let i = 0; i < 10; i++) addStone(rand(-0.5, 0.5), -6 - i * 1.7, i);
  }

  // ---------- 木 ----------
  buildTrees() {
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x9a6a4a });
    const sakuraMats = [
      new THREE.MeshLambertMaterial({ color: 0xffb3d9 }),
      new THREE.MeshLambertMaterial({ color: 0xff9ecb }),
      new THREE.MeshLambertMaterial({ color: 0xffc7e2 }),
    ];
    const greenMats = [
      new THREE.MeshLambertMaterial({ color: 0x5fbf58 }),
      new THREE.MeshLambertMaterial({ color: 0x74d465 }),
    ];

    const makeTree = (x, z, sakura) => {
      const tree = new THREE.Group();
      const h = rand(2.4, 3.6);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, h, 7), trunkMat);
      trunk.position.y = h / 2;
      trunk.castShadow = true;
      tree.add(trunk);
      const mats = sakura ? sakuraMats : greenMats;
      const n = 3 + Math.floor(rand(3));
      for (let i = 0; i < n; i++) {
        const s = rand(1.0, 1.7);
        const puff = new THREE.Mesh(new THREE.SphereGeometry(s, 9, 7), mats[i % mats.length]);
        puff.position.set(rand(-0.9, 0.9), h + rand(-0.3, 1.1), rand(-0.9, 0.9));
        puff.castShadow = true;
        tree.add(puff);
      }
      tree.position.set(x, groundHeight(x, z), z);
      tree.rotation.y = rand(TAU);
      const sway = rand(0.5, 1.2);
      this.animated.push({
        update: (dt, env) => { tree.rotation.z = Math.sin(env.elapsed * sway) * 0.012; },
      });
      this.group.add(tree);
    };

    // 島のふちにそって
    const treeSpots = [];
    for (let i = 0; i < 14; i++) {
      const ang = (i / 14) * TAU + rand(-0.15, 0.15);
      // 北側(はし方向)はあけておく
      if (Math.abs(ang - Math.PI * 1.5) < 0.5) continue;
      const r = ISLAND_R - rand(4.5, 7.5);
      treeSpots.push([Math.cos(ang) * r, Math.sin(ang) * r]);
    }
    treeSpots.forEach(([x, z], i) => makeTree(x, z, i % 3 !== 2));
    // ひみつのにわにも数本
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * TAU + 0.4;
      makeTree(ISLE2_CENTER.x + Math.cos(ang) * (ISLE2_R - 3.4), ISLE2_CENTER.z + Math.sin(ang) * (ISLE2_R - 3.4), true);
    }
  }

  // ---------- 岩・草むら ----------
  buildRocksAndGrass() {
    const rockMat = new THREE.MeshLambertMaterial({ color: 0xb9c4d6 });
    for (let i = 0; i < 8; i++) {
      const ang = rand(TAU);
      const r = ISLAND_R - rand(4, 7);
      const x = Math.cos(ang) * r, z = Math.sin(ang) * r;
      if (!isOnLand(x, z)) continue;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rand(0.4, 0.9), 0), rockMat);
      rock.position.set(x, groundHeight(x, z) + 0.15, z);
      rock.rotation.set(rand(TAU), rand(TAU), 0);
      rock.castShadow = true;
      this.group.add(rock);
    }

    // 草むら(インスタンス)
    const grassGeo = new THREE.ConeGeometry(0.16, 0.42, 5);
    const grassMat = new THREE.MeshLambertMaterial({ color: 0x67cf5d });
    const count = 350;
    const inst = new THREE.InstancedMesh(grassGeo, grassMat, count);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const eul = new THREE.Euler();
    let placed = 0;
    let guard = 0;
    while (placed < count && guard++ < 3000) {
      let x, z;
      if (Math.random() < 0.82) {
        const ang = rand(TAU), r = Math.sqrt(Math.random()) * (ISLAND_R - 2.5);
        x = Math.cos(ang) * r; z = Math.sin(ang) * r;
      } else {
        const ang = rand(TAU), r = Math.sqrt(Math.random()) * (ISLE2_R - 2.5);
        x = ISLE2_CENTER.x + Math.cos(ang) * r; z = ISLE2_CENTER.z + Math.sin(ang) * r;
      }
      const h = groundHeight(x, z);
      if (h < 0.45) continue;
      eul.set(rand(-0.12, 0.12), rand(TAU), rand(-0.12, 0.12));
      q.setFromEuler(eul);
      m.compose(
        new THREE.Vector3(x, h + 0.22, z),
        q,
        new THREE.Vector3(1, rand(0.7, 1.5), 1),
      );
      inst.setMatrixAt(placed, m);
      placed++;
    }
    inst.count = placed;
    this.group.add(inst);
  }

  // ---------- まほうのふんすい(島の中心) ----------
  buildMagicFountain() {
    const g = new THREE.Group();
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0xf0e4f7 });
    const trimMat = new THREE.MeshLambertMaterial({ color: 0xd9b8f0 });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.7, 0.7, 24), stoneMat);
    base.position.y = 0.35;
    base.castShadow = base.receiveShadow = true;
    g.add(base);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(3.3, 0.22, 10, 28), trimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.72;
    g.add(rim);
    const pool = new THREE.Mesh(
      new THREE.CylinderGeometry(3.1, 3.1, 0.12, 24),
      new THREE.MeshLambertMaterial({ color: 0x7fd8f0, transparent: true, opacity: 0.85 }),
    );
    pool.position.y = 0.66;
    g.add(pool);
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.6, 1.7, 12), stoneMat);
    pillar.position.y = 1.4;
    pillar.castShadow = true;
    g.add(pillar);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 0.5, 0.5, 16), trimMat);
    bowl.position.y = 2.3;
    bowl.castShadow = true;
    g.add(bowl);

    // 大きなまほうのクリスタル
    const crystalMat = new THREE.MeshPhongMaterial({
      color: 0xff9ee8, emissive: 0xdd55cc, emissiveIntensity: 0.75,
      transparent: true, opacity: 0.92, shininess: 90,
    });
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.85, 0), crystalMat);
    crystal.position.y = 3.4;
    crystal.scale.y = 1.5;
    g.add(crystal);
    this.crystal = crystal;
    this.crystalMat = crystalMat;

    // クリスタルのひかり
    this.crystalLight = new THREE.PointLight(0xff88dd, 1.2, 18, 1.6);
    this.crystalLight.position.y = 3.6;
    g.add(this.crystalLight);

    g.position.set(0, groundHeight(0, 0), 0);
    this.group.add(g);
    this.fountain = g;

    this.animated.push({
      update: (dt, env) => {
        crystal.rotation.y += dt * 0.7;
        crystal.position.y = 3.4 + Math.sin(env.elapsed * 1.4) * 0.12;
        const hue = (env.elapsed * 0.05) % 1;
        crystalMat.emissive.setHSL(hue, 0.75, 0.55);
        crystalMat.color.setHSL(hue, 0.6, 0.75);
        this.crystalLight.color.copy(crystalMat.emissive);
        this.crystalLight.intensity = 1.0 + env.nightMix * 1.4 + Math.sin(env.elapsed * 2.2) * 0.15;
      },
    });
  }

  // ---------- にじのはし ----------
  buildBridge() {
    this.bridge = new THREE.Group();
    const plankMat = new THREE.MeshLambertMaterial({ color: 0xf7f0ff });
    const colors = [0xff6b8a, 0xffb347, 0xffe066, 0x7de8a2, 0x66c7ff, 0xb388ff];
    const z0 = -22.5, z1 = -35;
    const n = 14;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const z = z0 + (z1 - z0) * t;
      const y = 0.55 + Math.sin(t * Math.PI) * 1.1;
      const plank = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.16, 0.75), plankMat);
      plank.position.set(0, y, z);
      plank.rotation.x = Math.cos(t * Math.PI) * 0.22;
      plank.castShadow = plank.receiveShadow = true;
      this.bridge.add(plank);
      // にじ色のふち
      const trim = new THREE.Mesh(
        new THREE.BoxGeometry(3.6, 0.06, 0.2),
        new THREE.MeshLambertMaterial({ color: colors[i % colors.length], emissive: colors[i % colors.length], emissiveIntensity: 0.25 }),
      );
      trim.position.set(0, y + 0.1, z);
      trim.rotation.x = plank.rotation.x;
      this.bridge.add(trim);
    }
    // てすり
    [-1.6, 1.6].forEach((x) => {
      for (let i = 0; i <= 4; i++) {
        const t = i / 4;
        const z = z0 + (z1 - z0) * t;
        const y = 0.55 + Math.sin(t * Math.PI) * 1.1;
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.85, 6), plankMat);
        post.position.set(x, y + 0.45, z);
        this.bridge.add(post);
      }
    });
    this.group.add(this.bridge);
  }

  // はしの高さ(歩行用)
  bridgeHeight(z) {
    const z0 = -22.5, z1 = -35;
    const t = clamp((z - z0) / (z1 - z0), 0, 1);
    return 0.55 + Math.sin(t * Math.PI) * 1.1 + 0.1;
  }

  // ---------- しぜんに生えている小花 ----------
  buildAmbientFlowers() {
    const colors = [0xffffff, 0xffe08a, 0xffb3d9, 0xc7a4ff];
    const geo = new THREE.SphereGeometry(0.09, 6, 5);
    colors.forEach((col) => {
      const inst = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: col }), 40);
      const m = new THREE.Matrix4();
      let placed = 0, guard = 0;
      while (placed < 40 && guard++ < 400) {
        const ang = rand(TAU), r = Math.sqrt(Math.random()) * (ISLAND_R - 3);
        const x = Math.cos(ang) * r, z = Math.sin(ang) * r;
        const h = groundHeight(x, z);
        if (h < 0.45) continue;
        m.makeTranslation(x, h + 0.16, z);
        inst.setMatrixAt(placed, m);
        placed++;
      }
      inst.count = placed;
      this.group.add(inst);
    });
  }

  update(dt, env) {
    this.animated.forEach((a) => a.update(dt, env));
  }
}
