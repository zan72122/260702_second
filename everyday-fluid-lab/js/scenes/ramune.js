// シーン: ラムネをグラスにそそぐ (炭酸シュワシュワ)
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad, woodTable, softShadow, glassShine } from '../engine/art.js';
import { surfaceY } from './common.js';

export default {
  id: 'ramune',
  name: 'ラムネをそそごう',
  emoji: '🥤',
  desc: 'シュワシュワ〜 せんまで ぴったり!',
  goal: '🎯 あふれさせずに せんまで そそごう!',
  clearMsg: 'かんぺきな一杯!',
  maxParticles: 2400,
  view: { shine: 1.6, refract: 1.4, thresh: 0.36 },

  init(ctx) {
    const d = ctx.data;
    d.acc = 0;
    d.stableT = 0;
    d.spillShown = false;
    d.fizz = 0;
    ctx.sim.definePhase(0, { // ラムネ
      sigma: 2.5, beta: 1.4, grav: 1, mix: 0,
      color: [0.62, 0.85, 0.95], alpha: 0.35,
    });
    ctx.setTools([{ id: 'marble', icon: '🔮', label: 'ビー玉ぽちゃん' }]);
    ctx.setHint('タッチで そそぐ。いきおいが よすぎると あわが…!');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.cx = W / 2;
    d.gw = Math.min(W * 0.4, 44);
    d.top = Math.max(H * 0.26, 30);
    d.bottom = Math.min(H - 20, d.top + Math.min(H * 0.52, 92));
    d.lineY = d.top + (d.bottom - d.top) * 0.32; // せん (目標ライン)
    d.tableY = d.bottom + 4;
    ctx.addCup(d.cx, d.top, d.bottom, d.gw, 1.8);
  },

  update(ctx, dt) {
    const d = ctx.data, s = ctx.sim, p = ctx.primary;
    const { W, H } = ctx;
    const pouring = !!p && p.y < d.bottom;
    if (pouring) {
      d.acc += 150 * dt;
      while (d.acc >= 1) {
        d.acc -= 1;
        ctx.pour(p.x + rand(-1, 1), p.y - 2, 0, 60, 0);
      }
      ctx.sfx.setPour(0.7);
    } else {
      d.acc = 0;
      ctx.sfx.setPour(0);
    }

    // 炭酸: 若い粒子ほど泡を出す
    let bubbleRate = 0;
    for (let i = 0; i < s.n; i += 2) {
      const carb = Math.max(0, 1 - s.age[i] / 14);
      if (carb > 0 && Math.random() < dt * carb * 0.9) {
        ctx.fx.addBubble(s.x[i], s.y[i], rand(0.35, 0.9), rand(-30, -18));
        bubbleRate++;
      }
    }
    d.fizz = d.fizz * 0.92 + Math.min(1, ctx.fx.bubbles.length / 120) * 0.08;
    ctx.sfx.setFizz(d.fizz * 0.9);

    // こぼれチェック
    if (!d.spillShown) {
      for (let i = 0; i < s.n; i++) {
        if (s.y[i] > d.bottom - 4 && Math.abs(s.x[i] - d.cx) > d.gw / 2 + 6) {
          d.spillShown = true;
          ctx.toast('💦 あわわ!こぼれちゃった!');
          ctx.sfx.splash(0.6);
          break;
        }
      }
    }

    // 液面と目標ライン
    const sy = surfaceY(s, d.cx, d.top - 10, d.bottom, 1.6);
    d.surf = sy;
    const diff = sy - d.lineY; // 正: まだ足りない
    const near = Math.abs(diff) < 3.2;
    const calmness = Math.abs(s.velocityAt(d.cx, sy + 4)[1]) < 9;
    if (near && !pouring && calmness) {
      d.stableT += dt;
      ctx.progress(Math.min(1, d.stableT / 1.2));
    } else {
      d.stableT = 0;
      const fillFrac = clamp(1 - Math.max(0, diff) / (d.bottom - d.lineY), 0, 1);
      if (!ctx._cleared) ctx.progress(Math.min(0.9, fillFrac * 0.9));
    }
  },

  onTool(ctx, id) {
    const d = ctx.data;
    if (id !== 'marble' || ctx.sim.solids.length >= 2) return;
    const so = ctx.sim.addSolid({
      x: d.cx + rand(-6, 6), y: d.top - 24,
      r: 3, density: 2.2, drag: 2,
    });
    so.hitWall = (v) => { if (v > 25) ctx.sfx.clink(); };
    so.data.marble = true;
    d.marbleFizzed = false;
    ctx.toast('🔮 ビー玉 いきまーす!');
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    g.fillStyle = vgrad(g, 0, H, [[0, '#fff8e8'], [1, '#ffeccc']]);
    g.fillRect(0, 0, W, H);
    // レトロな旗飾り
    for (let i = 0; i < Math.ceil(W / 14); i++) {
      g.fillStyle = ['#ff8a8a', '#8ad0ff', '#ffd88a'][i % 3];
      g.beginPath();
      g.moveTo(i * 14, 0); g.lineTo(i * 14 + 14, 0); g.lineTo(i * 14 + 7, 9);
      g.closePath(); g.fill();
    }
    woodTable(g, W, d.tableY, H, 1);
    softShadow(g, d.cx, d.tableY + 2, d.gw * 0.8, 3, 0.18);
    // グラス
    const x0 = d.cx - d.gw / 2 - 2.6, wgl = d.gw + 5.2;
    g.fillStyle = 'rgba(210,235,250,0.2)';
    rr(g, x0, d.top - 2, wgl, d.bottom - d.top + 5, 3);
    g.fill();
    g.strokeStyle = 'rgba(180,215,240,0.7)';
    g.lineWidth = 1;
    rr(g, x0, d.top - 2, wgl, d.bottom - d.top + 5, 3);
    g.stroke();
    glassShine(g, x0 + 2, d.top + 8, wgl, d.bottom - d.top - 14);
    // 目標ライン
    g.strokeStyle = 'rgba(232,90,90,0.9)';
    g.lineWidth = 0.9;
    g.setLineDash([2.4, 1.6]);
    g.beginPath();
    g.moveTo(x0 - 5, d.lineY);
    g.lineTo(x0 + wgl + 5, d.lineY);
    g.stroke();
    g.setLineDash([]);
    g.fillStyle = '#e85a5a';
    g.font = 'bold 3.6px sans-serif';
    g.fillText('せん▶', x0 - 14, d.lineY + 1.2);
  },

  drawFront(ctx, g) {
    const d = ctx.data, p = ctx.primary, s = ctx.sim;
    // ビー玉
    for (const so of s.solids) {
      // 着水フィズ
      if (so.data.marble && !d.marbleFizzed && so.wet > 0.4) {
        d.marbleFizzed = true;
        s.impulse(so.x, so.y, 14, 0, -60);
        for (let i = 0; i < 26; i++) ctx.fx.addBubble(so.x + rand(-8, 8), so.y + rand(-4, 4), rand(0.4, 1.1), rand(-45, -25));
        ctx.fx.splashBurst(so.x, so.y - 4, 80, 'rgba(190,230,250,0.9)');
        ctx.sfx.splash(0.9);
        ctx.toast('🫧 シュワシュワ〜!');
      }
      const grd = g.createRadialGradient(so.x - 1, so.y - 1, 0.4, so.x, so.y, so.r);
      grd.addColorStop(0, 'rgba(255,255,255,0.95)');
      grd.addColorStop(0.4, 'rgba(150,220,255,0.75)');
      grd.addColorStop(1, 'rgba(60,140,220,0.85)');
      g.fillStyle = grd;
      g.beginPath(); g.arc(so.x, so.y, so.r, 0, TAU); g.fill();
    }
    // グラスふち
    g.fillStyle = 'rgba(220,240,255,0.35)';
    rr(g, d.cx - d.gw / 2 - 2.6, d.top - 3, d.gw + 5.2, 2, 1);
    g.fill();
    // ラムネびん
    if (p && p.y < d.bottom) {
      g.save();
      g.translate(p.x, p.y - 12);
      g.rotate(0.5 + Math.sin(ctx.t * 5) * 0.04);
      g.fillStyle = 'rgba(120,200,230,0.85)';
      g.beginPath();
      g.moveTo(-2.2, 14);   // 口
      g.lineTo(2.2, 14);
      g.lineTo(2.8, 6);
      g.quadraticCurveTo(6, 2, 5.5, -4);  // くびれ
      g.lineTo(5.5, -14);
      g.quadraticCurveTo(5.5, -17, 0, -17);
      g.quadraticCurveTo(-5.5, -17, -5.5, -14);
      g.lineTo(-5.5, -4);
      g.quadraticCurveTo(-6, 2, -2.8, 6);
      g.closePath();
      g.fill();
      // ビー玉 (びんの中)
      g.fillStyle = 'rgba(255,255,255,0.85)';
      g.beginPath(); g.arc(0, 5, 1.8, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.4)';
      rr(g, -4.2, -14, 2, 12, 1);
      g.fill();
      g.restore();
    }
  },
};
