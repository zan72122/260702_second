// シーン: CDの虹色 (みぞが回折格子になっている!)
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad, woodTable, softShadow } from '../engine/art.js';
import { DragMgr, drawFlashlight } from './common.js';
import { waveCss } from '../engine/render2d.js';

const BINS = 12; // あつめる色の数 (波長ビン)

export default {
  id: 'cd',
  name: 'CDの虹色',
  emoji: '💿',
  desc: 'ぎらぎらの正体は 回折格子',
  goal: '🎯 CDをかたむけて 天井に12色ぜんぶ うつそう!',
  clearMsg: 'ミクロのみぞが 光を虹に分けていた!',
  spectrumN: 16,

  init(ctx) {
    const d = ctx.data;
    d.mgr = new DragMgr();
    d.caught = new Array(BINS).fill(0);
    ctx.setHint('CDの↻ノブで かたむきを変えると 色が動く (みぞ間かく1.6µmの回折)');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.floorY = Math.min(H - 12, H * 0.92);
    d.srcX = W * 0.16; d.srcY = H * 0.3;
    const prev = d.cd;
    d.mgr.items.length = 0;
    d.cd = d.mgr.add({
      x: W * 0.5, y: H * 0.62,
      r: 11, angle: prev?.angle ?? -0.5,
      rot: { len: 14, r: 4 },
      fixed: true,
      minA: -1.35, maxA: -0.1,
    });
    // 天井スクリーン
    d.screen = { kind: 'screen', ax: 6, ay: 16, bx: W - 6, by: 16 };
  },

  _buildTracer(ctx) {
    const d = ctx.data, tr = ctx.tracer;
    tr.clear();
    const c = d.cd, L = 9;
    tr.add({
      kind: 'grating',
      ax: c.x - Math.cos(c.angle) * L, ay: c.y - Math.sin(c.angle) * L,
      bx: c.x + Math.cos(c.angle) * L, by: c.y + Math.sin(c.angle) * L,
      d: 1600, orders: 2, reflective: true, gain: 1.3,
    });
    d.screen.hits = [];
    ctx.tracer.add(d.screen);
  },

  update(ctx, dt) {
    const d = ctx.data;
    this._buildTracer(ctx);
    d.segs = [];
    // ライトから CD へ白色ビーム
    const a = Math.atan2(d.cd.y - d.srcY, d.cd.x - d.srcX);
    d.beamA = a;
    ctx.tracer.traceWhite(d.srcX, d.srcY, Math.cos(a), Math.sin(a), 2.2, ctx.spectrum, d.segs);
    // 天井に当たった色を記録
    let newC = false;
    for (const h of d.screen.hits) {
      const bi = clamp(Math.floor(((h.l - 390) / (700 - 390)) * BINS), 0, BINS - 1);
      if (d.caught[bi] < 1 && h.I > 0.05) {
        d.caught[bi] = Math.min(1, d.caught[bi] + h.I * 0.10);
        if (d.caught[bi] >= 1) newC = true;
      }
    }
    if (newC) { ctx.sfx.chime(); ctx.vibrate(12); }
    const got = d.caught.filter((v) => v >= 1).length;
    d.got = got;
    ctx.progress(got >= BINS ? 1 : Math.min(0.97, got / BINS + 0.03));
  },

  onDown(ctx, p) { ctx.data.mgr.down(p); },
  onMove(ctx, p) { ctx.data.mgr.move(p, ctx); },
  onUp(ctx) { ctx.data.mgr.up(); },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    g.fillStyle = vgrad(g, 0, H, [[0, '#141828'], [1, '#20263c']]);
    g.fillRect(0, 0, W, H);
    // 天井 (スクリーン)
    g.fillStyle = '#e8e4da';
    rr(g, 4, 13.5, W - 8, 4, 1.5);
    g.fill();
    woodTable(g, W, d.floorY, H, 0);
    // メモ
    g.fillStyle = 'rgba(255,255,255,0.9)';
    rr(g, 4, 22, Math.min(44, W * 0.4), 18, 3);
    g.fill();
    g.fillStyle = '#3a5a8a';
    g.font = 'bold 3px sans-serif';
    g.fillText('かいせつ実験', 7, 27);
    g.fillStyle = '#667';
    g.font = '2.5px sans-serif';
    g.fillText('mλ = d·sinθ', 7, 31.5);
    g.fillText('みぞ間かく d=1.6µm', 7, 35.5);
  },

  drawFront(ctx, g) {
    const { W } = ctx, d = ctx.data;
    ctx.drawRays(g, d.segs, { gain: 1.15 });
    ctx.drawScreenGlow(g, d.screen, { width: 2.2, gain: 1.3 });
    // CD 本体
    const c = d.cd;
    g.save();
    g.translate(c.x, c.y);
    g.rotate(c.angle);
    g.scale(1, 0.35); // 楕円 (かたむき感)
    const grad = g.createRadialGradient(0, 0, 2, 0, 0, 9.4);
    grad.addColorStop(0, '#c8d2dc');
    grad.addColorStop(0.45, '#b8c8dc');
    grad.addColorStop(1, '#dce8f2');
    g.fillStyle = grad;
    g.beginPath(); g.arc(0, 0, 9.4, 0, TAU); g.fill();
    // 虹の反射 (見た目)
    for (let k = 0; k < 6; k++) {
      g.strokeStyle = waveCss(420 + k * 50, 0.5);
      g.lineWidth = 0.8;
      g.beginPath();
      g.arc(0, 0, 4.5 + k * 0.75, -1.2 + Math.sin(c.angle * 2) * 0.5, 0.6 + Math.sin(c.angle * 2) * 0.5);
      g.stroke();
    }
    g.fillStyle = '#20263c';
    g.beginPath(); g.arc(0, 0, 1.7, 0, TAU); g.fill();
    g.restore();
    drawFlashlight(g, d.srcX, d.srcY, d.beamA ?? 0.5, 1.1);
    d.mgr.draw(g);
    // あつめた色パレット
    g.fillStyle = 'rgba(255,255,255,0.92)';
    rr(g, W - 46, 20, 44, 12, 3);
    g.fill();
    g.fillStyle = '#556';
    g.font = 'bold 2.6px sans-serif';
    g.fillText(`いろ図鑑 ${d.got ?? 0}/${BINS}`, W - 43, 24.5);
    for (let i = 0; i < BINS; i++) {
      const l = 390 + ((i + 0.5) / BINS) * 310;
      g.fillStyle = d.caught[i] >= 1 ? waveCss(l, 1) : 'rgba(120,120,130,0.35)';
      rr(g, W - 43 + i * 3.3, 26.5, 2.7, 3.4, 0.8);
      g.fill();
    }
  },
};
