// 家具カテゴリごとのプロシージャル3Dビルダー(約50種)
// 各 build(m) は THREE.Group を返す。原点=床の中心(壁かけは壁面の中心 / 天井は天井面)
// 向きは +Z が正面。単位: 1グリッド = 0.5
import * as THREE from 'three';
import {
  mesh, box, cyl, sph, cone, torus, lathe,
  heartShape, starShape, extrude, catLeg, catLegs, bow, crown, frillDisc,
} from './parts.js';
import { paintingTexture } from '../world/textures.js';

const G = () => new THREE.Group();
const ALL_PAT = ['plain', 'rose', 'heart', 'stripe', 'dot', 'star', 'lace', 'check'];
const FEW_PAT = ['plain', 'rose', 'heart'];
const PLAIN = ['plain'];

// ヘッドボード(ハート飾り付きの豪華な板)
function headboard(m, w, h) {
  const g = G();
  g.add(box(m.sub, w, h, 0.08, 0, h / 2, 0));
  // 上部のアーチ(半円)
  const top = mesh(new THREE.CylinderGeometry(w / 2, w / 2, 0.08, 20, 1, false, -Math.PI / 2, Math.PI), m.sub, 0, h, 0);
  top.rotation.x = Math.PI / 2;
  top.scale.z = 0.42;
  g.add(top);
  const h1 = extrude(m.main, heartShape(0.18), 0.05, 0, h * 0.88, 0.05);
  g.add(h1);
  // ふちのゴールドライン
  const rim = torus(m.trim, w / 2 - 0.04, 0.022, 0, h, 0, 0);
  rim.scale.y = 0.42;
  g.add(rim);
  for (const s of [-1, 1]) g.add(sph(m.trim, 0.05, s * (w / 2), h, 0));
  return g;
}

function pillow(m, x, y, z) {
  const p = sph(m.cloth, 0.22, x, y, z, 1.35, 0.55, 1);
  return p;
}

// カーテン一枚(裾がひろがる形)
function curtainDrape(m, h = 2.8, r = 0.16) {
  return lathe(m.clothBig, [
    [0.04, h], [r * 0.5, h * 0.85], [r * 0.35, h * 0.5], [r * 0.9, h * 0.12], [r * 1.1, 0],
  ], 0, 0, 0, 12);
}

// 小さな鳥
function littleBird(m, color) {
  const g = G();
  const body = sph(color, 0.06, 0, 0.05, 0, 1, 0.9, 1.2);
  const head = sph(color, 0.042, 0, 0.11, 0.045);
  const beak = cone(m.gold, 0.012, 0.03, 0, 0.11, 0.09);
  beak.rotation.x = Math.PI / 2;
  g.add(body, head, beak);
  return g;
}

// ぬいぐるみの共通ボディ
function plushBase(m, bodyMat, earFn) {
  const g = G();
  g.add(sph(bodyMat, 0.3, 0, 0.32, 0, 1, 1.08, 0.92));       // 胴
  g.add(sph(bodyMat, 0.24, 0, 0.75, 0.02));                   // 頭
  g.add(sph(bodyMat, 0.1, -0.26, 0.38, 0.1, 1, 1.6, 1));      // 腕
  g.add(sph(bodyMat, 0.1, 0.26, 0.38, 0.1, 1, 1.6, 1));
  g.add(sph(bodyMat, 0.12, -0.16, 0.09, 0.16, 1, 0.7, 1.4));  // 足
  g.add(sph(bodyMat, 0.12, 0.16, 0.09, 0.16, 1, 0.7, 1.4));
  const eyeM = new THREE.MeshStandardMaterial({ color: '#3a2430', roughness: 0.3 });
  g.add(sph(eyeM, 0.025, -0.085, 0.79, 0.22));
  g.add(sph(eyeM, 0.025, 0.085, 0.79, 0.22));
  g.add(sph(m.accent, 0.028, 0, 0.73, 0.235, 1, 0.7, 0.8));   // 鼻
  if (earFn) earFn(g);
  return g;
}

// ============================================================
// ビルダー登録
// price: 基本価格 / score: コーデ度 / themes: テーマタグ
// surface: floor | wall | ceiling | rug
// ============================================================
export const BUILDERS = {
  // ---------------- ベッド ----------------
  bedCanopy: {
    name: '天がいベッド', tab: 'ベッド', icon: '🛏', cells: [4, 6], surface: 'floor',
    price: 1200, score: 60, themes: ['elegant', 'royal'], patterns: ALL_PAT,
    build(m) {
      const g = G();
      g.add(box(m.sub, 1.8, 0.3, 2.8, 0, 0.3, 0));                    // フレーム
      g.add(box(m.cloth, 1.7, 0.22, 2.6, 0, 0.5, 0));                 // マットレス
      g.add(box(m.white, 1.7, 0.1, 0.9, 0, 0.58, -0.8));              // シーツ
      g.add(pillow(m, -0.4, 0.66, -1.0), pillow(m, 0.4, 0.66, -1.0));
      const hb = headboard(m, 1.8, 1.1); hb.position.z = -1.4; g.add(hb);
      for (const [x, z] of [[-0.85, -1.35], [0.85, -1.35], [-0.85, 1.35], [0.85, 1.35]]) {
        g.add(cyl(m.trim, 0.035, 0.045, 2.6, x, 1.3, z, 10));         // 柱
        g.add(sph(m.trim, 0.06, x, 2.62, z));
      }
      g.add(box(m.clothBig, 1.95, 0.12, 2.95, 0, 2.68, 0));           // 天がい
      for (const [x, z] of [[-0.9, -1.38], [0.9, -1.38], [-0.9, 1.38], [0.9, 1.38]]) {
        const c = curtainDrape(m, 2.1, 0.14); c.position.set(x, 0.5, z); g.add(c);
      }
      const cr = crown(m.gold, 0.16, 0.18); cr.position.y = 2.75; g.add(cr);
      return g;
    },
  },
  bedPlain: {
    name: 'プリンセスベッド', tab: 'ベッド', icon: '🛌', cells: [4, 5], surface: 'floor',
    price: 640, score: 40, themes: ['elegant'], patterns: ALL_PAT,
    build(m) {
      const g = G();
      g.add(box(m.sub, 1.8, 0.28, 2.4, 0, 0.28, 0));
      g.add(box(m.cloth, 1.7, 0.2, 2.2, 0, 0.46, 0));
      g.add(box(m.white, 1.7, 0.09, 0.8, 0, 0.53, -0.65));
      g.add(pillow(m, -0.4, 0.6, -0.85), pillow(m, 0.4, 0.6, -0.85));
      const hb = headboard(m, 1.8, 0.95); hb.position.z = -1.2; g.add(hb);
      const fb = headboard(m, 1.8, 0.55); fb.position.z = 1.2; fb.rotation.y = Math.PI; g.add(fb);
      const legs = catLegs(m.trim, 1.7, 2.3, 0.22); g.add(legs);
      return g;
    },
  },
  cradle: {
    name: 'ゆりかご', tab: 'ベッド', icon: '👶', cells: [2, 3], surface: 'floor',
    price: 420, score: 26, themes: ['toy', 'sweet'], patterns: ALL_PAT,
    build(m) {
      const g = G();
      const body = lathe(m.sub, [[0.01, 0], [0.42, 0.06], [0.5, 0.42]], 0, 0.18, 0, 18);
      body.scale.z = 1.5; g.add(body);
      const rim = torus(m.trim, 0.49, 0.025, 0, 0.6, 0, Math.PI / 2);
      rim.scale.z = 1.5; g.add(rim);
      const hood = mesh(new THREE.SphereGeometry(0.45, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), m.cloth, 0, 0.6, -0.35);
      hood.rotation.x = -0.5; g.add(hood);
      g.add(sph(m.white, 0.3, 0, 0.52, 0.1, 1.2, 0.25, 1.8));
      const b = bow(m.accent, 0.1); b.position.set(0, 0.95, -0.62); g.add(b);
      for (const s of [-1, 1]) {
        const rocker = torus(m.trim, 0.5, 0.03, s * 0.35, 0.12, 0, 0);
        rocker.rotation.y = Math.PI / 2; rocker.scale.set(1, 0.35, 1); g.add(rocker);
      }
      return g;
    },
  },

  // ---------------- いす・ソファ ----------------
  sofa: {
    name: 'ねこあしソファ', tab: 'いす・ソファ', icon: '🛋', cells: [4, 2], surface: 'floor',
    price: 520, score: 34, themes: ['elegant', 'relax'], patterns: ALL_PAT,
    build(m) {
      const g = G();
      g.add(box(m.cloth, 1.7, 0.24, 0.75, 0, 0.42, 0));                 // 座面
      const back = box(m.cloth, 1.7, 0.62, 0.18, 0, 0.85, -0.33); g.add(back);
      const backTop = cyl(m.cloth, 0.85, 0.85, 0.18, 0, 1.16, -0.33);
      backTop.rotation.x = Math.PI / 2; backTop.scale.set(1, 1, 0.28); g.add(backTop);
      for (let i = 0; i < 4; i++) g.add(sph(m.trim, 0.02, -0.6 + i * 0.4, 0.92, -0.23)); // ボタン
      for (const s of [-1, 1]) {
        g.add(sph(m.cloth, 0.16, s * 0.85, 0.55, 0.05, 1, 1, 2.4));     // ひじかけ
      }
      g.add(catLegs(m.trim, 1.6, 0.7, 0.3));
      g.add(box(m.sub, 1.75, 0.1, 0.8, 0, 0.31, 0));
      return g;
    },
  },
  chair: {
    name: 'おひめさまチェア', tab: 'いす・ソファ', icon: '🪑', cells: [2, 2], surface: 'floor',
    price: 220, score: 18, themes: ['elegant'], patterns: ALL_PAT,
    build(m) {
      const g = G();
      g.add(box(m.cloth, 0.52, 0.1, 0.52, 0, 0.45, 0));
      g.add(box(m.sub, 0.56, 0.06, 0.56, 0, 0.37, 0));
      const back = mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 20), m.cloth, 0, 0.98, -0.25);
      back.rotation.x = Math.PI / 2; g.add(back);
      g.add(torus(m.trim, 0.3, 0.02, 0, 0.98, -0.25, 0));
      g.add(catLegs(m.trim, 0.5, 0.5, 0.4, 0.05));
      const b = bow(m.accent, 0.08); b.position.set(0, 1.28, -0.25); g.add(b);
      return g;
    },
  },
  stool: {
    name: 'まるスツール', tab: 'いす・ソファ', icon: '🍄', cells: [1, 1], surface: 'floor',
    price: 120, score: 10, themes: ['sweet'], patterns: ALL_PAT,
    build(m) {
      const g = G();
      g.add(sph(m.cloth, 0.24, 0, 0.42, 0, 1, 0.55, 1));
      const fr = frillDisc(m.sub, 0.23, 9, 0.05); fr.position.y = 0.33; g.add(fr);
      g.add(cyl(m.trim, 0.05, 0.07, 0.3, 0, 0.16, 0, 10));
      g.add(cyl(m.trim, 0.16, 0.18, 0.04, 0, 0.02, 0, 14));
      return g;
    },
  },
  cushion: {
    name: 'ふわふわクッション', tab: 'いす・ソファ', icon: '🫓', cells: [2, 2], surface: 'floor',
    price: 90, score: 8, themes: ['relax', 'sweet'], patterns: ALL_PAT,
    build(m) {
      const g = G();
      g.add(sph(m.cloth, 0.42, 0, 0.2, 0, 1, 0.5, 1));
      g.add(torus(m.accent, 0.4, 0.035, 0, 0.2, 0, Math.PI / 2));
      g.add(sph(m.trim, 0.05, 0, 0.4, 0));
      return g;
    },
  },
  bench: {
    name: 'ロマンチックベンチ', tab: 'いす・ソファ', icon: '💺', cells: [4, 2], surface: 'floor',
    price: 460, score: 30, themes: ['elegant', 'relax'], patterns: ALL_PAT,
    build(m) {
      const g = G();
      g.add(box(m.cloth, 1.6, 0.2, 0.6, 0, 0.42, 0));
      const hb = extrude(m.sub, heartShape(0.42), 0.06, 0, 0.95, -0.3); g.add(hb);
      for (let i = -1; i <= 1; i++) g.add(sph(m.trim, 0.022, i * 0.3, 0.95, -0.24));
      g.add(catLegs(m.trim, 1.5, 0.55, 0.3));
      for (const s of [-1, 1]) g.add(sph(m.cloth, 0.13, s * 0.8, 0.52, 0, 1, 1, 2));
      return g;
    },
  },
  throne: {
    name: 'クイーンの玉座', tab: 'いす・ソファ', icon: '👑', cells: [2, 2], surface: 'floor',
    price: 1500, score: 70, themes: ['royal'], patterns: FEW_PAT,
    build(m) {
      const g = G();
      g.add(box(m.trim, 0.7, 0.12, 0.66, 0, 0.42, 0));
      g.add(box(m.cloth, 0.6, 0.08, 0.56, 0, 0.52, 0));
      g.add(box(m.trim, 0.7, 1.3, 0.1, 0, 1.1, -0.3));
      g.add(box(m.cloth, 0.56, 1.05, 0.04, 0, 1.05, -0.24));
      const cr = crown(m.gold, 0.12, 0.14); cr.position.set(0, 1.78, -0.3); g.add(cr);
      for (const s of [-1, 1]) {
        g.add(box(m.trim, 0.09, 0.5, 0.6, s * 0.36, 0.62, 0));
        g.add(sph(m.gold, 0.06, s * 0.36, 0.9, 0.25));
      }
      g.add(catLegs(m.gold, 0.65, 0.6, 0.34));
      return g;
    },
  },

  // ---------------- テーブル ----------------
  tableRound: {
    name: 'ティーテーブル', tab: 'テーブル', icon: '🫖', cells: [3, 3], surface: 'floor',
    price: 300, score: 20, themes: ['sweet', 'elegant'], patterns: ALL_PAT,
    build(m) {
      const g = G();
      g.add(cyl(m.cloth, 0.62, 0.62, 0.05, 0, 0.72, 0, 26));
      const fr = frillDisc(m.cloth, 0.62, 14, 0.1); fr.position.y = 0.69; g.add(fr);
      g.add(lathe(m.sub, [[0.06, 0], [0.2, 0.02], [0.07, 0.1], [0.05, 0.5], [0.12, 0.62], [0.3, 0.68]], 0, 0, 0, 16));
      g.add(cyl(m.trim, 0.24, 0.28, 0.04, 0, 0.02, 0, 18));
      return g;
    },
  },
  tableLow: {
    name: 'ねこあしローテーブル', tab: 'テーブル', icon: '🪵', cells: [4, 2], surface: 'floor',
    price: 260, score: 18, themes: ['elegant'], patterns: FEW_PAT,
    build(m) {
      const g = G();
      const top = box(m.sub, 1.5, 0.07, 0.8, 0, 0.42, 0); g.add(top);
      g.add(box(m.trim, 1.54, 0.03, 0.84, 0, 0.46, 0));
      g.add(catLegs(m.sub, 1.4, 0.7, 0.4));
      g.add(box(m.main, 0.5, 0.02, 0.34, 0, 0.48, 0)); // ランナー
      return g;
    },
  },
  desk: {
    name: 'おひめさまデスク', tab: 'テーブル', icon: '✏️', cells: [3, 2], surface: 'floor',
    price: 340, score: 22, themes: ['study', 'elegant'], patterns: FEW_PAT,
    build(m) {
      const g = G();
      g.add(box(m.sub, 1.2, 0.06, 0.6, 0, 0.72, 0));
      g.add(box(m.trim, 1.24, 0.025, 0.64, 0, 0.76, 0));
      g.add(box(m.sub, 1.1, 0.16, 0.5, 0, 0.62, 0));
      g.add(box(m.trim, 0.24, 0.03, 0.02, -0.3, 0.62, 0.26), box(m.trim, 0.24, 0.03, 0.02, 0.3, 0.62, 0.26));
      g.add(catLegs(m.sub, 1.1, 0.5, 0.55));
      const book = box(m.main, 0.22, 0.05, 0.3, -0.35, 0.79, 0); book.rotation.y = 0.3; g.add(book);
      g.add(cyl(m.accent, 0.045, 0.05, 0.12, 0.35, 0.82, -0.1, 10));
      return g;
    },
  },

  // ---------------- しゅうのう ----------------
  chest: {
    name: 'ホワイトチェスト', tab: 'しゅうのう', icon: '🗄', cells: [3, 2], surface: 'floor',
    price: 380, score: 24, themes: ['elegant'], patterns: FEW_PAT,
    build(m) {
      const g = G();
      g.add(box(m.sub, 1.3, 0.75, 0.55, 0, 0.5, 0));
      g.add(box(m.trim, 1.34, 0.04, 0.59, 0, 0.9, 0));
      for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) {
        g.add(box(m.white, 0.55, 0.27, 0.03, -0.31 + c * 0.62, 0.68 - r * 0.33, 0.28));
        const handle = torus(m.gold, 0.05, 0.012, -0.31 + c * 0.62, 0.66 - r * 0.33, 0.31, 0);
        handle.scale.y = 0.6; g.add(handle);
      }
      g.add(catLegs(m.sub, 1.2, 0.5, 0.14));
      const h = extrude(m.main, heartShape(0.08), 0.02, 0, 0.85, 0.29); g.add(h);
      return g;
    },
  },
  wardrobe: {
    name: 'ドリームワードローブ', tab: 'しゅうのう', icon: '🚪', cells: [3, 2], surface: 'floor',
    price: 620, score: 34, themes: ['elegant'], patterns: FEW_PAT,
    build(m) {
      const g = G();
      g.add(box(m.sub, 1.2, 2.0, 0.55, 0, 1.0, 0));
      const top = cyl(m.sub, 0.6, 0.6, 0.55, 0, 2.0, 0, 20);
      top.rotation.x = Math.PI / 2; top.scale.y = 0.4; g.add(top);
      for (const s of [-1, 1]) {
        g.add(box(m.white, 0.52, 1.7, 0.03, s * 0.29, 1.0, 0.28));
        g.add(box(m.cloth, 0.4, 1.0, 0.015, s * 0.29, 1.1, 0.30));
        g.add(sph(m.gold, 0.035, s * 0.08, 1.0, 0.3));
      }
      const cr = crown(m.gold, 0.1, 0.12); cr.position.y = 2.26; g.add(cr);
      g.add(catLegs(m.sub, 1.1, 0.5, 0.12));
      return g;
    },
  },
  bookshelf: {
    name: 'メルヘン本だな', tab: 'しゅうのう', icon: '📚', cells: [3, 1], surface: 'floor',
    price: 350, score: 22, themes: ['study'], patterns: PLAIN,
    build(m) {
      const g = G();
      g.add(box(m.sub, 1.2, 1.5, 0.35, 0, 0.75, 0));
      g.add(box(m.trim, 1.26, 0.05, 0.4, 0, 1.52, 0));
      const bookCols = ['#f06fa8', '#7fc4e8', '#8fdcc0', '#bda0e8', '#f5dd85', '#e56a8f'];
      for (let shelf = 0; shelf < 3; shelf++) {
        g.add(box(m.white, 1.1, 0.03, 0.3, 0, 0.35 + shelf * 0.45, 0.01));
        let x = -0.48;
        for (let b = 0; b < 7; b++) {
          const bh = 0.24 + ((shelf * 7 + b) % 3) * 0.03;
          const mat = new THREE.MeshStandardMaterial({ color: bookCols[(shelf * 7 + b) % 6], roughness: 0.6 });
          g.add(box(mat, 0.09, bh, 0.24, x, 0.37 + shelf * 0.45 + bh / 2, 0.02));
          x += 0.105 + (b % 2) * 0.02;
        }
      }
      return g;
    },
  },
  hatBoxes: {
    name: 'まるいこものいれ', tab: 'しゅうのう', icon: '🎁', cells: [2, 2], surface: 'floor',
    price: 180, score: 12, themes: ['sweet'], patterns: ALL_PAT,
    build(m) {
      const g = G();
      g.add(cyl(m.cloth, 0.34, 0.34, 0.34, 0, 0.17, 0, 22));
      g.add(cyl(m.sub, 0.35, 0.35, 0.07, 0, 0.37, 0, 22));
      g.add(cyl(m.main, 0.24, 0.24, 0.26, 0, 0.53, 0, 20));
      g.add(cyl(m.white, 0.25, 0.25, 0.06, 0, 0.68, 0, 20));
      const b = bow(m.accent, 0.09); b.position.y = 0.74; g.add(b);
      return g;
    },
  },

  // ---------------- あかり ----------------
  lampFloor: {
    name: 'フロアランプ', tab: 'あかり', icon: '🛋', cells: [1, 1], surface: 'floor',
    price: 260, score: 16, themes: ['elegant', 'relax'], patterns: FEW_PAT, glow: true,
    build(m) {
      const g = G();
      g.add(cyl(m.trim, 0.16, 0.2, 0.05, 0, 0.025, 0, 16));
      g.add(cyl(m.trim, 0.025, 0.03, 1.5, 0, 0.78, 0, 10));
      const shade = lathe(m.lampLit, [[0.1, 0.4], [0.24, 0.02], [0.26, 0]], 0, 1.5, 0, 18); g.add(shade);
      const fr = frillDisc(m.cloth, 0.26, 11, 0.05); fr.position.y = 1.5; g.add(fr);
      const b = bow(m.accent, 0.06); b.position.set(0, 1.94, 0.05); g.add(b);
      return g;
    },
  },
  lampTable: {
    name: 'ナイトランプつき台', tab: 'あかり', icon: '💡', cells: [1, 1], surface: 'floor',
    price: 300, score: 18, themes: ['elegant', 'relax'], patterns: FEW_PAT, glow: true,
    build(m) {
      const g = G();
      g.add(cyl(m.sub, 0.26, 0.3, 0.06, 0, 0.62, 0, 18));
      g.add(lathe(m.sub, [[0.08, 0], [0.2, 0.03], [0.06, 0.14], [0.06, 0.5], [0.18, 0.6]], 0, 0, 0, 14));
      g.add(cyl(m.trim, 0.02, 0.02, 0.32, 0, 0.8, 0, 8));
      const shade = lathe(m.lampLit, [[0.08, 0.28], [0.18, 0.015], [0.2, 0]], 0, 0.94, 0, 16); g.add(shade);
      const fr = frillDisc(m.cloth, 0.2, 9, 0.04); fr.position.y = 0.94; g.add(fr);
      return g;
    },
  },
  chandelier: {
    name: 'きらめきシャンデリア', tab: 'あかり', icon: '✨', cells: [2, 2], surface: 'ceiling',
    price: 900, score: 50, themes: ['royal', 'elegant'], patterns: PLAIN, glow: true,
    build(m) {
      const g = G();
      g.add(cyl(m.gold, 0.02, 0.02, 0.5, 0, -0.25, 0, 8));
      g.add(sph(m.gold, 0.07, 0, -0.55, 0));
      g.add(torus(m.gold, 0.42, 0.025, 0, -0.75, 0, Math.PI / 2));
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const x = Math.cos(a) * 0.42, z = Math.sin(a) * 0.42;
        g.add(cyl(m.candle, 0.025, 0.03, 0.16, x, -0.66, z, 8));
        g.add(sph(m.flame, 0.035, x, -0.54, z, 0.8, 1.3, 0.8));
        const crystal = mesh(new THREE.OctahedronGeometry(0.045), m.glass, x, -0.88, z);
        g.add(crystal);
      }
      const heart = extrude(m.main, heartShape(0.1), 0.03, 0, -1.02, 0);
      g.add(heart);
      g.add(lathe(m.gold, [[0.02, 0], [0.14, 0.1], [0.02, 0.22]], 0, -0.78, 0, 12));
      return g;
    },
  },
  candelabra: {
    name: 'ゴールドキャンドル', tab: 'あかり', icon: '🕯', cells: [1, 1], surface: 'floor',
    price: 240, score: 14, themes: ['royal', 'magic'], patterns: PLAIN, glow: true,
    build(m) {
      const g = G();
      g.add(lathe(m.gold, [[0.12, 0], [0.14, 0.02], [0.04, 0.08], [0.025, 0.9], [0.05, 1.0]], 0, 0, 0, 12));
      for (const [dx, h] of [[-0.18, 0.92], [0, 1.05], [0.18, 0.92]]) {
        if (dx !== 0) {
          const arm = torus(m.gold, 0.09, 0.012, dx / 2, 0.88, 0, 0);
          arm.rotation.z = dx < 0 ? 0 : Math.PI; arm.scale.y = 0.7; g.add(arm);
        }
        g.add(cyl(m.candle, 0.022, 0.026, 0.14, dx, h + 0.07, 0, 8));
        g.add(sph(m.flame, 0.03, dx, h + 0.19, 0, 0.8, 1.4, 0.8));
      }
      return g;
    },
  },
  sconce: {
    name: 'かべかざりランプ', tab: 'あかり', icon: '🏮', cells: [1, 1], surface: 'wall', mountY: 2.3,
    price: 210, score: 12, themes: ['elegant'], patterns: FEW_PAT, glow: true,
    build(m) {
      const g = G();
      g.add(box(m.trim, 0.1, 0.3, 0.03, 0, 0, 0.015));
      const arm = torus(m.trim, 0.1, 0.013, 0, -0.05, 0.12, 0);
      arm.rotation.y = Math.PI / 2; g.add(arm);
      const shade = lathe(m.lampLit, [[0.05, 0.16], [0.11, 0.01], [0.12, 0]], 0, 0.05, 0.2, 12); g.add(shade);
      const fr = frillDisc(m.cloth, 0.12, 7, 0.03); fr.position.set(0, 0.05, 0.2); g.add(fr);
      return g;
    },
  },

  // ---------------- かざり ----------------
  vanity: {
    name: 'プリンセスドレッサー', tab: 'かざり', icon: '🪞', cells: [3, 2], surface: 'floor',
    price: 560, score: 34, themes: ['beauty', 'elegant'], patterns: FEW_PAT,
    build(m) {
      const g = G();
      g.add(box(m.sub, 1.1, 0.08, 0.5, 0, 0.66, 0));
      g.add(box(m.sub, 1.0, 0.14, 0.42, 0, 0.56, 0));
      g.add(catLegs(m.sub, 1.0, 0.42, 0.5));
      const mirror = mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.03, 24), m.glass, 0, 1.25, -0.18);
      mirror.rotation.x = Math.PI / 2; mirror.scale.y = 1.25; g.add(mirror);
      const frame = torus(m.trim, 0.33, 0.025, 0, 1.25, -0.19, 0); frame.scale.y = 1.25; g.add(frame);
      const cr = crown(m.gold, 0.07, 0.09); cr.position.set(0, 1.68, -0.19); g.add(cr);
      g.add(cyl(m.accent, 0.03, 0.035, 0.1, -0.35, 0.75, 0.05, 8));   // 香水びん
      g.add(sph(m.glass, 0.045, 0.32, 0.74, 0.05));
      const stool = G();
      stool.add(sph(m.cloth, 0.16, 0, 0.36, 0, 1, 0.5, 1), cyl(m.trim, 0.04, 0.05, 0.28, 0, 0.14, 0, 8));
      stool.position.set(0, 0, 0.45); g.add(stool);
      return g;
    },
  },
  mirror: {
    name: 'スタンドミラー', tab: 'かざり', icon: '🪞', cells: [2, 1], surface: 'floor',
    price: 320, score: 20, themes: ['beauty', 'elegant'], patterns: PLAIN,
    build(m) {
      const g = G();
      const glass = mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.03, 26), m.glass, 0, 1.0, 0);
      glass.rotation.x = Math.PI / 2; glass.scale.y = 1.6; g.add(glass);
      const frame = torus(m.trim, 0.35, 0.03, 0, 1.0, -0.015, 0); frame.scale.y = 1.6; g.add(frame);
      const cr = crown(m.gold, 0.08, 0.1); cr.position.y = 1.6; g.add(cr);
      for (const s of [-1, 1]) {
        const foot = catLeg(m.trim, 0.3, 0.05); foot.position.set(s * 0.2, 0, 0.1); g.add(foot);
        g.add(box(m.trim, 0.04, 0.5, 0.04, s * 0.25, 0.5, 0));
      }
      const b = bow(m.main, 0.09); b.position.set(0, 1.44, 0.04); g.add(b);
      return g;
    },
  },
  birdcage: {
    name: 'ことりのかご', tab: 'かざり', icon: '🐦', cells: [1, 1], surface: 'floor',
    price: 280, score: 18, themes: ['nature', 'elegant'], patterns: PLAIN,
    build(m) {
      const g = G();
      g.add(cyl(m.trim, 0.03, 0.04, 1.1, 0, 0.55, 0, 8));
      g.add(cyl(m.trim, 0.18, 0.22, 0.05, 0, 0.025, 0, 14));
      const cage = G();
      cage.add(cyl(m.trim, 0.24, 0.24, 0.02, 0, 0, 0, 18));
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const bar = torus(m.trim, 0.26, 0.006, 0, 0.26, 0, 0);
        bar.rotation.y = a; cage.add(bar);
      }
      cage.add(sph(m.gold, 0.03, 0, 0.54, 0));
      const bird = littleBird(m, m.main); bird.position.set(0.05, 0.05, 0); cage.add(bird);
      cage.position.y = 1.12; cage.scale.set(1, 0.85, 1);
      g.add(cage);
      return g;
    },
  },
  vase: {
    name: 'バラの花びん', tab: 'かざり', icon: '🌹', cells: [1, 1], surface: 'floor',
    price: 150, score: 10, themes: ['nature', 'elegant'], patterns: FEW_PAT,
    build(m) {
      const g = G();
      g.add(lathe(m.cloth, [[0.09, 0], [0.16, 0.1], [0.1, 0.32], [0.07, 0.42], [0.1, 0.5]], 0, 0, 0, 16));
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const x = Math.cos(a) * 0.08, z = Math.sin(a) * 0.08;
        g.add(cyl(m.greenDark, 0.008, 0.008, 0.3, x * 1.5, 0.6, z * 1.5, 6));
        const rose = sph(m.main, 0.05, x * 2.4, 0.78, z * 2.4);
        g.add(rose, sph(m.accent, 0.028, x * 2.4, 0.81, z * 2.4));
      }
      return g;
    },
  },
  gift: {
    name: 'プレゼントボックス', tab: 'かざり', icon: '🎀', cells: [2, 2], surface: 'floor',
    price: 130, score: 10, themes: ['toy', 'sweet'], patterns: ALL_PAT,
    build(m) {
      const g = G();
      g.add(box(m.cloth, 0.5, 0.42, 0.5, 0, 0.21, 0));
      g.add(box(m.sub, 0.54, 0.1, 0.54, 0, 0.47, 0));
      g.add(box(m.accent, 0.55, 0.53, 0.1, 0, 0.26, 0), box(m.accent, 0.1, 0.53, 0.55, 0, 0.26, 0));
      const b = bow(m.accent, 0.14); b.position.y = 0.58; g.add(b);
      return g;
    },
  },
  balloons: {
    name: 'おいわいバルーン', tab: 'かざり', icon: '🎈', cells: [1, 1], surface: 'floor',
    price: 160, score: 12, themes: ['toy', 'party'], patterns: PLAIN,
    build(m) {
      const g = G();
      g.add(cyl(m.sub, 0.1, 0.14, 0.08, 0, 0.04, 0, 12));
      const cols = [m.main, m.accent, m.trim, m.sub];
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const x = Math.cos(a) * 0.15, z = Math.sin(a) * 0.15, h = 1.3 + (i % 2) * 0.25;
        const string = cyl(m.white, 0.004, 0.004, h, x / 2, h / 2 + 0.08, z / 2, 4);
        string.rotation.z = -x * 0.15; g.add(string);
        g.add(sph(cols[i % 4], 0.14, x, h + 0.15, z, 1, 1.15, 1));
      }
      return g;
    },
  },
  screen: {
    name: 'おきがえついたて', tab: 'かざり', icon: '🚧', cells: [3, 1], surface: 'floor',
    price: 300, score: 18, themes: ['beauty', 'elegant'], patterns: ALL_PAT,
    build(m) {
      const g = G();
      for (let i = -1; i <= 1; i++) {
        const panel = G();
        panel.add(box(m.sub, 0.44, 1.5, 0.04, 0, 0.78, 0));
        panel.add(box(m.cloth, 0.36, 1.3, 0.045, 0, 0.78, 0));
        const arc = cyl(m.sub, 0.22, 0.22, 0.04, 0, 1.53, 0, 14);
        arc.rotation.x = Math.PI / 2; arc.scale.y = 0.6; panel.add(arc);
        panel.position.x = i * 0.45;
        panel.rotation.y = i * 0.5;
        panel.position.z = Math.abs(i) * -0.12;
        g.add(panel);
      }
      return g;
    },
  },
  dollhouse: {
    name: 'ちいさなおうち', tab: 'かざり', icon: '🏠', cells: [2, 2], surface: 'floor',
    price: 340, score: 22, themes: ['toy'], patterns: FEW_PAT,
    build(m) {
      const g = G();
      g.add(box(m.sub, 0.6, 0.55, 0.5, 0, 0.28, 0));
      const roof = mesh(new THREE.ConeGeometry(0.5, 0.4, 4), m.cloth, 0, 0.76, 0);
      roof.rotation.y = Math.PI / 4; g.add(roof);
      g.add(box(m.accent, 0.16, 0.26, 0.02, 0, 0.14, 0.255));
      g.add(box(m.glass, 0.13, 0.13, 0.02, -0.17, 0.34, 0.255), box(m.glass, 0.13, 0.13, 0.02, 0.17, 0.34, 0.255));
      g.add(cyl(m.main, 0.045, 0.045, 0.2, 0.18, 0.9, -0.1, 8));
      return g;
    },
  },

  // ---------------- ぬいぐるみ ----------------
  teddy: {
    name: 'おうかんクマさん', tab: 'ぬいぐるみ', icon: '🧸', cells: [2, 2], surface: 'floor',
    price: 380, score: 26, themes: ['toy', 'sweet'], patterns: FEW_PAT,
    build(m) {
      const g = plushBase(m, m.cloth, (gg) => {
        gg.add(sph(m.cloth, 0.08, -0.16, 0.94, 0), sph(m.cloth, 0.08, 0.16, 0.94, 0));
        gg.add(sph(m.sub, 0.045, -0.16, 0.94, 0.045), sph(m.sub, 0.045, 0.16, 0.94, 0.045));
      });
      g.add(sph(m.sub, 0.1, 0, 0.71, 0.19, 1, 0.8, 0.7));   // マズル
      const cr = crown(m.gold, 0.09, 0.11); cr.position.set(0, 0.94, 0); cr.rotation.z = 0.12; g.add(cr);
      const star = extrude(m.trim, starShape(0.05), 0.02, 0.24, 0.42, 0.2); g.add(star);
      g.scale.setScalar(1.35);
      return g;
    },
  },
  bunny: {
    name: 'うさぎさんぬいぐるみ', tab: 'ぬいぐるみ', icon: '🐰', cells: [2, 2], surface: 'floor',
    price: 320, score: 22, themes: ['toy', 'sweet'], patterns: FEW_PAT,
    build(m) {
      const g = plushBase(m, m.cloth, (gg) => {
        for (const s of [-1, 1]) {
          gg.add(sph(m.cloth, 0.07, s * 0.1, 1.06, 0, 1, 2.6, 0.7));
          gg.add(sph(m.sub, 0.04, s * 0.1, 1.06, 0.03, 1, 2.2, 0.5));
        }
      });
      const b = bow(m.accent, 0.09); b.position.set(0.14, 0.98, 0.08); b.rotation.z = -0.4; g.add(b);
      g.scale.setScalar(1.2);
      return g;
    },
  },
  unicorn: {
    name: 'ユニコーンぬいぐるみ', tab: 'ぬいぐるみ', icon: '🦄', cells: [2, 2], surface: 'floor',
    price: 520, score: 30, themes: ['toy', 'magic'], patterns: FEW_PAT,
    build(m) {
      const g = G();
      g.add(sph(m.white, 0.26, 0, 0.35, 0, 1.3, 1, 1));               // 胴
      g.add(sph(m.white, 0.17, 0, 0.62, 0.22));                       // 頭
      g.add(sph(m.white, 0.06, 0, 0.56, 0.38, 1, 0.8, 1.2));          // 鼻先
      for (const [x, z] of [[-0.16, 0.14], [0.16, 0.14], [-0.16, -0.16], [0.16, -0.16]]) {
        g.add(cyl(m.white, 0.055, 0.06, 0.24, x, 0.12, z, 10));
      }
      const horn = cone(m.gold, 0.035, 0.2, 0, 0.82, 0.26, 8); horn.rotation.x = -0.3; g.add(horn);
      // たてがみ(カラフル)
      const maneCols = ['#ff9ec7', '#bda0e8', '#7fc4e8', '#8fdcc0'];
      for (let i = 0; i < 6; i++) {
        const mat = new THREE.MeshStandardMaterial({ color: maneCols[i % 4], roughness: 0.7 });
        g.add(sph(mat, 0.055, Math.sin(i) * 0.05, 0.72 - i * 0.07, 0.1 - i * 0.05));
      }
      const tail = sph(m.main, 0.08, 0, 0.35, -0.32, 1, 1.6, 1); g.add(tail);
      for (const s of [-1, 1]) g.add(cone(m.white, 0.04, 0.08, s * 0.08, 0.78, 0.16, 8));
      g.scale.setScalar(1.25);
      return g;
    },
  },

  // ---------------- スイーツ ----------------
  teaSet: {
    name: 'ティーセット', tab: 'スイーツ', icon: '🫖', cells: [1, 1], surface: 'floor',
    price: 180, score: 12, themes: ['sweet'], patterns: FEW_PAT,
    build(m) {
      const g = G();
      g.add(cyl(m.white, 0.3, 0.33, 0.03, 0, 0.015, 0, 20));
      const pot = lathe(m.cloth, [[0.02, 0.28], [0.12, 0.22], [0.14, 0.1], [0.1, 0.02], [0.02, 0]], -0.08, 0.03, 0, 16);
      g.add(pot);
      g.add(sph(m.accent, 0.03, -0.08, 0.33, 0));
      const spout = torus(m.sub, 0.08, 0.02, 0.08, 0.2, 0, 0); spout.rotation.z = -0.6; g.add(spout);
      for (const [x, z] of [[0.16, 0.1], [0.16, -0.12]]) {
        g.add(cyl(m.cloth, 0.05, 0.035, 0.07, x, 0.07, z, 12));
        g.add(cyl(m.white, 0.08, 0.08, 0.012, x, 0.035, z, 14));
      }
      return g;
    },
  },
  cakeStand: {
    name: 'スイーツタワー', tab: 'スイーツ', icon: '🧁', cells: [1, 1], surface: 'floor',
    price: 320, score: 20, themes: ['sweet', 'party'], patterns: FEW_PAT,
    build(m) {
      const g = G();
      g.add(cyl(m.trim, 0.02, 0.02, 0.85, 0, 0.45, 0, 8));
      const sweets = [m.main, m.accent, m.sub];
      [0.32, 0.24, 0.16].forEach((r, i) => {
        const y = 0.12 + i * 0.28;
        g.add(cyl(m.white, r, r, 0.025, 0, y, 0, 20));
        for (let k = 0; k < 5 - i; k++) {
          const a = (k / (5 - i)) * Math.PI * 2;
          const cup = G();
          cup.add(cyl(sweets[k % 3], 0.035, 0.025, 0.05, 0, 0.025, 0, 10));
          cup.add(sph(m.cream, 0.03, 0, 0.06, 0));
          cup.add(sph(m.accent, 0.012, 0, 0.085, 0));
          cup.position.set(Math.cos(a) * r * 0.65, y + 0.013, Math.sin(a) * r * 0.65);
          g.add(cup);
        }
      });
      g.add(sph(m.gold, 0.035, 0, 0.98, 0));
      return g;
    },
  },
  cake: {
    name: 'ドリームケーキ', tab: 'スイーツ', icon: '🎂', cells: [2, 2], surface: 'floor',
    price: 420, score: 26, themes: ['sweet', 'party'], patterns: FEW_PAT,
    build(m) {
      const g = G();
      g.add(cyl(m.white, 0.5, 0.53, 0.06, 0, 0.03, 0, 24));
      const tiers = [[0.42, 0.3], [0.3, 0.26], [0.19, 0.22]];
      let y = 0.06;
      tiers.forEach(([r, h], i) => {
        g.add(cyl(i % 2 ? m.cloth : m.cream, r, r, h, 0, y + h / 2, 0, 24));
        const fr = frillDisc(m.main, r, 10 + i * 2, 0.05); fr.position.y = y + h; g.add(fr);
        for (let k = 0; k < 8 - i * 2; k++) {
          const a = (k / (8 - i * 2)) * Math.PI * 2;
          g.add(sph(m.accent, 0.03, Math.cos(a) * r * 0.85, y + h + 0.015, Math.sin(a) * r * 0.85));
        }
        y += h;
      });
      const hh = extrude(m.accent, heartShape(0.1), 0.03, 0, y + 0.14, 0); g.add(hh);
      return g;
    },
  },
  pancake: {
    name: 'ふわふわパンケーキ', tab: 'スイーツ', icon: '🥞', cells: [2, 2], surface: 'floor',
    price: 280, score: 18, themes: ['sweet'], patterns: PLAIN,
    build(m) {
      const g = G();
      // テーブルつき(参考画像2の巨大パンケーキテーブル)
      g.add(cyl(m.sub, 0.06, 0.09, 0.5, 0, 0.25, 0, 10));
      g.add(cyl(m.trim, 0.2, 0.24, 0.04, 0, 0.02, 0, 16));
      const pk = new THREE.MeshStandardMaterial({ color: '#f2c063', roughness: 0.7 });
      const pkD = new THREE.MeshStandardMaterial({ color: '#d89a3e', roughness: 0.7 });
      for (let i = 0; i < 4; i++) {
        g.add(cyl(i % 2 ? pk : pkD, 0.4 - i * 0.012, 0.42 - i * 0.012, 0.09, 0, 0.55 + i * 0.09, 0, 22));
      }
      const syrup = cyl(new THREE.MeshStandardMaterial({ color: '#c97a2a', roughness: 0.25 }), 0.34, 0.36, 0.03, 0, 0.93, 0, 20);
      g.add(syrup);
      g.add(box(new THREE.MeshStandardMaterial({ color: '#fff2c8' }), 0.12, 0.05, 0.12, 0, 0.97, 0)); // バター
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        g.add(sph(m.accent, 0.035, Math.cos(a) * 0.3, 0.96, Math.sin(a) * 0.3));
      }
      g.add(sph(m.cream, 0.06, 0.18, 1.0, -0.15));
      return g;
    },
  },

  // ---------------- かべ ----------------
  painting: {
    name: 'おしゃれな絵画', tab: 'かべ', icon: '🖼', cells: [3, 2], surface: 'wall', mountY: 2.2,
    price: 350, score: 22, themes: ['elegant', 'art'], patterns: FEW_PAT,
    build(m) {
      const g = G();
      g.add(box(m.trim, 1.3, 1.05, 0.06, 0, 0, 0.03));
      g.add(box(m.white, 1.16, 0.92, 0.03, 0, 0, 0.06));
      const variant = { plain: 0, rose: 2, heart: 1 }[m.patId] ?? 0;
      const art = new THREE.MeshStandardMaterial({ map: paintingTexture(variant, m.palId), roughness: 0.9 });
      g.add(box(art, 1.06, 0.82, 0.02, 0, 0, 0.075));
      const b = bow(m.main, 0.1); b.position.set(0, 0.6, 0.05); g.add(b);
      return g;
    },
  },
  wallShelf: {
    name: 'かべかざりだな', tab: 'かべ', icon: '🗃', cells: [2, 1], surface: 'wall', mountY: 1.9,
    price: 220, score: 14, themes: ['elegant'], patterns: FEW_PAT,
    build(m) {
      const g = G();
      g.add(box(m.sub, 0.9, 0.05, 0.24, 0, 0, 0.12));
      for (const s of [-1, 1]) {
        const br = catLeg(m.trim, 0.2, 0.04);
        br.position.set(s * 0.35, -0.22, 0.16); g.add(br);
      }
      g.add(cyl(m.cloth, 0.06, 0.045, 0.1, -0.28, 0.08, 0.12, 10));    // ちいさなカップ
      const mini = sph(m.main, 0.07, 0.05, 0.08, 0.12); g.add(mini);   // まるい小物
      const b = bow(m.accent, 0.05); b.position.set(0.32, 0.06, 0.12); g.add(b);
      return g;
    },
  },
  wallClock: {
    name: 'おとぎのかべどけい', tab: 'かべ', icon: '🕰', cells: [2, 2], surface: 'wall', mountY: 2.6,
    price: 300, score: 18, themes: ['elegant', 'magic'], patterns: PLAIN,
    build(m) {
      const g = G();
      const face = mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 24), m.white, 0, 0, 0.03);
      face.rotation.x = Math.PI / 2; g.add(face);
      g.add(torus(m.trim, 0.31, 0.03, 0, 0, 0.05, 0));
      const hand1 = box(m.accent, 0.02, 0.2, 0.01, 0, 0.09, 0.062); hand1.rotation.z = 0.6; g.add(hand1);
      const hand2 = box(m.accent, 0.02, 0.14, 0.01, 0.05, 0.03, 0.062); hand2.rotation.z = -1.2; g.add(hand2);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        g.add(sph(m.trim, 0.014, Math.cos(a) * 0.25, Math.sin(a) * 0.25, 0.06));
      }
      const cr = crown(m.gold, 0.07, 0.08); cr.position.set(0, 0.4, 0.02); g.add(cr);
      const b = bow(m.main, 0.08); b.position.set(0, -0.36, 0.03); g.add(b);
      return g;
    },
  },
  curtain: {
    name: 'ロマンチックカーテン', tab: 'かべ', icon: '🪟', cells: [3, 1], surface: 'wall', mountY: 1.55,
    price: 380, score: 24, themes: ['elegant'], patterns: ALL_PAT,
    build(m) {
      const g = G();
      g.add(cyl(m.trim, 0.025, 0.025, 1.5, 0, 1.55, 0.08).rotateZ(Math.PI / 2));
      for (const s of [-1, 1]) {
        g.add(sph(m.gold, 0.05, s * 0.75, 1.55, 0.08));
        const drape = curtainDrape(m, 2.9, 0.2);
        drape.position.set(s * 0.62, -1.45, 0.1); g.add(drape);
        const tie = bow(m.accent, 0.09); tie.position.set(s * 0.6, -0.1, 0.26); g.add(tie);
      }
      // バランス(上飾り)
      for (let i = -2; i <= 2; i++) {
        g.add(sph(m.clothBig, 0.17, i * 0.3, 1.42, 0.1, 1, 0.75, 0.5));
      }
      return g;
    },
  },

  // ---------------- ラグ ----------------
  rugRound: {
    name: 'まんまるラグ', tab: 'ラグ', icon: '⭕', cells: [5, 5], surface: 'rug',
    price: 200, score: 14, themes: ['relax'], patterns: ALL_PAT,
    build(m) {
      const g = G();
      g.add(cyl(m.clothBig, 1.2, 1.2, 0.03, 0, 0.015, 0, 36));
      g.add(torus(m.accent, 1.18, 0.02, 0, 0.03, 0, Math.PI / 2));
      return g;
    },
  },
  rugRect: {
    name: 'エレガントカーペット', tab: 'ラグ', icon: '▭', cells: [6, 4], surface: 'rug',
    price: 240, score: 16, themes: ['elegant', 'relax'], patterns: ALL_PAT,
    build(m) {
      const g = G();
      g.add(box(m.clothBig, 2.9, 0.03, 1.9, 0, 0.015, 0));
      g.add(box(m.accent, 3.0, 0.02, 2.0, 0, 0.01, 0));
      return g;
    },
  },
  rugHeart: {
    name: 'ハートのラグ', tab: 'ラグ', icon: '💗', cells: [5, 5], surface: 'rug',
    price: 260, score: 18, themes: ['sweet', 'relax'], patterns: ALL_PAT,
    build(m) {
      const g = G();
      const heart = extrude(m.clothBig, heartShape(1.15), 0.025, 0, 0.03, 0);
      heart.rotation.x = -Math.PI / 2; g.add(heart);
      return g;
    },
  },

  // ---------------- しぜん ----------------
  plant: {
    name: 'エレガント観葉植物', tab: 'しぜん', icon: '🪴', cells: [1, 1], surface: 'floor',
    price: 170, score: 12, themes: ['nature'], patterns: FEW_PAT,
    build(m) {
      const g = G();
      g.add(lathe(m.cloth, [[0.12, 0], [0.18, 0.05], [0.14, 0.3], [0.17, 0.34]], 0, 0, 0, 14));
      g.add(cyl(m.soil, 0.13, 0.13, 0.03, 0, 0.33, 0, 12));
      g.add(cyl(m.greenDark, 0.02, 0.03, 0.5, 0, 0.58, 0, 8));
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const leaf = sph(m.green, 0.16, Math.cos(a) * 0.2, 0.85 + (i % 2) * 0.1, Math.sin(a) * 0.2, 1, 0.45, 0.55);
        leaf.lookAt(0, 1.4, 0); g.add(leaf);
      }
      g.add(sph(m.green, 0.14, 0, 0.98, 0));
      return g;
    },
  },
  flowerPot: {
    name: 'おはなのプランター', tab: 'しぜん', icon: '🌷', cells: [2, 1], surface: 'floor',
    price: 140, score: 10, themes: ['nature', 'sweet'], patterns: FEW_PAT,
    build(m) {
      const g = G();
      g.add(box(m.cloth, 0.8, 0.26, 0.3, 0, 0.15, 0));
      g.add(box(m.soil, 0.74, 0.03, 0.24, 0, 0.29, 0));
      const cols = [m.main, m.accent, m.white];
      for (let i = 0; i < 5; i++) {
        const x = -0.3 + i * 0.15;
        g.add(cyl(m.greenDark, 0.008, 0.008, 0.22, x, 0.4, 0, 6));
        const f = G();
        for (let p = 0; p < 5; p++) {
          const a = (p / 5) * Math.PI * 2;
          f.add(sph(cols[i % 3], 0.035, Math.cos(a) * 0.04, 0, Math.sin(a) * 0.04, 1, 0.6, 1));
        }
        f.add(sph(m.trim, 0.025, 0, 0.01, 0));
        f.position.set(x, 0.52, 0); f.rotation.x = -0.5;
        g.add(f);
      }
      return g;
    },
  },
  fountain: {
    name: 'ゆめのふんすい', tab: 'しぜん', icon: '⛲', cells: [4, 4], surface: 'floor',
    price: 1100, score: 56, themes: ['nature', 'royal'], patterns: PLAIN,
    build(m) {
      const g = G();
      g.add(lathe(m.white, [[0.9, 0], [0.95, 0.12], [0.85, 0.3], [0.9, 0.34]], 0, 0, 0, 26));
      g.add(cyl(m.water, 0.84, 0.84, 0.06, 0, 0.3, 0, 26));
      g.add(lathe(m.white, [[0.12, 0], [0.08, 0.5], [0.45, 0.62], [0.4, 0.7]], 0, 0.3, 0, 18));
      g.add(cyl(m.water, 0.4, 0.4, 0.04, 0, 0.96, 0, 18));
      g.add(lathe(m.white, [[0.06, 0], [0.05, 0.3], [0.2, 0.4]], 0, 0.98, 0, 14));
      const jet = cone(m.water, 0.06, 0.35, 0, 1.55, 0, 10); g.add(jet);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const arc = torus(m.water, 0.28, 0.02, Math.cos(a) * 0.32, 1.35, Math.sin(a) * 0.32, 0);
        arc.rotation.y = -a + Math.PI / 2; arc.rotation.z = 0.4; g.add(arc);
      }
      const swan = G();
      swan.add(sph(m.white, 0.09, 0, 0.05, 0, 1.3, 1, 1));
      const neck = torus(m.white, 0.09, 0.025, 0, 0.14, 0.08, 0); neck.rotation.y = Math.PI / 2; swan.add(neck);
      swan.add(sph(m.white, 0.04, 0, 0.24, 0.02), cone(m.gold, 0.015, 0.05, 0, 0.24, 0.07, 6));
      swan.position.set(0.5, 0.32, 0.3); g.add(swan);
      return g;
    },
  },

  // ---------------- とくべつ ----------------
  piano: {
    name: 'プリンセスピアノ', tab: 'とくべつ', icon: '🎹', cells: [4, 4], surface: 'floor',
    price: 1600, score: 74, themes: ['music', 'elegant'], patterns: FEW_PAT,
    build(m) {
      const g = G();
      const body = G();
      const half = mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.3, 24, 1, false, 0, Math.PI), m.cloth, 0, 0, 0);
      body.add(half);
      body.add(box(m.cloth, 1.5, 0.3, 0.68, 0, 0, 0.34));
      body.position.set(0, 0.75, -0.1); g.add(body);
      g.add(box(m.white, 1.3, 0.06, 0.18, 0, 0.68, 0.76));            // 鍵盤
      for (let i = 0; i < 9; i++) g.add(box(m.accent, 0.05, 0.03, 0.09, -0.55 + i * 0.14, 0.72, 0.72));
      const lid = mesh(new THREE.CylinderGeometry(0.73, 0.73, 0.03, 24, 1, false, 0, Math.PI), m.main, 0, 1.15, -0.12);
      lid.rotation.z = -0.5; lid.position.x = -0.25; g.add(lid);
      g.add(box(m.trim, 0.03, 0.55, 0.03, 0.4, 1.1, -0.3));
      for (const [x, z] of [[-0.6, 0.6], [0.6, 0.6], [0, -0.6]]) {
        const leg = catLeg(m.trim, 0.6, 0.07); leg.position.set(x, 0, z); g.add(leg);
      }
      const st = G();
      st.add(box(m.cloth, 0.44, 0.08, 0.3, 0, 0.36, 0), catLegs(m.trim, 0.4, 0.28, 0.32, 0.04));
      st.position.set(0, 0, 1.15); g.add(st);
      return g;
    },
  },
  harp: {
    name: 'てんしのハープ', tab: 'とくべつ', icon: '🎻', cells: [2, 2], surface: 'floor',
    price: 980, score: 52, themes: ['music', 'royal'], patterns: PLAIN,
    build(m) {
      const g = G();
      const frame = torus(m.gold, 0.55, 0.045, 0, 0.85, 0, 0);
      frame.scale.set(0.75, 1, 1); g.add(frame);
      g.add(lathe(m.gold, [[0.14, 0], [0.16, 0.05], [0.05, 0.14]], 0, 0, 0, 14));
      const strM = new THREE.MeshStandardMaterial({ color: '#fdfaf7', roughness: 0.4 });
      for (let i = 0; i < 8; i++) {
        const x = -0.28 + i * 0.08;
        const h = 0.9 * Math.sqrt(Math.max(0.05, 1 - (x / 0.42) ** 2));
        g.add(cyl(strM, 0.005, 0.005, h, x, 0.85, 0, 4));
      }
      const cr = crown(m.gold, 0.06, 0.08); cr.position.set(0, 1.45, 0); g.add(cr);
      return g;
    },
  },
  fireplace: {
    name: 'ロマンスだんろ', tab: 'とくべつ', icon: '🔥', cells: [4, 2], surface: 'floor',
    price: 850, score: 46, themes: ['relax', 'royal'], patterns: FEW_PAT, glow: true,
    build(m) {
      const g = G();
      g.add(box(m.sub, 1.6, 1.2, 0.5, 0, 0.6, 0));
      g.add(box(m.trim, 1.7, 0.08, 0.6, 0, 1.24, 0));
      const hole = box(new THREE.MeshStandardMaterial({ color: '#332028' }), 0.9, 0.7, 0.4, 0, 0.4, 0.08);
      g.add(hole);
      const fire = sph(m.flame, 0.2, 0, 0.25, 0.15, 1.4, 1.2, 0.8); g.add(fire);
      g.add(sph(m.flame, 0.12, -0.2, 0.2, 0.18), sph(m.flame, 0.1, 0.22, 0.18, 0.18));
      const logM = new THREE.MeshStandardMaterial({ color: '#6a4632', roughness: 0.9 });
      const log1 = cyl(logM, 0.06, 0.06, 0.7, 0, 0.1, 0.2); log1.rotation.z = Math.PI / 2; g.add(log1);
      for (const s of [-1, 1]) g.add(cyl(m.trim, 0.05, 0.06, 1.2, s * 0.72, 0.6, 0.26, 10));
      const h = extrude(m.main, heartShape(0.12), 0.04, 0, 0.95, 0.26); g.add(h);
      return g;
    },
  },
  bathtub: {
    name: 'ねこあしバスタブ', tab: 'とくべつ', icon: '🛁', cells: [4, 2], surface: 'floor',
    price: 780, score: 42, themes: ['beauty', 'relax'], patterns: FEW_PAT,
    build(m) {
      const g = G();
      const tub = lathe(m.cloth, [[0.35, 0.05], [0.5, 0.15], [0.55, 0.55], [0.6, 0.6], [0.55, 0.58]], 0, 0, 0, 22);
      tub.scale.set(1.5, 1, 1); g.add(tub);
      const water = cyl(m.water, 0.52, 0.52, 0.03, 0, 0.52, 0, 22); water.scale.x = 1.45; g.add(water);
      for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
        const leg = catLeg(m.gold, 0.16, 0.05); leg.position.set(sx * 0.6, -0.04, sz * 0.32); g.add(leg);
      }
      for (let i = 0; i < 5; i++) {
        g.add(sph(m.white, 0.05 + (i % 3) * 0.02, -0.4 + i * 0.2, 0.56, (i % 2) * 0.2 - 0.1));
      }
      const duck = G();
      duck.add(sph(m.lampLit, 0.06, 0, 0, 0, 1.2, 1, 1), sph(m.lampLit, 0.04, 0, 0.06, 0.05), cone(m.accent, 0.015, 0.03, 0, 0.06, 0.09, 6));
      duck.position.set(0.3, 0.56, 0.1); g.add(duck);
      return g;
    },
  },
  carousel: {
    name: 'ミニメリーゴーラウンド', tab: 'とくべつ', icon: '🎠', cells: [4, 4], surface: 'floor',
    price: 2000, score: 90, themes: ['toy', 'magic'], patterns: FEW_PAT, glow: true, animated: 'spin',
    build(m) {
      const g = G();
      g.add(cyl(m.trim, 0.9, 1.0, 0.12, 0, 0.06, 0, 26));
      const spinner = G(); spinner.name = 'spin';
      spinner.add(cyl(m.cloth, 0.85, 0.85, 0.06, 0, 0.15, 0, 26));
      spinner.add(cyl(m.gold, 0.05, 0.06, 1.5, 0, 0.9, 0, 10));
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        const x = Math.cos(a) * 0.55, z = Math.sin(a) * 0.55;
        spinner.add(cyl(m.gold, 0.018, 0.018, 1.3, x, 0.85, z, 6));
        const horse = G();
        horse.add(sph(m.white, 0.11, 0, 0, 0, 1.5, 1, 0.8));
        horse.add(sph(m.white, 0.07, 0.13, 0.1, 0), cone(m.gold, 0.02, 0.09, 0.16, 0.2, 0, 6));
        for (const [lx, lz] of [[-0.08, 0.04], [0.08, 0.04], [-0.08, -0.04], [0.08, -0.04]]) {
          horse.add(cyl(m.white, 0.02, 0.02, 0.14, lx, -0.14, lz, 6));
        }
        horse.add(box(m.main, 0.1, 0.03, 0.12, 0, 0.1, 0));
        horse.position.set(x, 0.55 + (i % 2) * 0.12, z);
        horse.rotation.y = -a + Math.PI;
        spinner.add(horse);
      }
      g.add(spinner);
      const roof = cone(m.cloth, 1.0, 0.55, 0, 1.85, 0, 22); g.add(roof);
      const fr = frillDisc(m.main, 0.98, 16, 0.1); fr.position.y = 1.6; g.add(fr);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        g.add(sph(m.flame, 0.025, Math.cos(a) * 0.9, 1.62, Math.sin(a) * 0.9));
      }
      g.add(sph(m.gold, 0.07, 0, 2.16, 0));
      return g;
    },
  },
  swing: {
    name: 'おひめさまブランコ', tab: 'とくべつ', icon: '🌸', cells: [3, 2], surface: 'floor',
    price: 720, score: 40, themes: ['toy', 'nature'], patterns: ALL_PAT,
    build(m) {
      const g = G();
      for (const s of [-1, 1]) {
        g.add(cyl(m.trim, 0.03, 0.04, 2.0, s * 0.7, 1.0, 0, 10));
        g.add(sph(m.gold, 0.05, s * 0.7, 2.02, 0));
      }
      const beam = cyl(m.trim, 0.03, 0.03, 1.5, 0, 2.0, 0); beam.rotation.z = Math.PI / 2; g.add(beam);
      for (const s of [-1, 1]) g.add(cyl(m.white, 0.008, 0.008, 1.1, s * 0.28, 1.4, 0, 4));
      g.add(box(m.cloth, 0.7, 0.05, 0.35, 0, 0.85, 0));
      const fr = frillDisc(m.cloth, 0.3, 9, 0.06); fr.position.y = 0.84; fr.scale.x = 1.4; g.add(fr);
      for (const s of [-1, 1]) {
        const rose = G();
        rose.add(sph(m.main, 0.05, 0, 0, 0), sph(m.green, 0.03, 0.04, -0.04, 0));
        rose.position.set(s * 0.7, 1.7, 0.03); g.add(rose);
      }
      const b = bow(m.accent, 0.1); b.position.set(0, 2.1, 0); g.add(b);
      return g;
    },
  },
};

export const TABS = [...new Set(Object.values(BUILDERS).map((b) => b.tab))];
