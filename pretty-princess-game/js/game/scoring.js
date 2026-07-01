// コーデ度スコアの計算
import { ITEM_BY_ID } from '../items/catalog.js';
import { PALETTES } from '../items/style.js';

// roomState: state.js の部屋データ / roomDef: rooms-data.js の定義
export function computeScore(roomDef, roomState) {
  const items = roomState.placed.map((p) => ITEM_BY_ID.get(p.id)).filter(Boolean);
  const wp = ITEM_BY_ID.get(roomState.wallpaper);
  const fl = ITEM_BY_ID.get(roomState.floor);

  let base = 0;
  const paletteCount = {};
  const cats = new Set();
  let themeBonus = 0;

  for (const it of items) {
    base += it.score;
    paletteCount[it.palette] = (paletteCount[it.palette] ?? 0) + 1;
    cats.add(it.cat);
    if (it.themes.some((t) => roomDef.themes.includes(t))) themeBonus += Math.round(it.score * 0.35);
  }
  if (wp) base += wp.score;
  if (fl) base += fl.score;

  // 色の統一感: いちばん多い色の割合が高いほどボーナス
  let harmony = 0;
  let domPal = null;
  if (items.length >= 3) {
    const [pal, n] = Object.entries(paletteCount).sort((a, b) => b[1] - a[1])[0];
    domPal = pal;
    const frac = n / items.length;
    if (frac >= 0.5) harmony = Math.round(frac * items.length * 5);
    if (wp && wp.palette === pal) harmony += 25;
    if (fl && fl.palette === pal) harmony += 15;
  }

  // いろいろな種類を置くとバラエティボーナス
  const variety = cats.size * 6;

  const total = base + themeBonus + harmony + variety;
  return {
    total,
    base,
    themeBonus,
    harmony,
    variety,
    domPaletteName: domPal ? PALETTES[domPal].name : null,
    count: items.length,
  };
}

export function starsFor(total, target) {
  if (total >= target * 2) return 3;
  if (total >= target * 1.45) return 2;
  if (total >= target) return 1;
  return 0;
}
