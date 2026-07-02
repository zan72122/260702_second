// ============================================================
// メインループ・ゲーム進行
// ============================================================

import * as THREE from 'three';
import { createWorld } from './world.js';
import { createPlayerController } from './player.js';
import { createVillagers, buildTalk, buildGiftThanks, friendshipLevel } from './villagers.js';
import { createFishing } from './fishing.js';
import { createBugs } from './bugs.js';
import { createUI } from './ui.js';
import { state, saveGame, loadGame, hasSave, rollDailyIfNeeded, addBells, addItem, invFull, recordMuseum } from './state.js';
import { initAudio, sfx, updateBGMByHour, vibrate } from './audio.js';
import { FOSSILS, TREASURES, FRUITS, fruitById, flowerById } from './items.js';
import { CURVE_UNIFORM } from './curve.js';

// ---------------- 基本セットアップ ----------------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.getElementById('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.5, 700);

function onResize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.fov = w < h ? 64 : 52; // 縦画面は広めに
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', () => setTimeout(onResize, 300));
onResize();

// ---------------- セーブ読み込み＆ワールド生成 ----------------
const hadSave = hasSave();
if (hadSave) loadGame();
rollDailyIfNeeded();

const world = createWorld(scene);
const player = createPlayerController(scene, world);
const villagers = createVillagers(scene, world);
const bugs = createBugs(scene, world);

let started = false;
let speedBoostT = 0;

// ---------------- UI ----------------
const ui = createUI({
  world,
  villagers,
  playerPos: () => player.pos,
  onStart(name, shirt) {
    state.player.name = name;
    state.player.shirt = shirt;
    player.rig.setShirt(shirt);
    initAudio();
    sfx.fanfare();
    ui.show();
    started = true;
    ui.updateBells();
    ui.refreshToolWheel();
    ui.refreshQuestChip();
    setTimeout(intro, 900);
    saveGame();
  },
  onAction: doAction,
  onToolChange(tool) {
    player.setTool(tool);
  },
  onShirt(color) {
    player.rig.setShirt(color);
  },
  onEatFruit() {
    speedBoostT = 30;
    world.spawnSparkle(player.pos.x, player.pos.y + 1, player.pos.z, 0xffb8d0, 8);
  },
  onPlantSeed() {
    let planted = 0;
    for (let i = 0; i < 30 && planted < 3; i++) {
      const x = player.pos.x + (Math.random() - 0.5) * 3;
      const z = player.pos.z + (Math.random() - 0.5) * 3;
      if (!world.walkable(x, z)) continue;
      const def = flowerById(['f_red', 'f_yellow', 'f_white', 'f_blue'][Math.floor(Math.random() * 4)]);
      world.flowers.add(x, z, def);
      planted++;
    }
    sfx.water();
    world.spawnSparkle(player.pos.x, player.pos.y + 0.5, player.pos.z, 0xa8e8a0, 10);
    ui.toast('タネを まいた！おはなが さいたよ🌸');
  },
  canAddItem: () => !invFull(),
  addItem: (it) => addItem(it),
});

if (hadSave) ui.markContinue(state.player.name);

// ---------------- はじめてのあいさつ ----------------
function intro() {
  if (state.quests.done.__intro) {
    ui.toast(`おかえりなさい、${state.player.name}！`);
    dailyGreeting();
    return;
  }
  state.quests.done.__intro = true;
  ui.dialog({
    name: 'ミケ', color: '#f5a53c', pitch: 1.35,
    lines: [
      `ようこそ「まったりアイランド」へ だにゃ！\nきみが ${state.player.name} だにゃ？`,
      'この島では つり・むしとり・かせきほり…\nすきなことを すきなだけ たのしめるにゃ！',
      'まずは 左のスティックで あるいてみて。\n気になるものの ちかくで ボタンを おすんだにゃ！',
      'ベルを ためたら おみせで おかいものも できるにゃ。\nそれじゃ、まったり たのしんでね〜！',
    ],
    onDone: dailyGreeting,
  });
}

function dailyGreeting() {
  if (!state.daily.loginBonus) {
    state.daily.loginBonus = true;
    addBells(500);
    ui.updateBells();
    sfx.coin();
    ui.toast('きょうの おこづかい +500ベル！');
    if (world.weather === 'rain') setTimeout(() => ui.toast('きょうは あめ。さかなが つれやすいかも☔'), 2600);
  }
}

// ---------------- つり ----------------
const fishing = createFishing(scene, world, player, {
  onCatch(fish) {
    state.stats.fishCaught++;
    finishCatch('fish', fish, `${fish.name} を つりあげた！`);
  },
  onMiss() {
    ui.toast('にげられた〜！');
  },
  onNothing() {
    ui.toast('なにも かからなかった…');
  },
});

function finishCatch(kind, def, title) {
  const isNew = recordMuseum(kind, def.id);
  sfx.catch();
  vibrate([40, 30, 90]);
  world.spawnSparkle(player.pos.x, player.pos.y + 1.4, player.pos.z, 0xffe9a8, 14, 1.2);
  player.playAction('joy', 0.9);
  const stored = addItem({ kind, id: def.id, name: def.name, price: def.price, icon: def.icon });
  ui.catchCard({
    icon: def.icon,
    title: isNew ? '✨ はじめて つかまえた！ ✨' : title,
    name: def.name,
    flavor: def.flavor + (stored ? '' : '\n（ポケットが いっぱいで もちかえれなかった…）'),
  });
  if (isNew) sfx.newRecord();
  ui.updateBells();
  ui.refreshQuestChip();
  saveGame();
}

// ---------------- アクション判定 ----------------
let currentAction = null; // { label, run }

function scanAction() {
  if (!started) return null;
  if (fishing.active) {
    return { label: fishing.phase === 'bite' ? 'ひけっ！！' : 'ひきあげる', run: () => fishing.tap() };
  }
  if (player.busy || ui.isModalOpen()) return null;

  const p = player.pos;
  const tool = state.player.tool;

  // 1) じゅうみんと はなす
  const v = villagers.nearest(p, 2.4);
  if (v) return { label: 'はなす', run: () => talkTo(v) };

  // 2) おちているものを ひろう
  for (const it of world.groundItems) {
    if (Math.hypot(it.x - p.x, it.z - p.z) < 1.7) {
      return { label: 'ひろう', run: () => pickup(it) };
    }
  }

  // 3) たてものに はいる
  for (const b of world.buildings) {
    if (b.label && Math.hypot(b.x - p.x, b.z - p.z) < 2.1) {
      return { label: b.label, run: () => enterBuilding(b) };
    }
  }

  // 4) ほりあと
  if (tool === 'shovel') {
    for (const s of world.digSpots) {
      if (!s.dug && Math.hypot(s.x - p.x, s.z - p.z) < 1.7) {
        return { label: 'ほる', run: () => dig(s) };
      }
    }
  }

  // 5) いわを たたく
  for (const r of world.rocks) {
    if (Math.hypot(r.x - p.x, r.z - p.z) < 2.1) {
      return { label: 'いわを たたく', run: () => hitRock(r) };
    }
  }

  // 6) はな
  const fl = world.flowers.nearest(p.x, p.z, 1.4);
  if (fl) {
    if (tool === 'can') return { label: 'みずをやる', run: () => waterFlower(fl) };
    return { label: 'はなを つむ', run: () => pickFlower(fl) };
  }

  // 7) 木をゆらす
  for (const t of world.trees) {
    if (Math.hypot(t.x - p.x, t.z - p.z) < 2.2) {
      return { label: '木を ゆらす', run: () => shakeTree(t) };
    }
  }

  // 8) つり
  if (tool === 'rod' && fishing.findSpot()) {
    return { label: 'つりをする', run: () => fishing.start(hourNow()) };
  }

  // 9) むしあみ
  if (tool === 'net') {
    return { label: bugs.anyNear(p, 6) ? 'あみを ふる！' : 'あみを ふる', run: swingNet };
  }

  return null;
}

function doAction() {
  if (currentAction) {
    currentAction.run();
  }
}

// ---------------- 各アクション ----------------
function talkTo(v) {
  v.state = 'talk';
  player.faceToward(v.rig.group.position.x, v.rig.group.position.z);
  const { lines, gift } = buildTalk(v, hourNow(), world.weather);
  const lv = friendshipLevel(state.friendship[v.def.id] || 0);
  const hearts = '❤️'.repeat(lv) + '🤍'.repeat(5 - lv);
  const hasFruit = state.inventory.some((it) => it.kind === 'fruit');
  const choices = [];
  if (hasFruit) {
    choices.push({
      label: '🎁 プレゼントする',
      onPick: () => {
        ui.openPockets('gift', (item) => {
          const thanks = buildGiftThanks(v, item.name);
          world.spawnSparkle(v.rig.group.position.x, v.rig.group.position.y + 1.5, v.rig.group.position.z, 0xffb8d0, 10);
          sfx.fanfare();
          ui.dialog({
            name: v.def.name, color: '#' + v.def.shirt.toString(16).padStart(6, '0'), pitch: v.def.pitch,
            lines: [thanks],
            onDone: () => { v.state = 'idle'; ui.refreshQuestChip(); saveGame(); },
          });
        });
      },
    });
  }
  choices.push({ label: `ばいばい ${hearts}`, onPick: () => { v.state = 'idle'; } });
  ui.dialog({
    name: v.def.name,
    color: '#' + v.def.shirt.toString(16).padStart(6, '0'),
    pitch: v.def.pitch,
    lines,
    choices,
    onDone: () => {
      if (v.state === 'talk') v.state = 'idle';
      if (gift) {
        if (addItem(gift)) {
          sfx.pickup();
          ui.toast(`${v.def.name} から ${gift.name} を もらった！`);
        } else {
          world.spawnGroundItem({ kind: 'fruit', payload: fruitById(gift.id), item: gift }, player.pos.x + 0.8, player.pos.z + 0.8);
          ui.toast('ポケットが いっぱいなので おいてもらった');
        }
      }
      ui.refreshQuestChip();
      saveGame();
    },
  });
}

function pickup(it) {
  player.playAction('pickup', 0.4);
  if (it.kind === 'bells') {
    world.removeGroundItem(it);
    addBells(it.amount || 100);
    sfx.coin();
    ui.updateBells();
    ui.toast(`${it.amount || 100} ベル ひろった！`);
  } else if (it.kind === 'present') {
    world.removeGroundItem(it);
    sfx.pop();
    const roll = Math.random();
    if (roll < 0.45) {
      const amount = 300 + Math.floor(Math.random() * 28) * 100;
      addBells(amount);
      sfx.coin();
      ui.updateBells();
      ui.toast(`プレゼントの なかみは ${amount}ベル だった！`);
    } else if (roll < 0.8) {
      const t = TREASURES[Math.floor(Math.random() * TREASURES.length)];
      const ok = addItem({ kind: 'treasure', id: t.id, name: t.name, price: t.price, icon: t.icon });
      ui.toast(ok ? `プレゼントの なかみは ${t.name}！` : 'ポケットが いっぱいだった…');
    } else {
      const f = FRUITS[Math.floor(Math.random() * FRUITS.length)];
      const ok = addItem({ kind: 'fruit', id: f.id, name: f.name, price: f.price, icon: f.icon });
      ui.toast(ok ? `プレゼントの なかみは ${f.name}！` : 'ポケットが いっぱいだった…');
    }
  } else if (it.kind === 'fossilItem') {
    // かせき（ずかん登録つき）
    if (invFull()) { ui.toast('ポケットが いっぱいだ…'); return; }
    world.removeGroundItem(it);
    state.stats.fossilsDug++;
    finishCatch('fossil', it.payload, `${it.payload.name} を ほりだした！`);
  } else {
    // フルーツなど
    const item = it.item || { kind: it.kind, id: it.payload.id, name: it.payload.name, price: it.payload.price, icon: it.payload.icon };
    if (!addItem(item)) { ui.toast('ポケットが いっぱいだ…'); return; }
    world.removeGroundItem(it);
    sfx.pickup();
  }
  ui.refreshQuestChip();
}

function shakeTree(tree) {
  player.faceToward(tree.x, tree.z);
  state.stats.treesShaken++;
  player.playAction('shake', 0.7, () => {
    tree.shakeT = 0.8;
    sfx.rustle();
    if (tree.fruits.length > 0) {
      // フルーツが落ちる
      for (let i = 0; i < tree.fruits.length; i++) {
        const ang = Math.random() * Math.PI * 2;
        const d = 1 + Math.random() * 0.8;
        const def = fruitById(tree.fruitType === 'coconut' ? 'coconut' : tree.fruitType);
        world.spawnGroundItem({ kind: 'fruit', payload: def }, tree.x + Math.cos(ang) * d, tree.z + Math.sin(ang) * d);
      }
      for (const f of tree.fruits) tree.group.remove(f);
      tree.fruits.length = 0;
      sfx.thud();
    } else {
      const roll = Math.random();
      if (roll < 0.10) {
        // ハチだ！
        sfx.bee();
        ui.flash();
        vibrate([60, 40, 60]);
        ui.toast('うわっ ハチの すが おちてきた！ にげろ〜！！🐝');
        setTimeout(() => ui.toast('…ふう、なんとか にげきった！'), 2200);
      } else if (roll < 0.28) {
        const amount = 100 * (1 + Math.floor(Math.random() * 3));
        world.spawnGroundItem({ kind: 'bells', amount }, tree.x + 1.2, tree.z + 0.6);
        sfx.coin();
      } else if (roll < 0.33) {
        const t = TREASURES[Math.floor(Math.random() * TREASURES.length)];
        world.spawnGroundItem({ kind: 'treasure', payload: t }, tree.x + 1.2, tree.z + 0.6);
        ui.toast('なにか いいものが おちてきた！');
      }
    }
    ui.refreshQuestChip();
  });
}

function hitRock(rock) {
  player.faceToward(rock.x, rock.z);
  player.playAction('hit', 0.4, () => {
    rock.bounceT = 1;
    sfx.hitRock();
    vibrate(25);
    if (rock.isMoney && state.daily.moneyRockHit < 8) {
      state.daily.moneyRockHit++;
      const amounts = [100, 100, 200, 300, 500, 800, 1000, 2000];
      const amount = amounts[state.daily.moneyRockHit - 1];
      const ang = Math.random() * Math.PI * 2;
      world.spawnGroundItem({ kind: 'bells', amount }, rock.x + Math.cos(ang) * 1.8, rock.z + Math.sin(ang) * 1.8);
      world.spawnSparkle(rock.x, rock.mesh.position.y + 0.8, rock.z, 0xffe066, 8);
      sfx.coin();
      if (state.daily.moneyRockHit === 1) ui.toast('✨ ベルが でてくる いわだ！ つづけて たたけ！');
    } else if (!rock.isMoney && Math.random() < 0.1) {
      world.spawnGroundItem({ kind: 'bells', amount: 100 }, rock.x + 1.5, rock.z);
    }
  });
}

function dig(spot) {
  player.faceToward(spot.x, spot.z);
  player.playAction('dig', 0.8, () => {
    sfx.dig();
    spot.dug = true;
    spot.mesh.visible = false;
    state.daily.dugSpots.push(spot.index);
    const roll = Math.random();
    if (roll < 0.62) {
      const f = FOSSILS[Math.floor(Math.random() * FOSSILS.length)];
      world.spawnGroundItem({ kind: 'fossilItem', payload: f }, spot.x + 0.7, spot.z + 0.4);
      ui.toast('なにか ほりだした！');
    } else if (roll < 0.92) {
      const amount = 500 + Math.floor(Math.random() * 11) * 100;
      world.spawnGroundItem({ kind: 'bells', amount }, spot.x + 0.7, spot.z + 0.4);
      ui.toast('つちのなかから ベルぶくろ！');
    } else {
      const t = TREASURES[Math.floor(Math.random() * TREASURES.length)];
      world.spawnGroundItem({ kind: 'treasure', payload: t }, spot.x + 0.7, spot.z + 0.4);
      ui.toast('おたからを ほりあてた！！');
    }
    saveGame();
  });
}

function pickFlower(f) {
  player.playAction('pickup', 0.4, () => {
    world.flowers.pick(f);
    sfx.pickup();
    const item = { kind: 'flower', id: f.def.id, name: f.def.name, price: f.def.price, icon: f.def.icon };
    if (!addItem(item)) { ui.toast('ポケットが いっぱいだ…'); return; }
    world.spawnSparkle(f.x, player.pos.y + 0.5, f.z, f.def.color, 6, 0.4);
  });
}

function waterFlower(f) {
  player.faceToward(f.x, f.z);
  player.playAction('water', 0.8, () => {
    sfx.water();
    state.stats.flowersWatered++;
    world.spawnSparkle(f.x, player.pos.y + 0.5, f.z, 0x9ad8f5, 8, 0.5);
    if (Math.random() < 0.3) {
      for (let i = 0; i < 20; i++) {
        const x = f.x + (Math.random() - 0.5) * 2;
        const z = f.z + (Math.random() - 0.5) * 2;
        if (!world.walkable(x, z)) continue;
        world.flowers.add(x, z, f.def);
        ui.toast('おはなが ふえた！🌸');
        break;
      }
    }
    ui.refreshQuestChip();
  });
}

function swingNet() {
  player.playAction('swing', 0.45, () => {
    const point = player.ahead(1.2);
    const def = bugs.swingCatch(point, 1.5);
    if (def) {
      state.stats.bugsCaught++;
      finishCatch('bug', def, `${def.name} を つかまえた！`);
    } else {
      sfx.miss();
    }
  });
  sfx.swing();
}

function enterBuilding(b) {
  sfx.door();
  if (b.kind === 'shop') {
    ui.openShop();
  } else if (b.kind === 'museum') {
    ui.openZukan();
  } else if (b.kind === 'board') {
    ui.openBoard();
  } else if (b.kind === 'home') {
    saveGame();
    ui.dialog({
      name: 'マイホーム', color: '#6fbf44', pitch: 1,
      lines: ['ふう、ひとやすみ…。\nぼうけんの きろくを セーブしたよ！'],
    });
    world.spawnSparkle(player.pos.x, player.pos.y + 1.2, player.pos.z, 0xa8e8a0, 8);
  }
}

// ---------------- 風船 ----------------
world.onBalloonLand = (x, z) => {
  world.spawnGroundItem({ kind: 'present' }, x, z);
  ui.toast('プレゼントが おちてきた！ひろいにいこう🎁');
};

// 風船タップ判定（ワールドの曲がりを考慮したスクリーン座標で判定）
const tapWork = new THREE.Vector3();
renderer.domElement.addEventListener('pointerdown', (e) => {
  if (!started || ui.isModalOpen()) return;
  camera.updateMatrixWorld();
  for (const b of world.balloons) {
    if (b.popped) continue;
    tapWork.copy(b.group.position);
    tapWork.applyMatrix4(camera.matrixWorldInverse);
    tapWork.y -= CURVE_UNIFORM.value * tapWork.z * tapWork.z; // 曲面シェーダーぶんの補正
    tapWork.applyMatrix4(camera.projectionMatrix);
    if (tapWork.z > 1) continue; // カメラの後ろ
    const sx = (tapWork.x * 0.5 + 0.5) * window.innerWidth;
    const sy = (-tapWork.y * 0.5 + 0.5) * window.innerHeight;
    if (Math.hypot(sx - e.clientX, sy - e.clientY) < 52) {
      b.popped = true;
      b.group.remove(b.ball);
      state.stats.balloonsPopped++;
      sfx.pop();
      vibrate(30);
      world.spawnSparkle(b.group.position.x, b.group.position.y, b.group.position.z, 0xff8fa8, 10, 1);
      ui.refreshQuestChip();
      break;
    }
  }
});

// ---------------- 時計 ----------------
function hourNow() {
  const d = new Date();
  return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
}
let lastClockUpdate = -1;
function updateClock() {
  const d = new Date();
  if (d.getMinutes() === lastClockUpdate) return;
  lastClockUpdate = d.getMinutes();
  const date = `${d.getMonth() + 1}/${d.getDate()}`;
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const h = d.getHours();
  const icon = world.weather === 'rain' ? '🌧' : h >= 19 || h < 5 ? '🌙' : '☀️';
  ui.updateClock(date, time, icon);
}

// ---------------- オートセーブ ----------------
setInterval(() => { if (started) saveGame(); }, 12000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && started) saveGame();
});

// iOS のダブルタップズームなどを抑止
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());

// ---------------- メインループ ----------------
// 動作確認用フック（本編では未使用）
window.__dev = { state, player, world, get fishing() { return fishing; }, villagers };

const clock = new THREE.Clock();
const camTarget = new THREE.Vector3();
const camPos = new THREE.Vector3();
let questTimer = 0;

function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;
  const hour = hourNow();

  if (started) {
    // スピードブースト
    if (speedBoostT > 0) {
      speedBoostT -= dt;
      player.speedScale = 1.35;
      if (Math.random() < dt * 6) {
        world.spawnSparkle(player.pos.x, player.pos.y + 0.3, player.pos.z, 0xffd0e0, 1, 0.4);
      }
    } else {
      player.speedScale = 1;
    }

    const joyActive = ui.isModalOpen() || fishing.active ? { x: 0, y: 0 } : ui.joy;
    player.update(dt, joyActive, time);
    villagers.update(dt, player.pos, time);
    bugs.update(dt, hour, player.pos, time, world.weather);
    fishing.update(dt, time);

    // アクションボタンの表示
    currentAction = scanAction();
    ui.setAction(currentAction ? currentAction.label : null);

    updateClock();
    updateBGMByHour(Math.floor(hour));

    questTimer -= dt;
    if (questTimer <= 0) {
      questTimer = 6;
      ui.refreshQuestChip();
      ui.updateBells();
    }
  }

  world.update(dt, hour, player.pos, started);
  world.updateEnv(hour);

  // カメラ：プレイヤーを後ろ上から（あつ森アングル・北向き固定）
  camTarget.set(player.pos.x, player.pos.y + 1.4, player.pos.z);
  const dist = camera.aspect < 1 ? 17.5 : 15.5;
  const height = camera.aspect < 1 ? 13.5 : 11.5;
  camPos.set(player.pos.x, player.pos.y + height, player.pos.z + dist);
  camera.position.lerp(camPos, Math.min(1, dt * 5));
  camera.lookAt(camTarget);

  renderer.render(scene, camera);
}
loop();
