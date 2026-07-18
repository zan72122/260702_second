// シーン: 月食の赤い月 (地球の影の中で 月はなぜ赤い?)
// 本影の月に届くのは 地球大気で屈折した光だけ — レイリー透過を波長計算
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad } from '../engine/art.js';
import { rayleighBeta, gamma } from '../engine/spectrum.js';

export default {
  id: 'eclipse',
  name: '月食の赤い月',
  emoji: '🌕',
  desc: 'かけて…消えずに 赤くなる!',
  goal: '🎯 月を地球の影のまん中まで進めて「赤銅色の月」を観察しよう!',
  clearMsg: '世界中の朝焼け夕焼けが 月を照らしてる!',
  spectrumN: 16,

  init(ctx) {
    const d = ctx.data;
    d.pos = -1.6;   // 月の位置 (本影中心=0, 半径1が本影のふち)
    d.okT = 0;
    // 大気を通った光の色 (レイリー透過 ×2回分) を一度だけ計算
    let r = 0, g2 = 0, b = 0;
    for (const s of ctx.spectrum) {
      const T = Math.exp(-3.4 * rayleighBeta(s.l));
      r += s.rgb[0] * T; g2 += s.rgb[1] * T; b += s.rgb[2] * T;
    }
    const mx = Math.max(r, g2, b);
    d.redCol = [r / mx, g2 / mx, b / mx];
    ctx.setHint('本影に入っても 真っ暗にならない…地球のふちの大気がレンズに!');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.moonY = H * 0.32;
    d.moonR = Math.min(W * 0.13, 14);
    d.umbraR = d.moonR * 2.6;   // 本影の半径 (月の約2.6倍 — 実際と同じ比率)
    d.cx = W / 2;
    d.diagY = Math.min(H * 0.76, H - 52);
  },

  update(ctx, dt) {
    const d = ctx.data, p = ctx.primary;
    if (p) {
      d.pos = clamp((p.x / ctx.W - 0.5) * 4.4, -2.1, 2.1);
    }
    // 月面の状態: 本影に入った割合
    const dist = Math.abs(d.pos) * d.umbraR;
    d.inUmbra = clamp(1 - (dist - d.moonR * 0.2) / (d.umbraR * 0.8), 0, 1);
    const total = Math.abs(d.pos) < (d.umbraR - d.moonR * 0.9) / d.umbraR;
    d.total = total;
    if (total) {
      d.okT += dt;
      ctx.progress(Math.min(1, d.okT / 2.2));
      if (!d.saidOk) { d.saidOk = true; ctx.sfx.chime(); ctx.toast('🔴 皆既月食!赤銅色 (しゃくどういろ) の月'); }
    } else {
      d.okT = Math.max(0, d.okT - dt * 0.5);
      d.saidOk = false;
      if (!ctx._cleared) {
        ctx.progress(clamp(d.inUmbra * 0.9, 0.05, 0.95));
      }
    }
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    g.fillStyle = vgrad(g, 0, H, [[0, '#080c1c'], [1, '#10142a']]);
    g.fillRect(0, 0, W, H);
    for (let k = 0; k < 40; k++) {
      g.fillStyle = `rgba(255,255,255,${0.25 + (k % 4) * 0.15})`;
      g.fillRect((k * 37 % 100) / 100 * W, (k * 53 % 97) / 100 * H * 0.6, 0.5, 0.5);
    }
    // しくみ図 (下): 太陽→地球→影のコーン
    const y = d.diagY;
    g.fillStyle = 'rgba(255,255,255,0.06)';
    rr(g, 4, y - 17, W - 8, 34, 3);
    g.fill();
    // 太陽
    g.fillStyle = '#ffd25a';
    g.beginPath(); g.arc(W * 0.1, y, 6, 0, TAU); g.fill();
    // 地球
    g.fillStyle = '#4a7ac8';
    g.beginPath(); g.arc(W * 0.42, y, 3.6, 0, TAU); g.fill();
    g.fillStyle = '#5aa85a';
    g.beginPath(); g.arc(W * 0.41, y - 1, 1.4, 0, TAU); g.fill();
    // 影のコーン (本影)
    g.fillStyle = 'rgba(20,24,40,0.85)';
    g.beginPath();
    g.moveTo(W * 0.42, y - 3.6);
    g.lineTo(W * 0.95, y - 0.8);
    g.lineTo(W * 0.95, y + 0.8);
    g.lineTo(W * 0.42, y + 3.6);
    g.closePath();
    g.fill();
    // 大気で屈折した赤い光
    const [cr, cg, cb] = ctx.data.redCol ?? [1, 0.3, 0.1];
    g.strokeStyle = `rgba(${cr * 255},${cg * 255},${cb * 255},0.75)`;
    g.lineWidth = 0.6;
    for (const sgn of [-1, 1]) {
      g.beginPath();
      g.moveTo(W * 0.16, y + sgn * 4.5);
      g.lineTo(W * 0.42, y + sgn * 4.3);
      g.quadraticCurveTo(W * 0.5, y + sgn * 3.4, W * 0.72, y + sgn * 0.5);
      g.stroke();
    }
    g.fillStyle = 'rgba(220,225,240,0.8)';
    g.font = '2.4px sans-serif';
    g.fillText('☀️', W * 0.07, y - 8);
    g.fillText('🌏 大気のふちで屈折した赤い光が 影の中へ', W * 0.2, y + 13);
  },

  drawFront(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    // 本影のリング (見えない影を可視化)
    g.strokeStyle = 'rgba(150,80,80,0.3)';
    g.lineWidth = 0.6;
    g.setLineDash([2, 2]);
    g.beginPath();
    g.arc(d.cx, d.moonY, d.umbraR, 0, TAU);
    g.stroke();
    g.setLineDash([]);
    g.fillStyle = 'rgba(200,150,150,0.55)';
    g.font = '2.4px sans-serif';
    g.fillText('地球の本影', d.cx - d.umbraR + 2, d.moonY - d.umbraR - 2);
    // 月 (位置 d.pos)
    const mx = d.cx + d.pos * d.umbraR;
    const [cr, cg, cb] = d.redCol;
    // 月面: 影に入った部分は赤銅色、外は白
    g.save();
    g.beginPath();
    g.arc(mx, d.moonY, d.moonR, 0, TAU);
    g.clip();
    // 白い月面
    g.fillStyle = '#e8e4d8';
    g.beginPath(); g.arc(mx, d.moonY, d.moonR, 0, TAU); g.fill();
    // クレーター
    g.fillStyle = 'rgba(160,155,140,0.5)';
    for (const [ox, oy, r2] of [[-0.3, -0.2, 0.24], [0.35, 0.15, 0.16], [0.05, 0.42, 0.2], [-0.42, 0.32, 0.13]]) {
      g.beginPath();
      g.arc(mx + ox * d.moonR, d.moonY + oy * d.moonR, r2 * d.moonR, 0, TAU);
      g.fill();
    }
    // 本影の中の部分を赤銅色に (影の円でクリップ的に重ねる)
    const rg = g.createRadialGradient(d.cx, d.moonY, d.umbraR * 0.55, d.cx, d.moonY, d.umbraR);
    rg.addColorStop(0, `rgba(${cr * 190},${cg * 190},${cb * 190},0.96)`);
    rg.addColorStop(0.85, `rgba(${cr * 200},${cg * 200},${cb * 200},0.9)`);
    rg.addColorStop(1, 'rgba(120,60,50,0)');
    g.fillStyle = rg;
    g.beginPath();
    g.arc(d.cx, d.moonY, d.umbraR, 0, TAU);
    g.fill();
    g.restore();
    // 赤い月のほのかな光
    if (d.inUmbra > 0.5) {
      g.save();
      g.globalCompositeOperation = 'lighter';
      const gl = g.createRadialGradient(mx, d.moonY, 0, mx, d.moonY, d.moonR * 2);
      gl.addColorStop(0, `rgba(${cr * 255},${cg * 255},${cb * 255},${0.15 * d.inUmbra})`);
      gl.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gl;
      g.beginPath();
      g.arc(mx, d.moonY, d.moonR * 2, 0, TAU);
      g.fill();
      g.restore();
    }
    // 操作ヒント
    g.fillStyle = 'rgba(255,255,255,0.7)';
    g.font = '2.6px sans-serif';
    g.textAlign = 'center';
    g.fillText('🌕 ⇄ 左右にドラッグで月が進む', d.cx, d.moonY + d.umbraR + 8);
    g.textAlign = 'left';
    // メーター
    g.fillStyle = 'rgba(255,255,255,0.92)';
    rr(g, 4, 16, 42, 13, 3);
    g.fill();
    g.fillStyle = '#556';
    g.font = 'bold 2.6px sans-serif';
    g.fillText(d.total ? '🔴 皆既中! 観察中…' : `影に入った ${((d.inUmbra ?? 0) * 100) | 0}%`, 7, 21);
    g.fillStyle = '#889';
    g.font = '2.3px sans-serif';
    g.fillText('赤の正体=世界中の夕焼けの光', 7, 25.4);
  },
};
