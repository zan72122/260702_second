// クエストと実績
import { ITEM_BY_ID } from '../items/catalog.js';

// progress(game) は [現在値, 目標値] を返す
export const QUESTS = [
  { id: 'q_place1',    icon: '🛋', name: 'はじめてのもようがえ', desc: '家具を1つ置こう',            reward: [120, 0], progress: (g) => [g.data.stats.placed, 1] },
  { id: 'q_place10',   icon: '🛋', name: 'おかたづけじょうず',   desc: '家具をのべ10こ置こう',       reward: [220, 0], progress: (g) => [g.data.stats.placed, 10] },
  { id: 'q_place50',   icon: '🏠', name: 'コーデのたつじん',     desc: '家具をのべ50こ置こう',       reward: [500, 1], progress: (g) => [g.data.stats.placed, 50] },
  { id: 'q_place200',  icon: '🏰', name: 'でんせつのコーディネーター', desc: '家具をのべ200こ置こう', reward: [1500, 3], progress: (g) => [g.data.stats.placed, 200] },
  { id: 'q_restore1',  icon: '✨', name: 'よみがえるお城',       desc: 'お部屋を1つ復興させよう',    reward: [300, 1], progress: (g) => [g.restoredCount(), 1] },
  { id: 'q_restore3',  icon: '✨', name: 'お城にひかりを',       desc: 'お部屋を3つ復興させよう',    reward: [500, 2], progress: (g) => [g.restoredCount(), 3] },
  { id: 'q_restore5',  icon: '🌟', name: 'かがやきのかいだん',   desc: 'お部屋を5つ復興させよう',    reward: [800, 3], progress: (g) => [g.restoredCount(), 5] },
  { id: 'q_restore10', icon: '🌟', name: 'お城のはんぶん',       desc: 'お部屋を10こ復興させよう',   reward: [1200, 5], progress: (g) => [g.restoredCount(), 10] },
  { id: 'q_restore20', icon: '👑', name: 'グランドフィナーレ',   desc: '20部屋ぜんぶ復興させよう',   reward: [3000, 20], progress: (g) => [g.restoredCount(), 20] },
  { id: 'q_own10',     icon: '🎀', name: 'おかいものデビュー',   desc: '10しゅるいのアイテムを集めよう', reward: [200, 0], progress: (g) => [g.distinctOwned(), 10] },
  { id: 'q_own50',     icon: '🛍', name: 'コレクターへの道',     desc: '50しゅるいのアイテムを集めよう', reward: [600, 2], progress: (g) => [g.distinctOwned(), 50] },
  { id: 'q_own120',    icon: '💝', name: 'すてきコレクション',   desc: '120しゅるいのアイテムを集めよう', reward: [1500, 4], progress: (g) => [g.distinctOwned(), 120] },
  { id: 'q_gacha1',    icon: '🎰', name: 'はじめてのガチャ',     desc: 'まほうのガチャを1回まわそう', reward: [150, 1], progress: (g) => [g.data.stats.gachaCount, 1] },
  { id: 'q_gacha10',   icon: '🎰', name: 'ガチャだいすき',       desc: 'まほうのガチャを10回まわそう', reward: [500, 3], progress: (g) => [g.data.stats.gachaCount, 10] },
  { id: 'q_photo1',    icon: '📷', name: 'はじめてのさつえい',   desc: 'ふうけいカメラで1まい撮ろう', reward: [150, 0], progress: (g) => [g.data.stats.photos, 1] },
  { id: 'q_photo10',   icon: '📷', name: 'カメラマンプリンセス', desc: 'ふうけいカメラで10まい撮ろう', reward: [400, 2], progress: (g) => [g.data.stats.photos, 10] },
  { id: 'q_sweet10',   icon: '🍰', name: 'あまいおへや',         desc: 'スイートなアイテムを10こ置こう(置いてある数)', reward: [300, 1], progress: (g) => [g.placedByTheme('sweet', ITEM_BY_ID), 10] },
  { id: 'q_royal10',   icon: '👑', name: 'ロイヤルなきひん',     desc: 'ロイヤルなアイテムを10こ置こう(置いてある数)', reward: [300, 1], progress: (g) => [g.placedByTheme('royal', ITEM_BY_ID), 10] },
  { id: 'q_wall5',     icon: '🎨', name: 'かべがみチェンジ',     desc: 'かべがみ・ゆかを5回はりかえよう', reward: [250, 1], progress: (g) => [g.data.stats.wallpaperChanged, 5] },
  { id: 'q_star3',     icon: '⭐', name: 'パーフェクトコーデ',   desc: 'どこかのお部屋で★3を取ろう', reward: [800, 3], progress: (g) => [Math.max(0, ...Object.values(g.data.rooms).map((r) => r.stars)), 3] },
  { id: 'q_coins5000', icon: '🪙', name: 'ちいさなざいさん',     desc: 'コインをのべ5000かせごう', reward: [500, 2], progress: (g) => [g.data.stats.coinsEarned, 5000] },
  { id: 'q_stars30',   icon: '🌠', name: 'ほしのシャワー',       desc: 'ぜんぶで★30こ集めよう',    reward: [1000, 5], progress: (g) => [g.totalStars(), 30] },
];

export const ACHIEVEMENTS = [
  { id: 'a_first_room',  icon: '🏡', name: 'おかえりプリンセス', desc: 'はじめての復興', check: (g) => g.restoredCount() >= 1 },
  { id: 'a_five_rooms',  icon: '🏘', name: 'にぎわうお城',       desc: '5部屋を復興',     check: (g) => g.restoredCount() >= 5 },
  { id: 'a_ten_rooms',   icon: '🌆', name: 'よみがえる王国',     desc: '10部屋を復興',    check: (g) => g.restoredCount() >= 10 },
  { id: 'a_all_rooms',   icon: '🎆', name: 'マジカルコーディネーター', desc: '20部屋ぜんぶ復興', check: (g) => g.restoredCount() >= 20 },
  { id: 'a_rich',        icon: '💰', name: 'おかねもちプリンセス', desc: 'コイン10000をかせぐ', check: (g) => g.data.stats.coinsEarned >= 10000 },
  { id: 'a_shopper',     icon: '🛍', name: 'おかいものきぶん',   desc: '30回おかいもの',   check: (g) => g.data.stats.bought >= 30 },
  { id: 'a_gacha_sr',    icon: '🌟', name: 'うんめいのSR',       desc: 'ガチャでSRを当てる', check: (g) => !!g.data.flags.gotSR },
  { id: 'a_full_star',   icon: '⭐', name: 'ほしぞらのへや',     desc: '★3のお部屋をつくる', check: (g) => Object.values(g.data.rooms).some((r) => r.stars >= 3) },
  { id: 'a_photo_pro',   icon: '📸', name: 'せんぞくカメラマン', desc: '20まい撮影する',   check: (g) => g.data.stats.photos >= 20 },
  { id: 'a_night_owl',   icon: '🌙', name: 'よふかしプリンセス', desc: 'よるのお部屋を見る', check: (g) => !!g.data.flags.sawNight },
  { id: 'a_dressup',     icon: '👗', name: 'イメチェン',         desc: 'ドレスアップする', check: (g) => !!g.data.flags.dressChanged },
  { id: 'a_place100',    icon: '🏆', name: 'インテリアマイスター', desc: 'のべ100こ設置',  check: (g) => g.data.stats.placed >= 100 },
];

// 新しく達成した実績を返す(state に記録)
export function checkAchievements(g) {
  const news = [];
  for (const a of ACHIEVEMENTS) {
    if (!g.data.achievements.includes(a.id) && a.check(g)) {
      g.data.achievements.push(a.id);
      news.push(a);
    }
  }
  if (news.length) g.emit();
  return news;
}
