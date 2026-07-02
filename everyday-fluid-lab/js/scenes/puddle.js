// シーン: 雨あがりの水たまりで バシャバシャ → 虹がでる!
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad, sun, cloud } from '../engine/art.js';

const RAINBOW = ['#ff4a4a', '#ff9c3a', '#ffe23a', '#4ad06a', '#3ab8e8', '#4a6ae8', '#9a4ae8'];

export default {
  id: 'puddle',
  name: '雨あがりの水たまり',
  emoji: '🌈',
  desc: 'バシャバシャしたら 虹がでた!',
  goal: '🎯 しぶきをたくさん あげて 虹をだそう!',
  clearMsg: '大きな虹がでた!',
  maxParticles: 2800,
  view: { shine: 1.5, refract: 1.2, thresh: 0.34 },

  init(ctx) {
    const d = ctx.data;
    d.mist = 0;
    d.rainbow = 0;
    d.boot = null; // {x, y, t}
    d.stompCount = 0;
    ctx.sim.definePhase(0, {
      sigma: 2.5, beta: 1.4, grav: 1, mix: 0,
      color: [0.52, 0.68, 0.78], alpha: 0.42,
    });
    ctx.setHint('タップで ながぐつ ドッスン!ドラッグで ざぶざぶ');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.groundY = H - Math.min(H * 0.24, 40);
    d.skyH = d.groundY - 18;
    if (!d.filled) {
      d.filled = true;
      ctx.fill(2, d.groundY - 0, W - 2, H - 3, 0, 1.5);
      // 葉っぱ
      for (let i = 0; i < 3; i++) {
        const so = ctx.sim.addSolid({
          x: rand(10, W - 10), y: d.groundY - 6,
          r: 2.4, density: 0.22, drag: 5, upright: 1.5,
        });
        so.data.leaf = i;
      }
    }
  },

  // タップした瞬間にドッスン (イベント駆動で取りこぼさない)
  onDown(ctx, p) {
    const d = ctx.data, s = ctx.sim;
    if (d.boot && d.boot.t < 0.15) return;
    d.boot = { x: p.x, y: d.groundY, t: 0 };
    d.stompCount++;
    s.impulse(p.x, d.groundY + 6, 17, 0, 260);
    s.impulse(p.x - 9, d.groundY + 4, 10, -120, -180);
    s.impulse(p.x + 9, d.groundY + 4, 10, 120, -180);
    ctx.sfx.splash(0.95);
    ctx.fx.splashBurst(p.x, d.groundY, 110, 'rgba(180,215,240,0.9)');
    ctx.fx.addRing(p.x, d.groundY + 3, 14, 0.8);
    ctx.vibrate(25);
  },

  update(ctx, dt) {
    const d = ctx.data, s = ctx.sim, p = ctx.primary;
    const { W, H } = ctx;
    // 長ぐつ
    if (d.boot) {
      d.boot.t += dt;
      if (d.boot.t > 0.55) d.boot = null;
    }
    if (p) {
      if (p.t > 0.1) {
        // ドラッグでざぶざぶ
        const sp = Math.hypot(p.vx, p.vy);
        if (sp > 60) {
          s.impulse(p.x, Math.max(p.y, d.groundY), 12, p.vx * 0.12, p.vy * 0.12 - 30);
          if (Math.random() < dt * 6) {
            ctx.sfx.splash(Math.min(0.5, sp / 500));
            ctx.fx.splashBurst(p.x, d.groundY, Math.min(70, sp * 0.3), 'rgba(180,215,240,0.9)');
          }
        }
        if (d.boot) { d.boot.x = p.x; }
      }
    }

    // 空中のしぶき量 → 虹
    let airborne = 0;
    for (let i = 0; i < s.n; i++) {
      if (s.y[i] < d.groundY - 12) airborne++;
    }
    airborne += ctx.fx.spray.length * 0.6;
    d.mist = clamp(d.mist + (airborne > 8 ? dt * (airborne / 95) : -dt * 0.06), 0, 1);
    d.rainbow = Math.max(d.rainbow, d.mist);
    ctx.progress(d.rainbow * 1.02);
    if (d.mist > 0.35 && Math.random() < dt * 3) {
      ctx.fx.addSpark(rand(W * 0.2, W * 0.8), rand(10, d.skyH * 0.7), '#fff');
    }
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    // 雨あがりの空
    g.fillStyle = vgrad(g, 0, d.groundY, [[0, '#79b8e8'], [0.6, '#a8d4f0'], [1, '#d8ecf8']]);
    g.fillRect(0, 0, W, d.groundY);
    sun(g, W * 0.82, 16, 7);
    cloud(g, W * 0.2, 14, 1.3, 0.95);
    cloud(g, W * 0.55, 24, 0.9, 0.8);
    // 遠くの家なみ
    g.fillStyle = 'rgba(110,130,160,0.5)';
    for (let i = 0; i < Math.ceil(W / 26); i++) {
      const x = i * 26, hh = 14 + (i % 3) * 5;
      g.fillRect(x + 3, d.groundY - 16 - hh, 18, hh + 16);
      g.beginPath();
      g.moveTo(x + 1, d.groundY - 16 - hh);
      g.lineTo(x + 12, d.groundY - 25 - hh);
      g.lineTo(x + 23, d.groundY - 16 - hh);
      g.closePath(); g.fill();
    }
    // アスファルト
    g.fillStyle = vgrad(g, d.groundY - 16, H, [[0, '#8a8f9a'], [1, '#63676f']]);
    g.fillRect(0, d.groundY - 14, W, H - d.groundY + 14);
    g.fillStyle = 'rgba(50,52,58,0.5)';
    for (let x = 0; x < W; x += 17) {
      g.beginPath(); g.arc(x + 8, d.groundY - 8 + (x % 3), 1.2, 0, TAU); g.fill();
    }
    // 水たまりのくぼみ
    g.fillStyle = 'rgba(40,45,60,0.55)';
    g.beginPath();
    g.ellipse(W / 2, d.groundY + 2, W * 0.52, 4, 0, 0, TAU);
    g.fill();
    g.fillStyle = '#4a5568';
    g.fillRect(0, d.groundY + 2, W, H - d.groundY);
  },

  drawFront(ctx, g) {
    const { W } = ctx, d = ctx.data;
    // 虹 (しぶき量でうっすら→くっきり)
    if (d.rainbow > 0.03) {
      g.save();
      g.globalAlpha = clamp(d.rainbow, 0, 0.85);
      const cx = W / 2, cy = d.groundY + 6;
      const R0 = Math.min(W * 0.62, d.groundY * 0.98);
      g.lineWidth = Math.max(2.2, R0 * 0.045);
      for (let i = 0; i < RAINBOW.length; i++) {
        g.strokeStyle = RAINBOW[i];
        g.globalAlpha = clamp(d.rainbow, 0, 0.8) * (1 - i * 0.05);
        g.beginPath();
        g.arc(cx, cy, R0 - i * g.lineWidth * 0.96, Math.PI, TAU);
        g.stroke();
      }
      g.restore();
    }
    // 葉っぱ
    for (const so of ctx.sim.solids) {
      g.save();
      g.translate(so.x, so.y);
      g.rotate(so.angle * 0.4 + Math.sin(ctx.t * 2 + so.data.leaf) * 0.15);
      g.fillStyle = so.data.leaf % 2 ? '#7fb055' : '#e8a040';
      g.beginPath();
      g.ellipse(0, 0, so.r * 1.6, so.r * 0.75, 0.4, 0, TAU);
      g.fill();
      g.strokeStyle = 'rgba(90,70,30,0.6)';
      g.lineWidth = 0.35;
      g.beginPath(); g.moveTo(-so.r * 1.3, so.r * 0.5); g.lineTo(so.r * 1.3, -so.r * 0.5); g.stroke();
      g.restore();
    }
    // 長ぐつ
    if (d.boot) {
      const t = d.boot.t;
      const k = t < 0.18 ? t / 0.18 : 1;
      const lift = t > 0.3 ? (t - 0.3) * 90 : 0;
      const y = d.boot.y - 34 + 30 * k * k - lift;
      g.save();
      g.translate(d.boot.x, y);
      g.fillStyle = '#f0c840';
      // 足首
      rr(g, -5, -22, 10, 16, 2);
      g.fill();
      // つま先
      g.beginPath();
      g.moveTo(-5, -8);
      g.lineTo(-5, 2);
      g.quadraticCurveTo(-5, 5, -1, 5);
      g.lineTo(10, 5);
      g.quadraticCurveTo(13, 5, 12.5, 1.5);
      g.quadraticCurveTo(12, -2, 7, -3);
      g.lineTo(5, -8);
      g.closePath();
      g.fill();
      g.fillStyle = '#d8a820';
      rr(g, -5.5, 3, 18.5, 2.5, 1);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.35)';
      rr(g, -3.5, -20, 2.5, 12, 1);
      g.fill();
      g.restore();
    }
  },
};
