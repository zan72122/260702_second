// シーン: 虫めがねで集光 (焦点に光があつまると あつい!)
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad, sun, cloud, softShadow } from '../engine/art.js';
import { DragMgr } from './common.js';

export default {
  id: 'magnifier',
  name: '虫めがねで集光',
  emoji: '🔍',
  desc: 'ピントが合うと ジュッ!',
  goal: '🎯 レンズの高さを合わせて 黒い紙を 3か所 こがそう!',
  clearMsg: '焦点=光のあつまる点、マスター!',
  spectrumN: 8,

  init(ctx) {
    const d = ctx.data;
    d.mgr = new DragMgr();
    d.burns = []; // {x, done}
    d.heat = 0;
    ctx.setHint('レンズを上下にドラッグ。光が1点にあつまる高さ=焦点きょり!');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.paperY = Math.min(H - 20, H * 0.86);
    const prev = d.lens;
    d.mgr.items.length = 0;
    d.lens = d.mgr.add({
      x: prev?.x ?? W * 0.5, y: prev?.y ?? d.paperY - 40,
      r: 10,
      boundsX: [W * 0.18, W * 0.82],
      boundsY: [H * 0.2, d.paperY - 10],
    });
    d.lensR = 7.2; // ガラス球レンズ半径 (焦点 ≈ n·R/(2(n-1)) ≈ 10.6)
    if (!d.spots) {
      d.spots = [W * 0.32, W * 0.52, W * 0.72].map((x) => ({ x, done: false }));
    }
    d.paper = { kind: 'screen', ax: W * 0.16, ay: d.paperY, bx: W * 0.84, by: d.paperY };
  },

  _buildTracer(ctx) {
    const d = ctx.data, tr = ctx.tracer;
    tr.clear();
    tr.add({ kind: 'circle', x: d.lens.x, y: d.lens.y, r: d.lensR, mat: 'glass' });
    d.paper.hits = [];
    tr.add(d.paper);
  },

  update(ctx, dt) {
    const d = ctx.data;
    this._buildTracer(ctx);
    d.segs = [];
    // 太陽光 (上からの平行光、レンズ幅ぶん)
    for (let k = -4; k <= 4; k++) {
      ctx.tracer.traceWhite(d.lens.x + k * 1.35, 8, 0, 1, 0.9, ctx.spectrum, d.segs);
    }
    // 紙の上の光の集中度: ヒットの重心と幅
    const hits = d.paper.hits;
    let totI = 0, mu = 0;
    for (const h of hits) { totI += h.I; mu += h.u * h.I; }
    if (totI > 0.01) mu /= totI;
    let spread = 0;
    for (const h of hits) spread += Math.abs(h.u - mu) * h.I;
    spread = totI > 0.01 ? (spread / totI) * (d.paper.bx - d.paper.ax) : 99;
    d.spotX = d.paper.ax + mu * (d.paper.bx - d.paper.ax);
    d.spotW = spread;
    // 集中してるほど加熱 (物理: 光束密度)
    const density = totI / Math.max(0.35, spread);
    d.density = density;
    if (density > 1.1 && totI > 0.35) {
      d.heat = Math.min(1, d.heat + dt * density * 0.16);
      if (Math.random() < dt * 12 * d.heat) {
        ctx.fx.addSteam(d.spotX, d.paperY - 1.5, 2);
        ctx.fx.addSpray(d.spotX + rand(-0.5, 0.5), d.paperY - 1, rand(-2, 2), rand(-8, -3), 'rgba(120,110,100,0.5)', 0.8, 1);
      }
    } else {
      d.heat = Math.max(0, d.heat - dt * 0.5);
    }
    // こげ達成: 焦げスポットの近くで加熱しきる
    if (d.heat >= 1) {
      const sp = d.spots.find((s2) => !s2.done && Math.abs(s2.x - d.spotX) < 5);
      if (sp) {
        sp.done = true;
        d.heat = 0.2;
        ctx.sfx.chime();
        ctx.toast('🔥 ジュッ!こげた! (' + d.spots.filter((s2) => s2.done).length + '/3)');
        ctx.vibrate(30);
        ctx.backDirty();
      } else {
        d.heat = 0.85; // 的の外: こげ目はつかない
      }
    }
    const done = d.spots.filter((s2) => s2.done).length;
    ctx.progress(done >= 3 ? 1 : Math.min(0.97, done / 3 + d.heat * 0.2));
  },

  onDown(ctx, p) { ctx.data.mgr.down(p); },
  onMove(ctx, p) { ctx.data.mgr.move(p, ctx); },
  onUp(ctx) { ctx.data.mgr.up(); },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    g.fillStyle = vgrad(g, 0, H, [[0, '#8ecdf0'], [0.75, '#c8e8f8'], [1, '#dff2fc']]);
    g.fillRect(0, 0, W, H);
    sun(g, W * 0.5, 8, 5.5);
    cloud(g, W * 0.15, 22, 0.8, 0.85);
    // 地面と黒い紙
    g.fillStyle = '#9ac96a';
    g.fillRect(0, d.paperY + 3, W, H - d.paperY);
    softShadow(g, W * 0.5, d.paperY + 3, W * 0.36, 2.5, 0.15);
    g.fillStyle = '#2c2c34';
    rr(g, W * 0.14, d.paperY - 1.6, W * 0.72, 5, 1);
    g.fill();
    // 的 (まる) とこげ跡
    for (const sp of d.spots) {
      g.strokeStyle = 'rgba(255,255,255,0.6)';
      g.lineWidth = 0.5;
      g.setLineDash([1, 1]);
      g.beginPath();
      g.arc(sp.x, d.paperY, 3.2, 0, TAU);
      g.stroke();
      g.setLineDash([]);
      if (sp.done) {
        g.fillStyle = '#c86a28';
        g.beginPath();
        g.ellipse(sp.x, d.paperY, 2.8, 1.4, 0, 0, TAU);
        g.fill();
        g.fillStyle = '#1a1210';
        g.beginPath();
        g.ellipse(sp.x, d.paperY, 1.8, 0.9, 0, 0, TAU);
        g.fill();
      }
    }
  },

  drawFront(ctx, g) {
    const d = ctx.data;
    ctx.drawRays(g, d.segs, { gain: 0.9, glowWidth: 2 });
    // 焦点の輝き
    if ((d.density ?? 0) > 1.1) {
      const a = Math.min(1, d.density * 0.28);
      g.save();
      g.globalCompositeOperation = 'lighter';
      const grad = g.createRadialGradient(d.spotX, ctx.data.paperY, 0, d.spotX, ctx.data.paperY, 4);
      grad.addColorStop(0, `rgba(255,250,220,${a})`);
      grad.addColorStop(1, 'rgba(255,200,100,0)');
      g.fillStyle = grad;
      g.beginPath();
      g.arc(d.spotX, ctx.data.paperY, 4, 0, TAU);
      g.fill();
      g.restore();
    }
    // 虫めがね
    const l = d.lens;
    g.save();
    g.translate(l.x, l.y);
    g.strokeStyle = '#8a5a2a';
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(d.lensR * 0.75, d.lensR * 0.75);
    g.lineTo(d.lensR * 2, d.lensR * 2);
    g.stroke();
    g.fillStyle = 'rgba(200,230,250,0.28)';
    g.strokeStyle = '#c8a86a';
    g.lineWidth = 1.1;
    g.beginPath();
    g.arc(0, 0, d.lensR, 0, TAU);
    g.fill();
    g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.beginPath();
    g.ellipse(-d.lensR * 0.35, -d.lensR * 0.35, d.lensR * 0.25, d.lensR * 0.45, -0.7, 0, TAU);
    g.fill();
    g.restore();
    d.mgr.draw(g);
    // 熱メーター
    g.fillStyle = 'rgba(255,255,255,0.92)';
    rr(g, ctx.W - 34, 16, 32, 11, 3);
    g.fill();
    g.fillStyle = '#556';
    g.font = 'bold 2.6px sans-serif';
    g.fillText('あつさ', ctx.W - 31, 20.5);
    g.fillStyle = '#ddd';
    rr(g, ctx.W - 31, 22, 26, 2.6, 1.3);
    g.fill();
    g.fillStyle = d.heat > 0.7 ? '#e85a3a' : '#f0a83a';
    rr(g, ctx.W - 31, 22, Math.max(0.01, 26 * (d.heat ?? 0)), 2.6, 1.3);
    g.fill();
  },
};
