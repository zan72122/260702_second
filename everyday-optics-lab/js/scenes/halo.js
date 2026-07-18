// シーン: 月のハロ (氷のつぶが 22°の輪をつくる)
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad } from '../engine/art.js';
import { drawAngleArc } from './common.js';

export default {
  id: 'halo',
  name: '月のハロ',
  emoji: '🌙',
  desc: '月のまわりに 光のわっか',
  goal: '🎯 うす雲を ちょうどよくして 22°ハロと「幻月」を見つけよう!',
  clearMsg: '氷晶プリズムの最小偏角=22°だった!',
  spectrumN: 8,

  init(ctx) {
    const d = ctx.data;
    d.cirrus = 0;
    d.plate = 0;
    d.moon = { x: 0.5, y: 0.62 }; // uv
    d.okT = 0;
    ctx.setTools([
      { id: 'cloudUp', icon: '☁️', label: 'うす雲をふやす' },
      { id: 'cloudDn', icon: '🌬️', label: '雲をへらす' },
      { id: 'plate', icon: '❄️', label: '板状けっしょう' },
      { id: 'angle', icon: '📐', label: '角度を見る' },
    ]);
    ctx.setHint('月をドラッグして うす雲を調整。雲がこすぎても うすすぎてもダメ');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.ground = Math.min(H - 22, H * 0.9);
    d.degUv = 0.012; // 1° の uv 距離
  },

  sky(ctx) {
    const d = ctx.data;
    return {
      name: 'halo',
      uniforms: {
        uMoon: [d.moon.x, 1 - d.moon.y], // shader uv は下原点
        uDegPx: d.degUv,
        uCirrus: d.cirrus,
        uPlate: d.plate,
      },
    };
  },

  update(ctx, dt) {
    const d = ctx.data, p = ctx.primary;
    if (p && p.y < d.ground) {
      d.moon.x = clamp(p.x / ctx.W, 0.2, 0.8);
      d.moon.y = clamp(p.y / (d.ground / ctx.H * ctx.H), 0.15, 0.7);
    }
    // ハロの見え具合: 雲量 0.3〜0.75 が適正 (こすぎると月ごとかすむ)
    const c = d.cirrus;
    d.ringVis = c < 0.05 ? 0 : c <= 0.75 ? clamp((c - 0.05) / 0.3, 0, 1) : clamp(1 - (c - 0.75) * 3, 0, 1);
    const dogVis = d.ringVis * d.plate;
    if (d.ringVis > 0.55 && dogVis > 0.5) {
      d.okT += dt;
      ctx.progress(Math.min(1, d.okT / 2));
      if (!d.saidD) { d.saidD = true; ctx.toast('✨ 幻月 (げんげつ)!左右 22° に光のたま'); }
    } else {
      d.okT = Math.max(0, d.okT - dt * 0.6);
      if (!ctx._cleared) {
        ctx.progress(clamp(d.ringVis * 0.6 + dogVis * 0.35, 0, 0.95));
      }
    }
  },

  onTool(ctx, id) {
    const d = ctx.data;
    if (id === 'cloudUp') { d.cirrus = clamp(d.cirrus + 0.16, 0, 1); ctx.toast(`☁️ うす雲 ${(d.cirrus * 100) | 0}% ${d.cirrus > 0.8 ? '(こすぎ!)' : ''}`); }
    if (id === 'cloudDn') { d.cirrus = clamp(d.cirrus - 0.16, 0, 1); ctx.toast(`🌬️ うす雲 ${(d.cirrus * 100) | 0}%`); }
    if (id === 'plate') {
      d.plate = d.plate > 0 ? 0 : 1;
      ctx.setToolActive(d.plate ? 'plate' : '');
      ctx.toast(d.plate ? '❄️ 六角の板の氷晶が ふわふわ水平にただよう…' : '❄️ OFF');
    }
    if (id === 'angle') {
      d.showAngle = !d.showAngle;
    }
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    // 夜の野原
    g.fillStyle = vgrad(g, d.ground - 4, H, [[0, '#141a22'], [1, '#0c1016']]);
    g.fillRect(0, d.ground - 2, W, H - d.ground + 2);
    g.fillStyle = '#0e131a';
    for (let x = 0; x < W; x += 5) {
      g.fillRect(x, d.ground - 2 - (x * 7 % 5) * 0.5, 3, 4);
    }
  },

  drawFront(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    // 角度ガイド (22°)
    if (d.showAngle) {
      const mx = d.moon.x * W, my = d.moon.y * H;
      const r22 = 22 * d.degUv * H; // シェーダの角距離→ワールド換算
      drawAngleArc(g, mx, my, -0.35, 0.35, r22, '22°', 'rgba(200,220,255,0.85)');
      g.strokeStyle = 'rgba(200,220,255,0.5)';
      g.lineWidth = 0.4;
      g.setLineDash([1, 1.4]);
      g.beginPath();
      g.moveTo(mx, my);
      g.lineTo(mx + r22, my);
      g.stroke();
      g.setLineDash([]);
    }
    // メーター
    g.fillStyle = 'rgba(255,255,255,0.92)';
    rr(g, 4, 16, 42, 12, 3);
    g.fill();
    g.fillStyle = '#556';
    g.font = 'bold 2.7px sans-serif';
    g.fillText(`うす雲 ${((d.cirrus ?? 0) * 100) | 0}%`, 7, 20.6);
    g.fillStyle = '#ddd';
    rr(g, 7, 22.4, 36, 2.8, 1.4);
    g.fill();
    g.fillStyle = '#8ab8e8';
    rr(g, 7, 22.4, Math.max(0.01, 36 * (d.cirrus ?? 0)), 2.8, 1.4);
    g.fill();
    // 適正ゾーン
    g.fillStyle = 'rgba(90,190,110,0.5)';
    rr(g, 7 + 36 * 0.3, 22.4, 36 * 0.45, 2.8, 1.4);
    g.fill();
  },
};
