// キャラクター生成(プレイヤーのこども+どうぶつのお客さん)
import * as THREE from 'three';
import { mat, sphere, cyl, box, cone, torus, rand, pick } from '../core/utils.js';

// ============ ぼうしカタログ(ガチャの景品) ============
export const HATS = [
  { id: 'none', name: 'なし', emoji: '🙂' },
  { id: 'strawberry', name: 'いちごぼうし', emoji: '🍓' },
  { id: 'chef', name: 'コックさん', emoji: '👨‍🍳' },
  { id: 'cap', name: 'キャップ', emoji: '🧢' },
  { id: 'helmet', name: 'しょうぼうヘルメット', emoji: '⛑️' },
  { id: 'crown', name: 'おうかん', emoji: '👑' },
  { id: 'ribbon', name: 'リボン', emoji: '🎀' },
  { id: 'flower', name: 'おはな', emoji: '🌼' },
  { id: 'panda', name: 'パンダみみ', emoji: '🐼' },
  { id: 'star', name: 'ほしのぼうし', emoji: '⭐' },
  { id: 'rainbow', name: 'にじのベレー', emoji: '🌈' },
];

function buildHat(id) {
  const g = new THREE.Group();
  switch (id) {
    case 'strawberry': {
      const body = cone(0.42, 0.5, 0xff4d6d, 16);
      body.position.y = 0.2;
      g.add(body);
      for (let i = 0; i < 8; i++) {
        const seed = sphere(0.03, 0xfff3b0, 6);
        const a = (i / 8) * Math.PI * 2;
        seed.position.set(Math.cos(a) * 0.26, 0.16 + (i % 2) * 0.14, Math.sin(a) * 0.26);
        g.add(seed);
      }
      const leaf = cone(0.2, 0.14, 0x59c94a, 6);
      leaf.position.y = 0.5;
      g.add(leaf);
      break;
    }
    case 'chef': {
      const base = cyl(0.34, 0.34, 0.24, 0xffffff, 16);
      base.position.y = 0.1;
      g.add(base);
      const puff = sphere(0.36, 0xffffff, 14);
      puff.scale.y = 0.7;
      puff.position.y = 0.32;
      g.add(puff);
      break;
    }
    case 'cap': {
      const top = sphere(0.4, 0x3d8bff, 14);
      top.scale.y = 0.55;
      top.position.y = 0.08;
      g.add(top);
      const brim = cyl(0.3, 0.3, 0.04, 0x2a6ad0, 14);
      brim.scale.z = 1.6;
      brim.position.set(0, 0.02, 0.3);
      g.add(brim);
      break;
    }
    case 'helmet': {
      const top = sphere(0.44, 0xff3b30, 16);
      top.scale.y = 0.62;
      top.position.y = 0.08;
      g.add(top);
      const brim = torus(0.42, 0.05, 0xffc400);
      brim.rotation.x = Math.PI / 2;
      brim.position.y = 0.0;
      g.add(brim);
      const badge = cyl(0.09, 0.09, 0.03, 0xffc400, 10);
      badge.rotation.x = Math.PI / 2;
      badge.position.set(0, 0.18, 0.4);
      g.add(badge);
      break;
    }
    case 'crown': {
      const band = cyl(0.3, 0.32, 0.18, 0xffc400, 10, { metal: 0.6, rough: 0.3 });
      band.position.y = 0.1;
      g.add(band);
      for (let i = 0; i < 5; i++) {
        const spike = cone(0.07, 0.18, 0xffc400, 6, { metal: 0.6, rough: 0.3 });
        const a = (i / 5) * Math.PI * 2;
        spike.position.set(Math.cos(a) * 0.29, 0.26, Math.sin(a) * 0.29);
        g.add(spike);
      }
      const gem = sphere(0.07, 0xff4d6d, 8, { emissive: 0.5 });
      gem.position.set(0, 0.12, 0.32);
      g.add(gem);
      break;
    }
    case 'ribbon': {
      const c = sphere(0.1, 0xff6fa5, 8);
      c.position.set(0.22, 0.16, 0);
      g.add(c);
      const l = sphere(0.16, 0xff8fc2, 10);
      l.scale.set(1.2, 0.7, 0.5);
      l.position.set(0.06, 0.16, 0);
      g.add(l);
      const r = l.clone();
      r.position.set(0.38, 0.16, 0);
      g.add(r);
      break;
    }
    case 'flower': {
      for (let i = 0; i < 6; i++) {
        const p = sphere(0.11, 0xffb0d8, 8);
        const a = (i / 6) * Math.PI * 2;
        p.position.set(0.22 + Math.cos(a) * 0.13, 0.16, Math.sin(a) * 0.13);
        p.scale.y = 0.55;
        g.add(p);
      }
      const c = sphere(0.09, 0xffc400, 8);
      c.position.set(0.22, 0.19, 0);
      g.add(c);
      break;
    }
    case 'panda': {
      const l = sphere(0.16, 0x222222, 10);
      l.position.set(-0.3, 0.22, 0);
      g.add(l);
      const r = l.clone();
      r.position.set(0.3, 0.22, 0);
      g.add(r);
      break;
    }
    case 'star': {
      const b = cone(0.36, 0.5, 0x4a58c9, 12);
      b.position.y = 0.22;
      g.add(b);
      const s = sphere(0.1, 0xffe36e, 8, { emissive: 0.8 });
      s.position.y = 0.52;
      g.add(s);
      break;
    }
    case 'rainbow': {
      const colors = [0xff5f5f, 0xffc400, 0x66e07a, 0x66c2ff, 0xb388ff];
      colors.forEach((c, i) => {
        const ring = torus(0.36 - i * 0.055, 0.035, c);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.05 + i * 0.07;
        g.add(ring);
      });
      break;
    }
  }
  return g;
}

// ============ プレイヤー(こども) ============
export function buildKid({ hat = 'none', shirt = 0xff8f5f, skin = 0xffd9b8 } = {}) {
  const g = new THREE.Group();
  const parts = {};

  // からだ
  const body = sphere(0.42, shirt, 16);
  body.scale.set(1, 1.15, 0.85);
  body.position.y = 0.62;
  g.add(body);
  parts.body = body;

  // あたま(大きめが かわいい)
  const head = new THREE.Group();
  head.position.y = 1.35;
  const skull = sphere(0.52, skin, 20);
  head.add(skull);
  // かみのけ
  const hair = sphere(0.54, 0x6b4a2e, 18);
  hair.scale.set(1, 0.82, 1);
  hair.position.y = 0.14;
  head.add(hair);
  const bangs = sphere(0.2, 0x6b4a2e, 10);
  bangs.position.set(0, 0.3, 0.4);
  bangs.scale.set(2, 0.7, 0.7);
  head.add(bangs);
  // め
  for (const sx of [-1, 1]) {
    const eye = sphere(0.075, 0x2b2b2b, 10);
    eye.position.set(sx * 0.2, 0.02, 0.46);
    head.add(eye);
    const hi = sphere(0.025, 0xffffff, 6);
    hi.position.set(sx * 0.2 + 0.03, 0.06, 0.52);
    head.add(hi);
    // ほっぺ
    const cheek = sphere(0.07, 0xffa4a4, 8);
    cheek.scale.z = 0.4;
    cheek.position.set(sx * 0.33, -0.13, 0.4);
    head.add(cheek);
  }
  // くち
  const mouth = torus(0.07, 0.02, 0xd06a5a);
  mouth.rotation.x = 0.4;
  mouth.position.set(0, -0.2, 0.46);
  mouth.scale.set(1, 0.6, 1);
  head.add(mouth);
  g.add(head);
  parts.head = head;

  // ぼうしアタッチ位置
  const hatAnchor = new THREE.Group();
  hatAnchor.position.y = 0.42;
  head.add(hatAnchor);
  parts.hatAnchor = hatAnchor;
  if (hat && hat !== 'none') hatAnchor.add(buildHat(hat));

  // うで
  for (const sx of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(sx * 0.44, 0.92, 0);
    const seg = sphere(0.13, shirt, 10);
    seg.scale.set(1, 1.8, 1);
    seg.position.y = -0.18;
    arm.add(seg);
    const hand = sphere(0.11, skin, 10);
    hand.position.y = -0.42;
    arm.add(hand);
    g.add(arm);
    parts[sx < 0 ? 'armL' : 'armR'] = arm;
  }

  // あし
  for (const sx of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(sx * 0.18, 0.36, 0);
    const seg = sphere(0.12, 0x4a6fd0, 10);
    seg.scale.set(1, 1.7, 1);
    seg.position.y = -0.14;
    leg.add(seg);
    const shoe = sphere(0.13, 0xffffff, 10);
    shoe.scale.set(1, 0.7, 1.35);
    shoe.position.set(0, -0.34, 0.05);
    leg.add(shoe);
    g.add(leg);
    parts[sx < 0 ? 'legL' : 'legR'] = leg;
  }

  g.userData.parts = parts;
  g.userData.animT = 0;
  return g;
}

export function setKidHat(kid, hatId) {
  const anchor = kid.userData.parts.hatAnchor;
  while (anchor.children.length) {
    const c = anchor.children[0];
    anchor.remove(c);
  }
  if (hatId && hatId !== 'none') anchor.add(buildHat(hatId));
}

// 歩きアニメ(t:累積時間, moving:0-1)
export function animateKid(kid, t, moving = 0) {
  const p = kid.userData.parts;
  const sw = Math.sin(t * 10) * moving;
  p.armL.rotation.x = sw * 0.9;
  p.armR.rotation.x = -sw * 0.9;
  p.legL.rotation.x = -sw * 0.9;
  p.legR.rotation.x = sw * 0.9;
  p.body.position.y = 0.62 + Math.abs(Math.sin(t * 10)) * 0.05 * moving + Math.sin(t * 2.2) * 0.015;
  p.head.position.y = 1.35 + Math.abs(Math.sin(t * 10)) * 0.06 * moving + Math.sin(t * 2.2) * 0.02;
  p.head.rotation.z = Math.sin(t * 1.6) * 0.04;
}

// ばんざいジャンプ(happyT: 0..1)
export function kidHappyPose(kid, tNorm) {
  const p = kid.userData.parts;
  const up = Math.sin(tNorm * Math.PI);
  p.armL.rotation.x = 0;
  p.armR.rotation.x = 0;
  p.armL.rotation.z = up * 2.4;
  p.armR.rotation.z = -up * 2.4;
  kid.position.y = up * 0.55;
}

// ============ どうぶつのお客さん ============
const ANIMALS = {
  bear:   { color: 0xc98850, belly: 0xf0d0a0, ear: 'round' },
  panda:  { color: 0xf5f5f5, belly: 0xf5f5f5, ear: 'panda' },
  rabbit: { color: 0xffffff, belly: 0xffe3ee, ear: 'long' },
  cat:    { color: 0xffc36e, belly: 0xfff3d8, ear: 'tri' },
  frog:   { color: 0x7ed07a, belly: 0xe8ffd8, ear: 'none' },
  pig:    { color: 0xffb0c0, belly: 0xffe0e8, ear: 'tri' },
};
export const ANIMAL_FACES = { bear: '🐻', panda: '🐼', rabbit: '🐰', cat: '🐱', frog: '🐸', pig: '🐷' };
export const ANIMAL_KEYS = Object.keys(ANIMALS);

export function buildAnimal(type = null) {
  const key = type || pick(ANIMAL_KEYS);
  const spec = ANIMALS[key];
  const g = new THREE.Group();

  const body = sphere(0.38, spec.color, 14);
  body.scale.set(1, 1.05, 0.9);
  body.position.y = 0.5;
  g.add(body);
  const belly = sphere(0.28, spec.belly, 12);
  belly.scale.set(1, 1.1, 0.6);
  belly.position.set(0, 0.48, 0.18);
  g.add(belly);

  const head = new THREE.Group();
  head.position.y = 1.12;
  const skull = sphere(0.42, spec.color, 16);
  head.add(skull);

  if (key === 'panda') {
    for (const sx of [-1, 1]) {
      const patch = sphere(0.11, 0x222222, 8);
      patch.scale.z = 0.5;
      patch.position.set(sx * 0.17, 0.04, 0.36);
      head.add(patch);
    }
  }
  for (const sx of [-1, 1]) {
    const eye = sphere(0.06, 0x2b2b2b, 8);
    eye.position.set(sx * 0.16, 0.05, key === 'panda' ? 0.42 : 0.38);
    head.add(eye);
  }
  // はな・くち
  const muzzle = sphere(0.13, spec.belly, 10);
  muzzle.scale.set(1.2, 0.8, 0.7);
  muzzle.position.set(0, -0.12, 0.34);
  head.add(muzzle);
  const nose = sphere(0.05, key === 'pig' ? 0xff8fa8 : 0x553322, 8);
  nose.scale.z = key === 'pig' ? 0.9 : 0.6;
  nose.position.set(0, -0.06, 0.44);
  head.add(nose);

  // みみ
  if (spec.ear === 'round' || spec.ear === 'panda') {
    for (const sx of [-1, 1]) {
      const ear = sphere(0.13, spec.ear === 'panda' ? 0x222222 : spec.color, 10);
      ear.position.set(sx * 0.3, 0.32, 0);
      head.add(ear);
    }
  } else if (spec.ear === 'long') {
    for (const sx of [-1, 1]) {
      const ear = sphere(0.1, spec.color, 8);
      ear.scale.set(1, 2.6, 0.7);
      ear.position.set(sx * 0.18, 0.5, 0);
      ear.rotation.z = sx * -0.15;
      head.add(ear);
      const inner = sphere(0.05, 0xffc0d8, 6);
      inner.scale.set(1, 2.4, 0.5);
      inner.position.set(sx * 0.18, 0.5, 0.06);
      head.add(inner);
    }
  } else if (spec.ear === 'tri') {
    for (const sx of [-1, 1]) {
      const ear = cone(0.11, 0.2, spec.color, 4);
      ear.position.set(sx * 0.26, 0.38, 0);
      head.add(ear);
    }
  } else if (key === 'frog') {
    for (const sx of [-1, 1]) {
      const bump = sphere(0.11, spec.color, 8);
      bump.position.set(sx * 0.2, 0.36, 0.1);
      head.add(bump);
      const eye = sphere(0.055, 0x2b2b2b, 6);
      eye.position.set(sx * 0.2, 0.4, 0.19);
      head.add(eye);
    }
  }

  g.add(head);

  // てあし(まるだけ)
  for (const sx of [-1, 1]) {
    const hand = sphere(0.1, spec.color, 8);
    hand.position.set(sx * 0.42, 0.55, 0.1);
    g.add(hand);
    const foot = sphere(0.12, spec.color, 8);
    foot.scale.set(1, 0.6, 1.3);
    foot.position.set(sx * 0.18, 0.08, 0.08);
    g.add(foot);
  }

  g.userData.animalType = key;
  g.userData.head = head;
  return g;
}

// お客さんの待機ゆらゆら
export function animateAnimal(animal, t) {
  animal.userData.head.rotation.z = Math.sin(t * 1.8 + animal.id) * 0.08;
  animal.scale.y = 1 + Math.sin(t * 3 + animal.id) * 0.02;
}
