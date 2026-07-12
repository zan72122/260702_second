// シーン: スポイトで色水ラボ (三原色の実験)
import { TAU, rand, clamp, pick } from '../engine/utils.js';
import { rr, vgrad, softShadow } from '../engine/art.js';

// 目標色は 2色を半々でまぜた平均色 (粒子の色は線形にまざる)
const TARGETS = [
  { name: 'むらさき', c: [0.5, 0.35, 0.55] },
  { name: 'みどり', c: [0.52, 0.7, 0.48] },
  { name: 'オレンジ', c: [0.94, 0.52, 0.16] },
];

export default {
  id: 'dropper',
  name: 'スポイトで色水ラボ',
  emoji: '💉',
  desc: 'すって まぜて ねらいの色に',
  goal: '🎯 スポイトで色をまぜて 目標の色をつくろう!',
  clearMsg: '色まぜ博士に にんてい!',
  maxParticles: 2800,
  view: { shine: 1.3, refract: 0.9 },
  tilt: false,

  init(ctx) {
    const d = ctx.data;
    d.target = pick(TARGETS);
    d.held = 0;         // スポイト内の量
    d.heldCol = [0, 0, 0];
    d.doneT = 0;
    // 三原色 + まぜ用 (すべて同グループでよく混ざる)
    ctx.sim.definePhase(0, { sigma: 3, beta: 1.5, grav: 1, mix: 3.5, group: 1, color: [0.9, 0.15, 0.2], alpha: 0.75 });
    ctx.sim.definePhase(1, { sigma: 3, beta: 1.5, grav: 1, mix: 3.5, group: 1, color: [0.1, 0.55, 0.9], alpha: 0.75 });
    ctx.sim.definePhase(2, { sigma: 3, beta: 1.5, grav: 1, mix: 3.5, group: 1, color: [0.98, 0.85, 0.1], alpha: 0.75 });
    ctx.setTools([{ id: 'newtarget', icon: '🎯', label: 'べつの色にちょうせん' }]);
    ctx.setHint('井戸の上で ながおし=すう / みぎの ビーカーの上ではなすと 出るよ');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    // 3つの色井戸 (左) + まぜビーカー (右)
    d.wells = [];
    const bottom = Math.min(H - 16, H * 0.9);
    const top = bottom - Math.min(H * 0.2, 34);
    const ww = Math.min(W * 0.16, 18);
    [0.14, 0.38, 0.62].forEach((f, k) => {
      const cx = W * f;
      ctx.addCup(cx, top, bottom, ww, 1.4);
      d.wells.push({ x: cx, w: ww, top, bottom, phase: k });
    });
    d.mix = { x: W * 0.86, w: Math.min(W * 0.2, 22), top: bottom - Math.min(H * 0.26, 42), bottom };
    ctx.addCup(d.mix.x, d.mix.top, d.mix.bottom, d.mix.w, 1.6);
    if (!d.filled) {
      d.filled = true;
      for (const w of d.wells) {
        ctx.fill(w.x - w.w / 2 + 1.5, w.top + 8, w.x + w.w / 2 - 1.5, w.bottom - 1.5, w.phase);
      }
    }
  },

  update(ctx, dt) {
    const d = ctx.data, s = ctx.sim, p = ctx.primary;
    // 吸う: 押している間、スポイト先端の粒子を回収
    if (p && d.held < 60) {
      let sucked = 0;
      const kills = [];
      s.forEachInCircle(p.x, p.y + 6, 4, (i) => kills.push(i));
      kills.sort((a, b) => b - a);
      for (const i of kills.slice(0, 3)) {
        // 色を平均に取り込む
        const w = d.held;
        d.heldCol[0] = (d.heldCol[0] * w + s.cr[i]) / (w + 1);
        d.heldCol[1] = (d.heldCol[1] * w + s.cg[i]) / (w + 1);
        d.heldCol[2] = (d.heldCol[2] * w + s.cb[i]) / (w + 1);
        d.held++;
        s.kill(i);
        sucked++;
      }
      if (sucked > 0 && Math.random() < dt * 20) ctx.sfx.drip();
    }
    // まぜビーカーの平均色
    let mr = 0, mg = 0, mb = 0, mc = 0;
    s.forEachInCircle(d.mix.x, (d.mix.top + d.mix.bottom) / 2, d.mix.w + 8, (i) => {
      if (Math.abs(s.x[i] - d.mix.x) < d.mix.w / 2 + 2 && s.y[i] > d.mix.top - 4) {
        mr += s.cr[i]; mg += s.cg[i]; mb += s.cb[i]; mc++;
      }
    });
    if (mc > 0) { mr /= mc; mg /= mc; mb /= mc; }
    d.mixCol = mc > 20 ? [mr, mg, mb] : null;
    d.mixCount = mc;
    // 判定
    if (d.mixCol && mc > 130) {
      const t = d.target.c;
      const dist = Math.abs(mr - t[0]) + Math.abs(mg - t[1]) + Math.abs(mb - t[2]);
      d.dist = dist;
      if (dist < 0.34) {
        d.doneT += dt;
        ctx.progress(Math.min(1, d.doneT / 1.2));
      } else {
        d.doneT = 0;
        if (!ctx._cleared) ctx.progress(clamp(0.5 + (0.9 - dist) * 0.5, 0.2, 0.9));
      }
    } else if (!ctx._cleared) {
      ctx.progress(Math.min(0.4, mc / 130 * 0.4));
    }
  },

  onUp(ctx, p) {
    const d = ctx.data, s = ctx.sim;
    // はなした場所がまぜビーカーの上なら 出す
    if (d.held > 0 && Math.abs(p.x - d.mix.x) < d.mix.w / 2 + 6) {
      const n = d.held;
      for (let k = 0; k < n; k++) {
        // ふちの内側に広めにまいて出す (一点に固めると はねて こぼれる)
        ctx.pour(d.mix.x + rand(-d.mix.w / 2 + 2.5, d.mix.w / 2 - 2.5), d.mix.top + 2 + rand(0, 10), 0, 8, 0);
      }
      // 出した粒に色を付ける (直近 n 個)
      for (let i = Math.max(0, s.n - n); i < s.n; i++) {
        s.cr[i] = d.heldCol[0];
        s.cg[i] = d.heldCol[1];
        s.cb[i] = d.heldCol[2];
      }
      d.held = 0;
      ctx.sfx.splash(0.4);
    }
  },

  onTool(ctx, id) {
    if (id !== 'newtarget') return;
    const d = ctx.data;
    const others = TARGETS.filter((t) => t !== d.target);
    d.target = pick(others);
    ctx.toast(`🎯 こんどは「${d.target.name}」をつくろう!`);
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    g.fillStyle = vgrad(g, 0, H, [[0, '#f4f0e8'], [1, '#e8e0d0']]);
    g.fillRect(0, 0, W, H);
    // 理科室のテーブル
    g.fillStyle = '#d8cdb8';
    g.fillRect(0, d.mix.bottom + 4, W, H - d.mix.bottom);
    // 井戸とビーカー
    for (const w of d.wells) {
      softShadow(g, w.x, w.bottom + 3, w.w * 0.9, 2, 0.14);
      g.fillStyle = 'rgba(255,255,255,0.5)';
      rr(g, w.x - w.w / 2 - 2, w.top - 2, w.w + 4, w.bottom - w.top + 4, 2.5);
      g.fill();
      g.strokeStyle = 'rgba(150,160,180,0.7)';
      g.lineWidth = 0.8;
      rr(g, w.x - w.w / 2 - 2, w.top - 2, w.w + 4, w.bottom - w.top + 4, 2.5);
      g.stroke();
    }
    const m = d.mix;
    softShadow(g, m.x, m.bottom + 3, m.w * 0.9, 2, 0.14);
    g.fillStyle = 'rgba(220,240,255,0.3)';
    rr(g, m.x - m.w / 2 - 2.5, m.top - 3, m.w + 5, m.bottom - m.top + 6, 3);
    g.fill();
    g.strokeStyle = 'rgba(140,180,210,0.9)';
    g.lineWidth = 1;
    rr(g, m.x - m.w / 2 - 2.5, m.top - 3, m.w + 5, m.bottom - m.top + 6, 3);
    g.stroke();
    g.fillStyle = '#667';
    g.font = 'bold 2.8px sans-serif';
    g.textAlign = 'center';
    g.fillText('まぜビーカー', m.x, m.top - 6);
    g.textAlign = 'left';
  },

  drawFront(ctx, g) {
    const { W } = ctx, d = ctx.data, p = ctx.primary;
    // 目標色パネル
    g.fillStyle = 'rgba(255,255,255,0.94)';
    rr(g, 4, 16, 46, 14, 3);
    g.fill();
    g.fillStyle = `rgb(${d.target.c[0] * 255},${d.target.c[1] * 255},${d.target.c[2] * 255})`;
    rr(g, 7, 18.5, 9, 9, 2);
    g.fill();
    g.fillStyle = '#556';
    g.font = 'bold 3.2px sans-serif';
    g.fillText(`目標: ${d.target.name}`, 19, 22);
    if (d.mixCol) {
      g.fillStyle = `rgb(${d.mixCol[0] * 255},${d.mixCol[1] * 255},${d.mixCol[2] * 255})`;
      rr(g, 19, 23.5, 6, 5, 1);
      g.fill();
      g.fillStyle = '#889';
      g.font = '2.6px sans-serif';
      g.fillText('← いまの色', 27, 27.5);
    }
    // スポイト
    if (p) {
      g.save();
      g.translate(p.x, p.y);
      // ガラス管
      g.fillStyle = 'rgba(220,235,245,0.6)';
      rr(g, -1.6, -14, 3.2, 20, 1.5);
      g.fill();
      // 中の液
      if (d.held > 0) {
        const hgt = (d.held / 60) * 14;
        g.fillStyle = `rgba(${d.heldCol[0] * 255},${d.heldCol[1] * 255},${d.heldCol[2] * 255},0.9)`;
        rr(g, -1.2, 5 - hgt, 2.4, hgt, 1);
        g.fill();
      }
      // ゴム球
      g.fillStyle = '#e86a5a';
      g.beginPath();
      g.arc(0, -16, 3.6, 0, TAU);
      g.fill();
      g.restore();
    }
  },
};
