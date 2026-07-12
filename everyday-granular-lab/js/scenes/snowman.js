// シーン: 雪だるまづくり (雪玉を転がすと大きくなる!)
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad, eye, softShadow } from '../engine/art.js';
import { SPRITES } from '../engine/grainRenderer.js';

export default {
  id: 'snowman',
  name: '雪だるまづくり',
  emoji: '☃️',
  desc: 'ころころ転がすと 雪玉が育つ',
  goal: '🎯 雪玉を2つ育てて重ねて、顔をつけよう!',
  clearMsg: 'かわいい雪だるまの完成!',
  maxParticles: 5500,
  rattle: 0.25,

  init(ctx) {
    const d = ctx.data;
    d.held = null;
    d.stacked = false;
    d.decorated = false;
    d.snowT = 0;
    ctx.sim.defineMaterial(0, { // 雪
      r: 0.8, rJit: 0.1, mu: 1.0, coh: 0.5, vmax: 40,
      interlock: 4, packable: true, flutter: 30,
      sprite: SPRITES.SNOW,
      colors: [[1, 1, 1], [0.96, 0.98, 1]],
    });
    ctx.setTools([
      { id: 'ball', icon: '⚪', label: 'あたらしい雪玉' },
      { id: 'deco', icon: '🥕', label: 'かおをつける' },
    ]);
    ctx.setHint('雪玉をつかんで 雪の上を ころころ…どんどん大きくなる!');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.groundY = H - Math.min(H * 0.3, 46);
    if (!d.filled) {
      d.filled = true;
      ctx.fill(2, d.groundY - 4, W - 2, H - 4, 0);
      this._spawnBall(ctx);
    }
  },

  _spawnBall(ctx) {
    const so = ctx.sim.addSolid({
      x: ctx.W / 2 + rand(-14, 14), y: ctx.H * 0.3,
      r: 3.2, mass: 10, grav: 1, mu: 0.9,
    });
    so.data.snowball = true;
    return so;
  },

  onDown(ctx, p) {
    const d = ctx.data;
    // 近くの雪玉をつかむ
    let best = null, bd = 1e9;
    for (const so of ctx.sim.solids) {
      const dd = Math.hypot(so.x - p.x, so.y - p.y);
      if (dd < so.r + 5 && dd < bd) { best = so; bd = dd; }
    }
    if (best) {
      d.held = best;
      best.kinematic = true;
      d.stacked = this._checkStack(ctx) != null;
    }
  },

  onUp(ctx, p) {
    const d = ctx.data;
    if (d.held) {
      d.held.kinematic = false;
      d.held.vx = clamp(p.vx, -220, 220);
      d.held.vy = clamp(p.vy, -220, 220);
      d.held = null;
    }
  },

  _checkStack(ctx) {
    const balls = ctx.sim.solids.filter((s) => s.data.snowball);
    for (const a of balls) {
      for (const b of balls) {
        if (a === b) continue;
        // b が a の上に乗っている (a が大きい)
        if (a.r >= b.r * 1.15 && b.r > 5 &&
            Math.abs(a.x - b.x) < a.r * 0.5 &&
            a.y - b.y > (a.r + b.r) * 0.75 &&
            Math.abs(b.vx) + Math.abs(b.vy) < 25) {
          return { base: a, head: b };
        }
      }
    }
    return null;
  },

  update(ctx, dt) {
    const d = ctx.data, s = ctx.sim, p = ctx.primary;
    const { W, H } = ctx;
    // 雪がしんしんと降る
    d.snowT += dt;
    if (d.snowT > 0.07 && s.n < s.max - 10) {
      d.snowT = 0;
      s.emit(rand(3, W - 3), -4, rand(-4, 4), 18, 0);
    }
    // つかんでいる雪玉
    if (d.held && p) {
      const so = d.held;
      so.vx = clamp((p.x - so.x) / Math.max(dt, 1e-3), -240, 240);
      so.vy = clamp((p.y - so.y) / Math.max(dt, 1e-3), -240, 240);
      so.x += (p.x - so.x) * Math.min(1, dt * 18);
      so.y += (p.y - so.y) * Math.min(1, dt * 18);
      so.va = so.vx / so.r;
      so.angle += so.va * dt;
    }
    // 転がる雪玉は雪を吸収して育つ
    for (const so of s.solids) {
      if (!so.data.snowball || so.r >= 15) continue;
      const sp = Math.hypot(so.vx, so.vy);
      if (sp < 18) continue;
      let grown = 0;
      s.forEachInCircle(so.x, so.y + so.r * 0.3, so.r + 1.8, (i) => {
        if (grown >= 6) return;
        s.kill(i);
        grown++;
      });
      if (grown > 0) {
        so.r = Math.min(15, Math.sqrt(so.r * so.r + grown * 0.6));
        so.mass = so.r * so.r;
        if (Math.random() < dt * 20) ctx.fx.addSpark(so.x + rand(-so.r, so.r), so.y + rand(-so.r, so.r), '#fff');
      }
    }
    // 高速で壁にぶつかった雪玉は くだけて雪にもどる
    for (let k = s.solids.length - 1; k >= 0; k--) {
      const so = s.solids[k];
      if (!so.data.snowball || so === d.held) continue;
      if (so.data.burst) {
        s.solids.splice(k, 1);
        const nb = Math.min(150, (so.r * so.r * 1.6) | 0);
        for (let i = 0; i < nb; i++) {
          const a = rand(TAU);
          const rr2 = rand(0, so.r * 0.8);
          const j = s.emit(so.x + Math.cos(a) * rr2, so.y + Math.sin(a) * rr2, rand(-40, 40), rand(-50, 10), 0);
          if (j >= 0) s.pack[j] = 0.45; // 固めた雪玉の破片はしまっている
        }
        for (let i = 0; i < 6; i++) ctx.fx.addDust(so.x + rand(-6, 6), so.y + rand(-6, 6), rand(2.5, 4.5), '238,243,252');
        ctx.sfx.splash(0.7);
        ctx.toast('☃️ パフッ!くだけちゃった');
        continue;
      }
    }
    for (const so of s.solids) {
      if (so.data.snowball && !so.hitWall) {
        so.hitWall = (v) => { if (v > 95) so.data.burst = true; };
      }
    }

    // 積み上げ判定
    const st = this._checkStack(ctx);
    if (st && !d.stacked) {
      d.stacked = true;
      d.stack = st;
      ctx.toast('☃️ つみあがった!「かおをつける」で仕上げ!');
      ctx.sfx.chime();
    }
    if (st) d.stack = st;

    // 進捗
    const big = Math.max(4, ...s.solids.filter((x) => x.data.snowball).map((x) => x.r));
    ctx.progress(clamp((big - 3.2) / 8 * 0.5 + (d.stacked ? 0.3 : 0) + (d.decorated ? 0.2 : 0), 0, d.decorated ? 1 : 0.97));
  },

  onTool(ctx, id) {
    const d = ctx.data;
    if (id === 'ball') {
      if (ctx.sim.solids.filter((s) => s.data.snowball).length < 4) {
        this._spawnBall(ctx);
        ctx.sfx.pop(1.2);
      }
      return;
    }
    if (id === 'deco') {
      if (d.stacked && d.stack) {
        d.decorated = true;
        ctx.sfx.chime();
        for (let i = 0; i < 12; i++) ctx.fx.addSpark(d.stack.head.x + rand(-8, 8), d.stack.head.y + rand(-8, 8), '#fff');
      } else {
        ctx.toast('まず 大きい玉の上に 小さい玉を のせよう!');
      }
    }
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    g.fillStyle = vgrad(g, 0, H, [[0, '#324a78'], [0.6, '#5a74a8'], [1, '#8ba3cc']]);
    g.fillRect(0, 0, W, H);
    // 月と星
    g.fillStyle = '#fff8d8';
    g.beginPath(); g.arc(W * 0.82, 16, 6, 0, TAU); g.fill();
    g.fillStyle = 'rgba(50,74,120,1)';
    g.beginPath(); g.arc(W * 0.84, 14.5, 5, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 20; i++) {
      const x = (i * 37.3) % W, y = (i * 23.7) % (H * 0.5);
      g.fillRect(x, y, 0.7, 0.7);
    }
    // 遠くの家
    g.fillStyle = 'rgba(40,50,80,0.8)';
    rr(g, W * 0.06, d.groundY - 26, 24, 22, 2);
    g.fill();
    g.beginPath();
    g.moveTo(W * 0.06 - 3, d.groundY - 26);
    g.lineTo(W * 0.06 + 12, d.groundY - 38);
    g.lineTo(W * 0.06 + 27, d.groundY - 26);
    g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,220,130,0.9)';
    rr(g, W * 0.06 + 8, d.groundY - 20, 7, 7, 1);
    g.fill();
    // 地面 (雪の下)
    g.fillStyle = '#e8eef8';
    g.fillRect(0, d.groundY + 2, W, H - d.groundY);
  },

  drawFront(ctx, g) {
    const d = ctx.data;
    // 雪玉
    for (const so of ctx.sim.solids) {
      if (!so.data.snowball) continue;
      g.save();
      g.translate(so.x, so.y);
      softShadow(g, 0, so.r + 1.5, so.r * 0.9, 1.8, 0.12);
      g.rotate(so.angle);
      const gr = g.createRadialGradient(-so.r * 0.3, -so.r * 0.3, so.r * 0.2, 0, 0, so.r);
      gr.addColorStop(0, '#ffffff');
      gr.addColorStop(1, '#d8e2f0');
      g.fillStyle = gr;
      g.beginPath(); g.arc(0, 0, so.r, 0, TAU); g.fill();
      // 転がり模様
      g.strokeStyle = 'rgba(170,190,220,0.5)';
      g.lineWidth = 0.6;
      g.beginPath(); g.arc(so.r * 0.2, 0, so.r * 0.55, 0.4, 2.2); g.stroke();
      g.beginPath(); g.arc(-so.r * 0.15, so.r * 0.1, so.r * 0.75, 2.8, 4.4); g.stroke();
      g.restore();
    }
    // デコ (完成した雪だるま)
    if (d.decorated && d.stack) {
      const h = d.stack.head;
      g.save();
      g.translate(h.x, h.y);
      // ぼうし
      g.fillStyle = '#d8443a';
      rr(g, -h.r * 0.55, -h.r - 4.5, h.r * 1.1, 4, 1);
      g.fill();
      rr(g, -h.r * 0.8, -h.r - 1.5, h.r * 1.6, 2, 1);
      g.fill();
      // 目
      eye(g, -h.r * 0.32, -h.r * 0.15, h.r * 0.13, 0);
      eye(g, h.r * 0.32, -h.r * 0.15, h.r * 0.13, 0);
      // にんじんの鼻
      g.fillStyle = '#f08828';
      g.beginPath();
      g.moveTo(0, h.r * 0.05);
      g.lineTo(h.r * 0.55, h.r * 0.28);
      g.lineTo(0, h.r * 0.38);
      g.closePath();
      g.fill();
      // 口
      g.strokeStyle = '#5a4a3a';
      g.lineWidth = 0.5;
      g.beginPath(); g.arc(0, h.r * 0.3, h.r * 0.3, 0.5, Math.PI - 0.5); g.stroke();
      g.restore();
      // えだの腕
      const b = d.stack.base;
      g.strokeStyle = '#7a5230';
      g.lineWidth = 1;
      for (const sgn of [-1, 1]) {
        g.beginPath();
        g.moveTo(b.x + sgn * b.r * 0.8, b.y - b.r * 0.3);
        g.lineTo(b.x + sgn * (b.r + 8), b.y - b.r * 0.7 - 4);
        g.stroke();
        g.beginPath();
        g.moveTo(b.x + sgn * (b.r + 4), b.y - b.r * 0.5 - 2);
        g.lineTo(b.x + sgn * (b.r + 7), b.y - b.r * 0.2 - 2);
        g.stroke();
      }
    }
  },
};
