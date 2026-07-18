// シーン: 鏡で光リレー (くらい部屋の花に 日光をとどけよう)
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad, softShadow, star } from '../engine/art.js';
import { DragMgr } from './common.js';

export default {
  id: 'mirrors',
  name: '鏡で光リレー',
  emoji: '🪞',
  desc: '反射をつないで 光をとどけろ',
  goal: '🎯 鏡を動かして 窓の日ざしを 3つの花ぜんぶに とどけよう!',
  clearMsg: '反射の達人!花もにっこり!',
  spectrumN: 8,

  init(ctx) {
    const d = ctx.data;
    d.mgr = new DragMgr();
    d.bloom = [0, 0, 0];
    ctx.setHint('鏡は ドラッグで移動、↻ノブで回転。入射角=反射角!');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.floorY = Math.min(H - 12, H * 0.94);
    // 窓 (光の入口): 左上から斜めに日ざし
    d.winX = W * 0.12; d.winY = 18;
    d.beamA = Math.PI * 0.38; // 下向き斜め
    // 花 3つ (部屋のすみ)
    d.flowers = [
      { x: W * 0.85, y: d.floorY - 3 },
      { x: W * 0.55, y: d.floorY - 3 },
      { x: W * 0.9, y: H * 0.35 },
    ];
    // 鏡 3枚 (位置は保持)
    const old = d.mgr.items.slice();
    d.mgr.items.length = 0;
    d.mirrors = [];
    for (let k = 0; k < 3; k++) {
      const prev = old[k];
      d.mirrors.push(d.mgr.add({
        x: prev?.x ?? W * (0.3 + k * 0.2), y: prev?.y ?? H * (0.55 + (k % 2) * 0.15),
        r: 9, angle: prev?.angle ?? -Math.PI / 4 + k * 0.3,
        rot: { len: 12, r: 3.6 },
        boundsX: [8, W - 8], boundsY: [24, d.floorY - 4],
      }));
    }
  },

  _buildTracer(ctx) {
    const d = ctx.data, tr = ctx.tracer;
    tr.clear();
    d.hitNow = [0, 0, 0];
    for (const m of d.mirrors) {
      const L = 8;
      tr.add({
        kind: 'mirror',
        ax: m.x - Math.cos(m.angle) * L, ay: m.y - Math.sin(m.angle) * L,
        bx: m.x + Math.cos(m.angle) * L, by: m.y + Math.sin(m.angle) * L,
        reflect: 0.96,
      });
    }
    // 花 = 小さなスクリーン (横+縦の十字で どの向きの光も受かる)
    d.flowerEls = d.flowers.flatMap((f, i) => {
      const h = { kind: 'screen', ax: f.x - 4, ay: f.y - 5, bx: f.x + 4, by: f.y - 5, hits: [], fi: i };
      const v = { kind: 'screen', ax: f.x, ay: f.y - 9, bx: f.x, by: f.y - 1, hits: [], fi: i };
      tr.add(h); tr.add(v);
      return [h, v];
    });
    // 床と壁は吸収
    tr.add({ kind: 'absorber', ax: -5, ay: d.floorY, bx: ctx.W + 5, by: d.floorY });
  },

  update(ctx, dt) {
    const d = ctx.data;
    this._buildTracer(ctx);
    d.segs = [];
    // 日ざし: 平行光のたば (やわらかい白色 = スペクトル束)
    for (let k = 0; k < 3; k++) {
      const ox = d.winX + k * 2.6, oy = d.winY + k * 1.2;
      ctx.tracer.traceWhite(ox, oy, Math.cos(d.beamA), Math.sin(d.beamA), 1.5, ctx.spectrum, d.segs);
    }
    // 花の開花ゲージ (十字2枚のヒット合算)
    let done = 0;
    d.flowers.forEach((f, i) => {
      const I = d.flowerEls.filter((el) => el.fi === i)
        .reduce((a, el) => a + el.hits.reduce((a2, h) => a2 + h.I, 0), 0);
      if (I > 0.25) {
        d.bloom[i] = Math.min(1, d.bloom[i] + dt * 0.55);
        if (Math.random() < dt * 6) ctx.fx.addSpray(d.flowers[i].x + rand(-2, 2), d.flowers[i].y - 6, rand(-4, 4), rand(-14, -6), 'rgba(255,240,150,0.9)', 0.5, 0.5);
      } else if (d.bloom[i] < 1) {
        // さいた花はもう しぼまない (順番に照らしてOK)
        d.bloom[i] = Math.max(0, d.bloom[i] - dt * 0.1);
      }
      if (d.bloom[i] >= 1) done++;
    });
    ctx.progress(done >= 3 ? 1 : Math.min(0.97, (d.bloom[0] + d.bloom[1] + d.bloom[2]) / 3));
  },

  onDown(ctx, p) { ctx.data.mgr.down(p); },
  onMove(ctx, p) { ctx.data.mgr.move(p, ctx); },
  onUp(ctx) { ctx.data.mgr.up(); },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    // うす暗い部屋
    g.fillStyle = vgrad(g, 0, H, [[0, '#252033'], [1, '#181420']]);
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#2e2438';
    g.fillRect(0, d.floorY, W, H - d.floorY);
    // 窓
    g.save();
    g.translate(d.winX, d.winY);
    g.rotate(d.beamA - Math.PI / 2);
    g.fillStyle = 'rgba(255,245,200,0.9)';
    rr(g, -7, -6, 14, 8, 1.5);
    g.fill();
    g.strokeStyle = '#8a7a5a';
    g.lineWidth = 1;
    rr(g, -7, -6, 14, 8, 1.5);
    g.stroke();
    g.beginPath();
    g.moveTo(0, -6); g.lineTo(0, 2);
    g.stroke();
    g.restore();
    // 植木鉢
    for (const f of d.flowers) {
      g.fillStyle = '#a8603a';
      g.beginPath();
      g.moveTo(f.x - 3.4, f.y - 2);
      g.lineTo(f.x - 2.4, f.y + 3);
      g.lineTo(f.x + 2.4, f.y + 3);
      g.lineTo(f.x + 3.4, f.y - 2);
      g.closePath();
      g.fill();
    }
  },

  drawFront(ctx, g) {
    const d = ctx.data;
    ctx.drawRays(g, d.segs, { gain: 1.1, glowWidth: 2.6 });
    // 鏡
    for (const m of d.mirrors) {
      const L = 8;
      g.save();
      g.translate(m.x, m.y);
      g.rotate(m.angle);
      g.fillStyle = '#cdd8e8';
      rr(g, -L, -0.9, L * 2, 1.8, 0.9);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.75)';
      rr(g, -L + 1, -0.55, L * 0.8, 0.7, 0.35);
      g.fill();
      g.restore();
    }
    d.mgr.draw(g);
    // 花 (開花ゲージで育つ)
    d.flowers.forEach((f, i) => {
      const b = d.bloom[i];
      const stemH = 4 + b * 5;
      g.strokeStyle = '#4a8a3a';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(f.x, f.y + 1);
      g.quadraticCurveTo(f.x + 1, f.y - stemH / 2, f.x, f.y - stemH);
      g.stroke();
      if (b < 0.99) {
        g.fillStyle = `rgb(${120 + b * 135},${170 + b * 60},80)`;
        g.beginPath();
        g.ellipse(f.x, f.y - stemH - 1.4, 1.5 + b, 2 + b * 0.6, 0, 0, TAU);
        g.fill();
      } else {
        star(g, f.x, f.y - stemH - 2, 3.4, 8);
        g.fillStyle = '#ffb843';
        g.fill();
        g.fillStyle = '#7a4a20';
        g.beginPath();
        g.arc(f.x, f.y - stemH - 2, 1.2, 0, TAU);
        g.fill();
      }
      // ゲージ
      g.fillStyle = 'rgba(255,255,255,0.25)';
      rr(g, f.x - 3.5, f.y + 4.5, 7, 1.2, 0.6);
      g.fill();
      g.fillStyle = b >= 1 ? '#5ad06a' : '#ffd25a';
      rr(g, f.x - 3.5, f.y + 4.5, Math.max(0.01, 7 * b), 1.2, 0.6);
      g.fill();
    });
  },
};
