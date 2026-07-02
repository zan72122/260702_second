// ============================================================
// プレイヤー操作
// ============================================================

import * as THREE from 'three';
import { buildPlayer, animateRig } from './characters.js';
import { state } from './state.js';

const WALK_SPEED = 5.2;

export function createPlayerController(scene, world) {
  const rig = buildPlayer(state.player.shirt);
  rig.group.position.set(state.player.x, world.heightAt(state.player.x, state.player.z), state.player.z);
  scene.add(rig.group);

  const ctrl = {
    rig,
    pos: rig.group.position,
    facing: 0,          // y 回転（0 = -z を向く…北）
    moving: false,
    busy: false,        // 釣り・アニメ中は移動不可
    actionAnim: null,   // { name, t, dur }
  };

  ctrl.setTool = function (tool) {
    state.player.tool = tool;
    rig.showTool(tool === 'hand' ? null : tool);
  };
  ctrl.setTool(state.player.tool);

  // 正面のポイント
  ctrl.ahead = function (dist) {
    return {
      x: ctrl.pos.x + Math.sin(ctrl.facing) * dist,
      z: ctrl.pos.z + Math.cos(ctrl.facing) * dist,
    };
  };

  ctrl.faceToward = function (x, z) {
    ctrl.facing = Math.atan2(x - ctrl.pos.x, z - ctrl.pos.z);
    rig.group.rotation.y = ctrl.facing;
  };

  // 道具をふるなどの短いアニメ
  ctrl.playAction = function (name, dur = 0.5, onDone = null) {
    ctrl.actionAnim = { name, t: 0, dur, onDone };
    ctrl.busy = true;
  };

  // アニメを強制終了して姿勢をリセット
  ctrl.clearAction = function () {
    ctrl.actionAnim = null;
    ctrl.busy = false;
    rig.armLock = false;
    rig.body.rotation.x = 0;
    rig.body.rotation.z = 0;
    rig.armR.rotation.x = 0;
    rig.armR.rotation.z = 0;
    rig.armL.rotation.x = 0;
  };

  ctrl.update = function (dt, joy, time) {
    // アクションアニメ
    if (ctrl.actionAnim) {
      const a = ctrl.actionAnim;
      a.t += dt;
      const p = Math.min(1, a.t / a.dur);
      rig.armLock = true;
      switch (a.name) {
        case 'swing': // あみを振りおろす
          rig.armR.rotation.x = -Math.PI * 0.9 * (p < 0.4 ? p / 0.4 : 1) + (p > 0.4 ? (p - 0.4) / 0.6 * Math.PI * 1.4 : 0);
          break;
        case 'dig': // ほる
          rig.armR.rotation.x = -0.8 + Math.sin(p * Math.PI * 3) * 0.9;
          rig.body.rotation.x = 0.25 * Math.sin(p * Math.PI * 3);
          break;
        case 'water': // みずやり
          rig.armR.rotation.x = -1.1;
          rig.armR.rotation.z = -0.4 * Math.sin(p * Math.PI);
          break;
        case 'shake': // 木をゆらす
          rig.armL.rotation.x = -Math.PI * 0.8;
          rig.armR.rotation.x = -Math.PI * 0.8;
          rig.body.rotation.z = Math.sin(p * Math.PI * 5) * 0.08;
          break;
        case 'hit': // 岩をたたく
          rig.armR.rotation.x = -1.6 + p * 1.8;
          break;
        case 'cast': // キャスト
          rig.armR.rotation.x = p < 0.35 ? -2.2 * (p / 0.35) : -2.2 + ((p - 0.35) / 0.65) * 1.6;
          break;
        case 'pull': // 釣りあげ
          rig.armR.rotation.x = -0.6 - p * 1.8;
          rig.body.rotation.x = -0.3 * Math.sin(p * Math.PI);
          break;
        case 'pickup':
          rig.body.rotation.x = 0.5 * Math.sin(p * Math.PI);
          break;
        case 'joy': // ばんざい
          rig.armL.rotation.x = -Math.PI;
          rig.armR.rotation.x = -Math.PI;
          rig.group.position.y += Math.sin(p * Math.PI * 2) > 0 ? Math.sin(p * Math.PI * 4) * 0.05 : 0;
          break;
        case 'hold': // 釣り待ち（竿を前に）
          rig.armR.rotation.x = -0.6;
          a.t = 0; // ループ
          break;
      }
      if (a.t >= a.dur && a.name !== 'hold') {
        ctrl.actionAnim = null;
        ctrl.busy = false;
        rig.armLock = false;
        rig.body.rotation.x = 0;
        rig.body.rotation.z = 0;
        rig.armR.rotation.x = 0;
        rig.armR.rotation.z = 0;
        rig.armL.rotation.x = 0;
        if (a.onDone) a.onDone();
      }
    }

    // 移動
    const mag = Math.hypot(joy.x, joy.y);
    ctrl.moving = false;
    if (!ctrl.busy && mag > 0.12) {
      const speed = WALK_SPEED * (ctrl.speedScale || 1) * Math.min(1, mag);
      // ジョイスティック上 = 北（-z）
      const dx = joy.x * speed * dt;
      const dz = joy.y * speed * dt;
      const targetFacing = Math.atan2(joy.x, joy.y);
      // なめらかに向きを変える
      let diff = targetFacing - ctrl.facing;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      ctrl.facing += diff * Math.min(1, dt * 14);
      rig.group.rotation.y = ctrl.facing;

      // 壁ずり移動（x / z 別々に試す）
      const nx = ctrl.pos.x + dx;
      const nz = ctrl.pos.z + dz;
      if (world.walkable(nx, nz)) {
        ctrl.pos.x = nx; ctrl.pos.z = nz;
      } else if (world.walkable(nx, ctrl.pos.z)) {
        ctrl.pos.x = nx;
      } else if (world.walkable(ctrl.pos.x, nz)) {
        ctrl.pos.z = nz;
      }
      ctrl.moving = mag > 0.12 && (dx !== 0 || dz !== 0);
      state.player.x = ctrl.pos.x;
      state.player.z = ctrl.pos.z;
    }

    // 地形の高さに沿う
    const gy = world.heightAt(ctrl.pos.x, ctrl.pos.z);
    ctrl.pos.y += (gy - ctrl.pos.y) * Math.min(1, dt * 16);

    animateRig(rig, dt, ctrl.moving, time);
  };

  return ctrl;
}
