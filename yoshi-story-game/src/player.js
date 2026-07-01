// ヨッシー風プレイヤー: モデル生成・物理・アクション(ふんばりジャンプ/ヒップドロップ/舌)
import * as THREE from 'three';
import { clamp, lerp, damp, toonGradientMap } from './utils.js';

const MAX_SPEED = 7.2;
const ACCEL = 42;
const FRICTION = 34;
const AIR_ACCEL = 26;
const GRAVITY = 27;
const JUMP_VEL = 11.8;
const FLUTTER_TIME = 0.85;
const POUND_VEL = -23;
const COYOTE = 0.1;
const JUMP_BUFFER = 0.13;

export class Player {
  constructor(scene) {
    this.scene = scene;
    this._buildModel();
    this.reset(0, 2);
  }

  reset(x, y) {
    this.x = x; this.y = y;         // 中心座標
    this.vx = 0; this.vy = 0;
    this.dir = 1;
    this.onGround = false;
    this.groundMover = null;
    this.coyote = 0;
    this.jumpBuf = 0;
    this.jumping = false;
    this.flutterLeft = FLUTTER_TIME;
    this.fluttering = false;
    this.pound = 0;        // 0=なし 1=ため 2=落下中
    this.poundTimer = 0;
    this.tongue = 0;       // 舌タイマー (>0 で使用中)
    this.tongueHit = false;
    this.aiming = false;
    this.hurtTimer = 0;    // 無敵時間
    this.happyTimer = 0;   // スーパーハッピー
    this.squash = 0;
    this.dead = false;
    this.hw = 0.38; this.hh = 0.5;
    this.aabb = { x, y, hw: this.hw, hh: this.hh };
    this.mesh.visible = true;
    this._syncMesh(0);
  }

  _buildModel() {
    const gm = toonGradientMap();
    const green = new THREE.MeshToonMaterial({ color: '#3fbf46', gradientMap: gm });
    const white = new THREE.MeshToonMaterial({ color: '#fffef2', gradientMap: gm });
    const red = new THREE.MeshToonMaterial({ color: '#e63950', gradientMap: gm });
    const orange = new THREE.MeshToonMaterial({ color: '#ff8a3a', gradientMap: gm });
    this._greenMat = green;

    // モデルは +Z 向きで作り、group.rotation.y で左右を向く
    this.mesh = new THREE.Group();
    this.body = new THREE.Group();
    this.mesh.add(this.body);

    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 16), green);
    torso.position.y = 0.48;
    torso.scale.set(0.95, 1.05, 1);
    torso.castShadow = true;
    this.body.add(torso);

    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.36, 18, 14), white);
    belly.position.set(0, 0.42, 0.13);
    belly.scale.set(0.8, 0.95, 0.9);
    this.body.add(belly);

    // 背中の甲羅 (サドル)
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), red);
    shell.position.set(0, 0.62, -0.28);
    shell.scale.set(1, 0.85, 0.8);
    shell.castShadow = true;
    this.body.add(shell);
    const shellRim = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.055, 8, 18), white);
    shellRim.position.copy(shell.position);
    shellRim.rotation.x = 0.5;
    this.body.add(shellRim);

    // 頭
    this.head = new THREE.Group();
    this.head.position.set(0, 1.0, 0.1);
    this.body.add(this.head);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.32, 18, 14), green);
    skull.position.y = 0.12;
    skull.castShadow = true;
    this.head.add(skull);
    // 大きな鼻
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), green);
    nose.position.set(0, 0.02, 0.33);
    nose.scale.set(1.05, 0.85, 1.1);
    this.head.add(nose);
    for (const dx of [-0.08, 0.08]) {
      const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6),
        new THREE.MeshBasicMaterial({ color: '#1a5a1a' }));
      nostril.position.set(dx, 0.06, 0.56);
      this.head.add(nostril);
    }
    // 目 (頭の上に立つ)
    this.eyes = [];
    for (const dx of [-0.11, 0.11]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), white);
      eye.position.set(dx, 0.38, 0.12);
      eye.scale.set(0.75, 1.25, 0.8);
      this.head.add(eye);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6),
        new THREE.MeshBasicMaterial({ color: '#222' }));
      pupil.position.set(dx, 0.4, 0.2);
      this.head.add(pupil);
      this.eyes.push(eye);
    }
    // ほっぺ
    // 舌 (伸縮)
    this.tongueMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.09, 1, 8),
      new THREE.MeshToonMaterial({ color: '#ff6b8a', gradientMap: gm })
    );
    this.tongueMesh.rotation.x = Math.PI / 2;
    this.tongueMesh.visible = false;
    this.head.add(this.tongueMesh);
    this.tongueTip = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8),
      new THREE.MeshToonMaterial({ color: '#ff6b8a', gradientMap: gm }));
    this.tongueTip.visible = false;
    this.head.add(this.tongueTip);

    // 腕
    this.arms = [];
    for (const dx of [-0.42, 0.42]) {
      const arm = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), green);
      arm.position.set(dx, 0.55, 0.1);
      arm.scale.set(0.8, 1.1, 0.8);
      this.body.add(arm);
      this.arms.push(arm);
    }

    // 脚 + オレンジのブーツ
    this.legs = [];
    for (const dx of [-0.2, 0.2]) {
      const leg = new THREE.Group();
      leg.position.set(dx, 0.22, 0);
      const thigh = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), green);
      thigh.scale.set(0.9, 1.2, 0.9);
      thigh.position.y = -0.02;
      leg.add(thigh);
      const boot = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), orange);
      boot.scale.set(0.95, 0.72, 1.5);
      boot.position.set(0, -0.16, 0.08);
      boot.castShadow = true;
      leg.add(boot);
      this.body.add(leg);
      this.legs.push(leg);
    }

    // しっぽ
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 10), green);
    tail.rotation.x = -Math.PI / 2 - 0.35;
    tail.position.set(0, 0.32, -0.42);
    this.body.add(tail);

    this.scene.add(this.mesh);
  }

  get feetY() { return this.y - this.hh; }

  // メインの物理 & 状態更新。collide 関数は Game から渡される
  update(dt, input, solids, oneWays, events) {
    if (this.dead) return;

    const wasOnGround = this.onGround;

    // ----- タイマー -----
    this.hurtTimer = Math.max(0, this.hurtTimer - dt);
    this.happyTimer = Math.max(0, this.happyTimer - dt);
    this.squash = Math.max(0, this.squash - dt * 3.5);
    if (this.tongue > 0) this.tongue = Math.max(0, this.tongue - dt);

    // ----- 横移動 -----
    const speedMul = this.happyTimer > 0 ? 1.3 : 1;
    let move = 0;
    if (!this.aiming || !this.onGround) {
      if (input.held('left')) move -= 1;
      if (input.held('right')) move += 1;
    }
    if (this.pound === 2) move = 0;
    if (move !== 0) {
      this.dir = move;
      const a = this.onGround ? ACCEL : AIR_ACCEL;
      this.vx += move * a * dt;
      this.vx = clamp(this.vx, -MAX_SPEED * speedMul, MAX_SPEED * speedMul);
    } else {
      const f = (this.onGround ? FRICTION : 8) * dt;
      if (Math.abs(this.vx) <= f) this.vx = 0;
      else this.vx -= Math.sign(this.vx) * f;
    }

    // ----- ジャンプ -----
    this.coyote = this.onGround ? COYOTE : Math.max(0, this.coyote - dt);
    this.jumpBuf = Math.max(0, this.jumpBuf - dt);
    if (input.pressed('jump')) this.jumpBuf = JUMP_BUFFER;

    if (this.jumpBuf > 0 && this.coyote > 0 && this.pound === 0) {
      this.vy = JUMP_VEL;
      this.jumping = true;
      this.jumpBuf = 0;
      this.coyote = 0;
      this.onGround = false;
      events.jump();
    }
    // 可変ジャンプ (離すと減速)
    if (this.jumping && !input.held('jump') && this.vy > 3.5) this.vy = 3.5;

    // ----- ふんばりジャンプ -----
    const wantFlutter = !this.onGround && input.held('jump') && this.vy < 1.5 &&
      this.pound === 0 && this.flutterLeft > 0 && !this.jumpBuf;
    if (wantFlutter) {
      if (!this.fluttering) events.flutterStart();
      this.fluttering = true;
      this.flutterLeft -= dt;
      this.vy = lerp(this.vy, 2.4, 1 - Math.exp(-7 * dt));
    } else {
      this.fluttering = false;
    }

    // ----- ヒップドロップ -----
    if (!this.onGround && this.pound === 0 && input.pressed('down')) {
      this.pound = 1;
      this.poundTimer = 0.16;
      this.vx = 0;
      this.vy = 2;
      events.poundStart();
    }
    if (this.pound === 1) {
      this.poundTimer -= dt;
      this.vy = 1.2;
      if (this.poundTimer <= 0) { this.pound = 2; this.vy = POUND_VEL; }
    }

    // ----- 重力 -----
    if (this.pound !== 1) {
      this.vy -= GRAVITY * dt;
      this.vy = Math.max(this.vy, this.pound === 2 ? POUND_VEL : -18);
    }
    // 着地で vy が 0 になる前の落下速度 (ばね床判定などで使う)
    this.fallSpeed = this.vy;

    // ----- 移動 & 衝突 -----
    // 動く床に乗っていたら床の移動分だけ運ばれる
    if (this.groundMover) {
      this.x += this.groundMover.dxFrame;
      this.y += this.groundMover.dyFrame;
    }

    const prevBottom = this.y - this.hh;
    this.x += this.vx * dt;
    // 横方向の解決 (壁)
    for (const p of solids) {
      if (this._overlaps(p)) {
        if (this.x < p.x) this.x = p.x - p.hw - this.hw;
        else this.x = p.x + p.hw + this.hw;
        this.vx = 0;
      }
    }

    this.y += this.vy * dt;
    this.onGround = false;
    this.groundMover = null;
    // 縦方向の解決
    for (const p of solids) {
      if (this._overlaps(p)) {
        if (this.vy <= 0 && prevBottom >= p.y + p.hh - 0.25) {
          this._landOn(p.y + p.hh, events, wasOnGround);
        } else if (this.vy > 0) {
          this.y = p.y - p.hh - this.hh - 0.01;
          this.vy = 0;
        }
      }
    }
    // 一方通行の足場 (上からのみ)
    if (this.vy <= 0) {
      for (const p of oneWays) {
        if (this._overlaps(p) && prevBottom >= p.top - 0.22) {
          this._landOn(p.top, events, wasOnGround);
          if (p.mover) this.groundMover = p.mover;
        }
      }
    }

    this.aabb.x = this.x;
    this.aabb.y = this.y;

    this._syncMesh(dt);
  }

  _overlaps(p) {
    return Math.abs(this.x - p.x) < this.hw + p.hw && Math.abs(this.y - p.y) < this.hh + p.hh;
  }

  _landOn(top, events, wasOnGround) {
    this.y = top + this.hh;
    const impact = -this.vy;
    this.vy = 0;
    this.onGround = true;
    this.jumping = false;
    this.flutterLeft = FLUTTER_TIME;
    if (!wasOnGround) {
      this.squash = Math.min(1, impact / 20);
      if (this.pound === 2) events.poundLand();
      else if (impact > 4) events.land();
    }
    this.pound = 0;
  }

  // ----- アクション -----
  startTongue(events) {
    if (this.tongue > 0 || this.aiming) return;
    this.tongue = 0.3;
    this.tongueHit = false;
    events.tongue();
  }

  // 舌の先端の当たり判定 (伸びている間だけ)
  tongueAABB() {
    if (this.tongue <= 0) return null;
    const ext = Math.sin((1 - this.tongue / 0.3) * Math.PI); // 0→1→0
    if (ext < 0.25) return null;
    return { x: this.x + this.dir * (0.7 + ext * 1.5), y: this.y + 0.45, hw: 0.55 + ext * 0.4, hh: 0.42 };
  }

  hurt(events) {
    if (this.hurtTimer > 0 || this.happyTimer > 0 || this.dead) return false;
    this.hurtTimer = 2;
    this.vy = 7;
    this.vx = -this.dir * 5;
    this.onGround = false;
    this.pound = 0;
    events.hurt();
    return true;
  }

  startHappy() { this.happyTimer = 8; }

  bounce(v = 9) {
    this.vy = v;
    this.onGround = false;
    // jumping=false: ばね/踏みつけの跳ね返りは可変ジャンプの高さカットを受けない
    this.jumping = false;
    this.flutterLeft = FLUTTER_TIME;
  }

  // ----- 見た目の更新 -----
  _syncMesh(dt) {
    this.mesh.position.set(this.x, this.y - this.hh, 0);

    // 向き (少しカメラ側に体を開く)
    const targetRot = this.dir > 0 ? Math.PI / 2 - 0.3 : -Math.PI / 2 + 0.3;
    this.body.rotation.y = damp(this.body.rotation.y, targetRot, 14, dt);

    // つぶれ / のび
    let sy = 1 - this.squash * 0.3;
    let sx = 1 + this.squash * 0.25;
    if (!this.onGround && this.vy > 2) { sy = 1.08; sx = 0.94; }
    this.body.scale.set(sx, sy, sx);

    const t = performance.now() / 1000;
    const speedRatio = Math.abs(this.vx) / MAX_SPEED;

    if (this.pound === 2) {
      // ヒップドロップ: おしり向き
      this.body.rotation.x = 0.6;
      this.legs.forEach((l) => (l.rotation.x = -1.2));
    } else if (this.fluttering) {
      // バタ足
      this.body.rotation.x = 0.25;
      this.legs[0].rotation.x = Math.sin(t * 38) * 1.1;
      this.legs[1].rotation.x = -Math.sin(t * 38) * 1.1;
      this.arms[0].position.y = 0.68;
      this.arms[1].position.y = 0.68;
    } else if (!this.onGround) {
      this.body.rotation.x = -0.12;
      this.legs.forEach((l) => (l.rotation.x = -0.7));
      this.arms.forEach((a) => (a.position.y = 0.6));
    } else if (speedRatio > 0.05) {
      // 走り
      this.body.rotation.x = 0.12 * speedRatio;
      const ph = t * (8 + speedRatio * 9);
      this.legs[0].rotation.x = Math.sin(ph) * 1.0 * speedRatio;
      this.legs[1].rotation.x = -Math.sin(ph) * 1.0 * speedRatio;
      this.arms[0].position.y = 0.55 + Math.abs(Math.sin(ph)) * 0.05;
      this.arms[1].position.y = 0.55 + Math.abs(Math.cos(ph)) * 0.05;
      this.body.position.y = Math.abs(Math.sin(ph)) * 0.06;
    } else {
      // アイドル: 呼吸
      this.body.rotation.x = 0;
      this.body.position.y = Math.sin(t * 2.4) * 0.02;
      this.legs.forEach((l) => (l.rotation.x = 0));
      this.arms.forEach((a) => (a.position.y = 0.55));
    }

    // 舌
    if (this.tongue > 0) {
      const ext = Math.sin((1 - this.tongue / 0.3) * Math.PI);
      const len = 0.2 + ext * 2.2;
      this.tongueMesh.visible = this.tongueTip.visible = true;
      this.tongueMesh.scale.y = len;
      this.tongueMesh.position.set(0, -0.06, 0.5 + len / 2);
      this.tongueTip.position.set(0, -0.06, 0.5 + len);
      this.head.rotation.x = -0.15;
    } else {
      this.tongueMesh.visible = this.tongueTip.visible = false;
      this.head.rotation.x = this.aiming ? -0.3 : 0;
    }

    // 無敵中は点滅
    this.mesh.visible = this.hurtTimer > 0 ? Math.floor(t * 14) % 2 === 0 : true;

    // スーパーハッピー中は虹色に光る
    if (this.happyTimer > 0) {
      const hue = (t * 1.6) % 1;
      this._greenMat.color.setHSL(hue, 0.75, 0.6);
    } else {
      this._greenMat.color.set('#3fbf46');
    }
  }
}
