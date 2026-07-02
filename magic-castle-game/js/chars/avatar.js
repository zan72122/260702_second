// ちびキャラビルダー(プレイヤー & 動物住人)+ アニメーション
import * as THREE from 'three';
import { mat, glowMat, shadow, TAU } from '../core/utils.js';
import { outfitById } from '../game/data.js';

const SKIN = 0xffe0c8;

function eyes(head, r, color = 0x352a2a) {
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(r * 0.13, 8, 8), mat(color, { roughness: 0.3 }));
    eye.position.set(s * r * 0.38, r * 0.08, r * 0.82);
    head.add(eye);
    const hl = new THREE.Mesh(new THREE.SphereGeometry(r * 0.045, 6, 6), mat(0xffffff, { roughness: 0.1 }));
    hl.position.set(s * r * 0.34, r * 0.14, r * 0.93);
    head.add(hl);
  }
}

function blush(head, r) {
  for (const s of [-1, 1]) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(r * 0.14, 8, 6), mat(0xffa8b8, { roughness: 0.8 }));
    b.scale.z = 0.3;
    b.position.set(s * r * 0.62, -r * 0.18, r * 0.72);
    head.add(b);
  }
}

function smile(head, r) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(r * 0.18, r * 0.035, 6, 12, Math.PI), mat(0x8a4a3a));
  m.position.set(0, -r * 0.24, r * 0.86);
  m.rotation.z = Math.PI;
  head.add(m);
}

// ---------- プレイヤー(プリンセス/プリンス風) ----------
export function buildPlayerModel(equipped) {
  const dress = outfitById(equipped.dress) || outfitById('dress_rose');
  const hat = outfitById(equipped.hat) || outfitById('hat_none');
  const wandDef = outfitById(equipped.wand) || outfitById('wand_star');
  const C = dress.colors;

  const g = new THREE.Group();
  const refs = {};

  // 体(ドレス)
  const dressMatOpts = { roughness: 0.75 };
  if (C.glow) { dressMatOpts.emissive = C.glow; dressMatOpts.emissiveIntensity = 0.25; }
  const skirt = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.05, 14, 1, true), mat(C.dress, dressMatOpts));
  skirt.position.y = 0.68;
  g.add(skirt);
  const skirtFrill = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.09, 8, 14), mat(C.skirt, dressMatOpts));
  skirtFrill.rotation.x = Math.PI / 2;
  skirtFrill.position.y = 0.2;
  g.add(skirtFrill);
  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10), mat(C.dress, dressMatOpts));
  chest.position.y = 1.22;
  chest.scale.set(1, 1.05, 0.85);
  g.add(chest);
  refs.chest = chest;

  // 頭
  const head = new THREE.Group();
  const R = 0.52;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(R, 16, 14), mat(SKIN, { roughness: 0.7 }));
  head.add(skull);
  eyes(head, R);
  blush(head, R);
  smile(head, R);
  // かみのけ
  const hairColor = 0x9a6a3a;
  const hairMat = mat(hairColor, { roughness: 0.8 });
  const hairTop = new THREE.Mesh(new THREE.SphereGeometry(R * 1.06, 14, 12, 0, TAU, 0, Math.PI * 0.55), hairMat);
  hairTop.position.y = R * 0.1;
  head.add(hairTop);
  const bun = new THREE.Mesh(new THREE.SphereGeometry(R * 0.4, 10, 8), hairMat);
  bun.position.set(0, R * 0.75, -R * 0.4);
  head.add(bun);
  for (const s of [-1, 1]) {
    const lock = new THREE.Mesh(new THREE.CapsuleGeometry(R * 0.16, R * 0.7, 4, 8), hairMat);
    lock.position.set(s * R * 0.88, -R * 0.3, 0.05);
    head.add(lock);
  }
  head.position.y = 1.95;
  g.add(head);
  refs.head = head;

  // ぼうし
  if (hat.id !== 'hat_none') {
    const hg = new THREE.Group();
    const hc = hat.colors?.main ?? 0xffd76e;
    if (hat.id === 'hat_tiara' || hat.id === 'hat_crown') {
      const band = new THREE.Mesh(new THREE.TorusGeometry(R * 0.62, 0.05, 6, 14), glowMat(hc, hat.colors?.glow ? 0.8 : 0.35));
      band.rotation.x = Math.PI / 2 - 0.25;
      hg.add(band);
      const nPts = hat.id === 'hat_crown' ? 5 : 3;
      for (let i = 0; i < nPts; i++) {
        const a = ((i / (nPts - 1)) - 0.5) * 1.6;
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 6), glowMat(hc, 0.5));
        spike.position.set(Math.sin(a) * R * 0.62, 0.16, Math.cos(a) * R * 0.62 * 0.4 + R * 0.35);
        hg.add(spike);
      }
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.09), glowMat(0xff7eb6, 0.9));
      gem.position.set(0, 0.14, R * 0.72);
      hg.add(gem);
      hg.position.y = R * 0.62;
    } else if (hat.id === 'hat_ribbon') {
      for (const s of [-1, 1]) {
        const loop = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), mat(hc, { roughness: 0.6 }));
        loop.scale.set(1, 0.7, 0.5);
        loop.position.set(s * 0.18, 0, 0);
        hg.add(loop);
      }
      const knot = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), mat(hc, { roughness: 0.6 }));
      hg.add(knot);
      hg.position.set(R * 0.5, R * 0.75, 0);
    } else if (hat.id === 'hat_flower') {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.09, 0), mat([0xffb7d9, 0xfff0b8, 0xffffff][i % 3], { roughness: 0.7 }));
        f.position.set(Math.cos(a) * R * 0.66, 0, Math.sin(a) * R * 0.66);
        hg.add(f);
      }
      hg.rotation.x = -0.2;
      hg.position.y = R * 0.55;
    } else if (hat.id === 'hat_witch') {
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.95, R * 0.95, 0.05, 14), mat(hc));
      hg.add(brim);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(R * 0.55, 0.85, 12), mat(hc));
      cone.position.y = 0.45;
      hg.add(cone);
      const buckle = new THREE.Mesh(new THREE.TorusGeometry(R * 0.56, 0.04, 6, 12), glowMat(0xffd76e, 0.5));
      buckle.rotation.x = Math.PI / 2;
      buckle.position.y = 0.1;
      hg.add(buckle);
      hg.position.y = R * 0.72;
      hg.rotation.z = 0.12;
    }
    head.add(hg);
  }

  // うで
  const armMat = mat(SKIN, { roughness: 0.7 });
  const sleeveM = mat(C.trim, dressMatOpts);
  for (const s of [-1, 1]) {
    const arm = new THREE.Group();
    const sleeve = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), sleeveM);
    arm.add(sleeve);
    const limb = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.42, 4, 8), armMat);
    limb.position.y = -0.3;
    arm.add(limb);
    arm.position.set(s * 0.42, 1.42, 0);
    g.add(arm);
    refs[s < 0 ? 'armL' : 'armR'] = arm;
  }

  // あし
  for (const s of [-1, 1]) {
    const leg = new THREE.Group();
    const limb = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.3, 4, 8), armMat);
    limb.position.y = -0.18;
    leg.add(limb);
    const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), mat(C.trim, { roughness: 0.5 }));
    shoe.scale.set(1, 0.7, 1.4);
    shoe.position.set(0, -0.38, 0.04);
    leg.add(shoe);
    leg.position.set(s * 0.2, 0.42, 0);
    g.add(leg);
    refs[s < 0 ? 'legL' : 'legR'] = leg;
  }

  // まほうのステッキ(右手)
  const wand = new THREE.Group();
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.72, 8), mat(0xfff0d8, { roughness: 0.4 }));
  wand.add(stick);
  const headC = wandDef.colors?.head ?? 0xffd76e;
  let headGeo;
  if (wandDef.id === 'wand_heart') headGeo = new THREE.SphereGeometry(0.13, 10, 8);
  else if (wandDef.id === 'wand_moon') headGeo = new THREE.TorusGeometry(0.11, 0.05, 8, 14, Math.PI * 1.4);
  else if (wandDef.id === 'wand_rose') headGeo = new THREE.IcosahedronGeometry(0.13, 0);
  else headGeo = new THREE.OctahedronGeometry(0.15);
  const wandHead = new THREE.Mesh(headGeo, glowMat(headC, 1.1));
  wandHead.position.y = 0.45;
  wand.add(wandHead);
  wand.position.set(0, -0.5, 0.1);
  wand.rotation.x = 0.4;
  refs.armR.add(wand);
  refs.wand = wand;
  refs.wandHead = wandHead;

  // にじいろドレスは虹エフェクト用フラグ
  refs.rainbow = !!C.rainbow;
  refs.dressMats = [skirt.material, skirtFrill.material, chest.material];

  shadow(g, true, false);
  return { group: g, refs };
}

// ---------- 動物住人 ----------
export function buildNpcModel(def) {
  const C = def.colors;
  const g = new THREE.Group();
  const refs = {};
  const bodyMat = mat(C.body, { roughness: 0.85 });

  // 体
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 12), mat(C.dress, { roughness: 0.8 }));
  body.scale.set(1, 1.15, 0.9);
  body.position.y = 0.78;
  g.add(body);
  refs.chest = body;

  // 頭
  const head = new THREE.Group();
  const R = 0.5;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(R, 16, 14), bodyMat);
  head.add(skull);
  eyes(head, R);
  blush(head, R);

  // 種族パーツ
  const accMat = mat(C.accent, { roughness: 0.7 });
  switch (def.kind) {
    case 'bunny': {
      for (const s of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.5, 4, 8), bodyMat);
        ear.position.set(s * 0.2, R + 0.32, 0);
        ear.rotation.z = s * 0.18;
        head.add(ear);
        const inner = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.3, 4, 6), mat(0xffb7d9));
        inner.position.set(s * 0.2, R + 0.32, 0.07);
        inner.rotation.z = s * 0.18;
        head.add(inner);
      }
      smile(head, R);
      break;
    }
    case 'bear': {
      for (const s of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), bodyMat);
        ear.position.set(s * 0.34, R * 0.82, 0);
        head.add(ear);
      }
      const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), mat(0xf0d8b8));
      muzzle.scale.z = 0.7;
      muzzle.position.set(0, -0.1, R * 0.82);
      head.add(muzzle);
      const nose = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), mat(0x553a22));
      nose.position.set(0, -0.03, R * 1.02);
      head.add(nose);
      // コックぼうし
      const toque = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.26, 0.42, 12), mat(0xffffff));
      toque.position.y = R * 1.05;
      head.add(toque);
      break;
    }
    case 'cat': {
      for (const s of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.3, 4), bodyMat);
        ear.position.set(s * 0.28, R * 0.92, 0);
        ear.rotation.z = s * -0.2;
        head.add(ear);
      }
      smile(head, R);
      // しっぽ
      const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.6, 4, 8), bodyMat);
      tail.position.set(0, 0.5, -0.55);
      tail.rotation.x = 0.9;
      g.add(tail);
      refs.tail = tail;
      // ベレーぼう
      const beret = new THREE.Mesh(new THREE.SphereGeometry(R * 0.72, 12, 8, 0, TAU, 0, Math.PI * 0.5), accMat);
      beret.scale.y = 0.5;
      beret.position.set(R * 0.2, R * 0.72, 0);
      beret.rotation.z = -0.3;
      head.add(beret);
      break;
    }
    case 'frog': {
      for (const s of [-1, 1]) {
        const bump = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), bodyMat);
        bump.position.set(s * 0.25, R * 0.9, 0.1);
        head.add(bump);
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), mat(0x352a2a, { roughness: 0.3 }));
        eye.position.set(s * 0.25, R * 0.95, 0.22);
        head.add(eye);
      }
      // つりぼうし
      const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.52, 0.16, 12), accMat);
      hat.position.y = R * 0.95;
      head.add(hat);
      const hatTop = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8, 0, TAU, 0, Math.PI * 0.5), accMat);
      hatTop.position.y = R * 1.0;
      head.add(hatTop);
      smile(head, R);
      break;
    }
    case 'owl': {
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.18, 4), mat(0xffb340));
      beak.position.set(0, -0.05, R * 0.95);
      beak.rotation.x = Math.PI / 2;
      head.add(beak);
      for (const s of [-1, 1]) {
        const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.28, 5), bodyMat);
        tuft.position.set(s * 0.3, R * 0.95, 0);
        tuft.rotation.z = s * -0.35;
        head.add(tuft);
        // つばさ
        const wing = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), bodyMat);
        wing.scale.set(0.45, 1.1, 0.7);
        wing.position.set(s * 0.55, 0.85, 0);
        g.add(wing);
      }
      // めがね
      for (const s of [-1, 1]) {
        const lens = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.025, 6, 12), mat(0xffd76e, { metalness: 0.6, roughness: 0.3 }));
        lens.position.set(s * 0.19, 0.04, R * 0.88);
        head.add(lens);
      }
      break;
    }
    case 'fairy': {
      smile(head, R);
      // ひかるつばさ
      const wingMat = new THREE.MeshStandardMaterial({
        color: 0xfff0ff, transparent: true, opacity: 0.75, side: THREE.DoubleSide,
        emissive: C.accent, emissiveIntensity: 0.6, roughness: 0.3,
      });
      for (const s of [-1, 1]) {
        const wing = new THREE.Mesh(new THREE.CircleGeometry(0.42, 10), wingMat);
        wing.scale.set(0.6, 1, 1);
        wing.position.set(s * 0.3, 1.05, -0.32);
        wing.rotation.y = s * 0.7;
        g.add(wing);
        if (s < 0) refs.wingL = wing; else refs.wingR = wing;
      }
      // ティアラ
      const band = new THREE.Mesh(new THREE.TorusGeometry(R * 0.5, 0.03, 6, 12), glowMat(0xffd76e, 0.8));
      band.rotation.x = Math.PI / 2 - 0.2;
      band.position.y = R * 0.7;
      head.add(band);
      break;
    }
  }

  head.position.y = 1.65;
  g.add(head);
  refs.head = head;

  // うで・あし(小さめ)
  for (const s of [-1, 1]) {
    const arm = new THREE.Group();
    const limb = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.3, 4, 8), bodyMat);
    limb.position.y = -0.22;
    arm.add(limb);
    arm.position.set(s * 0.5, 1.2, 0);
    g.add(arm);
    refs[s < 0 ? 'armL' : 'armR'] = arm;
    const leg = new THREE.Group();
    const l2 = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.2, 4, 8), bodyMat);
    l2.position.y = -0.14;
    leg.add(l2);
    leg.position.set(s * 0.2, 0.34, 0);
    g.add(leg);
    refs[s < 0 ? 'legL' : 'legR'] = leg;
  }

  const scale = { bunny: 0.85, bear: 1.1, cat: 0.95, frog: 0.8, owl: 0.9, fairy: 0.9 }[def.kind] ?? 1;
  g.scale.setScalar(scale);
  shadow(g, true, false);
  return { group: g, refs };
}

// ---------- 共通アニメーション ----------
// mode: idle | walk | wave | dance | fish | cast
export function animateAvatar(refs, dt, t, mode, speed = 1) {
  const r = refs;
  if (!r.armL) return;
  const set = (obj, x, z) => { if (obj) { obj.rotation.x = x; obj.rotation.z = z ?? obj.rotation.z; } };

  switch (mode) {
    case 'walk': {
      const w = t * 9 * speed;
      set(r.armL, Math.sin(w) * 0.7, 0.08);
      set(r.armR, -Math.sin(w) * 0.7, -0.08);
      set(r.legL, -Math.sin(w) * 0.6);
      set(r.legR, Math.sin(w) * 0.6);
      if (r.head) r.head.rotation.z = Math.sin(w * 0.5) * 0.04;
      break;
    }
    case 'wave': {
      set(r.armL, 0, 0.1);
      if (r.armR) { r.armR.rotation.x = Math.PI * 0.9; r.armR.rotation.z = -Math.sin(t * 8) * 0.4 - 0.2; }
      set(r.legL, 0); set(r.legR, 0);
      break;
    }
    case 'dance': {
      const w = t * 7;
      set(r.armL, Math.PI * 0.7 + Math.sin(w) * 0.4, 0.5);
      set(r.armR, Math.PI * 0.7 - Math.sin(w) * 0.4, -0.5);
      set(r.legL, Math.max(0, Math.sin(w)) * 0.5);
      set(r.legR, Math.max(0, -Math.sin(w)) * 0.5);
      if (r.head) r.head.rotation.z = Math.sin(w) * 0.12;
      break;
    }
    case 'fish': {
      set(r.armL, 0.5, 0.2);
      set(r.armR, 0.9, -0.15);
      set(r.legL, 0); set(r.legR, 0);
      break;
    }
    case 'cast': {
      if (r.armR) { r.armR.rotation.x = Math.PI * 1.05; r.armR.rotation.z = -0.25; }
      set(r.armL, 0.2, 0.3);
      break;
    }
    default: { // idle
      const b = Math.sin(t * 2.2);
      set(r.armL, b * 0.06, 0.1);
      set(r.armR, -b * 0.06, -0.1);
      set(r.legL, 0); set(r.legR, 0);
      if (r.head) { r.head.rotation.z = Math.sin(t * 1.1) * 0.03; r.head.rotation.x = 0; }
    }
  }
  // 呼吸
  if (r.chest) r.chest.scale.x = 1 + Math.sin(t * 2.2) * 0.02;
  // しっぽ・はね
  if (r.tail) r.tail.rotation.z = Math.sin(t * 3) * 0.3;
  if (r.wingL) { r.wingL.rotation.y = 0.7 + Math.sin(t * 10) * 0.3; r.wingR.rotation.y = -0.7 - Math.sin(t * 10) * 0.3; }
}
