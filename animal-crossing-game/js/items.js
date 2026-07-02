// ============================================================
// アイテム・さかな・むし・かせき カタログ
// ============================================================

// hours: [開始, 終了)  終了 < 開始 なら夜またぎ。 null なら一日中
// spot: 'river' | 'sea' | 'both'
// size: 影の大きさ 1(小)〜4(特大)
export const FISH = [
  { id: 'funa',      name: 'フナ',            price: 160,   spot: 'river', size: 2, hours: null,      rarity: 1, icon: '🐟', flavor: 'のんびりやの川魚。にがおいしい？' },
  { id: 'medaka',    name: 'メダカ',          price: 300,   spot: 'river', size: 1, hours: [4, 19],   rarity: 1, icon: '🐟', flavor: 'ちいさな学校のスター。' },
  { id: 'koi',       name: 'コイ',            price: 300,   spot: 'river', size: 3, hours: null,      rarity: 1, icon: '🐟', flavor: 'ながいきの縁起もの。' },
  { id: 'nishikigoi',name: 'ニシキゴイ',      price: 4000,  spot: 'river', size: 3, hours: [16, 9],   rarity: 3, icon: '🎏', flavor: 'およぐ宝石とよばれる美魚。' },
  { id: 'kingyo',    name: 'キンギョ',        price: 1300,  spot: 'river', size: 1, hours: null,      rarity: 2, icon: '🐠', flavor: 'まんまるおめめがチャームポイント。' },
  { id: 'zarigani',  name: 'ザリガニ',        price: 200,   spot: 'river', size: 2, hours: null,      rarity: 1, icon: '🦞', flavor: 'はさみでチョキチョキいかくする。' },
  { id: 'donko',     name: 'ドンコ',          price: 400,   spot: 'river', size: 2, hours: [16, 9],   rarity: 2, icon: '🐟', flavor: 'ずんぐりむっくりの夜型さん。' },
  { id: 'namazu',    name: 'ナマズ',          price: 800,   spot: 'river', size: 3, hours: [16, 9],   rarity: 2, icon: '🐟', flavor: 'ひげがじまんのぬしさま。' },
  { id: 'unagi',     name: 'ウナギ',          price: 2000,  spot: 'river', size: 3, hours: [16, 9],   rarity: 3, icon: '🪱', flavor: 'にゅるにゅるスタミナ満点！' },
  { id: 'ayu',       name: 'アユ',            price: 900,   spot: 'river', size: 2, hours: null,      rarity: 2, icon: '🐟', flavor: '夏の川のかおり高き女王。' },
  { id: 'oomori',    name: 'オオイワナ',      price: 3800,  spot: 'river', size: 3, hours: [4, 16],   rarity: 3, icon: '🐟', flavor: 'たきのぼりが得意なつわもの。' },
  { id: 'piranha',   name: 'ピラニア',        price: 2500,  spot: 'river', size: 2, hours: [9, 16],   rarity: 3, icon: '🐡', flavor: 'キバはするどいが実はこわがり。' },
  { id: 'arowana',   name: 'アロワナ',        price: 10000, spot: 'river', size: 3, hours: [16, 9],   rarity: 4, icon: '🐉', flavor: 'いにしえの姿をのこす高級魚！' },
  { id: 'aji',       name: 'アジ',            price: 150,   spot: 'sea',   size: 2, hours: null,      rarity: 1, icon: '🐟', flavor: 'みんな大すき、海のていばん。' },
  { id: 'suzuki',    name: 'スズキ',          price: 400,   spot: 'sea',   size: 4, hours: null,      rarity: 1, icon: '🐟', flavor: 'とにかくよく釣れる大物顔。' },
  { id: 'tai',       name: 'タイ',            price: 3000,  spot: 'sea',   size: 3, hours: null,      rarity: 2, icon: '🐠', flavor: 'めでたい日のごちそう。' },
  { id: 'hirame',    name: 'ヒラメ',          price: 800,   spot: 'sea',   size: 3, hours: null,      rarity: 2, icon: '🐟', flavor: 'ひだりヒラメにみぎカレイ。' },
  { id: 'fugu',      name: 'フグ',            price: 5000,  spot: 'sea',   size: 2, hours: [21, 4],   rarity: 3, icon: '🐡', flavor: 'ぷくーっとふくれるどくのもち主。' },
  { id: 'chouchin',  name: 'チョウチンアンコウ', price: 2500, spot: 'sea',  size: 3, hours: [16, 9],   rarity: 3, icon: '🎣', flavor: 'おでこのライトで夜もあんしん。' },
  { id: 'maguro',    name: 'マグロ',          price: 7000,  spot: 'sea',   size: 4, hours: null,      rarity: 3, icon: '🐟', flavor: 'とまったらねむれない韋駄天。' },
  { id: 'kajiki',    name: 'カジキ',          price: 10000, spot: 'sea',   size: 4, hours: null,      rarity: 4, icon: '🗡️', flavor: 'うみのソードマスター。' },
  { id: 'same',      name: 'サメ',            price: 15000, spot: 'sea',   size: 4, hours: [16, 9],   rarity: 4, icon: '🦈', flavor: 'せびれを見たらチャンス！超大物！' },
  { id: 'ryugu',     name: 'リュウグウノツカイ', price: 9000, spot: 'sea',  size: 4, hours: null,      rarity: 4, icon: '🐉', flavor: '竜宮からのつかい。であえたら奇跡。' },
  { id: 'shiira',    name: 'シイラ',          price: 6000,  spot: 'sea',   size: 4, hours: null,      rarity: 3, icon: '🐬', flavor: '海面をとぶ黄金のハンター。' },
];

// where: 'flower' | 'tree' | 'ground' | 'air' | 'night'
export const BUGS = [
  { id: 'monshiro',  name: 'モンシロチョウ',  price: 160,   where: 'air',    hours: [4, 19],  rarity: 1, icon: '🦋', flavor: 'はるかぜと おどるダンサー。' },
  { id: 'agehacho',  name: 'アゲハチョウ',    price: 240,   where: 'air',    hours: [4, 19],  rarity: 1, icon: '🦋', flavor: 'あでやかな もようがじまん。' },
  { id: 'morpho',    name: 'モルフォチョウ',  price: 4000,  where: 'air',    hours: [17, 8],  rarity: 3, icon: '🦋', flavor: 'かがやく青い羽は 空のかけら。' },
  { id: 'tonbo',     name: 'ギンヤンマ',      price: 230,   where: 'air',    hours: [8, 17],  rarity: 1, icon: '🪰', flavor: 'くうちゅうていしの めいじん。' },
  { id: 'akatonbo',  name: 'アカトンボ',      price: 180,   where: 'air',    hours: [8, 19],  rarity: 1, icon: '🪰', flavor: 'ゆうやけぞらの おともだち。' },
  { id: 'mitsubachi', name: 'ミツバチ',       price: 200,   where: 'flower', hours: [5, 17],  rarity: 1, icon: '🐝', flavor: 'はちみつ集めに おおいそがし。' },
  { id: 'tentou',    name: 'テントウムシ',    price: 200,   where: 'flower', hours: [8, 17],  rarity: 1, icon: '🐞', flavor: 'ほしのかずだけ しあわせ。' },
  { id: 'kamakiri',  name: 'カマキリ',        price: 430,   where: 'flower', hours: [8, 17],  rarity: 2, icon: '🦗', flavor: 'カマをかまえて にらみをきかす。' },
  { id: 'semi',      name: 'ミンミンゼミ',    price: 300,   where: 'tree',   hours: [8, 17],  rarity: 1, icon: '🪲', flavor: 'なつのボーカリスト。' },
  { id: 'higurashi', name: 'ヒグラシ',        price: 550,   where: 'tree',   hours: [4, 8],   rarity: 2, icon: '🪲', flavor: 'カナカナ…と ゆうぐれをつげる。' },
  { id: 'kabuto',    name: 'カブトムシ',      price: 1350,  where: 'tree',   hours: [17, 8],  rarity: 2, icon: '🪲', flavor: 'よるの木の きらめくおうさま。' },
  { id: 'kuwagata',  name: 'ノコギリクワガタ', price: 2000, where: 'tree',   hours: [17, 8],  rarity: 3, icon: '🦂', flavor: 'りっぱなアゴは 男のロマン。' },
  { id: 'herakles',  name: 'ヘラクレスオオカブト', price: 12000, where: 'tree', hours: [17, 8], rarity: 4, icon: '🪲', flavor: 'むしのおうじゃ、ここにこうりん！' },
  { id: 'hotaru',    name: 'ホタル',          price: 300,   where: 'night',  hours: [19, 24], rarity: 1, icon: '✨', flavor: 'かわべに ゆれる ひかりのつぶ。' },
  { id: 'suzumushi', name: 'スズムシ',        price: 430,   where: 'ground', hours: [17, 8],  rarity: 1, icon: '🦗', flavor: 'リンリンと よるをかなでる。' },
  { id: 'koorogi',   name: 'コオロギ',        price: 130,   where: 'ground', hours: [17, 8],  rarity: 1, icon: '🦗', flavor: 'ないているのは オスだけ。' },
  { id: 'batta',     name: 'トノサマバッタ',  price: 600,   where: 'ground', hours: [8, 19],  rarity: 2, icon: '🦗', flavor: 'とのさまの ジャンプは ちがう。' },
  { id: 'dangomushi', name: 'ダンゴムシ',     price: 250,   where: 'ground', hours: null,     rarity: 1, icon: '🐛', flavor: 'ころんとまるまる まもりのたつじん。' },
  { id: 'tamamushi', name: 'タマムシ',        price: 2400,  where: 'tree',   hours: [8, 17],  rarity: 3, icon: '🪲', flavor: 'にじいろにひかる いきた宝石。' },
  { id: 'kujaku',    name: 'オオムラサキ',    price: 3000,  where: 'air',    hours: [4, 19],  rarity: 3, icon: '🦋', flavor: '日本の国チョウ。気品がちがう。' },
];

export const FOSSILS = [
  { id: 'tyranno',   name: 'ティラノのかせき',   price: 6000, icon: '🦖', flavor: 'きょうりゅうのおうさまの ほね！' },
  { id: 'trikera',   name: 'トリケラのかせき',   price: 5500, icon: '🦕', flavor: '3ぼんヅノの やさしいきょじん。' },
  { id: 'ptera',     name: 'プテラノドンのかせき', price: 4000, icon: '🦅', flavor: 'そらをまう こだいのグライダー。' },
  { id: 'ammonite',  name: 'アンモナイト',       price: 1100, icon: '🐚', flavor: 'うずまきもようの こだいの貝。' },
  { id: 'sankichu',  name: 'サンヨウチュウ',     price: 1300, icon: '🪲', flavor: 'かせきかいの アイドル。' },
  { id: 'mammoth',   name: 'マンモスのきば',     price: 3000, icon: '🐘', flavor: 'ながーい きばは こおりの時代のあかし。' },
  { id: 'kohaku',    name: 'コハク',             price: 1200, icon: '🟠', flavor: 'とじこめられた とおいむかしの光。' },
  { id: 'funkoro',   name: 'きょうりゅうのフン', price: 1100, icon: '💩', flavor: '…これも りっぱな かせきです。' },
];

export const FRUITS = [
  { id: 'apple',   name: 'リンゴ',   price: 100, icon: '🍎', color: 0xe8433a },
  { id: 'orange',  name: 'オレンジ', price: 100, icon: '🍊', color: 0xf59a23 },
  { id: 'peach',   name: 'モモ',     price: 100, icon: '🍑', color: 0xf7b2c4 },
  { id: 'pear',    name: 'ナシ',     price: 100, icon: '🍐', color: 0xc9d94e },
  { id: 'coconut', name: 'ヤシのみ', price: 250, icon: '🥥', color: 0x8a6642 },
];

export const FLOWERS = [
  { id: 'f_red',    name: 'あかいコスモス',   price: 60, icon: '🌺', color: 0xef5a5a },
  { id: 'f_yellow', name: 'きいろいパンジー', price: 60, icon: '🌼', color: 0xf7d64a },
  { id: 'f_white',  name: 'しろいユリ',       price: 60, icon: '🌸', color: 0xfdfdf4 },
  { id: 'f_blue',   name: 'あおいアネモネ',   price: 90, icon: '💠', color: 0x6a8df0 },
];

export const TREASURES = [
  { id: 'kinnoberu',  name: 'きんのおきもの', price: 5000, icon: '🏆', flavor: 'ピカピカにかがやく ごほうび。' },
  { id: 'kaiga',      name: 'めいがのふくせい', price: 2500, icon: '🖼️', flavor: 'どこかでみたことある……？' },
  { id: 'tsubo',      name: 'こだいのツボ',   price: 1800, icon: '🏺', flavor: 'われないように そーっとね。' },
  { id: 'orgel',      name: 'ちいさなオルゴール', price: 3200, icon: '🎵', flavor: 'まわすと なつかしいメロディ。' },
];

// お店で売っているもの
export const SHOP_GOODS = [
  { id: 'rod',        name: 'つりざお',        price: 400,  icon: '🎣', desc: 'かわや うみで さかなが つれる', kind: 'tool' },
  { id: 'net',        name: 'むしとりあみ',    price: 400,  icon: '🦋', desc: 'むしに そっとちかづいて スイング！', kind: 'tool' },
  { id: 'shovel',     name: 'スコップ',        price: 400,  icon: '⛏️', desc: 'ほしマークの じめんを ほってみよう', kind: 'tool' },
  { id: 'can',        name: 'じょうろ',        price: 400,  icon: '🚿', desc: 'おはなに みずをあげると ふえるかも', kind: 'tool' },
  { id: 'seed_mix',   name: 'はなのタネ',      price: 240,  icon: '🌱', desc: 'まいたところに おはなが さく', kind: 'seed' },
  { id: 'shirt_red',    name: 'あかいTシャツ',   price: 350, icon: '👕', desc: 'じょうねつの あか', kind: 'shirt', color: '#e8554d' },
  { id: 'shirt_blue',   name: 'あおいTシャツ',   price: 350, icon: '👕', desc: 'さわやかな あお', kind: 'shirt', color: '#4d9de8' },
  { id: 'shirt_yellow', name: 'きいろいTシャツ', price: 350, icon: '👕', desc: 'ひまわりの きいろ', kind: 'shirt', color: '#f2b53a' },
  { id: 'shirt_green',  name: 'みどりのTシャツ', price: 350, icon: '👕', desc: 'しまに なじむ みどり', kind: 'shirt', color: '#7bc95e' },
  { id: 'shirt_purple', name: 'むらさきのTシャツ', price: 350, icon: '👕', desc: 'ミステリアスな むらさき', kind: 'shirt', color: '#b06ee8' },
  { id: 'shirt_pink',   name: 'ピンクのTシャツ', price: 350, icon: '👕', desc: 'キュートな ピンク', kind: 'shirt', color: '#f28ab5' },
];

export function fishById(id) { return FISH.find((f) => f.id === id); }
export function bugById(id) { return BUGS.find((b) => b.id === id); }
export function fossilById(id) { return FOSSILS.find((f) => f.id === id); }
export function fruitById(id) { return FRUITS.find((f) => f.id === id); }
export function flowerById(id) { return FLOWERS.find((f) => f.id === id); }
export function treasureById(id) { return TREASURES.find((t) => t.id === id); }

// 時間帯チェック（hours=null は常時）
export function inHours(hours, hour) {
  if (!hours) return true;
  const [a, b] = hours;
  return a <= b ? hour >= a && hour < b : hour >= a || hour < b;
}

// 重みつきランダム（rarity が高いほど出にくい）
export function pickWeighted(list, rng = Math.random) {
  const weights = list.map((it) => 1 / Math.pow(2.4, (it.rarity || 1) - 1));
  const total = weights.reduce((s, w) => s + w, 0);
  let r = rng() * total;
  for (let i = 0; i < list.length; i++) {
    r -= weights[i];
    if (r <= 0) return list[i];
  }
  return list[list.length - 1];
}
