// 手の可視化 — 「じぶんの手が世界に入っている」を伝える最重要レイヤー
//
// 物理シミュレーションが使っているのと同一のカプセル配列をそのまま描くので、
// 見えている輪郭 = 当たり判定 が構造的に保証される。
// 3パス描画: にじむ光 → 半透明のからだ → あかるいふち

import { TAU, clamp } from '../engine/utils.js';

// 手ごとのテーマ色 [にじみ, ふち]
const COLORS = [
  ['rgba(255,217,61,A)', 'rgba(255,240,150,A)'],   // 手1: あたたかい黄色
  ['rgba(107,213,255,A)', 'rgba(190,240,255,A)'],  // 手2: つめたい水色
  ['rgba(255,255,255,A)', 'rgba(255,255,255,A)'],  // おばけの手 (アトラクト)
];

function strokeCapsules(g, capsules, widen, style) {
  g.strokeStyle = style;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (const c of capsules) {
    if (c.off) continue;   // 消えている水かきは描かない = 判定と見た目が常に一致
    const lw = c.r * 2 + widen;
    if (lw <= 0.1) continue;
    g.lineWidth = lw;
    g.beginPath();
    g.moveTo(c.ax, c.ay);
    g.lineTo(c.bx, c.by);
    g.stroke();
  }
}

// hands: HandShape[] (active/alpha/capsules を持つ) + タッチカプセル群
export function drawHands(g, hands, ghostPulse = 0) {
  for (const h of hands) {
    if (h.alpha <= 0.01) continue;
    const a = h.alpha;
    const colorIdx = h.ghost ? 2 : (h.id % 2);
    const [glow, rim] = COLORS[colorIdx];
    const pulse = h.ghost ? 0.75 + 0.25 * Math.sin(ghostPulse * 3) : 1;
    // 1: にじむ光 (2重ストロークでソフトグロー — blur フィルターは iOS で重い)
    strokeCapsules(g, h.capsules, 3.5, glow.replace('A', (0.10 * a * pulse).toFixed(3)));
    strokeCapsules(g, h.capsules, 1.6, glow.replace('A', (0.16 * a * pulse).toFixed(3)));
    // 2: 半透明のからだ
    strokeCapsules(g, h.capsules, 0, `rgba(255,255,255,${(0.22 * a * pulse).toFixed(3)})`);
    // 3: あかるいふち (少し細く)
    strokeCapsules(g, h.capsules, -Math.min(1.2, h.capsules[0].r), rim.replace('A', (0.85 * a * pulse).toFixed(3)));
  }
}

// 水と手がふれている場所のキラキラ。カプセル中点の密度をサンプリング。
// 戻り値: 接触量 0..1 (音の強度に使う)
export function contactFeedback(sim, hands, fx, rnd = Math.random) {
  let contact = 0, samples = 0;
  for (const h of hands) {
    if (h.alpha <= 0.05) continue;
    for (let i = 0; i < h.capsules.length; i += 2) {   // 1本おきで十分
      const c = h.capsules[i];
      if (c.off) continue;
      const mx = (c.ax + c.bx) / 2, my = (c.ay + c.by) / 2;
      const d = sim.densityAt(mx, my - c.r - 1.2);     // カプセルの少し上
      samples++;
      if (d > 0.45) {
        contact++;
        if (rnd() < 0.10) {
          fx.addSpark(mx + (rnd() - 0.5) * 3, my - c.r - 1 + (rnd() - 0.5) * 2, '#cfeaff');
        }
      }
    }
  }
  return samples ? clamp(contact / samples * 2, 0, 1) : 0;
}
