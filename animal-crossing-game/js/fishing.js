// ============================================================
// つり ミニゲーム
// ============================================================

import * as THREE from 'three';
import { applyCurve } from './curve.js';
import { FISH, inHours, pickWeighted } from './items.js';
import { sfx, vibrate } from './audio.js';

export function createFishing(scene, world, player, cb) {
  const bobber = new THREE.Group();
  {
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), applyCurve(new THREE.MeshLambertMaterial({ color: 0xe8554d })));
    top.position.y = 0.06;
    const bottom = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), applyCurve(new THREE.MeshLambertMaterial({ color: 0xffffff })));
    bottom.position.y = -0.06;
    bobber.add(top, bottom);
  }
  bobber.visible = false;
  scene.add(bobber);

  // ライン（さお先 → うき）
  const lineMat = new THREE.LineBasicMaterial({ color: 0xf5f5f5, transparent: true, opacity: 0.7 });
  const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const line = new THREE.Line(lineGeo, lineMat);
  line.visible = false;
  scene.add(line);

  // 魚のかげ
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.5, 12),
    applyCurve(new THREE.MeshBasicMaterial({ color: 0x1a3a55, transparent: true, opacity: 0.55, depthWrite: false }))
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.visible = false;
  scene.add(shadow);

  const F = {
    active: false,
    phase: 'idle', // cast | wait | approach | nibble | bite | done
    t: 0,
    fish: null,
    spot: null,      // {x,z,surfaceY,type}
    nibblesLeft: 0,
    shadowPos: new THREE.Vector2(),
  };

  // 釣りポイントを探す（正面 2.2〜4.6）
  F.findSpot = function () {
    for (let d = 2.2; d <= 4.6; d += 0.4) {
      const p = player.ahead(d);
      const w = world.waterAt(p.x, p.z);
      if (w) return { x: p.x, z: p.z, ...w };
    }
    return null;
  };

  F.start = function (hour) {
    const spot = F.findSpot();
    if (!spot) return false;
    F.active = true;
    F.spot = spot;
    F.phase = 'cast';
    F.t = 0;
    player.busy = true;
    player.playAction('cast', 0.55, () => {
      player.busy = true; // 釣りの間はずっと busy
      player.playAction('hold', 1);
      bobber.position.set(spot.x, spot.surfaceY + 0.05, spot.z);
      bobber.visible = true;
      line.visible = true;
      sfx.plop();
      F.phase = 'wait';
      F.t = 0;
      // 出てくる魚を先に決める（かげの大きさに反映）
      const pool = FISH.filter((f) =>
        (f.spot === spot.type || f.spot === 'both') && inHours(f.hours, hour));
      F.fish = pool.length ? pickWeighted(pool) : null;
      F.waitDur = 1.2 + Math.random() * 3.5;
    });
    return true;
  };

  F.end = function () {
    F.active = false;
    F.phase = 'idle';
    bobber.visible = false;
    line.visible = false;
    shadow.visible = false;
    player.clearAction();
  };

  // アクションボタン（またはタップ）
  F.tap = function () {
    if (!F.active) return;
    if (F.phase === 'bite') {
      // ヒット！
      const fish = F.fish;
      if (!fish) { F.end(); return; }
      F.phase = 'done';
      shadow.visible = false;
      sfx.splash();
      sfx.reel();
      vibrate([30, 40, 60]);
      player.clearAction();
      player.playAction('pull', 0.7, () => {
        F.end();
        cb.onCatch(fish);
      });
      player.busy = true;
    } else if (F.phase === 'wait' || F.phase === 'approach' || F.phase === 'nibble') {
      // 早あげ → にげられる
      if (F.phase !== 'wait') {
        sfx.miss();
        cb.onMiss && cb.onMiss();
      }
      F.end();
    }
  };

  F.update = function (dt, time) {
    if (!F.active) return;
    F.t += dt;
    if (bobber.visible) {
      bobber.position.y = F.spot.surfaceY + 0.05 + Math.sin(time * 2.4) * 0.02;
      // ライン更新
      const tip = player.pos.clone();
      tip.y += 1.35;
      tip.x += Math.sin(player.facing) * 0.9;
      tip.z += Math.cos(player.facing) * 0.9;
      line.geometry.setFromPoints([tip, bobber.position]);
    }

    switch (F.phase) {
      case 'wait':
        if (F.t > F.waitDur) {
          if (!F.fish) { // この時間はなにもいない
            F.end();
            cb.onNothing && cb.onNothing();
            return;
          }
          // かげ出現
          F.phase = 'approach';
          F.t = 0;
          const ang = Math.random() * Math.PI * 2;
          const dist = 3 + Math.random() * 2;
          F.shadowPos.set(F.spot.x + Math.cos(ang) * dist, F.spot.z + Math.sin(ang) * dist);
          shadow.visible = true;
          const s = 0.45 + F.fish.size * 0.28;
          shadow.scale.setScalar(s);
          shadow.position.set(F.shadowPos.x, F.spot.surfaceY - 0.12, F.shadowPos.y);
          F.nibblesLeft = Math.floor(Math.random() * 3);
        }
        break;
      case 'approach': {
        const dx = F.spot.x - F.shadowPos.x;
        const dz = F.spot.z - F.shadowPos.y;
        const d = Math.hypot(dx, dz);
        if (d < 0.5) {
          if (F.nibblesLeft > 0) {
            F.nibblesLeft--;
            F.phase = 'nibble';
            F.t = 0;
            bobber.position.y -= 0.06;
            sfx.plop();
            vibrate(15);
          } else {
            F.phase = 'bite';
            F.t = 0;
            bobber.position.y -= 0.22;
            sfx.bite();
            vibrate([50, 30, 80]);
            world.spawnSparkle(F.spot.x, F.spot.surfaceY + 0.2, F.spot.z, 0xbfe8ff, 6, 0.5);
          }
        } else {
          const sp = 0.9 + Math.random() * 0.4;
          F.shadowPos.x += (dx / d) * sp * dt;
          F.shadowPos.y += (dz / d) * sp * dt;
          shadow.position.set(F.shadowPos.x, F.spot.surfaceY - 0.12, F.shadowPos.y);
        }
        break;
      }
      case 'nibble':
        if (F.t > 0.5 + Math.random() * 0.6) {
          // ちょっと離れてまた近づく
          F.phase = 'approach';
          const ang = Math.random() * Math.PI * 2;
          F.shadowPos.set(F.spot.x + Math.cos(ang) * 1.2, F.spot.z + Math.sin(ang) * 1.2);
        }
        break;
      case 'bite':
        if (F.t > 0.75) {
          // のがした…
          shadow.visible = false;
          sfx.miss();
          F.end();
          cb.onMiss && cb.onMiss();
        }
        break;
    }
  };

  return F;
}
