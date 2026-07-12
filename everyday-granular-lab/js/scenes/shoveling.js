// シーン: 玄関さきの雪かき
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad, softShadow } from '../engine/art.js';
import { SPRITES } from '../engine/grainRenderer.js';
import { ToolRig, countInRect } from './common.js';

export default {
  id: 'shoveling',
  name: 'げんかんの雪かき',
  emoji: '❄️',
  desc: 'ザッザッ… 道をあけよう',
  goal: '🎯 シャベルで玄関までの道の雪をどかそう!',
  clearMsg: 'これで出かけられる!おつかれさま!',
  maxParticles: 6200,
  rattle: 0.3,

  init(ctx) {
    const d = ctx.data;
    d.snowT = 0;
    d.zakuT = 0;
    ctx.sim.defineMaterial(0, { // 雪
      r: 0.78, rJit: 0.1, mu: 0.95, coh: 0.45, vmax: 42,
      interlock: 4, packable: true, flutter: 28,
      sprite: SPRITES.SNOW,
      colors: [[1, 1, 1], [0.95, 0.97, 1]],
    });
    ctx.setHint('シャベル(指)で 雪をすくって ポイッと なげよう');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.groundY = H - Math.min(H * 0.12, 20);
    // 道 (クリアすべきゾーン): 中央
    d.zoneX0 = W * 0.3;
    d.zoneX1 = W * 0.7;
    // シャベル (指ツール: 板 + すくい皿)
    d.shovel = new ToolRig(ctx.sim, [
      [-9, 0, 9, 0],        // 刃
      [-9, 0, -9, -6],      // 左そで
      [9, 0, 9, -6],        // 右そで
    ], 1.3, 0.25);
    if (!d.filled) {
      d.filled = true;
      // 雪をつもらせる
      ctx.fill(2, d.groundY - Math.min(H * 0.17, 26), W - 2, d.groundY, 0);
      d.initial = countInRect(ctx.sim, d.zoneX0, 0, d.zoneX1, d.groundY + 2);
    }
  },

  update(ctx, dt) {
    const d = ctx.data, s = ctx.sim, p = ctx.primary;
    const { W, H } = ctx;
    // シャベル追従 (少し傾けてすくいやすく)
    if (p) {
      const tiltAng = clamp((p.vx || 0) * 0.0012, -0.5, 0.5);
      d.shovel.place(p.x, p.y, tiltAng, dt);
      const sp = Math.hypot(p.vx, p.vy);
      d.zakuT -= dt;
      if (sp > 80 && d.zakuT <= 0 && p.y > d.groundY - 30) {
        d.zakuT = 0.3;
        ctx.sfx.zaku();
      }
      if (sp > 90 && Math.random() < dt * 14) {
        ctx.fx.addDust(p.x + rand(-6, 6), p.y + rand(-4, 2), rand(2, 4), '238,243,252');
      }
    } else d.shovel.hide();

    // 雪がまた降ってくる (うっすら)
    d.snowT += dt;
    if (d.snowT > 0.35 && s.n < s.max - 5) {
      d.snowT = 0;
      s.emit(rand(3, W - 3), -4, rand(-3, 3), 16, 0);
    }

    // 道ゾーンの雪の量
    const now = countInRect(s, d.zoneX0, 0, d.zoneX1, d.groundY + 2);
    const frac = clamp(1 - now / Math.max(1, d.initial * 0.92), 0, 1);
    ctx.progress(frac >= 0.94 ? 1 : frac);
    d.zoneCount = now;
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    g.fillStyle = vgrad(g, 0, H, [[0, '#48608c'], [0.7, '#7488b4'], [1, '#98a8cc']]);
    g.fillRect(0, 0, W, H);
    // 家 (右)
    g.fillStyle = '#5a4a44';
    rr(g, d.zoneX1 + 4, d.groundY - 52, W - d.zoneX1, 55, 3);
    g.fill();
    g.fillStyle = '#7a3a34';
    g.beginPath();
    g.moveTo(d.zoneX1, d.groundY - 50);
    g.lineTo(d.zoneX1 + (W - d.zoneX1) / 2 + 4, d.groundY - 66);
    g.lineTo(W + 4, d.groundY - 50);
    g.closePath();
    g.fill();
    // 玄関ドア
    g.fillStyle = '#c8a050';
    rr(g, d.zoneX1 + 10, d.groundY - 30, 16, 30, 2);
    g.fill();
    g.fillStyle = '#8a6a30';
    g.beginPath(); g.arc(d.zoneX1 + 23, d.groundY - 15, 1.2, 0, TAU); g.fill();
    // 窓 (あかり)
    g.fillStyle = 'rgba(255,220,130,0.95)';
    rr(g, d.zoneX1 + 32, d.groundY - 42, 13, 11, 2);
    g.fill();
    g.strokeStyle = '#5a4a44';
    g.lineWidth = 0.8;
    g.beginPath();
    g.moveTo(d.zoneX1 + 38.5, d.groundY - 42);
    g.lineTo(d.zoneX1 + 38.5, d.groundY - 31);
    g.stroke();
    // 街灯 (左)
    g.fillStyle = '#3a4258';
    rr(g, W * 0.08, d.groundY - 46, 2.5, 46, 1);
    g.fill();
    const gr = g.createRadialGradient(W * 0.08 + 1, d.groundY - 48, 1, W * 0.08 + 1, d.groundY - 48, 14);
    gr.addColorStop(0, 'rgba(255,230,150,0.8)');
    gr.addColorStop(1, 'rgba(255,230,150,0)');
    g.fillStyle = gr;
    g.beginPath(); g.arc(W * 0.08 + 1, d.groundY - 48, 14, 0, TAU); g.fill();
    g.fillStyle = '#ffe9a8';
    g.beginPath(); g.arc(W * 0.08 + 1, d.groundY - 48, 2.5, 0, TAU); g.fill();
    // 道 (石だたみ) — クリアゾーン
    g.fillStyle = '#8a8ea0';
    g.fillRect(0, d.groundY + 1, W, H - d.groundY);
    g.fillStyle = '#a8acbe';
    for (let x = d.zoneX0; x < d.zoneX1 - 4; x += 9) {
      rr(g, x + 1, d.groundY + 2, 7, 4, 1);
      g.fill();
    }
    // ゾーンのしるし
    g.strokeStyle = 'rgba(255,240,150,0.7)';
    g.lineWidth = 0.8;
    g.setLineDash([2.5, 2]);
    for (const x of [d.zoneX0, d.zoneX1]) {
      g.beginPath();
      g.moveTo(x, d.groundY - 34);
      g.lineTo(x, d.groundY);
      g.stroke();
    }
    g.setLineDash([]);
    g.fillStyle = 'rgba(255,240,150,0.9)';
    g.font = 'bold 3.2px sans-serif';
    g.textAlign = 'center';
    g.fillText('← ここをあける →', (d.zoneX0 + d.zoneX1) / 2, d.groundY - 36);
    g.textAlign = 'left';
  },

  drawFront(ctx, g) {
    const d = ctx.data, p = ctx.primary;
    if (p) {
      // シャベル
      g.save();
      g.translate(p.x, p.y);
      g.rotate(d.shovel.ang);
      // 柄
      g.fillStyle = '#c89858';
      g.save();
      g.rotate(-0.9);
      rr(g, -1.1, -28, 2.2, 24, 1);
      g.fill();
      g.fillStyle = '#a87838';
      rr(g, -3.5, -31, 7, 4, 2);
      g.fill();
      g.restore();
      // 刃 (青いプラスチック)
      g.fillStyle = '#4a90d8';
      g.beginPath();
      g.moveTo(-10, -7);
      g.lineTo(-9.5, 0.8);
      g.lineTo(9.5, 0.8);
      g.lineTo(10, -7);
      g.lineTo(6, -5);
      g.lineTo(-6, -5);
      g.closePath();
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.3)';
      rr(g, -8, -5.5, 3, 5, 1.5);
      g.fill();
      g.restore();
    }
  },
};
