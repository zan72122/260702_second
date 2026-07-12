// シーン: 地震の液状化実験 (振動で重い物は沈み、軽い物は浮く)
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad, softShadow } from '../engine/art.js';
import { SPRITES } from '../engine/grainRenderer.js';

export default {
  id: 'liquefaction',
  name: '液状化のぼうさい実験',
  emoji: '🌊',
  desc: 'ゆらすと 地面が液体みたいに…',
  goal: '🎯 じしんを起こして「家が沈む」「マンホールが浮く」を観察しよう!',
  clearMsg: '液状化のしくみ、ばっちり観察できた!',
  maxParticles: 5500,
  tilt: false,
  rattlePitch: 0.9,

  init(ctx) {
    const d = ctx.data;
    d.quake = 0;
    d.houseSank = false;
    d.pipeRose = false;
    ctx.sim.defineMaterial(0, { // ゆるい砂地盤
      r: 0.78, rJit: 0.1, mu: 0.7, interlock: 2, vmax: 70,
      sprite: SPRITES.SAND,
      colors: [[0.82, 0.72, 0.55], [0.76, 0.66, 0.48], [0.87, 0.78, 0.6]],
    });
    ctx.setHint('タップ連打で じしん!家とマンホールを よく見てて');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.groundY = H - Math.min(H * 0.42, 66);
    if (!d.filled) {
      d.filled = true;
      ctx.fill(2, d.groundY, W - 2, H - 3, 0);
      const s = ctx.sim;
      // 家 (重い) — 地表に乗せる
      d.house = s.addSolid({
        x: W * 0.3, y: d.groundY - 6,
        r: 7, mass: 160, grav: 1.7, mu: 0.8,
      });
      d.houseY0 = d.house.y;
      // 下水管 (軽い) — 地中に埋まっている
      d.pipe = s.addSolid({
        x: W * 0.68, y: Math.min(H - 14, d.groundY + 24),
        r: 5, mass: 7, grav: 0.35, mu: 0.4,
      });
      d.pipeY0 = d.pipe.y;
    }
  },

  onDown(ctx, p) {
    const d = ctx.data, s = ctx.sim;
    // じしん! (底から複数点で突き上げ)
    d.quake = 0.35;
    for (const fx of [0.2, 0.5, 0.8]) {
      s.impulse(ctx.W * fx, ctx.H - 4, 26, rand(-25, 25), -rand(60, 85));
    }
    s.wakeAll();
    ctx.sfx.splash(0.4);
    ctx.sfx.setRattle(0.8, 0.7);
    ctx.vibrate(30);
  },

  update(ctx, dt) {
    const d = ctx.data;
    d.quake = Math.max(0, d.quake - dt);
    if (!d.house) return;
    // 観察チェック
    const sank = d.house.y - d.houseY0 > 9;
    const rose = d.pipeY0 - d.pipe.y > 12;
    if (sank && !d.houseSank) {
      d.houseSank = true;
      ctx.toast('🏠 家がかたむいて沈んだ!(液状化)');
      ctx.sfx.chime();
    }
    if (rose && !d.pipeRose) {
      d.pipeRose = true;
      ctx.toast('🕳️ マンホールが浮き上がった!');
      ctx.sfx.chime();
    }
    ctx.progress((d.houseSank ? 0.5 : Math.min(0.45, (d.house.y - d.houseY0) / 20)) +
                 (d.pipeRose ? 0.5 : Math.min(0.45, (d.pipeY0 - d.pipe.y) / 26)));
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    g.fillStyle = vgrad(g, 0, H, [[0, '#a8c8e8'], [0.6, '#cfe2f4'], [1, '#e8f2fc']]);
    g.fillRect(0, 0, W, H);
    // 実験パネル
    g.fillStyle = 'rgba(255,255,255,0.9)';
    rr(g, 4, 16, Math.min(52, W * 0.46), 26, 3);
    g.fill();
    g.fillStyle = '#385a8a';
    g.font = 'bold 3.2px sans-serif';
    g.fillText('ぼうさい実験', 7, 22);
    g.font = '2.6px sans-serif';
    g.fillText('ゆるい砂地ばんは 揺れると', 7, 27);
    g.fillText('液体のように ふるまう', 7, 31);
    g.fillText('→ 重い物は沈み 軽い物は浮く', 7, 35.5);
    // 地盤の器 (実験水槽風)
    g.strokeStyle = 'rgba(120,160,190,0.8)';
    g.lineWidth = 1.4;
    g.strokeRect(0.7, d.groundY - 20, W - 1.4, H - d.groundY + 19);
  },

  drawFront(ctx, g) {
    const d = ctx.data;
    const jx = d.quake > 0 ? rand(-1.2, 1.2) : 0;
    // 家
    const h = d.house;
    if (h) {
      g.save();
      g.translate(h.x + jx, h.y);
      g.rotate(clamp(h.angle * 0.4, -0.5, 0.5));
      g.fillStyle = '#f0e8d8';
      rr(g, -6.5, -5, 13, 10, 1);
      g.fill();
      g.fillStyle = '#c05a48';
      g.beginPath();
      g.moveTo(-8, -5);
      g.lineTo(0, -11);
      g.lineTo(8, -5);
      g.closePath();
      g.fill();
      g.fillStyle = '#8a6a4a';
      rr(g, -1.6, 0, 3.2, 5, 0.5);
      g.fill();
      g.fillStyle = '#a8d0e8';
      rr(g, 2.2, -3.2, 3, 3, 0.5);
      g.fill();
      g.restore();
    }
    // マンホール (土管)
    const pp = d.pipe;
    if (pp) {
      g.save();
      g.translate(pp.x + jx, pp.y);
      g.rotate(pp.angle * 0.2);
      const grd = g.createRadialGradient(-1, -1, 1, 0, 0, pp.r);
      grd.addColorStop(0, '#9aa2ae');
      grd.addColorStop(1, '#5a626e');
      g.fillStyle = grd;
      g.beginPath(); g.arc(0, 0, pp.r, 0, TAU); g.fill();
      g.strokeStyle = '#3a424e';
      g.lineWidth = 0.6;
      g.beginPath(); g.arc(0, 0, pp.r * 0.7, 0, TAU); g.stroke();
      g.font = `bold ${pp.r * 0.55}px sans-serif`;
      g.fillStyle = '#3a424e';
      g.textAlign = 'center';
      g.fillText('下水', 0, pp.r * 0.2);
      g.textAlign = 'left';
      g.restore();
    }
    // チェックリスト
    g.fillStyle = 'rgba(255,255,255,0.92)';
    rr(g, ctx.W - 46, 16, 44, 17, 3);
    g.fill();
    g.font = 'bold 3.4px sans-serif';
    g.fillStyle = d.houseSank ? '#2a9a4a' : '#99a';
    g.fillText(`${d.houseSank ? '✅' : '⬜'} 家がしずむ`, ctx.W - 43, 22.5);
    g.fillStyle = d.pipeRose ? '#2a9a4a' : '#99a';
    g.fillText(`${d.pipeRose ? '✅' : '⬜'} 管がうく`, ctx.W - 43, 28.5);
  },
};
