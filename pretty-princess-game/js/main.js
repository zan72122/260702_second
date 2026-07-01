// ============================================================
// プリンセス マジカルコーディネート 〜きらめきのお城〜
// メインオーケストレーション
// ============================================================
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createRendering } from './core/renderer.js';
import { audio } from './core/audio.js';
import { hasSave, clearSave } from './core/save.js';
import { clamp, lerp, formatNum, easeOutCubic } from './core/utils.js';
import { game } from './game/state.js';
import { ROOMS, ROOM_BY_ID, THEME_NAMES } from './game/rooms-data.js';
import { computeScore, starsFor } from './game/scoring.js';
import { QUESTS, ACHIEVEMENTS, checkAchievements } from './game/quests.js';
import { CATALOG, ITEM_BY_ID, TOTAL_ITEMS, gachaRoll, RARITY_NAMES, RARITY_ICONS } from './items/catalog.js';
import { buildItemMesh } from './furniture/factory.js';
import { thumbnailFor } from './items/thumbnails.js';
import { Room3D, WALL_H } from './world/room.js';
import { AmbientSparkles, ParticleManager } from './world/particles.js';
import { spawnResidents } from './world/residents.js';
import { Princess } from './princess/princess.js';
import { $, $$, show, hide, toast, dialog, closeDialog, updateWallet, setHint, spawnTitleSparkles } from './ui/ui.js';
import { CatalogUI } from './ui/catalog-ui.js';
import { DressUpUI } from './ui/dressup.js';
import { PhotoUI } from './ui/photo.js';

// ------------------------------------------------------------
// 基本セットアップ
// ------------------------------------------------------------
const canvas = $('#game-canvas');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#f8d8ec');
scene.fog = new THREE.Fog('#f8d8ec', 18, 42);

const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 5.2, 9.5);

const { renderer, composer } = createRendering(canvas, scene, camera);

const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 1.3, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 2.5;
controls.maxDistance = 17;
controls.maxPolarAngle = Math.PI / 2 - 0.04;
controls.enablePan = false;

// ライティング
const hemi = new THREE.HemisphereLight('#fff2f8', '#e8c8de', 0.9);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff2dd', 2.2);
sun.position.set(4, 8, 5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -12; sun.shadow.camera.right = 12;
sun.shadow.camera.top = 12; sun.shadow.camera.bottom = -12;
sun.shadow.bias = -0.0004;
scene.add(sun);
const fill = new THREE.PointLight('#ffd8ec', 0.7, 30);
fill.position.set(0, WALL_H - 0.8, 0);
scene.add(fill);

const particles = new ParticleManager(scene);

// ------------------------------------------------------------
// 実行時状態
// ------------------------------------------------------------
let mode = 'loading';           // loading | title | story | map | room | edit | photo | dressup
let currentRoomId = null;
let room3d = null;
let placedGroup = null;         // ゆか・ラグ・てんじょうアイテムの親
let placedMeshes = new Map();   // uid -> mesh
let sparkles = null;
let residents = [];
let princess = null;
let animatedSpinners = [];
let ruinTransition = null;      // {t, dur}
let desiredBgm = null;

// 編集モードの状態
let editState = {
  selectedItem: null,   // カタログで選択中のアイテム(設置モード)
  ghost: null,          // プレビューメッシュ
  ghostIndicator: null,
  ghostValid: false,
  ghostPos: { x: 0, z: 0, wall: -1, lx: 0, my: 0 },
  ghostRot: 0,
  movingUid: null,      // 「うごかす」中の既存アイテムuid
  selectedUid: null,    // 選択中の設置ずみアイテム
};

// ------------------------------------------------------------
// BGMヘルパー(初回操作までは予約だけ)
// ------------------------------------------------------------
function setBgm(name) {
  desiredBgm = name;
  if (game.data.settings.sound) audio.playBgm(name);
}
let audioReady = false;
window.addEventListener('pointerdown', () => {
  if (!audioReady) {
    audio.init();
    audioReady = true;
    audio.setEnabled(game.data.settings.sound);
    if (desiredBgm) audio.playBgm(desiredBgm);
  }
  audio.resume();
}, { capture: true });

// ------------------------------------------------------------
// モード切りかえ
// ------------------------------------------------------------
function setMode(next) {
  mode = next;
  for (const sel of ['#title-screen', '#story-screen', '#map-screen', '#hud', '#edit-ui', '#photo-ui', '#dressup-screen']) hide(sel);
  hide('#frame-overlay');
  $('#hud').classList.toggle('editing', next === 'edit');
  controls.autoRotate = false;
  controls.enablePan = false;

  if (next === 'title') {
    show('#title-screen');
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.6;
    if (room3d) room3d.setRuinFactor(0);   // タイトル背景はきれいな状態で見せる
    setBgm('title');
  } else if (next === 'story') {
    show('#story-screen');
  } else if (next === 'map') {
    show('#map-screen');
    renderMap();
    setBgm('map');
  } else if (next === 'room') {
    show('#hud');
    show('#frame-overlay');
    updateHudRoom();
    setHint('ゆかをクリックするとプリンセスがあるくよ');
  } else if (next === 'edit') {
    show('#hud');
    show('#edit-ui');
    hide('#edit-actions');
    catalogUI.render();
    updateEditScore();
  } else if (next === 'photo') {
    show('#photo-ui');
    controls.enablePan = true;
    photoUI.reset();
  }
}

// ------------------------------------------------------------
// 部屋のロード / アンロード
// ------------------------------------------------------------
function disposeGroup(g) {
  if (!g) return;
  g.traverse((o) => {
    if (o.isMesh) {
      o.geometry.dispose();
    }
  });
  scene.remove(g);
}

function unloadRoom() {
  cancelGhost();
  if (room3d) { disposeGroup(room3d.group); room3d = null; }
  if (placedGroup) { disposeGroup(placedGroup); placedGroup = null; }
  if (sparkles) { sparkles.dispose(scene); sparkles = null; }
  for (const r of residents) disposeGroup(r.group);
  residents = [];
  if (princess) { scene.remove(princess.group); }
  placedMeshes.clear();
  animatedSpinners = [];
}

function loadRoom(roomId) {
  unloadRoom();
  currentRoomId = roomId;
  const def = ROOM_BY_ID.get(roomId);
  const rs = game.room(roomId);

  room3d = new Room3D(def, rs);
  scene.add(room3d.group);
  room3d.setNight(game.data.settings.night);

  placedGroup = new THREE.Group();
  scene.add(placedGroup);
  for (const entry of rs.placed) addPlacedMesh(entry);

  sparkles = new AmbientSparkles(scene, room3d.bounds, rs.restored ? 70 : 20);
  sparkles.setVisible(true);

  if (!princess) princess = new Princess(game.data.dress);
  princess.group.position.set(0, 0, Math.min(2.5, def.size[1] / 4));
  princess.group.rotation.y = 0;   // モデルは+Zむき = カメラのほう
  princess.setAnim('idle');
  scene.add(princess.group);

  if (rs.restored) {
    residents = spawnResidents(scene, room3d.bounds, rs.stars);
  }

  // カメラ初期位置
  const dist = Math.max(def.size[0], def.size[1]) * 0.72 + 3;
  camera.position.set(0, 4.6, dist);
  controls.target.set(0, 1.3, 0);
  controls.maxDistance = dist + 6;

  applyDayNight();
  setBgm(rs.restored ? 'room' : 'ruined');
  game.data.stats.visits++;
}

// 設置エントリー → メッシュ生成・配置
function addPlacedMesh(entry) {
  const item = ITEM_BY_ID.get(entry.id);
  if (!item) return null;
  const mesh = buildItemMesh(item);
  mesh.userData.uid = entry.uid;
  mesh.userData.itemId = entry.id;
  positionMesh(mesh, item, entry);
  if (item.surface === 'wall') {
    room3d.walls[entry.wall].add(mesh);
  } else {
    placedGroup.add(mesh);
  }
  placedMeshes.set(entry.uid, mesh);
  if (item.animated === 'spin') {
    const spinner = mesh.getObjectByName('spin');
    if (spinner) animatedSpinners.push(spinner);
  }
  return mesh;
}

function positionMesh(mesh, item, entry) {
  if (item.surface === 'wall') {
    mesh.position.set(entry.lx, item.mountY, 0.14);
    mesh.rotation.set(0, 0, 0);
  } else if (item.surface === 'ceiling') {
    mesh.position.set(entry.x, WALL_H, entry.z);
    mesh.rotation.y = (entry.rot ?? 0) * Math.PI / 2;
  } else {
    mesh.position.set(entry.x, 0, entry.z);
    mesh.rotation.y = (entry.rot ?? 0) * Math.PI / 2;
  }
}

function removePlacedMesh(uid) {
  const mesh = placedMeshes.get(uid);
  if (!mesh) return;
  mesh.parent?.remove(mesh);
  mesh.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
  placedMeshes.delete(uid);
}

// ------------------------------------------------------------
// HUD
// ------------------------------------------------------------
function updateHudRoom() {
  if (!currentRoomId) return;
  const def = ROOM_BY_ID.get(currentRoomId);
  const rs = game.room(currentRoomId);
  $('#hud-room-name').textContent = `${def.icon} ${def.name}`;
  const sc = computeScore(def, rs);
  const stars = '★'.repeat(rs.stars) + '☆'.repeat(3 - rs.stars);
  $('#hud-score').textContent = `コーデ度 ${formatNum(sc.total)} / ${formatNum(def.target)} ${stars}`;
}

game.onChange(() => updateWallet(game));

// ------------------------------------------------------------
// マップ画面
// ------------------------------------------------------------
function renderMap() {
  const grid = $('#castle-map');
  grid.innerHTML = '';
  const restored = game.restoredCount();
  $('#map-progress-text').textContent = `復興 ${restored} / 20 部屋 ・ ★${game.totalStars()}`;
  $('#map-progress-fill').style.width = (restored / 20) * 100 + '%';

  for (const def of ROOMS) {
    const rs = game.room(def.id);
    const unlocked = game.isUnlocked(def);
    const card = document.createElement('div');
    card.className = 'room-card' + (rs.restored ? ' restored' : '') + (!unlocked ? ' locked' : '');
    const state = rs.restored ? 'ふっこう!' : unlocked ? 'あれはてた…' : '🔒';
    card.innerHTML = `
      <div class="room-icon">${def.icon}</div>
      <div class="room-name">${def.name}</div>
      <div class="room-theme">テーマ: ${def.themes.map((t) => THEME_NAMES[t]).join('・')}</div>
      <div class="room-stars">${rs.stars > 0 ? '⭐'.repeat(rs.stars) : ''}</div>
      ${!unlocked ? `<div class="room-unlock">あと${def.unlockAt - restored}部屋の復興でかいほう</div>` : `<div class="room-theme">${def.desc}</div>`}
      <div class="room-state">${state}</div>
    `;
    if (unlocked) {
      card.addEventListener('click', () => {
        audio.se('click');
        loadRoom(def.id);
        setMode('room');
      });
    } else {
      card.addEventListener('click', () => audio.se('error'));
    }
    grid.appendChild(card);
  }
}

// ------------------------------------------------------------
// カタログ / 設置
// ------------------------------------------------------------
const catalogUI = new CatalogUI({
  onSelect: (item) => selectCatalogItem(item),
  getOwned: (id) => game.ownedCount(id),
});

function selectCatalogItem(item) {
  cancelGhost();
  deselectPlaced();
  if (item.kind === 'wallpaper') {
    applyWallpaper(item);
    return;
  }
  if (item.kind === 'floor') {
    applyFloorItem(item);
    return;
  }
  editState.selectedItem = item;
  editState.ghostRot = 0;
  createGhost(item);
  const owned = game.ownedCount(item.id);
  $('#edit-selected-name').textContent = owned > 0 ? `${item.name}(所持×${owned})` : `${item.name} 🪙${formatNum(item.price)}`;
}

function payForItem(item) {
  // 持っていれば消費、なければ購入
  if (game.ownedCount(item.id) > 0) {
    game.takeItem(item.id);
    return true;
  }
  if (!game.canAfford(item.price)) {
    audio.se('error');
    toast(`コインがたりないよ… 🪙${formatNum(item.price)}ひつよう`);
    return false;
  }
  game.addCoins(-item.price);
  game.data.stats.bought++;
  return true;
}

function applyWallpaper(item) {
  const rs = game.room(currentRoomId);
  if (rs.wallpaper === item.id) return;
  if (!payForItem(item)) return;
  rs.wallpaper = item.id;
  game.data.stats.wallpaperChanged++;
  room3d.setWallpaper(item.id);
  audio.se('place');
  particles.placeEffect(new THREE.Vector3(0, 2.5, 0));
  toast(`かべがみを「${item.name}」にはりかえた!`);
  afterLayoutChange();
}

function applyFloorItem(item) {
  const rs = game.room(currentRoomId);
  if (rs.floor === item.id) return;
  if (!payForItem(item)) return;
  rs.floor = item.id;
  game.data.stats.wallpaperChanged++;
  room3d.setFloor(item.id);
  audio.se('place');
  particles.placeEffect(new THREE.Vector3(0, 0.5, 0));
  toast(`ゆかを「${item.name}」にかえた!`);
  afterLayoutChange();
}

// ---- ゴースト(設置プレビュー) ----
function createGhost(item) {
  const mesh = buildItemMesh(item);
  mesh.traverse((o) => {
    if (o.isMesh) {
      o.material = o.material.clone();
      o.material.transparent = true;
      o.material.opacity = 0.6;
      o.castShadow = false;
    }
  });
  // 有効/無効インジケーター
  const size = Math.max(item.cells[0], item.cells[1]) * 0.5;
  const ind = new THREE.Mesh(
    new THREE.CircleGeometry(size * 0.75 + 0.2, 28),
    new THREE.MeshBasicMaterial({ color: '#7fff9f', transparent: true, opacity: 0.3, depthWrite: false }),
  );
  ind.rotation.x = -Math.PI / 2;
  ind.position.y = 0.03;
  scene.add(mesh);
  scene.add(ind);
  editState.ghost = mesh;
  editState.ghostIndicator = ind;
  editState.ghostValid = false;
  mesh.visible = false;
  ind.visible = false;
}

function cancelGhost() {
  const { ghost, ghostIndicator } = editState;
  if (ghost) {
    ghost.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
    scene.remove(ghost);
  }
  if (ghostIndicator) {
    ghostIndicator.geometry.dispose();
    ghostIndicator.material.dispose();
    scene.remove(ghostIndicator);
  }
  editState.ghost = null;
  editState.ghostIndicator = null;
  editState.selectedItem = null;
  editState.movingUid = null;
  $('#edit-selected-name').textContent = '';
  catalogUI.clearSelection();
}

// アイテムのXZ占有サイズ(回転こみ)
function footprint(item, rot) {
  const w = item.cells[0] * 0.5, d = item.cells[1] * 0.5;
  return rot % 2 === 1 ? [d, w] : [w, d];
}

function floorPlacementValid(item, x, z, rot, ignoreUid = null) {
  const [w, d] = footprint(item, rot);
  const b = room3d.bounds;
  if (x - w / 2 < b.minX - 0.15 || x + w / 2 > b.maxX + 0.15 || z - d / 2 < b.minZ - 0.15 || z + d / 2 > b.maxZ + 0.15) return false;
  if (item.surface === 'rug' || item.surface === 'ceiling') return true;
  const rs = game.room(currentRoomId);
  for (const e of rs.placed) {
    if (e.uid === ignoreUid) continue;
    const other = ITEM_BY_ID.get(e.id);
    if (!other || other.surface !== 'floor') continue;
    const [ow, od] = footprint(other, e.rot ?? 0);
    if (Math.abs(x - e.x) < (w + ow) / 2 - 0.04 && Math.abs(z - e.z) < (d + od) / 2 - 0.04) return false;
  }
  return true;
}

function wallPlacementValid(item, wallIdx, lx, ignoreUid = null) {
  const wall = room3d.walls[wallIdx];
  const len = wallIdx < 2 ? room3d.w : room3d.d;
  const w = item.cells[0] * 0.5;
  if (Math.abs(lx) + w / 2 > len / 2 - 0.2) return false;
  const rs = game.room(currentRoomId);
  for (const e of rs.placed) {
    if (e.uid === ignoreUid) continue;
    if (e.wall !== wallIdx) continue;
    const other = ITEM_BY_ID.get(e.id);
    if (!other || other.surface !== 'wall') continue;
    const ow = other.cells[0] * 0.5;
    if (Math.abs(lx - e.lx) < (w + ow) / 2 - 0.04) return false;
  }
  return true;
}

// ポインター位置からゴーストを更新
function updateGhost(ev) {
  const { ghost, ghostIndicator, selectedItem: item } = editState;
  if (!ghost || !item) return;
  const hit = raycastAt(ev, item.surface === 'wall' ? 'wall' : 'floor');
  if (!hit) {
    ghost.visible = false;
    ghostIndicator.visible = false;
    editState.ghostValid = false;
    return;
  }
  ghost.visible = true;
  ghostIndicator.visible = true;

  if (item.surface === 'wall') {
    const wall = hit.wallGroup;
    const wallIdx = wall.userData.wallIndex;
    const local = wall.worldToLocal(hit.point.clone());
    const lx = Math.round(local.x / 0.25) * 0.25;
    editState.ghostPos = { wall: wallIdx, lx, my: item.mountY };
    // ワールドに変換して配置
    const wp = wall.localToWorld(new THREE.Vector3(lx, item.mountY, 0.14));
    ghost.position.copy(wp);
    ghost.rotation.copy(wall.rotation);
    ghostIndicator.position.set(wp.x, 0.03, wp.z);
    editState.ghostValid = wallPlacementValid(item, wallIdx, lx, editState.movingUid);
  } else {
    const x = Math.round(hit.point.x / 0.25) * 0.25;
    const z = Math.round(hit.point.z / 0.25) * 0.25;
    editState.ghostPos = { x, z, wall: -1 };
    const y = item.surface === 'ceiling' ? WALL_H : 0;
    ghost.position.set(x, y, z);
    ghost.rotation.y = editState.ghostRot * Math.PI / 2;
    ghostIndicator.position.set(x, 0.03, z);
    editState.ghostValid = floorPlacementValid(item, x, z, editState.ghostRot, editState.movingUid);
  }
  ghostIndicator.material.color.set(editState.ghostValid ? '#7fff9f' : '#ff7f8f');
  ghost.traverse((o) => {
    if (o.isMesh && o.material.emissive) {
      o.material.emissive.set(editState.ghostValid ? '#000000' : '#661122');
    }
  });
}

function placeGhost() {
  const { selectedItem: item, ghostValid, ghostPos, ghostRot } = editState;
  if (!item || !ghostValid) { if (item) audio.se('error'); return; }
  if (!payForItem(item)) return;
  const rs = game.room(currentRoomId);
  const entry = {
    uid: game.nextUid(),
    id: item.id,
    rot: ghostRot,
    ...(item.surface === 'wall'
      ? { wall: ghostPos.wall, lx: ghostPos.lx, my: ghostPos.my }
      : { x: ghostPos.x, z: ghostPos.z, wall: -1 }),
  };
  rs.placed.push(entry);
  game.data.stats.placed++;
  const mesh = addPlacedMesh(entry);
  audio.se('place');
  if (mesh) {
    const wp = new THREE.Vector3();
    mesh.getWorldPosition(wp);
    wp.y += 0.6;
    particles.placeEffect(wp);
  }
  editState.movingUid = null;
  afterLayoutChange();
  // れんぞく設置できるようゴーストは維持
}

// ---- 設置ずみアイテムの選択と操作 ----
function selectPlaced(uid) {
  editState.selectedUid = uid;
  show('#edit-actions');
  const entry = game.room(currentRoomId).placed.find((e) => e.uid === uid);
  const item = entry && ITEM_BY_ID.get(entry.id);
  $('#edit-selected-name').textContent = item ? `せんたく中: ${item.name}` : '';
}

function deselectPlaced() {
  editState.selectedUid = null;
  hide('#edit-actions');
}

function removePlaced(uid, refund = true) {
  const rs = game.room(currentRoomId);
  const idx = rs.placed.findIndex((e) => e.uid === uid);
  if (idx === -1) return null;
  const [entry] = rs.placed.splice(idx, 1);
  removePlacedMesh(uid);
  if (refund) game.addItem(entry.id);
  afterLayoutChange();
  return entry;
}

$('#btn-act-store').addEventListener('click', () => {
  if (editState.selectedUid == null) return;
  audio.se('remove');
  removePlaced(editState.selectedUid);
  toast('アイテムをしまったよ(もちものに もどったよ)');
  deselectPlaced();
});

$('#btn-act-rotate').addEventListener('click', () => {
  const uid = editState.selectedUid;
  if (uid == null) return;
  const rs = game.room(currentRoomId);
  const entry = rs.placed.find((e) => e.uid === uid);
  if (!entry) return;
  const item = ITEM_BY_ID.get(entry.id);
  if (item.surface === 'wall') { audio.se('error'); return; }
  const newRot = ((entry.rot ?? 0) + 1) % 4;
  if (item.surface === 'floor' && !floorPlacementValid(item, entry.x, entry.z, newRot, uid)) {
    audio.se('error');
    toast('ここではまわせないよ…');
    return;
  }
  entry.rot = newRot;
  const mesh = placedMeshes.get(uid);
  if (mesh) mesh.rotation.y = newRot * Math.PI / 2;
  audio.se('rotate');
  game.emit();
});

$('#btn-act-move').addEventListener('click', () => {
  const uid = editState.selectedUid;
  if (uid == null) return;
  const entry = removePlaced(uid, true);
  deselectPlaced();
  if (!entry) return;
  const item = ITEM_BY_ID.get(entry.id);
  audio.se('click');
  editState.selectedItem = item;
  editState.ghostRot = entry.rot ?? 0;
  createGhost(item);
  editState.movingUid = null;
  $('#edit-selected-name').textContent = `${item.name} をうごかしています`;
});

$('#btn-act-cancel').addEventListener('click', () => { audio.se('click'); deselectPlaced(); });

// ------------------------------------------------------------
// レイキャスト
// ------------------------------------------------------------
const raycaster = new THREE.Raycaster();
const pointerV = new THREE.Vector2();

function raycastAt(ev, kind) {
  pointerV.x = (ev.clientX / window.innerWidth) * 2 - 1;
  pointerV.y = -(ev.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointerV, camera);
  if (kind === 'floor') {
    const hits = raycaster.intersectObject(room3d.floorMesh, false);
    return hits[0] ?? null;
  }
  if (kind === 'wall') {
    for (const wall of room3d.walls) {
      if (!wall.visible) continue;
      const hits = raycaster.intersectObjects(wall.children.filter((c) => c.name === 'wall'), false);
      if (hits[0]) return { ...hits[0], wallGroup: wall };
    }
    return null;
  }
  if (kind === 'placed') {
    const targets = [...placedMeshes.values()];
    const hits = raycaster.intersectObjects(targets, true);
    if (!hits[0]) return null;
    let o = hits[0].object;
    while (o && o.userData.uid === undefined) o = o.parent;
    return o ? { uid: o.userData.uid, mesh: o, point: hits[0].point } : null;
  }
  return null;
}

// ------------------------------------------------------------
// ポインター操作(クリック判定 / ドラッグはカメラ)
// ------------------------------------------------------------
let pointerDown = null;
canvas.addEventListener('pointerdown', (ev) => {
  pointerDown = { x: ev.clientX, y: ev.clientY, t: performance.now(), button: ev.button };
});
canvas.addEventListener('pointermove', (ev) => {
  if (mode === 'edit' && editState.ghost) updateGhost(ev);
});
canvas.addEventListener('pointerup', (ev) => {
  if (!pointerDown) return;
  const dx = ev.clientX - pointerDown.x, dy = ev.clientY - pointerDown.y;
  const isClick = Math.hypot(dx, dy) < 7 && performance.now() - pointerDown.t < 500;
  const button = pointerDown.button;
  pointerDown = null;
  if (!isClick) return;

  if (mode === 'room') {
    // プリンセスのおさんぽ
    const hit = raycastAt(ev, 'floor');
    if (hit && princess) {
      const b = room3d.bounds;
      const target = new THREE.Vector3(clamp(hit.point.x, b.minX, b.maxX), 0, clamp(hit.point.z, b.minZ, b.maxZ));
      princess.walkTo(target);
      particles.heartEffect(target.clone().setY(0.3));
    }
  } else if (mode === 'edit') {
    if (button === 2) { cancelGhost(); return; }
    if (editState.ghost && editState.selectedItem) {
      updateGhost(ev);
      placeGhost();
      return;
    }
    // 設置ずみアイテムの選択
    const hit = raycastAt(ev, 'placed');
    if (hit && hit.uid !== undefined) {
      audio.se('click');
      selectPlaced(hit.uid);
    } else {
      deselectPlaced();
    }
  }
});
canvas.addEventListener('contextmenu', (ev) => ev.preventDefault());

window.addEventListener('keydown', (ev) => {
  if (ev.key === 'r' || ev.key === 'R') {
    if (mode === 'edit' && editState.ghost) {
      editState.ghostRot = (editState.ghostRot + 1) % 4;
      audio.se('rotate');
    }
  } else if (ev.key === 'Escape') {
    if (mode === 'edit') {
      if (editState.ghost) cancelGhost();
      else if (editState.selectedUid != null) deselectPlaced();
      else exitEdit();
    } else if (mode === 'photo') {
      exitPhoto();
    }
  }
});

// ------------------------------------------------------------
// スコア・復興
// ------------------------------------------------------------
function updateEditScore() {
  const def = ROOM_BY_ID.get(currentRoomId);
  const rs = game.room(currentRoomId);
  const sc = computeScore(def, rs);
  const stars = starsFor(sc.total, def.target);
  const pct = Math.min(100, (sc.total / def.target) * 100);
  $('#edit-score-panel').innerHTML =
    `コーデ度 <b>${formatNum(sc.total)}</b> / ${formatNum(def.target)} ` +
    `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)} ` +
    `<span style="font-size:11px">(いろ:${sc.domPaletteName ?? '-'} かず:${sc.count})</span>`;
}

function afterLayoutChange() {
  const def = ROOM_BY_ID.get(currentRoomId);
  const rs = game.room(currentRoomId);
  const sc = computeScore(def, rs);
  rs.bestScore = Math.max(rs.bestScore, sc.total);
  const stars = starsFor(sc.total, def.target);
  if (stars > rs.stars) {
    rs.stars = stars;
    if (rs.restored) toast(`⭐ ほしが ${stars}こ になった!`);
  }
  updateEditScore();
  updateHudRoom();
  game.emit();

  if (!rs.restored && sc.total >= def.target) {
    rs.restored = true;
    game.emit();
    startCeremony(def, rs);
  }
  announceAchievements();
}

function startCeremony(def, rs) {
  // 復興セレモニー!
  audio.se('fanfare');
  setBgm('room');
  ruinTransition = { t: 0, dur: 2.8 };
  particles.ceremonyEffect(new THREE.Vector3(0, 0, 0), room3d.w, room3d.d);
  if (princess) princess.setAnim('happy');
  const [coins, jewels] = def.reward;
  show('#ceremony-overlay');
  $('#ceremony-text').innerHTML = `✨ ${def.name} が<br>よみがえった! ✨`;
  setTimeout(() => {
    hide('#ceremony-overlay');
    game.addCoins(coins);
    game.addJewels(jewels);
    audio.se('coin');
    toast(`ごほうび 🪙${formatNum(coins)} と 💎${jewels} をもらった!`);
    residents = spawnResidents(scene, room3d.bounds, rs.stars);
    if (sparkles) { sparkles.dispose(scene); }
    sparkles = new AmbientSparkles(scene, room3d.bounds, 70);
    // エンディング判定
    if (game.restoredCount() >= 20 && !game.data.flags.endingDone) {
      setTimeout(showEnding, 1500);
    }
  }, 3000);
}

function announceAchievements() {
  const news = checkAchievements(game);
  for (const a of news) {
    audio.se('quest');
    game.addJewels(1);
    toast(`🏆 じっせき「${a.name}」たっせい! 💎+1`);
  }
}

// ------------------------------------------------------------
// 編集モードの出入り
// ------------------------------------------------------------
function enterEdit() {
  if (mode !== 'room') return;
  audio.se('click');
  setMode('edit');
  setHint('');
}
function exitEdit() {
  cancelGhost();
  deselectPlaced();
  audio.se('click');
  setMode('room');
  afterLayoutChange();
}
$('#btn-mode-edit').addEventListener('click', enterEdit);
$('#btn-edit-exit').addEventListener('click', exitEdit);

// ------------------------------------------------------------
// フォトモード
// ------------------------------------------------------------
const photoUI = new PhotoUI({
  canvas,
  onPose: (pose) => {
    if (!princess) return;
    if (pose === 'hide') { princess.group.visible = false; return; }
    princess.group.visible = true;
    princess.setAnim({ stand: 'idle', wave: 'wave', bow: 'bow', twirl: 'twirl' }[pose] ?? 'idle');
  },
  onShoot: () => {
    game.data.stats.photos++;
    game.emit();
    toast('📷 しゃしんをほぞんしたよ!');
    announceAchievements();
  },
});

function enterPhoto() {
  if (mode !== 'room') return;
  audio.se('camera');
  setMode('photo');
}
function exitPhoto() {
  canvas.style.filter = '';
  if (princess) { princess.group.visible = true; princess.setAnim('idle'); }
  setMode('room');
}
$('#btn-mode-photo').addEventListener('click', enterPhoto);
$('#btn-photo-exit').addEventListener('click', exitPhoto);

// ------------------------------------------------------------
// ひる / よる
// ------------------------------------------------------------
function applyDayNight() {
  const night = game.data.settings.night;
  $('#btn-daynight').textContent = night ? '🌙' : '🌸';
  if (room3d) room3d.setNight(night);
  if (night) {
    scene.background.set('#3a2a52');
    scene.fog.color.set('#3a2a52');
    hemi.color.set('#c8b8e8'); hemi.groundColor.set('#584878');
    hemi.intensity = 0.55;
    sun.color.set('#b8c8f8'); sun.intensity = 0.9;
    fill.color.set('#ffb8d8'); fill.intensity = 1.1;
  } else {
    scene.background.set('#f8d8ec');
    scene.fog.color.set('#f8d8ec');
    hemi.color.set('#fff2f8'); hemi.groundColor.set('#e8c8de');
    hemi.intensity = 0.9;
    sun.color.set('#fff2dd'); sun.intensity = 2.2;
    fill.color.set('#ffd8ec'); fill.intensity = 0.7;
  }
}
$('#btn-daynight').addEventListener('click', () => {
  audio.se('click');
  game.data.settings.night = !game.data.settings.night;
  if (game.data.settings.night) game.data.flags.sawNight = true;
  game.emit();
  applyDayNight();
  announceAchievements();
});

$('#btn-sound').addEventListener('click', () => {
  game.data.settings.sound = !game.data.settings.sound;
  $('#btn-sound').textContent = game.data.settings.sound ? '🔔' : '🔕';
  audio.setEnabled(game.data.settings.sound);
  if (game.data.settings.sound && desiredBgm) audio.playBgm(desiredBgm);
  else audio.stopBgm();
  game.emit();
});

// ------------------------------------------------------------
// クエスト / じっせき / ガチャ
// ------------------------------------------------------------
function openQuests() {
  audio.se('click');
  let html = '';
  for (const q of QUESTS) {
    const [cur, goal] = q.progress(game);
    const done = cur >= goal;
    const claimed = game.data.claimedQuests.includes(q.id);
    html += `
      <div class="quest-row ${done ? 'done' : ''}">
        <div class="quest-icon">${q.icon}</div>
        <div class="quest-body">
          <div class="quest-name">${q.name}</div>
          <div class="quest-desc">${q.desc}</div>
          <div class="quest-progress"><div style="width:${Math.min(100, (cur / goal) * 100)}%"></div></div>
        </div>
        <div class="quest-reward">${claimed ? '✅' : done ? `<button class="royal-btn small" data-claim="${q.id}">うけとる</button>` : `🪙${q.reward[0]}${q.reward[1] ? ' 💎' + q.reward[1] : ''}<br><span style="color:#b08898">${formatNum(Math.min(cur, goal))}/${formatNum(goal)}</span>`}</div>
      </div>`;
  }
  const content = dialog({ title: '📜 クエスト', html });
  content.querySelectorAll('[data-claim]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const q = QUESTS.find((x) => x.id === btn.dataset.claim);
      if (!q || game.data.claimedQuests.includes(q.id)) return;
      game.data.claimedQuests.push(q.id);
      game.addCoins(q.reward[0]);
      if (q.reward[1]) game.addJewels(q.reward[1]);
      audio.se('quest');
      toast(`クエストたっせい! 🪙${q.reward[0]}${q.reward[1] ? ' 💎' + q.reward[1] : ''}`);
      closeDialog();
      openQuests();
    });
  });
}
$('#btn-map-quests').addEventListener('click', openQuests);
$('#btn-hud-quests').addEventListener('click', openQuests);

function openAchievements() {
  audio.se('click');
  let html = '';
  for (const a of ACHIEVEMENTS) {
    const got = game.data.achievements.includes(a.id);
    html += `
      <div class="quest-row ${got ? 'done' : ''}" style="${got ? '' : 'filter:grayscale(1);opacity:.6'}">
        <div class="quest-icon">${a.icon}</div>
        <div class="quest-body">
          <div class="quest-name">${a.name}</div>
          <div class="quest-desc">${a.desc}</div>
        </div>
        <div class="quest-reward">${got ? '🏆' : '?'}</div>
      </div>`;
  }
  dialog({ title: `🏆 じっせき(${game.data.achievements.length}/${ACHIEVEMENTS.length})`, html });
}
$('#btn-map-achievements').addEventListener('click', openAchievements);

function openGacha() {
  audio.se('click');
  dialog({
    title: '🎀 まほうのガチャ',
    html: `
      <div style="text-align:center">
        <div style="font-size:72px">🔮</div>
        <p>ジュエルをつかって すてきな家具をゲット!<br>
        いまもっているジュエル: 💎<b>${game.jewels}</b></p>
        <p style="font-size:12px;color:#b08898">N 60% ・ R 30% ・ SR 10%</p>
      </div>`,
    buttons: [
      { label: '1回まわす 💎2', keep: true, cb: () => doGacha(1, 2) },
      { label: '5回まわす 💎9', keep: true, cb: () => doGacha(5, 9) },
      { label: 'やめる' },
    ],
  });
}

function doGacha(times, cost) {
  if (game.jewels < cost) {
    audio.se('error');
    toast('ジュエルがたりないよ…(お部屋を復興すると もらえるよ)');
    return;
  }
  game.addJewels(-cost);
  audio.se('gacha');
  const results = [];
  for (let i = 0; i < times; i++) {
    const item = gachaRoll();
    game.addItem(item.id);
    game.data.stats.gachaCount++;
    if (item.rarity === 2) game.data.flags.gotSR = true;
    results.push(item);
  }
  game.emit();
  // 演出: すこし待ってから結果
  dialog({ title: '🎀 まほうのガチャ', html: '<div class="gacha-machine">🔮</div><p style="text-align:center">コロコロ…</p>', buttons: [] });
  setTimeout(() => {
    let html = '<div style="display:flex;flex-wrap:wrap;justify-content:center">';
    for (const item of results) {
      let thumb = '';
      try { thumb = `<img src="${thumbnailFor(item)}">`; } catch { thumb = `<div style="font-size:60px">${item.icon}</div>`; }
      html += `
        <div class="gacha-result-item">
          ${thumb}
          <div class="gacha-rarity-${['n', 'r', 'sr'][item.rarity]}">${RARITY_ICONS[item.rarity]} ${RARITY_NAMES[item.rarity]}</div>
          <div style="font-size:12px;font-weight:bold;max-width:140px;text-align:center">${item.name}</div>
        </div>`;
    }
    html += '</div><p style="text-align:center;font-size:13px">もちものに はいったよ! もようがえで つかってね</p>';
    audio.se(results.some((r) => r.rarity === 2) ? 'fanfare' : 'quest');
    dialog({
      title: '✨ でてきたよ! ✨', html,
      buttons: [
        { label: 'もういちど!', cb: () => openGacha() },
        { label: 'とじる' },
      ],
    });
    announceAchievements();
  }, 1100);
}
$('#btn-map-gacha').addEventListener('click', openGacha);

// ------------------------------------------------------------
// ドレスアップ
// ------------------------------------------------------------
const dressUpUI = new DressUpUI(game, () => {
  // 着せかえをメインのプリンセスに反映
  if (princess) princess.build(game.data.dress);
  announceAchievements();
  setMode('map');
});
$('#btn-map-dressup').addEventListener('click', () => {
  audio.se('click');
  mode = 'dressup';
  hide('#map-screen');
  dressUpUI.open();
});

// ------------------------------------------------------------
// タイトル / ストーリー / エンディング
// ------------------------------------------------------------
const OPENING = [
  'あるひ、ふしぎなひかりに つつまれて…\nあなたは しらないお城に まよいこんでしまいました。',
  'そこは むかし、プリンセスがくらしていた おとぎのお城。\nでも いまは だれもいなくて、どのお部屋も あれはてています…。',
  '「お城のお部屋を ぜんぶ すてきにコーディネートすれば、\nもとのせかいへ かえるとびらが ひらくでしょう」',
  'そんなこえが きこえてきました。\nさあ、20のお部屋を せかいいち かわいいお城に もどしましょう!',
];
const ENDING = [
  'さいごのお部屋が ひかりにつつまれて…\nお城ぜんたいが きらきらと かがやきはじめました!',
  'あれはてていたお城は、せかいいち かわいいお城に なりました。\nどこからか はくしゅが きこえてきます。',
  'まほうのとびらが ゆっくりと ひらきます。\nでも… もうすこしだけ、このお城にいても いいかもしれませんね。',
  '🎉 グランドフィナーレ! 🎉\nあなたは でんせつのマジカルコーディネーターに なりました!\n(このあとも じゆうに もようがえを たのしめます)',
];

let storyPages = [];
let storyIdx = 0;
let storyDone = null;
function showStory(pages, done) {
  storyPages = pages;
  storyIdx = 0;
  storyDone = done;
  setMode('story');
  $('#story-text').textContent = pages[0];
}
$('#btn-story-next').addEventListener('click', () => {
  audio.se('click');
  storyIdx++;
  if (storyIdx < storyPages.length) {
    $('#story-text').textContent = storyPages[storyIdx];
  } else {
    const done = storyDone;
    storyDone = null;
    if (done) done();
  }
});

function showEnding() {
  game.data.flags.endingDone = true;
  game.emit();
  audio.se('fanfare');
  showStory(ENDING, () => {
    toast('🎉 クリアおめでとう! これからも コーデをたのしんでね');
    setMode('map');
  });
}

function startNewGame() {
  clearSave();
  game.reset();
  updateWallet(game);
  showStory(OPENING, () => {
    game.data.flags.openingDone = true;
    game.emit();
    setMode('map');
  });
}

$('#btn-newgame').addEventListener('click', () => {
  audio.se('click');
  if (hasSave()) {
    dialog({
      title: 'かくにん',
      html: 'セーブデータが きえちゃうけど いい?',
      buttons: [
        { label: 'はじめから あそぶ', cb: startNewGame },
        { label: 'やめておく', ghost: true },
      ],
    });
  } else {
    startNewGame();
  }
});
$('#btn-continue').addEventListener('click', () => {
  audio.se('click');
  setMode('map');
});
$('#btn-map-title').addEventListener('click', () => {
  audio.se('click');
  loadRoom('entrance');
  setMode('title');
});
$('#btn-back-map').addEventListener('click', () => {
  audio.se('click');
  setMode('map');
});

// ------------------------------------------------------------
// ゲームループ
// ------------------------------------------------------------
const clock = new THREE.Clock();
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);

  controls.update();
  if (room3d) {
    room3d.updateWallVisibility(camera);
    // 復興トランジション
    if (ruinTransition) {
      ruinTransition.t += dt;
      const k = Math.min(1, ruinTransition.t / ruinTransition.dur);
      room3d.setRuinFactor(1 - easeOutCubic(k));
      if (k >= 1) ruinTransition = null;
    }
  }
  if (princess && mode !== 'dressup') princess.update(dt);
  for (const r of residents) r.update(dt);
  if (sparkles) sparkles.update(dt);
  particles.update(dt);
  for (const s of animatedSpinners) s.rotation.y += dt * 0.7;

  if (mode !== 'dressup') composer.render();
}

// ------------------------------------------------------------
// 起動
// ------------------------------------------------------------
function boot() {
  const fill = $('#loading-fill');
  fill.style.width = '30%';
  const loaded = game.load();
  updateWallet(game);
  $('#btn-sound').textContent = game.data.settings.sound ? '🔔' : '🔕';
  spawnTitleSparkles();
  fill.style.width = '65%';

  // タイトル背景用にエントランスをロード
  loadRoom('entrance');
  fill.style.width = '100%';

  if (loaded && game.data.flags.openingDone) show('#btn-continue');

  setTimeout(() => {
    hide('#loading-screen');
    setMode('title');
  }, 350);

  console.log(`👑 アイテムそうすう: ${TOTAL_ITEMS}`);
  loop();
}

boot();
