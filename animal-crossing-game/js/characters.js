// ============================================================
// キャラクターモデル（プレイヤー・どうぶつ住民）
// プリミティブ組み立て＋手続きアニメーション
// ============================================================

import * as THREE from 'three';
import { applyCurve } from './curve.js';

function lam(color) {
  return applyCurve(new THREE.MeshLambertMaterial({ color }));
}

function mesh(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

// ------------------------------------------------------------
// 共通ボディ（頭・体・腕・脚）を作り、リグを返す
// ------------------------------------------------------------
function buildBase({ skin, shirt, pants, headScale = 1 }) {
  const g = new THREE.Group();
  const skinM = lam(skin);
  const shirtM = lam(shirt);
  const pantsM = lam(pants);

  const rig = { group: g, skinM, shirtM, pantsM };

  // 脚
  rig.legL = mesh(new THREE.CapsuleGeometry(0.09, 0.2, 3, 6), pantsM, -0.13, 0.24, 0);
  rig.legR = mesh(new THREE.CapsuleGeometry(0.09, 0.2, 3, 6), pantsM, 0.13, 0.24, 0);
  g.add(rig.legL, rig.legR);

  // 体（シャツ）
  rig.body = mesh(new THREE.SphereGeometry(0.34, 10, 8), shirtM, 0, 0.62, 0);
  rig.body.scale.set(1, 1.05, 0.85);
  g.add(rig.body);

  // 腕（肩を支点に回す）
  rig.armL = new THREE.Group();
  rig.armL.position.set(-0.3, 0.82, 0);
  const armLMesh = mesh(new THREE.CapsuleGeometry(0.08, 0.26, 3, 6), skinM, 0, -0.18, 0);
  rig.armL.add(armLMesh);
  rig.armR = new THREE.Group();
  rig.armR.position.set(0.3, 0.82, 0);
  const armRMesh = mesh(new THREE.CapsuleGeometry(0.08, 0.26, 3, 6), skinM, 0, -0.18, 0);
  rig.armR.add(armRMesh);
  g.add(rig.armL, rig.armR);
  rig.handR = new THREE.Group();
  rig.handR.position.set(0, -0.38, 0);
  rig.armR.add(rig.handR);

  // 頭
  rig.head = new THREE.Group();
  rig.head.position.y = 1.06;
  const headMesh = mesh(new THREE.SphereGeometry(0.42 * headScale, 12, 10), skinM, 0, 0.28, 0);
  headMesh.scale.set(1, 0.92, 0.95);
  rig.head.add(headMesh);
  rig.headMesh = headMesh;
  g.add(rig.head);

  // 目
  const eyeM = lam(0x33261a);
  for (const sx of [-1, 1]) {
    const eye = mesh(new THREE.SphereGeometry(0.055, 6, 6), eyeM, sx * 0.16 * headScale, 0.3, 0.38 * headScale);
    eye.scale.set(0.8, 1.3, 0.5);
    rig.head.add(eye);
  }
  // ほっぺ
  const cheekM = applyCurve(new THREE.MeshBasicMaterial({ color: 0xf5a08a, transparent: true, opacity: 0.55 }));
  for (const sx of [-1, 1]) {
    const cheek = mesh(new THREE.SphereGeometry(0.05, 6, 6), cheekM, sx * 0.26 * headScale, 0.2, 0.34 * headScale);
    cheek.scale.set(1, 0.6, 0.4);
    cheek.castShadow = false;
    rig.head.add(cheek);
  }

  return rig;
}

// ------------------------------------------------------------
// プレイヤー
// ------------------------------------------------------------
export function buildPlayer(shirtColor) {
  const rig = buildBase({ skin: 0xf5cfa0, shirt: new THREE.Color(shirtColor).getHex(), pants: 0x4a5a8a });

  // かみのけ（おわんカット＋アホ毛）
  const hairM = lam(0x6b4423);
  const hair = mesh(new THREE.SphereGeometry(0.44, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM, 0, 0.32, 0);
  hair.scale.set(1.02, 1, 0.98);
  rig.head.add(hair);
  const ahoge = mesh(new THREE.ConeGeometry(0.05, 0.24, 5), hairM, 0, 0.78, 0);
  ahoge.rotation.z = 0.3;
  rig.head.add(ahoge);
  // 葉っぱのかざり
  const leafM = lam(0x5abf4a);
  const leaf = mesh(new THREE.SphereGeometry(0.1, 6, 4), leafM, 0.12, 0.74, 0.05);
  leaf.scale.set(1.6, 0.35, 0.8);
  leaf.rotation.z = -0.5;
  rig.head.add(leaf);
  // くち
  const mouth = mesh(new THREE.SphereGeometry(0.045, 6, 5), lam(0xd8734a), 0, 0.16, 0.4);
  mouth.scale.set(1.2, 0.7, 0.4);
  rig.head.add(mouth);

  rig.setShirt = (hex) => rig.shirtM.color.set(hex);
  buildTools(rig);
  return rig;
}

// 手に持つ道具
function buildTools(rig) {
  const tools = {};
  // つりざお
  {
    const g = new THREE.Group();
    const pole = mesh(new THREE.CylinderGeometry(0.02, 0.03, 1.5, 5), lam(0x8a5a30), 0, 0.55, 0);
    pole.rotation.x = -0.5;
    g.add(pole);
    tools.rod = g;
  }
  // むしとりあみ
  {
    const g = new THREE.Group();
    const pole = mesh(new THREE.CylinderGeometry(0.02, 0.025, 1.0, 5), lam(0xc9a56a), 0, 0.35, 0);
    g.add(pole);
    const ring = mesh(new THREE.TorusGeometry(0.24, 0.02, 5, 12), lam(0x4a9d5f), 0, 0.9, 0);
    ring.rotation.x = Math.PI / 2.4;
    g.add(ring);
    const netM = applyCurve(new THREE.MeshLambertMaterial({ color: 0xd8f0e0, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
    const net = mesh(new THREE.ConeGeometry(0.23, 0.4, 10, 1, true), netM, 0, 0.82, 0.1);
    net.rotation.x = Math.PI / 2.4 + Math.PI;
    g.add(net);
    tools.net = g;
  }
  // スコップ
  {
    const g = new THREE.Group();
    const pole = mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.7, 5), lam(0xc9a56a), 0, 0.25, 0);
    g.add(pole);
    const blade = mesh(new THREE.SphereGeometry(0.14, 8, 6), lam(0x9aa0a8), 0, 0.66, 0);
    blade.scale.set(1, 1.3, 0.35);
    g.add(blade);
    tools.shovel = g;
  }
  // じょうろ
  {
    const g = new THREE.Group();
    const body = mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.26, 8), lam(0x5fa8d8), 0, 0.1, 0);
    g.add(body);
    const spout = mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.32, 5), lam(0x5fa8d8), 0.2, 0.16, 0);
    spout.rotation.z = Math.PI / 2.6;
    g.add(spout);
    tools.can = g;
  }
  for (const k in tools) {
    tools[k].visible = false;
    rig.handR.add(tools[k]);
  }
  rig.tools = tools;
  rig.showTool = (name) => {
    for (const k in tools) tools[k].visible = k === name;
  };
}

// ------------------------------------------------------------
// どうぶつ住民
// ------------------------------------------------------------
export const VILLAGERS = [
  {
    id: 'mike', name: 'ミケ', species: 'cat',
    color: 0xf5b98a, accent: 0xffffff, shirt: 0xe8554d, pitch: 1.35,
    personality: 'genki', catch: 'だにゃ',
  },
  {
    id: 'hachi', name: 'ハチ', species: 'dog',
    color: 0xc9a56a, accent: 0xf5e8d0, shirt: 0x4d9de8, pitch: 0.85,
    personality: 'honest', catch: 'ワン',
  },
  {
    id: 'kerotta', name: 'ケロッタ', species: 'frog',
    color: 0x7bc95e, accent: 0xd0f0b0, shirt: 0xf2b53a, pitch: 1.1,
    personality: 'lazy', catch: 'ケロ',
  },
  {
    id: 'mofuzo', name: 'モフゾウ', species: 'bear',
    color: 0x9a6a42, accent: 0xd8b088, shirt: 0x6fbf44, pitch: 0.65,
    personality: 'gentle', catch: 'クマ〜',
  },
  {
    id: 'piko', name: 'ピーコ', species: 'bird',
    color: 0x6ab8e8, accent: 0xf5f0d8, shirt: 0xf28ab5, pitch: 1.5,
    personality: 'oshare', catch: 'ピピッ',
  },
];

export function buildVillager(def) {
  const rig = buildBase({ skin: def.color, shirt: def.shirt, pants: def.shirt, headScale: 1.1 });
  const accentM = lam(def.accent);
  const colorM = rig.skinM;

  // くちもと（マズル）
  if (def.species !== 'frog' && def.species !== 'bird') {
    const muzzle = mesh(new THREE.SphereGeometry(0.16, 8, 6), accentM, 0, 0.17, 0.36);
    muzzle.scale.set(1.3, 0.85, 0.7);
    rig.head.add(muzzle);
    const nose = mesh(new THREE.SphereGeometry(0.05, 6, 5), lam(0x4a3020), 0, 0.22, 0.48);
    rig.head.add(nose);
  }

  switch (def.species) {
    case 'cat': {
      for (const sx of [-1, 1]) {
        const ear = mesh(new THREE.ConeGeometry(0.14, 0.26, 5), colorM, sx * 0.26, 0.68, 0);
        ear.rotation.z = -sx * 0.35;
        rig.head.add(ear);
        const inner = mesh(new THREE.ConeGeometry(0.07, 0.14, 5), accentM, sx * 0.26, 0.66, 0.05);
        inner.rotation.z = -sx * 0.35;
        rig.head.add(inner);
      }
      const tail = mesh(new THREE.CapsuleGeometry(0.05, 0.35, 3, 6), colorM, 0, 0.5, -0.32);
      tail.rotation.x = 0.9;
      rig.group.add(tail);
      rig.tail = tail;
      break;
    }
    case 'dog': {
      for (const sx of [-1, 1]) {
        const ear = mesh(new THREE.SphereGeometry(0.12, 6, 5), colorM, sx * 0.34, 0.5, 0);
        ear.scale.set(0.7, 1.5, 0.5);
        ear.rotation.z = -sx * 0.5;
        rig.head.add(ear);
      }
      const tail = mesh(new THREE.CapsuleGeometry(0.05, 0.22, 3, 6), colorM, 0, 0.5, -0.3);
      tail.rotation.x = 1.2;
      rig.group.add(tail);
      rig.tail = tail;
      break;
    }
    case 'frog': {
      for (const sx of [-1, 1]) {
        const bump = mesh(new THREE.SphereGeometry(0.13, 8, 6), colorM, sx * 0.18, 0.66, 0.1);
        rig.head.add(bump);
        const eye = mesh(new THREE.SphereGeometry(0.06, 6, 5), lam(0x33261a), sx * 0.18, 0.7, 0.2);
        rig.head.add(eye);
      }
      const mouth = mesh(new THREE.SphereGeometry(0.1, 8, 5), lam(0x4a8a3a), 0, 0.14, 0.38);
      mouth.scale.set(1.8, 0.35, 0.5);
      rig.head.add(mouth);
      break;
    }
    case 'bear': {
      for (const sx of [-1, 1]) {
        const ear = mesh(new THREE.SphereGeometry(0.13, 8, 6), colorM, sx * 0.28, 0.66, 0);
        rig.head.add(ear);
        const inner = mesh(new THREE.SphereGeometry(0.07, 6, 5), accentM, sx * 0.28, 0.66, 0.07);
        rig.head.add(inner);
      }
      rig.body.scale.set(1.15, 1.05, 0.95);
      break;
    }
    case 'bird': {
      const beak = mesh(new THREE.ConeGeometry(0.09, 0.24, 5), lam(0xf2b53a), 0, 0.24, 0.44);
      beak.rotation.x = Math.PI / 2;
      rig.head.add(beak);
      const crest = mesh(new THREE.ConeGeometry(0.08, 0.3, 5), accentM, 0, 0.76, 0);
      crest.rotation.z = 0.4;
      rig.head.add(crest);
      const tail = mesh(new THREE.ConeGeometry(0.12, 0.4, 5), colorM, 0, 0.5, -0.38);
      tail.rotation.x = -1.1;
      rig.group.add(tail);
      rig.tail = tail;
      break;
    }
  }
  return rig;
}

// ------------------------------------------------------------
// 歩行・待機アニメーション（rig.animT を進めて呼ぶ）
// ------------------------------------------------------------
export function animateRig(rig, dt, moving, time) {
  rig.animT = (rig.animT || 0) + dt * (moving ? 11 : 2.4);
  const t = rig.animT;
  if (moving) {
    rig.legL.rotation.x = Math.sin(t) * 0.75;
    rig.legR.rotation.x = -Math.sin(t) * 0.75;
    rig.armL.rotation.x = -Math.sin(t) * 0.55;
    if (!rig.armLock) rig.armR.rotation.x = Math.sin(t) * 0.55;
    rig.group.position.y += 0; // 高さは呼び出し側管理
    rig.body.position.y = 0.62 + Math.abs(Math.sin(t)) * 0.04;
    rig.head.position.y = 1.06 + Math.abs(Math.sin(t)) * 0.05;
  } else {
    rig.legL.rotation.x *= 0.8;
    rig.legR.rotation.x *= 0.8;
    rig.armL.rotation.x = Math.sin(t) * 0.06;
    if (!rig.armLock) rig.armR.rotation.x = -Math.sin(t) * 0.06;
    rig.body.position.y = 0.62 + Math.sin(t) * 0.012;
    rig.head.position.y = 1.06 + Math.sin(t) * 0.02;
  }
  if (rig.tail) rig.tail.rotation.z = Math.sin(time * 4) * 0.25;
}
