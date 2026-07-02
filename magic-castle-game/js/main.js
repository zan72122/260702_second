// マジックキャッスル 〜まほうのお城のハッピーライフ〜
// エントリーポイント & ゲームループ
import * as THREE from 'three';
import { initRenderer, FollowCamera } from './core/renderer.js';
import { Input } from './core/input.js';
import { audio } from './core/audio.js';
import { hasSave, saveGame } from './core/save.js';
import { Sky } from './world/sky.js';
import { buildCastle } from './world/castle.js';
import { buildTown } from './world/town.js';
import { buildNature } from './world/nature.js';
import { ParticleSystem } from './world/particles.js';
import { Player } from './chars/player.js';
import { NpcManager } from './chars/npcs.js';
import { Farming } from './game/farming.js';
import { Fishing } from './game/fishing.js';
import { Dance } from './game/dance.js';
import { Spawns } from './game/spawns.js';
import { Wand } from './game/wand.js';
import { talkTo } from './game/quests.js';
import { state, restore, on, addCoins, recordCollection, questProgress, scheduleSave } from './game/state.js';
import { OUTFITS } from './game/data.js';
import { ui } from './ui/ui.js';
import { openShop, openDressup, openBook, openQuestLog, closePanel, isPanelOpen, setOutfitChangeHandler } from './ui/panels.js';

const $ = (id) => document.getElementById(id);

// ---------- 初期化 ----------
const canvas = $('game-canvas');
const { renderer, scene, camera, composer } = initRenderer(canvas);
const input = new Input();
const followCam = new FollowCamera(camera);

const G = {};   // ゲームコンテキスト
window.MC = G;  // デバッグ用フック

async function loadStep(pct, text, fn) {
  $('loading-fill').style.width = pct + '%';
  $('loading-text').textContent = text;
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  if (fn) fn();
}

async function build() {
  await loadStep(10, 'そらを ひろげています…', () => { G.sky = new Sky(scene); });
  await loadStep(25, 'おしろを たてています…', () => { G.castle = buildCastle(scene); });
  await loadStep(45, 'まちを つくっています…', () => { G.town = buildTown(scene); });
  await loadStep(60, 'きらきらを まぶしています…', () => {
    G.particles = new ParticleSystem(scene);
    G.nature = buildNature(scene);
  });
  await loadStep(75, 'なかまを よんでいます…', () => {
    G.player = new Player(scene, G.particles);
    G.npcs = new NpcManager(scene);
  });
  await loadStep(90, 'まほうを かけています…', () => {
    G.farming = new Farming(scene, G.town.gardenPlots, G.particles);
    G.fishing = new Fishing(scene, G.particles, G.town.pondCenter);
    G.dance = new Dance(G.particles);
    G.spawns = new Spawns(scene, G.particles);
    G.wand = new Wand(G);
    G.colliders = [...G.castle.colliders, ...G.town.colliders, ...G.nature.colliders];
  });
  await loadStep(100, 'できあがり!');
  $('loading-screen').classList.add('hidden');
  $('title-screen').classList.remove('hidden');
  if (hasSave()) $('btn-continue').classList.remove('hidden');
}

// ---------- ゲーム開始 ----------
let started = false;
let photoMode = false;
let fireworksT = 0;

function startGame(continued) {
  if (started) return;
  started = true;
  audio.init();
  audio.resume();
  if (continued) {
    restore();
    G.player.rebuild();
    // ガーデン復元
    G.farming.plots.forEach((plot, i) => {
      const s = state.garden[i];
      if (s && !plot.plantGroup) G.farming._buildPlant(plot, s);
    });
  }
  audio.setEnabled(state.sound);
  $('btn-sound').textContent = state.sound ? '🔊' : '🔇';
  $('title-screen').classList.add('hidden');
  $('hud').classList.remove('hidden');
  ui.updateHUD();
  ui.updateQuestTracker();
  G.npcs.refreshBubbles();
  audio.playBGM('day');

  if (!state.tutorialDone) {
    setTimeout(async () => {
      await ui.showDialog('🧚 ステラ・おしろのようせい', [
        'ようこそ、マジックキャッスルへ!✨',
        'ここは まほうと ゆめが あふれる おしろの まち。',
        '左下の ジョイスティックで あるけるよ。',
        '「🪄まほう」ボタンで キラキラの まほうが つかえるの!',
        'まちの みんなに はなしかけて 「おねがい」を かなえてあげてね。',
        'ハッピー💖が たまると レベルアップして いいことが あるよ!',
      ]);
      state.tutorialDone = true;
      scheduleSave();
      ui.toast('❗マークの 住人に はなしかけてみよう!');
    }, 600);
  }
}

$('btn-start').addEventListener('pointerdown', () => { audio.init(); audio.sfx('fanfare'); startGame(false); });
$('btn-continue').addEventListener('pointerdown', () => { audio.init(); audio.sfx('pop'); startGame(true); });

// ---------- ミニゲーム開始ヘルパー ----------
G.startFishing = () => {
  if (G.fishing.active) return;
  G.player.lockMove = true;
  G.player.mode = 'fish';
  // 池のほうを向く
  const p = G.town.pondCenter;
  G.player.yaw = Math.atan2(p.x - G.player.pos.x, p.z - G.player.pos.z);
  G.fishing.start(G.player.pos, G.sky.isNight, () => {
    G.player.lockMove = false;
    G.player.mode = 'idle';
    ui.updateQuestTracker();
    G.npcs.refreshBubbles();
  });
};

G.startDance = () => {
  if (G.dance.active) return;
  G.player.lockMove = true;
  G.player.mode = 'dance';
  // フェリクスもいっしょに踊る
  const felix = G.npcs.npcs.find((n) => n.def.id === 'felix');
  if (felix) felix.mode = 'dance';
  G.dance.start(() => {
    G.player.lockMove = false;
    G.player.mode = 'idle';
    if (felix) felix.mode = 'idle';
    audio.playBGM(G.sky.isNight ? 'night' : 'day');
    ui.updateQuestTracker();
    G.npcs.refreshBubbles();
  });
};

// ---------- インタラクション ----------
let currentInteract = null;

function findInteract() {
  if (G.player.lockMove || G.fishing.active || G.dance.active || photoMode || isPanelOpen()) return null;
  const pp = G.player.pos;

  // NPC
  let best = null, bestD = 2.6;
  for (const n of G.npcs.npcs) {
    const d = n.model.group.position.distanceTo(pp);
    if (d < bestD) { bestD = d; best = { kind: 'npc', npc: n }; }
  }
  if (best) return best;

  // はたけ
  for (const plot of G.farming.plots) {
    const d = Math.hypot(plot.x - pp.x, plot.z - pp.z);
    if (d < 2.0) {
      const lab = G.farming.interactLabel(plot.i);
      if (lab) return { kind: 'plot', plot, lab };
    }
  }

  // むし
  for (const b of G.nature.bugs) {
    const d = b.group.position.distanceTo(pp);
    if (d < 2.6) return { kind: 'bug', bug: b };
  }

  // つり(池のふちで)
  const pc = G.town.pondCenter;
  const pd = Math.hypot(pc.x - pp.x, pc.z - pp.z);
  if (pd > pc.r - 0.5 && pd < pc.r + 2.6) return { kind: 'fish' };

  // ダンスステージ
  const sc = G.town.stageCenter;
  if (Math.hypot(sc.x - pp.x, sc.z - pp.z) < sc.r + 1.5) return { kind: 'dance' };

  return null;
}

function updateInteractUI() {
  const it = findInteract();
  currentInteract = it;
  if (!it) { ui.setInteract(null); return; }
  switch (it.kind) {
    case 'npc': {
      const hasMark = it.npc.bubble.visible || it.npc.bubbleDone.visible;
      ui.setInteract(`${it.npc.def.icon} ${it.npc.def.name}と はなす` + (hasMark ? ' ❗' : ''), '💬', 'はなす');
      break;
    }
    case 'plot':
      ui.setInteract(it.lab.hint, it.lab.icon, it.lab.label);
      break;
    case 'bug':
      ui.setInteract(`${it.bug.def.icon} ${it.bug.def.name}が いる!`, '🫙', 'つかまえる');
      break;
    case 'fish':
      ui.setInteract('🎣 さかなが いそうだ…', '🎣', 'つりをする');
      break;
    case 'dance':
      ui.setInteract('💃 ダンスステージだ!', '💃', 'おどる');
      break;
  }
}

async function doAction() {
  const it = currentInteract;
  if (!it) return;
  audio.resume();
  switch (it.kind) {
    case 'npc':
      await talkTo(it.npc, G);
      break;
    case 'plot': {
      const s = G.farming.plotState(it.plot.i);
      if (!s) await G.farming.plant(it.plot.i, G.player.pos);
      else if (!s.watered) ui.toast('🪄 まほうボタンで おみずを あげよう!');
      else if (G.farming.growth(it.plot.i) >= 1) G.farming.harvest(it.plot.i);
      ui.updateQuestTracker();
      break;
    }
    case 'bug': {
      const b = it.bug;
      // レアほど にげやすい
      const escape = (b.def.rarity - 1) * 0.13;
      if (Math.random() < escape) {
        G.nature.catchBug(b);
        audio.sfx('miss');
        ui.toast(`💨 ${b.def.name}に にげられた…`);
      } else {
        G.nature.catchBug(b);
        const first = recordCollection('bugs', b.def.id);
        state.inventory[b.def.id] = (state.inventory[b.def.id] || 0) + 1;
        questProgress('bug');
        audio.sfx('catch');
        G.particles.sparkle(b.group.position.clone(), 16, 0xb8ffc7);
        ui.toast(`${b.def.icon} ${b.def.name}を つかまえた!` + (first ? ' <small>ずかんに とうろく✨</small>' : ''));
      }
      ui.updateQuestTracker();
      G.npcs.refreshBubbles();
      break;
    }
    case 'fish':
      G.startFishing();
      break;
    case 'dance':
      G.startDance();
      break;
  }
}

$('btn-action').addEventListener('pointerdown', (e) => { e.preventDefault(); doAction(); });
$('btn-magic').addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (G.player.lockMove || G.dance.active || photoMode) return;
  audio.resume();
  G.wand.cast();
});

// ---------- HUD ボタン ----------
$('btn-shop').addEventListener('pointerdown', () => { audio.sfx('pop'); openShop(); });
$('btn-dressup').addEventListener('pointerdown', () => { audio.sfx('pop'); openDressup(); });
$('btn-book').addEventListener('pointerdown', () => { audio.sfx('pop'); openBook(); });
$('btn-quest').addEventListener('pointerdown', () => { audio.sfx('pop'); openQuestLog(); });
$('btn-sound').addEventListener('pointerdown', () => {
  state.sound = !state.sound;
  audio.setEnabled(state.sound);
  $('btn-sound').textContent = state.sound ? '🔊' : '🔇';
  scheduleSave();
});

setOutfitChangeHandler(() => {
  G.player.rebuild();
  G.particles.sparkle(G.player.pos.clone().setY(1.5), 24, 0xffb0ff);
});

// ---------- 写真モード ----------
let wantShot = false;
$('btn-photo').addEventListener('pointerdown', () => {
  photoMode = true;
  audio.sfx('pop');
  $('hud').classList.add('hidden');
  $('photo-ui').classList.remove('hidden');
});
$('photo-exit').addEventListener('pointerdown', () => {
  photoMode = false;
  $('hud').classList.remove('hidden');
  $('photo-ui').classList.add('hidden');
});
$('photo-shoot').addEventListener('pointerdown', () => { wantShot = true; });

function takeShot() {
  audio.sfx('camera');
  try {
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'magic-castle.png';
    a.click();
    ui.toast('📸 しゃしんを ほぞんしたよ!');
  } catch (e) {
    ui.toast('📸 ほぞんできなかった…');
  }
}

// ---------- イベント ----------
on('coins', () => { ui.updateHUD(); ui.bump('stat-coins'); });
on('happiness', () => { ui.updateHUD(); ui.bump('stat-happy'); });
on('inventory', () => { ui.updateQuestTracker(); G.npcs.refreshBubbles(); });
on('quest', () => { ui.updateQuestTracker(); G.npcs.refreshBubbles(); });
on('levelup', async ({ level }) => {
  ui.updateHUD();
  ui.bump('stat-level');
  audio.sfx('fanfare');
  const bonus = level * 50;
  addCoins(bonus);
  // 花火&紙ふぶき
  for (let i = 0; i < 5; i++) {
    setTimeout(() => {
      G.particles.firework(new THREE.Vector3((Math.random() - 0.5) * 30, 18 + Math.random() * 8, -20 - Math.random() * 15));
      audio.sfx('firework');
    }, i * 400);
  }
  G.particles.confetti(G.player.pos.clone(), 50);
  const unlocked = OUTFITS.filter((o) => o.unlockLv === level);
  const unlockText = unlocked.length
    ? '<br>🛍️ ショップに 新商品!<br>' + unlocked.map((o) => `${o.icon} ${o.name}`).join(' / ')
    : '';
  await ui.showResult(`👑 レベル ${level} に アップ!`, `おしろの ハッピーが たかまった!<br>ボーナス 🪙${bonus}${unlockText}`);
});

// ---------- メインループ ----------
const clock = new THREE.Clock();
let clockUIT = 0;

function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  const inp = input.poll();

  if (started) {
    // カメラ操作
    if (!isPanelOpen()) {
      followCam.orbit(inp.camDX, inp.camDY);
      if (inp.zoomF !== 1) followCam.zoom(inp.zoomF);
    }

    // プレイヤー
    const camYaw = followCam.yaw;
    G.player.update(dt, t, inp, camYaw, G.colliders);
    followCam.update(dt, G.player.pos);

    // ワールド
    G.sky.update(dt);
    const nf = G.sky.nightF;
    G.castle.update(dt, t, nf);
    G.town.update(dt, t, nf);
    G.nature.update(dt, t, nf);
    G.farming.update(dt, t);
    G.spawns.update(dt, t, nf, G.player.pos);
    G.npcs.update(dt, t, G.player.pos);
    G.wand.update(dt);
    G.fishing.update(dt, t);
    G.dance.update(dt);
    G.particles.update(dt);

    // BGM 切りかえ
    if (!G.dance.active) {
      audio.playBGM(G.sky.isNight ? 'night' : 'day');
    }

    // 夜の花火ショー(Lv2 以上)
    if (state.level >= 2 && nf > 0.9 && G.sky.t > 0.62 && G.sky.t < 0.7) {
      fireworksT -= dt;
      if (fireworksT <= 0) {
        fireworksT = 1.4;
        G.particles.firework(new THREE.Vector3((Math.random() - 0.5) * 40, 20 + Math.random() * 10, -25 - Math.random() * 15));
        audio.sfx('firework');
      }
    }

    // 時計 & インタラクト表示(0.25秒ごと)
    clockUIT -= dt;
    if (clockUIT <= 0) {
      clockUIT = 0.25;
      const c = G.sky.clockInfo();
      ui.setClock(c.icon, c.label);
      updateInteractUI();
    }
  } else if (G.sky) {
    // タイトル画面でも空だけ動かす
    G.sky.update(dt * 0.5);
    if (G.particles) G.particles.update(dt);
    camera.position.set(Math.sin(t * 0.08) * 26, 8, Math.cos(t * 0.08) * 26);
    camera.lookAt(0, 6, -20);
  }

  composer.render();

  if (wantShot) {
    wantShot = false;
    takeShot();
  }
}

// ---------- セーブまわり ----------
window.addEventListener('visibilitychange', () => {
  if (document.hidden && started) saveGame(state);
});
window.addEventListener('pagehide', () => { if (started) saveGame(state); });

// ESC でパネルを閉じる(PC)
window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape') closePanel();
  if (e.code === 'Space' && started) doAction();
  if (e.code === 'KeyE' && started) G.wand.cast();
});

// ---------- 起動 ----------
build().then(() => loop());
