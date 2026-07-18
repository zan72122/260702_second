// シーン: オーロラ観察 (太陽風の強さで色がふえる)
// 発光色は本物の輝線: O 557.7nm(緑)・O 630nm(赤)・N₂⁺ 427.8nm(紫)
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad } from '../engine/art.js';

export default {
  id: 'aurora',
  name: 'オーロラ観察',
  emoji: '🌌',
  desc: '緑・赤・紫…ぜんぶ出せる?',
  goal: '🎯 太陽風を強めて 3色のオーロラを ぜんぶ観察しよう!',
  clearMsg: '3色コンプリート!色のちがいは 高さと気体のちがい!',
  spectrumN: 8,

  init(ctx) {
    const d = ctx.data;
    d.strength = 0.12;
    d.target = 0.12;
    d.seen = { green: 0, red: 0, purple: 0 };
    d.flareT = 0;
    ctx.setTools([
      { id: 'flare', icon: '💥', label: '太陽フレア発生!' },
    ]);
    ctx.setHint('画面を上下にドラッグ=太陽風の強さ。強いほど 高い空・低い空も光る');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.ground = Math.min(H - 24, H * 0.88);
  },

  sky(ctx) {
    return { name: 'aurora', uniforms: { uStrength: ctx.data.strength } };
  },

  update(ctx, dt) {
    const d = ctx.data, p = ctx.primary;
    if (p) {
      d.target = clamp(1 - p.y / d.ground, 0.02, 1);
    }
    // フレア: 一時的にブースト
    if (d.flareT > 0) {
      d.flareT -= dt;
      d.strength += (Math.max(d.target, 0.95) - d.strength) * Math.min(1, dt * 3);
    } else {
      d.strength += (d.target - d.strength) * Math.min(1, dt * 1.2);
    }
    // 観察ゲージ: 各色が出ている条件 (シェーダの式と同じしきい値)
    const s = d.strength;
    if (s > 0.12) d.seen.green = Math.min(1, d.seen.green + dt * 0.5);
    if (s > 0.4) d.seen.red = Math.min(1, d.seen.red + dt * 0.45);
    if (s > 0.72) d.seen.purple = Math.min(1, d.seen.purple + dt * 0.5);
    if (d.seen.green >= 1 && !d.saidG) { d.saidG = true; ctx.toast('💚 緑 (O原子 557.7nm・高度100-200km) ゲット!'); ctx.sfx.chime(); }
    if (d.seen.red >= 1 && !d.saidR) { d.saidR = true; ctx.toast('❤️ 赤 (O原子 630nm・高度200km以上) ゲット!'); ctx.sfx.chime(); }
    if (d.seen.purple >= 1 && !d.saidP) { d.saidP = true; ctx.toast('💜 紫 (窒素分子・高度100km以下) ゲット!'); ctx.sfx.chime(); }
    const tot = d.seen.green + d.seen.red + d.seen.purple;
    ctx.progress(tot >= 3 ? 1 : Math.min(0.97, tot / 3));
  },

  onTool(ctx, id) {
    if (id !== 'flare') return;
    const d = ctx.data;
    d.flareT = 5;
    ctx.vibrate(30);
    ctx.toast('💥 太陽フレア!2日後…荷電粒子が地球にとうちゃく!');
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    // 雪の丘とロッジ (空はシェーダ)
    g.fillStyle = vgrad(g, d.ground - 8, H, [[0, '#cdd8e6'], [1, '#aab8cc']]);
    g.beginPath();
    g.moveTo(0, d.ground + 4);
    for (let x = 0; x <= W; x += 8) {
      g.lineTo(x, d.ground + Math.sin(x * 0.08) * 2 - 2);
    }
    g.lineTo(W, H); g.lineTo(0, H);
    g.closePath();
    g.fill();
    // ロッジ
    const lx = W * 0.18, ly = d.ground - 1;
    g.fillStyle = '#5a4632';
    rr(g, lx - 8, ly - 9, 16, 10, 1);
    g.fill();
    g.fillStyle = '#7a6248';
    g.beginPath();
    g.moveTo(lx - 10, ly - 8.5);
    g.lineTo(lx, ly - 15);
    g.lineTo(lx + 10, ly - 8.5);
    g.closePath();
    g.fill();
    g.fillStyle = 'rgba(255,214,120,0.95)';
    rr(g, lx - 3.5, ly - 6.5, 3, 3.4, 0.6);
    g.fill();
    // もみの木
    for (const tx of [W * 0.7, W * 0.82, W * 0.9]) {
      g.fillStyle = '#22303c';
      for (let k = 0; k < 3; k++) {
        g.beginPath();
        g.moveTo(tx - 5 + k, d.ground - k * 4);
        g.lineTo(tx, d.ground - 8 - k * 4);
        g.lineTo(tx + 5 - k, d.ground - k * 4);
        g.closePath();
        g.fill();
      }
    }
  },

  drawFront(ctx, g) {
    const { W } = ctx, d = ctx.data;
    // 太陽風メーター
    g.fillStyle = 'rgba(255,255,255,0.92)';
    rr(g, 4, 16, 40, 12, 3);
    g.fill();
    g.fillStyle = '#556';
    g.font = 'bold 2.7px sans-serif';
    g.fillText('たいようふう', 7, 20.6);
    g.fillStyle = '#ddd';
    rr(g, 7, 22.4, 34, 2.8, 1.4);
    g.fill();
    g.fillStyle = d.flareT > 0 ? '#e8783a' : '#5a9ad8';
    rr(g, 7, 22.4, Math.max(0.01, 34 * d.strength), 2.8, 1.4);
    g.fill();
    // 3色スタンプ
    const marks = [
      ['💚', d.seen.green], ['❤️', d.seen.red], ['💜', d.seen.purple],
    ];
    g.fillStyle = 'rgba(255,255,255,0.92)';
    rr(g, W - 36, 16, 34, 12, 3);
    g.fill();
    marks.forEach(([em, v], i) => {
      g.globalAlpha = 0.25 + v * 0.75;
      g.font = '4.5px sans-serif';
      g.fillText(em, W - 33 + i * 10, 24);
      g.globalAlpha = 1;
      g.fillStyle = '#5ad06a';
      if (v > 0 && v < 1) {
        g.fillStyle = '#ccc';
        rr(g, W - 33 + i * 10, 25.5, 6, 1, 0.5);
        g.fill();
        g.fillStyle = '#5ad06a';
        rr(g, W - 33 + i * 10, 25.5, 6 * v, 1, 0.5);
        g.fill();
      }
      g.fillStyle = '#556';
    });
  },
};
