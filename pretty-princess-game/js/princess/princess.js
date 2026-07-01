// プリンセスキャラクター(プロシージャル・チビキャラ)
// 参考画像の頭身: おおきな頭 + ふんわりドレス + たてロールの髪
import * as THREE from 'three';
import { mesh, sph, cyl, cone, lathe, torus, bow, crown } from '../furniture/parts.js';
import { PALETTES } from '../items/style.js';
import { clamp } from '../core/utils.js';

export const DRESS_STYLES = [
  { id: 'ballgown', name: 'ボールガウン' },
  { id: 'aline', name: 'Aライン' },
  { id: 'tutu', name: 'バレリーナ' },
];
export const HAIR_STYLES = [
  { id: 'curls', name: 'たてロール' },
  { id: 'twintail', name: 'ツインテール' },
  { id: 'long', name: 'ロングヘア' },
  { id: 'bun', name: 'おだんご' },
];
export const HAIR_COLORS = [
  { id: 'choco', name: 'ショコラ', color: '#7a4a34' },
  { id: 'blonde', name: 'ブロンド', color: '#f0cf72' },
  { id: 'strawberry', name: 'ストロベリー', color: '#f5a5c0' },
  { id: 'lavender', name: 'ラベンダー', color: '#bda0e8' },
  { id: 'black', name: 'クロ', color: '#4a3a45' },
  { id: 'orange', name: 'アプリコット', color: '#f5975f' },
];
export const ACCESSORIES = [
  { id: 'tiara', name: 'ティアラ' },
  { id: 'crown', name: 'おうかん' },
  { id: 'ribbon', name: 'おおきなリボン' },
  { id: 'none', name: 'なし' },
];
export const DRESS_COLORS = Object.keys(PALETTES);

function skinMat() { return new THREE.MeshStandardMaterial({ color: '#ffe9dc', roughness: 0.55 }); }

// らせんカーブ(たてロール用)
class HelixCurve extends THREE.Curve {
  constructor(radius, height, turns) {
    super();
    this.radius = radius; this.height = height; this.turns = turns;
  }
  getPoint(t, target = new THREE.Vector3()) {
    const a = t * this.turns * Math.PI * 2;
    return target.set(Math.cos(a) * this.radius, -t * this.height, Math.sin(a) * this.radius);
  }
}

export class Princess {
  constructor(dress) {
    this.group = new THREE.Group();
    this.anim = 'idle';
    this.t = 0;
    this.animT = 0;
    this.walkTarget = null;
    this.onArrive = null;
    this.speed = 1.6;
    this.build(dress);
  }

  build(dress) {
    // 以前のモデルを破棄
    while (this.group.children.length) {
      const c = this.group.children[0];
      this.group.remove(c);
      c.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
    }
    const pal = PALETTES[dress.dressColor] ?? PALETTES.pink;
    const hairC = (HAIR_COLORS.find((h) => h.id === dress.hairColor) ?? HAIR_COLORS[0]).color;
    const dressMain = new THREE.MeshStandardMaterial({ color: pal.main, roughness: 0.6 });
    const dressSub = new THREE.MeshStandardMaterial({ color: pal.sub, roughness: 0.65 });
    const dressAcc = new THREE.MeshStandardMaterial({ color: pal.accent, roughness: 0.5 });
    const hairM = new THREE.MeshStandardMaterial({ color: hairC, roughness: 0.55 });
    const skin = skinMat();
    const white = new THREE.MeshStandardMaterial({ color: '#fffdfa', roughness: 0.6 });
    const gold = new THREE.MeshStandardMaterial({ color: '#e8b84b', metalness: 0.75, roughness: 0.3 });

    const body = new THREE.Group();
    this.body = body;
    this.group.add(body);

    // ---- スカート ----
    let skirtH = 0.62;
    if (dress.dress === 'ballgown') {
      this.skirt = lathe(dressMain, [
        [0.02, 0.62], [0.16, 0.58], [0.34, 0.4], [0.46, 0.18], [0.5, 0.02], [0.42, 0],
      ], 0, 0, 0, 26);
      // すそフリル
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        this.skirt.add(sph(dressSub, 0.075, Math.cos(a) * 0.46, 0.02, Math.sin(a) * 0.46, 1, 0.7, 1));
      }
      // まえかけ(白いオーバースカート)
      const apron = lathe(dressSub, [[0.05, 0.6], [0.22, 0.42], [0.34, 0.22]], 0, 0.02, 0, 20);
      this.skirt.add(apron);
    } else if (dress.dress === 'aline') {
      this.skirt = lathe(dressMain, [[0.02, 0.62], [0.14, 0.5], [0.26, 0.22], [0.3, 0.02], [0.26, 0]], 0, 0, 0, 24);
      const trim2 = torus(dressAcc, 0.28, 0.02, 0, 0.06, 0, Math.PI / 2);
      this.skirt.add(trim2);
    } else { // tutu
      skirtH = 0.45;
      this.skirt = new THREE.Group();
      const tut = lathe(dressMain, [[0.05, 0.28], [0.3, 0.22], [0.34, 0.16], [0.28, 0.12]], 0, 0.2, 0, 22);
      this.skirt.add(tut);
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        this.skirt.add(sph(dressSub, 0.07, Math.cos(a) * 0.3, 0.3, Math.sin(a) * 0.3, 1, 0.5, 1));
      }
      // あし
      for (const s of [-1, 1]) {
        this.skirt.add(cyl(white, 0.035, 0.045, 0.3, s * 0.07, 0.15, 0, 10));
        this.skirt.add(sph(dressAcc, 0.05, s * 0.07, 0.02, 0.02, 1, 0.6, 1.4));
      }
    }
    body.add(this.skirt);

    // ---- 上半身 ----
    const torso = new THREE.Group();
    torso.position.y = skirtH;
    body.add(torso);
    this.torso = torso;
    torso.add(lathe(dressMain, [[0.09, 0], [0.13, 0.02], [0.1, 0.14], [0.08, 0.24]], 0, 0, 0, 16));
    torso.add(sph(dressAcc, 0.035, 0, 0.16, 0.08, 1, 1.3, 0.6));       // むねのリボン部
    const bowFront = bow(dressAcc, 0.05); bowFront.position.set(0, 0.16, 0.1); torso.add(bowFront);
    torso.add(sph(white, 0.045, 0, 0.25, 0, 1.6, 0.6, 1.2));           // えりのレース

    // ---- うで ----
    this.armL = new THREE.Group(); this.armR = new THREE.Group();
    for (const [arm, s] of [[this.armL, -1], [this.armR, 1]]) {
      arm.position.set(s * 0.11, 0.2, 0);
      arm.add(sph(dressMain, 0.055, s * 0.02, 0, 0));                  // パフスリーブ
      const lower = cyl(skin, 0.022, 0.026, 0.16, s * 0.05, -0.1, 0.01, 10);
      lower.rotation.z = s * -0.2;
      arm.add(lower);
      arm.add(sph(white, 0.032, s * 0.075, -0.19, 0.02));              // てぶくろの手
      arm.rotation.z = s * 0.25;
      torso.add(arm);
    }

    // ---- あたま ----
    const headPivot = new THREE.Group();
    headPivot.position.y = skirtH + 0.28;
    body.add(headPivot);
    this.headPivot = headPivot;
    const head = sph(skin, 0.24, 0, 0.17, 0, 1, 0.96, 0.94);
    headPivot.add(head);

    // 顔: おおきな瞳
    const irisM = new THREE.MeshStandardMaterial({ color: '#7a5a9a', roughness: 0.25 });
    const pupilM = new THREE.MeshStandardMaterial({ color: '#3a2a48', roughness: 0.2 });
    const hlM = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    this.eyes = [];
    for (const s of [-1, 1]) {
      const eye = new THREE.Group();
      eye.add(sph(new THREE.MeshBasicMaterial({ color: '#ffffff' }), 0.045, 0, 0, 0, 1, 1.35, 0.5));
      eye.add(sph(irisM, 0.038, 0, -0.004, 0.012, 1, 1.35, 0.5));
      eye.add(sph(pupilM, 0.02, 0, -0.006, 0.028, 1, 1.4, 0.5));
      eye.add(sph(hlM, 0.011, 0.012, 0.012, 0.038));
      eye.add(sph(hlM, 0.006, -0.01, -0.018, 0.038));
      eye.position.set(s * 0.085, 0.16, 0.2);
      headPivot.add(eye);
      this.eyes.push(eye);
      // まつげ
      const lash = sph(pupilM, 0.046, s * 0.085, 0.205, 0.195, 1, 0.3, 0.5);
      headPivot.add(lash);
      // ほっぺ
      headPivot.add(sph(new THREE.MeshBasicMaterial({ color: '#ffc4cf', transparent: true, opacity: 0.65 }), 0.028, s * 0.15, 0.1, 0.17, 1, 0.6, 0.4));
    }
    // くち
    headPivot.add(sph(new THREE.MeshStandardMaterial({ color: '#e56a80', roughness: 0.4 }), 0.014, 0, 0.075, 0.215, 1.3, 0.8, 0.5));
    // はな
    headPivot.add(sph(skin.clone(), 0.012, 0, 0.115, 0.225));

    // ---- かみのけ ----
    const hair = new THREE.Group();
    headPivot.add(hair);
    hair.add(sph(hairM, 0.255, 0, 0.2, -0.02, 1, 0.98, 0.96));         // ベース
    // まえがみ
    for (let i = -2; i <= 2; i++) {
      hair.add(sph(hairM, 0.075, i * 0.075, 0.32, 0.16, 1, 1.15, 0.7));
    }
    if (dress.hair === 'curls') {
      const helixGeo = new THREE.TubeGeometry(new HelixCurve(0.05, 0.42, 3.2), 48, 0.032, 8, false);
      for (const s of [-1, 1]) {
        const curl = mesh(helixGeo, hairM, s * 0.24, 0.1, 0.02);
        hair.add(curl);
        const curlB = mesh(helixGeo, hairM, s * 0.17, 0.06, -0.14);
        curlB.scale.setScalar(0.8);
        hair.add(curlB);
      }
      hair.add(sph(hairM, 0.16, 0, 0.05, -0.16, 1, 1.2, 0.8));         // うしろ髪
    } else if (dress.hair === 'twintail') {
      for (const s of [-1, 1]) {
        const tail = sph(hairM, 0.09, s * 0.26, -0.05, -0.06, 1, 2.6, 1);
        hair.add(tail);
        hair.add(sph(hairM, 0.07, s * 0.28, -0.32, -0.02));
        const rb = bow(dressAcc, 0.06); rb.position.set(s * 0.25, 0.18, -0.02); hair.add(rb);
      }
    } else if (dress.hair === 'long') {
      hair.add(sph(hairM, 0.2, 0, -0.12, -0.12, 1, 2.0, 0.7));
      hair.add(sph(hairM, 0.1, -0.15, -0.35, -0.1, 1, 1.6, 0.8));
      hair.add(sph(hairM, 0.1, 0.15, -0.35, -0.1, 1, 1.6, 0.8));
    } else if (dress.hair === 'bun') {
      hair.add(sph(hairM, 0.12, 0, 0.44, -0.05));
      const ring = torus(gold, 0.12, 0.015, 0, 0.44, -0.05, Math.PI / 2.6);
      hair.add(ring);
    }

    // ---- アクセサリー ----
    if (dress.acc === 'tiara') {
      const t = crown(gold, 0.08, 0.07);
      t.position.set(0, 0.38, 0.08);
      t.rotation.x = -0.25;
      headPivot.add(t);
    } else if (dress.acc === 'crown') {
      const t = crown(gold, 0.12, 0.12);
      t.position.set(0, 0.42, 0);
      headPivot.add(t);
    } else if (dress.acc === 'ribbon') {
      const r = bow(dressAcc, 0.12);
      r.position.set(0.12, 0.42, 0);
      r.rotation.z = -0.3;
      headPivot.add(r);
    }

    this.group.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
    this.skirtBaseScale = 1;
  }

  setAnim(name) {
    if (this.anim === name) return;
    this.anim = name;
    this.animT = 0;
  }

  walkTo(point, onArrive = null) {
    this.walkTarget = point.clone();
    this.onArrive = onArrive;
    this.setAnim('walk');
  }

  update(dt) {
    this.t += dt;
    this.animT += dt;
    const t = this.t;

    // 目ぱちくり
    const blink = (t % 3.4) > 3.25 ? 0.12 : 1;
    for (const e of this.eyes) e.scale.y = blink;

    // 歩行移動
    if (this.walkTarget) {
      const p = this.group.position;
      const d = this.walkTarget.clone().sub(p);
      d.y = 0;
      const dist = d.length();
      if (dist < 0.08) {
        this.walkTarget = null;
        this.setAnim('idle');
        if (this.onArrive) { const cb = this.onArrive; this.onArrive = null; cb(); }
      } else {
        d.normalize();
        p.addScaledVector(d, Math.min(this.speed * dt, dist));
        const targetRot = Math.atan2(d.x, d.z);
        let cur = this.group.rotation.y;
        let diff = targetRot - cur;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.group.rotation.y = cur + clamp(diff, -8 * dt, 8 * dt);
      }
    }

    // アニメーション(プロシージャル)
    const b = this.body;
    b.position.y = 0; b.rotation.x = 0; b.rotation.z = 0;
    this.headPivot.rotation.x = 0;
    this.headPivot.rotation.z = 0;

    if (this.anim === 'idle') {
      b.position.y = Math.sin(t * 2.2) * 0.015;
      this.armL.rotation.z = -0.25 + Math.sin(t * 2.2) * 0.04;
      this.armR.rotation.z = 0.25 - Math.sin(t * 2.2) * 0.04;
      this.headPivot.rotation.z = Math.sin(t * 0.9) * 0.045;
      this.skirt.scale.x = this.skirt.scale.z = 1 + Math.sin(t * 2.2) * 0.008;
    } else if (this.anim === 'walk') {
      b.position.y = Math.abs(Math.sin(t * 7)) * 0.05;
      this.armL.rotation.x = Math.sin(t * 7) * 0.5;
      this.armR.rotation.x = -Math.sin(t * 7) * 0.5;
      b.rotation.x = 0.05;
      this.skirt.scale.x = this.skirt.scale.z = 1 + Math.abs(Math.sin(t * 7)) * 0.05;
    } else if (this.anim === 'bow') {
      const k = Math.min(1, this.animT * 1.6);
      const amount = Math.sin(Math.min(k, 1) * Math.PI);
      b.rotation.x = amount * 0.5;
      this.headPivot.rotation.x = amount * 0.3;
      this.armL.rotation.z = -0.25 - amount * 0.5;
      this.armR.rotation.z = 0.25 + amount * 0.5;
      if (this.animT > 1.6) this.setAnim('idle');
    } else if (this.anim === 'twirl') {
      this.group.rotation.y += dt * 6;
      b.position.y = Math.abs(Math.sin(t * 6)) * 0.04;
      this.skirt.scale.x = this.skirt.scale.z = 1.12;
      this.armL.rotation.z = -0.9;
      this.armR.rotation.z = 0.9;
    } else if (this.anim === 'wave') {
      this.armR.rotation.z = 2.6 + Math.sin(t * 8) * 0.3;
      this.armL.rotation.z = -0.25;
      b.position.y = Math.sin(t * 2.2) * 0.015;
      this.headPivot.rotation.z = 0.08;
    } else if (this.anim === 'happy') {
      // 復興セレモニー: ジャンプしてよろこぶ
      b.position.y = Math.abs(Math.sin(t * 5)) * 0.14;
      this.armL.rotation.z = -2.4 + Math.sin(t * 5) * 0.2;
      this.armR.rotation.z = 2.4 - Math.sin(t * 5) * 0.2;
      if (this.animT > 3) this.setAnim('idle');
    }
  }
}
