// ============================================================
// むし の出現と むしとり
// ============================================================

import * as THREE from 'three';
import { applyCurve } from './curve.js';
import { BUGS, inHours, pickWeighted } from './items.js';

const BUG_COLORS = {
  monshiro: 0xffffff, agehacho: 0xf2d54a, morpho: 0x4a9df2, kujaku: 0x7a5ac2,
  tonbo: 0x7ac2e8, akatonbo: 0xe86a4a, mitsubachi: 0xf2b53a, tentou: 0xe8433a,
  kamakiri: 0x7bc95e, semi: 0x8a6a42, higurashi: 0xa8845a, kabuto: 0x4a3020,
  kuwagata: 0x3a2a1a, herakles: 0x6a4a28, hotaru: 0xd8ff8a, suzumushi: 0x3a3a2a,
  koorogi: 0x4a3a2a, batta: 0x6aa844, dangomushi: 0x707880, tamamushi: 0x3fa14e,
};

function matOf(color) { return applyCurve(new THREE.MeshLambertMaterial({ color })); }

export function createBugs(scene, world) {
  const bugs = []; // { def, group, mode, anchor, t, phase, wings:[] }
  let spawnTimer = 2;

  function buildBugMesh(def) {
    const color = BUG_COLORS[def.id] || 0x808080;
    const g = new THREE.Group();
    const wings = [];
    if (def.where === 'air' && (def.id.includes('tonbo') || def.id === 'tonbo' || def.id === 'akatonbo')) {
      // トンボ
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.3, 3, 5), matOf(color));
      body.rotation.x = Math.PI / 2;
      g.add(body);
      const wingM = applyCurve(new THREE.MeshLambertMaterial({ color: 0xe8f5ff, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
      for (const sx of [-1, 1]) {
        const w = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.08), wingM);
        w.position.set(sx * 0.18, 0.02, 0);
        g.add(w);
        wings.push(w);
      }
    } else if (def.where === 'air') {
      // チョウ
      const wingM = applyCurve(new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide }));
      for (const sx of [-1, 1]) {
        const w = new THREE.Mesh(new THREE.CircleGeometry(0.16, 8), wingM);
        w.position.set(sx * 0.1, 0, 0);
        w.userData.side = sx;
        g.add(w);
        wings.push(w);
      }
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.12, 3, 5), matOf(0x3a3020));
      body.rotation.x = Math.PI / 2;
      g.add(body);
    } else if (def.id === 'hotaru') {
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), matOf(0x3a3a2a));
      g.add(body);
      const glowM = new THREE.SpriteMaterial({ color: 0xd8ff8a, transparent: true, opacity: 0.9, depthWrite: false });
      const glow = new THREE.Sprite(glowM);
      glow.scale.setScalar(0.4);
      g.add(glow);
      wings.push(glow);
    } else {
      // 地面・木・花のむし（ずんぐりボディ）
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), matOf(color));
      body.scale.set(1, 0.7, 1.4);
      g.add(body);
      if (def.id === 'kabuto' || def.id === 'herakles') {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.2, 5), matOf(color));
        horn.position.set(0, 0.06, 0.18);
        horn.rotation.x = Math.PI / 2.5;
        g.add(horn);
      }
      if (def.id === 'kuwagata') {
        for (const sx of [-1, 1]) {
          const jaw = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.16, 4), matOf(color));
          jaw.position.set(sx * 0.05, 0.02, 0.2);
          jaw.rotation.x = Math.PI / 2;
          jaw.rotation.z = sx * 0.4;
          g.add(jaw);
        }
      }
      if (def.id === 'tentou') {
        // 点々
        for (const [px, pz] of [[-0.05, 0.02], [0.06, -0.04], [0, 0.09]]) {
          const dot = new THREE.Mesh(new THREE.SphereGeometry(0.025, 5, 4), matOf(0x201510));
          dot.position.set(px, 0.08, pz);
          g.add(dot);
        }
      }
    }
    g.traverse((o) => { if (o.isMesh) o.castShadow = false; });
    return { group: g, wings };
  }

  function trySpawn(hour, playerPos, weather) {
    if (bugs.length >= 6) return;
    let pool = BUGS.filter((b) => inHours(b.hours, hour));
    if (weather === 'rain') pool = pool.filter((b) => b.where === 'ground' || b.id === 'dangomushi');
    if (!pool.length) return;
    const def = pickWeighted(pool);

    // 出現場所を決める
    let x, z, y, mode = def.where;
    if (def.where === 'tree') {
      const trees = world.trees.filter((t) =>
        t.type !== 'palm' &&
        Math.hypot(t.x - playerPos.x, t.z - playerPos.z) < 26 &&
        Math.hypot(t.x - playerPos.x, t.z - playerPos.z) > 7);
      if (!trees.length) return;
      const tr = trees[Math.floor(Math.random() * trees.length)];
      const ang = Math.random() * Math.PI * 2;
      x = tr.x + Math.sin(ang) * 0.4;
      z = tr.z + Math.cos(ang) * 0.4;
      y = world.heightAt(tr.x, tr.z) + 0.7 + Math.random() * 0.7;
    } else if (def.where === 'flower') {
      const f = world.flowers.nearest(
        playerPos.x + (Math.random() - 0.5) * 30,
        playerPos.z + (Math.random() - 0.5) * 30, 20);
      if (!f) return;
      x = f.x + (Math.random() - 0.5) * 0.6;
      z = f.z + (Math.random() - 0.5) * 0.6;
      y = world.heightAt(x, z) + 0.55;
    } else if (def.id === 'hotaru') {
      const rz = 4 + Math.random() * 36;
      x = world.riverX(rz) + (Math.random() < 0.5 ? -1 : 1) * (4 + Math.random() * 5);
      z = rz;
      if (!world.walkable(x, z)) return;
      y = world.heightAt(x, z) + 0.7 + Math.random() * 0.8;
      mode = 'air';
    } else {
      // air / ground: プレイヤー周辺
      const ang = Math.random() * Math.PI * 2;
      const d = 8 + Math.random() * 14;
      x = playerPos.x + Math.cos(ang) * d;
      z = playerPos.z + Math.sin(ang) * d;
      if (!world.walkable(x, z)) return;
      y = world.heightAt(x, z) + (def.where === 'air' ? 0.9 + Math.random() * 0.7 : 0.12);
    }

    const { group, wings } = buildBugMesh(def);
    group.position.set(x, y, z);
    scene.add(group);
    bugs.push({
      def, group, wings, mode,
      baseY: y, t: 0, age: 0,
      wanderAng: Math.random() * Math.PI * 2,
      hopT: Math.random() * 2,
    });
  }

  function remove(bug) {
    const i = bugs.indexOf(bug);
    if (i >= 0) bugs.splice(i, 1);
    scene.remove(bug.group);
  }

  function update(dt, hour, playerPos, time, weather) {
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      trySpawn(hour, playerPos, weather);
      spawnTimer = 2.5 + Math.random() * 3;
    }
    for (const bug of [...bugs]) {
      bug.age += dt;
      bug.t += dt;
      const g = bug.group;
      const dp = Math.hypot(g.position.x - playerPos.x, g.position.z - playerPos.z);
      // 時間切れ・遠すぎ・出現時間外
      if (bug.age > 75 || dp > 45 || !inHours(bug.def.hours, hour)) {
        remove(bug);
        continue;
      }
      if (bug.mode === 'air') {
        // ふわふわ飛ぶ
        bug.wanderAng += (Math.random() - 0.5) * dt * 3;
        const sp = bug.def.id.includes('tonbo') ? 1.6 : 0.7;
        const nx = g.position.x + Math.cos(bug.wanderAng) * sp * dt;
        const nz = g.position.z + Math.sin(bug.wanderAng) * sp * dt;
        if (world.walkable(nx, nz)) {
          g.position.x = nx;
          g.position.z = nz;
        } else {
          bug.wanderAng += Math.PI;
        }
        g.position.y = world.heightAt(g.position.x, g.position.z) + 0.9 + Math.sin(bug.t * 2.2) * 0.3;
        g.rotation.y = -bug.wanderAng + Math.PI / 2;
        // はばたき
        for (const w of bug.wings) {
          if (w.isSprite) {
            w.material.opacity = 0.4 + 0.6 * (Math.sin(bug.t * 3) * 0.5 + 0.5);
          } else if (w.userData.side) {
            w.rotation.y = w.userData.side * (Math.sin(bug.t * 14) * 0.7);
          } else {
            w.rotation.z = Math.sin(bug.t * 20) * 0.3;
          }
        }
      } else if (bug.mode === 'ground') {
        bug.hopT -= dt;
        if (bug.hopT <= 0 && (bug.def.id === 'batta' || bug.def.id === 'koorogi' || bug.def.id === 'suzumushi')) {
          bug.hopT = 1.5 + Math.random() * 2.5;
          bug.hopV = 2 + Math.random();
          bug.wanderAng = Math.random() * Math.PI * 2;
        }
        if (bug.hopV > 0) {
          bug.hopV -= 8 * dt;
          const nx = g.position.x + Math.cos(bug.wanderAng) * dt * 1.5;
          const nz = g.position.z + Math.sin(bug.wanderAng) * dt * 1.5;
          if (world.walkable(nx, nz)) { g.position.x = nx; g.position.z = nz; }
          g.position.y = world.heightAt(g.position.x, g.position.z) + 0.12 + Math.max(0, Math.sin((bug.hopV / 3) * Math.PI)) * 0.25;
        }
      }
      // tree / flower はその場でじっとしている（かすかに動く）
      if (bug.mode === 'tree' || bug.mode === 'flower') {
        g.rotation.y += Math.sin(bug.t * 0.8) * dt * 0.3;
      }
    }
  }

  // あみを振ったとき：point の近くのむしを取る
  function swingCatch(point, radius = 1.4) {
    let best = null, bd = radius;
    for (const bug of bugs) {
      const d = Math.hypot(bug.group.position.x - point.x, bug.group.position.z - point.z);
      if (d < bd) { bd = d; best = bug; }
    }
    if (best) {
      const def = best.def;
      remove(best);
      return def;
    }
    return null;
  }

  // 近くにむしがいるか（アクションボタンのヒント用）
  function anyNear(pos, r = 5) {
    return bugs.some((b) => Math.hypot(b.group.position.x - pos.x, b.group.position.z - pos.z) < r);
  }

  return { bugs, update, swingCatch, anyNear };
}
