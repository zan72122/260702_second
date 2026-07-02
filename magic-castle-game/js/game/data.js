// ゲームデータ定義(アイテム・きせかえ・ずかん・住人・おねがい)

// ---- きせかえ ----
export const OUTFITS = [
  // ドレス
  { id: 'dress_rose', cat: 'dress', name: 'ローズドレス', icon: '👗', price: 0,
    colors: { dress: 0xff8fc0, skirt: 0xffb7d9, trim: 0xfff0f7 } },
  { id: 'dress_sky', cat: 'dress', name: 'そらいろドレス', icon: '💙', price: 120,
    colors: { dress: 0x6db8f2, skirt: 0xa8d8ff, trim: 0xeaf6ff } },
  { id: 'dress_mint', cat: 'dress', name: 'ミントドレス', icon: '💚', price: 120,
    colors: { dress: 0x69d9a8, skirt: 0xa5ecc9, trim: 0xeafff4 } },
  { id: 'dress_sunny', cat: 'dress', name: 'ひまわりドレス', icon: '💛', price: 180,
    colors: { dress: 0xffc93e, skirt: 0xffe089, trim: 0xfff8e0 } },
  { id: 'dress_royal', cat: 'dress', name: 'ロイヤルドレス', icon: '💜', price: 320,
    colors: { dress: 0x9a6df0, skirt: 0xc3a6ff, trim: 0xf0e8ff } },
  { id: 'dress_night', cat: 'dress', name: 'よぞらドレス', icon: '🌙', price: 500, unlockLv: 3,
    colors: { dress: 0x3b3f8f, skirt: 0x5b60c9, trim: 0xaab0ff, glow: 0x8890ff } },
  { id: 'dress_star', cat: 'dress', name: 'スターライトドレス', icon: '⭐', price: 800, unlockLv: 4,
    colors: { dress: 0xffe9a8, skirt: 0xfff4cf, trim: 0xffffff, glow: 0xffd76e } },
  { id: 'dress_rainbow', cat: 'dress', name: 'にじいろドレス', icon: '🌈', price: 1500, unlockLv: 6,
    colors: { dress: 0xff8fc0, skirt: 0x8fd0ff, trim: 0xfff6b8, glow: 0xffb0ff, rainbow: true } },

  // かみかざり
  { id: 'hat_none', cat: 'hat', name: 'なし', icon: '🚫', price: 0 },
  { id: 'hat_ribbon', cat: 'hat', name: 'りぼん', icon: '🎀', price: 60, colors: { main: 0xff5f9e } },
  { id: 'hat_tiara', cat: 'hat', name: 'ティアラ', icon: '👑', price: 250, colors: { main: 0xffd76e } },
  { id: 'hat_flower', cat: 'hat', name: 'おはなのかんむり', icon: '🌸', price: 150, colors: { main: 0xffb7d9 } },
  { id: 'hat_witch', cat: 'hat', name: 'まほうつかいのぼうし', icon: '🧙', price: 400, unlockLv: 3, colors: { main: 0x5b3fa8 } },
  { id: 'hat_crown', cat: 'hat', name: 'クイーンクラウン', icon: '💎', price: 1000, unlockLv: 5, colors: { main: 0xffe089, glow: 0xffd76e } },

  // ステッキ
  { id: 'wand_star', cat: 'wand', name: 'おほしさまステッキ', icon: '⭐', price: 0, colors: { head: 0xffd76e } },
  { id: 'wand_heart', cat: 'wand', name: 'ハートステッキ', icon: '💖', price: 200, colors: { head: 0xff7eb6 } },
  { id: 'wand_moon', cat: 'wand', name: 'みかづきステッキ', icon: '🌙', price: 350, unlockLv: 2, colors: { head: 0xa8d8ff } },
  { id: 'wand_rose', cat: 'wand', name: 'ローズステッキ', icon: '🌹', price: 500, unlockLv: 4, colors: { head: 0xff5f7e } },
];
export const outfitById = (id) => OUTFITS.find((o) => o.id === id);

// ---- さかな ----
export const FISH = [
  { id: 'fish_apple', name: 'りんごフィッシュ', icon: '🐟', rarity: 1, price: 25, desc: 'りんごみたいにまっかな おさかな。' },
  { id: 'fish_bubble', name: 'あわあわフグ', icon: '🐡', rarity: 1, price: 30, desc: 'あわをふくのが とくいだよ。' },
  { id: 'fish_ribbon', name: 'りぼんテール', icon: '🎏', rarity: 2, price: 60, desc: 'しっぽが りぼんみたいに ひらひら。' },
  { id: 'fish_gold', name: 'こがねスプラッシュ', icon: '🌟', rarity: 3, price: 150, desc: 'きんいろに かがやく めずらしい さかな。' },
  { id: 'fish_moon', name: 'つきのしずくウオ', icon: '🌙', rarity: 3, price: 200, night: true, desc: 'よるのいけにだけ あらわれる。' },
  { id: 'fish_crystal', name: 'クリスタルパーチ', icon: '💎', rarity: 4, price: 400, desc: 'からだが すきとおった でんせつのさかな。' },
];

// ---- むし ----
export const BUGS = [
  { id: 'bug_pink', name: 'さくらちょうちょ', icon: '🦋', rarity: 1, price: 20, desc: 'さくらいろの かわいい ちょうちょ。' },
  { id: 'bug_blue', name: 'そらいろちょうちょ', icon: '🦋', rarity: 1, price: 25, desc: 'そらいろの はねが きれい。' },
  { id: 'bug_gold', name: 'おうごんちょうちょ', icon: '✨', rarity: 3, price: 120, desc: 'きんの こなを まきちらす。' },
  { id: 'bug_firefly', name: 'ほしぼたる', icon: '🌟', rarity: 2, price: 80, night: true, desc: 'よるに ほしのように ひかる。' },
  { id: 'bug_fairy', name: 'ようせいちょうちょ', icon: '🧚', rarity: 4, price: 300, desc: 'ようせいの ともだちと いわれる まぼろしのちょう。' },
];

// ---- おはな ----
export const FLOWERS = [
  { id: 'flw_tulip', name: 'にじチューリップ', icon: '🌷', price: 30, growTime: 25, seedPrice: 10, desc: 'いろとりどりの チューリップ。' },
  { id: 'flw_sun', name: 'スマイルひまわり', icon: '🌻', price: 50, growTime: 40, seedPrice: 18, desc: 'いつも えがおの ひまわり。' },
  { id: 'flw_rose', name: 'プリンセスローズ', icon: '🌹', price: 90, growTime: 60, seedPrice: 32, desc: 'おしろで あいされる バラ。' },
  { id: 'flw_star', name: 'ほしのはな', icon: '💫', price: 180, growTime: 90, seedPrice: 60, desc: 'よるに キラキラひかる ふしぎなはな。' },
];
export const flowerById = (id) => FLOWERS.find((f) => f.id === id);

// ---- 住人(オリジナルキャラ) ----
export const NPCS = [
  {
    id: 'stella', name: 'ステラ', title: 'おしろのようせい', icon: '🧚',
    kind: 'fairy', colors: { body: 0xfff0b8, dress: 0xffd76e, accent: 0xffb0ff },
    home: { x: 0, z: 6 }, wander: 3,
    greetings: [
      'ようこそ マジックキャッスルへ! ここは まほうと ゆめの おしろよ✨',
      'まちのみんなと なかよくなると おしろが もっと かがやくの!',
      'ハッピーが たまると 新しい おようふくが とどくかも…?',
    ],
  },
  {
    id: 'luna', name: 'ルナ', title: 'はなうさぎ', icon: '🐰',
    kind: 'bunny', colors: { body: 0xfffefa, dress: 0xffb7d9, accent: 0xff7eb6 },
    home: { x: -14, z: 8 }, wander: 5,
    greetings: [
      'おはなの おせわは たのしいよ〜! はたけに タネを うえてみてね🌷',
      'まほうのステッキで おみずを あげると おはなが よろこぶんだ!',
      'おうごんちょうちょ、みたことある? キラキラなんだよ〜',
    ],
  },
  {
    id: 'marron', name: 'マロン', title: 'パティシエぐま', icon: '🐻',
    kind: 'bear', colors: { body: 0xc98d5e, dress: 0xfff4e0, accent: 0xff9e5e },
    home: { x: 15, z: 4 }, wander: 4,
    greetings: [
      'いらっしゃい! ぼくの ベーカリーで あまい におい してるでしょ?',
      'おいしい ケーキには あいじょうと はちみつが ひつようなのさ。',
      'りんごフィッシュの アップルパイ…は つくらないよ!?',
    ],
  },
  {
    id: 'felix', name: 'フェリクス', title: 'おんがくねこ', icon: '🐱',
    kind: 'cat', colors: { body: 0x8f9bb5, dress: 0x5b3fa8, accent: 0xffd76e },
    home: { x: 0, z: -20 }, wander: 6,
    greetings: [
      'にゃ〜♪ ひろばの ステージで いっしょに おどらないかい?',
      'リズムに のって タップ タップ! きみなら できるさ にゃ。',
      'よるの ダンスパーティーは さいこうに もりあがるにゃ〜!',
    ],
  },
  {
    id: 'popo', name: 'ポポ', title: 'つりめいじん', icon: '🐸',
    kind: 'frog', colors: { body: 0x7ecb6a, dress: 0x4a9e5c, accent: 0xffe089 },
    home: { x: -20, z: -14 }, wander: 3,
    greetings: [
      'ケロッ。いけには ふしぎな さかなが いっぱい いるんだケロ。',
      'ウキが しずんだら すかさず あわせるんだケロ!',
      'でんせつの クリスタルパーチ…わしも まだ みたことないケロ…',
    ],
  },
  {
    id: 'gigi', name: 'ジジ', title: 'ほしよみふくろう', icon: '🦉',
    kind: 'owl', colors: { body: 0xb59ce8, dress: 0x3b2478, accent: 0xffd76e },
    home: { x: 18, z: -18 }, wander: 3,
    greetings: [
      'ホゥ…よるの そらには ほしのかけらが ふってくるのじゃ。',
      'もやもやゴーストを みつけたら まほうで はらって おくれ。',
      'ほしがふる よるは とくべつな さかなも つれるそうじゃ…ホゥ。',
    ],
  },
];
export const npcById = (id) => NPCS.find((n) => n.id === id);

// ---- おねがい(クエスト) ----
export const QUESTS = [
  { id: 'q_hello', npc: 'stella', name: 'みんなに ごあいさつ', desc: 'まちの住人 3人に はなしかけよう', type: 'talk', count: 3,
    reward: { coins: 50, happy: 10 },
    lines: ['まずは まちのみんなに ごあいさつ してきて!', 'みんな あなたに あいたがってるわ✨'] },
  { id: 'q_flower1', npc: 'luna', name: 'はじめての ガーデニング', desc: 'おはなを 1本 そだてて しゅうかくしよう', type: 'harvest', count: 1,
    reward: { coins: 80, happy: 15, item: { id: 'seed_flw_sun', n: 2 } },
    lines: ['はたけに タネをうえて、まほうで おみずを あげてね🌷', 'そだったら つんでみて!'] },
  { id: 'q_fish1', npc: 'popo', name: 'つりデビュー', desc: 'さかなを 2ひき つろう', type: 'fish', count: 2,
    reward: { coins: 100, happy: 15 },
    lines: ['いけで さかなを 2ひき つってみるんだケロ!', 'ウキが「!」になったら タップだケロ!'] },
  { id: 'q_bug1', npc: 'luna', name: 'ちょうちょを おいかけて', desc: 'ちょうちょを 3びき つかまえよう', type: 'bug', count: 3,
    reward: { coins: 90, happy: 15 },
    lines: ['おにわに ちょうちょが とんでるの。', 'そーっと ちかづいて つかまえてみて!'] },
  { id: 'q_ghost1', npc: 'gigi', name: 'ゴーストばらい', desc: 'もやもやゴーストを 3たい はらおう', type: 'ghost', count: 3,
    reward: { coins: 120, happy: 20 },
    lines: ['まちに もやもやゴーストが でおるのじゃ…', 'まほうのステッキで シュッと はらって おくれ!'] },
  { id: 'q_dance1', npc: 'felix', name: 'ダンスレッスン', desc: 'ダンスで 1500てん いじょう とろう', type: 'dance', count: 1500,
    reward: { coins: 150, happy: 25 },
    lines: ['ステージで いっしょに おどるにゃ♪', 'リズムに あわせて タップするにゃよ!'] },
  { id: 'q_honey', npc: 'marron', name: 'あまいはちみつ さがし', desc: 'はちみつを 2つ あつめよう(木を まほうで ゆらすと おちるかも)', type: 'item', item: 'honey', count: 2,
    reward: { coins: 130, happy: 20, item: { id: 'cake', n: 1 } },
    lines: ['ケーキに つかう はちみつが たりないんだ〜!', '木のちかくで まほうを つかうと おちてくるかも?'] },
  { id: 'q_flower_rose', npc: 'marron', name: 'バラのケーキかざり', desc: 'プリンセスローズを 2本 とどけよう', type: 'deliver', item: 'flw_rose', count: 2,
    reward: { coins: 200, happy: 30 },
    lines: ['とくべつな ケーキに バラの はなびらを つかいたいんだ。', 'プリンセスローズを 2本 おねがい!'] },
  { id: 'q_star', npc: 'gigi', name: 'ほしのかけら あつめ', desc: 'よるに ふってくる ほしのかけらを 3つ ひろおう', type: 'item', item: 'stardust', count: 3,
    reward: { coins: 250, happy: 35 },
    lines: ['よるになると そらから ほしのかけらが ふるのじゃ。', 'キラキラ ひかるのを 3つ あつめて おくれ。'] },
  { id: 'q_fish_moon', npc: 'popo', name: 'よるのいけの ぬし', desc: 'つきのしずくウオを 1ぴき つろう', type: 'fishSpecies', item: 'fish_moon', count: 1,
    reward: { coins: 300, happy: 40 },
    lines: ['よるのいけにしか いない さかなが いるんだケロ。', 'つきのひかりが すきなんだケロ〜。'] },
  { id: 'q_dance2', npc: 'felix', name: 'スターダンサー', desc: 'ダンスで 3000てん いじょう とろう', type: 'dance', count: 3000,
    reward: { coins: 350, happy: 45 },
    lines: ['きみの ダンス、もっと みたいにゃ!', 'こんどは 3000てん めざすにゃよ〜♪'] },
  { id: 'q_ghost2', npc: 'gigi', name: 'まちの へいわ', desc: 'もやもやゴーストを 10たい はらおう(つうさん)', type: 'ghostTotal', count: 10,
    reward: { coins: 400, happy: 50 },
    lines: ['ゴーストは なんども わいてくるのじゃ…', 'まちの へいわは たのんだぞ、ホゥ!'] },
];
export const questById = (id) => QUESTS.find((q) => q.id === id);

// ---- その他アイテム ----
export const MISC_ITEMS = {
  honey: { name: 'はちみつ', icon: '🍯', price: 40 },
  apple: { name: 'りんご', icon: '🍎', price: 15 },
  stardust: { name: 'ほしのかけら', icon: '✨', price: 50 },
  cake: { name: 'マロンの スペシャルケーキ', icon: '🍰', price: 120 },
};

// ハピネスレベルしきい値
export const LEVELS = [0, 40, 100, 180, 300, 460, 680, 950, 1300];

export function levelForHappiness(h) {
  let lv = 1;
  for (let i = 0; i < LEVELS.length; i++) if (h >= LEVELS[i]) lv = i + 1;
  return lv;
}

// アイテム名解決(ずかん・インベントリ表示用)
export function itemInfo(id) {
  if (id.startsWith('seed_')) {
    const f = flowerById(id.slice(5));
    return f ? { name: `${f.name}のタネ`, icon: '🌱', price: 0 } : null;
  }
  const f = FLOWERS.find((x) => x.id === id);
  if (f) return f;
  const fish = FISH.find((x) => x.id === id);
  if (fish) return fish;
  const bug = BUGS.find((x) => x.id === id);
  if (bug) return bug;
  return MISC_ITEMS[id] || null;
}
