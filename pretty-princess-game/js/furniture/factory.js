// アイテム定義 → 3Dメッシュの生成
import { BUILDERS } from './builders.js';
import { makeMats } from './parts.js';

// item: catalog.js のアイテム(kind === 'furniture')
export function buildItemMesh(item) {
  const def = BUILDERS[item.cat];
  const mats = makeMats(item.palette, item.pattern);
  const group = def.build(mats);
  group.userData.itemId = item.id;
  return group;
}
