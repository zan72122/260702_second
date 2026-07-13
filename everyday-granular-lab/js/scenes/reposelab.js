// シーン: 安息角くらべ (砂・米・ビーズで山の角度がちがう!)
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad, woodTable, softShadow } from '../engine/art.js';
import { SPRITES } from '../engine/grainRenderer.js';

const COLUMNS = [
  { label: 'すな', mat: 0, expect: '30°くらい' },
  { label: 'おこめ', mat: 1, expect: '25°くらい' },
  { label: 'ビーズ', mat: 2, expect: '10°くらい' },
];

export default {
  id: 'reposelab',
  name: '安息角くらべ実験',
  emoji: '📐',
  desc: '粒によって 山のかたむきが ちがう!',
  goal: '🎯 3しゅるいの山をつくって 角度をくらべよう!',
  clearMsg: '角度のちがい、はっきり見えた!',
  maxParticles: 6000,
  tilt: false,
  rattlePitch: 1.0,

  init(ctx) {
    const d = ctx.data;
    d.pouring = false;
    d.accs = [0, 0, 0];
    d.angles = [0, 0, 0];
    ctx.sim.defineMaterial(0, { // 砂 (安息角 大)
      r: 0.6, rJit: 0.07, mu: 1.0, interlock: 4, vmax: 45,
      sprite: SPRITES.SAND,
      colors: [[0.93, 0.8, 0.55], [0.87, 0.73, 0.47]],
    });
    ctx.sim.defineMaterial(1, { // 米 (中)
      r: 0.78, rJit: 0.07, mu: 0.5, interlock: 0.8, sleepK: 0.7, vmax: 75,
      sprite: SPRITES.RICE, stretch: 1.9,
      colors: [[1, 1, 1], [0.97, 0.96, 0.9]],
    });
    ctx.sim.defineMaterial(2, { // ビーズ (小)
      r: 1.0, rJit: 0.06, mu: 0.08, interlock: 0.15, bounce: 0.35, sleepK: 0.35, rollRes: 1, vmax: 110,
      sprite: SPRITES.BALL,
      colors: [[1, 0.55, 0.65], [0.55, 0.75, 1], [1, 0.85, 0.45]],
    });
    ctx.setTools([{ id: 'pour', icon: '🫗', label: 'いっせいに そそぐ/とめる' }]);
    ctx.setHint('3つの筒から同時にそそいで 山のかたちを観察しよう');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.floorY = H - Math.min(H * 0.1, 16);
    d.colW = W / 3;
    // 3レーンの仕切り壁
    const s = ctx.sim;
    for (const k of [1, 2]) {
      s.colliders.push({
        kind: 'capsule',
        ax: d.colW * k, ay: Math.max(H * 0.3, 40),
        bx: d.colW * k, by: d.floorY,
        r: 1.2, mu: 0.4,
      });
    }
    s.colliders.push({ kind: 'capsule', ax: 0, ay: d.floorY, bx: W, by: d.floorY, r: 1.5, mu: 0.8 });
    d.spoutY = Math.max(H * 0.24, 34);
  },

  update(ctx, dt) {
    const d = ctx.data, s = ctx.sim;
    // 同時注ぎ
    if (d.pouring && s.n < s.max - 10) {
      for (let k = 0; k < 3; k++) {
        d.accs[k] += (k === 2 ? 55 : 110) * dt;
        while (d.accs[k] >= 1) {
          d.accs[k] -= 1;
          const cx = d.colW * (k + 0.5);
          ctx.pour(cx + rand(-1.5, 1.5), d.spoutY, 0, 25, COLUMNS[k].mat);
        }
      }
      ctx.sfx.setPour(0.5, 1.1);
    } else ctx.sfx.setPour(0);

    // 角度の実測 (topAt プロファイルからピーク斜面をフィット)
    d.measT = (d.measT || 0) + dt;
    if (d.measT > 0.5) {
      d.measT = 0;
      d.counts = [];
      for (let k = 0; k < 3; k++) {
        const x0 = d.colW * k + 6, x1 = d.colW * (k + 1) - 6;
        const H2 = [];
        for (let x = x0; x <= x1; x += 2.5) H2.push([x, d.floorY - s.topAt(x, 1.4)]);
        const peak = Math.max(...H2.map((c) => c[1]));
        let ang = 0, cnt = 0;
        if (peak > 6) {
          const pi = H2.findIndex((c) => c[1] === peak);
          for (const dir of [-1, 1]) {
            let j = pi;
            while (j + dir >= 0 && j + dir < H2.length && H2[j + dir][1] > peak * 0.25) j += dir;
            const dx = Math.abs(j - pi) * 2.5;
            if (dx > 3) { ang += Math.atan((peak - H2[j][1]) / dx) * 180 / Math.PI; cnt++; }
          }
        }
        d.angles[k] = cnt ? ang / cnt : 0;
        d.counts[k] = s.countMat(COLUMNS[k].mat);
        d.peaks = d.peaks || [];
        d.peaks[k] = peak;
      }
    }
    // 進捗: 3レーンとも十分積もって角度が測れた
    const ok = d.counts ? d.counts.filter((c, k) => c > 350 && (d.peaks?.[k] ?? 0) > 8).length : 0;
    const distinct = d.angles[0] > d.angles[2] + 6; // 砂 > ビーズ がはっきり
    ctx.progress(ok >= 3 && distinct ? 1 : Math.min(0.95, (ok / 3) * 0.9));
  },

  onTool(ctx, id) {
    if (id !== 'pour') return;
    const d = ctx.data;
    d.pouring = !d.pouring;
    ctx.toast(d.pouring ? '🫗 いっせいに注入!' : '⏸️ ストップ。山をくらべてみよう');
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    g.fillStyle = vgrad(g, 0, H, [[0, '#eef2f8'], [1, '#dce4f0']]);
    g.fillRect(0, 0, W, H);
    // 理科室のテーブル
    woodTable(g, W, d.floorY + 2, H, 1);
    // 各レーンのラベルと漏斗
    for (let k = 0; k < 3; k++) {
      const cx = d.colW * (k + 0.5);
      // 漏斗
      g.fillStyle = 'rgba(160,170,190,0.8)';
      g.beginPath();
      g.moveTo(cx - 7, d.spoutY - 12);
      g.lineTo(cx - 1.8, d.spoutY - 2);
      g.lineTo(cx + 1.8, d.spoutY - 2);
      g.lineTo(cx + 7, d.spoutY - 12);
      g.closePath();
      g.fill();
      // ラベル
      g.fillStyle = 'rgba(255,255,255,0.9)';
      rr(g, cx - 11, d.spoutY - 22, 22, 7, 2);
      g.fill();
      g.fillStyle = '#456';
      g.font = 'bold 3.4px sans-serif';
      g.textAlign = 'center';
      g.fillText(COLUMNS[k].label, cx, d.spoutY - 17);
      g.textAlign = 'left';
    }
    // 仕切り
    g.fillStyle = 'rgba(140,160,190,0.6)';
    for (const k of [1, 2]) {
      rr(g, d.colW * k - 1, Math.max(H * 0.3, 40), 2, d.floorY - Math.max(H * 0.3, 40), 1);
      g.fill();
    }
  },

  drawFront(ctx, g) {
    const { W } = ctx, d = ctx.data;
    // 各レーンの分度器表示
    for (let k = 0; k < 3; k++) {
      const cx = d.colW * (k + 0.5);
      const ang = d.angles?.[k] ?? 0;
      g.fillStyle = 'rgba(255,255,255,0.92)';
      rr(g, cx - 13, d.floorY + 3, 26, 9, 2);
      g.fill();
      g.fillStyle = ang > 1 ? '#385a8a' : '#aab';
      g.font = 'bold 4px sans-serif';
      g.textAlign = 'center';
      g.fillText(ang > 1 ? `📐 ${ang.toFixed(0)}°` : '─', cx, d.floorY + 9.5);
      g.textAlign = 'left';
      // 斜面ガイド線 (測れたら)
      if (ang > 3 && d.peaks?.[k] > 6) {
        const peak = d.peaks[k];
        g.strokeStyle = 'rgba(230,90,90,0.55)';
        g.lineWidth = 0.6;
        g.setLineDash([2, 1.5]);
        const rad = ang / 180 * Math.PI;
        const run = peak / Math.tan(Math.max(0.1, rad));
        g.beginPath();
        g.moveTo(cx, d.floorY - peak);
        g.lineTo(cx + Math.min(run, d.colW * 0.45), d.floorY);
        g.stroke();
        g.setLineDash([]);
      }
    }
  },
};
