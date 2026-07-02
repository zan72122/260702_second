// 花だん(プロット)の管理と成長ロジック
import * as THREE from 'three';
import { TAU, rand } from '../core/utils.js';
import { FLOWERS } from '../game/state.js';
import { buildFlowerStage, animateFlower } from './flowers.js';
import { groundHeight, ISLE2_CENTER } from '../world/island.js';

const WATER_BOOST = 3;       // 水やり中の成長倍率
const WATER_DURATION = 25;   // 水やり効果の秒数

// プロット配置(メイン島 12 + ひみつのにわ 8)
function plotLayout() {
  const plots = [];
  // ふんすいをかこむ2重リング
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + Math.PI / 8;
    plots.push({ id: `m${i}`, x: Math.cos(a) * 7.5, z: Math.sin(a) * 7.5, area: 'main' });
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + Math.PI / 4;
    plots.push({ id: `o${i}`, x: Math.cos(a) * 13, z: Math.sin(a) * 13, area: 'main' });
  }
  // ひみつのにわ(レベル3で開放)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    plots.push({
      id: `s${i}`,
      x: ISLE2_CENTER.x + Math.cos(a) * 6,
      z: ISLE2_CENTER.z + Math.sin(a) * 6,
      area: 'secret',
    });
  }
  return plots;
}

export function stageOf(progress) {
  if (progress >= 1) return 3;
  if (progress >= 0.55) return 2;
  if (progress >= 0.18) return 1;
  return 0;
}

export class Garden {
  constructor(scene, state, particles) {
    this.scene = scene;
    this.state = state;
    this.particles = particles;
    this.group = new THREE.Group();
    scene.add(this.group);

    this.plots = new Map(); // id -> plot object
    const soilMat = new THREE.MeshLambertMaterial({ color: 0xa87850 });
    const soilWetMat = new THREE.MeshLambertMaterial({ color: 0x7a5638 });
    const rimMat = new THREE.MeshLambertMaterial({ color: 0xf2d9e8 });

    plotLayout().forEach((def) => {
      const g = new THREE.Group();
      const y = groundHeight(def.x, def.z);
      g.position.set(def.x, y, def.z);

      // ふち(花びらがたの石)
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        const stone = new THREE.Mesh(new THREE.SphereGeometry(0.22, 7, 5), rimMat);
        stone.scale.y = 0.55;
        stone.position.set(Math.cos(a) * 1.0, 0.08, Math.sin(a) * 1.0);
        stone.receiveShadow = true;
        g.add(stone);
      }
      // 土
      const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 1.0, 0.18, 14), soilMat);
      soil.position.y = 0.08;
      soil.receiveShadow = true;
      g.add(soil);

      // 選択リング(タップ対象を示す)
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.08, 1.28, 24),
        new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.16;
      g.add(ring);

      // "!" マーカー(収穫可能)
      const marker = makeMarker();
      marker.position.y = 2.1;
      marker.visible = false;
      g.add(marker);

      this.group.add(g);
      this.plots.set(def.id, {
        ...def, group: g, soil, soilMat, soilWetMat, ring, marker,
        flowerMesh: null, meshStage: -1, phase: rand(TAU),
        worldPos: new THREE.Vector3(def.x, y, def.z),
      });
      // タップ判定用
      soil.userData.plotId = def.id;
      g.traverse((o) => { o.userData.plotId = def.id; });
    });
  }

  // セーブデータの plot state を取得
  plotData(id) { return this.state.data.plots[id] || null; }

  secretUnlocked() { return this.state.level >= 3; }

  visiblePlots() {
    const out = [];
    this.plots.forEach((p) => {
      if (p.area === 'secret' && !this.secretUnlocked()) return;
      out.push(p);
    });
    return out;
  }

  plant(id, type) {
    const def = FLOWERS[type];
    if (!def) return false;
    if (this.plotData(id)) return false;
    if (!this.state.useSeed(type)) return false;
    this.state.data.plots[id] = {
      type,
      colorIdx: Math.floor(rand(def.colors.length)),
      progress: 0.02,
      wateredUntil: 0,
      bloomNotified: false,
    };
    this.state.stat('planted');
    this.state.save();
    const p = this.plots.get(id);
    this.particles.burst(p.worldPos.clone().add(new THREE.Vector3(0, 0.5, 0)), 0xb0e890, 10, 1.5);
    return true;
  }

  water(id, gameTime) {
    const d = this.plotData(id);
    if (!d || d.progress >= 1) return false;
    d.wateredUntil = gameTime + WATER_DURATION;
    this.state.stat('watered');
    this.state.save();
    return true;
  }

  isWatered(id, gameTime) {
    const d = this.plotData(id);
    return d && gameTime < d.wateredUntil;
  }

  harvest(id) {
    const d = this.plotData(id);
    if (!d || d.progress < 1) return null;
    const def = FLOWERS[d.type];
    const reward = {
      type: d.type,
      sparkle: def.sparkle + Math.floor(rand(def.sparkle * 0.25)),
      petal: def.petal,
      color: def.colors[d.colorIdx % def.colors.length],
    };
    delete this.state.data.plots[id];
    this.state.addSparkles(reward.sparkle);
    this.state.addPetals(reward.petal);
    this.state.stat('harvested');
    this.state.save();
    const p = this.plots.get(id);
    const pos = p.worldPos.clone().add(new THREE.Vector3(0, 1, 0));
    this.particles.burst(pos, 0xffe066, 20, 2.6);
    this.particles.petals(pos, reward.color, 10);
    return reward;
  }

  // 満開になった瞬間のイベントを拾うためコールバックを登録
  onBloom(fn) { this._bloomCb = fn; }

  update(dt, gameTime, elapsed, isNight) {
    this.plots.forEach((p) => {
      const secretHidden = p.area === 'secret' && !this.secretUnlocked();
      p.group.visible = !secretHidden;
      if (secretHidden) return;

      const d = this.plotData(p.id);
      // 土の色(水やり中はしめった色)
      p.soil.material = d && gameTime < d.wateredUntil ? p.soilWetMat : p.soilMat;

      if (!d) {
        if (p.flowerMesh) { p.group.remove(p.flowerMesh); p.flowerMesh = null; p.meshStage = -1; }
        p.marker.visible = false;
        return;
      }

      const def = FLOWERS[d.type];
      // 成長(ムーンフラワーは夜だけ成長)
      if (d.progress < 1) {
        let rate = 1 / def.growTime;
        if (gameTime < d.wateredUntil) rate *= WATER_BOOST;
        if (def.night && !isNight) rate *= 0.15;
        d.progress = Math.min(1, d.progress + rate * dt);
        if (d.progress >= 1 && !d.bloomNotified) {
          d.bloomNotified = true;
          this.state.addXp(1);
          this.state.stat('bloomed');
          this.state.save();
          const pos = p.worldPos.clone().add(new THREE.Vector3(0, 1.2, 0));
          this.particles.burst(pos, def.colors[d.colorIdx % def.colors.length], 18, 2.2);
          this._bloomCb?.(p, d);
        }
      }

      // メッシュのステージ切り替え
      const stage = stageOf(d.progress);
      if (stage !== p.meshStage) {
        if (p.flowerMesh) p.group.remove(p.flowerMesh);
        p.flowerMesh = buildFlowerStage(d.type, d.colorIdx, stage);
        p.flowerMesh.position.y = 0.15;
        p.flowerMesh.traverse((o) => { o.userData.plotId = p.id; });
        p.group.add(p.flowerMesh);
        p.meshStage = stage;
      }

      // アニメーション
      if (p.flowerMesh && stage >= 2) animateFlower(p.flowerMesh, def, elapsed, p.phase);

      // 満開マーカー
      p.marker.visible = d.progress >= 1;
      if (p.marker.visible) {
        p.marker.position.y = 2.1 + Math.sin(elapsed * 3 + p.phase) * 0.12;
        p.marker.rotation.y = elapsed * 1.5;
        // 満開の花はキラキラ
        if (Math.random() < dt * 2.2) {
          this.particles.sparkleTrail(p.worldPos.clone().add(new THREE.Vector3(rand(-0.4, 0.4), 1.1, rand(-0.4, 0.4))),
            def.glow ? 0xaef4ff : 0xfff0b0);
        }
      }
    });
  }

  // 収穫できる花・咲いてる花のリスト
  bloomedPlots() {
    return this.visiblePlots().filter((p) => {
      const d = this.plotData(p.id);
      return d && d.progress >= 1;
    });
  }

  highlight(id, on) {
    const p = this.plots.get(id);
    if (p) p.ring.material.opacity = on ? 0.85 : 0;
  }
}

function makeMarker() {
  const g = new THREE.Group();
  g.scale.setScalar(1.4);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffe066 });
  const bar = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.3, 3, 6), mat);
  g.add(bar);
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), mat);
  dot.position.y = -0.38;
  g.add(dot);
  return g;
}
