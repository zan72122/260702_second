// シーン: 砂浜の砂鉄あつめ (磁石にくっつく!)
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad, sun, cloud } from '../engine/art.js';
import { SPRITES } from '../engine/grainRenderer.js';

export default {
  id: 'ironsand',
  name: '砂浜で砂鉄あつめ',
  emoji: '🧲',
  desc: '磁石をかざすと 黒い粒だけ ピタッ',
  goal: '🎯 磁石で砂鉄を 60つぶ あつめよう!',
  clearMsg: '自由研究レベルの大収穫!',
  maxParticles: 6000,
  tilt: false,
  rattle: 0.3,

  init(ctx) {
    const d = ctx.data;
    d.collected = 0;
    ctx.sim.defineMaterial(0, { // 砂
      r: 0.62, rJit: 0.07, mu: 1.0, interlock: 4, vmax: 45,
      sprite: SPRITES.SAND,
      colors: [[0.93, 0.82, 0.6], [0.88, 0.76, 0.52], [0.96, 0.88, 0.68]],
    });
    ctx.sim.defineMaterial(1, { // 砂鉄
      r: 0.6, rJit: 0.06, mu: 1.0, interlock: 4, vmax: 60,
      sprite: SPRITES.SAND,
      colors: [[0.22, 0.2, 0.24], [0.3, 0.28, 0.32], [0.16, 0.15, 0.19]],
    });
    ctx.setHint('磁石 (指) を砂の近くで ゆっくり動かそう。黒い砂鉄だけ よってくる!');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.groundY = H - Math.min(H * 0.3, 48);
    if (!d.filled) {
      d.filled = true;
      // 砂浜 (砂 85% + 砂鉄 15% をまだらに)
      const s = ctx.sim;
      const m = s.mats[0];
      const sp = m.r * 2 * 1.02;
      let row = 0;
      for (let y = H - 3; y > d.groundY; y -= sp * 0.87, row++) {
        for (let x = m.r + (row % 2) * sp * 0.5; x < W - m.r * 0.5; x += sp) {
          s.emit(x, y, 0, 0, Math.random() < 0.15 ? 1 : 0, 0.15);
        }
      }
      d.totalIron = s.countMat(1);
    }
  },

  update(ctx, dt) {
    const d = ctx.data, s = ctx.sim, p = ctx.primary;
    if (p) {
      const mx = p.x, my = p.y;
      d.magX = mx; d.magY = my;
      // 磁力: 砂鉄だけ引き寄せ (近いほど強い)
      s.forEachInCircle(mx, my, 14, (i) => {
        if (s.mat[i] !== 1) return;
        const dx = mx - s.x[i], dy = my - s.y[i];
        const dd = Math.hypot(dx, dy) || 1;
        if (dd < 4.4) {
          // くっついた → 回収
          s.kill(i);
          d.collected++;
          if ((d.collected & 7) === 0) ctx.sfx.drip();
          return;
        }
        const f = 850 / (dd * dd + 10);
        s.rest[i] = 0;
        s.vx[i] += dx / dd * f;
        s.vy[i] += dy / dd * f - 13; // 砂から引きはがす分すこし上へ
        // 強力磁石: 位置もじわっと引き寄せ (砂の中でも抜けてくる)
        const pull = Math.min(0.3, 30 / (dd * dd + 4));
        s.x[i] += dx / dd * pull;
        s.y[i] += dy / dd * pull;
      });
      if (Math.random() < dt * 4) {
        ctx.fx.addSpark(mx + rand(-4, 4), my + rand(-2, 4), '#c8d8f0');
      }
    }
    ctx.progress(Math.min(1, d.collected / 60));
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    g.fillStyle = vgrad(g, 0, H, [[0, '#8fd0f0'], [0.55, '#c8e8f8'], [1, '#e8f6ff']]);
    g.fillRect(0, 0, W, H);
    sun(g, W * 0.16, 13, 5.5);
    cloud(g, W * 0.6, 16, 1, 0.9);
    // 海
    const seaY = d.groundY - 14;
    g.fillStyle = vgrad(g, seaY, d.groundY + 2, [[0, '#3a8ac8'], [1, '#5aaad8']]);
    g.fillRect(0, seaY, W, d.groundY - seaY + 3);
    g.fillStyle = 'rgba(255,255,255,0.5)';
    for (let x = 0; x < W; x += 16) {
      g.beginPath();
      g.arc(x + (seaY % 7), seaY + 2 + Math.sin(x) * 1, 1.2, 0, Math.PI);
      g.fill();
    }
    // ヨット
    g.fillStyle = '#fff';
    g.beginPath();
    g.moveTo(W * 0.72, seaY - 1);
    g.lineTo(W * 0.72, seaY - 10);
    g.lineTo(W * 0.78, seaY - 1);
    g.closePath();
    g.fill();
    g.fillStyle = '#e8554a';
    g.beginPath();
    g.moveTo(W * 0.69, seaY);
    g.lineTo(W * 0.8, seaY);
    g.lineTo(W * 0.77, seaY + 3);
    g.lineTo(W * 0.71, seaY + 3);
    g.closePath();
    g.fill();
    // 砂浜のベース
    g.fillStyle = '#d8bc8a';
    g.fillRect(0, d.groundY, W, H - d.groundY);
  },

  drawFront(ctx, g) {
    const { W } = ctx, d = ctx.data, p = ctx.primary;
    // 磁石 (U字)
    if (p) {
      g.save();
      g.translate(d.magX, d.magY - 2);
      g.rotate(Math.sin(ctx.t * 3) * 0.05);
      g.lineWidth = 4.5;
      g.strokeStyle = '#d8342a';
      g.beginPath();
      g.arc(0, -4, 5.5, Math.PI * 0.05, Math.PI * 0.95, false);
      g.stroke();
      g.strokeStyle = '#d8342a';
      for (const sgn of [-1, 1]) {
        g.beginPath();
        g.moveTo(sgn * 5.4, -4.5);
        g.lineTo(sgn * 5.4, 1);
        g.stroke();
      }
      g.fillStyle = '#e8e8f0';
      for (const sgn of [-1, 1]) {
        rr(g, sgn * 5.4 - 2.25, 1, 4.5, 4, 1);
        g.fill();
      }
      g.fillStyle = '#889';
      g.font = 'bold 2.6px sans-serif';
      g.textAlign = 'center';
      g.fillText('N', -5.4, 4.2);
      g.fillText('S', 5.4, 4.2);
      g.textAlign = 'left';
      // くっついた砂鉄のもしゃもしゃ
      const got = Math.min(d.collected, 60);
      g.fillStyle = '#2a2830';
      for (let k = 0; k < got; k += 3) {
        const a = (k * 2.4) % TAU;
        const rrr = 2 + (k % 9) * 0.35;
        for (const sgn of [-1, 1]) {
          g.beginPath();
          g.arc(sgn * 5.4 + Math.cos(a) * 1.6, 5 + Math.abs(Math.sin(a)) * rrr * 0.5, 0.55, 0, TAU);
          g.fill();
        }
      }
      g.restore();
    }
    // カウント
    g.fillStyle = 'rgba(255,255,255,0.92)';
    rr(g, W - 38, 16, 36, 12, 3);
    g.fill();
    g.fillStyle = '#2a2830';
    g.font = 'bold 4.4px sans-serif';
    g.fillText(`🧲 ${d.collected}/60`, W - 35, 24.5);
  },
};
