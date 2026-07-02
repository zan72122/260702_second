// プリンセス マジカルガーデン 〜まほうの花の島〜
// メインループとゲーム全体のオーケストレーション
import * as THREE from 'three';
import { Renderer } from './core/renderer.js';
import { Input } from './core/input.js';
import { AudioSystem } from './core/audio.js';
import { clamp, damp, rand, TAU } from './core/utils.js';
import { GameState, FLOWERS, DECOR, LEVEL_REWARDS } from './game/state.js';
import { QuestSystem } from './game/quests.js';
import { Environment } from './world/environment.js';
import { Island, groundHeight, isOnLand } from './world/island.js';
import { Particles } from './world/particles.js';
import { Creatures } from './world/creatures.js';
import { Garden } from './garden/garden.js';
import { DecorManager, buildDecorMesh } from './garden/decor.js';
import { Princess } from './princess/princess.js';
import { HUD } from './ui/hud.js';

const $ = (id) => document.getElementById(id);

class Game {
  constructor() {
    this.state = new GameState();
    this.audio = new AudioSystem();
    this.clock = new THREE.Clock();
    this.gameTime = 0;
    this.started = false;
    this.mode = 'play'; // play | decor | photo
    this.raycaster = new THREE.Raycaster();
    this.saveTimer = 0;
    this.butterflyTimer = 8;
    this.pendingAction = null;
  }

  // ---------------- 起動 ----------------
  async boot() {
    const fill = $('loading-fill');
    const setP = (p) => { fill.style.width = `${p}%`; };
    const tickFrame = () => new Promise((r) => requestAnimationFrame(r));

    setP(8);
    this.renderer = new Renderer($('game-canvas'));
    await tickFrame();

    setP(20);
    this.env = new Environment(this.renderer.scene, this.state.data.dayTime);
    await tickFrame();

    setP(40);
    this.island = new Island(this.renderer.scene, this.state);
    await tickFrame();

    setP(58);
    this.particles = new Particles(this.renderer.scene);
    this.garden = new Garden(this.renderer.scene, this.state, this.particles);
    this.garden.onBloom((plot, d) => {
      this.audio.bloom();
      this.quests.notifyBloom(d.type);
      const def = FLOWERS[d.type];
      this.hud?.toast(`${def.name}が さいたよ! 🌸`);
      // さいたら ちょうちょが くるかも
      if (Math.random() < 0.6) {
        setTimeout(() => {
          this.creatures?.spawnButterfly(plot.worldPos.clone().add(new THREE.Vector3(0, 1.2, 0)), def.unlockLevel * 0.04);
        }, rand(1000, 4000));
      }
    });
    await tickFrame();

    setP(72);
    this.decor = new DecorManager(this.renderer.scene, this.state, this.particles);
    this.princess = new Princess(this.renderer.scene, this.state, this.particles);
    this.creatures = new Creatures(this.renderer.scene, this.state, this.particles);
    await tickFrame();

    setP(86);
    this.quests = new QuestSystem(this.state);
    this.hud = new HUD(this.state, this.audio);
    this.input = new Input($('game-canvas'));
    this.setupCamera();
    this.setupInput();
    this.setupUI();
    await tickFrame();

    setP(100);
    // タイトルへ
    setTimeout(() => {
      $('loading-screen').classList.add('hidden');
      this.showTitle();
    }, 350);

    // メインループ開始(タイトル裏でも島がまわる)
    this.renderer.renderer.setAnimationLoop(() => this.loop());

    // セーブ(離脱時)
    const flush = () => { if (this.started) { this.state.data.dayTime = this.env.time; this.state.save(); } };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
  }

  showTitle() {
    const title = $('title-screen');
    title.classList.remove('hidden');
    // キラキラをまく
    const box = title.querySelector('.title-sparkles');
    const safe = ['✨', '🌸', '⭐', '🦋', '💖', '🌷', '🌼'];
    for (let i = 0; i < 26; i++) {
      const s = document.createElement('i');
      s.textContent = safe[i % safe.length];
      s.style.left = `${rand(2, 98)}%`;
      s.style.fontSize = `${rand(10, 26)}px`;
      s.style.animationDuration = `${rand(5, 11)}s`;
      s.style.animationDelay = `${rand(0, 8)}s`;
      box.appendChild(s);
    }

    if (this.state.hasSave()) $('btn-continue').classList.remove('hidden');

    $('btn-continue').addEventListener('click', () => this.startGame(true));
    $('btn-newgame').addEventListener('click', () => {
      if (this.state.hasSave() && !confirm('さいしょから はじめると セーブデータが きえるよ。いい?')) return;
      this.startGame(false);
    });
  }

  startGame(fromSave) {
    if (this.started) return;
    this.started = true;
    this.audio.unlock();
    this.audio.fanfare();

    if (fromSave && this.state.load()) {
      this.applyOfflineGrowth();
      this.env.time = this.state.data.dayTime ?? 0.3;
    } else {
      this.state.reset();
    }
    // 水やり状態はセッションをまたがない
    Object.values(this.state.data.plots).forEach((p) => { p.wateredUntil = 0; });

    this.princess.applyDress();
    this.quests.ensureBase();
    $('title-screen').classList.add('hidden');
    this.hud.show();
    this.hud.refreshStats();
    this.refreshQuestBanner();

    // はじめてなら ようせいのあいさつ
    if (!this.state.data.flags.greeted) {
      this.state.data.flags.greeted = true;
      const q = this.quests.current;
      if (q) this.hud.fairySay([q.intro]);
      this.state.save();
    }
  }

  applyOfflineGrowth() {
    const last = this.state.data.lastSaved;
    if (!last) return;
    const away = clamp((Date.now() - last) / 1000, 0, 7200); // 最大2時間ぶん
    if (away < 30) return;
    let grew = false;
    Object.values(this.state.data.plots).forEach((p) => {
      const def = FLOWERS[p.type];
      if (!def || p.progress >= 1 || def.night) return;
      p.progress = Math.min(0.999, p.progress + (away * 0.5) / def.growTime);
      grew = true;
    });
    if (grew) setTimeout(() => this.hud.toast('るすのあいだに 花がそだったよ! 🌱'), 1200);
  }

  // ---------------- カメラ ----------------
  setupCamera() {
    this.camYaw = 0;            // 南側から島の中心をのぞむ
    this.camPitch = 0.62;
    this.camDist = 13;
    this.camFocus = new THREE.Vector3().copy(this.princess.pos);
  }

  updateCamera(dt) {
    const p = this.princess.pos;
    this.camFocus.x = damp(this.camFocus.x, p.x, 5, dt);
    this.camFocus.y = damp(this.camFocus.y, p.y + 1.6, 5, dt);
    this.camFocus.z = damp(this.camFocus.z, p.z, 5, dt);

    const cd = this.camDist;
    const cx = this.camFocus.x + Math.sin(this.camYaw) * Math.cos(this.camPitch) * cd;
    const cy = this.camFocus.y + Math.sin(this.camPitch) * cd;
    const cz = this.camFocus.z + Math.cos(this.camYaw) * Math.cos(this.camPitch) * cd;
    const cam = this.renderer.camera;
    cam.position.set(cx, Math.max(cy, groundHeight(cx, cz) + 1.2), cz);
    cam.lookAt(this.camFocus);
  }

  // ---------------- 入力 ----------------
  setupInput() {
    this.input.onJoystick = (dir) => {
      if (this.mode !== 'play') return;
      this.princess.setJoystick(dir);
      if (dir) this.pendingAction = null;
    };
    this.input.onDragCamera = (dx, dy) => {
      this.camYaw -= dx * 0.0075;
      this.camPitch = clamp(this.camPitch + dy * 0.005, 0.18, 1.15);
    };
    this.input.onPinch = (scale) => {
      this.camDist = clamp(this.camDist / scale, 7, 26);
    };
    this.input.onTap = (x, y) => this.handleTap(x, y);
  }

  screenRay(x, y) {
    const ndc = new THREE.Vector2(
      (x / window.innerWidth) * 2 - 1,
      -(y / window.innerHeight) * 2 + 1,
    );
    this.raycaster.setFromCamera(ndc, this.renderer.camera);
    return this.raycaster;
  }

  handleTap(x, y) {
    if (!this.started || this.mode !== 'play' || this.hud.panelOpen) return;
    const ray = this.screenRay(x, y);

    // 1) ちょうちょ
    const bHits = ray.intersectObjects(this.creatures.butterflies.map((b) => b.group), true);
    if (bHits.length) {
      const b = bHits[0].object.userData.butterfly;
      if (b) { this.tryCatchButterfly(b); return; }
    }

    // 2) ようせい ルミ
    const fHits = ray.intersectObject(this.creatures.fairy.group, true);
    if (fHits.length) {
      this.audio.pop();
      const q = this.quests.current;
      if (this.quests.isComplete()) this.checkQuest();
      else if (q) this.hud.fairySay([q.intro]);
      else this.hud.fairySay(['ぜんぶのクエストをクリアしたなんて すごすぎる! じゆうに 島をかざってあそんでね!']);
      return;
    }

    // 3) 花だん
    const gHits = ray.intersectObject(this.garden.group, true);
    const plotHit = gHits.find((h) => h.object.userData.plotId);
    if (plotHit) {
      const id = plotHit.object.userData.plotId;
      const plot = this.garden.plots.get(id);
      if (plot && plot.group.visible) { this.goInteractPlot(id); return; }
    }

    // 4) 地面 → あるく
    const ground = ray.intersectObject(this.island.terrain, false);
    const bridgeHits = ray.intersectObject(this.island.bridge, true);
    const hit = [...ground, ...bridgeHits].sort((a, b) => a.distance - b.distance)[0];
    if (hit) {
      const { x: tx, z: tz } = hit.point;
      this.audio.tap();
      this.spawnTapMarker(hit.point);
      this.pendingAction = null;
      this.princess.walkTo(tx, tz);
    }
  }

  spawnTapMarker(pos) {
    this.particles.burst(pos.clone().add(new THREE.Vector3(0, 0.25, 0)), 0xffffff, 6, 1.0);
  }

  // ---------------- 花だんインタラクション ----------------
  goInteractPlot(id) {
    const plot = this.garden.plots.get(id);
    if (!plot) return;
    this.audio.tap();
    this.garden.highlight(id, true);
    const dist = this.princess.pos.distanceTo(plot.worldPos);
    const doIt = () => { this.garden.highlight(id, false); this.interactPlot(id); };
    if (dist < 2.6) { doIt(); return; }
    // となりまであるく
    const dir = plot.worldPos.clone().sub(this.princess.pos).normalize();
    const target = plot.worldPos.clone().sub(dir.multiplyScalar(1.6));
    this.pendingAction = id;
    this.princess.walkTo(target.x, target.z, () => {
      if (this.pendingAction === id) { this.pendingAction = null; doIt(); }
      else this.garden.highlight(id, false);
    });
  }

  interactPlot(id) {
    const d = this.garden.plotData(id);
    const plot = this.garden.plots.get(id);
    if (!d) {
      // たねをうえる
      this.hud.openSeedPicker((type) => {
        if (this.garden.plant(id, type)) {
          this.audio.plant();
          this.hud.toast(`${FLOWERS[type].name}のたねを うえたよ 🌱`);
        }
      });
      return;
    }
    if (d.progress >= 1) {
      // しゅうかく
      const reward = this.garden.harvest(id);
      if (reward) {
        this.audio.harvest();
        setTimeout(() => this.audio.coin(), 250);
        this.hud.toast(`✨${reward.sparkle} と 🌸${reward.petal} を ゲット!`);
        if (this.env.isNight) this.quests.notifyNightAction();
      }
      return;
    }
    // みずやり
    if (this.garden.isWatered(id, this.gameTime)) {
      this.hud.toast('おみずは たっぷり! そだつのを まとう 💧');
      return;
    }
    this.garden.water(id, this.gameTime);
    this.audio.water();
    this.princess.waveWand();
    // みずやりエフェクト
    let count = 0;
    const iv = setInterval(() => {
      this.particles.waterDrops(plot.worldPos.clone().add(new THREE.Vector3(0, 0.8, 0)), 5);
      if (++count >= 6) clearInterval(iv);
    }, 120);
    this.hud.toast('まほうのおみずを あげた! ぐんぐんそだつよ 💧');
  }

  tryCatchButterfly(b) {
    const res = this.creatures.catchButterfly(b, this.princess.pos);
    if (res === 'far') {
      // ちかづいてから つかまえる
      const t = b.group.position;
      this.princess.walkTo(t.x, t.z, () => {
        const r2 = this.creatures.catchButterfly(b, this.princess.pos);
        if (r2 && r2 !== 'far') this.onButterflyCaught(r2);
      });
      return;
    }
    if (res) this.onButterflyCaught(res);
  }

  onButterflyCaught(res) {
    this.audio.butterfly();
    this.hud.toast(`${res.def.name}を つかまえた! 🌸+${res.petals}`);
    if (this.env.isNight) this.quests.notifyNightAction();
  }

  // ---------------- クエスト ----------------
  refreshQuestBanner() {
    const q = this.quests.current;
    if (!q) { this.hud.clearQuest(); return; }
    this.hud.setQuest(q.title, this.quests.progressOf(q), this.quests.countOf(q), this.quests.isComplete());
  }

  checkQuest() {
    if (!this.quests.isComplete()) return;
    const done = this.quests.claim();
    if (!done) return;
    this.audio.questDone();
    const rewardTxt = this.quests.rewardText(done);
    const lines = [done.outro + (rewardTxt ? ` ごほうびは ${rewardTxt} だよ!` : '')];
    const next = this.quests.current;
    if (next) lines.push(next.intro);
    this.hud.fairySay(lines);
    this.refreshQuestBanner();
  }

  // ---------------- UI 配線 ----------------
  setupUI() {
    this.hud.onDressChanged = () => {
      this.princess.applyDress();
      this.particles.burst(this.princess.pos.clone().add(new THREE.Vector3(0, 1.4, 0)), 0xffd8f0, 20, 2.2);
    };
    this.hud.onStartDecor = (type, cost) => this.enterDecorMode(type, cost);

    this.state.on('levelup', (lv) => this.onLevelUp(lv));

    // 写真モード
    $('btn-camera').addEventListener('click', () => {
      this.audio.tap();
      this.mode = 'photo';
      $('hud').classList.add('hidden');
      $('photo-mode').classList.remove('hidden');
    });
    $('photo-exit').addEventListener('click', () => {
      this.audio.tap();
      this.mode = 'play';
      $('photo-mode').classList.add('hidden');
      $('hud').classList.remove('hidden');
    });
    $('photo-shutter').addEventListener('click', () => this.takePhoto());

    // デコモードボタン
    $('decor-rotate').addEventListener('click', () => {
      if (this.ghost) { this.ghost.rotation.y += Math.PI / 4; this.audio.tap(); }
    });
    $('decor-ok').addEventListener('click', () => this.confirmDecor());
    $('decor-cancel').addEventListener('click', () => this.exitDecorMode(false));
  }

  onLevelUp(lv) {
    this.audio.fanfare();
    const splash = $('levelup-splash');
    $('levelup-detail').textContent = LEVEL_REWARDS[lv] || 'あたらしい なにかが まってるかも!';
    splash.classList.remove('hidden');
    this.particles.rainbowBurst(this.princess.pos.clone().add(new THREE.Vector3(0, 2, 0)), 60);
    this.particles.rainbowBurst(new THREE.Vector3(0, 4, 0), 50);
    setTimeout(() => splash.classList.add('hidden'), 3600);
    if (lv === 3) {
      setTimeout(() => this.hud.fairySay(['にじのはしのむこう、ひみつのにわが つかえるようになったよ! いってみよう!']), 3700);
    }
    this.hud.refreshStats();
  }

  // ---------------- デコ配置 ----------------
  enterDecorMode(type, cost) {
    this.mode = 'decor';
    this.decorType = type;
    this.decorCost = cost;
    $('decor-mode').classList.remove('hidden');
    $('hud').classList.add('hidden');

    this.ghost = buildDecorMesh(type);
    this.ghost.traverse((o) => {
      if (o.isMesh) {
        o.material = o.material.clone();
        o.material.transparent = true;
        o.material.opacity = 0.65;
      }
    });
    // プリンセスのまえに置く
    const p = this.princess.pos;
    const gx = p.x + Math.sin(this.princess.heading) * 2.5;
    const gz = p.z + Math.cos(this.princess.heading) * 2.5;
    this.ghost.position.set(gx, groundHeight(gx, gz), gz);
    this.renderer.scene.add(this.ghost);

    // ドラッグでゴーストを動かす
    this.input.enabled = false;
    this._decorDrag = (e) => {
      const ray = this.screenRay(e.clientX, e.clientY);
      const hits = ray.intersectObject(this.island.terrain, false);
      if (hits.length) {
        const { x, z } = hits[0].point;
        if (isOnLand(x, z)) this.ghost.position.set(x, groundHeight(x, z), z);
      }
    };
    const canvas = $('game-canvas');
    canvas.addEventListener('pointerdown', this._decorDrag);
    canvas.addEventListener('pointermove', this._decorDrag);
  }

  confirmDecor() {
    if (!this.ghost) return;
    const { x, z } = this.ghost.position;
    if (!isOnLand(x, z)) { this.audio.error(); this.hud.toast('そこには おけないよ'); return; }
    if (this.state.data.sparkles < this.decorCost) { this.audio.error(); this.hud.toast('✨が たりないよ'); this.exitDecorMode(false); return; }
    this.state.addSparkles(-this.decorCost);
    this.decor.place(this.decorType, x, z, this.ghost.rotation.y);
    this.audio.place();
    this.hud.toast(`${DECOR[this.decorType].name}を おいたよ!`);
    this.exitDecorMode(true);
  }

  exitDecorMode(placed) {
    if (!placed && this.ghost) this.audio.tap();
    if (this.ghost) { this.renderer.scene.remove(this.ghost); this.ghost = null; }
    const canvas = $('game-canvas');
    canvas.removeEventListener('pointerdown', this._decorDrag);
    canvas.removeEventListener('pointermove', this._decorDrag);
    this.input.enabled = true;
    this.mode = 'play';
    $('decor-mode').classList.add('hidden');
    $('hud').classList.remove('hidden');
  }

  // ---------------- 写真 ----------------
  takePhoto() {
    this.audio.shutter();
    this.state.stat('photos');
    this.state.save();
    const canvas = $('game-canvas');
    try {
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `magical-garden-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      }, 'image/png');
      this.hud.toast('しゃしんを ほぞんしたよ 📷');
    } catch {
      this.hud.toast('しゃしんの ほぞんに しっぱい…');
    }
    // フラッシュ演出
    const flash = document.createElement('div');
    flash.style.cssText = 'position:absolute;inset:0;background:#fff;z-index:80;pointer-events:none;transition:opacity .45s;';
    document.getElementById('app').appendChild(flash);
    requestAnimationFrame(() => { flash.style.opacity = '0'; });
    setTimeout(() => flash.remove(), 500);
  }

  // ---------------- メインループ ----------------
  loop() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.env.elapsed;

    this.env.update(dt, this.renderer.camera);
    this.island.update(dt, this.env);
    this.particles.update(dt, elapsed);

    if (this.started) {
      this.gameTime += dt;
      this.princess.update(dt, elapsed, this.camYaw);
      this.creatures.update(dt, elapsed, this.env, this.princess.pos);
      this.garden.update(dt, this.gameTime, elapsed, this.env.isNight);
      this.updateCamera(dt);

      // ちょうちょの自然発生
      this.butterflyTimer -= dt;
      if (this.butterflyTimer <= 0) {
        this.butterflyTimer = rand(14, 26);
        const bloomed = this.garden.bloomedPlots();
        if (bloomed.length && this.creatures.butterflies.length < 6) {
          const p = bloomed[Math.floor(rand(bloomed.length))];
          const luck = Math.min(0.35, bloomed.length * 0.05);
          this.creatures.spawnButterfly(p.worldPos.clone().add(new THREE.Vector3(0, 1.2, 0)), luck);
        }
      }

      // ふんすいのしぶき(まほうのクリスタル)
      if (Math.random() < dt * 6) {
        const a = rand(TAU);
        this.particles.sparkleTrail(new THREE.Vector3(Math.cos(a) * 2.2, groundHeight(0, 0) + 1.2, Math.sin(a) * 2.2), 0xaef4ff);
      }

      // HUD更新
      this.hud.setClock(this.env.clockLabel());
      this.refreshQuestBanner();
      this.checkQuestAuto(dt);

      // ブルームは夜つよめ
      this.renderer.bloom.strength = 0.45 + this.env.nightMix * 0.35;

      // ていきセーブ
      this.saveTimer += dt;
      if (this.saveTimer > 10) {
        this.saveTimer = 0;
        this.state.data.dayTime = this.env.time;
        this.state.save();
      }
    } else {
      // タイトル用ゆっくり回転カメラ
      const t = this.env.elapsed * 0.06;
      const cam = this.renderer.camera;
      cam.position.set(Math.sin(t) * 30, 15, Math.cos(t) * 30);
      cam.lookAt(0, 1.5, 0);
    }

    this.renderer.render();
  }

  checkQuestAuto(dt) {
    // メッセージ表示中でなければ自動でクエスト達成処理
    this._questCd = (this._questCd || 0) - dt;
    if (this._questCd > 0) return;
    this._questCd = 0.5;
    if (!this.hud.messageShowing && this.quests.isComplete()) this.checkQuest();
  }
}

// ---------------- ブートストラップ ----------------
const game = new Game();
game.boot();
window.__game = game; // デバッグ用
