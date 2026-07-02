// ゲームデータ定義とセーブ管理
import { Emitter } from '../core/utils.js';

export const SAVE_KEY = 'magical-garden-island-save-v1';

// ---------------- 花の定義 ----------------
// growTime: 満開までの秒数 / night: 夜だけ咲く
export const FLOWERS = {
  tulip: {
    name: 'チューリップ', icon: '🌷', seedCost: 10, growTime: 25,
    sparkle: 14, petal: 1, unlockLevel: 1,
    colors: [0xff5f9e, 0xffd166, 0xff8a5c, 0xffffff],
    desc: 'そだてやすい にんきの花',
  },
  daisy: {
    name: 'デイジー', icon: '🌼', seedCost: 15, growTime: 35,
    sparkle: 22, petal: 1, unlockLevel: 1,
    colors: [0xffffff, 0xffe08a, 0xffb3d9],
    desc: 'たいようが だいすき',
  },
  rose: {
    name: 'バラ', icon: '🌹', seedCost: 30, growTime: 55,
    sparkle: 45, petal: 2, unlockLevel: 2,
    colors: [0xe8305a, 0xff9ecb, 0xffffff, 0xffd166],
    desc: 'プリンセスの しょうちょう',
  },
  bellflower: {
    name: 'ベルフラワー', icon: '🔔', seedCost: 45, growTime: 70,
    sparkle: 68, petal: 2, unlockLevel: 3,
    colors: [0x7fa7ff, 0xb388ff, 0x9be8ff],
    desc: 'かぜに ゆれて うたうよ',
  },
  sunflower: {
    name: 'ひまわり', icon: '🌻', seedCost: 60, growTime: 90,
    sparkle: 95, petal: 3, unlockLevel: 4,
    colors: [0xffc93c],
    desc: 'せがたかい げんきな花',
  },
  lily: {
    name: 'ゆり', icon: '💮', seedCost: 85, growTime: 110,
    sparkle: 140, petal: 3, unlockLevel: 5,
    colors: [0xffffff, 0xffb3d9, 0xffe08a],
    desc: 'きひんあふれる 花',
  },
  starflower: {
    name: 'スターフラワー', icon: '⭐', seedCost: 130, growTime: 140,
    sparkle: 220, petal: 4, unlockLevel: 6, glow: true,
    colors: [0xffe066, 0xa2f2ff],
    desc: 'ほしのひかりを あつめた花',
  },
  moonflower: {
    name: 'ムーンフラワー', icon: '🌙', seedCost: 170, growTime: 100,
    sparkle: 300, petal: 5, unlockLevel: 7, glow: true, night: true,
    colors: [0xcfe6ff, 0xe8d4ff],
    desc: 'よるにだけ さく ふしぎな花',
  },
  rainbowrose: {
    name: 'レインボーローズ', icon: '🌈', seedCost: 260, growTime: 180,
    sparkle: 520, petal: 8, unlockLevel: 8, glow: true, rainbow: true,
    colors: [0xff5f9e],
    desc: 'にじいろに かがやく でんせつの花',
  },
  crystalflower: {
    name: 'クリスタルフラワー', icon: '💎', seedCost: 400, growTime: 220,
    sparkle: 900, petal: 12, unlockLevel: 9, glow: true, crystal: true,
    colors: [0xa2f2ff, 0xffb0f0],
    desc: 'しまの まほうが うんだ ほうせき',
  },
};

// ---------------- デコレーション定義 ----------------
export const DECOR = {
  bench: { name: 'おはなベンチ', icon: '🪑', cost: 60, unlockLevel: 1, desc: 'ひとやすみ できるよ' },
  lantern: { name: 'まほうランタン', icon: '🏮', cost: 80, unlockLevel: 2, desc: 'よるに ひかるよ', glow: true },
  arch: { name: 'バラのアーチ', icon: '🌹', cost: 150, unlockLevel: 3, desc: 'くぐると しあわせに' },
  teatable: { name: 'ティーテーブル', icon: '🫖', cost: 180, unlockLevel: 3, desc: 'おちゃかいを ひらこう' },
  swing: { name: 'おはなブランコ', icon: '🎠', cost: 260, unlockLevel: 4, desc: 'ゆらゆら たのしいな' },
  fountain: { name: 'クリスタルのふんすい', icon: '⛲', cost: 400, unlockLevel: 5, desc: 'みずが きらきら', glow: true },
  topiary: { name: 'ハートのトピアリー', icon: '💚', cost: 220, unlockLevel: 4, desc: 'ハートがたの き' },
  unicorn: { name: 'ユニコーンぞう', icon: '🦄', cost: 650, unlockLevel: 6, desc: 'でんせつの まもりがみ', glow: true },
  gazebo: { name: 'おひめさまガゼボ', icon: '🏰', cost: 1000, unlockLevel: 8, desc: 'しまいちばんの ごうかさ', glow: true },
};

// ---------------- ドレスアップ定義 ----------------
export const DRESS_COLORS = {
  pink: { name: 'さくらピンク', color: 0xff8ac2, accent: 0xffd7ea, cost: 0, unlockLevel: 1 },
  blue: { name: 'そらいろブルー', color: 0x7fb8ff, accent: 0xd6ecff, cost: 120, unlockLevel: 1 },
  mint: { name: 'ミントグリーン', color: 0x7fe8c0, accent: 0xdcfff2, cost: 120, unlockLevel: 2 },
  purple: { name: 'すみれパープル', color: 0xb388ff, accent: 0xe8dcff, cost: 200, unlockLevel: 3 },
  gold: { name: 'おうごんゴールド', color: 0xffd166, accent: 0xfff3d0, cost: 350, unlockLevel: 5 },
  ruby: { name: 'ルビーレッド', color: 0xf05070, accent: 0xffd0da, cost: 350, unlockLevel: 6 },
  night: { name: 'よぞらネイビー', color: 0x5a6acf, accent: 0xcdd6ff, cost: 500, unlockLevel: 7, glow: true },
  rainbow: { name: 'にじいろドレス', color: 0xff8ac2, accent: 0xffffff, cost: 999, unlockLevel: 8, rainbow: true },
};

export const HAIR_COLORS = {
  gold: { name: 'きんいろ', color: 0xf5c542, cost: 0, unlockLevel: 1 },
  brown: { name: 'チョコブラウン', color: 0x8a5a3b, cost: 80, unlockLevel: 1 },
  pink: { name: 'ストロベリー', color: 0xff9ecb, cost: 150, unlockLevel: 2 },
  silver: { name: 'プラチナ', color: 0xe8e8f2, cost: 250, unlockLevel: 4 },
  lavender: { name: 'ラベンダー', color: 0xc7a4ff, cost: 300, unlockLevel: 6 },
};

export const TIARAS = {
  star: { name: 'スターティアラ', icon: '⭐', cost: 0, unlockLevel: 1 },
  heart: { name: 'ハートティアラ', icon: '💖', cost: 200, unlockLevel: 2 },
  crown: { name: 'クイーンクラウン', icon: '👑', cost: 450, unlockLevel: 5 },
  flower: { name: 'おはなかんむり', icon: '🌸', cost: 300, unlockLevel: 3 },
};

// ---------------- ちょうちょ図鑑 ----------------
export const BUTTERFLIES = {
  white: { name: 'モンシロチョウ', icon: '🦋', color: 0xffffff, rarity: 1 },
  yellow: { name: 'キチョウ', icon: '🦋', color: 0xffe066, rarity: 1 },
  pink: { name: 'サクラチョウ', icon: '🦋', color: 0xff9ecb, rarity: 2 },
  blue: { name: 'ソラチョウ', icon: '🦋', color: 0x7fb8ff, rarity: 2 },
  purple: { name: 'ユメチョウ', icon: '🦋', color: 0xb388ff, rarity: 3 },
  gold: { name: 'オウゴンチョウ', icon: '🦋', color: 0xffd166, rarity: 4, glow: true },
  rainbow: { name: 'ニジイロチョウ', icon: '🦋', color: 0xff5f9e, rarity: 5, glow: true, rainbow: true },
};

// ---------------- ガーデンレベル ----------------
// xp = 咲かせた花の合計数
export const LEVELS = [0, 3, 8, 15, 25, 40, 60, 85, 115, 150, 200];

export function levelForXp(xp) {
  let lv = 1;
  for (let i = 1; i < LEVELS.length; i++) if (xp >= LEVELS[i]) lv = i + 1;
  return Math.min(lv, LEVELS.length);
}

export function levelProgress(xp) {
  const lv = levelForXp(xp);
  if (lv >= LEVELS.length) return 1;
  const cur = LEVELS[lv - 1];
  const next = LEVELS[lv];
  return (xp - cur) / (next - cur);
}

// レベルごとの ごほうび説明
export const LEVEL_REWARDS = {
  2: 'バラのたね と ランタンが かえるように!',
  3: 'ベルフラワー と アーチが かえるように! ひみつのにわ かいほう!',
  4: 'ひまわり と ブランコが かえるように!',
  5: 'ゆり と ふんすい、クラウンが かえるように!',
  6: 'スターフラワー と ユニコーンぞうが かえるように!',
  7: 'ムーンフラワーが かえるように!',
  8: 'レインボーローズ と ガゼボが かえるように!',
  9: 'クリスタルフラワーが かえるように!',
  10: 'マジカルガーデン マスター! おめでとう!',
};

// ---------------- セーブデータ ----------------
export function defaultSave() {
  return {
    sparkles: 30,
    petals: 0,
    xp: 0,
    seeds: { tulip: 2 },
    plots: {},          // plotId -> {type, colorIdx, progress, wateredUntil}
    decors: [],         // {type, x, z, rot}
    dress: { dress: 'pink', hair: 'gold', tiara: 'star' },
    owned: { dress: ['pink'], hair: ['gold'], tiara: ['star'] },
    album: {},          // butterflyId -> count
    questIndex: 0,
    questProgress: 0,
    flags: {},          // 汎用フラグ(チュートリアル等)
    stats: { planted: 0, watered: 0, bloomed: 0, harvested: 0, butterflies: 0, decorPlaced: 0, dressChanged: 0, photos: 0 },
    dayTime: 0.3,       // 0..1 (0.25=あさ, 0.5=ひる, 0.75=ゆうがた)
  };
}

export class GameState extends Emitter {
  constructor() {
    super();
    this.data = defaultSave();
  }

  hasSave() {
    try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; }
  }

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const d = JSON.parse(raw);
      this.data = Object.assign(defaultSave(), d);
      this.data.stats = Object.assign(defaultSave().stats, d.stats || {});
      return true;
    } catch { return false; }
  }

  save() {
    try {
      this.data.lastSaved = Date.now();
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch { /* プライベートモード等 */ }
  }

  reset() {
    this.data = defaultSave();
    this.save();
  }

  get level() { return levelForXp(this.data.xp); }

  addSparkles(n) {
    this.data.sparkles = Math.max(0, this.data.sparkles + n);
    this.emit('currency');
  }

  addPetals(n) {
    this.data.petals = Math.max(0, this.data.petals + n);
    this.emit('currency');
  }

  addXp(n) {
    const before = this.level;
    this.data.xp += n;
    this.emit('currency');
    const after = this.level;
    if (after > before) this.emit('levelup', after);
  }

  addSeed(type, n = 1) {
    this.data.seeds[type] = (this.data.seeds[type] || 0) + n;
    this.emit('inventory');
  }

  useSeed(type) {
    if ((this.data.seeds[type] || 0) <= 0) return false;
    this.data.seeds[type]--;
    this.emit('inventory');
    return true;
  }

  stat(key, n = 1) {
    this.data.stats[key] = (this.data.stats[key] || 0) + n;
    this.emit('stat', key, this.data.stats[key]);
  }
}
