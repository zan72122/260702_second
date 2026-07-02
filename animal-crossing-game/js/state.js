// ============================================================
// ゲーム状態 と セーブ / ロード
// ============================================================

const SAVE_KEY = 'doubutsu-no-shima-save-v1';

export const state = {
  player: {
    name: 'たびびと',
    shirt: '#e8554d',
    x: 0,
    z: 26,
    tool: 'hand',
  },
  bells: 500,
  inventory: [], // { kind, id, name, price, icon }
  maxInv: 20,
  tools: { hand: true, rod: true, net: true, shovel: false, can: false },
  museum: { fish: {}, bug: {}, fossil: {} }, // id -> 捕獲数
  friendship: {}, // villagerId -> ポイント
  stats: {
    fishCaught: 0,
    bugsCaught: 0,
    fossilsDug: 0,
    bellsEarned: 0,
    treesShaken: 0,
    balloonsPopped: 0,
    flowersWatered: 0,
    talks: 0,
  },
  quests: { done: {} },
  daily: {
    day: '',            // 'YYYY-MM-DD'
    moneyRockHit: 0,    // 今日たたいた回数
    dugSpots: [],       // 掘り済みインデックス
    talked: {},         // villagerId -> true（今日話した）
    gifted: {},         // villagerId -> true（今日プレゼントした）
    loginBonus: false,
  },
  muted: false,
  started: false,
};

export function hasSave() {
  try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; }
}

export function saveGame() {
  try {
    const data = {
      player: state.player,
      bells: state.bells,
      inventory: state.inventory,
      tools: state.tools,
      museum: state.museum,
      friendship: state.friendship,
      stats: state.stats,
      quests: state.quests,
      daily: state.daily,
      muted: state.muted,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch { /* プライベートブラウズ等では保存不可 */ }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (data.player) Object.assign(state.player, data.player);
    if (typeof data.bells === 'number') state.bells = data.bells;
    if (Array.isArray(data.inventory)) state.inventory = data.inventory;
    if (data.tools) Object.assign(state.tools, data.tools);
    if (data.museum) {
      for (const k of ['fish', 'bug', 'fossil']) {
        if (data.museum[k]) state.museum[k] = data.museum[k];
      }
    }
    if (data.friendship) state.friendship = data.friendship;
    if (data.stats) Object.assign(state.stats, data.stats);
    if (data.quests) state.quests = data.quests;
    if (data.daily) Object.assign(state.daily, data.daily);
    if (typeof data.muted === 'boolean') state.muted = data.muted;
    // 持っていない道具を装備していたら手に戻す
    if (!state.tools[state.player.tool]) state.player.tool = 'hand';
    return true;
  } catch {
    return false;
  }
}

export function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 日付が変わっていたらデイリー情報をリセット。新しい日なら true を返す
export function rollDailyIfNeeded() {
  const key = todayKey();
  if (state.daily.day === key) return false;
  state.daily = {
    day: key,
    moneyRockHit: 0,
    dugSpots: [],
    talked: {},
    gifted: {},
    loginBonus: false,
  };
  return true;
}

// 日付から決まる乱数シード（毎日同じ配置になる）
export function daySeed() {
  const key = todayKey();
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h || 1;
}

// シード付き乱数生成器（mulberry32）
export function seededRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function addBells(n) {
  state.bells = Math.max(0, state.bells + n);
  if (n > 0) state.stats.bellsEarned += n;
}

export function invFull() {
  return state.inventory.length >= state.maxInv;
}

export function addItem(item) {
  if (invFull()) return false;
  state.inventory.push(item);
  return true;
}

export function removeItemAt(index) {
  return state.inventory.splice(index, 1)[0];
}

export function recordMuseum(kind, id) {
  const book = state.museum[kind];
  if (!book) return false;
  const isNew = !book[id];
  book[id] = (book[id] || 0) + 1;
  return isNew;
}
