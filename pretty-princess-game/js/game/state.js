// ゲーム全体の状態と永続化
import { saveGame, loadGame } from '../core/save.js';
import { ROOMS } from './rooms-data.js';

function freshRoomState() {
  return {
    placed: [],            // [{uid, id, x, z, rot, wall, my}]
    wallpaper: 'w:pink:plain',
    floor: 'g:white:carpet',
    restored: false,
    stars: 0,
    bestScore: 0,
  };
}

export function freshState() {
  const rooms = {};
  for (const r of ROOMS) rooms[r.id] = freshRoomState();
  return {
    version: 1,
    coins: 800,
    jewels: 5,
    rooms,
    inventory: {},          // itemId -> 個数(未設置の持ち物)
    stats: {
      placed: 0,            // のべ設置数
      bought: 0,
      gachaCount: 0,
      photos: 0,
      wallpaperChanged: 0,
      coinsEarned: 0,
      visits: 0,
    },
    claimedQuests: [],
    achievements: [],
    dress: { dress: 'ballgown', dressColor: 'sax', hair: 'curls', hairColor: 'choco', acc: 'tiara' },
    settings: { sound: true, night: false },
    flags: { openingDone: false, endingDone: false },
    uidCounter: 1,
  };
}

class GameState {
  constructor() {
    this.data = freshState();
    this.listeners = new Set();
    this._saveTimer = null;
  }

  load() {
    const saved = loadGame();
    if (!saved) return false;
    // 古いセーブにない項目をデフォルトで補完
    const fresh = freshState();
    this.data = { ...fresh, ...saved, stats: { ...fresh.stats, ...saved.stats }, flags: { ...fresh.flags, ...saved.flags }, settings: { ...fresh.settings, ...saved.settings }, dress: { ...fresh.dress, ...saved.dress } };
    for (const r of ROOMS) if (!this.data.rooms[r.id]) this.data.rooms[r.id] = freshRoomState();
    return true;
  }

  reset() {
    this.data = freshState();
    this.save();
  }

  save() {
    // 高頻度の変更をまとめて保存
    if (this._saveTimer) return;
    this._saveTimer = setTimeout(() => {
      this._saveTimer = null;
      saveGame(this.data);
    }, 400);
  }

  onChange(fn) { this.listeners.add(fn); }
  emit() {
    for (const fn of this.listeners) fn(this.data);
    this.save();
  }

  // ---- お金 ----
  get coins() { return this.data.coins; }
  get jewels() { return this.data.jewels; }
  addCoins(n) {
    this.data.coins += n;
    if (n > 0) this.data.stats.coinsEarned += n;
    this.emit();
  }
  addJewels(n) { this.data.jewels += n; this.emit(); }
  canAfford(price) { return this.data.coins >= price; }

  // ---- 持ち物 ----
  ownedCount(itemId) { return this.data.inventory[itemId] ?? 0; }
  addItem(itemId, n = 1) {
    this.data.inventory[itemId] = (this.data.inventory[itemId] ?? 0) + n;
    this.emit();
  }
  takeItem(itemId) {
    const c = this.ownedCount(itemId);
    if (c <= 0) return false;
    if (c === 1) delete this.data.inventory[itemId];
    else this.data.inventory[itemId] = c - 1;
    this.emit();
    return true;
  }
  distinctOwned() {
    const ids = new Set(Object.keys(this.data.inventory));
    for (const r of Object.values(this.data.rooms)) for (const p of r.placed) ids.add(p.id);
    return ids.size;
  }

  // ---- 部屋 ----
  room(roomId) { return this.data.rooms[roomId]; }
  restoredCount() { return Object.values(this.data.rooms).filter((r) => r.restored).length; }
  totalStars() { return Object.values(this.data.rooms).reduce((s, r) => s + r.stars, 0); }
  isUnlocked(roomDef) { return this.restoredCount() >= roomDef.unlockAt; }
  nextUid() { return this.data.uidCounter++; }

  placedCountAll() {
    return Object.values(this.data.rooms).reduce((s, r) => s + r.placed.length, 0);
  }
  placedByTheme(theme, catalogById) {
    let n = 0;
    for (const r of Object.values(this.data.rooms)) {
      for (const p of r.placed) {
        const item = catalogById.get(p.id);
        if (item && item.themes.includes(theme)) n++;
      }
    }
    return n;
  }
}

export const game = new GameState();
