// お城の20部屋の定義
// size: [幅, 奥行き](ワールド単位 / 1グリッド=0.5)
// unlockAt: 復興ずみの部屋数がこの数以上で解放
// themes: この部屋でボーナスがつくテーマ
export const ROOMS = [
  { id: 'entrance',  name: 'エントランスホール', icon: '🏰', size: [14, 11], unlockAt: 0, target: 150, themes: ['elegant', 'royal'],  desc: 'お城の玄関。ここからすべてが始まる', reward: [400, 2] },
  { id: 'bedroom',   name: 'プリンセスの寝室',   icon: '🛏', size: [12, 10], unlockAt: 1, target: 200, themes: ['elegant', 'sweet'],  desc: 'ふかふかベッドでおやすみなさい', reward: [450, 2] },
  { id: 'tearoom',   name: 'ティールーム',       icon: '🫖', size: [11, 9],  unlockAt: 2, target: 230, themes: ['sweet'],             desc: 'あまいお菓子とお茶の時間', reward: [500, 2] },
  { id: 'library',   name: 'としょしつ',         icon: '📚', size: [12, 10], unlockAt: 3, target: 260, themes: ['study', 'magic'],    desc: '物語がねむる本のお部屋', reward: [520, 2] },
  { id: 'dressroom', name: 'ドレスルーム',       icon: '👗', size: [11, 9],  unlockAt: 4, target: 280, themes: ['beauty', 'elegant'], desc: 'おしゃれの魔法がかかる場所', reward: [550, 3] },
  { id: 'music',     name: 'おんがくしつ',       icon: '🎹', size: [13, 10], unlockAt: 5, target: 310, themes: ['music'],             desc: '美しい音色がひびくお部屋', reward: [580, 3] },
  { id: 'dining',    name: 'ダイニングルーム',   icon: '🍽', size: [14, 10], unlockAt: 6, target: 340, themes: ['sweet', 'party'],    desc: 'みんなでお食事する広間', reward: [600, 3] },
  { id: 'kitchen',   name: 'キッチン',           icon: '🍰', size: [11, 9],  unlockAt: 7, target: 360, themes: ['sweet'],             desc: 'おいしいものが生まれる場所', reward: [620, 3] },
  { id: 'bathroom',  name: 'バスルーム',         icon: '🛁', size: [10, 9],  unlockAt: 8, target: 380, themes: ['beauty', 'relax'],   desc: 'つやつや・ぴかぴかになるお部屋', reward: [650, 3] },
  { id: 'playroom',  name: 'プレイルーム',       icon: '🧸', size: [12, 10], unlockAt: 9, target: 410, themes: ['toy'],               desc: 'おもちゃがいっぱいの夢の部屋', reward: [680, 4] },
  { id: 'parlor',    name: 'おうせつしつ',       icon: '🛋', size: [13, 10], unlockAt: 10, target: 440, themes: ['elegant', 'relax'], desc: 'お客さまをおもてなしする間', reward: [700, 4] },
  { id: 'garden',    name: 'ガーデンルーム',     icon: '🌷', size: [14, 11], unlockAt: 11, target: 470, themes: ['nature'],           desc: 'お花と緑があふれる温室', reward: [730, 4] },
  { id: 'ballroom',  name: 'ぶとうかいじょう',   icon: '💃', size: [16, 12], unlockAt: 12, target: 520, themes: ['royal', 'party'],   desc: 'きらびやかな舞踏会の大広間', reward: [780, 4] },
  { id: 'gallery',   name: 'ギャラリー',         icon: '🖼', size: [14, 9],  unlockAt: 13, target: 540, themes: ['art', 'elegant'],   desc: '芸術品がならぶ回廊', reward: [800, 5] },
  { id: 'treasury',  name: 'ほうもつこ',         icon: '💎', size: [10, 9],  unlockAt: 14, target: 570, themes: ['royal', 'magic'],   desc: 'お城の宝がねむる部屋', reward: [850, 5] },
  { id: 'stargaze',  name: 'ほしみの塔',         icon: '🌙', size: [10, 10], unlockAt: 15, target: 600, themes: ['magic', 'study'],   desc: '星ぞらを見あげる小さな塔', reward: [880, 5] },
  { id: 'sunroom',   name: 'サンルーム',         icon: '☀️', size: [11, 9],  unlockAt: 16, target: 630, themes: ['nature', 'relax'],  desc: 'ひだまりのくつろぎ空間', reward: [900, 5] },
  { id: 'guest',     name: 'ゲストルーム',       icon: '🎀', size: [12, 10], unlockAt: 17, target: 660, themes: ['elegant', 'relax'], desc: '大切なお客さまのためのお部屋', reward: [950, 6] },
  { id: 'study',     name: 'おうさまのしょさい', icon: '📜', size: [12, 10], unlockAt: 18, target: 700, themes: ['study', 'royal'],   desc: 'いにしえの王さまの書斎', reward: [1000, 6] },
  { id: 'magictower', name: 'まほうのとう',      icon: '🔮', size: [12, 12], unlockAt: 19, target: 750, themes: ['magic', 'royal'],   desc: '帰り道の扉がある最後の塔…', reward: [1500, 10] },
];

export const ROOM_BY_ID = new Map(ROOMS.map((r) => [r.id, r]));

export const THEME_NAMES = {
  elegant: 'エレガント', royal: 'ロイヤル', sweet: 'スイート', study: 'おべんきょう',
  beauty: 'ビューティー', music: 'ミュージック', party: 'パーティー', relax: 'リラックス',
  toy: 'トイ', nature: 'ネイチャー', art: 'アート', magic: 'マジカル',
};
