// ワールドスポーン:もやもやゴースト・ほしのかけら・ドロップアイテム
import * as THREE from 'three';
import { rand, pick, TAU, makeCanvas, glowTexture } from '../core/utils.js';
import { state, addItem, addCoins, addHappiness, questProgress } from './state.js';
import { itemInfo } from './data.js';
import { ui } from '../ui/ui.js';
import { audio } from '../core/audio.js';

function emojiTex(emoji) {
  return makeCanvas(96, 96, (ctx) => {
    ctx.font = '68px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 48, 54);
  });
}

export class Spawns {
  constructor(scene, particles) {
    this.scene = scene;
    this.particles = particles;
    this.ghosts = [];    // {group, t, cx, cz, hp}
    this.pickups = [];   // {sprite, itemId, t}
    this.shards = [];    // {group, vy, landed, t}
    this.ghostT = rand(14, 22);
    this.shardT = rand(6, 12);
    this.texGlow = glowTexture('rgba(180,160,255,.9)', 'rgba(120,100,200,0)');
    this.texStarShard = emojiTex('✨');
    this.pickupTex = {};
  }

  // ---------- ゴースト ----------
  _spawnGhost() {
    const g = new THREE.Group();
    // もやもや本体(半透明のかたまり)
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x6a5aa8, transparent: true, opacity: 0.75,
      emissive: 0x4a3a88, emissiveIntensity: 0.6, roughness: 0.6,
    });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 10), bodyMat);
    body.scale.y = 1.15;
    g.add(body);
    for (let i = 0; i < 3; i++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(rand(0.2, 0.32), 8, 6), bodyMat);
      const a = rand(TAU);
      puff.position.set(Math.cos(a) * 0.45, rand(-0.3, 0.3), Math.sin(a) * 0.45);
      g.add(puff);
    }
    // 目
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      eye.position.set(s * 0.2, 0.12, 0.48);
      g.add(eye);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), new THREE.MeshBasicMaterial({ color: 0x221144 }));
      pupil.position.set(s * 0.2, 0.12, 0.56);
      g.add(pupil);
    }
    // オーラ
    const aura = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.texGlow, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    aura.scale.setScalar(2.2);
    g.add(aura);

    const a = rand(TAU), r = rand(8, 30);
    const cx = Math.cos(a) * r, cz = Math.sin(a) * r;
    g.position.set(cx, 1.2, cz);
    this.scene.add(g);
    this.ghosts.push({ group: g, t: rand(100), cx, cz });
    return g;
  }

  // 魔法で払う(wand から呼ばれる)/ 範囲内のゴーストを返す
  zapGhosts(pos, radius) {
    let n = 0;
    for (let i = this.ghosts.length - 1; i >= 0; i--) {
      const gh = this.ghosts[i];
      if (gh.group.position.distanceTo(pos) < radius) {
        this.particles.sparkle(gh.group.position.clone(), 26, 0xc3a6ff);
        this.scene.remove(gh.group);
        this.ghosts.splice(i, 1);
        n++;
        state.ghostsZapped++;
        const coins = 15 + Math.floor(rand(10));
        addCoins(coins);
        addHappiness(3);
        questProgress('ghost');
        questProgress('ghostTotal');
        audio.sfx('ghost');
        ui.toast(`👻 ゴーストを はらった! +🪙${coins} +💖3`);
      }
    }
    return n;
  }

  // ---------- ドロップアイテム(はちみつ・りんご・ほしのかけら) ----------
  dropItem(itemId, x, z) {
    const info = itemInfo(itemId);
    if (!this.pickupTex[itemId]) this.pickupTex[itemId] = emojiTex(info?.icon || '❓');
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.pickupTex[itemId], transparent: true, depthWrite: false,
    }));
    sp.scale.setScalar(0.85);
    sp.position.set(x, 1.6, z);
    this.scene.add(sp);
    this.pickups.push({ sprite: sp, itemId, t: rand(100), vy: rand(1.5, 2.5), life: 45 });
  }

  // ---------- ほしのかけら(夜) ----------
  _spawnShard() {
    const g = new THREE.Group();
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.texStarShard, transparent: true, depthWrite: false,
    }));
    sp.scale.setScalar(1);
    g.add(sp);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.texGlow, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xfff0b8,
    }));
    glow.scale.setScalar(2);
    g.add(glow);
    const a = rand(TAU), r = rand(5, 32);
    g.position.set(Math.cos(a) * r, rand(22, 30), Math.sin(a) * r);
    this.scene.add(g);
    this.shards.push({ group: g, landed: false, t: rand(100) });
  }

  update(dt, t, nightF, playerPos) {
    // --- ゴースト出現 ---
    this.ghostT -= dt;
    if (this.ghostT <= 0) {
      this.ghostT = rand(16, 30);
      if (this.ghosts.length < 3) {
        this._spawnGhost();
      }
    }
    for (const gh of this.ghosts) {
      gh.t += dt;
      gh.group.position.x = gh.cx + Math.sin(gh.t * 0.7) * 2;
      gh.group.position.z = gh.cz + Math.cos(gh.t * 0.5) * 2;
      gh.group.position.y = 1.2 + Math.sin(gh.t * 2) * 0.25;
      gh.group.rotation.y = Math.sin(gh.t * 0.8) * 0.6;
    }

    // --- ほしのかけら(夜だけ降る) ---
    if (nightF > 0.7) {
      this.shardT -= dt;
      if (this.shardT <= 0 && this.shards.length < 4) {
        this.shardT = rand(6, 14);
        this._spawnShard();
      }
    }
    for (const sh of this.shards) {
      sh.t += dt;
      if (!sh.landed) {
        sh.group.position.y -= dt * 7;
        // キラキラの尾
        if (Math.random() < dt * 20) {
          this.particles.dust(sh.group.position);
        }
        if (sh.group.position.y <= 0.9) {
          sh.group.position.y = 0.9;
          sh.landed = true;
          this.particles.sparkle(sh.group.position.clone(), 14, 0xfff0b8);
        }
      } else {
        sh.group.position.y = 0.9 + Math.sin(sh.t * 3) * 0.12;
        // 朝になったら消える
        if (nightF < 0.3) {
          this.scene.remove(sh.group);
          this.shards.splice(this.shards.indexOf(sh), 1);
        }
      }
    }
    // かけら回収
    for (let i = this.shards.length - 1; i >= 0; i--) {
      const sh = this.shards[i];
      if (sh.landed && sh.group.position.distanceTo(playerPos) < 1.4) {
        this.scene.remove(sh.group);
        this.shards.splice(i, 1);
        addItem('stardust', 1);
        questProgress('item', { id: 'stardust' });
        addHappiness(2);
        audio.sfx('sparkle');
        this.particles.sparkle(playerPos.clone().setY(1.5), 18, 0xfff0b8);
        ui.toast('✨ ほしのかけらを ひろった!');
      }
    }

    // --- ピックアップ ---
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.t += dt;
      p.life -= dt;
      // 落下 → ふわふわ
      if (p.sprite.position.y > 0.7) {
        p.vy -= dt * 6;
        p.sprite.position.y = Math.max(0.7, p.sprite.position.y + p.vy * dt);
      } else {
        p.sprite.position.y = 0.7 + Math.sin(p.t * 3) * 0.08;
      }
      if (p.life <= 0) {
        this.scene.remove(p.sprite);
        this.pickups.splice(i, 1);
        continue;
      }
      if (p.sprite.position.distanceTo(playerPos) < 1.3) {
        const info = itemInfo(p.itemId);
        addItem(p.itemId, 1);
        questProgress('item', { id: p.itemId });
        audio.sfx('coin');
        ui.toast(`${info?.icon || ''} ${info?.name || p.itemId}を ひろった!`);
        this.scene.remove(p.sprite);
        this.pickups.splice(i, 1);
      }
    }
  }
}
void pick;
