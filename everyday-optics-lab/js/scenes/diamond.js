// シーン: ダイヤのきらめき (臨界角24.4°の全反射 + 大分散のファイア)
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad, softShadow } from '../engine/art.js';
import { refIndex, criticalAngle } from '../engine/spectrum.js';
import { DragMgr } from './common.js';

export default {
  id: 'diamond',
  name: 'ダイヤのきらめき',
  emoji: '💎',
  desc: 'キラッの正体は 全反射',
  goal: '🎯 ダイヤを回して 七色のファイアを最大に!ガラスとのちがいも見よう',
  clearMsg: '臨界角24°の全反射が 光をとじこめて上に返す!',
  spectrumN: 14,

  init(ctx) {
    const d = ctx.data;
    d.mgr = new DragMgr();
    d.mat = 'diamond';
    d.sawGlass = false;
    d.okT = 0;
    d.critDeg = criticalAngle(refIndex('diamond', 589)) * 180 / Math.PI;
    ctx.setTools([{ id: 'swap', icon: '🔁', label: 'ガラスとくらべる' }]);
    ctx.setHint(`ダイヤの臨界角は ${d.critDeg.toFixed(0)}° (ガラスは41°)。だから光がもれにくい!`);
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    const prev = d.gem;
    d.mgr.items.length = 0;
    d.gem = d.mgr.add({
      x: W / 2, y: Math.min(H * 0.52, H - 96),
      r: 15, angle: prev?.angle ?? 0.06,
      rot: { len: 18, r: 4 },
      fixed: true,
      minA: -0.5, maxA: 0.5,
    });
    d.s = Math.min(W * 0.13, 13);
  },

  _buildTracer(ctx) {
    const d = ctx.data, tr = ctx.tracer;
    tr.clear();
    // 高屈折率の宝石は内部分岐が爆発しやすい → 追跡量を制限 (60fps維持)
    tr.maxBounce = 9;
    tr.minI = 0.05;
    tr.maxSegs = 900;
    const gm = d.gem, s = d.s, a = gm.angle;
    // ブリリアントカット断面 (テーブル/ガードル/パビリオン41°)
    const raw = [
      [-s * 0.5, -s * 0.5], [s * 0.5, -s * 0.5],
      [s * 0.95, -s * 0.15], [0, -s * 0.15 + s * 0.95 * Math.tan(41 * Math.PI / 180)],
      [-s * 0.95, -s * 0.15],
    ];
    d.pts = raw.map(([px, py]) => [
      gm.x + px * Math.cos(a) - py * Math.sin(a),
      gm.y + px * Math.sin(a) + py * Math.cos(a),
    ]);
    tr.add({ kind: 'glass', pts: d.pts, mat: d.mat });
  },

  update(ctx, dt) {
    const d = ctx.data;
    this._buildTracer(ctx);
    d.segs = [];
    // 上からの白色光 (ガラス比較モードは分岐爆発するので光線数をしぼる)
    const isGlass = d.mat === 'glass';
    const step = isGlass ? 2 : 1;
    const spec = isGlass ? ctx.spectrum.filter((_, i) => i % 2 === 0) : ctx.spectrum;
    for (let k = -3; k <= 3; k += step) {
      ctx.tracer.traceWhite(d.gem.x + k * d.s * 0.13 + Math.sin(ctx.t * 0.7) * 0.5, d.gem.y - 30, 0.06, 1, 1.1, spec, d.segs);
    }
    // ファイア測定: 上向きに出た光の 波長の種類 × 強度 / 下へのもれ
    let upI = 0, dnI = 0;
    const lset = new Set();
    for (const sg of d.segs) {
      const outside = Math.hypot(sg.x0 - d.gem.x, sg.y0 - d.gem.y) < d.s * 1.6;
      const far = Math.hypot(sg.x1 - d.gem.x, sg.y1 - d.gem.y) > d.s * 3;
      if (!outside || !far) continue;
      if (sg.y1 < sg.y0) { upI += sg.I; lset.add(Math.round(sg.l / 30)); }
      else if (sg.y1 > d.gem.y + d.s) dnI += sg.I;
    }
    d.upI = upI; d.dnI = dnI;
    d.fire = clamp(lset.size / 9, 0, 1) * clamp(upI / 2.2, 0, 1);
    const good = d.mat === 'diamond' && d.fire > 0.55 && d.sawGlass;
    if (good) {
      d.okT += dt;
      ctx.progress(Math.min(1, d.okT / 1.5));
    } else {
      d.okT = Math.max(0, d.okT - dt * 0.5);
      if (!ctx._cleared) {
        ctx.progress(clamp(d.fire * 0.6 + (d.sawGlass ? 0.3 : 0), 0, 0.95));
      }
    }
    if (d.mat === 'glass') {
      d.glassT = (d.glassT ?? 0) + dt;
      if (d.glassT > 1.2 && !d.sawGlass) {
        d.sawGlass = true;
        ctx.toast('🔍 ガラスは底から光がダダもれ→くらい。ダイヤにもどそう');
      }
    }
  },

  onDown(ctx, p) { ctx.data.mgr.down(p); },
  onMove(ctx, p) { ctx.data.mgr.move(p, ctx); },
  onUp(ctx) { ctx.data.mgr.up(); },

  onTool(ctx, id) {
    if (id !== 'swap') return;
    const d = ctx.data;
    d.mat = d.mat === 'diamond' ? 'glass' : 'diamond';
    d.glassT = 0;
    ctx.sfx.pop(1.1);
    ctx.toast(d.mat === 'glass' ? '🥃 ガラス (n=1.5, 臨界角41°) に交換…' : `💎 ダイヤ (n=2.4, 臨界角${d.critDeg.toFixed(0)}°) にもどした!`);
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    g.fillStyle = vgrad(g, 0, H, [[0, '#181226'], [1, '#241a34']]);
    g.fillRect(0, 0, W, H);
    // ジュエリーの台座 (リング)
    const gy = d.gem.y;
    softShadow(g, d.gem.x, gy + d.s + 16, d.s * 1.4, 3, 0.4);
    g.strokeStyle = '#d8b048';
    g.lineWidth = 2.4;
    g.beginPath();
    g.arc(d.gem.x, gy + d.s + 26, 16, Math.PI * 1.15, Math.PI * 1.85);
    g.stroke();
    g.strokeStyle = 'rgba(255,240,190,0.5)';
    g.lineWidth = 0.8;
    g.beginPath();
    g.arc(d.gem.x, gy + d.s + 26, 17.2, Math.PI * 1.2, Math.PI * 1.5);
    g.stroke();
  },

  drawFront(ctx, g) {
    const { W } = ctx, d = ctx.data;
    ctx.drawRays(g, d.segs, { gain: 1.35, glowWidth: 2.4 });
    // 宝石の輪郭
    g.save();
    g.fillStyle = d.mat === 'diamond' ? 'rgba(210,230,255,0.14)' : 'rgba(200,220,210,0.12)';
    g.strokeStyle = d.mat === 'diamond' ? 'rgba(220,240,255,0.9)' : 'rgba(190,210,200,0.8)';
    g.lineWidth = 0.8;
    g.beginPath();
    d.pts.forEach(([x, y], i) => (i === 0 ? g.moveTo(x, y) : g.lineTo(x, y)));
    g.closePath();
    g.fill();
    g.stroke();
    // ファセットライン
    g.strokeStyle = 'rgba(255,255,255,0.3)';
    g.lineWidth = 0.4;
    g.beginPath();
    g.moveTo(d.pts[0][0], d.pts[0][1]);
    g.lineTo(d.pts[3][0], d.pts[3][1]);
    g.moveTo(d.pts[1][0], d.pts[1][1]);
    g.lineTo(d.pts[3][0], d.pts[3][1]);
    g.stroke();
    g.restore();
    // もれ警告 (ガラス)
    if (d.mat === 'glass' && (d.dnI ?? 0) > 0.3) {
      g.fillStyle = 'rgba(255,200,120,0.8)';
      g.font = '2.6px sans-serif';
      g.textAlign = 'center';
      g.fillText('⚠️ 底から光がもれてる…', d.gem.x, d.gem.y + d.s + 8);
      g.textAlign = 'left';
    }
    d.mgr.draw(g);
    // ファイアメーター
    g.fillStyle = 'rgba(255,255,255,0.92)';
    rr(g, 4, 16, 42, 15, 3);
    g.fill();
    g.fillStyle = '#556';
    g.font = 'bold 2.6px sans-serif';
    g.fillText(`いま: ${d.mat === 'diamond' ? '💎ダイヤ' : '🥃ガラス'}`, 7, 20.5);
    g.fillText('ファイア', 7, 25);
    g.fillStyle = '#ddd';
    rr(g, 20, 22.8, 23, 2.6, 1.3);
    g.fill();
    g.fillStyle = (d.fire ?? 0) > 0.55 ? '#5ad06a' : '#f0b840';
    rr(g, 20, 22.8, Math.max(0.01, 23 * (d.fire ?? 0)), 2.6, 1.3);
    g.fill();
    g.fillStyle = d.sawGlass ? '#2a9a4a' : '#889';
    g.font = '2.3px sans-serif';
    g.fillText(d.sawGlass ? '🔁くらべ済み' : '🔁でガラスとくらべよう', 7, 29);
  },
};
