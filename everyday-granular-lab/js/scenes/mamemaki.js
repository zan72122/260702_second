// シーン: 節分のまめまき (鬼は〜外!)
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad, softShadow, eye } from '../engine/art.js';
import { SPRITES } from '../engine/grainRenderer.js';

const ONI_COLORS = ['#e85a4a', '#4a90d8', '#7ab84a'];

export default {
  id: 'mamemaki',
  name: 'せつぶんの豆まき',
  emoji: '👹',
  desc: '鬼は〜外!豆を投げてたおせ',
  goal: '🎯 豆を投げて 鬼を3たい たおそう!',
  clearMsg: '福は〜内!鬼たいじ かんりょう!',
  maxParticles: 800,
  tilt: false,
  rattlePitch: 0.8,

  init(ctx) {
    const d = ctx.data;
    d.knocked = 0;
    d.thrown = 0;
    ctx.sim.defineMaterial(0, { // 大豆
      r: 1.35, rJit: 0.1, mu: 0.45, bounce: 0.3, vmax: 240, interlock: 0.5, sleepK: 0.6,
      sprite: SPRITES.BEAN, colors: [[1, 1, 1]],
      stretch: 1.2,
    });
    ctx.setHint('タップした方へ 豆を なげるよ!鬼のかおに ぶつけよう');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.groundY = H - Math.min(H * 0.1, 16);
    d.handX = W * 0.15;
    d.handY = d.groundY - 6;
    const s = ctx.sim;
    // 鬼の台 (たな) — 右側に高さ違いで3つ
    d.onis = [];
    const baseX = W * 0.55;
    const positions = [
      [baseX, d.groundY - 4],
      [Math.min(W * 0.78, W - 18), d.groundY - Math.min(H * 0.3, 46) - 4],
      [Math.min(W * 0.92, W - 8), d.groundY - Math.min(H * 0.15, 24) - 4],
    ];
    d.shelves = [];
    positions.forEach(([x, y], i) => {
      if (i > 0) {
        // たな板
        s.colliders.push({ kind: 'box', x, y: y + 8, hw: 12, hh: 1.4, mu: 0.6 });
        d.shelves.push([x, y + 8]);
      }
      if (!d.spawned) {
        const so = s.addSolid({ x, y, r: 6, mass: 26, grav: 1, mu: 0.7 });
        so.data.oni = i;
        so.data.alive = true;
        d.onis.push(so);
      }
    });
    d.spawned = true;
  },

  onDown(ctx, p) {
    const d = ctx.data, s = ctx.sim;
    // 手もとから タップ方向へ 豆を3連射
    const dx = p.x - d.handX, dy = p.y - d.handY;
    const dist = Math.hypot(dx, dy) || 1;
    const speed = clamp(dist * 2.6, 90, 230);
    // 山なり補正 (よこ距離ぶんだけ上へ)
    const lift = Math.abs(dx) * 0.5;
    for (let k = 0; k < 3; k++) {
      const vx = dx / dist * speed * rand(0.92, 1.08);
      const vy = dy / dist * speed * rand(0.92, 1.08) - lift;
      ctx.pour(d.handX + rand(-1, 1), d.handY - 3, vx, vy, 0);
    }
    d.thrown += 3;
    d.throwT = 0.25;
    ctx.sfx.pop(1.6);
    ctx.vibrate(15);
  },

  update(ctx, dt) {
    const d = ctx.data, s = ctx.sim;
    d.throwT = Math.max(0, (d.throwT || 0) - dt);
    // 鬼に豆が当たったか (速い豆が近くに)
    for (const oni of s.solids) {
      if (!oni.data.alive) {
        // たおれた鬼は転がって消える
        oni.data.fade -= dt;
        if (oni.data.fade < 0 && oni.y < ctx.H + 20) { oni.y = ctx.H + 50; oni.vx = 0; oni.vy = 0; }
        continue;
      }
      let hit = 0;
      s.forEachInCircle(oni.x, oni.y, oni.r + 2.5, (i) => {
        const sp = Math.hypot(s.vx[i], s.vy[i]);
        if (sp > 70) hit++;
      });
      if (hit > 0) {
        oni.data.hp = (oni.data.hp ?? 2) - hit;
        oni.va += rand(-4, 4);
        if (oni.data.hp <= 0) {
          oni.data.alive = false;
          oni.data.fade = 2.2;
          oni.vy = -80;
          oni.vx = rand(30, 70);
          oni.va = 6;
          d.knocked++;
          ctx.sfx.chime();
          ctx.fx.addText(oni.x, oni.y - 10, 'おには〜そと!', '#ffe27a');
          ctx.fx.burstConfetti(oni.x, oni.y, 20);
          ctx.vibrate(40);
        } else {
          ctx.sfx.pop(0.6);
        }
      }
    }
    ctx.progress(d.knocked / 3);
    // 落ちた豆はしばらくして回収
    for (let i = s.n - 1; i >= 0; i--) {
      if (s.rest[i] > 6) s.kill(i);
    }
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    // 和室
    g.fillStyle = vgrad(g, 0, H, [[0, '#f2e4c8'], [1, '#e4d0a8']]);
    g.fillRect(0, 0, W, H);
    // 障子
    g.fillStyle = 'rgba(255,252,240,0.85)';
    rr(g, W * 0.05, 8, W * 0.4, d.groundY - 30, 2);
    g.fill();
    g.strokeStyle = '#b09468';
    g.lineWidth = 0.8;
    rr(g, W * 0.05, 8, W * 0.4, d.groundY - 30, 2);
    g.stroke();
    for (let x = W * 0.05; x < W * 0.45; x += W * 0.1) {
      g.beginPath(); g.moveTo(x, 8); g.lineTo(x, d.groundY - 22); g.stroke();
    }
    for (let y = 8; y < d.groundY - 22; y += (d.groundY - 30) / 4) {
      g.beginPath(); g.moveTo(W * 0.05, y); g.lineTo(W * 0.45, y); g.stroke();
    }
    // たたみ
    g.fillStyle = '#c8bd7a';
    g.fillRect(0, d.groundY, W, H - d.groundY);
    g.strokeStyle = 'rgba(120,110,60,0.5)';
    for (let x = 0; x < W; x += 24) {
      g.beginPath(); g.moveTo(x, d.groundY); g.lineTo(x, H); g.stroke();
    }
    // たな
    g.fillStyle = '#a2703e';
    for (const [sx, sy] of (d.shelves || [])) {
      rr(g, sx - 13, sy - 1.5, 26, 3, 1.2);
      g.fill();
    }
    // 恵方巻き (かざり)
    g.save();
    g.translate(W * 0.88, 14);
    g.fillStyle = '#2e2e2e';
    rr(g, -8, -3, 16, 6, 3);
    g.fill();
    g.fillStyle = '#f4f0e0';
    g.beginPath(); g.arc(8, 0, 2.6, 0, TAU); g.fill();
    g.fillStyle = '#e8a040';
    g.beginPath(); g.arc(8, 0, 1.4, 0, TAU); g.fill();
    g.restore();
  },

  drawFront(ctx, g) {
    const { W } = ctx, d = ctx.data;
    // 鬼たち
    for (const oni of ctx.sim.solids) {
      if (oni.y > ctx.H + 10) continue;
      const col = ONI_COLORS[oni.data.oni % 3];
      g.save();
      g.translate(oni.x, oni.y);
      g.rotate(clamp(oni.angle * 0.3, -0.7, 0.7) + (oni.data.alive ? 0 : oni.angle));
      const r = oni.r;
      // つの
      g.fillStyle = '#ffe9b8';
      for (const sgn of [-1, 1]) {
        g.beginPath();
        g.moveTo(sgn * r * 0.4, -r * 0.75);
        g.lineTo(sgn * r * 0.6, -r * 1.45);
        g.lineTo(sgn * r * 0.75, -r * 0.65);
        g.closePath();
        g.fill();
      }
      // 顔
      g.fillStyle = col;
      g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
      // 髪
      g.fillStyle = 'rgba(40,30,30,0.85)';
      g.beginPath(); g.arc(0, -r * 0.62, r * 0.62, Math.PI, TAU); g.fill();
      if (oni.data.alive) {
        eye(g, -r * 0.35, -r * 0.1, r * 0.2, 0);
        eye(g, r * 0.35, -r * 0.1, r * 0.2, 0);
        // きば
        g.fillStyle = '#fff';
        for (const sgn of [-1, 1]) {
          g.beginPath();
          g.moveTo(sgn * r * 0.3, r * 0.45);
          g.lineTo(sgn * r * 0.42, r * 0.2);
          g.lineTo(sgn * r * 0.18, r * 0.32);
          g.closePath();
          g.fill();
        }
        g.strokeStyle = '#5a2a1a';
        g.lineWidth = 0.6;
        g.beginPath(); g.arc(0, r * 0.28, r * 0.32, 0.4, Math.PI - 0.4); g.stroke();
      } else {
        // やられ顔 (×目)
        g.strokeStyle = '#fff';
        g.lineWidth = 0.8;
        for (const sgn of [-1, 1]) {
          const ex = sgn * r * 0.35, ey = -r * 0.1, er = r * 0.16;
          g.beginPath(); g.moveTo(ex - er, ey - er); g.lineTo(ex + er, ey + er); g.stroke();
          g.beginPath(); g.moveTo(ex + er, ey - er); g.lineTo(ex - er, ey + er); g.stroke();
        }
      }
      g.restore();
    }
    // 投げる手と枡
    g.save();
    g.translate(d.handX, d.handY);
    const lift = (d.throwT || 0) > 0 ? -4 : 0;
    // 枡 (豆の箱)
    g.fillStyle = '#d8a860';
    g.beginPath();
    g.moveTo(-8, -4 + lift);
    g.lineTo(-6.5, 4 + lift);
    g.lineTo(6.5, 4 + lift);
    g.lineTo(8, -4 + lift);
    g.closePath();
    g.fill();
    g.strokeStyle = '#a87838';
    g.lineWidth = 0.7;
    g.stroke();
    // 豆
    g.fillStyle = '#e8c880';
    for (let k = 0; k < 6; k++) {
      g.beginPath();
      g.ellipse(-5 + k * 2, -4.5 + lift + (k % 2), 1.2, 0.9, 0.3, 0, TAU);
      g.fill();
    }
    g.restore();
    // スコア
    g.fillStyle = 'rgba(255,255,255,0.92)';
    rr(g, W - 34, 16, 32, 12, 3);
    g.fill();
    g.fillStyle = '#a04a3a';
    g.font = 'bold 5px sans-serif';
    g.fillText(`👹 ${d.knocked}/3`, W - 31, 24.5);
  },
};
