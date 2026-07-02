// プレイヤー:移動・衝突・アニメーション
import * as THREE from 'three';
import { buildPlayerModel, animateAvatar } from './avatar.js';
import { lerpAngle } from '../core/utils.js';
import { state } from '../game/state.js';

const SPEED = 5.2;
const WORLD_R = 55;

export class Player {
  constructor(scene, particles) {
    this.scene = scene;
    this.particles = particles;
    this.group = new THREE.Group();
    this.group.position.set(0, 0, 10);
    scene.add(this.group);
    this.model = null;
    this.refs = null;
    this.rebuild();
    this.yaw = Math.PI;
    this.mode = 'idle';   // idle | walk | wave | dance | fish | cast
    this.lockMove = false;
    this.speed = 0;
    this.dustT = 0;
    this.rainbowT = 0;
  }

  rebuild() {
    if (this.model) this.group.remove(this.model.group);
    this.model = buildPlayerModel(state.equipped);
    this.refs = this.model.refs;
    this.group.add(this.model.group);
  }

  get pos() { return this.group.position; }

  update(dt, t, inp, camYaw, colliders) {
    let moving = false;
    if (!this.lockMove) {
      const ix = inp.x, iy = inp.y;
      const mag = Math.hypot(ix, iy);
      if (mag > 0.08) {
        moving = true;
        // カメラ基準の移動方向
        const ang = Math.atan2(ix, -iy) + camYaw + Math.PI;
        const vx = Math.sin(ang) * SPEED * Math.min(1, mag);
        const vz = Math.cos(ang) * SPEED * Math.min(1, mag);
        const nx = this.pos.x + vx * dt;
        const nz = this.pos.z + vz * dt;
        const resolved = this._collide(nx, nz, colliders);
        this.pos.x = resolved.x;
        this.pos.z = resolved.z;
        this.yaw = lerpAngle(this.yaw, ang, Math.min(1, dt * 12));
        this.speed = mag;
        // 走りエフェクト
        this.dustT -= dt;
        if (this.dustT <= 0 && mag > 0.6) {
          this.dustT = 0.12;
          this.particles.dust(this.pos);
        }
      }
    }
    this.group.rotation.y = this.yaw;

    if (!this.lockMove) this.mode = moving ? 'walk' : (this.mode === 'walk' ? 'idle' : this.mode);
    if (this.mode !== 'walk' && this.mode !== 'idle' && !this.lockMove) this.mode = moving ? 'walk' : this.mode;
    animateAvatar(this.refs, dt, t, this.mode, this.speed);

    // 歩行の上下ゆれ
    this.model.group.position.y = this.mode === 'walk' ? Math.abs(Math.sin(t * 9)) * 0.08 : 0;

    // にじいろドレスの色変化
    if (this.refs.rainbow) {
      this.rainbowT += dt;
      const hue = (this.rainbowT * 0.15) % 1;
      for (let i = 0; i < this.refs.dressMats.length; i++) {
        this.refs.dressMats[i].color.setHSL((hue + i * 0.08) % 1, 0.7, 0.72);
      }
    }
  }

  _collide(nx, nz, colliders) {
    // 円形コライダーの押し出し
    for (const c of colliders) {
      const dx = nx - c.x, dz = nz - c.z;
      const d = Math.hypot(dx, dz);
      const minD = c.r + 0.45;
      if (d < minD && d > 0.0001) {
        nx = c.x + (dx / d) * minD;
        nz = c.z + (dz / d) * minD;
      }
    }
    // ワールド境界
    const d0 = Math.hypot(nx, nz);
    if (d0 > WORLD_R) {
      nx = (nx / d0) * WORLD_R;
      nz = (nz / d0) * WORLD_R;
    }
    return { x: nx, z: nz };
  }
}
