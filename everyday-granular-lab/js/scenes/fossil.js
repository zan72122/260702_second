// シーン: 化石発掘キット (ブラシで砂をはらう)
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad, softShadow } from '../engine/art.js';
import { SPRITES } from '../engine/grainRenderer.js';

export default {
  id: 'fossil',
  name: '化石はっくつキット',
  emoji: '🦖',
  desc: 'ブラシで そーっと はらって発掘',
  goal: '🎯 砂をはらって 恐竜の化石を ぜんぶ 見つけよう!',
  clearMsg: 'ティラノサウルスの全身骨格だ!',
  maxParticles: 5500,
  tilt: false,
  rattle: 0.25,

  init(ctx) {
    const d = ctx.data;
    d.brushed = 0;
    d.cells = null;
    d.foundCells = new Set();
    ctx.sim.defineMaterial(0, { // 発掘用の固めた砂
      r: 0.66, rJit: 0.07, mu: 1.0, interlock: 4, coh: 0.1, vmax: 45,
      sprite: SPRITES.SAND,
      colors: [[0.85, 0.74, 0.55], [0.79, 0.68, 0.48], [0.9, 0.8, 0.62]],
    });
    ctx.setHint('ブラシ (指) で なでるように 砂をはらおう');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    // 発掘トレー
    d.x0 = Math.max(6, W * 0.08);
    d.x1 = W - d.x0;
    d.bottom = Math.min(H - 12, H * 0.9);
    d.top = d.bottom - Math.min(H * 0.36, 58);
    // 化石の位置 (トレー中央)
    d.fx = (d.x0 + d.x1) / 2;
    d.fy = d.bottom - (d.bottom - d.top) * 0.32;
    d.fw = Math.min((d.x1 - d.x0) * 0.76, 78);
    const s = ctx.sim;
    s.colliders.push(
      { kind: 'capsule', ax: d.x0, ay: d.top - 8, bx: d.x0, by: d.bottom, r: 1.6, mu: 0.4 },
      { kind: 'capsule', ax: d.x1, ay: d.top - 8, bx: d.x1, by: d.bottom, r: 1.6, mu: 0.4 },
      { kind: 'capsule', ax: d.x0, ay: d.bottom, bx: d.x1, by: d.bottom, r: 1.6, mu: 0.4 },
    );
    if (!d.filled) {
      d.filled = true;
      ctx.fill(d.x0 + 2, d.top, d.x1 - 2, d.bottom - 1, 0);
    }
    // 化石グリッド (発掘判定セル)
    if (!d.cells) {
      d.cells = [];
      const N = 10;
      for (let k = 0; k < N; k++) {
        d.cells.push({
          x: d.fx - d.fw / 2 + (k + 0.5) * d.fw / N,
          y: d.fy,
        });
      }
    }
  },

  update(ctx, dt) {
    const d = ctx.data, s = ctx.sim, p = ctx.primary;
    // ブラシ: なでた場所の表層の粒をはらう
    if (p) {
      const sp = Math.hypot(p.vx, p.vy);
      if (sp > 30) {
        const kills = [];
        s.forEachInCircle(p.x, p.y, 4.5, (i) => kills.push(i));
        kills.sort((a, b) => b - a);
        const nMax = Math.min(3, kills.length);
        for (let k = 0; k < nMax; k++) {
          const i = kills[k];
          // 払われた砂は横に飛ぶ (消えるのではなく移動)
          const dir = p.vx > 0 ? 1 : -1;
          s.rest[i] = 0;
          s.vx[i] += dir * rand(30, 60);
          s.vy[i] -= rand(15, 35);
        }
        d.brushed += nMax;
        if (Math.random() < dt * 10) {
          ctx.fx.addDust(p.x, p.y, rand(1.8, 3), '205,180,140');
          ctx.sfx.setRattle(0.3, 1.4);
        }
      }
    }
    // 化石セルの上の砂が無くなったら「発見!」
    for (let k = 0; k < d.cells.length; k++) {
      if (d.foundCells.has(k)) continue;
      const c = d.cells[k];
      let cover = 0;
      s.forEachInCircle(c.x, c.y - 2, 3, () => cover++);
      if (cover <= 1) {
        d.foundCells.add(k);
        ctx.backDirty();
        ctx.sfx.chime();
        for (let j = 0; j < 6; j++) ctx.fx.addSpark(c.x + rand(-3, 3), c.y + rand(-3, 3), '#ffe9a8');
        ctx.fx.addText(c.x, c.y - 8, 'はっけん!', '#ffe27a');
      }
    }
    ctx.progress(d.foundCells.size / d.cells.length);
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    g.fillStyle = vgrad(g, 0, H, [[0, '#e8e2d2'], [1, '#d8ceb8']]);
    g.fillRect(0, 0, W, H);
    // 博物館ポスター風
    g.fillStyle = 'rgba(90,74,58,0.9)';
    rr(g, 4, 16, Math.min(44, W * 0.4), 20, 2);
    g.fill();
    g.fillStyle = '#f0e0c0';
    g.font = 'bold 3.2px sans-serif';
    g.fillText('はっくつ体験', 7, 22);
    g.font = '2.6px sans-serif';
    g.fillText('ブラシで少しずつ', 7, 27);
    g.fillText('はらうのがコツ!', 7, 31);
    // トレー
    softShadow(g, (d.x0 + d.x1) / 2, d.bottom + 4, (d.x1 - d.x0) / 2 + 4, 3, 0.18);
    g.fillStyle = '#a2703e';
    rr(g, d.x0 - 4, d.top - 10, d.x1 - d.x0 + 8, d.bottom - d.top + 16, 3);
    g.fill();
    g.fillStyle = '#8a5c30';
    rr(g, d.x0 - 1.5, d.top - 7, d.x1 - d.x0 + 3, d.bottom - d.top + 10, 2);
    g.fill();
    // 岩盤 (化石が埋まっている層)
    g.fillStyle = '#b8a888';
    rr(g, d.x0, d.fy - 6, d.x1 - d.x0, d.bottom - d.fy + 5, 2);
    g.fill();
    // 恐竜の化石 (骨格)
    g.save();
    g.translate(d.fx, d.fy);
    g.strokeStyle = '#f4ecd8';
    g.fillStyle = '#f4ecd8';
    g.lineWidth = 1.1;
    const w = d.fw;
    // 背骨
    g.beginPath();
    g.moveTo(-w / 2 + 4, 0);
    g.quadraticCurveTo(0, -4, w / 2 - 8, -1);
    g.stroke();
    // 頭
    g.beginPath();
    g.ellipse(w / 2 - 5, -1.5, 4.5, 2.8, 0.15, 0, TAU);
    g.fill();
    g.fillStyle = '#b8a888';
    g.beginPath(); g.arc(w / 2 - 3.4, -2.2, 0.8, 0, TAU); g.fill();
    // ろっ骨
    g.strokeStyle = '#f4ecd8';
    for (let k = 0; k < 6; k++) {
      const bx = -w / 2 + 10 + k * (w * 0.42 / 6);
      g.beginPath();
      g.moveTo(bx, -2.2);
      g.quadraticCurveTo(bx + 1.5, 2, bx + 0.5, 4.5);
      g.stroke();
    }
    // しっぽ
    g.beginPath();
    g.moveTo(-w / 2 + 4, 0);
    g.quadraticCurveTo(-w / 2 - 2, 2, -w / 2 + 1, 4);
    g.stroke();
    // あし
    for (const bx of [-w * 0.16, w * 0.18]) {
      g.beginPath();
      g.moveTo(bx, 0);
      g.lineTo(bx - 1.5, 6);
      g.stroke();
      g.beginPath();
      g.moveTo(bx - 1.5, 6);
      g.lineTo(bx + 1.5, 6.5);
      g.stroke();
    }
    g.restore();
    // 見つけたセルをキラッと
    g.fillStyle = 'rgba(255,235,160,0.28)';
    for (const k of ctx.data.foundCells) {
      const c = d.cells[k];
      g.beginPath();
      g.arc(c.x, c.y, 4.5, 0, TAU);
      g.fill();
    }
  },

  drawFront(ctx, g) {
    const d = ctx.data, p = ctx.primary;
    if (p) {
      // 発掘ブラシ
      g.save();
      g.translate(p.x, p.y);
      g.rotate(-0.6 + clamp((p.vx || 0) * 0.001, -0.25, 0.25));
      g.fillStyle = '#c89858';
      rr(g, -1.4, -16, 2.8, 12, 1.2);
      g.fill();
      g.fillStyle = '#8a6a3a';
      rr(g, -2.2, -5, 4.4, 2.5, 1);
      g.fill();
      g.strokeStyle = '#e8d8b8';
      g.lineWidth = 0.5;
      for (let k = -2; k <= 2; k++) {
        g.beginPath();
        g.moveTo(k * 0.8, -2.5);
        g.lineTo(k * 1.1, 2.5);
        g.stroke();
      }
      g.restore();
    }
    // 発見カウント
    g.fillStyle = 'rgba(255,255,255,0.92)';
    rr(g, ctx.W - 36, 16, 34, 12, 3);
    g.fill();
    g.fillStyle = '#8a5c30';
    g.font = 'bold 4.2px sans-serif';
    g.fillText(`🦴 ${d.foundCells.size}/${d.cells?.length ?? 10}`, ctx.W - 33, 24.5);
  },
};
