// 合成ランドマーク生成器
// 用途1: アトラクトモード — 誰も遊んでいない時に「おばけの手」が実際の物理で
//        あそびかたを実演する (開く→せき止める→両手でためる)
// 用途2: 自動テスト — ?fakehands=1 で本物のパイプライン
//        (smoothing→mapping→colliders→sim) に決定的な手データを流し込む
//
// 21ランドマークのテンプレート (手首原点、指先が -y 方向、中指つけ根までの長さ=1)

// 開いた手 (指を広げた状態)
const OPEN = [
  [0, 0],
  [-0.38, -0.18], [-0.62, -0.42], [-0.80, -0.62], [-0.95, -0.80],   // 親指
  [-0.32, -0.98], [-0.42, -1.38], [-0.47, -1.62], [-0.52, -1.85],   // 人差し指
  [0.00, -1.00], [0.00, -1.45], [0.00, -1.75], [0.00, -2.00],       // 中指
  [0.28, -0.95], [0.36, -1.35], [0.42, -1.58], [0.47, -1.78],       // 薬指
  [0.55, -0.82], [0.66, -1.10], [0.74, -1.28], [0.82, -1.45],       // 小指
];
// にぎった手 (指を手のひらに折り込んだ状態)
const FIST = [
  [0, 0],
  [-0.32, -0.20], [-0.48, -0.45], [-0.38, -0.68], [-0.22, -0.78],
  [-0.32, -0.98], [-0.36, -1.22], [-0.34, -1.00], [-0.32, -0.75],
  [0.00, -1.00], [0.00, -1.25], [0.00, -1.02], [0.00, -0.75],
  [0.28, -0.95], [0.32, -1.18], [0.31, -0.97], [0.29, -0.72],
  [0.55, -0.82], [0.60, -1.00], [0.59, -0.83], [0.56, -0.62],
];

function lerp(a, b, t) { return a + (b - a) * t; }
function easeInOut(t) { return t * t * (3 - 2 * t); }

// パラメータから正規化ランドマーク(Float32Array(42))を書き出す
//  x,y: 手首の位置 (0..1 正規化映像座標)
//  angle: 回転 (rad, 0=指が上向き)
//  curl: 0=開く 1=にぎる
//  spread: 0=指を閉じる 1=指を広げる
//  size: 手の大きさ (正規化y単位, 手首→中指つけ根)
//  mirror: 左手なら true (xを反転)
export function writePose(out, { x = 0.5, y = 0.5, angle = 0, curl = 0, spread = 1, size = 0.22, mirror = false, aspect = 4 / 3 }) {
  const cs = Math.cos(angle), sn = Math.sin(angle);
  const spreadK = lerp(0.35, 1, spread);
  for (let i = 0; i < 21; i++) {
    let lx = lerp(OPEN[i][0], FIST[i][0], curl);
    let ly = lerp(OPEN[i][1], FIST[i][1], curl);
    if (i >= 1) lx *= spreadK;          // 指を寄せる (親指も手に沿わせる)
    if (mirror) lx = -lx;
    // 回転 + スケール
    const rx = (lx * cs - ly * sn) * size;
    const ry = (lx * sn + ly * cs) * size;
    // x は映像のアスペクト比で補正 (映像px空間で等方になるように)
    out[i * 2] = x + rx / aspect;
    out[i * 2 + 1] = y + ry;
  }
  return out;
}

export class FakeHands {
  constructor(aspect = 4 / 3) {
    this.aspect = aspect;
    this.t = 0;
    this.scripted = true;   // false なら set() での手動制御のみ
    this.hands = [
      { present: false, norm: new Float32Array(42) },
      { present: false, norm: new Float32Array(42) },
    ];
  }

  // テスト用の直接制御。present=false で手を消す。
  set(i, params) {
    const h = this.hands[i];
    if (params.present === false) { h.present = false; return; }
    h.present = true;
    writePose(h.norm, { aspect: this.aspect, ...params });
  }

  reset() { this.t = 0; }

  // アトラクトモードの台本 (約16秒ループ)
  update(dt) {
    if (!this.scripted) return this.hands;
    this.t += dt;
    const t = this.t % 16;
    const h0 = this.hands[0], h1 = this.hands[1];

    if (t < 6) {
      // 幕1: 片手が登場して蛇口の下へ。開いた指のすき間から水が流れる
      const k = easeInOut(Math.min(1, t / 1.5));
      const y = lerp(0.95, 0.55, k);
      // 3〜6秒: 指をとじてダムにする
      const closeK = t < 3 ? 0 : easeInOut(Math.min(1, (t - 3) / 1.2));
      h0.present = true;
      writePose(h0.norm, {
        aspect: this.aspect,
        x: 0.5, y,
        angle: Math.PI / 2,            // 指を横向きに (水を受ける形)
        curl: 0.12 * closeK,
        spread: lerp(1, 0.05, closeK),
        size: 0.24,
      });
      h1.present = false;
    } else if (t < 13) {
      // 幕2: 両手でおわんを作って水をためる
      const k = easeInOut(Math.min(1, (t - 6) / 1.5));
      const cx = 0.5, cy = lerp(0.75, 0.58, k);
      const gap = lerp(0.30, 0.115, k);
      h0.present = true;
      writePose(h0.norm, {
        aspect: this.aspect,
        x: cx - gap, y: cy,
        angle: Math.PI / 2 - 0.55,     // 内側に傾けておわんの左半分
        curl: 0.18, spread: 0.1, size: 0.23,
      });
      h1.present = true;
      writePose(h1.norm, {
        aspect: this.aspect,
        x: cx + gap, y: cy,
        angle: -Math.PI / 2 + 0.55,    // おわんの右半分
        curl: 0.18, spread: 0.1, size: 0.23, mirror: true,
      });
    } else {
      // 幕3: 両手を開いて流す → 退場
      const k = easeInOut(Math.min(1, (t - 13) / 1.2));
      const cy = lerp(0.58, 1.05, k * k);
      const gap = lerp(0.115, 0.3, k);
      h0.present = t < 15;
      h1.present = t < 15;
      writePose(h0.norm, {
        aspect: this.aspect,
        x: 0.5 - gap, y: cy, angle: Math.PI / 2 - 0.55 - k * 0.8,
        curl: 0.1, spread: lerp(0.1, 1, k), size: 0.23,
      });
      writePose(h1.norm, {
        aspect: this.aspect,
        x: 0.5 + gap, y: cy, angle: -Math.PI / 2 + 0.55 + k * 0.8,
        curl: 0.1, spread: lerp(0.1, 1, k), size: 0.23, mirror: true,
      });
    }
    return this.hands;
  }
}
