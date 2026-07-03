// シーン: 公園でハトにエサやり
import { TAU, rand, clamp, pick } from '../engine/utils.js';
import { rr, vgrad, sun, cloud, softShadow, eye } from '../engine/art.js';
import { SPRITES } from '../engine/grainRenderer.js';

export default {
  id: 'pigeons',
  name: 'ハトにエサやり',
  emoji: '🕊️',
  desc: 'まくと クルック― と やってくる',
  goal: '🎯 ハトに エサを35つぶ たべてもらおう!',
  clearMsg: 'ハトと なかよしになった!',
  maxParticles: 900,
  tilt: false,
  rattle: 0.4,

  init(ctx) {
    const d = ctx.data;
    d.eaten = 0;
    d.birds = [];
    d.cooT = 0;
    ctx.sim.defineMaterial(0, { // 麦つぶ
      r: 0.8, rJit: 0.1, mu: 0.7, vmax: 120,
      sprite: SPRITES.SEED, colors: [[1, 1, 1], [0.95, 0.9, 0.8]],
      stretch: 1.5,
    });
    ctx.setHint('タップで エサを パラパラ〜。そーっとしてると ハトが たべにくるよ');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.groundY = H - Math.min(H * 0.14, 22);
    if (!d.spawned) {
      d.spawned = true;
      for (let k = 0; k < 4; k++) {
        d.birds.push({
          x: k % 2 ? -12 - k * 8 : W + 12 + k * 8,
          y: d.groundY,
          vx: 0, dir: k % 2 ? 1 : -1,
          state: 'wait', // wait | walk | peck | flee
          peckT: 0, bobT: rand(TAU), fleeT: 0,
          tone: pick([0, 1, 2]),
        });
      }
    }
  },

  onDown(ctx, p) {
    const d = ctx.data;
    // エサを放り投げる
    for (let k = 0; k < 7; k++) {
      ctx.pour(p.x + rand(-2, 2), Math.min(p.y, d.groundY - 20), rand(-28, 28), rand(-30, 5), 0);
    }
    ctx.sfx.pop(0.5);
    // 近くのハトはびっくり
    for (const b of d.birds) {
      if (Math.abs(b.x - p.x) < 22 && b.state !== 'wait') {
        b.state = 'flee';
        b.fleeT = rand(1.2, 2);
      }
    }
  },

  update(ctx, dt) {
    const d = ctx.data, s = ctx.sim;
    const { W, H } = ctx;
    d.cooT -= dt;
    // ハトの行動
    for (const b of d.birds) {
      b.bobT += dt * 8;
      // 一番近い地面のエサ
      let tx = null, td = 1e9, ti = -1;
      for (let i = 0; i < s.n; i++) {
        if (s.rest[i] < 0.3) continue; // 転がり中はねらわない
        const dd = Math.abs(s.x[i] - b.x);
        if (dd < td) { td = dd; tx = s.x[i]; ti = i; }
      }
      if (b.state === 'wait') {
        if (tx !== null && s.n > 4) {
          b.state = 'walk';
        }
      } else if (b.state === 'flee') {
        b.fleeT -= dt;
        const away = b.x < W / 2 ? -1 : 1;
        b.x += away * 55 * dt;
        b.y = d.groundY - Math.abs(Math.sin(b.bobT * 2)) * 6 - 4;
        if (b.fleeT <= 0) { b.state = tx !== null ? 'walk' : 'wait'; b.y = d.groundY; }
      } else if (tx === null) {
        b.state = 'wait';
        // ふらふら歩く
        b.x += Math.sin(b.bobT * 0.2) * 6 * dt;
      } else if (b.state === 'walk') {
        b.y = d.groundY;
        const dir = tx > b.x ? 1 : -1;
        b.dir = dir;
        b.x += dir * 34 * dt;
        if (td < 4) { b.state = 'peck'; b.peckT = 0; }
      } else if (b.state === 'peck') {
        b.peckT += dt;
        if (b.peckT > 0.42) {
          b.peckT = 0;
          if (ti >= 0 && Math.abs(s.x[ti] - b.x) < 6) {
            s.kill(ti);
            d.eaten++;
            if (Math.random() < 0.3) { ctx.sfx.coo(); }
            if (Math.random() < 0.4) ctx.fx.addText(b.x, d.groundY - 16, '♪', '#fff');
          } else {
            b.state = 'walk';
          }
        }
      }
      b.x = clamp(b.x, -20, W + 20);
    }
    if (d.cooT <= 0) {
      d.cooT = rand(3, 7);
      if (d.birds.some((b) => b.state !== 'wait')) ctx.sfx.coo();
    }
    ctx.progress(d.eaten / 35);
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    g.fillStyle = vgrad(g, 0, H, [[0, '#9ed4f2'], [0.7, '#cfeafa'], [1, '#e8f6ff']]);
    g.fillRect(0, 0, W, H);
    sun(g, W * 0.14, 13, 5.5);
    cloud(g, W * 0.55, 15, 1, 0.9);
    cloud(g, W * 0.85, 26, 0.75, 0.8);
    // 並木
    for (let i = 0; i < Math.ceil(W / 40); i++) {
      const x = 20 + i * 40;
      g.fillStyle = '#8a6a48';
      rr(g, x - 1.5, d.groundY - 26, 3, 26, 1);
      g.fill();
      g.fillStyle = i % 2 ? '#6fae58' : '#7fbc60';
      g.beginPath(); g.arc(x, d.groundY - 30, 11, 0, TAU); g.fill();
      g.beginPath(); g.arc(x - 7, d.groundY - 24, 8, 0, TAU); g.fill();
      g.beginPath(); g.arc(x + 7, d.groundY - 24, 8, 0, TAU); g.fill();
    }
    // ベンチ
    g.fillStyle = '#a2703e';
    const bx = W * 0.72;
    rr(g, bx - 14, d.groundY - 12, 28, 2.5, 1);
    g.fill();
    rr(g, bx - 14, d.groundY - 18, 28, 2.5, 1);
    g.fill();
    for (const ox of [-11, 11]) {
      rr(g, bx + ox, d.groundY - 11, 2.5, 11, 1);
      g.fill();
    }
    // 地面 (石だたみ)
    g.fillStyle = vgrad(g, d.groundY, H, [[0, '#cfc4ae'], [1, '#b3a890']]);
    g.fillRect(0, d.groundY + 1.2, W, H - d.groundY);
    g.strokeStyle = 'rgba(120,110,90,0.4)';
    g.lineWidth = 0.5;
    for (let x = 0; x < W + 14; x += 14) {
      g.beginPath(); g.moveTo(x, d.groundY + 1); g.lineTo(x - 6, H); g.stroke();
    }
  },

  drawFront(ctx, g) {
    const { W } = ctx, d = ctx.data, p = ctx.primary;
    // ハト
    const TONES = [['#9aa2b8', '#7a8298'], ['#b8bcc8', '#989cae'], ['#8a8ca4', '#6a6c84']];
    for (const b of d.birds) {
      const [c1, c2] = TONES[b.tone];
      const peck = b.state === 'peck' && b.peckT % 0.42 < 0.18;
      const walkBob = b.state === 'walk' ? Math.abs(Math.sin(b.bobT)) * 1 : 0;
      g.save();
      g.translate(b.x, b.y - 5 - walkBob);
      g.scale(b.dir, 1);
      softShadow(g, 0, 5.6, 5, 1.2, 0.12);
      // しっぽ
      g.fillStyle = c2;
      g.beginPath();
      g.moveTo(-4, -1);
      g.lineTo(-9.5, -3.5);
      g.lineTo(-8.5, 0.5);
      g.closePath();
      g.fill();
      // 体
      g.fillStyle = c1;
      g.beginPath();
      g.ellipse(0, 0, 5.2, 3.8, -0.12, 0, TAU);
      g.fill();
      // 羽
      g.fillStyle = c2;
      g.beginPath();
      g.ellipse(-0.8, -0.4, 3.2, 2.2, -0.3, 0, TAU);
      g.fill();
      // 頭 (ついばみで下がる)
      const hy = peck ? 1.5 : -3.6;
      const hx = peck ? 5.8 : 4;
      g.fillStyle = c1;
      g.beginPath(); g.arc(hx, hy, 2.2, 0, TAU); g.fill();
      // くちばし
      g.fillStyle = '#e8a040';
      g.beginPath();
      g.moveTo(hx + 1.8, hy - 0.4);
      g.lineTo(hx + 3.6, hy + (peck ? 1.2 : 0.2));
      g.lineTo(hx + 1.8, hy + 0.7);
      g.closePath();
      g.fill();
      eye(g, hx + 0.6, hy - 0.5, 0.55, 0.4);
      // 首の玉虫色
      g.fillStyle = 'rgba(90,200,140,0.45)';
      g.beginPath(); g.ellipse(hx - 1, hy + 1.6, 1.3, 1.7, 0.3, 0, TAU); g.fill();
      // あし
      g.strokeStyle = '#d87838';
      g.lineWidth = 0.7;
      const step = b.state === 'walk' ? Math.sin(b.bobT) * 1.4 : 0;
      g.beginPath(); g.moveTo(-1 + step, 3.5); g.lineTo(-1 + step, 5.8); g.stroke();
      g.beginPath(); g.moveTo(1.5 - step, 3.5); g.lineTo(1.5 - step, 5.8); g.stroke();
      g.restore();
    }
    // エサ袋 (指)
    if (p) {
      g.save();
      g.translate(p.x, Math.min(p.y, d.groundY - 20) - 6);
      g.rotate(Math.sin(ctx.t * 5) * 0.08);
      g.fillStyle = '#d8b878';
      g.beginPath();
      g.moveTo(-5, -7);
      g.quadraticCurveTo(-6.5, 4, 0, 5);
      g.quadraticCurveTo(6.5, 4, 5, -7);
      g.lineTo(3.5, -5);
      g.lineTo(-3.5, -5);
      g.closePath();
      g.fill();
      g.fillStyle = '#b89858';
      rr(g, -5, -8.5, 10, 3, 1.5);
      g.fill();
      g.restore();
    }
    // カウント
    g.fillStyle = 'rgba(255,255,255,0.92)';
    rr(g, W - 36, 16, 34, 12, 3);
    g.fill();
    g.fillStyle = '#5a7a4a';
    g.font = 'bold 4.6px sans-serif';
    g.fillText(`🌾 ${d.eaten}/35`, W - 33, 24.5);
  },
};
