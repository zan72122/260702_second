// 花の3Dモデル(プロシージャル生成)
import * as THREE from 'three';
import { rand, TAU } from '../core/utils.js';
import { FLOWERS } from '../game/state.js';

const stemMat = new THREE.MeshLambertMaterial({ color: 0x4faa4b });
const leafMat = new THREE.MeshLambertMaterial({ color: 0x5fbf58 });
const centerMat = new THREE.MeshLambertMaterial({ color: 0xffd166 });
const sproutMat = new THREE.MeshLambertMaterial({ color: 0x7dd465 });

function petalMaterial(color, def) {
  if (def.crystal) {
    return new THREE.MeshPhongMaterial({
      color, emissive: color, emissiveIntensity: 0.45,
      transparent: true, opacity: 0.85, shininess: 100,
    });
  }
  if (def.glow) {
    return new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.4 });
  }
  return new THREE.MeshLambertMaterial({ color });
}

function makeStem(h) {
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.065, h, 6), stemMat);
  stem.position.y = h / 2;
  return stem;
}

function makeLeaves(y, n = 2) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.16, 7, 5), leafMat);
    leaf.scale.set(1, 0.3, 2.0);
    const ang = (i / n) * TAU + rand(0.5);
    leaf.position.set(Math.cos(ang) * 0.18, y + i * 0.08, Math.sin(ang) * 0.18);
    leaf.rotation.y = -ang;
    leaf.rotation.z = 0.5;
    g.add(leaf);
  }
  return g;
}

// 花のあたま(種類ごと)
function makeHead(type, color, def) {
  const g = new THREE.Group();
  const mat = petalMaterial(color, def);
  switch (type) {
    case 'tulip': {
      // カップ型
      const cup = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8, 0, TAU, 0, Math.PI * 0.62), mat);
      cup.scale.y = 1.35;
      cup.rotation.x = Math.PI;
      cup.position.y = 0.22;
      g.add(cup);
      for (let i = 0; i < 3; i++) {
        const p = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), mat);
        p.scale.set(0.8, 1.5, 0.5);
        const a = (i / 3) * TAU;
        p.position.set(Math.cos(a) * 0.16, 0.28, Math.sin(a) * 0.16);
        g.add(p);
      }
      break;
    }
    case 'daisy':
    case 'sunflower': {
      const petals = type === 'sunflower' ? 12 : 9;
      const size = type === 'sunflower' ? 0.34 : 0.22;
      for (let i = 0; i < petals; i++) {
        const p = new THREE.Mesh(new THREE.SphereGeometry(size * 0.55, 7, 5), mat);
        p.scale.set(0.55, 0.18, 1.5);
        const a = (i / petals) * TAU;
        p.position.set(Math.cos(a) * size, 0, Math.sin(a) * size);
        p.rotation.y = -a;
        g.add(p);
      }
      const c = new THREE.Mesh(new THREE.SphereGeometry(size * 0.62, 9, 7),
        type === 'sunflower' ? new THREE.MeshLambertMaterial({ color: 0x8a5a2b }) : centerMat);
      c.scale.y = 0.5;
      g.add(c);
      g.rotation.x = type === 'sunflower' ? -0.5 : -0.15;
      break;
    }
    case 'rose':
    case 'rainbowrose': {
      // うずまき状のたま
      for (let ring = 0; ring < 3; ring++) {
        const n = 4 + ring * 3;
        const r = 0.06 + ring * 0.09;
        for (let i = 0; i < n; i++) {
          const p = new THREE.Mesh(new THREE.SphereGeometry(0.11 + ring * 0.02, 7, 5), mat);
          p.scale.set(1, 0.75, 0.45);
          const a = (i / n) * TAU + ring;
          p.position.set(Math.cos(a) * r, 0.06 + ring * 0.015, Math.sin(a) * r);
          p.rotation.y = -a + Math.PI / 2;
          p.rotation.z = 0.35 + ring * 0.25;
          g.add(p);
        }
      }
      break;
    }
    case 'bellflower': {
      // つりがね型を3つ
      for (let i = 0; i < 3; i++) {
        const bell = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.3, 8, 1, true), mat);
        bell.rotation.x = Math.PI;
        const a = (i / 3) * TAU;
        bell.position.set(Math.cos(a) * 0.16, 0.06 - i * 0.05, Math.sin(a) * 0.16);
        bell.rotation.z = 0.35;
        g.add(bell);
      }
      break;
    }
    case 'lily': {
      for (let i = 0; i < 6; i++) {
        const p = new THREE.Mesh(new THREE.SphereGeometry(0.14, 7, 5), mat);
        p.scale.set(0.4, 0.15, 1.9);
        const a = (i / 6) * TAU;
        p.position.set(Math.cos(a) * 0.2, 0.08, Math.sin(a) * 0.2);
        p.rotation.y = -a;
        p.rotation.z = -0.15;
        g.add(p);
        // 上向きにひらく
        p.rotateOnWorldAxis(new THREE.Vector3(Math.sin(a), 0, -Math.cos(a)), -0.6);
      }
      const pistil = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 5), centerMat);
      pistil.position.y = 0.18;
      g.add(pistil);
      break;
    }
    case 'starflower': {
      for (let i = 0; i < 5; i++) {
        const p = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.42, 5), mat);
        const a = (i / 5) * TAU;
        p.position.set(Math.cos(a) * 0.2, 0, Math.sin(a) * 0.2);
        p.rotation.z = Math.PI / 2;
        p.rotation.y = -a + Math.PI;
        g.add(p);
      }
      const c = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), mat);
      g.add(c);
      g.rotation.x = -0.35;
      break;
    }
    case 'moonflower': {
      const moon = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), mat);
      moon.scale.z = 0.55;
      g.add(moon);
      for (let i = 0; i < 8; i++) {
        const p = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), mat);
        p.scale.set(0.5, 0.15, 1.3);
        const a = (i / 8) * TAU;
        p.position.set(Math.cos(a) * 0.26, 0, Math.sin(a) * 0.26);
        p.rotation.y = -a;
        g.add(p);
      }
      g.rotation.x = -0.4;
      break;
    }
    case 'crystalflower': {
      for (let i = 0; i < 6; i++) {
        const p = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), mat);
        p.scale.set(0.6, 1.6, 0.6);
        const a = (i / 6) * TAU;
        p.position.set(Math.cos(a) * 0.17, 0.1, Math.sin(a) * 0.17);
        p.rotation.z = Math.cos(a) * 0.5;
        p.rotation.x = Math.sin(a) * 0.5;
        g.add(p);
      }
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), mat);
      core.position.y = 0.16;
      g.add(core);
      break;
    }
    default: {
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.22, 9, 7), mat);
      g.add(ball);
    }
  }
  g.userData.mat = mat;
  return g;
}

// 成長ステージのモデルを作る
// stage: 0=たね 1=め 2=つぼみ 3=満開
export function buildFlowerStage(type, colorIdx, stage) {
  const def = FLOWERS[type];
  const color = def.colors[colorIdx % def.colors.length];
  const g = new THREE.Group();

  if (stage === 0) {
    // 土のもりあがり
    const mound = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 8, 6),
      new THREE.MeshLambertMaterial({ color: 0x9a6a4a }),
    );
    mound.scale.y = 0.4;
    mound.position.y = 0.02;
    g.add(mound);
  } else if (stage === 1) {
    // ふたばの め
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.3, 6), sproutMat);
    stem.position.y = 0.15;
    g.add(stem);
    for (const side of [-1, 1]) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.12, 7, 5), sproutMat);
      leaf.scale.set(1, 0.4, 1.6);
      leaf.position.set(side * 0.12, 0.3, 0);
      leaf.rotation.z = side * 0.5;
      g.add(leaf);
    }
  } else if (stage === 2) {
    // つぼみ
    const h = def.name === 'ひまわり' ? 0.9 : 0.6;
    g.add(makeStem(h));
    g.add(makeLeaves(h * 0.4));
    const budMat = petalMaterial(color, def);
    const bud = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), budMat);
    bud.scale.y = 1.4;
    bud.position.y = h + 0.1;
    g.add(bud);
    const sepal = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.2, 6), leafMat);
    sepal.position.y = h;
    g.add(sepal);
  } else {
    // 満開
    const h = type === 'sunflower' ? 1.25 : rand(0.7, 0.9);
    g.add(makeStem(h));
    g.add(makeLeaves(h * 0.4));
    const head = makeHead(type, color, def);
    head.position.y = h + 0.15;
    g.add(head);
    g.userData.head = head;
  }

  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// 満開の花のゆらぎ&レインボー処理
export function animateFlower(group, def, elapsed, phase) {
  group.rotation.z = Math.sin(elapsed * 1.3 + phase) * 0.05;
  const head = group.userData.head;
  if (head && def.rainbow) {
    const hue = (elapsed * 0.12 + phase * 0.1) % 1;
    head.traverse((o) => {
      if (o.isMesh && o.material.emissive) {
        o.material.color.setHSL(hue, 0.7, 0.6);
        o.material.emissive.setHSL(hue, 0.7, 0.45);
      }
    });
  }
}
