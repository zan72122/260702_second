// ガーデニング:タネうえ → まほうの水やり → しゅうかく
import * as THREE from 'three';
import { mat, glowMat, shadow } from '../core/utils.js';
import { state, addItem, recordCollection, questProgress, scheduleSave, emit } from './state.js';
import { FLOWERS, flowerById } from './data.js';
import { ui } from '../ui/ui.js';
import { audio } from '../core/audio.js';

const FLOWER_COLOR = {
  flw_tulip: 0xff6f9e, flw_sun: 0xffc93e, flw_rose: 0xe8385e, flw_star: 0xfff0b8,
};

export class Farming {
  constructor(scene, plotPositions, particles) {
    this.scene = scene;
    this.particles = particles;
    this.plots = plotPositions.map((p, i) => {
      const group = new THREE.Group();
      group.position.set(p.x, 0.2, p.z);
      // 土のうね
      const soil = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.2, 0.3, 10), mat(0x7a5230, { roughness: 1 }));
      group.add(soil);
      shadow(group, false, true);
      scene.add(group);
      return { i, x: p.x, z: p.z, group, plantGroup: null, sparkle: 0 };
    });
    // セーブから復元
    this.plots.forEach((plot, i) => {
      const s = state.garden[i];
      if (s) this._buildPlant(plot, s);
    });
  }

  plotState(i) { return state.garden[i]; }

  // 進行度 0..1
  growth(i) {
    const s = state.garden[i];
    if (!s) return 0;
    if (!s.watered) return 0.05;
    const f = flowerById(s.flowerId);
    return Math.min(1, (Date.now() - s.wateredAt) / (f.growTime * 1000));
  }

  interactLabel(i) {
    const s = state.garden[i];
    if (!s) return { icon: '🌱', label: 'タネをうえる', hint: '🌱 タネをうえる' };
    if (!s.watered) return { icon: '💧', label: 'みずやり', hint: '🪄 まほうで おみずをあげよう' };
    if (this.growth(i) >= 1) return { icon: '🌷', label: 'つむ', hint: '🌷 おはなを つもう!' };
    return null;
  }

  async plant(i, playerPos) {
    // 持っているタネの選択肢
    const seeds = FLOWERS.filter((f) => (state.inventory['seed_' + f.id] || 0) > 0);
    if (seeds.length === 0) {
      audio.sfx('error');
      ui.toast('🌱 タネを もっていないよ。ショップで かおう!');
      return;
    }
    const opts = seeds.map((f) => `${f.icon} ${f.name}のタネ (×${state.inventory['seed_' + f.id]})`);
    opts.push('やめる');
    const sel = await ui.showChoices('はたけ', 'どのタネを うえる?', opts);
    if (sel >= seeds.length) return;
    const f = seeds[sel];
    state.inventory['seed_' + f.id]--;
    if (state.inventory['seed_' + f.id] <= 0) delete state.inventory['seed_' + f.id];
    state.garden[i] = { flowerId: f.id, watered: false, wateredAt: 0 };
    this._buildPlant(this.plots[i], state.garden[i]);
    audio.sfx('plant');
    this.particles.dust(this.plots[i].group.position);
    ui.toast(`🌱 ${f.name}のタネを うえた!`);
    scheduleSave();
  }

  // まほうの水やり(ワンドから呼ばれる)
  water(i) {
    const s = state.garden[i];
    if (!s || s.watered) return false;
    s.watered = true;
    s.wateredAt = Date.now();
    audio.sfx('water');
    const p = this.plots[i].group.position;
    this.particles.splash(new THREE.Vector3(p.x, 1, p.z), 14);
    ui.toast('💧 おみずを あげた!');
    scheduleSave();
    return true;
  }

  harvest(i) {
    const s = state.garden[i];
    if (!s || this.growth(i) < 1) return;
    const f = flowerById(s.flowerId);
    addItem(f.id, 1);
    const first = recordCollection('flowers', f.id);
    questProgress('harvest');
    questProgress('deliver', { id: f.id });
    state.garden[i] = null;
    const plot = this.plots[i];
    if (plot.plantGroup) { plot.group.remove(plot.plantGroup); plot.plantGroup = null; }
    audio.sfx('catch');
    const p = plot.group.position;
    this.particles.sparkle(new THREE.Vector3(p.x, 1, p.z), 20, 0xffb7d9);
    ui.toast(`${f.icon} ${f.name}を しゅうかく!` + (first ? ' <small>ずかんに とうろく✨</small>' : ''));
    emit('flowerHarvest', { id: f.id });
    scheduleSave();
  }

  _buildPlant(plot, s) {
    if (plot.plantGroup) plot.group.remove(plot.plantGroup);
    const g = new THREE.Group();
    const f = flowerById(s.flowerId);
    // 茎
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1, 6), mat(0x4a9e5c));
    stem.position.y = 0.5;
    g.add(stem);
    // 葉
    for (const sx of [-1, 1]) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), mat(0x5cb860));
      leaf.scale.set(1.4, 0.4, 0.7);
      leaf.position.set(sx * 0.18, 0.4, 0);
      g.add(leaf);
    }
    // 花(スケールで成長表現)
    const isStar = s.flowerId === 'flw_star';
    const headMat2 = isStar ? glowMat(FLOWER_COLOR[s.flowerId], 0.9) : mat(FLOWER_COLOR[s.flowerId], { roughness: 0.6 });
    const head = new THREE.Mesh(
      s.flowerId === 'flw_sun' ? new THREE.SphereGeometry(0.3, 10, 8) : new THREE.IcosahedronGeometry(0.26, 0),
      headMat2
    );
    head.position.y = 1.05;
    g.add(head);
    if (s.flowerId === 'flw_sun') {
      for (let k = 0; k < 8; k++) {
        const petal = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 5), mat(0xffe089));
        const a = (k / 8) * Math.PI * 2;
        petal.scale.set(1, 0.4, 1.6);
        petal.position.set(Math.cos(a) * 0.32, 1.05, Math.sin(a) * 0.32);
        g.add(petal);
      }
    }
    g.position.y = 0.15;
    shadow(g, true, false);
    plot.group.add(g);
    plot.plantGroup = g;
  }

  update(dt, t) {
    for (const plot of this.plots) {
      const s = state.garden[plot.i];
      if (!s || !plot.plantGroup) continue;
      const gr = this.growth(plot.i);
      const sc = 0.15 + gr * 0.95;
      plot.plantGroup.scale.setScalar(sc);
      plot.plantGroup.rotation.z = Math.sin(t * 1.8 + plot.i) * 0.05;
      // 収穫可能キラキラ
      if (gr >= 1) {
        plot.sparkle -= dt;
        if (plot.sparkle <= 0) {
          plot.sparkle = 0.9;
          const p = plot.group.position;
          this.particles.sparkle(new THREE.Vector3(p.x, 1.2, p.z), 3, 0xfff0b8);
        }
      }
    }
  }
}
