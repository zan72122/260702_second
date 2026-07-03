// シーン: 朝ごはんのシリアル
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad, woodTable, softShadow } from '../engine/art.js';
import { SPRITES } from '../engine/grainRenderer.js';
import { Pourer, levelProgress } from './common.js';

export default {
  id: 'cereal',
  name: 'あさごはんのシリアル',
  emoji: '🥣',
  desc: 'ザラザラ〜 こぼさず ちょうどよく',
  goal: '🎯 ボウルのラインまで シリアルを入れよう (こぼしすぎ注意!)',
  clearMsg: 'いただきま〜す!',
  maxParticles: 1600,
  rattlePitch: 0.6,

  init(ctx) {
    const d = ctx.data;
    d.pourer = new Pourer(70, 30);
    d.raisins = 0;
    d.stableT = 0;
    d.spillShown = false;
    ctx.sim.defineMaterial(0, { // リングシリアル
      r: 1.65, rJit: 0.18, mu: 0.5, bounce: 0.15, vmax: 110,
      sprite: SPRITES.RING, colors: [[1, 1, 1], [1, 0.92, 0.8], [0.95, 0.82, 0.66]],
    });
    ctx.sim.defineMaterial(1, { // レーズン
      r: 1.1, rJit: 0.12, mu: 0.7, vmax: 110,
      sprite: SPRITES.RAISIN, colors: [[1, 1, 1]],
    });
    ctx.setTools([
      { id: 'cereal', icon: '📦', label: 'シリアル', active: true },
      { id: 'raisin', icon: '🍇', label: 'レーズントッピング' },
    ]);
    d.tool = 'cereal';
    ctx.setHint('はこを タッチのところへ。かたむけて ザラザラ〜');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.cx = W / 2;
    d.bw = Math.min(W * 0.56, 64);
    d.bottom = Math.min(H - 14, H * 0.88);
    d.top = d.bottom - Math.min(H * 0.26, 40);
    d.lineY = d.top + (d.bottom - d.top) * 0.3;
    // ボウル (すり鉢型)
    const s = ctx.sim;
    s.colliders.push(
      { kind: 'capsule', ax: d.cx - d.bw / 2, ay: d.top, bx: d.cx - d.bw / 4, by: d.bottom, r: 1.8, mu: 0.5 },
      { kind: 'capsule', ax: d.cx + d.bw / 2, ay: d.top, bx: d.cx + d.bw / 4, by: d.bottom, r: 1.8, mu: 0.5 },
      { kind: 'capsule', ax: d.cx - d.bw / 4, ay: d.bottom, bx: d.cx + d.bw / 4, by: d.bottom, r: 1.8, mu: 0.5 },
    );
  },

  update(ctx, dt) {
    const d = ctx.data, s = ctx.sim, p = ctx.primary;
    const pouring = !!p && p.y < d.bottom;
    d.pourer.mat = d.tool === 'raisin' ? 1 : 0;
    d.pourer.rate = d.tool === 'raisin' ? 18 : 70;
    const n = d.pourer.update(ctx, dt, pouring, p ? p.x : 0, p ? Math.min(p.y, d.top - 10) : 0, 3);
    if (d.tool === 'raisin' && n > 0) d.raisins += n;
    ctx.sfx.setPour(pouring ? 0.4 : 0, 0.7);

    // こぼれチェック
    let spilled = 0;
    for (let i = 0; i < s.n; i++) {
      if (s.y[i] > d.bottom - 6 && Math.abs(s.x[i] - d.cx) > d.bw / 2 + 8) spilled++;
    }
    if (spilled > 14 && !d.spillShown) {
      d.spillShown = true;
      ctx.toast('💦 こぼれちゃった!テーブルふかなきゃ…');
    }
    d.spilled = spilled;

    // レベル判定 (リングは大粒なので判定ゆるめ)
    const lv = levelProgress(s, d.cx, d.lineY, d.bottom, 4.5);
    if (lv.done && !pouring && s.collisionEnergy < 15) {
      d.stableT += dt;
      if (d.stableT > 0.8 && !ctx._cleared) {
        ctx.progress(1);
      }
    } else {
      d.stableT = 0;
      if (!ctx._cleared) ctx.progress(Math.min(0.95, lv.frac * (spilled > 40 ? 0.85 : 1)));
    }
  },

  onTool(ctx, id) {
    ctx.data.tool = id;
    ctx.setToolActive(id);
    ctx.toast(id === 'raisin' ? '🍇 あまいレーズンを パラリ' : '📦 ザラザラ〜');
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    g.fillStyle = vgrad(g, 0, H, [[0, '#fff6e0'], [1, '#ffe8c4']]);
    g.fillRect(0, 0, W, H);
    // 朝の窓
    g.fillStyle = 'rgba(160,215,250,0.75)';
    rr(g, W * 0.62, 6, W * 0.3, Math.min(30, H * 0.18), 3);
    g.fill();
    g.strokeStyle = '#d8c8a8';
    g.lineWidth = 1;
    rr(g, W * 0.62, 6, W * 0.3, Math.min(30, H * 0.18), 3);
    g.stroke();
    g.fillStyle = 'rgba(255,255,150,0.8)';
    g.beginPath(); g.arc(W * 0.68, 13, 3.5, 0, TAU); g.fill();
    woodTable(g, W, d.bottom + 4, H, 1);
    softShadow(g, d.cx, d.bottom + 4, d.bw * 0.7, 3, 0.15);
    // ボウル
    g.fillStyle = vgrad(g, d.top - 2, d.bottom + 3, [[0, '#6db1e8'], [1, '#3a7cc0']]);
    g.beginPath();
    g.moveTo(d.cx - d.bw / 2 - 3, d.top - 2);
    g.lineTo(d.cx - d.bw / 4 - 2, d.bottom + 3);
    g.lineTo(d.cx + d.bw / 4 + 2, d.bottom + 3);
    g.lineTo(d.cx + d.bw / 2 + 3, d.top - 2);
    g.lineTo(d.cx + d.bw / 2 - 2, d.top - 2);
    g.lineTo(d.cx + d.bw / 4 - 1, d.bottom - 1.5);
    g.lineTo(d.cx - d.bw / 4 + 1, d.bottom - 1.5);
    g.lineTo(d.cx - d.bw / 2 + 2, d.top - 2);
    g.closePath();
    g.fill();
    // 内側
    g.fillStyle = '#f4f8ff';
    g.beginPath();
    g.moveTo(d.cx - d.bw / 2 + 2, d.top - 1);
    g.lineTo(d.cx - d.bw / 4 + 1, d.bottom - 1);
    g.lineTo(d.cx + d.bw / 4 - 1, d.bottom - 1);
    g.lineTo(d.cx + d.bw / 2 - 2, d.top - 1);
    g.closePath();
    g.fill();
    // 目標ライン
    g.strokeStyle = 'rgba(230,90,90,0.85)';
    g.lineWidth = 0.9;
    g.setLineDash([2.5, 1.8]);
    g.beginPath();
    g.moveTo(d.cx - d.bw / 2 - 8, d.lineY);
    g.lineTo(d.cx + d.bw / 2 + 8, d.lineY);
    g.stroke();
    g.setLineDash([]);
    g.fillStyle = '#e85a5a';
    g.font = 'bold 3.4px sans-serif';
    g.fillText('ここまで▶', d.cx - d.bw / 2 - 22, d.lineY + 1.2);
    // スプーン
    g.save();
    g.translate(d.cx + d.bw / 2 + 16, d.bottom - 2);
    g.rotate(-0.9);
    g.fillStyle = '#c8ccd8';
    rr(g, -1, -14, 2, 13, 1);
    g.fill();
    g.beginPath(); g.ellipse(0, 2, 3, 4, 0, 0, TAU); g.fill();
    g.restore();
  },

  drawFront(ctx, g) {
    const d = ctx.data, p = ctx.primary;
    if (p && p.y < d.bottom) {
      // シリアルの箱 / レーズンのふくろ
      g.save();
      g.translate(p.x, Math.min(p.y, d.top - 10) - 8);
      g.rotate(0.6 + Math.sin(ctx.t * 5) * 0.04);
      if (d.tool === 'cereal') {
        g.fillStyle = '#e8a03a';
        rr(g, -8, -14, 16, 24, 1.5);
        g.fill();
        g.fillStyle = '#fff';
        rr(g, -6, -10, 12, 10, 1.5);
        g.fill();
        g.fillStyle = '#c05a1a';
        g.font = 'bold 3.4px sans-serif';
        g.textAlign = 'center';
        g.fillText('コーン', 0, -6);
        g.fillText('リング', 0, -2.4);
        g.fillStyle = '#e8b04a';
        g.beginPath(); g.arc(0, 3.5, 2.6, 0, TAU); g.fill();
        g.fillStyle = '#fff';
        g.beginPath(); g.arc(0, 3.5, 1.1, 0, TAU); g.fill();
      } else {
        g.fillStyle = '#8a4a8c';
        rr(g, -6, -10, 12, 17, 2);
        g.fill();
        g.fillStyle = '#e8d0f0';
        rr(g, -4.5, -6, 9, 7, 1.5);
        g.fill();
        g.fillStyle = '#5a2a5c';
        g.font = 'bold 3px sans-serif';
        g.textAlign = 'center';
        g.fillText('レーズン', 0, -1.8);
      }
      g.restore();
    }
  },
};
