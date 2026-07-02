// プリンセスキャラクター(プロシージャル3Dモデル + きせかえ)
import * as THREE from 'three';
import { damp, dampAngle, clamp } from '../core/utils.js';
import { DRESS_COLORS, HAIR_COLORS } from '../game/state.js';
import { groundHeight, isOnLand, isOnBridge } from '../world/island.js';

const SKIN = 0xffe0cc;

function makeFaceTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffe0cc';
  ctx.fillRect(0, 0, 256, 256);
  // め(まえ側の中央に描く)
  const drawEye = (x) => {
    ctx.fillStyle = '#3a2a4a';
    ctx.beginPath();
    ctx.ellipse(x, 130, 13, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(x - 4, 122, 5, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    // まつげ
    ctx.strokeStyle = '#3a2a4a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, 128, 16, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  };
  drawEye(96);
  drawEye(160);
  // ほっぺ
  ctx.fillStyle = 'rgba(255,140,170,0.55)';
  ctx.beginPath(); ctx.ellipse(70, 162, 14, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(186, 162, 14, 9, 0, 0, Math.PI * 2); ctx.fill();
  // くち(にっこり)
  ctx.strokeStyle = '#d04a6a';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(128, 158, 16, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class Princess {
  constructor(scene, state, particles) {
    this.scene = scene;
    this.state = state;
    this.particles = particles;

    this.group = new THREE.Group();
    scene.add(this.group);

    this.pos = new THREE.Vector3(0.5, 0, 4.2);
    this.heading = Math.PI;
    this.speed = 0;
    this.moveTarget = null;   // タップ移動先
    this.joyDir = null;       // ジョイスティック方向 {x, z}
    this.walkPhase = 0;
    this.arriveCb = null;

    this.build();
    this.applyDress();
  }

  build() {
    const g = this.group;

    // マテリアル(きせかえで色を変える)
    this.dressMat = new THREE.MeshLambertMaterial({ color: 0xff8ac2 });
    this.accentMat = new THREE.MeshLambertMaterial({ color: 0xffd7ea });
    this.hairMat = new THREE.MeshLambertMaterial({ color: 0xf5c542 });
    this.skinMat = new THREE.MeshLambertMaterial({ color: SKIN });

    // ---- ドレス(ロングスカート) ----
    const points = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      // すそが広がるカーブ
      points.push(new THREE.Vector2(0.16 + Math.pow(t, 1.7) * 0.62, (1 - t) * 1.05));
    }
    this.skirt = new THREE.Mesh(new THREE.LatheGeometry(points, 18), this.dressMat);
    this.skirt.position.y = 0.06;
    this.skirt.castShadow = true;
    g.add(this.skirt);

    // ---- 上半身 ----
    this.torso = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.23, 0.5, 10), this.dressMat);
    this.torso.position.y = 1.32;
    this.torso.castShadow = true;
    g.add(this.torso);

    // むねのリボン
    this.ribbon = new THREE.Group();
    for (const sx of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), this.accentMat);
      wing.scale.set(1.4, 0.8, 0.5);
      wing.position.x = sx * 0.09;
      this.ribbon.add(wing);
    }
    this.ribbon.position.set(0, 1.45, 0.19);
    g.add(this.ribbon);

    // ---- うで ----
    this.armL = this.makeArm(-1);
    this.armR = this.makeArm(1);
    g.add(this.armL, this.armR);

    // ---- あたま ----
    this.head = new THREE.Group();
    this.head.position.y = 1.95;
    g.add(this.head);

    const faceTex = makeFaceTexture();
    const headMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 18, 14),
      new THREE.MeshLambertMaterial({ map: faceTex }),
    );
    headMesh.rotation.y = Math.PI / 2; // テクスチャの顔を前(+Z)へ
    headMesh.castShadow = true;
    this.head.add(headMesh);

    // かみのけ(前髪+うしろ髪+おだんご or ロング)
    const bang = new THREE.Mesh(new THREE.SphereGeometry(0.44, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.52), this.hairMat);
    bang.rotation.x = -0.35;
    bang.position.y = 0.05;
    this.head.add(bang);
    const backHair = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 12), this.hairMat);
    backHair.scale.set(0.95, 1.2, 0.85);
    backHair.position.set(0, -0.18, -0.16);
    this.head.add(backHair);
    // よこのおさげ
    for (const sx of [-1, 1]) {
      const tail = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 7), this.hairMat);
      tail.scale.set(1, 2.2, 1);
      tail.position.set(sx * 0.4, -0.3, -0.05);
      this.head.add(tail);
    }

    // ---- ティアラ ----
    this.tiaraGroup = new THREE.Group();
    this.tiaraGroup.position.set(0, 0.36, 0.05);
    this.head.add(this.tiaraGroup);

    // ---- まほうのつえ(右手) ----
    this.wand = new THREE.Group();
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.55, 6),
      new THREE.MeshLambertMaterial({ color: 0xffd166 }));
    this.wand.add(stick);
    this.wandStar = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.09, 0),
      new THREE.MeshPhongMaterial({ color: 0xffe066, emissive: 0xffc830, emissiveIntensity: 0.9 }),
    );
    this.wandStar.position.y = 0.34;
    this.wand.add(this.wandStar);
    this.wand.position.set(0, -0.32, 0);
    this.armR.add(this.wand);

    // 影レシーバとして地面用の丸影は不要(リアル影を使用)
    this.group.position.copy(this.pos);
  }

  makeArm(side) {
    const arm = new THREE.Group();
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.42, 3, 8), this.skinMat);
    upper.position.y = -0.22;
    arm.add(upper);
    // そで(パフスリーブ)
    const sleeve = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 7), this.dressMat);
    arm.add(sleeve);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), this.skinMat);
    hand.position.y = -0.46;
    arm.add(hand);
    arm.position.set(side * 0.26, 1.55, 0);
    arm.rotation.z = side * 0.35;
    return arm;
  }

  // ---------- きせかえ ----------
  applyDress() {
    const d = this.state.data.dress;
    const dress = DRESS_COLORS[d.dress] || DRESS_COLORS.pink;
    const hair = HAIR_COLORS[d.hair] || HAIR_COLORS.gold;
    this.dressMat.color.set(dress.color);
    this.accentMat.color.set(dress.accent);
    this.hairMat.color.set(hair.color);
    this.dressDef = dress;
    if (dress.glow) {
      this.dressMat.emissive = new THREE.Color(dress.color);
      this.dressMat.emissiveIntensity = 0.18;
    } else {
      this.dressMat.emissive = new THREE.Color(0x000000);
      this.dressMat.emissiveIntensity = 0;
    }
    this.buildTiara(d.tiara);
  }

  buildTiara(type) {
    this.tiaraGroup.clear();
    const gold = new THREE.MeshPhongMaterial({ color: 0xffd166, emissive: 0x996a10, emissiveIntensity: 0.5, shininess: 80 });
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.035, 6, 18), gold);
    band.rotation.x = Math.PI / 2 - 0.25;
    this.tiaraGroup.add(band);
    const gemMat = new THREE.MeshPhongMaterial({ color: 0xff88cc, emissive: 0xdd44aa, emissiveIntensity: 0.8 });
    if (type === 'star') {
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), gemMat);
      star.position.set(0, 0.12, 0.2);
      this.tiaraGroup.add(star);
    } else if (type === 'heart') {
      for (const sx of [-0.045, 0.045]) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), gemMat);
        b.position.set(sx, 0.14, 0.2);
        this.tiaraGroup.add(b);
      }
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.1, 4), gemMat);
      tip.rotation.x = Math.PI;
      tip.position.set(0, 0.06, 0.2);
      this.tiaraGroup.add(tip);
    } else if (type === 'crown') {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI - Math.PI / 2;
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 5), gold);
        spike.position.set(Math.sin(a) * 0.24, 0.1, Math.cos(a) * 0.24);
        this.tiaraGroup.add(spike);
        if (i % 2 === 0) {
          const gem = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), gemMat);
          gem.position.set(Math.sin(a) * 0.24, 0.2, Math.cos(a) * 0.24);
          this.tiaraGroup.add(gem);
        }
      }
    } else if (type === 'flower') {
      const cols = [0xff9ecb, 0xffe066, 0xb388ff, 0x7de8a2, 0xff9ecb, 0x9be8ff];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const fl = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5),
          new THREE.MeshLambertMaterial({ color: cols[i] }));
        fl.position.set(Math.sin(a) * 0.26, 0.02, Math.cos(a) * 0.26);
        this.tiaraGroup.add(fl);
      }
    }
  }

  // ---------- 移動 ----------
  setJoystick(dir) { this.joyDir = dir; if (dir) this.moveTarget = null; }

  walkTo(x, z, cb) {
    // ふんすいの中は目的地にできない
    const d = Math.hypot(x, z);
    if (d < 4.3) {
      const k = d > 0.001 ? 4.3 / d : 4.3;
      x *= k; z = d > 0.001 ? z * k : 4.3;
    }
    this.moveTarget = new THREE.Vector3(x, 0, z);
    this.arriveCb = cb || null;
  }

  stop() {
    this.moveTarget = null;
    this.arriveCb = null;
  }

  update(dt, elapsed, camYaw) {
    const WALK_SPEED = 5.2;
    let mx = 0, mz = 0, want = 0;

    if (this.joyDir) {
      // カメラ基準の方向に変換(上=カメラの前方)
      const sin = Math.sin(camYaw), cos = Math.cos(camYaw);
      mx = this.joyDir.x * cos + this.joyDir.y * sin;
      mz = -this.joyDir.x * sin + this.joyDir.y * cos;
      want = Math.min(1, Math.hypot(this.joyDir.x, this.joyDir.y) * 1.4);
    } else if (this.moveTarget) {
      const dx = this.moveTarget.x - this.pos.x;
      const dz = this.moveTarget.z - this.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.35) {
        const cb = this.arriveCb;
        this.stop();
        cb?.();
      } else {
        mx = dx / dist; mz = dz / dist;
        want = clamp(dist / 1.2, 0.35, 1);
      }
    }

    this.speed = damp(this.speed, want * WALK_SPEED, 8, dt);

    if (want > 0.01) {
      const targetHeading = Math.atan2(mx, mz);
      this.heading = dampAngle(this.heading, targetHeading, 10, dt);
    }

    if (this.speed > 0.05) {
      const step = this.speed * dt;
      const nx = this.pos.x + Math.sin(this.heading) * step;
      const nz = this.pos.z + Math.cos(this.heading) * step;
      // 陸地かはしの上だけ歩ける
      if (isOnLand(nx, nz) || isOnBridge(nx, nz)) {
        this.pos.x = nx; this.pos.z = nz;
      } else if (isOnLand(this.pos.x, nz) || isOnBridge(this.pos.x, nz)) {
        this.pos.z = nz;
      } else if (isOnLand(nx, this.pos.z) || isOnBridge(nx, this.pos.z)) {
        this.pos.x = nx;
      } else {
        this.speed = 0;
        this.stop();
      }
      // ふんすいにはめりこまない
      const df = Math.hypot(this.pos.x, this.pos.z);
      if (df < 4.1 && df > 0.001) {
        this.pos.x *= 4.1 / df;
        this.pos.z *= 4.1 / df;
      }
      this.walkPhase += dt * this.speed * 2.2;
    }

    // 高さ(はしの上なら はしの高さ)
    let y = groundHeight(this.pos.x, this.pos.z);
    if (isOnBridge(this.pos.x, this.pos.z)) {
      const z0 = -22.5, z1 = -35;
      const t = clamp((this.pos.z - z0) / (z1 - z0), 0, 1);
      y = Math.max(y, 0.55 + Math.sin(t * Math.PI) * 1.1 + 0.08);
    }
    this.pos.y = damp(this.pos.y, y, 14, dt);

    // ---- アニメーション ----
    const g = this.group;
    g.position.copy(this.pos);
    g.rotation.y = this.heading;

    const walking = this.speed > 0.4;
    const bob = walking ? Math.abs(Math.sin(this.walkPhase)) * 0.09 : Math.sin(elapsed * 2) * 0.025;
    g.position.y = this.pos.y + bob;
    g.rotation.z = walking ? Math.sin(this.walkPhase) * 0.045 : 0;

    // うでのふり(水やり中はつえをかかげる)
    const swing = walking ? Math.sin(this.walkPhase) * 0.55 : Math.sin(elapsed * 1.8) * 0.06;
    this.armL.rotation.x = swing;
    if (this._waveT > 0) {
      this._waveT -= dt;
      this.armR.rotation.x = -2.2 + Math.sin(elapsed * 14) * 0.25;
      if (Math.random() < dt * 20) {
        const wp = this.wandStar.getWorldPosition(new THREE.Vector3());
        this.particles.sparkleTrail(wp, 0x9be8ff);
      }
    } else {
      this.armR.rotation.x = -swing;
    }

    // スカートのゆれ
    const flare = 1 + (walking ? Math.abs(Math.sin(this.walkPhase * 0.5)) * 0.06 : Math.sin(elapsed * 1.5) * 0.02);
    this.skirt.scale.set(flare, 1, flare);

    // つえのほし
    this.wandStar.rotation.y += dt * 3;

    // にじいろドレス
    if (this.dressDef?.rainbow) {
      const hue = (elapsed * 0.15) % 1;
      this.dressMat.color.setHSL(hue, 0.65, 0.72);
      this.accentMat.color.setHSL((hue + 0.12) % 1, 0.7, 0.85);
    }

    // 歩くとキラキラ
    if (walking && Math.random() < dt * 8) {
      this.particles.sparkleTrail(this.pos.clone().add(new THREE.Vector3(0, 0.35, 0)), 0xffd8f0);
    }
  }

  // 水やりモーション(つえをふる)
  waveWand() {
    this._waveT = 0.9;
  }
}
