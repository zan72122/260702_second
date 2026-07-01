// ゲーム全体の統括: レンダリング・状態遷移・当たり判定・スコア
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { clamp, lerp, damp, rand, pick, aabbOverlap } from './utils.js';
import { Input } from './input.js';
import { AudioSys } from './audio.js';
import { Effects } from './effects.js';
import { World, STAGES } from './world.js';
import { Player } from './player.js';
import { spawnEnemy } from './enemies.js';
import { Fruit, Coin, HeartPickup, Crate, Spring, Checkpoint, FRUIT_INFO } from './collectibles.js';
import { EggTrail, Reticle, EggProjectile, MAX_EGGS } from './eggs.js';
import { UI } from './ui.js';

const FRUIT_GOAL = 30;
const MAX_PETALS = 8;
const DEBUG = new URLSearchParams(location.search).has('debug');

class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;

    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 900);
    this.camera.position.set(0, 4, 11);

    this.input = new Input();
    this.audio = new AudioSys();
    this.ui = new UI();

    this.state = 'title';
    this.stageIndex = 0;
    this.totalScore = 0;
    this.best = Number(localStorage.getItem('yis-best') || 0);
    this.ui.setBest(this.best);
    this._cooldown = 0;
    this._clock = new THREE.Clock();
    this._projV = new THREE.Vector3();
    this._audioReady = false;

    window.addEventListener('resize', () => this._onResize());
    document.getElementById('mute-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.audio.setMuted(!this.audio.muted);
      document.getElementById('mute-btn').textContent = this.audio.muted ? '🔇' : '🔊';
    });
    document.getElementById('pause-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this._togglePause();
    });
    document.getElementById('pause-screen').addEventListener('click', () => {
      if (this.state === 'pause') this._togglePause();
    });

    this.playerEvents = {
      jump: () => this.audio.sfx('jump'),
      flutterStart: () => this.audio.sfx('flutter'),
      poundStart: () => this.audio.sfx('pound'),
      poundLand: () => this._onPoundLand(),
      land: () => { this.audio.sfx('land'); this.effects.dust(this.player.x, this.player.feetY); },
      hurt: () => this.audio.sfx('hurt'),
      tongue: () => this.audio.sfx('tongue'),
    };

    this.buildStage(0, true);
    if (DEBUG) window.__game = this;
    this.renderer.setAnimationLoop(() => this._frame());
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer?.setSize(window.innerWidth, window.innerHeight);
  }

  // ---------- ステージ構築 ----------
  buildStage(index, attract = false) {
    if (this.scene) this._disposeScene();
    this.stageIndex = index;
    this.scene = new THREE.Scene();
    this.world = new World(this.scene, index);
    this.effects = new Effects(this.scene);
    this.player = new Player(this.scene);
    this.player.reset(0, 2);
    this.eggTrail = new EggTrail(this.scene);
    this.reticle = new Reticle(this.scene);
    this.projectiles = [];

    const stage = this.world.stage;
    this.enemies = stage.enemies.map((d) => spawnEnemy(this.scene, d, stage.platforms));
    this.fruits = stage.fruits.map((f) => new Fruit(this.scene, f.x, f.y, f.type));
    this.coins = stage.coins.map((c) => new Coin(this.scene, c.x, c.y));
    this.hearts = stage.hearts.map((h) => new HeartPickup(this.scene, h.x, h.y));
    this.crates = stage.crates.map((c) => new Crate(this.scene, c.x, c.y));
    this.springs = stage.springs.map((s) => new Spring(this.scene, s.x, s.y));
    this.checkpoints = stage.checkpoints.map((c) => new Checkpoint(this.scene, c.x, c.y));

    this.staticSolids = stage.platforms.filter((p) => !p.oneWay);
    this.staticOneWays = stage.platforms.filter((p) => p.oneWay);

    // ステージ状態
    this.collected = [];
    this.petals = MAX_PETALS;
    this.stageStartScore = this.totalScore;
    this.coinCount = 0;
    this.enemiesDefeated = 0;
    this.combo = 0;
    this.lastFruit = null;
    this.respawn = { x: 0, y: 2 };
    this.aiming = false;
    this._happyOn = false;
    this._clearFx = 0;

    // ブルーム (夜は強め)
    const night = this.world.theme.night;
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      night ? 0.85 : 0.45, 0.7, night ? 0.55 : 0.82
    );
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    if (!attract) {
      this.ui.setFruits(this.collected, FRUIT_GOAL);
      this.ui.setPetals(this.petals, MAX_PETALS);
      this.ui.setScore(this.totalScore);
      this.ui.setCombo(0);
      this.ui.showBanner(`${stage.name}<br><span style="font-size:.6em">${stage.subtitle}</span>`);
      this.audio.playSong(index);
      this.audio.setHappyMode(false);
    }
    this.camera.position.set(this.player.x, 4, 11);
  }

  _disposeScene() {
    this.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) { m.map?.dispose(); m.dispose(); }
      }
    });
    this.composer?.dispose();
  }

  // ---------- 状態遷移 ----------
  _setState(s) {
    this.state = s;
    this._cooldown = 0.45;
    document.body.classList.toggle('playing', s === 'play');
  }

  _startGame() {
    this.totalScore = 0;
    this.buildStage(this.stageIndex = 0);
    this.ui.screen('title-screen', false);
    this._setState('play');
  }

  _togglePause() {
    if (this.state === 'play') {
      this._setState('pause');
      this.ui.screen('pause-screen', true);
      this.audio.ctx?.suspend();
    } else if (this.state === 'pause') {
      this._setState('play');
      this.ui.screen('pause-screen', false);
      this.audio.ctx?.resume();
    }
  }

  _stageClear() {
    this._setState('clear');
    this.audio.stopSong();
    this.audio.setHappyMode(false);
    this.audio.sfx('clear');
    const bonus = this.petals * 200;
    this.totalScore += bonus;
    this.ui.setScore(this.totalScore);
    const isEnding = this.stageIndex >= STAGES.length - 1;
    if (isEnding && this.totalScore > this.best) {
      this.best = this.totalScore;
      localStorage.setItem('yis-best', String(this.best));
    }
    this.ui.setClearTally({
      fruits: this.collected.length,
      coins: this.coinCount,
      enemies: this.enemiesDefeated,
      petals: this.petals,
      stageScore: this.totalScore - this.stageStartScore,
      isEnding,
      total: this.totalScore,
      best: this.best,
    });
    setTimeout(() => this.ui.screen('clear-screen', true), 1600);
  }

  _gameOver() {
    this._setState('gameover');
    this.audio.stopSong();
    this.audio.setHappyMode(false);
    this.audio.sfx('gameover');
    setTimeout(() => this.ui.screen('gameover-screen', true), 900);
  }

  // ---------- スコア・収集 ----------
  _pop(x, y, text, color) {
    this._projV.set(x, y, 0).project(this.camera);
    this.ui.scorePop(
      (this._projV.x * 0.5 + 0.5) * window.innerWidth,
      (-this._projV.y * 0.5 + 0.5) * window.innerHeight,
      text, color
    );
  }

  _addScore(n, x, y, color = '#fff') {
    this.totalScore += n;
    this.ui.setScore(this.totalScore);
    if (x !== undefined) this._pop(x, y, `+${n}`, color);
  }

  _collectFruit(fruit) {
    const { type, aabb } = fruit;
    fruit.collect(this.scene);
    const info = FRUIT_INFO[type];
    this.effects.juicePop(aabb.x, aabb.y, info.color);

    if (type === this.lastFruit) this.combo++;
    else this.combo = 1;
    this.lastFruit = type;
    const comboBonus = (this.combo - 1) * 50;
    this._addScore(info.score + comboBonus, aabb.x, aabb.y + 0.6, info.color);
    this.ui.setCombo(this.combo, type);
    if (this.combo >= 3) {
      this.effects.confetti(aabb.x, aabb.y);
      this.audio.sfx('combo');
    } else {
      this.audio.sfx('fruit');
    }
    if (type === 'heart') {
      // スーパーハッピー!
      this.player.startHappy();
      this.audio.sfx('happy-start');
      this.audio.setHappyMode(true);
      this._happyOn = true;
      this.ui.showHint('✨ スーパーハッピー! むてきだ! ✨');
      this.effects.confetti(aabb.x, aabb.y, 40);
    }

    this.collected.push(type);
    this.ui.setFruits(this.collected, FRUIT_GOAL);
    if (this.collected.length >= FRUIT_GOAL && this.state === 'play') this._stageClear();
  }

  _dropFruitAt(x, y) {
    const type = pick(['apple', 'melon', 'grape', 'banana']);
    const f = new Fruit(this.scene, x, Math.max(y, 1) + 0.6, type);
    this.fruits.push(f);
  }

  _defeatEnemy(e, scoreV = 200) {
    if (!e.defeat()) return;
    this.enemiesDefeated++;
    this.effects.poof(e.aabb.x, e.aabb.y, '#fff');
    this._addScore(scoreV, e.aabb.x, e.aabb.y + 0.8, '#ffd94d');
    this._dropFruitAt(e.aabb.x, e.aabb.y);
  }

  _onPoundLand() {
    this.audio.sfx('stomp');
    this.effects.addShake(0.55);
    this.effects.dust(this.player.x, this.player.feetY, 14);
    // 近くの敵を倒し、クレートをこわす
    for (const e of this.enemies) {
      if (e.dead || e.dying > 0) continue;
      if (Math.abs(e.aabb.x - this.player.x) < 2.2 && Math.abs(e.aabb.y - this.player.y) < 1.8 && e.stompable) {
        this._defeatEnemy(e, 300);
      }
    }
    for (const c of this.crates) {
      if (!c.dead && Math.abs(c.aabb.x - this.player.x) < 2.0 && Math.abs(c.aabb.y - this.player.y) < 1.8) {
        this._breakCrate(c);
      }
    }
  }

  _breakCrate(c) {
    c.break_(this.scene);
    this.audio.sfx('break');
    this.effects.poof(c.aabb.x, c.aabb.y, '#c8965a');
    // フルーツが飛び出す
    const types = [pick(['apple', 'grape', 'banana']), 'melon', pick(['apple', 'grape', 'banana'])];
    types.forEach((t, i) => {
      this.fruits.push(new Fruit(this.scene, c.aabb.x + (i - 1) * 0.9, c.aabb.y + 1.3 + Math.abs(i - 1) * -0.2 + 0.4, t));
    });
  }

  _hurtPlayer() {
    if (!this.player.hurt(this.playerEvents)) return;
    this.petals--;
    this.ui.setPetals(this.petals, MAX_PETALS);
    this.effects.petalScatter(this.player.x, this.player.y + 0.5);
    this.effects.addShake(0.4);
    this.combo = 0;
    this.ui.setCombo(0);
    if (this.petals <= 0) this._gameOver();
  }

  // ---------- メインループ ----------
  _frame() {
    const dt = Math.min(this._clock.getDelta(), 0.033);
    this.input.update();
    this._cooldown = Math.max(0, this._cooldown - dt);

    // 最初のユーザー操作でオーディオ起動
    if (!this._audioReady && this.input.anyPressed) {
      this.audio.init();
      this.audio.resume();
      this._audioReady = true;
    }

    switch (this.state) {
      case 'title': this._updateTitle(dt); break;
      case 'play': this._updatePlay(dt); break;
      case 'pause': this.input.consumeAny(); if (this.input.pressed('pause')) this._togglePause(); break;
      case 'clear': this._updateClear(dt); break;
      case 'gameover': this._updateGameOver(dt); break;
    }

    this.ui.tick(dt);

    // カメラシェイク
    const sh = this.effects.shake;
    if (sh > 0) {
      this.camera.position.x += rand(-sh, sh) * 0.25;
      this.camera.position.y += rand(-sh, sh) * 0.25;
    }
    this.composer.render();
  }

  _updateTitle(dt) {
    // アトラクトモード: ゆっくり流し見せ
    const t = this._clock.elapsedTime;
    const x = 30 + Math.sin(t * 0.1) * 26;
    this.camera.position.set(x, 5.5 + Math.sin(t * 0.23) * 1.5, 13);
    this.camera.lookAt(x + 3, 3, 0);
    this.world.update(dt, x);
    this.effects.update(dt);
    for (const e of this.enemies) e.update(dt, this.world.time, this.scene);
    for (const f of this.fruits) f.update(dt, this.world.time);
    for (const c of this.coins) c.update(dt, this.world.time);

    if (this._cooldown <= 0 && this.input.consumeAny()) {
      this.audio.sfx('select');
      this._startGame();
    }
  }

  _updateClear(dt) {
    // お祝い花火
    this._clearFx -= dt;
    if (this._clearFx <= 0) {
      this._clearFx = 0.35;
      this.effects.firework(this.player.x + rand(-6, 6), this.player.y + rand(3, 7));
      this.audio.sfx('firework');
    }
    this.world.update(dt, this.player.x);
    this.effects.update(dt);
    this.eggTrail.update(dt, this.world.time);
    this._updateCamera(dt);

    if (this._cooldown > 1 || document.getElementById('clear-screen').classList.contains('hidden')) {
      this.input.consumeAny();
      return;
    }
    if (this._cooldown <= 0 && this.input.consumeAny()) {
      this.ui.screen('clear-screen', false);
      this.audio.sfx('select');
      if (this.stageIndex >= STAGES.length - 1) {
        // エンディング → タイトルへ
        this.ui.setBest(this.best);
        this.buildStage(0, true);
        this.ui.screen('title-screen', true);
        this._setState('title');
      } else {
        this.buildStage(this.stageIndex + 1);
        this._setState('play');
      }
    }
  }

  _updateGameOver(dt) {
    this.world.update(dt, this.player.x);
    this.effects.update(dt);
    if (document.getElementById('gameover-screen').classList.contains('hidden')) {
      this.input.consumeAny();
      return;
    }
    if (this._cooldown <= 0 && this.input.consumeAny()) {
      this.ui.screen('gameover-screen', false);
      this.audio.sfx('select');
      this.totalScore = this.stageStartScore;
      this.buildStage(this.stageIndex);
      this._setState('play');
    }
  }

  _updatePlay(dt) {
    if (this.input.pressed('pause')) { this._togglePause(); return; }
    const time = this.world.time;
    const p = this.player;

    // ---- デバッグ ----
    if (DEBUG) {
      const k = this.input.consumeDebugKey();
      if (k === 'KeyN') {
        for (let i = 0; i < 5 && this.fruits.length > 0; i++) {
          const f = this.fruits.find((f) => !f.dead);
          if (f) this._collectFruit(f);
        }
      } else if (k === 'KeyG') {
        p.x = this.world.stage.goal.x - 3; p.y = 3; p.vy = 0;
      } else if (k === 'KeyH') {
        this.petals = 1; this.ui.setPetals(1, MAX_PETALS);
      }
    }

    // ---- タマゴの照準と投擲 ----
    if (this.input.pressed('egg')) {
      if (this.eggTrail.count > 0) {
        this.aiming = true;
        p.aiming = true;
        this.reticle.show();
      } else {
        this.ui.showHint('タマゴがないよ! X で敵をパクッとたべよう');
      }
    }
    if (this.input.released('egg') && this.aiming) {
      this.aiming = false;
      p.aiming = false;
      this.reticle.hide();
      this.eggTrail.take();
      this.projectiles.push(new EggProjectile(this.scene, p.x + p.dir * 0.5, p.y + 0.5, this.reticle.angle, p.dir));
      this.audio.sfx('egg-throw');
    }

    // ---- 舌 ----
    if (this.input.pressed('eat')) p.startTongue(this.playerEvents);

    // ---- プレイヤー物理 ----
    const solids = [...this.staticSolids];
    for (const c of this.crates) if (!c.dead) solids.push(c.aabb);
    const oneWays = [...this.staticOneWays];
    for (const m of this.world.movers) { m.aabb.mover = m; oneWays.push(m.aabb); }
    p.update(dt, this.input, solids, oneWays, this.playerEvents);

    // ステージ端の見えない壁
    if (p.x < -6.5) { p.x = -6.5; p.vx = Math.max(0, p.vx); }
    const rightEnd = this.world.stage.length + 2;
    if (p.x > rightEnd) { p.x = rightEnd; p.vx = Math.min(0, p.vx); }

    // ---- ワールド ----
    this.world.update(dt, p.x);
    this.effects.update(dt);
    this.eggTrail.record(p.x, p.y);
    this.eggTrail.update(dt, time);
    this.reticle.update(dt, p.x, p.y, p.dir);
    for (const s of this.springs) s.update(dt);
    for (const c of this.checkpoints) c.update(dt, time);

    // スーパーハッピー
    if (this._happyOn) {
      this.effects.happyAura(p.x, p.y);
      if (p.happyTimer <= 0) {
        this._happyOn = false;
        this.audio.setHappyMode(false);
      }
    }

    // ---- ばね床 ----
    for (const s of this.springs) {
      if (p.fallSpeed < -2 && p.vy <= 0 && aabbOverlap(p.aabb, s.aabb)) {
        s.trigger();
        p.bounce(17.5);
        this.audio.sfx('spring');
        this.effects.dust(s.aabb.x, s.aabb.y + 0.4, 8);
      }
    }

    // ---- チェックポイント ----
    for (const c of this.checkpoints) {
      if (!c.activated && aabbOverlap(p.aabb, c.aabb)) {
        c.activate();
        this.audio.sfx('checkpoint');
        this.respawn = { x: c.x, y: c.y + 1.5 };
        if (this.petals < MAX_PETALS) {
          this.petals++;
          this.ui.setPetals(this.petals, MAX_PETALS);
        }
        this.ui.showHint('🌸 チェックポイント! げんきも かいふく!');
        this.effects.confetti(c.x, c.y + 2.5, 16);
      }
    }

    // ---- 収集物 ----
    for (const f of this.fruits) {
      if (f.dead) continue;
      f.update(dt, time);
      if (aabbOverlap(p.aabb, f.aabb)) this._collectFruit(f);
    }
    for (const c of this.coins) {
      if (c.dead) continue;
      c.update(dt, time);
      if (aabbOverlap(p.aabb, c.aabb)) {
        c.collect(this.scene);
        this.coinCount++;
        this._addScore(50, c.aabb.x, c.aabb.y + 0.5, '#ffd94d');
        this.audio.sfx('coin');
        this.effects.starBurst(c.aabb.x, c.aabb.y);
      }
    }
    for (const h of this.hearts) {
      if (h.dead) continue;
      h.update(dt, time);
      if (aabbOverlap(p.aabb, h.aabb)) {
        h.collect(this.scene);
        this.audio.sfx('heart');
        if (this.petals < MAX_PETALS) {
          this.petals = Math.min(MAX_PETALS, this.petals + 2);
          this.ui.setPetals(this.petals, MAX_PETALS);
        }
        this._addScore(200, h.aabb.x, h.aabb.y + 0.5, '#ff8fa8');
        this.effects.juicePop(h.aabb.x, h.aabb.y, '#ff6b8a');
      }
    }

    // ---- 敵 ----
    const tongueBox = p.tongueAABB();
    for (const e of this.enemies) {
      if (e.dead) continue;
      e.update(dt, time, this.scene);
      if (e.dead || e.dying > 0) continue;

      // 舌でたべる → タマゴに
      if (tongueBox && e.edible && aabbOverlap(tongueBox, e.aabb)) {
        e.removeNow(this.scene);
        this.enemiesDefeated++;
        this.audio.sfx('gulp');
        this.effects.poof(e.aabb.x, e.aabb.y, '#a8e8a8');
        this._addScore(200, e.aabb.x, e.aabb.y + 0.6, '#a8e8a8');
        if (this.eggTrail.add()) this.audio.sfx('egg-make');
        continue;
      }

      if (!aabbOverlap(p.aabb, e.aabb)) continue;

      if (p.happyTimer > 0) {
        // むてき: 触れるだけで倒せる
        this._defeatEnemy(e, 300);
      } else if (e.stompable && p.pound === 2) {
        this._defeatEnemy(e, 300);
        p.bounce(10);
        this.audio.sfx('stomp');
      } else if (e.stompable && p.vy < -1 && p.feetY > e.aabb.y - e.aabb.hh * 0.3) {
        // ふみつけ
        this._defeatEnemy(e, 200);
        p.bounce(10);
        this.audio.sfx('stomp');
        this.effects.addShake(0.15);
      } else {
        this._hurtPlayer();
      }
    }

    // ---- タマゴ弾 ----
    for (const egg of this.projectiles) {
      egg.update(dt, solids, this.staticOneWays);
      if (egg.dead) continue;
      // 敵に命中
      for (const e of this.enemies) {
        if (e.dead || e.dying > 0) continue;
        if (aabbOverlap(egg.aabb, e.aabb)) {
          this._defeatEnemy(e, 250);
          this.effects.starBurst(egg.aabb.x, egg.aabb.y);
          this.audio.sfx('egg-pop');
          egg.pop();
          break;
        }
      }
      if (egg.dead) continue;
      // クレートをこわす
      for (const c of this.crates) {
        if (!c.dead && aabbOverlap(egg.aabb, c.aabb)) {
          this._breakCrate(c);
          egg.pop();
          break;
        }
      }
      if (egg.dead) continue;
      // タマゴでもフルーツ・コインがとれる!
      for (const f of this.fruits) {
        if (!f.dead && aabbOverlap(egg.aabb, f.aabb)) this._collectFruit(f);
      }
      for (const c of this.coins) {
        if (!c.dead && aabbOverlap(egg.aabb, c.aabb)) {
          c.collect(this.scene);
          this.coinCount++;
          this._addScore(50, c.aabb.x, c.aabb.y + 0.5, '#ffd94d');
          this.audio.sfx('coin');
          this.effects.starBurst(c.aabb.x, c.aabb.y);
        }
      }
    }
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const egg = this.projectiles[i];
      if (egg.dead) {
        this.effects.poof(egg.mesh.position.x, egg.mesh.position.y, '#eaffdd');
        this.scene.remove(egg.mesh);
        this.projectiles.splice(i, 1);
      }
    }

    // ---- ゴールの花 ----
    if (aabbOverlap(p.aabb, this.world.goalAABB) && this.state === 'play') {
      const rest = FRUIT_GOAL - this.collected.length;
      if (rest > 0) this.ui.showHint(`フルーツが あと ${rest}こ たりないよ! もどって さがそう!`);
    }

    // ---- 落下 ----
    if (p.y < this.world.killY && this.state === 'play') {
      this.petals--;
      this.ui.setPetals(this.petals, MAX_PETALS);
      this.combo = 0;
      this.ui.setCombo(0);
      this.audio.sfx('hurt');
      this.effects.addShake(0.5);
      if (this.petals <= 0) {
        this._gameOver();
      } else {
        p.reset(this.respawn.x, this.respawn.y);
        p.hurtTimer = 2;
        this.ui.showHint('おっとっと! きをつけて!');
      }
    }

    this._updateCamera(dt);
  }

  _updateCamera(dt) {
    const p = this.player;
    const stageLen = this.world.stage.length;
    const tx = clamp(p.x + p.dir * 1.8, 4, stageLen - 5);
    const ty = Math.max(p.y + 1.6, 3.4);
    this.camera.position.x = damp(this.camera.position.x, tx, 6, dt);
    this.camera.position.y = damp(this.camera.position.y, ty, 5, dt);
    this.camera.position.z = 11;
    this.camera.lookAt(this.camera.position.x + 0.5, this.camera.position.y - 1.2, 0);
  }
}

new Game();
