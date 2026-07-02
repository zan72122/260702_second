// まほうのステッキ:スパークル魔法(水やり・ゴーストばらい・木ゆすり・NPC よろこばせ)
import * as THREE from 'three';
import { rand } from '../core/utils.js';
import { addHeart } from './state.js';
import { ui } from '../ui/ui.js';
import { audio } from '../core/audio.js';

const MAGIC_RADIUS = 4.2;
const COOLDOWN = 1.1;

export class Wand {
  constructor(game) {
    this.g = game;    // { player, particles, farming, spawns, nature, npcs }
    this.cool = 0;
    this.castT = 0;
  }

  get ready() { return this.cool <= 0; }

  cast() {
    if (!this.ready) return;
    const g = this.g;
    this.cool = COOLDOWN;
    this.castT = 0.55;
    g.player.mode = 'cast';
    audio.sfx('magic');

    // プレイヤーの前方に魔法の中心
    const yaw = g.player.yaw;
    const center = g.player.pos.clone().add(
      new THREE.Vector3(Math.sin(yaw) * 2, 0.8, Math.cos(yaw) * 2)
    );
    g.particles.sparkle(center, 34, 0xffe9a8);
    g.particles.sparkle(g.player.pos.clone().setY(1.6), 12, 0xffb0ff);

    let didSomething = false;

    // 1) ゴーストばらい
    if (g.spawns.zapGhosts(center, MAGIC_RADIUS) > 0) didSomething = true;

    // 2) はたけの水やり
    for (const plot of g.farming.plots) {
      const d = Math.hypot(plot.x - center.x, plot.z - center.z);
      if (d < MAGIC_RADIUS && g.farming.water(plot.i)) didSomething = true;
    }

    // 3) 木をゆする → はちみつ / りんご
    for (const tree of g.nature.trees) {
      const d = Math.hypot(tree.x - center.x, tree.z - center.z);
      if (d < MAGIC_RADIUS && tree.fruit && tree.cooldown <= 0) {
        tree.cooldown = 60; // 1分クールダウン
        tree.shake = 0.7;
        if (Math.random() < 0.75) {
          g.spawns.dropItem(tree.fruit, tree.x + rand(-1, 1), tree.z + rand(1, 2));
          didSomething = true;
        }
      }
    }

    // 4) 住人をよろこばせる(まれにハート)
    for (const n of g.npcs.npcs) {
      const d = n.model.group.position.distanceTo(center);
      if (d < MAGIC_RADIUS) {
        g.particles.hearts(n.model.group.position.clone(), 5);
        if (Math.random() < 0.35) {
          addHeart(n.def.id, 1);
          audio.sfx('heart');
          ui.toast(`${n.def.icon} ${n.def.name}が よろこんでいる! なかよし度アップ💖`);
        }
        didSomething = true;
      }
    }

    void didSomething;
  }

  update(dt) {
    this.cool -= dt;
    if (this.castT > 0) {
      this.castT -= dt;
      if (this.castT <= 0 && this.g.player.mode === 'cast') {
        this.g.player.mode = 'idle';
      }
      // ステッキ先端のきらめき
      const head = this.g.player.refs.wandHead;
      if (head) head.material.emissiveIntensity = 1.1 + this.castT * 4;
    }
    // 木のゆれ
    for (const tree of this.g.nature.trees) {
      tree.cooldown -= dt;
      if (tree.shake > 0) {
        tree.shake -= dt;
        tree.group.rotation.z = Math.sin(tree.shake * 30) * 0.06 * tree.shake;
      }
    }
  }
}
