// シーン: コーヒーにミルクを注ぐ
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, softShadow, vgrad, woodTable } from '../engine/art.js';
import { Pourer, colorUniformity, drawPitcher } from './common.js';

const TARGET = [0.72, 0.53, 0.38]; // カフェオレ色

export default {
  id: 'coffee',
  name: 'コーヒーにミルク',
  emoji: '☕',
  desc: 'マーブルもようから カフェオレへ',
  goal: '🎯 ぜんぶ混ぜて「カフェオレ色」にしよう!',
  clearMsg: 'かんぺきなカフェオレ!',
  maxParticles: 2600,
  view: { shine: 1.1, refract: 0.6 },

  init(ctx) {
    const d = ctx.data;
    d.tool = 'milk';
    d.pourer = new Pourer(100, 45);
    d.marbleShown = false;
    ctx.sim.definePhase(0, { // コーヒー
      sigma: 4, beta: 1.6, grav: 1, mix: 3.6, group: 1,
      color: [0.18, 0.10, 0.06], alpha: 0.95,
    });
    ctx.sim.definePhase(1, { // ミルク
      sigma: 5, beta: 1.6, grav: 0.98, mix: 3.6, group: 1,
      color: [0.99, 0.97, 0.92], alpha: 0.93,
    });
    ctx.setTools([
      { id: 'milk', icon: '🥛', label: 'ミルクを注ぐ', active: true },
      { id: 'spoon', icon: '🥄', label: 'スプーンでまぜる' },
    ]);
    ctx.setHint('ミルクを注いだら スプーンでくるくる まぜよう');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.cx = W / 2;
    d.cw = Math.min(W * 0.56, 62);
    d.cupTop = Math.max(H * 0.34, H - 110);
    d.cupBottom = Math.min(H - 24, d.cupTop + 72);
    ctx.addCup(d.cx, d.cupTop, d.cupBottom, d.cw, 2.2);
    // スプーン (可動コライダー)
    d.spoonCol = { kind: 'capsule', ax: -100, ay: -100, bx: -100, by: -90, r: 2.4, vx: 0, vy: 0, off: true, noSolid: true };
    ctx.sim.colliders.push(d.spoonCol);
    // 初回のみコーヒーを注いでおく
    if (!d.filled) {
      d.filled = true;
      ctx.fill(d.cx - d.cw / 2 + 2, d.cupTop + 22, d.cx + d.cw / 2 - 2, d.cupBottom - 2, 0);
    }
  },

  update(ctx, dt) {
    const d = ctx.data, s = ctx.sim, p = ctx.primary;
    const inPour = d.tool === 'milk' && !!p;
    d.pourer.phase = 1;
    d.pourer.update(ctx, dt, inPour && p.y < d.cupBottom, p ? p.x : 0, p ? p.y - 3 : 0, 0, 1, 2);

    // スプーン追従
    if (d.tool === 'spoon' && p) {
      const c = d.spoonCol;
      c.off = false;
      c.vx = (p.x - c.ax) / Math.max(dt, 1e-3);
      c.vy = (p.y - c.ay) / Math.max(dt, 1e-3);
      c.ax = p.x; c.ay = p.y;
      c.bx = p.x + 1.2; c.by = p.y - 26;
      const sp = Math.hypot(p.vx, p.vy);
      if (sp > 90 && Math.random() < dt * 6) ctx.sfx.splash(Math.min(0.5, sp / 400));
    } else {
      d.spoonCol.off = true;
      d.spoonCol.ax = d.spoonCol.bx = -100;
    }

    // まぜまぜ度: ミルク量 + 混ざり具合 + 目標色への近さ
    const milk = ctx.countPhase(1);
    const res = colorUniformity(s);
    if (res && milk > 60) {
      const { uni, avg } = res;
      d.avg = avg;
      const frac = milk / Math.max(1, s.n);
      const fracTerm = clamp(1 - Math.abs(frac - 0.4) / 0.4, 0, 1);
      const closeness = 1 - Math.min(1, (Math.abs(avg[0] - TARGET[0]) + Math.abs(avg[1] - TARGET[1]) + Math.abs(avg[2] - TARGET[2])) * 1.6);
      const done = uni > 0.9 && closeness > 0.45 && fracTerm > 0.5;
      ctx.progress(done ? 1 : Math.min(0.97, fracTerm * 0.35 + uni * 0.4 + closeness * 0.3));
      if (!d.marbleShown && uni < 0.6 && milk > 350) {
        d.marbleShown = true;
        ctx.toast('🎨 きれいなマーブルもよう!');
      }
    } else ctx.progress(0);
  },

  onTool(ctx, id) {
    ctx.data.tool = id;
    ctx.setToolActive(id);
    ctx.toast(id === 'milk' ? '🥛 タッチでミルクを注ごう' : '🥄 ドラッグでまぜまぜ!');
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    g.fillStyle = vgrad(g, 0, H, [[0, '#6d5344'], [1, '#4e3a2f']]);
    g.fillRect(0, 0, W, H);
    // カフェの窓明かり
    g.fillStyle = 'rgba(255,220,160,0.12)';
    for (let i = 0; i < 3; i++) {
      rr(g, W * (0.12 + i * 0.3), 8, W * 0.18, 26, 3);
      g.fill();
    }
    woodTable(g, W, d.cupBottom + 6, H, 0);
    // ソーサー
    softShadow(g, d.cx, d.cupBottom + 8, d.cw * 0.95, 3, 0.2);
    g.fillStyle = '#f4ede2';
    g.beginPath();
    g.ellipse(d.cx, d.cupBottom + 6, d.cw * 0.9, 4.5, 0, 0, TAU);
    g.fill();
    // マグカップ本体 (背面)
    const x0 = d.cx - d.cw / 2 - 3.4, x1 = d.cx + d.cw / 2 + 3.4;
    g.fillStyle = '#e8564a';
    rr(g, x0, d.cupTop, x1 - x0, d.cupBottom - d.cupTop + 4, 4);
    g.fill();
    // 取っ手
    g.strokeStyle = '#e8564a';
    g.lineWidth = 5;
    g.beginPath();
    g.arc(x1 + 2, (d.cupTop + d.cupBottom) / 2, 11, -Math.PI * 0.42, Math.PI * 0.42);
    g.stroke();
    // カップ内側 (見えている面)
    g.fillStyle = '#fff8ef';
    rr(g, d.cx - d.cw / 2, d.cupTop - 1, d.cw, d.cupBottom - d.cupTop, 3);
    g.fill();
    g.fillStyle = 'rgba(60,40,30,0.15)';
    rr(g, d.cx - d.cw / 2, d.cupTop - 1, d.cw, 6, 3);
    g.fill();
  },

  drawFront(ctx, g) {
    const d = ctx.data, p = ctx.primary;
    // カップのふち (手前)
    g.fillStyle = '#d84a3e';
    rr(g, d.cx - d.cw / 2 - 3.4, d.cupTop - 2.4, d.cw + 6.8, 3.4, 1.6);
    g.fill();
    // 目標カラーチップ
    g.fillStyle = '#fff';
    rr(g, 2, ctx.H - 15, 30, 12, 2);
    g.fill();
    g.fillStyle = `rgb(${TARGET[0] * 255},${TARGET[1] * 255},${TARGET[2] * 255})`;
    rr(g, 4, ctx.H - 13, 8, 8, 1.5);
    g.fill();
    if (d.avg) {
      g.fillStyle = `rgb(${d.avg[0] * 255},${d.avg[1] * 255},${d.avg[2] * 255})`;
      rr(g, 14, ctx.H - 13, 8, 8, 1.5);
      g.fill();
    }
    g.fillStyle = '#333';
    g.font = '2.6px sans-serif';
    g.fillText('目標', 4.6, ctx.H - 3.8);
    g.fillText('いま', 14.6, ctx.H - 3.8);
    // 道具
    if (d.tool === 'milk' && p) {
      drawPitcher(g, p.x + 7, p.y - 8, -0.5, '#fdfdfd');
    } else if (d.tool === 'spoon' && p) {
      g.save();
      g.translate(p.x, p.y);
      g.strokeStyle = '#c8ccd8';
      g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(1.2, -26); g.lineTo(0, -2); g.stroke();
      g.fillStyle = '#dfe3ee';
      g.beginPath(); g.ellipse(0, 0, 2.4, 3.4, 0, 0, TAU); g.fill();
      g.restore();
    }
  },
};
