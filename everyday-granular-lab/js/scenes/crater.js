// シーン: クレーター実験 (落とす高さで大きさが変わる!)
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad, softShadow } from '../engine/art.js';
import { SPRITES } from '../engine/grainRenderer.js';

export default {
  id: 'crater',
  name: 'クレーター実験',
  emoji: '☄️',
  desc: '高いほど 大きなクレーター',
  goal: '🎯 高さをかえて 大・中・小 3しゅるいのクレーターを つくろう!',
  clearMsg: '月面みたいな実験結果!',
  maxParticles: 5000,
  tilt: false,
  rattlePitch: 1.1,

  init(ctx) {
    const d = ctx.data;
    d.records = []; // {h, w}
    d.sizes = new Set(); // 'S' | 'M' | 'L'
    d.ball = null;
    d.measureT = 0;
    ctx.sim.defineMaterial(0, { // ココアパウダーの表層
      r: 0.6, rJit: 0.06, mu: 0.9, interlock: 3, vmax: 85,
      sprite: SPRITES.SAND,
      colors: [[0.45, 0.32, 0.24], [0.4, 0.28, 0.2]],
    });
    ctx.sim.defineMaterial(1, { // 小麦粉の下層
      r: 0.62, rJit: 0.06, mu: 0.9, interlock: 3, vmax: 85,
      sprite: SPRITES.SAND,
      colors: [[0.97, 0.95, 0.88], [0.93, 0.9, 0.82]],
    });
    ctx.setHint('タップの高さから ボールを落とすよ。高いほど 深いクレーター!');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.bedTop = H - Math.min(H * 0.26, 42);
    if (!d.filled) {
      d.filled = true;
      // 下層: 小麦粉 / 表層: ココア (衝突で白い下層が見える!)
      ctx.fill(2, d.bedTop + 5, W - 2, H - 3, 1);
      ctx.fill(2, d.bedTop, W - 2, d.bedTop + 5, 0);
    }
  },

  onDown(ctx, p) {
    const d = ctx.data, s = ctx.sim;
    if (d.ball) return; // 1球ずつ
    if (p.y > d.bedTop - 8) {
      ctx.toast('☝️ 粉より上を タップしてね');
      return;
    }
    d.ball = s.addSolid({
      x: clamp(p.x, 12, ctx.W - 12),
      y: p.y,
      r: 4.5, mass: 14, grav: 0.8, mu: 0.6,
    });
    d.dropY = p.y;
    d.measureT = 0;
    ctx.sfx.pop(0.8);
  },

  update(ctx, dt) {
    const d = ctx.data, s = ctx.sim;
    const { W } = ctx;
    // 基準面 (静定後の表面プロファイル)
    if (!d.baseline && ctx.t > 1.2) {
      d.baseline = [];
      for (let x = 0; x <= W; x += 2) d.baseline.push(s.topAt(x, 1.5));
    }
    if (!d.ball) { ctx.progress(ctx._cleared ? 1 : Math.min(0.95, (d.distinctCount || 0) / 3)); return; }
    if (!d.baseline) return;
    const b = d.ball;
    // 着弾の瞬間: 土煙
    if (!d.hit && b.y > d.bedTop - 6 && Math.abs(b.vy) > 40) {
      d.hit = true;
      ctx.sfx.splash(0.8);
      ctx.vibrate(30);
      for (let k = 0; k < 8; k++) {
        ctx.fx.addDust(b.x + rand(-8, 8), d.bedTop + rand(-2, 2), rand(2.5, 4.5), '120,90,70');
      }
    }
    // 静止したらクレーター幅を計測
    if (Math.abs(b.vx) + Math.abs(b.vy) < 14 && b.y > d.bedTop - 10) {
      d.measureT += dt;
      if (d.measureT > 0.6) {
        // クレーター幅: ボール周辺で表面が元より凹んでいる範囲
        const depressed = (x) => {
          const base = d.baseline[Math.round(x / 2)] ?? d.bedTop;
          return Math.abs(s.topAt(x, 1.5) - base) > 2.2;
        };
        let x0 = b.x, x1 = b.x;
        for (let x = b.x; x > 4; x -= 2) { if (depressed(x)) x0 = x; else break; }
        for (let x = b.x; x < W - 4; x += 2) { if (depressed(x)) x1 = x; else break; }
        const width = x1 - x0;
        if (width < 5) {
          // すでにクレーターの場所 → はかれない
          ctx.toast('🕳️ そこはもうへこんでる!べつの場所に落とそう');
          const idx0 = s.solids.indexOf(b);
          if (idx0 >= 0) s.solids.splice(idx0, 1);
          d.ball = null;
          d.hit = false;
          d.baseline = null;
          return;
        }
        // 記録済みの幅たちと 4 いじょう差があれば「ちがう大きさ」と認定
        const distinct = d.records.every((r) => Math.abs(r.w - width) >= 4);
        if (distinct) d.distinctCount = (d.distinctCount || 0) + 1;
        const size = width < 14 ? 'S' : width < 22 ? 'M' : 'L';
        d.records.push({ h: (d.bedTop - d.dropY) | 0, w: width | 0, size });
        if (d.records.length > 5) d.records.shift();
        ctx.toast(`☄️ はば ${width | 0} のクレーター!${distinct ? ' (ちがう大きさ発見!)' : ''}`);
        ctx.sfx.chime();
        // ボールを回収
        const idx = s.solids.indexOf(b);
        if (idx >= 0) s.solids.splice(idx, 1);
        d.ball = null;
        d.hit = false;
        d.baseline = null; // 新しい表面を次の基準に
        if ((d.distinctCount || 0) >= 3) ctx.progress(1);
      }
    }
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    // 夜の理科室 (月のポスター)
    g.fillStyle = vgrad(g, 0, H, [[0, '#2a2a44'], [1, '#1c1c30']]);
    g.fillRect(0, 0, W, H);
    // 月
    const mx = W * 0.8, my = 22;
    const grd = g.createRadialGradient(mx - 2, my - 2, 2, mx, my, 9);
    grd.addColorStop(0, '#f4f0d8');
    grd.addColorStop(1, '#c8c4a8');
    g.fillStyle = grd;
    g.beginPath(); g.arc(mx, my, 9, 0, TAU); g.fill();
    g.fillStyle = 'rgba(140,136,110,0.5)';
    for (const [ox, oy, r] of [[-3, -2, 2], [2, 3, 1.5], [3, -3, 1.2], [-1, 3.5, 1]]) {
      g.beginPath(); g.arc(mx + ox, my + oy, r, 0, TAU); g.fill();
    }
    g.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 24; i++) {
      g.fillRect((i * 41.3) % W, (i * 27.7) % (H * 0.5), 0.7, 0.7);
    }
    // 高さメモリ (定規)
    g.strokeStyle = 'rgba(255,255,255,0.35)';
    g.fillStyle = 'rgba(255,255,255,0.5)';
    g.lineWidth = 0.5;
    g.font = '2.6px sans-serif';
    for (let k = 1; k <= 4; k++) {
      const y = d.bedTop - k * 30;
      if (y < 34) break;
      g.beginPath(); g.moveTo(2, y); g.lineTo(8, y); g.stroke();
      g.fillText(`${k * 30}`, 9, y + 1);
    }
    // 実験バット (トレー)
    g.fillStyle = '#4a4a58';
    rr(g, -2, d.bedTop - 4, W + 4, 5, 2);
    g.fill();
  },

  drawFront(ctx, g) {
    const { W } = ctx, d = ctx.data;
    // 落下中のボール
    if (d.ball) {
      const b = d.ball;
      const grd = g.createRadialGradient(b.x - 1.2, b.y - 1.2, 0.6, b.x, b.y, b.r);
      grd.addColorStop(0, '#a8b4c8');
      grd.addColorStop(1, '#5a6478');
      g.fillStyle = grd;
      g.beginPath(); g.arc(b.x, b.y, b.r, 0, TAU); g.fill();
    }
    // 記録ノート
    g.fillStyle = 'rgba(255,252,240,0.94)';
    rr(g, W - 52, 16, 50, 26, 2);
    g.fill();
    g.fillStyle = '#7a5230';
    g.font = 'bold 3.2px sans-serif';
    g.fillText('📓 じっけん記録', W - 49, 21.5);
    g.font = '2.8px sans-serif';
    const recs = d.records.slice(-4);
    recs.forEach((r, k) => {
      g.fillStyle = '#556';
      g.fillText(`高さ${r.h} → はば${r.w} (${r.size})`, W - 49, 26 + k * 4);
    });
    // ちがう大きさをいくつ見つけたか
    g.font = 'bold 3.4px sans-serif';
    const dc = d.distinctCount || 0;
    for (let k = 0; k < 3; k++) {
      g.fillStyle = k < dc ? '#2a9a4a' : '#bbb';
      g.fillText(k < dc ? '✅' : '⬜', W - 49 + k * 10, 40);
    }
    g.fillStyle = '#7a5230';
    g.fillText(`ちがう大きさ ${dc}/3`, W - 49 + 30 - 12, 40);
  },
};
