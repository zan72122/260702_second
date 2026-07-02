// ゲーム状態(シングルトン)+ イベントバス
import { levelForHappiness, questById } from './data.js';
import { saveGame, loadGame } from '../core/save.js';

export const events = new EventTarget();
export function emit(name, detail = {}) {
  events.dispatchEvent(new CustomEvent(name, { detail }));
}
export function on(name, fn) {
  events.addEventListener(name, (e) => fn(e.detail));
}

export const state = {
  coins: 100,
  happiness: 0,
  level: 1,
  hearts: {},            // npcId -> なかよし度
  inventory: {},         // itemId -> 個数
  owned: ['dress_rose', 'hat_none', 'wand_star'],
  equipped: { dress: 'dress_rose', hat: 'hat_none', wand: 'wand_star' },
  collections: { fish: {}, bugs: {}, flowers: {} },  // id -> 捕獲数
  activeQuests: [],      // {id, prog}
  questsDone: [],
  garden: [null, null, null, null, null, null], // {flowerId, plantedAt, watered, grown}
  ghostsZapped: 0,
  playerName: 'あなた',
  tutorialDone: false,
  sound: true,
};

let saveTimer = null;
export function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    saveGame({ ...state, activeQuests: state.activeQuests });
  }, 800);
}

export function restore() {
  const d = loadGame();
  if (!d) return false;
  Object.assign(state, {
    coins: d.coins ?? 100,
    happiness: d.happiness ?? 0,
    hearts: d.hearts ?? {},
    inventory: d.inventory ?? {},
    owned: d.owned ?? state.owned,
    equipped: d.equipped ?? state.equipped,
    collections: d.collections ?? state.collections,
    questsDone: d.questsDone ?? [],
    garden: d.garden ?? state.garden,
    tutorialDone: d.tutorialDone ?? false,
    sound: d.sound ?? true,
  });
  state.activeQuests = (d.activeQuests ?? [])
    .filter((q) => questById(q.id))
    .map((q) => ({ id: q.id, prog: q.prog }));
  state.level = levelForHappiness(state.happiness);
  return true;
}

// ---- 通貨・ハピネス ----
export function addCoins(n) {
  state.coins = Math.max(0, state.coins + n);
  emit('coins', { n });
  scheduleSave();
}

export function addHappiness(n) {
  state.happiness += n;
  const newLv = levelForHappiness(state.happiness);
  emit('happiness', { n });
  if (newLv > state.level) {
    state.level = newLv;
    emit('levelup', { level: newLv });
  }
  scheduleSave();
}

export function addHeart(npcId, n = 1) {
  state.hearts[npcId] = (state.hearts[npcId] || 0) + n;
  emit('heart', { npcId, n });
  scheduleSave();
}

// ---- インベントリ ----
export function addItem(id, n = 1) {
  state.inventory[id] = (state.inventory[id] || 0) + n;
  emit('inventory', { id, n });
  scheduleSave();
}
export function removeItem(id, n = 1) {
  if ((state.inventory[id] || 0) < n) return false;
  state.inventory[id] -= n;
  if (state.inventory[id] <= 0) delete state.inventory[id];
  emit('inventory', { id, n: -n });
  scheduleSave();
  return true;
}
export function itemCount(id) {
  return state.inventory[id] || 0;
}

// ---- ずかん ----
export function recordCollection(kind, id) {
  const col = state.collections[kind];
  const first = !col[id];
  col[id] = (col[id] || 0) + 1;
  emit('collection', { kind, id, first });
  scheduleSave();
  return first;
}

// ---- クエスト ----
export function questState(id) {
  if (state.questsDone.includes(id)) return 'done';
  if (state.activeQuests.some((q) => q.id === id)) return 'active';
  return 'none';
}

export function acceptQuest(id) {
  if (questState(id) !== 'none') return;
  state.activeQuests.push({ id, prog: 0 });
  emit('quest', { id, kind: 'accept' });
  scheduleSave();
}

export function questProgress(type, payload = {}) {
  for (const aq of state.activeQuests) {
    const q = questById(aq.id);
    if (!q || q.type !== type) continue;
    if (type === 'item' || type === 'deliver' || type === 'fishSpecies') {
      if (payload.id !== q.item) continue;
    }
    if (type === 'dance') {
      // スコア到達型:最高値を記録
      aq.prog = Math.max(aq.prog, payload.n || 0);
    } else if (type === 'item') {
      // 所持数連動
      aq.prog = Math.min(q.count, itemCount(q.item));
    } else {
      aq.prog = Math.min(q.count, aq.prog + (payload.n || 1));
    }
    emit('quest', { id: q.id, kind: 'progress' });
  }
  scheduleSave();
}

export function questIsComplete(aq) {
  const q = questById(aq.id);
  if (!q) return false;
  if (q.type === 'item') return itemCount(q.item) >= q.count;
  if (q.type === 'deliver') return itemCount(q.item) >= q.count;
  return aq.prog >= q.count;
}

export function completeQuest(id) {
  const idx = state.activeQuests.findIndex((a) => a.id === id);
  if (idx < 0) return null;
  const q = questById(id);
  state.activeQuests.splice(idx, 1);
  state.questsDone.push(id);
  if (q.type === 'item' || q.type === 'deliver') removeItem(q.item, q.count);
  if (q.reward.coins) addCoins(q.reward.coins);
  if (q.reward.happy) addHappiness(q.reward.happy);
  if (q.reward.item) addItem(q.reward.item.id, q.reward.item.n);
  addHeart(q.npc, 2);
  emit('quest', { id, kind: 'complete' });
  scheduleSave();
  return q;
}

// NPC が次に出せるクエスト
export function nextQuestFor(npcId, allQuests) {
  return allQuests.find((q) => q.npc === npcId && questState(q.id) === 'none');
}
