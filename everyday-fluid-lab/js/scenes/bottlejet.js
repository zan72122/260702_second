// シーン: ペットボトル水圧噴水 (深いほど強くとぶ!)
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad, sun, cloud, softShadow } from '../engine/art.js';
import { Pourer } from './common.js';

export default {
  id: 'bottlejet',
  name: 'ペットボトル水圧噴水',
  emoji: '⛲',
  desc: 'ふかい穴ほど 遠くまでとぶ',
  goal: '🎯 3つの穴のふん水で 3つのコップに 水をためよう!',
  clearMsg: '水圧のちがい、まるみえ!',
  maxParticles: 3000,
  view: { shine: 1.4, refract: 1.0, thresh: 0.35 },
  tilt: false,

  init(ctx) {
    const d = ctx.data;
    d.pourer = new Pourer(120, 45);
    d.cupCounts = [0, 0, 0];
    ctx.sim.definePhase(0, {
      sigma: 3, beta: 1.5, grav: 1, mix: 0,
      color: [0.5, 0.72, 0.92], alpha: 0.42,
    });
    ctx.setHint('タッチでボトルに水を入れると 横穴から ピュー!');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    // ボトル (左)
    d.bx = Math.min(W * 0.22, 30);
    d.bw = Math.min(W * 0.26, 28);
    d.bottom = Math.min(H - 14, H * 0.9);
    d.top = d.bottom - Math.min(H * 0.55, 96);
    const s = ctx.sim;
    // ボトル壁 (右壁は3つの穴あき)
    d.holes = [0.35, 0.6, 0.85].map((f) => d.top + (d.bottom - d.top) * f);
    s.colliders.push(
      { kind: 'capsule', ax: d.bx - d.bw / 2, ay: d.top, bx: d.bx - d.bw / 2, by: d.bottom, r: 1.5 },
      { kind: 'capsule', ax: d.bx - d.bw / 2, ay: d.bottom, bx: d.bx + d.bw / 2, by: d.bottom, r: 1.5 },
    );
    // 右壁: 穴の間をカプセルで
    const xr = d.bx + d.bw / 2;
    let prev = d.top;
    for (const hy of d.holes) {
      s.colliders.push({ kind: 'capsule', ax: xr, ay: prev, bx: xr, by: hy - 1.8, r: 1.5 });
      prev = hy + 1.8;
    }
    s.colliders.push({ kind: 'capsule', ax: xr, ay: prev, bx: xr, by: d.bottom, r: 1.5 });
    // 3つのコップ (右へ、遠さがちがう)
    d.cups = [];
    const cupW = Math.min(W * 0.13, 15);
    const positions = [0.42, 0.62, 0.85];
    positions.forEach((f, k) => {
      const cx = W * f;
      const topY = d.bottom - 18;
      ctx.addCup(cx, topY, d.bottom, cupW, 1.3);
      d.cups.push({ x: cx, w: cupW, top: topY });
    });
  },

  update(ctx, dt) {
    const d = ctx.data, s = ctx.sim, p = ctx.primary;
    const pouring = !!p;
    d.pourer.phase = 0;
    d.pourer.update(ctx, dt, pouring, d.bx + rand(-3, 3), d.top - 6, 0, 1, 3);
    ctx.sfx.setPour(pouring ? 0.5 : 0);

    // ボトル内の水位
    let level = d.bottom;
    for (let i = 0; i < s.n; i++) {
      if (Math.abs(s.x[i] - d.bx) < d.bw / 2 && s.y[i] < level) level = s.y[i];
    }
    d.level = level;
    // 穴からの噴出: 水位より下の穴は 深さに応じた速度で噴く
    const xr = d.bx + d.bw / 2;
    for (const hy of d.holes) {
      if (level < hy - 2) {
        const depth = hy - level;
        const v = 22 * Math.sqrt(depth); // トリチェリの定理っぽく
        // 穴の近くのボトル内粒子を取り出して噴出
        let moved = 0;
        s.forEachInCircle(xr - 2.5, hy, 2.4, (i) => {
          if (moved >= 2 || s.x[i] > xr) return;
          s.x[i] = xr + 2.2;
          s.px[i] = s.x[i];
          s.y[i] = hy + rand(-0.8, 0.8);
          s.py[i] = s.y[i];
          s.vx[i] = v * rand(0.9, 1.05);
          s.vy[i] = rand(-6, 6);
          moved++;
        });
      }
    }
    // コップの中身
    let done = 0;
    d.cups.forEach((c, k) => {
      let n = 0;
      s.forEachInCircle(c.x, (c.top + d.bottom) / 2, c.w + 6, (i) => {
        if (Math.abs(s.x[i] - c.x) < c.w / 2 + 1 && s.y[i] > c.top - 2) n++;
      });
      d.cupCounts[k] = n;
      if (n >= 60) done++;
    });
    ctx.progress(done >= 3 ? 1 : Math.min(0.97, d.cupCounts.reduce((a, c) => a + Math.min(c, 60), 0) / 180));
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    g.fillStyle = vgrad(g, 0, H, [[0, '#a8d8f0'], [0.7, '#d0eaf8'], [1, '#e8f6ff']]);
    g.fillRect(0, 0, W, H);
    sun(g, W * 0.88, 13, 5);
    cloud(g, W * 0.4, 14, 0.9, 0.9);
    // 芝生
    g.fillStyle = vgrad(g, d.bottom + 2, H, [[0, '#9ac96a'], [1, '#7cab4e']]);
    g.fillRect(0, d.bottom + 2, W, H - d.bottom);
    // ボトル
    const x0 = d.bx - d.bw / 2 - 2, wB = d.bw + 4;
    softShadow(g, d.bx, d.bottom + 3, d.bw * 0.8, 2.5, 0.15);
    g.fillStyle = 'rgba(200,230,250,0.25)';
    rr(g, x0, d.top - 6, wB, d.bottom - d.top + 9, 4);
    g.fill();
    g.strokeStyle = 'rgba(150,190,220,0.8)';
    g.lineWidth = 1;
    rr(g, x0, d.top - 6, wB, d.bottom - d.top + 9, 4);
    g.stroke();
    // キャップ口
    g.fillStyle = '#68a8d8';
    rr(g, d.bx - 5, d.top - 11, 10, 6, 2);
    g.fill();
    // 穴のしるしと深さラベル
    g.font = '2.6px sans-serif';
    d.holes.forEach((hy, k) => {
      g.fillStyle = '#38608a';
      g.beginPath();
      g.arc(d.bx + d.bw / 2 + 0.5, hy, 1.6, 0, TAU);
      g.fill();
      g.fillStyle = 'rgba(56,96,138,0.85)';
      g.fillText(['あさい', 'ちゅう', 'ふかい'][k], d.bx + d.bw / 2 + 4, hy - 2);
    });
    // コップ
    for (const c of d.cups) {
      g.fillStyle = 'rgba(255,255,255,0.4)';
      g.beginPath();
      g.moveTo(c.x - c.w / 2 - 2, c.top - 1);
      g.lineTo(c.x - c.w / 2 + 0.5, d.bottom + 1);
      g.lineTo(c.x + c.w / 2 - 0.5, d.bottom + 1);
      g.lineTo(c.x + c.w / 2 + 2, c.top - 1);
      g.closePath();
      g.fill();
      g.strokeStyle = 'rgba(150,190,220,0.9)';
      g.lineWidth = 0.8;
      g.stroke();
    }
  },

  drawFront(ctx, g) {
    const { W } = ctx, d = ctx.data;
    // コップの達成チェック
    d.cups.forEach((c, k) => {
      const ok = (d.cupCounts?.[k] ?? 0) >= 60;
      g.fillStyle = ok ? '#2a9a4a' : 'rgba(255,255,255,0.85)';
      g.beginPath();
      g.arc(c.x, c.top - 6, 2.6, 0, TAU);
      g.fill();
      if (ok) {
        g.strokeStyle = '#fff';
        g.lineWidth = 0.7;
        g.beginPath();
        g.moveTo(c.x - 1.2, c.top - 6);
        g.lineTo(c.x - 0.3, c.top - 5);
        g.lineTo(c.x + 1.3, c.top - 7.2);
        g.stroke();
      }
    });
    // じょうご (注ぎ口)
    const p = ctx.primary;
    if (p) {
      g.fillStyle = 'rgba(160,170,190,0.85)';
      g.beginPath();
      g.moveTo(d.bx - 7, d.top - 18);
      g.lineTo(d.bx - 2, d.top - 11);
      g.lineTo(d.bx + 2, d.top - 11);
      g.lineTo(d.bx + 7, d.top - 18);
      g.closePath();
      g.fill();
    }
  },
};
