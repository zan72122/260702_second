// 全シーンの登録 (日常の光の場面 24連発!)
import rainbow from './rainbow.js';
import prism from './prism.js';
import straw from './straw.js';
import magnifier from './magnifier.js';
import mirrors from './mirrors.js';
import cd from './cd.js';
import soap from './soap.js';
import sunset from './sunset.js';
import aurora from './aurora.js';
import halo from './halo.js';
import mirage from './mirage.js';
import waterlight from './waterlight.js';
// 空と自然の光シリーズ (+12)
import spoon from './spoon.js';
import pinhole from './pinhole.js';
import arrowflip from './arrowflip.js';
import polarizer from './polarizer.js';
import snellwindow from './snellwindow.js';
import caustics from './caustics.js';
import cateyes from './cateyes.js';
import foglight from './foglight.js';
import twinkle from './twinkle.js';
import iridescent from './iridescent.js';
import brocken from './brocken.js';
import rays from './rays.js';

export const SCENES = [
  rainbow,     // 雨あがりの虹 (分散・42°/51°)
  prism,       // プリズムで分光
  straw,       // コップのストロー (屈折)
  magnifier,   // 虫めがねで集光 (焦点)
  mirrors,     // 鏡で光リレー (反射)
  cd,          // CDの虹色 (回折)
  soap,        // シャボン玉 (薄膜干渉)
  sunset,      // 夕焼け (レイリー散乱)
  aurora,      // オーロラ (発光輝線)
  halo,        // 月のハロ (氷晶22°)
  mirage,      // 逃げ水 (屈折率勾配)
  waterlight,  // 水流ライト (全反射)
  // ここから 空と自然の光シリーズ
  spoon,       // スプーンのさかさま顔 (凹面鏡)
  pinhole,     // 木もれ日とピンホール
  arrowflip,   // コップの水で矢印はんたい (円柱レンズ)
  polarizer,   // 偏光サングラス (ブリュースター角)
  snellwindow, // 水の中から見た空 (臨界角の窓)
  caustics,    // プールのゆらめく光 (コースティクス)
  cateyes,     // 夜道の猫の目 (再帰反射)
  foglight,    // 霧夜のヘッドライト (ミー散乱)
  twinkle,     // 星のまたたき (シンチレーション)
  iridescent,  // 彩雲 (雲つぶの回折)
  brocken,     // ブロッケン現象 (グローリー)
  rays,        // 薄明光線 (チンダル)
];
