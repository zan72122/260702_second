// シーン: ブラジルナッツ効果 (ふると大きい粒が浮いてくる!)
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad, woodTable, softShadow, eye } from '../engine/art.js';
import { SPRITES } from '../engine/grainRenderer.js';

export default {
  id: 'brazilnut',
  name: 'ミックスナッツのふしぎ',
  emoji: '🥜',
  desc: 'ふると 大きいナッツが 浮いてくる!?',
  goal: '🎯 缶をトントンふって うもれた大きなナッツを 表面まで うかせよう!',
  clearMsg: 'ブラジルナッツ効果 だいせいこう!',
  maxParticles: 3500,
  tilt: false,
  rattlePitch: 0.8,

  init(ctx) {
    const d = ctx.data;
    d.shakes = 0;
    d.surfaced = false;
    d.jolt = 0;
    ctx.sim.defineMaterial(0, { // ピーナッツ (小粒)
      r: 0.95, rJit: 0.12, mu: 0.4, interlock: 1, vmax: 80, sleepK: 0.8,
      sprite: SPRITES.BEAN, colors: [[1, 1, 1], [0.95, 0.9, 0.8], [1, 0.94, 0.85]],
      stretch: 1.15,
    });
    ctx.setHint('タップで缶を トン!と たたく。くりかえすと…?');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.cx = W / 2;
    d.cw = Math.min(W * 0.5, 56);
    d.bottom = Math.min(H - 14, H * 0.9);
    d.top = d.bottom - Math.min(H * 0.5, 84);
    ctx.addCup(d.cx, d.top, d.bottom, d.cw, 2);
    d.surfY = d.bottom - (d.bottom - d.top) * 0.55;
    if (!d.filled) {
      d.filled = true;
      ctx.fill(d.cx - d.cw / 2 + 1.5, d.surfY, d.cx + d.cw / 2 - 1.5, d.bottom - 1, 0);
      // 大きなブラジルナッツを底ちかくに埋める (小粒と同じ密度!)
      const s = ctx.sim;
      d.nut = s.addSolid({
        x: d.cx + rand(-6, 6),
        y: d.bottom - 10,
        r: 5, mass: 18, grav: 0.85, mu: 0.5,
      });
      d.nut.data.brazil = true;
    }
  },

  onDown(ctx, p) {
    const d = ctx.data, s = ctx.sim;
    // 缶をトン!と下からたたく (振動)
    d.shakes++;
    d.jolt = 0.18;
    s.impulse(d.cx, d.bottom - 2, d.cw * 0.7, rand(-12, 12), -rand(48, 62));
    s.wakeAll();
    d.nut.vy -= 12;
    ctx.sfx.pop(0.5);
    ctx.sfx.setRattle(0.6, 0.8);
    ctx.vibrate(18);
  },

  update(ctx, dt) {
    const d = ctx.data;
    d.jolt = Math.max(0, d.jolt - dt);
    const nut = d.nut;
    if (!nut) return;
    // ナッツの深さ → 進捗
    const depth0 = d.bottom - 10;
    const target = ctx.sim.topAt(nut.x, 4, d.top) + 2; // 表面
    const prog = clamp((depth0 - nut.y) / Math.max(6, depth0 - target), 0, 1);
    if (prog >= 0.98 && !d.surfaced) {
      d.surfaced = true;
      ctx.progress(1);
      ctx.toast('🥜 うきあがった!これがブラジルナッツ効果!');
    } else if (!ctx._cleared) {
      ctx.progress(Math.min(0.97, prog));
    }
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    g.fillStyle = vgrad(g, 0, H, [[0, '#fdf4e0'], [1, '#f5e4c2']]);
    g.fillRect(0, 0, W, H);
    woodTable(g, W, d.bottom + 5, H, 1);
    // 説明パネル (自由研究風)
    g.fillStyle = 'rgba(255,255,255,0.9)';
    rr(g, 4, 16, Math.min(44, W * 0.4), 24, 3);
    g.fill();
    g.fillStyle = '#7a5230';
    g.font = 'bold 3.2px sans-serif';
    g.fillText('ふしぎ実験', 7, 22);
    g.font = '2.6px sans-serif';
    g.fillText('大きい粒は ふると', 7, 27);
    g.fillText('上に あがってくる', 7, 31);
    g.fillText('(粒の対流のせい!)', 7, 35);
    softShadow(g, d.cx, d.bottom + 5, d.cw * 0.7, 3, 0.18);
  },

  drawFront(ctx, g) {
    const d = ctx.data;
    const jx = d.jolt > 0 ? rand(-1, 1) : 0;
    const jy = d.jolt > 0 ? rand(-1.5, 0) : 0;
    g.save();
    g.translate(jx, jy);
    // ナッツ缶 (手前)
    const x0 = d.cx - d.cw / 2 - 3.4, wI = d.cw + 6.8;
    g.fillStyle = vgrad(g, d.top - 6, d.bottom + 4, [[0, '#4a90d8'], [0.5, '#3a78bc'], [1, '#2a5c94']]);
    g.globalAlpha = 0.25;
    rr(g, x0, d.top - 6, wI, d.bottom - d.top + 10, 3);
    g.fill();
    g.globalAlpha = 1;
    // 縁と底
    g.fillStyle = '#3a78bc';
    rr(g, x0, d.top - 7, wI, 4, 2);
    g.fill();
    rr(g, x0, d.bottom, wI, 4, 2);
    g.fill();
    // ラベル
    g.fillStyle = 'rgba(255,240,200,0.9)';
    rr(g, d.cx - 15, d.bottom - 18, 30, 12, 2);
    g.fill();
    g.fillStyle = '#a06a2a';
    g.font = 'bold 4px sans-serif';
    g.textAlign = 'center';
    g.fillText('MIX NUTS', d.cx, d.bottom - 10.5);
    g.textAlign = 'left';
    g.restore();
    // ブラジルナッツ (大)
    const nut = d.nut;
    if (nut) {
      g.save();
      g.translate(nut.x + jx, nut.y + jy);
      g.rotate(nut.angle * 0.3);
      const grd = g.createRadialGradient(-1.5, -1.5, 1, 0, 0, nut.r);
      grd.addColorStop(0, '#a97845');
      grd.addColorStop(1, '#6a4322');
      g.fillStyle = grd;
      g.beginPath();
      g.ellipse(0, 0, nut.r, nut.r * 0.72, 0.3, 0, TAU);
      g.fill();
      g.strokeStyle = 'rgba(60,35,15,0.6)';
      g.lineWidth = 0.4;
      g.beginPath();
      g.ellipse(0, 0, nut.r * 0.66, nut.r * 0.45, 0.3, 0, TAU);
      g.stroke();
      if (d.surfaced) {
        eye(g, -1.4, -0.8, 0.8, 0);
        eye(g, 1.4, -0.8, 0.8, 0);
        g.strokeStyle = '#3a2010';
        g.lineWidth = 0.4;
        g.beginPath(); g.arc(0, 0.8, 1, 0.3, Math.PI - 0.3); g.stroke();
      }
      g.restore();
    }
    // ふった回数
    g.fillStyle = 'rgba(255,255,255,0.92)';
    rr(g, ctx.W - 34, 16, 32, 12, 3);
    g.fill();
    g.fillStyle = '#3a78bc';
    g.font = 'bold 4.4px sans-serif';
    g.fillText(`トン ×${d.shakes}`, ctx.W - 31, 24.5);
  },
};
