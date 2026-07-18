// シーン: プリズムで分光 (白い光は 7色のたばだった!)
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad, woodTable, softShadow } from '../engine/art.js';
import { DragMgr, drawFlashlight, drawAngleArc } from './common.js';

export default {
  id: 'prism',
  name: 'プリズムで分光',
  emoji: '🔦',
  desc: '白い光を 虹にわける実験',
  goal: '🎯 プリズムを回して スクリーンに 大きな虹をうつそう!',
  clearMsg: '白い光は 7色のまざりものだった!',
  spectrumN: 14,

  init(ctx) {
    const d = ctx.data;
    d.mgr = new DragMgr();
    d.okT = 0;
    ctx.setHint('プリズムをドラッグ&↻ノブで回転。光の角度がカギ!');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    const cy = H * 0.42;
    d.srcX = W * 0.08; d.srcY = cy;
    d.mgr.items.length = 0;
    d.prism = d.mgr.add({
      x: d.prism?.x ?? W * 0.56, y: d.prism?.y ?? cy,
      r: 13, angle: d.prism?.angle ?? -0.15,
      rot: { len: 16, r: 4 },
      boundsX: [W * 0.25, W * 0.78], boundsY: [H * 0.2, H * 0.7],
    });
    d.floorY = Math.min(H - 14, H * 0.92);
    // スクリーン (右の壁、下方向に長め — フリントの偏差 ~50° を受ける)
    const m = Math.min(H, W);
    d.screen = {
      kind: 'screen', ax: W * 0.9, ay: cy - m * 0.2,
      bx: W * 0.9, by: Math.min(d.floorY - 3, cy + m * 0.68),
    };
  },

  _buildTracer(ctx) {
    const d = ctx.data, tr = ctx.tracer;
    tr.clear();
    const p = d.prism, s = 12;
    const pts = [];
    for (const [px, py] of [[0, -s * 0.62], [s * 0.577, s * 0.42], [-s * 0.577, s * 0.42]]) {
      pts.push([
        p.x + px * Math.cos(p.angle) - py * Math.sin(p.angle),
        p.y + px * Math.sin(p.angle) + py * Math.cos(p.angle),
      ]);
    }
    d.pts = pts;
    tr.add({ kind: 'glass', pts, mat: 'flint' }); // 高分散ガラス (虹が広がる)
    d.screen.hits = [];
    tr.add(d.screen);
  },

  update(ctx, dt) {
    const d = ctx.data;
    this._buildTracer(ctx);
    d.segs = [];
    // 白色の平行ビーム (3本)
    for (let k = -1; k <= 1; k++) {
      ctx.tracer.traceWhite(d.srcX + 2, d.srcY + k * 1.1, 1, 0, 1.6, ctx.spectrum, d.segs);
    }
    // スクリーンの評価: 当たった波長の種類と広がり
    const hits = d.screen.hits;
    const lset = new Set();
    let uMin = 1, uMax = 0, totI = 0;
    for (const h of hits) {
      lset.add(Math.round(h.l / 25));
      uMin = Math.min(uMin, h.u); uMax = Math.max(uMax, h.u);
      totI += h.I;
    }
    d.nColors = lset.size;
    d.spread = hits.length ? uMax - uMin : 0;
    // 実物の分散でのスクリーン上の虹幅は数% (60°フリントで ~4°)
    const good = d.nColors >= 11 && d.spread > 0.02 && totI > 0.5;
    if (good) {
      d.okT += dt;
      ctx.progress(Math.min(1, d.okT / 1.2));
    } else {
      d.okT = 0;
      if (!ctx._cleared) ctx.progress(clamp(d.nColors / 11 * 0.6 + Math.min(1, d.spread / 0.02) * 0.3, 0, 0.95));
    }
    ctx.sfx.setPour(0);
  },

  onDown(ctx, p) { ctx.data.mgr.down(p); },
  onMove(ctx, p) { ctx.data.mgr.move(p, ctx); },
  onUp(ctx) { ctx.data.mgr.up(); },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    g.fillStyle = vgrad(g, 0, H, [[0, '#1a2036'], [1, '#232a44']]);
    g.fillRect(0, 0, W, H);
    // 理科室の机
    woodTable(g, W, d.floorY, H, 1);
    // スクリーンの板
    g.fillStyle = '#f2efe6';
    rr(g, d.screen.ax - 1.2, d.screen.ay - 3, 3.6, d.screen.by - d.screen.ay + 6, 1.2);
    g.fill();
    softShadow(g, d.screen.ax + 1, d.floorY, 6, 2, 0.3);
    // 実験メモ
    g.fillStyle = 'rgba(255,255,255,0.92)';
    rr(g, 4, 16, Math.min(46, W * 0.42), 22, 3);
    g.fill();
    g.fillStyle = '#4a3a7a';
    g.font = 'bold 3.2px sans-serif';
    g.fillText('ぶんこう実験', 7, 22);
    g.fillStyle = '#667';
    g.font = '2.6px sans-serif';
    g.fillText('ガラスは 色 (波長) ごとに', 7, 27);
    g.fillText('曲がり方がちがう=分散', 7, 31);
  },

  drawFront(ctx, g) {
    const d = ctx.data;
    // 光
    ctx.drawRays(g, d.segs, { gain: 1.2 });
    ctx.drawScreenGlow(g, d.screen, { width: 2, gain: 1.4 });
    // プリズム (ガラス)
    g.save();
    g.globalAlpha = 0.9;
    g.fillStyle = 'rgba(180,215,245,0.22)';
    g.strokeStyle = 'rgba(200,230,255,0.85)';
    g.lineWidth = 0.7;
    g.beginPath();
    g.moveTo(d.pts[0][0], d.pts[0][1]);
    g.lineTo(d.pts[1][0], d.pts[1][1]);
    g.lineTo(d.pts[2][0], d.pts[2][1]);
    g.closePath();
    g.fill();
    g.stroke();
    g.restore();
    // 光源
    drawFlashlight(g, d.srcX, d.srcY, 0, 1.1);
    d.mgr.draw(g);
    // カラーメーター
    g.fillStyle = 'rgba(255,255,255,0.92)';
    rr(g, ctx.W - 40, 16, 38, 12, 3);
    g.fill();
    g.fillStyle = '#556';
    g.font = 'bold 2.8px sans-serif';
    g.fillText(`にじ色: ${d.nColors ?? 0}/11`, ctx.W - 37, 21);
    g.fillStyle = '#889';
    g.font = '2.4px sans-serif';
    g.fillText(`ひろがり ${((d.spread ?? 0) * 100) | 0}%`, ctx.W - 37, 25.5);
  },
};
