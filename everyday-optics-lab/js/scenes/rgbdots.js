// シーン: テレビのRGBドット (光の三原色 — たすと明るくなる加法混色)
import { TAU, rand, clamp, pick } from '../engine/utils.js';
import { rr, vgrad } from '../engine/art.js';

const TARGETS = [
  { name: 'しろ', rgb: [1, 1, 1] },
  { name: 'きいろ', rgb: [1, 1, 0] },
  { name: 'みずいろ', rgb: [0, 1, 1] },
  { name: 'ピンク(マゼンタ)', rgb: [1, 0, 1] },
  { name: 'オレンジ', rgb: [1, 0.5, 0] },
];

export default {
  id: 'rgbdots',
  name: 'テレビのRGBドット',
  emoji: '🖥️',
  desc: '画面の白は 赤+緑+青',
  goal: '🎯 R・G・B の3本のバーで 目標の色を3つ つくろう!',
  clearMsg: '光は たすほど明るい=加法混色!',
  spectrumN: 6,

  init(ctx) {
    const d = ctx.data;
    d.rgb = [0.2, 0.2, 0.2];
    d.made = 0;
    d.target = TARGETS[0];
    d.okT = 0;
    ctx.setHint('バーを上下にドラッグ。はなれて見ると3色が混ざって見える!');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.zoomY = H * 0.30;   // 拡大ドット表示の中心
    d.barY = Math.min(H * 0.72, H - 62);
    d.barH = Math.min(H * 0.22, 40);
    d.barXs = [W * 0.25, W * 0.5, W * 0.75];
  },

  update(ctx, dt) {
    const d = ctx.data, p = ctx.primary;
    if (p) {
      // 一番近いバーを操作
      let bi = 0, bd = 1e9;
      d.barXs.forEach((x, i) => {
        const dd = Math.abs(p.x - x);
        if (dd < bd) { bd = dd; bi = i; }
      });
      if (bd < ctx.W * 0.14 && p.y > d.barY - d.barH - 8) {
        d.rgb[bi] = clamp(1 - (p.y - (d.barY - d.barH)) / d.barH, 0, 1);
      }
    }
    // 判定
    const t = d.target.rgb;
    const dist = Math.abs(d.rgb[0] - t[0]) + Math.abs(d.rgb[1] - t[1]) + Math.abs(d.rgb[2] - t[2]);
    d.dist = dist;
    if (dist < 0.3) {
      d.okT += dt;
      if (d.okT > 1) {
        d.made++;
        ctx.sfx.chime();
        ctx.vibrate(15);
        if (d.made >= 3) {
          ctx.progress(1);
        } else {
          d.target = TARGETS[d.made + (d.made === 0 ? 0 : 1) % TARGETS.length] ?? pick(TARGETS);
          // 順番に: しろ → きいろ → みずいろ
          d.target = TARGETS[d.made];
          d.okT = 0;
          ctx.toast(`✅ できた! つぎは「${d.target.name}」`);
        }
      }
    } else {
      d.okT = 0;
    }
    if (!ctx._cleared) {
      ctx.progress(Math.min(0.97, d.made / 3 + clamp((0.9 - dist) / 0.9, 0, 1) * 0.15));
    }
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    g.fillStyle = vgrad(g, 0, H, [[0, '#20242e'], [1, '#14161e']]);
    g.fillRect(0, 0, W, H);
    // テレビのわく (上の拡大ビュー)
    g.fillStyle = '#0a0c12';
    rr(g, W * 0.08, d.zoomY - 26, W * 0.84, 52, 3);
    g.fill();
    g.strokeStyle = '#3a4050';
    g.lineWidth = 1.2;
    rr(g, W * 0.08, d.zoomY - 26, W * 0.84, 52, 3);
    g.stroke();
    g.fillStyle = '#889';
    g.font = '2.6px sans-serif';
    g.fillText('🔍 画面をルーペで拡大したところ', W * 0.1, d.zoomY - 29);
  },

  drawFront(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    const [R, G, B] = d.rgb;
    // 拡大サブピクセル (3本1組 × グリッド)
    g.save();
    g.beginPath();
    rr(g, W * 0.09, d.zoomY - 25, W * 0.82, 50, 2.5);
    g.clip();
    const cell = 10.5, sub = 2.8;
    for (let gx = W * 0.09; gx < W * 0.91; gx += cell) {
      for (let gy = d.zoomY - 25; gy < d.zoomY + 25; gy += cell * 1.4) {
        const cols = [`rgba(255,40,30,${0.15 + R * 0.85})`, `rgba(40,255,60,${0.15 + G * 0.85})`, `rgba(50,80,255,${0.15 + B * 0.85})`];
        for (let s2 = 0; s2 < 3; s2++) {
          g.fillStyle = cols[s2];
          rr(g, gx + 1 + s2 * (sub + 0.4), gy + 1, sub, cell * 1.4 - 2, 1);
          g.fill();
        }
      }
    }
    g.restore();
    // はなれて見た色 (加法混色 = RGBの和)
    const mixY = d.zoomY + 40;
    g.fillStyle = '#889';
    g.font = '2.6px sans-serif';
    g.fillText('👀 はなれて見ると…', W * 0.1, mixY - 9);
    g.fillStyle = `rgb(${R * 255},${G * 255},${B * 255})`;
    rr(g, W * 0.3, mixY - 6, W * 0.4, 13, 3);
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.4)';
    g.lineWidth = 0.5;
    rr(g, W * 0.3, mixY - 6, W * 0.4, 13, 3);
    g.stroke();
    // 目標色
    const t = d.target.rgb;
    g.fillStyle = 'rgba(255,255,255,0.92)';
    rr(g, 4, 16, 44, 13, 3);
    g.fill();
    g.fillStyle = `rgb(${t[0] * 255},${t[1] * 255},${t[2] * 255})`;
    rr(g, 7, 18.5, 8, 8, 2);
    g.fill();
    g.fillStyle = '#556';
    g.font = 'bold 2.7px sans-serif';
    g.fillText(`目標: ${d.target.name}`, 17, 22);
    g.fillStyle = (d.dist ?? 9) < 0.3 ? '#2a9a4a' : '#889';
    g.font = '2.4px sans-serif';
    g.fillText((d.dist ?? 9) < 0.3 ? '✨ そのままキープ!' : `できた数 ${d.made}/3`, 17, 26);
    // RGBバー
    const labels = ['R', 'G', 'B'];
    const cols2 = ['#e84a3a', '#3ac85a', '#4a6ae8'];
    d.barXs.forEach((x, i) => {
      g.fillStyle = 'rgba(255,255,255,0.12)';
      rr(g, x - 5, d.barY - d.barH, 10, d.barH, 2.5);
      g.fill();
      g.fillStyle = cols2[i];
      const h = d.rgb[i] * d.barH;
      rr(g, x - 5, d.barY - h, 10, Math.max(0.5, h), 2.5);
      g.fill();
      // つまみ
      g.fillStyle = '#fff';
      rr(g, x - 6.5, d.barY - h - 1.4, 13, 2.8, 1.4);
      g.fill();
      g.fillStyle = cols2[i];
      g.font = 'bold 3.6px sans-serif';
      g.textAlign = 'center';
      g.fillText(labels[i], x, d.barY + 6);
      g.fillStyle = '#aab';
      g.font = '2.4px sans-serif';
      g.fillText(`${(d.rgb[i] * 100) | 0}%`, x, d.barY + 10);
      g.textAlign = 'left';
    });
  },
};
