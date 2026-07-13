// 全シーンの登録 (日常の液体場面 22連発!)
import shavedice from './shavedice.js';
import pancake from './pancake.js';
import coffee from './coffee.js';
import icedcoffee from './icedcoffee.js';
import dressing from './dressing.js';
import ketchup from './ketchup.js';
import goldfish from './goldfish.js';
import puddle from './puddle.js';
import watering from './watering.js';
import dishes from './dishes.js';
import ramune from './ramune.js';
import bath from './bath.js';
// 実験・観察系 (+10)
import densitytower from './densitytower.js';
import icemelt from './icemelt.js';
import saltegg from './saltegg.js';
import bottlejet from './bottlejet.js';
import siphon from './siphon.js';
import dropper from './dropper.js';
import brushwash from './brushwash.js';
import washer from './washer.js';
import calpis from './calpis.js';
import teabag from './teabag.js';

export const SCENES = [
  shavedice,   // かき氷にシロップ
  pancake,     // ホットケーキにはちみつ
  coffee,      // コーヒーにミルク
  icedcoffee,  // アイスコーヒーとガムシロ
  ramune,      // ラムネをそそぐ
  goldfish,    // 金魚すくい
  puddle,      // 雨あがりの水たまり
  bath,        // おふろタイム
  watering,    // おはなに水やり
  dishes,      // おさら洗い
  ketchup,     // オムライスにケチャップ
  dressing,    // ドレッシングふりふり
  // ここから 実験・観察シリーズ
  densitytower, // 3層の密度タワー
  icemelt,      // 氷とけ対流の観察
  saltegg,      // 塩水たまご浮かし
  bottlejet,    // ペットボトル水圧噴水
  siphon,       // サイフォン水かえ
  dropper,      // スポイト色水ラボ
  brushwash,    // えのぐの筆あらい
  washer,       // せんたく機のうず
  calpis,       // カルピス濃度まぜ
  teabag,       // ティーバッグ抽出
];
