// シーン: 雨あがりの虹 (水滴の中の光の旅)
// 虹角は水の分散 n(λ) から最小偏差を計算した実測値 (主虹≈42°, 副虹≈51°)
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad, sun as drawSun, cloud, softShadow } from '../engine/art.js';
import { refIndex } from '../engine/spectrum.js';
import { waveCss } from '../engine/render2d.js';
import { drawAngleArc } from './common.js';

// 主虹: 1回内部反射の最小偏差 → 観察角 4r-2i
function primaryAngle(n) {
  const i = Math.acos(Math.sqrt((n * n - 1) / 3));
  const r = Math.asin(Math.sin(i) / n);
  return (4 * r - 2 * i) * 180 / Math.PI;
}
// 副虹: 2回内部反射 → 観察角 π - (6r - 2i)
function secondaryAngle(n) {
  const i = Math.acos(Math.sqrt((n * n - 1) / 8));
  const r = Math.asin(Math.sin(i) / n);
  return 180 - (6 * r - 2 * i) * 180 / Math.PI;
}

export default {
  id: 'rainbow',
  name: '雨あがりの虹',
  emoji: '🌈',
  desc: 'ダブルレインボーを さがせ',
  goal: '🎯 太陽を下げて 雨をふらせて…2本目の虹 (副虹) を見つけよう!',
  clearMsg: '副虹は色が逆順!よく見つけたね!',
  spectrumN: 12,

  init(ctx) {
    const d = ctx.data;
    d.sunEl = 55;       // 太陽高度 [deg]
    d.rain = 0;         // 雨 0..1
    d.raining = false;
    d.drops = [];
    d.seenT = 0;
    // 波長ごとの虹角 (分散から一度だけ計算)
    d.bands = ctx.spectrum.map((s) => {
      const n = refIndex('water', s.l);
      return { l: s.l, a1: primaryAngle(n), a2: secondaryAngle(n) };
    });
    ctx.setTools([
      { id: 'rain', icon: '🌧️', label: '雨をふらせる' },
      { id: 'angle', icon: '📐', label: '角度を見る' },
    ]);
    ctx.setHint('☀️ 太陽を上下にドラッグ。虹は「太陽の反対側 42°」に出る!');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.horizon = Math.min(H - 30, H * 0.78);
    d.degPx = Math.min(W, H) * 0.019; // 1°あたりの長さ
    d.sunX = W * 0.14;
  },

  update(ctx, dt) {
    const d = ctx.data, p = ctx.primary;
    // 太陽ドラッグ (左側 1/3 をつかむと高度が変わる)
    if (p && p.x < ctx.W * 0.38) {
      d.sunEl = clamp(90 - (p.y / d.horizon) * 100, 3, 80);
      ctx.backDirty();
    }
    // 雨
    d.rain += ((d.raining ? 1 : 0) - d.rain) * Math.min(1, dt * 0.8);
    if (d.raining && d.drops.length < 70) {
      d.drops.push({ x: rand(ctx.W * 0.3, ctx.W), y: rand(-10, 0), v: rand(50, 70) });
    }
    for (let i = d.drops.length - 1; i >= 0; i--) {
      const dr = d.drops[i];
      dr.y += dr.v * dt;
      if (dr.y > d.horizon) {
        ctx.fx.addSpray(dr.x, d.horizon, rand(-3, 3), rand(-8, -2), 'rgba(170,210,255,0.6)', 0.4, 0.4);
        d.drops.splice(i, 1);
      }
    }
    ctx.sfx.setPour(d.rain > 0.1 ? d.rain * 0.3 : 0, 0.4);

    // 虹の見え方 (物理): 対日点の高度 = -太陽高度。
    // 虹の頂点高度 = 42 - 太陽高度 → 太陽が高いと地平線の下に沈む
    d.topAlt1 = 42.3 - d.sunEl;
    d.topAlt2 = 51 - d.sunEl;
    d.vis1 = clamp(d.topAlt1 / 12, 0, 1) * d.rain;             // 主虹の見え具合
    d.vis2 = clamp(d.topAlt2 / 20, 0, 1) * clamp((d.rain - 0.55) * 2.5, 0, 1); // 副虹は雨が濃いとき
    // ゴール: 副虹がしっかり見えている状態を 2 秒観察
    if (d.vis2 > 0.45 && d.vis1 > 0.6) {
      d.seenT += dt;
      if (d.seenT > 0.3 && !d.saidW) { d.saidW = true; ctx.toast('✨ 2本目!色の順番が逆になってるよ'); }
      ctx.progress(Math.min(1, d.seenT / 2));
    } else {
      d.seenT = Math.max(0, d.seenT - dt);
      if (!ctx._cleared) {
        ctx.progress(clamp(d.vis1 * 0.55 + d.vis2 * 0.4, 0, 0.95));
      }
    }
  },

  onTool(ctx, id) {
    const d = ctx.data;
    if (id === 'rain') {
      d.raining = !d.raining;
      ctx.setToolActive(d.raining ? 'rain' : '');
      ctx.toast(d.raining ? '🌧️ ザーッ (水滴がプリズムになる)' : '☀️ 雨あがり');
    }
    if (id === 'angle') {
      d.showAngle = !d.showAngle;
      ctx.toast(d.showAngle ? '📐 対日点から 42° と 51° のわを表示' : '📐 OFF');
    }
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    // 空 (太陽高度で色が変わる)
    const dusk = clamp(1 - d.sunEl / 40, 0, 1);
    const top = [140 - dusk * 40, 200 - dusk * 90, 245 - dusk * 60];
    const bot = [200 + dusk * 40, 228 - dusk * 60, 250 - dusk * 90];
    g.fillStyle = vgrad(g, 0, d.horizon, [
      [0, `rgb(${top[0]},${top[1]},${top[2]})`],
      [1, `rgb(${bot[0]},${bot[1]},${bot[2]})`],
    ]);
    g.fillRect(0, 0, W, d.horizon);
    // 太陽
    const sy = (1 - d.sunEl / 90) * d.horizon * 0.9;
    drawSun(g, d.sunX, sy, 5);
    cloud(g, W * 0.55, 20, 0.9, 0.8);
    cloud(g, W * 0.8, 12, 0.7, 0.7);
    // 野原
    g.fillStyle = vgrad(g, d.horizon, H, [[0, '#8fc262'], [1, '#6da648']]);
    g.fillRect(0, d.horizon, W, H - d.horizon);
    g.fillStyle = '#7ab254';
    for (let k = 0; k < 8; k++) {
      const fx = (k / 8 + 0.06) * W;
      g.beginPath();
      g.ellipse(fx, d.horizon + 6 + (k % 3) * 8, 6, 1.6, 0, 0, TAU);
      g.fill();
    }
  },

  drawFront(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    // 対日点: 太陽の反対 (画面右下の地平線下)
    const cx = W * 0.68;
    const cy = d.horizon + d.sunEl * d.degPx; // 高度が上がるほど深く沈む
    // 虹 (加算合成の同心弧)
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.lineCap = 'round';
    // 地平線より上だけ
    g.beginPath();
    g.rect(0, 0, W, d.horizon);
    g.clip();
    for (const b of d.bands) {
      // 主虹
      if (d.vis1 > 0.02) {
        g.strokeStyle = waveCss(b.l, 0.16 * d.vis1);
        g.lineWidth = 1.15;
        g.beginPath();
        g.arc(cx, cy, b.a1 * d.degPx, Math.PI, TAU);
        g.stroke();
      }
      // 副虹 (色が逆順=半径の並びが逆)
      if (d.vis2 > 0.02) {
        g.strokeStyle = waveCss(b.l, 0.10 * d.vis2);
        g.lineWidth = 1.5;
        g.beginPath();
        g.arc(cx, cy, b.a2 * d.degPx, Math.PI, TAU);
        g.stroke();
      }
    }
    // 主虹の内側は明るい (物理: 42°未満に全ての水滴の光)
    if (d.vis1 > 0.05) {
      const rIn = (d.bands[0].a1 - 1.5) * d.degPx;
      const grad = g.createRadialGradient(cx, cy, rIn * 0.4, cx, cy, rIn);
      grad.addColorStop(0, `rgba(255,255,255,${0.05 * d.vis1})`);
      grad.addColorStop(1, `rgba(255,255,255,${0.10 * d.vis1})`);
      g.fillStyle = grad;
      g.beginPath();
      g.arc(cx, cy, rIn, 0, TAU);
      g.fill();
    }
    g.restore();
    // アレキサンダーの暗帯ラベル
    if (d.vis1 > 0.4 && d.vis2 > 0.3) {
      g.fillStyle = 'rgba(30,40,60,0.55)';
      g.font = 'bold 2.6px sans-serif';
      const rm = (d.bands[0].a1 + 4.5) * d.degPx;
      g.fillText('← この間が暗い (アレキサンダーの暗帯)', cx - 38, cy - rm);
    }
    // 角度ガイド
    if (d.showAngle) {
      drawAngleArc(g, cx, cy, -Math.PI * 0.75, -Math.PI * 0.6, 42.3 * d.degPx, '42°', 'rgba(40,60,90,0.9)');
      drawAngleArc(g, cx, cy, -Math.PI * 0.52, -Math.PI * 0.4, 51 * d.degPx, '51°', 'rgba(40,60,90,0.9)');
      g.fillStyle = 'rgba(40,60,90,0.9)';
      g.beginPath();
      g.arc(cx, Math.min(cy, H - 3), 1.2, 0, TAU);
      g.fill();
      g.font = '2.4px sans-serif';
      g.fillText('対日点', cx + 2.5, Math.min(cy, H - 3));
    }
    // 雨つぶ
    g.strokeStyle = 'rgba(160,200,240,0.55)';
    g.lineWidth = 0.4;
    for (const dr of d.drops) {
      g.beginPath();
      g.moveTo(dr.x, dr.y);
      g.lineTo(dr.x - 0.6, dr.y + 2.4);
      g.stroke();
    }
    // 太陽ハンドルのヒント
    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.font = '2.6px sans-serif';
    g.fillText('☀️⇅ ドラッグ', 4, d.horizon * (1 - d.sunEl / 90) * 0.9 + 10);
    // 高度メーター
    g.fillStyle = 'rgba(255,255,255,0.9)';
    rr(g, W - 36, 16, 34, 10, 3);
    g.fill();
    g.fillStyle = '#556';
    g.font = 'bold 2.6px sans-serif';
    g.fillText(`太陽高度 ${d.sunEl | 0}°`, W - 33, 20.4);
    g.fillStyle = d.topAlt1 > 0 ? '#2a9a4a' : '#c05a3a';
    g.font = '2.3px sans-serif';
    g.fillText(d.topAlt1 > 0 ? `虹の頂点 +${d.topAlt1 | 0}°` : '虹は地平線の下…', W - 33, 24);
  },
};
