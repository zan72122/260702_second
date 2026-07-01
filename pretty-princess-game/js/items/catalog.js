// アイテムカタログ生成: 家具カテゴリ × パレット × 柄 で 2,000種以上を実生成
import { BUILDERS } from '../furniture/builders.js';
import { PALETTES, PATTERNS } from './style.js';

export const RARITY_NAMES = ['N', 'R', 'SR'];
export const RARITY_ICONS = ['', '💜', '🌟'];
const PRICE_MULT = [1, 2.2, 4];
const SCORE_MULT = [1, 1.45, 2.1];

export const WALLPAPER_PATTERNS = ['plain', 'rose', 'heart', 'stripe', 'dot', 'star', 'lace', 'check'];
export const FLOOR_TYPES = [
  { id: 'carpet', name: 'カーペット' },
  { id: 'wood', name: 'フローリング' },
  { id: 'tile', name: 'タイル' },
  { id: 'checker', name: 'チェッカー' },
  { id: 'heartTile', name: 'ハートタイル' },
];

function itemName(catName, palId, patId) {
  const pat = PATTERNS[patId].name;
  const pal = PALETTES[palId].name;
  return `${pat ? pat + ' ' : ''}${pal}の${catName}`;
}

export const CATALOG = [];
export const ITEM_BY_ID = new Map();

// --- 家具 ---
for (const [catId, def] of Object.entries(BUILDERS)) {
  for (const palId of Object.keys(PALETTES)) {
    for (const patId of def.patterns) {
      const rarity = Math.min(2, PALETTES[palId].rarity + PATTERNS[patId].rarity);
      const item = {
        id: `f:${catId}:${palId}:${patId}`,
        kind: 'furniture',
        cat: catId,
        tab: def.tab,
        icon: def.icon,
        name: itemName(def.name, palId, patId),
        palette: palId,
        pattern: patId,
        rarity,
        price: Math.round(def.price * PRICE_MULT[rarity] / 10) * 10,
        score: Math.round(def.score * SCORE_MULT[rarity]),
        themes: def.themes,
        cells: def.cells,
        surface: def.surface,
        mountY: def.mountY ?? 0,
        glow: !!def.glow,
        animated: def.animated ?? null,
      };
      CATALOG.push(item);
    }
  }
}

// --- かべがみ ---
for (const palId of Object.keys(PALETTES)) {
  for (const patId of WALLPAPER_PATTERNS) {
    const rarity = Math.min(2, PALETTES[palId].rarity + PATTERNS[patId].rarity);
    CATALOG.push({
      id: `w:${palId}:${patId}`,
      kind: 'wallpaper',
      tab: 'かべがみ',
      icon: '🎀',
      name: itemName('かべがみ', palId, patId),
      palette: palId,
      pattern: patId,
      rarity,
      price: Math.round(180 * PRICE_MULT[rarity] / 10) * 10,
      score: 18 + rarity * 8,
      themes: ['elegant'],
    });
  }
}

// --- ゆかざい ---
for (const palId of Object.keys(PALETTES)) {
  for (const ft of FLOOR_TYPES) {
    const rarity = PALETTES[palId].rarity;
    CATALOG.push({
      id: `g:${palId}:${ft.id}`,
      kind: 'floor',
      tab: 'ゆかざい',
      icon: '🟪',
      name: `${PALETTES[palId].name}の${ft.name}`,
      palette: palId,
      floorType: ft.id,
      rarity,
      price: Math.round(160 * PRICE_MULT[rarity] / 10) * 10,
      score: 15 + rarity * 8,
      themes: ['elegant'],
    });
  }
}

for (const item of CATALOG) ITEM_BY_ID.set(item.id, item);

export const TOTAL_ITEMS = CATALOG.length;
export const ALL_TABS = [...new Set(CATALOG.map((i) => i.tab))];

// ガチャ用の抽選(レア度で重みづけ)
export function gachaRoll() {
  const r = Math.random();
  const rarity = r < 0.6 ? 0 : r < 0.9 ? 1 : 2;
  const pool = CATALOG.filter((i) => i.rarity === rarity && i.kind === 'furniture');
  return pool[Math.floor(Math.random() * pool.length)];
}
