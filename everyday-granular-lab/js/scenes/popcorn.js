// シーン: ポップコーンをつくろう (ポン!とはじける)
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad, tileWall, softShadow } from '../engine/art.js';
import { SPRITES } from '../engine/grainRenderer.js';

export default {
  id: 'popcorn',
  name: 'ポップコーンをつくろう',
  emoji: '🍿',
  desc: 'ポン!ポン!とんだ分を キャッチ',
  goal: '🎯 はじけたポップコーンを ボウルで30こ キャッチ!',
  clearMsg: 'あつあつポップコーン できあがり!',
  maxParticles: 700,
  tilt: false,

  init(ctx) {
    const d = ctx.data;
    d.heat = false;
    d.caught = 0;
    d.caramel = false;
    ctx.sim.defineMaterial(0, { // コーンの豆
      r: 1.05, rJit: 0.08, mu: 0.55, vmax: 160,
      sprite: SPRITES.KERNEL, colors: [[1, 1, 1]],
    });
    ctx.sim.defineMaterial(1, { // はじけた
      r: 2.3, rJit: 0.3, mu: 0.7, vmax: 320, bounce: 0.2, interlock: 0.8, sleepK: 0.9,
      sprite: SPRITES.POPCORN, colors: [[1, 1, 1]],
    });
    ctx.setTools([
      { id: 'heat', icon: '🔥', label: '火をつける/とめる' },
      { id: 'caramel', icon: '🍯', label: 'キャラメルがけ' },
    ]);
    ctx.setHint('火をつけて まつ… ポン!とんだのを 上のボウルでキャッチ!');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.panX = W / 2;
    d.panW = Math.min(W * 0.56, 66);
    d.panY = H - Math.min(H * 0.18, 28);
    d.panTop = d.panY - 16;
    const s = ctx.sim;
    // フライパン (浅い器)
    s.colliders.push(
      { kind: 'capsule', ax: d.panX - d.panW / 2, ay: d.panTop, bx: d.panX - d.panW / 2, by: d.panY, r: 1.6, mu: 0.4 },
      { kind: 'capsule', ax: d.panX + d.panW / 2, ay: d.panTop, bx: d.panX + d.panW / 2, by: d.panY, r: 1.6, mu: 0.4 },
      { kind: 'capsule', ax: d.panX - d.panW / 2, ay: d.panY, bx: d.panX + d.panW / 2, by: d.panY, r: 1.8, mu: 0.4 },
    );
    // キャッチボウル (指追従)
    d.bowlW = Math.min(W * 0.34, 40);
    d.bowl = [
      { kind: 'capsule', ax: -999, ay: -999, bx: -999, by: -998, r: 1.5, mu: 0.6, noSolid: true },
      { kind: 'capsule', ax: -999, ay: -999, bx: -999, by: -998, r: 1.5, mu: 0.6, noSolid: true },
      { kind: 'capsule', ax: -999, ay: -999, bx: -999, by: -998, r: 1.5, mu: 0.6, noSolid: true },
    ];
    s.colliders.push(...d.bowl);
    d.bowlY = Math.max(H * 0.3, 40);
    if (!d.filled) {
      d.filled = true;
      // 豆をフライパンに
      for (let k = 0; k < 90; k++) {
        s.emit(d.panX + rand(-d.panW / 2 + 3, d.panW / 2 - 3), d.panY - rand(2, 9), 0, 0, 0);
      }
    }
  },

  update(ctx, dt) {
    const d = ctx.data, s = ctx.sim, p = ctx.primary;
    // ボウルを指に追従 (横のみ、高さ固定気味)
    const bx = p ? clamp(p.x, d.bowlW / 2 + 3, ctx.W - d.bowlW / 2 - 3) : -999;
    const by = p ? clamp(p.y, 26, d.panTop - 24) : -999;
    if (p) {
      const w = d.bowlW / 2;
      const segs = [[-w, -7, -w * 0.8, 4], [w, -7, w * 0.8, 4], [-w * 0.8, 4, w * 0.8, 4]];
      d.bowl.forEach((c, i) => {
        const [x0, y0, x1, y1] = segs[i];
        const nax = bx + x0, nay = by + y0;
        c.vx = clamp((nax - c.ax) / Math.max(dt, 1e-3), -260, 260);
        c.vy = clamp((nay - c.ay) / Math.max(dt, 1e-3), -260, 260);
        if (c.ax < -500) { c.vx = 0; c.vy = 0; }
        c.ax = nax; c.ay = nay;
        c.bx = bx + x1; c.by = by + y1;
        c.off = false;
      });
      d.bx = bx; d.by = by;
    } else {
      d.bowl.forEach((c) => { c.off = true; c.ax = c.bx = -999; });
    }

    // 加熱 → はじける
    if (d.heat) {
      let popped = 0;
      for (let i = s.n - 1; i >= 0; i--) {
        if (s.mat[i] !== 0) continue;
        const inPan = Math.abs(s.x[i] - d.panX) < d.panW / 2 + 4 && s.y[i] > d.panTop - 6;
        if (!inPan) continue;
        s.aux[i] += dt * rand(0.5, 1.5);
        if (s.aux[i] > 3.2 && Math.random() < dt * 2.5 && popped < 3) {
          // ポン! (豆の山の上の空中から飛び出す — 密集の中だと勢いが殺される)
          const x = s.x[i], y = s.y[i];
          s.kill(i);
          const j = s.emit(x, Math.min(y - 9, d.panTop - 3), rand(-52, 52), rand(-290, -190), 1);
          if (j >= 0) s.aux[j] = 1; // popped マーク
          ctx.sfx.pon(rand(0.85, 1.25));
          ctx.fx.addSpark(x, y - 3, '#fff2b8');
          popped++;
        }
      }
      // 鍋がゆれる・湯気
      if (Math.random() < dt * 5) ctx.fx.addSteam(d.panX + rand(-d.panW / 3, d.panW / 3), d.panTop - 2, rand(2, 3.5));
    }

    // キャッチ判定: ボウルにふれた popped は回収 (累積カウント)
    if (p) {
      const kills = [];
      s.forEachInCircle(d.bx, d.by - 2, d.bowlW / 2 + 3, (i) => {
        if (s.mat[i] === 1 && s.vy[i] > -30) kills.push(i);
      });
      kills.sort((a, b) => b - a);
      for (const i of kills) {
        ctx.fx.addSpark(s.x[i], s.y[i], '#fff2b8');
        s.kill(i);
        d.caught++;
        ctx.sfx.pop(1.5);
      }
    }
    if (!ctx._cleared) ctx.progress(Math.min(1, (d.caught || 0) / 30));
  },

  onTool(ctx, id) {
    const d = ctx.data;
    if (id === 'heat') {
      d.heat = !d.heat;
      ctx.toast(d.heat ? '🔥 ジリジリ… まってると…' : '🔥 火をとめた');
      ctx.backDirty();
      return;
    }
    if (id === 'caramel') {
      let done = 0;
      const s = ctx.sim;
      for (let i = 0; i < s.n; i++) {
        if (s.mat[i] === 1 && s.cr[i] > 0.95) {
          s.cr[i] = 0.95; s.cg[i] = 0.72; s.cb[i] = 0.42;
          done++;
        }
      }
      if (done > 0) {
        ctx.toast('🍯 あまいキャラメル味に!');
        for (let k = 0; k < 8; k++) ctx.fx.addSpark(ctx.W / 2 + rand(-20, 20), ctx.H / 2, '#ffce7a');
      }
    }
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    tileWall(g, W, 0, H, '#f4e8d8');
    // コンロ
    g.fillStyle = '#3a3a42';
    rr(g, d.panX - d.panW / 2 - 10, d.panY + 4, d.panW + 20, 8, 3);
    g.fill();
    g.fillStyle = '#55555e';
    for (const ox of [-d.panW / 2 + 2, d.panW / 2 - 8]) {
      rr(g, d.panX + ox, d.panY + 12, 7, 3, 1.5);
      g.fill();
    }
    // フライパン
    g.fillStyle = '#4a4a52';
    rr(g, d.panX - d.panW / 2 - 3, d.panTop - 2, d.panW + 6, d.panY - d.panTop + 5, 3);
    g.fill();
    g.fillStyle = '#6a6a74';
    rr(g, d.panX - d.panW / 2 - 1, d.panTop - 1, d.panW + 2, 3, 1.5);
    g.fill();
    // 取っ手
    g.fillStyle = '#2e2e34';
    rr(g, d.panX + d.panW / 2 + 2, d.panY - 9, 16, 4, 2);
    g.fill();
  },

  drawFront(ctx, g) {
    const { W } = ctx, d = ctx.data, p = ctx.primary;
    // 炎
    if (d.heat) {
      for (let k = 0; k < 7; k++) {
        const x = d.panX - d.panW / 3 + k * d.panW / 9;
        const h = 3 + Math.sin(ctx.t * 12 + k * 2) * 1.2;
        g.fillStyle = 'rgba(90,160,255,0.85)';
        g.beginPath();
        g.moveTo(x - 1.4, d.panY + 4.5);
        g.quadraticCurveTo(x, d.panY + 4.5 - h * 2, x + 1.4, d.panY + 4.5);
        g.closePath();
        g.fill();
        g.fillStyle = 'rgba(255,190,90,0.8)';
        g.beginPath();
        g.moveTo(x - 0.7, d.panY + 4.5);
        g.quadraticCurveTo(x, d.panY + 4.5 - h, x + 0.7, d.panY + 4.5);
        g.closePath();
        g.fill();
      }
    }
    // キャッチボウル
    if (p) {
      const w = d.bowlW / 2;
      g.save();
      g.translate(d.bx, d.by);
      g.fillStyle = '#e8843a';
      g.beginPath();
      g.moveTo(-w - 1.5, -8);
      g.lineTo(-w * 0.8 + 1, 5);
      g.lineTo(w * 0.8 - 1, 5);
      g.lineTo(w + 1.5, -8);
      g.lineTo(w - 2, -8);
      g.lineTo(w * 0.72, 2.4);
      g.lineTo(-w * 0.72, 2.4);
      g.lineTo(-w + 2, -8);
      g.closePath();
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.25)';
      rr(g, -w + 2, -6, 3, 8, 1.5);
      g.fill();
      // あつめたポップコーンが盛られていく
      const heap = Math.min(d.caught || 0, 22);
      for (let k = 0; k < heap; k++) {
        const hx = Math.sin(k * 2.4) * (w - 6) * 0.8;
        const hy = -6 - ((k / 4) | 0) * 2.6 + (k % 2);
        g.fillStyle = k % 3 ? '#f7ecd0' : '#f0dcb0';
        g.beginPath(); g.arc(hx, hy, 2.1, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.7)';
        g.beginPath(); g.arc(hx - 0.5, hy - 0.6, 0.8, 0, TAU); g.fill();
      }
      g.restore();
      // カウント
      g.fillStyle = 'rgba(255,255,255,0.92)';
      rr(g, W - 32, 16, 30, 12, 3);
      g.fill();
      g.fillStyle = '#c05a1a';
      g.font = 'bold 5px sans-serif';
      g.fillText(`🍿 ${d.caught}/30`, W - 29, 24.5);
    }
  },
};
