// シーン: シャボン玉の虹色 (薄膜干渉 — 膜の厚みが色になる)
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad, sun, cloud, softShadow } from '../engine/art.js';
import { thinFilmColor, gamma } from '../engine/spectrum.js';

export default {
  id: 'soap',
  name: 'シャボン玉の虹色',
  emoji: '🫧',
  desc: '膜のあつみが 色でわかる',
  goal: '🎯 膜がうすくなる色の変化を見て…われる直前の「黒い膜」を見とどけよう!',
  clearMsg: '黒=光が消しあう100nm以下!観察マスター!',
  spectrumN: 16,

  init(ctx) {
    const d = ctx.data;
    d.thick0 = 900;    // わく上端の膜厚 [nm]
    d.blow = 0;
    d.time = 0;
    d.blackT = 0;
    d.popped = false;
    d.bubbles = [];
    ctx.setTools([
      { id: 'renew', icon: '🧴', label: '膜をはりなおす' },
      { id: 'blow', icon: '💨', label: 'そっとふく' },
    ]);
    ctx.setHint('じーっと観察!重力で膜が下にたれて うすい所から色が変わる');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.cx = W / 2;
    d.cy = Math.min(H * 0.42, H - 90);
    d.R = Math.min(W * 0.32, H * 0.22, 34);
    d.rows = 36;
  },

  update(ctx, dt) {
    const d = ctx.data;
    if (!d.popped) {
      d.time += dt;
      // 排水: 上からうすくなる (上端の厚みが減っていく)
      d.thick0 = Math.max(5, d.thick0 - dt * (26 + d.blow * 60));
      d.blow = Math.max(0, (d.blow ?? 0) - dt * 1.4);
      // 色の帯を計算 (行ごとに厚み→干渉色)
      d.bandCols = [];
      let blackRows = 0;
      for (let r2 = 0; r2 < d.rows; r2++) {
        const t = r2 / (d.rows - 1);
        // 下ほど厚い (重力排水) + ゆらぎ
        const th = d.thick0 + t * t * 900 + Math.sin(d.time * 1.3 + t * 9) * 22 * (0.3 + d.blow);
        const [cr, cg, cb] = thinFilmColor(Math.max(2, th), ctx.spectrum, 1.35, 1);
        const k = 5.5;
        d.bandCols.push(`rgba(${(gamma(Math.min(1, cr * k)) * 255) | 0},${(gamma(Math.min(1, cg * k)) * 255) | 0},${(gamma(Math.min(1, cb * k)) * 255) | 0},0.9)`);
        if (th < 90) blackRows++;
      }
      d.blackFrac = blackRows / d.rows;
      // 黒い膜の観察ゴール
      if (d.blackFrac > 0.12) {
        d.blackT += dt;
        if (!d.saidB) { d.saidB = true; ctx.toast('⚫ 上が黒くなった!膜が光の波長より うすい証拠'); }
        ctx.progress(Math.min(1, d.blackT / 1.6));
        // われる
        if (d.thick0 <= 6 && d.blackT > 2.2) this._pop(ctx);
      } else if (!ctx._cleared) {
        d.blackT = 0;
        ctx.progress(clamp(1 - d.thick0 / 900, 0, 0.9));
      }
    }
    // 飛んでるシャボン玉
    for (let i = d.bubbles.length - 1; i >= 0; i--) {
      const b = d.bubbles[i];
      b.x += b.vx * dt; b.y += b.vy * dt;
      b.vy -= dt * 6;
      b.vx += Math.sin(ctx.t * 2 + b.ph) * dt * 8;
      b.life -= dt;
      if (b.life <= 0 || b.y < -10) {
        ctx.fx.addSpray(b.x, b.y, 0, 0, 'rgba(200,230,255,0.8)', 0.5, 0.4);
        d.bubbles.splice(i, 1);
      }
    }
  },

  _pop(ctx) {
    const d = ctx.data;
    d.popped = true;
    ctx.sfx.pop(1.6);
    ctx.vibrate(30);
    for (let k = 0; k < 26; k++) {
      const a = rand(0, TAU);
      ctx.fx.addSpray(d.cx + Math.cos(a) * d.R, d.cy + Math.sin(a) * d.R * 1.15,
        Math.cos(a) * rand(10, 30), Math.sin(a) * rand(10, 30), 'rgba(210,235,255,0.85)', 0.5, 0.7);
    }
    ctx.toast('パチン!…🧴 ボタンで はりなおせるよ');
  },

  onDown(ctx) {
    // タップでもそっと吹ける
    const d = ctx.data;
    if (!d.popped) d.blow = Math.min(1, (d.blow ?? 0) + 0.5);
  },

  onTool(ctx, id) {
    const d = ctx.data;
    if (id === 'renew') {
      d.thick0 = 900; d.popped = false; d.blackT = 0; d.saidB = false;
      ctx.sfx.splash(0.4);
      ctx.toast('🧴 あたらしい膜!はじめは厚くて 色がこまかい');
    }
    if (id === 'blow' && !d.popped) {
      d.blow = 1;
      // 小さいシャボン玉が飛び出す
      if (d.bubbles.length < 5) {
        d.bubbles.push({ x: d.cx + rand(-5, 5), y: d.cy, vx: rand(6, 14), vy: rand(-14, -5), life: rand(3, 5), ph: rand(0, 6), r: rand(3, 5.5), th: d.thick0 * rand(0.7, 1) });
      }
      ctx.sfx.drip();
    }
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    g.fillStyle = vgrad(g, 0, H, [[0, '#bfe0f2'], [0.7, '#dcedf8'], [1, '#eef6fb']]);
    g.fillRect(0, 0, W, H);
    sun(g, W * 0.85, 12, 4.5);
    cloud(g, W * 0.2, 16, 0.8, 0.85);
    g.fillStyle = '#9ac96a';
    g.fillRect(0, H * 0.9, W, H * 0.1);
    // わく (ハンドル)
    g.strokeStyle = '#e8788a';
    g.lineWidth = 2;
    g.beginPath();
    g.ellipse(d.cx, d.cy, d.R + 1.6, d.R * 1.15 + 1.6, 0, 0, TAU);
    g.stroke();
    g.beginPath();
    g.moveTo(d.cx + d.R * 0.5, d.cy + d.R * 1.05);
    g.lineTo(d.cx + d.R + 14, d.cy + d.R * 1.15 + 26);
    g.stroke();
  },

  drawFront(ctx, g) {
    const d = ctx.data;
    if (!d.popped && d.bandCols) {
      // 膜: 楕円クリップ内に横帯 (上=うすい)
      g.save();
      g.beginPath();
      g.ellipse(d.cx, d.cy, d.R, d.R * 1.15, 0, 0, TAU);
      g.clip();
      const y0 = d.cy - d.R * 1.15, hh = d.R * 2.3;
      for (let r2 = 0; r2 < d.rows; r2++) {
        g.fillStyle = d.bandCols[r2];
        g.fillRect(d.cx - d.R - 1, y0 + (r2 / d.rows) * hh - 0.2, d.R * 2 + 2, hh / d.rows + 0.5);
      }
      // ハイライト
      g.fillStyle = 'rgba(255,255,255,0.22)';
      g.beginPath();
      g.ellipse(d.cx - d.R * 0.35, d.cy - d.R * 0.5, d.R * 0.2, d.R * 0.36, -0.6, 0, TAU);
      g.fill();
      g.restore();
    }
    // 飛んでるシャボン玉 (縁に干渉色)
    for (const b of d.bubbles) {
      const [cr, cg, cb] = thinFilmColor(b.th, ctx.spectrum, 1.35, 0.6);
      const k = 4;
      g.strokeStyle = `rgba(${(gamma(Math.min(1, cr * k)) * 255) | 0},${(gamma(Math.min(1, cg * k)) * 255) | 0},${(gamma(Math.min(1, cb * k)) * 255) | 0},0.85)`;
      g.lineWidth = 0.9;
      g.beginPath();
      g.arc(b.x, b.y, b.r, 0, TAU);
      g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.14)';
      g.fill();
    }
    // あつみメーター
    g.fillStyle = 'rgba(255,255,255,0.92)';
    rr(g, 4, 16, 42, 12, 3);
    g.fill();
    g.fillStyle = '#556';
    g.font = 'bold 2.7px sans-serif';
    g.fillText(`上端のあつみ ${(d.thick0 ?? 0) | 0}nm`, 7, 21);
    g.fillStyle = (d.blackFrac ?? 0) > 0.12 ? '#2a9a4a' : '#889';
    g.font = '2.4px sans-serif';
    g.fillText((d.blackFrac ?? 0) > 0.12 ? '⚫ 黒い膜!観察中…' : '100nm以下で黒くなるよ', 7, 25.3);
  },
};
