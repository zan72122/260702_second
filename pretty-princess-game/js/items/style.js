// カラーパレットと柄の定義(アイテム/壁紙/ゆか共通)
// rarity: 0=ノーマル, 1=レア(R), 2=スーパーレア(SR)

export const PALETTES = {
  pink:     { name: 'ピンク',     main: '#ff9ec7', sub: '#ffd9ea', accent: '#f06fa8', trim: '#e8b84b', rarity: 0 },
  rose:     { name: 'ローズ',     main: '#e56a8f', sub: '#ffc9d8', accent: '#c94f75', trim: '#e8b84b', rarity: 0 },
  sax:      { name: 'サックス',   main: '#7fc4e8', sub: '#d3edfa', accent: '#4f9fd0', trim: '#ffffff', rarity: 0 },
  mint:     { name: 'ミント',     main: '#8fdcc0', sub: '#d9f6ea', accent: '#55b890', trim: '#ffffff', rarity: 0 },
  lavender: { name: 'ラベンダー', main: '#bda0e8', sub: '#e9def9', accent: '#9370d0', trim: '#ffffff', rarity: 0 },
  lemon:    { name: 'レモン',     main: '#f5dd85', sub: '#fdf4cd', accent: '#e0b845', trim: '#ffffff', rarity: 0 },
  white:    { name: 'ホワイト',   main: '#f7f2ee', sub: '#fffdfb', accent: '#e5d9d2', trim: '#e8b84b', rarity: 0 },
  chocolat: { name: 'ショコラ',   main: '#8a5a44', sub: '#c9a186', accent: '#5f3a28', trim: '#e8b84b', rarity: 1 },
  royal:    { name: 'ロイヤル',   main: '#41519a', sub: '#93a2d8', accent: '#2a3568', trim: '#e8b84b', rarity: 1 },
  gold:     { name: 'ゴールド',   main: '#e6be4e', sub: '#f7e8ab', accent: '#bd8f1f', trim: '#ffffff', rarity: 2 },
};

export const PATTERNS = {
  plain:  { name: '',           label: 'むじ',       rarity: 0 },
  rose:   { name: 'ローズがら', label: 'ローズがら', rarity: 0 },
  heart:  { name: 'ハートがら', label: 'ハートがら', rarity: 0 },
  stripe: { name: 'ストライプ', label: 'ストライプ', rarity: 0 },
  dot:    { name: 'みずたま',   label: 'みずたま',   rarity: 0 },
  star:   { name: 'おほしさま', label: 'おほしさま', rarity: 1 },
  lace:   { name: 'レースがら', label: 'レースがら', rarity: 1 },
  check:  { name: 'チェック',   label: 'チェック',   rarity: 0 },
};

export const PALETTE_IDS = Object.keys(PALETTES);
export const PATTERN_IDS = Object.keys(PATTERNS);
