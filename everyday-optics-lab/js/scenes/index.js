// 全シーンの登録 (日常の光の場面 12連発!)
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
];
