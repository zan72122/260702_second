// シーン: 洗濯機のうずまき観察
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad, tileWall, softShadow } from '../engine/art.js';

const CLOTH_COLORS = ['#e86a8a', '#4a90d8', '#e8b83a'];

export default {
  id: 'washer',
  name: 'せんたく機のうず',
  emoji: '🌀',
  desc: 'ぐるぐる回る水と せんたく物',
  goal: '🎯 うずを回して せんたく物の よごれを おとそう!',
  clearMsg: 'ピカピカのお洗濯!うずの力ってすごい!',
  maxParticles: 2800,
  view: { shine: 1.2, refract: 1.2, thresh: 0.34 },
  tilt: false,

  init(ctx) {
    const d = ctx.data;
    d.spin = 0;        // -1, 0, 1
    d.washed = 0;      // 洗浄度 0..1
    d.spinT = 0;
    ctx.sim.definePhase(0, { // 水
      sigma: 2.5, beta: 1.4, grav: 1, mix: 0.6, group: 1,
      color: [0.55, 0.75, 0.9], alpha: 0.4,
    });
    ctx.sim.definePhase(1, { // トレーサー染料 (うずを見るため)
      sigma: 2.5, beta: 1.4, grav: 1, mix: 0.6, group: 1,
      color: [0.3, 0.45, 0.95], alpha: 0.7,
    });
    ctx.setTools([
      { id: 'spin', icon: '🌀', label: 'まわす/とめる' },
      { id: 'reverse', icon: '🔁', label: 'ぎゃく回転' },
    ]);
    ctx.setHint('回すと 中心に うずができる。とちゅうで ぎゃく回転も ためそう');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.cx = W / 2;
    d.cy = Math.min(H * 0.5, H - 70);
    d.R = Math.min(W * 0.42, H * 0.32, 46);
    const s = ctx.sim;
    // ドラム (円形の器: 円弧をカプセルで)
    const segs = 20;
    for (let k = 0; k < segs; k++) {
      const a0 = (k / segs) * TAU, a1 = ((k + 1) / segs) * TAU;
      s.colliders.push({
        kind: 'capsule',
        ax: d.cx + Math.cos(a0) * d.R, ay: d.cy + Math.sin(a0) * d.R,
        bx: d.cx + Math.cos(a1) * d.R, by: d.cy + Math.sin(a1) * d.R,
        r: 1.6, noSolid: false,
      });
    }
    if (!d.filled) {
      d.filled = true;
      // 水 (下半分+α) + トレーサーの帯
      const s2 = ctx.sim;
      for (let y = d.cy - d.R * 0.4; y < d.cy + d.R - 3; y += 1.5) {
        const half = Math.sqrt(Math.max(0, d.R * d.R - (y - d.cy) ** 2)) - 3;
        for (let x = d.cx - half; x < d.cx + half; x += 1.5) {
          const tracer = Math.abs(x - d.cx) < 5;
          s2.emit(x, y, 0, 0, tracer ? 1 : 0, 0.3);
        }
      }
      // せんたく物 (軽い布のかたまり)
      for (let k = 0; k < 3; k++) {
        const so = s2.addSolid({
          x: d.cx + rand(-d.R * 0.4, d.R * 0.4),
          y: d.cy + rand(-d.R * 0.2, d.R * 0.4),
          r: rand(4, 5.2), density: 0.75, drag: 6,
        });
        so.data.cloth = k;
        so.data.dirt = 1;
      }
    }
  },

  update(ctx, dt) {
    const d = ctx.data, s = ctx.sim;
    if (d.spin !== 0) {
      d.spinT += dt;
      // 接線方向の力場 (パルセーターの水流)
      for (let i = 0; i < s.n; i++) {
        const dx = s.x[i] - d.cx, dy = s.y[i] - d.cy;
        const rr2 = Math.hypot(dx, dy) || 1;
        if (rr2 < d.R) {
          const k = Math.min(1, rr2 / d.R * 1.6) * 130 * d.spin * dt;
          s.vx[i] += (-dy / rr2) * k;
          s.vy[i] += (dx / rr2) * k;
        }
      }
      ctx.sfx.setPour(0.35, 0.35);
      // 回るほど汚れが落ちる (回転の速さで加速)
      let avgSpeed = 0, n2 = 0;
      for (let i = 0; i < s.n; i += 5) { avgSpeed += Math.hypot(s.vx[i], s.vy[i]); n2++; }
      avgSpeed = n2 ? avgSpeed / n2 : 0;
      d.washed = Math.min(1, d.washed + dt * (avgSpeed / 60) * 0.09);
      for (const so of s.solids) so.data.dirt = 1 - d.washed;
    } else {
      ctx.sfx.setPour(0);
    }
    ctx.progress(d.washed >= 0.99 ? 1 : Math.min(0.97, d.washed));
  },

  onTool(ctx, id) {
    const d = ctx.data;
    if (id === 'spin') {
      d.spin = d.spin === 0 ? 1 : 0;
      ctx.toast(d.spin ? '🌀 ぐるぐる…うずのかんせい を見てて!' : '⏸️ ストップ (よぶんな回転も観察!)');
      ctx.vibrate(15);
      return;
    }
    if (id === 'reverse') {
      d.spin = d.spin === 0 ? -1 : -d.spin;
      ctx.toast('🔁 ぎゃく回転!水が あばれる (これで汚れがよく落ちる)');
      ctx.vibrate(15);
    }
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    tileWall(g, W, 0, H, '#e8eef2');
    // 洗濯機の筐体
    softShadow(g, d.cx, d.cy + d.R + 14, d.R + 12, 3, 0.18);
    g.fillStyle = vgrad(g, d.cy - d.R - 14, d.cy + d.R + 14, [[0, '#fdfdfd'], [1, '#d8dde4']]);
    rr(g, d.cx - d.R - 10, d.cy - d.R - 12, d.R * 2 + 20, d.R * 2 + 26, 6);
    g.fill();
    // 操作パネル
    g.fillStyle = '#3a4250';
    rr(g, d.cx - d.R - 6, d.cy - d.R - 9, d.R * 2 + 12, 7, 2);
    g.fill();
    for (let k = 0; k < 3; k++) {
      g.fillStyle = ['#5ad06a', '#f0b840', '#e85a5a'][k];
      g.beginPath();
      g.arc(d.cx + d.R - 6 - k * 6, d.cy - d.R - 5.5, 1.6, 0, TAU);
      g.fill();
    }
    // ドラムの窓 (背面)
    g.fillStyle = '#2a3038';
    g.beginPath(); g.arc(d.cx, d.cy, d.R + 4, 0, TAU); g.fill();
    g.fillStyle = '#3a4250';
    g.beginPath(); g.arc(d.cx, d.cy, d.R + 1, 0, TAU); g.fill();
    // パルセーター (底の羽根)
    g.fillStyle = '#8a95a8';
    g.beginPath(); g.arc(d.cx, d.cy, 5, 0, TAU); g.fill();
  },

  drawFront(ctx, g) {
    const d = ctx.data;
    // せんたく物
    for (const so of ctx.sim.solids) {
      if (so.data.cloth === undefined) continue;
      g.save();
      g.translate(so.x, so.y);
      g.rotate(so.angle);
      g.fillStyle = CLOTH_COLORS[so.data.cloth % 3];
      // くしゃっとした布
      g.beginPath();
      for (let k = 0; k <= 8; k++) {
        const a = k / 8 * TAU;
        const rr2 = so.r * (0.75 + 0.25 * Math.sin(k * 2.7 + so.angle));
        g.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2);
      }
      g.closePath();
      g.fill();
      // よごれ (洗うと消える)
      const dirt = so.data.dirt ?? 1;
      if (dirt > 0.05) {
        g.fillStyle = `rgba(90,70,50,${dirt * 0.7})`;
        for (const [ox, oy, r2] of [[-1.5, -1, 1.2], [1.8, 0.6, 1], [0, 1.8, 0.9]]) {
          g.beginPath(); g.arc(ox, oy, r2, 0, TAU); g.fill();
        }
      }
      g.restore();
    }
    // ガラスぶたの反射
    g.strokeStyle = 'rgba(255,255,255,0.5)';
    g.lineWidth = 1.4;
    g.beginPath(); g.arc(d.cx, d.cy, d.R + 2.5, 0, TAU); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.10)';
    g.beginPath();
    g.ellipse(d.cx - d.R * 0.4, d.cy - d.R * 0.45, d.R * 0.22, d.R * 0.38, -0.7, 0, TAU);
    g.fill();
    // 洗浄度メーター
    g.fillStyle = 'rgba(255,255,255,0.94)';
    rr(g, ctx.W - 36, 16, 34, 12, 3);
    g.fill();
    g.fillStyle = '#556';
    g.font = 'bold 3.2px sans-serif';
    g.fillText(`せんじょう ${((d.washed ?? 0) * 100) | 0}%`, ctx.W - 33, 24);
  },
};
