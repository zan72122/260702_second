// ★ このゲームの心臓部: 手のランドマーク → 物理カプセル群
//
// 21個のランドマークから指の骨1本ごとにカプセルを作る。
// ジェスチャー分類は一切しない。かわりに:
//   手を開く   → 指の間の「水かき」が消えて、すき間から水がすじになって落ちる
//   指を閉じる → 水かきがつながって1枚の壁になる → ダム
//   両手でおわん→ 手のひらカプセルが器になる → 水が溜まる
//   手を動かす → カプセルの速度が粒子に伝わる → 水を押せる
// すべて幾何学から連続的に決まる (しきい値の分類ではなく距離に比例)。
//
// 水かきの物理的な意味 (2.5D近似):
//   実際の3D世界では、開いた指の間は「穴」で、水はその奥へ抜け落ちる。
//   2D投影のこのゲームでは、指が近い時だけ指の間に膜カプセルを置き、
//   離れるほど細く→消えることで同じ因果を再現する。
//
// MediaPipe ランドマーク番号:
//   0=手首 / 親指1-4 / 人差し指5-8 / 中指9-12 / 薬指13-16 / 小指17-20

import { clamp } from '../engine/utils.js';

// 指の骨 (カプセル両端のランドマーク番号)。thumb=true は少し太くする。
const BONES = [
  [1, 2, true], [2, 3, true], [3, 4, true],      // 親指
  [5, 6], [6, 7], [7, 8],                         // 人差し指
  [9, 10], [10, 11], [11, 12],                    // 中指
  [13, 14], [14, 15], [15, 16],                   // 薬指
  [17, 18], [18, 19], [19, 20],                   // 小指
];
// 手のひら本体: 手首から各つけ根へのスポーク + 親指つけ根 (常にソリッド)
const PALM = [
  [0, 5], [0, 9], [0, 13], [0, 17], [0, 1],
];
// 水かき: [カプセル両端a,b, 開き判定の2点pa,pb, 指先ta,tb]
// 指が近い時だけ実体化する膜。判定点は第2関節 (PIP)。
// 親指-人差し指の間は入れない: 親指は骨カプセル同士の近さだけで自然に
// ふさがる/開く (本物の手でダムを作っても親指のわきは少し漏れる)。
const WEBS = [
  [5, 9, 6, 10, 8, 12],      // 人差し指-中指
  [9, 13, 10, 14, 12, 16],   // 中指-薬指
  [13, 17, 14, 18, 16, 20],  // 薬指-小指
];
export const CAPS_PER_HAND = BONES.length + PALM.length + WEBS.length; // 24

// 1つの手のカプセル群を管理 (オブジェクトを使い回して GC を避ける)
export class HandShape {
  constructor(id) {
    this.id = id;               // 0 or 1 (色分け用)
    this.active = false;        // 現在有効か
    this.alpha = 0;             // 表示フェード (0..1)
    this.lostT = 99;            // 見失ってからの時間 (秒)
    this.world = new Float32Array(42);      // ワールド座標のランドマーク
    this.prevWorld = new Float32Array(42);
    this.hasPrev = false;
    this.scale = 10;            // 手の大きさ (手首→中指つけ根)
    this.capsules = [];
    for (let i = 0; i < CAPS_PER_HAND; i++) {
      this.capsules.push({
        kind: 'capsule', ax: 0, ay: 0, bx: 0, by: 0, r: 1, vx: 0, vy: 0,
        hand: id, off: false, web: i >= BONES.length + PALM.length,
      });
    }
    // 排水路: 開いた指のすき間 (=3D世界では手の奥へ抜ける穴)。
    // このゾーン内の水はこの手のカプセルを無視して落ちる。
    // すき間1つにつき2本: 指先→つけ根 (すき間に沿う) と つけ根→真下 (手のひらの裏を抜ける)
    this.drains = [];
    for (let i = 0; i < WEBS.length * 2; i++) {
      this.drains.push({ on: false, ax: 0, ay: 0, bx: 0, by: 0, r: 1, hand: id });
    }
  }

  // world: Float32Array(42) を渡して全カプセルを更新
  updateFromWorld(world, dt) {
    const w = this.world;
    w.set(world);
    // 手の大きさ: 手首(0) → 中指つけ根(9)
    const dx = w[9 * 2] - w[0], dy = w[9 * 2 + 1] - w[1];
    this.scale = Math.max(4, Math.hypot(dx, dy));
    // 指の半径は解剖学的比率(≈0.10)より少し細めにする。
    // 太いと「開いた指のすき間」が粒子の相互作用半径より狭くなり、
    // 開いても水が抜けない (このゲームの核となる体験が壊れる)。
    const fingerR = clamp(this.scale * 0.085, 0.8, 5.0);
    const palmR = clamp(this.scale * 0.22, 2.0, 11.0);

    const invDt = this.hasPrev && dt > 0 ? 1 / dt : 0;
    const pw = this.prevWorld;
    const setCap = (c, a, b, r) => {
      c.ax = w[a * 2]; c.ay = w[a * 2 + 1];
      c.bx = w[b * 2]; c.by = w[b * 2 + 1];
      c.r = r;
      c.off = false;
      if (invDt) {
        c.vx = ((c.ax - pw[a * 2]) + (c.bx - pw[b * 2])) * 0.5 * invDt;
        c.vy = ((c.ay - pw[a * 2 + 1]) + (c.by - pw[b * 2 + 1])) * 0.5 * invDt;
      } else { c.vx = 0; c.vy = 0; }
    };

    let ci = 0;
    for (const [a, b, thumb] of BONES) {
      setCap(this.capsules[ci++], a, b, thumb ? fingerR * 1.3 : fingerR);
    }
    for (const [a, b] of PALM) {
      setCap(this.capsules[ci++], a, b, palmR);
    }
    // 水かき: 判定点 (第2関節) の距離が近いほど太く、離れると消える。
    // 距離は手の大きさに対する比率で見る → 手の遠近に影響されない。
    // 消えたすき間には排水路 (ドレーン) が開く。
    let di = 0;
    for (const [a, b, pa, pb, ta, tb] of WEBS) {
      const c = this.capsules[ci++];
      const d1 = this.drains[di++], d2 = this.drains[di++];
      const sx = w[pa * 2] - w[pb * 2], sy = w[pa * 2 + 1] - w[pb * 2 + 1];
      const sep = Math.hypot(sx, sy);
      const sepRel = sep / this.scale;
      // 閉じた指: sepRel ≈ 0.15-0.24 / 開いた指: ≈ 0.35-0.55
      const k = clamp((0.34 - sepRel) / 0.12, 0, 1);
      if (k < 0.2) {
        // 指が離れている → 膜は消え、すき間は「穴」になる。
        // 排水路の太さは隣の指の骨まで覆う: 3D世界では丸い指1本の上に
        // 水は乗れない (指のわきを回って奥へ落ちる) ので、
        // 開いた指のエリア全体が「雨がすり抜ける場所」になる。
        // 葉っぱやアヒル (水以外) はそのまま指に乗る — 対比が楽しい。
        c.off = true;
        c.r = 0;
        const openK = clamp((sepRel - 0.32) / 0.13, 0, 1);
        const gapR = (sep * 0.5 + fingerR * 1.5) * (0.45 + 0.55 * openK);
        const tipX = (w[ta * 2] + w[tb * 2]) / 2, tipY = (w[ta * 2 + 1] + w[tb * 2 + 1]) / 2;
        const mcpX = (w[a * 2] + w[b * 2]) / 2, mcpY = (w[a * 2 + 1] + w[b * 2 + 1]) / 2;
        d1.on = true;
        d1.ax = tipX; d1.ay = tipY; d1.bx = mcpX; d1.by = mcpY; d1.r = gapR;
        d2.on = true;
        d2.ax = mcpX; d2.ay = mcpY; d2.bx = mcpX; d2.by = mcpY + this.scale * 1.4; d2.r = gapR;
        continue;
      }
      d1.on = false; d2.on = false;
      setCap(c, a, b, fingerR * 1.25 * k);
    }
    pw.set(w);
    this.hasPrev = true;
  }

  // 見失った時: 速度をゼロにして最後の形のまま保持 (0.3秒の猶予)
  freeze() {
    for (const c of this.capsules) { c.vx = 0; c.vy = 0; }
  }

  release() {
    this.active = false;
    this.hasPrev = false;
  }

  // 手のひら中心 (アヒル出現位置などに使う)
  palmCenter() {
    const w = this.world;
    return [
      (w[0] + w[9 * 2] + w[5 * 2] + w[17 * 2]) / 4,
      (w[1] + w[9 * 2 + 1] + w[5 * 2 + 1] + w[17 * 2 + 1]) / 4,
    ];
  }

  // 手全体の平均速さ (スウッシュ音用)
  meanSpeed() {
    let s = 0, n = 0;
    for (const c of this.capsules) {
      if (c.off) continue;
      s += Math.hypot(c.vx, c.vy);
      n++;
    }
    return n ? s / n : 0;
  }
}
