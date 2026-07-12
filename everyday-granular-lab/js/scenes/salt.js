// シーン: 目玉焼きに塩をふる
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad, woodTable, softShadow } from '../engine/art.js';
import { SPRITES } from '../engine/grainRenderer.js';

export default {
  id: 'salt',
  name: '目玉焼きに塩',
  emoji: '🍳',
  desc: 'パッパッ… まんべんなく ふれるかな',
  goal: '🎯 白身ぜんたいに 塩をふろう (かけすぎ注意!)',
  clearMsg: 'ちょうどいい塩かげん!',
  maxParticles: 1500,
  rattlePitch: 1.8,
  rattle: 0.5,

  init(ctx) {
    const d = ctx.data;
    d.grid = new Set();
    d.totalSalt = 0;
    d.overShown = false;
    d.pepper = false;
    ctx.sim.defineMaterial(0, { // 塩
      r: 0.45, rJit: 0.05, mu: 0.8, vmax: 40, interlock: 3, flutter: 10,
      sprite: SPRITES.SALT,
      colors: [[1, 1, 1], [0.96, 0.97, 1]],
    });
    ctx.sim.defineMaterial(1, { // こしょう
      r: 0.42, rJit: 0.06, mu: 0.8, vmax: 38, interlock: 3, flutter: 14,
      sprite: SPRITES.SAND,
      colors: [[0.25, 0.2, 0.16], [0.35, 0.28, 0.2], [0.2, 0.16, 0.12]],
    });
    ctx.setTools([
      { id: 'salt', icon: '🧂', label: 'しお', active: true },
      { id: 'pepper', icon: '🌶️', label: 'こしょう' },
    ]);
    ctx.setHint('シェイカーを持って ふりふり!すばやく動かすと 出るよ');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.cx = W / 2;
    d.rx = Math.min(W * 0.36, 44);
    d.ry = d.rx * 0.42;
    d.cy = Math.min(H * 0.62, H - d.ry - 26);
    // 目玉焼き = ゆるいドーム型コライダー (カプセルを並べる)
    const s = ctx.sim;
    const segs = 8;
    for (let k = 0; k < segs; k++) {
      const a0 = Math.PI + (k / segs) * Math.PI;
      const a1 = Math.PI + ((k + 1) / segs) * Math.PI;
      s.colliders.push({
        kind: 'capsule',
        ax: d.cx + Math.cos(a0) * d.rx, ay: d.cy + Math.sin(a0) * d.ry,
        bx: d.cx + Math.cos(a1) * d.rx, by: d.cy + Math.sin(a1) * d.ry,
        r: 1.4, mu: 0.9,
      });
    }
    // お皿
    s.colliders.push({ kind: 'capsule', ax: d.cx - d.rx - 14, ay: d.cy + 5, bx: d.cx + d.rx + 14, by: d.cy + 5, r: 1.5, mu: 0.7 });
    d.cells = 14;
  },

  update(ctx, dt) {
    const d = ctx.data, s = ctx.sim, p = ctx.primary;
    // ふりふり検出: 保持中の素早い動き
    if (p) {
      const sp = Math.hypot(p.vx, p.vy);
      d.shake = (d.shake || 0) * 0.9 + sp * 0.1;
      if (d.shake > 70) {
        const nn = Math.min(4, (d.shake / 90) | 0) + 1;
        for (let k = 0; k < nn; k++) {
          if (Math.random() < 0.75) {
            ctx.pour(p.x + rand(-2.5, 2.5), p.y + 5, rand(-8, 8), 25, d.pepper ? 1 : 0);
            d.totalSalt++;
          }
        }
        if (Math.random() < dt * 12) ctx.sfx.drip();
      }
    } else d.shake = 0;

    // 白身にふれた粒はくっつく (しっとりした表面に定着)
    let stuck = false;
    for (let i = s.n - 1; i >= 0; i--) {
      const dx = (s.x[i] - d.cx) / d.rx;
      const dy = (s.y[i] - d.cy) / d.ry;
      const e = dx * dx + dy * dy;
      // しっとりした白身にふれたら くっつく (コライダーの厚みぶん外側まで判定)
      if (e < 1.5 && s.y[i] < d.cy + 2 && Math.abs(s.vy[i]) < 25 && Math.random() < dt * 16) {
        const cell = clamp(((dx + 1) / 2 * d.cells) | 0, 0, d.cells - 1);
        d.grid.add(cell + (s.mat[i] === 1 ? 100 : 0));
        (d.stuck || (d.stuck = [])).push([s.x[i], s.y[i], s.mat[i]]);
        s.kill(i);
        stuck = true;
      }
    }
    if (stuck && (d.stainT = (d.stainT || 0) + dt) > 0.15) {
      d.stainT = 0;
      ctx.backDirty();
    }
    const saltCells = [...d.grid].filter((c) => c < 100).length;
    const cov = saltCells / d.cells;
    const over = d.totalSalt > 700;
    if (over && !d.overShown) {
      d.overShown = true;
      ctx.toast('🧂 かけすぎ〜!しょっぱいよ!');
    }
    ctx.progress(clamp(cov * (over ? 0.85 : 1.02), 0, over ? 0.85 : 1));
  },

  onTool(ctx, id) {
    ctx.data.pepper = id === 'pepper';
    ctx.setToolActive(id);
    ctx.toast(id === 'pepper' ? '🌶️ こしょうも いいかおり' : '🧂 しお!');
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    g.fillStyle = vgrad(g, 0, H, [[0, '#fdf3e0'], [1, '#f7e3c2']]);
    g.fillRect(0, 0, W, H);
    // ランチョンマット
    woodTable(g, W, d.cy + 8, H, 1);
    g.fillStyle = 'rgba(90,140,190,0.25)';
    rr(g, d.cx - d.rx - 24, d.cy - 6, d.rx * 2 + 48, 24, 4);
    g.fill();
    // お皿
    softShadow(g, d.cx, d.cy + 8, d.rx + 20, 3.5, 0.15);
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.ellipse(d.cx, d.cy + 4, d.rx + 18, 7, 0, 0, TAU);
    g.fill();
    g.strokeStyle = '#dde4f0'; g.lineWidth = 0.8;
    g.beginPath();
    g.ellipse(d.cx, d.cy + 3.4, d.rx + 13, 5, 0, 0, TAU);
    g.stroke();
    // 白身
    g.fillStyle = '#fffdf6';
    g.beginPath();
    g.moveTo(d.cx - d.rx, d.cy);
    for (let k = 0; k <= 20; k++) {
      const a = Math.PI + k / 20 * Math.PI;
      const wob = 1 + 0.06 * Math.sin(k * 2.2);
      g.lineTo(d.cx + Math.cos(a) * d.rx * wob, d.cy + Math.sin(a) * d.ry * wob);
    }
    g.quadraticCurveTo(d.cx + d.rx * 0.6, d.cy + 4.5, d.cx, d.cy + 4.5);
    g.quadraticCurveTo(d.cx - d.rx * 0.6, d.cy + 4.5, d.cx - d.rx, d.cy);
    g.fill();
    // こんがりふち
    g.strokeStyle = 'rgba(220,170,90,0.5)';
    g.lineWidth = 1;
    g.beginPath();
    for (let k = 0; k <= 20; k++) {
      const a = Math.PI + k / 20 * Math.PI;
      const wob = 1 + 0.06 * Math.sin(k * 2.2);
      g.lineTo(d.cx + Math.cos(a) * d.rx * wob, d.cy + Math.sin(a) * d.ry * wob);
    }
    g.stroke();
    // 黄身
    const gr = g.createRadialGradient(d.cx - 3, d.cy - d.ry * 0.55, 1, d.cx, d.cy - d.ry * 0.35, d.rx * 0.3);
    gr.addColorStop(0, '#ffd94e');
    gr.addColorStop(1, '#f5a623');
    g.fillStyle = gr;
    g.beginPath();
    g.ellipse(d.cx, d.cy - d.ry * 0.35, d.rx * 0.28, d.ry * 0.62, 0, 0, TAU);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.55)';
    g.beginPath();
    g.ellipse(d.cx - d.rx * 0.08, d.cy - d.ry * 0.62, d.rx * 0.09, d.ry * 0.16, -0.4, 0, TAU);
    g.fill();
    // くっついた塩・こしょう
    for (const [sx, sy, m] of (d.stuck || [])) {
      g.fillStyle = m === 1 ? 'rgba(60,48,40,0.9)' : 'rgba(255,255,255,0.95)';
      g.save();
      g.translate(sx, sy);
      g.rotate((sx * 13.7) % 3);
      g.fillRect(-0.55, -0.55, 1.1, 1.1);
      g.restore();
      if (m !== 1) {
        g.fillStyle = 'rgba(200,210,225,0.5)';
        g.fillRect(sx - 0.2, sy - 0.2, 0.5, 0.5);
      }
    }
  },

  drawFront(ctx, g) {
    const d = ctx.data, p = ctx.primary;
    if (!p) return;
    // シェイカー
    g.save();
    g.translate(p.x, p.y);
    g.rotate(Math.PI + clamp((p.vx || 0) * 0.002, -0.4, 0.4)); // さかさ持ち
    const col = d.pepper ? '#3a3a44' : '#eef2f8';
    g.fillStyle = 'rgba(210,225,240,0.55)';
    rr(g, -4.5, -14, 9, 15, 3);
    g.fill();
    g.fillStyle = col;
    rr(g, -4.5, 1, 9, 5.5, 2);
    g.fill();
    g.fillStyle = '#556';
    for (const [ox, oy] of [[-2, 3.6], [0, 4.2], [2, 3.6]]) {
      g.beginPath(); g.arc(ox, oy, 0.55, 0, TAU); g.fill();
    }
    // 中の塩
    g.fillStyle = d.pepper ? 'rgba(60,50,45,0.8)' : 'rgba(255,255,255,0.8)';
    rr(g, -3.6, -6, 7.2, 6, 1.5);
    g.fill();
    g.restore();
  },
};
