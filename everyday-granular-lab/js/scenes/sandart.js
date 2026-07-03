// シーン: カラーサンドアート (色砂を層にして砂絵ボトルづくり)
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad, woodTable, softShadow, glassShine } from '../engine/art.js';
import { SPRITES } from '../engine/grainRenderer.js';
import { Pourer } from './common.js';

const COLORS = [
  { id: 'pink', label: 'ピンク', icon: '🌸', c: [[1, 0.6, 0.75], [1, 0.68, 0.8]] },
  { id: 'blue', label: 'そら', icon: '💙', c: [[0.45, 0.72, 1], [0.55, 0.78, 1]] },
  { id: 'yellow', label: 'きいろ', icon: '⭐', c: [[1, 0.85, 0.35], [1, 0.9, 0.5]] },
  { id: 'green', label: 'みどり', icon: '🍀', c: [[0.5, 0.9, 0.55], [0.6, 0.95, 0.65]] },
  { id: 'purple', label: 'むらさき', icon: '🍇', c: [[0.72, 0.55, 0.95], [0.78, 0.62, 1]] },
];

export default {
  id: 'sandart',
  name: 'カラーサンドアート',
  emoji: '🎨',
  desc: 'しましま模様の 砂絵ボトル',
  goal: '🎯 4色いじょう使って 首もとまで しましまに!',
  clearMsg: 'せかいにひとつの砂絵ボトル!',
  maxParticles: 3200,
  tilt: false,
  rattlePitch: 1.5,

  init(ctx) {
    const d = ctx.data;
    d.color = 0;
    d.used = new Set();
    d.tool = 'pour';
    d.pourer = new Pourer(150, 30);
    COLORS.forEach((cd, i) => {
      ctx.sim.defineMaterial(i, {
        r: 0.75, rJit: 0.08, mu: 0.85, vmax: 55,
        sprite: SPRITES.SAND, colors: cd.c,
      });
    });
    ctx.setTools([
      ...COLORS.map((cd, i) => ({ id: cd.id, icon: cd.icon, label: cd.label, active: i === 0 })),
      { id: 'stick', icon: '🥢', label: 'ぼうで模様' },
    ]);
    ctx.setHint('色をえらんで そそぐ→層になる。ぼうで ふちを なぞると 模様がつく!');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.cx = W / 2;
    d.bw = Math.min(W * 0.42, 46);
    d.bottom = Math.min(H - 14, H * 0.9);
    d.top = d.bottom - Math.min(H * 0.52, 86);
    d.neckY = d.top + 12;
    const s = ctx.sim;
    // 瓶: 底広・肩がすぼまる
    s.colliders.push(
      { kind: 'capsule', ax: d.cx - d.bw / 2, ay: d.neckY + 8, bx: d.cx - d.bw / 2, by: d.bottom, r: 1.6, mu: 0.5 },
      { kind: 'capsule', ax: d.cx + d.bw / 2, ay: d.neckY + 8, bx: d.cx + d.bw / 2, by: d.bottom, r: 1.6, mu: 0.5 },
      { kind: 'capsule', ax: d.cx - d.bw / 2, ay: d.bottom, bx: d.cx + d.bw / 2, by: d.bottom, r: 1.6, mu: 0.5 },
      // 肩
      { kind: 'capsule', ax: d.cx - d.bw / 2, ay: d.neckY + 8, bx: d.cx - 7, by: d.neckY, r: 1.6, mu: 0.5 },
      { kind: 'capsule', ax: d.cx + d.bw / 2, ay: d.neckY + 8, bx: d.cx + 7, by: d.neckY, r: 1.6, mu: 0.5 },
      // 首
      { kind: 'capsule', ax: d.cx - 7, ay: d.neckY, bx: d.cx - 7, by: d.top - 4, r: 1.6, mu: 0.5 },
      { kind: 'capsule', ax: d.cx + 7, ay: d.neckY, bx: d.cx + 7, by: d.top - 4, r: 1.6, mu: 0.5 },
    );
    d.lineY = d.neckY + 10;
    // 棒ツール
    d.stick = { kind: 'circle', x: -999, y: -999, r: 1.6, vx: 0, vy: 0, off: true, noSolid: true, mu: 0.3 };
    s.colliders.push(d.stick);
  },

  update(ctx, dt) {
    const d = ctx.data, s = ctx.sim, p = ctx.primary;
    const pouring = d.tool === 'pour' && !!p;
    d.pourer.mat = d.color;
    if (pouring) {
      d.used.add(d.color);
      // 注ぎ口は瓶の首の上あたりに誘導 (どこをタッチしても入りやすい)
      const px = clamp(p.x, d.cx - 3, d.cx + 3);
      d.pourer.update(ctx, dt, true, px, Math.min(p.y, d.top - 6), 1.8);
    } else d.pourer.update(ctx, dt, false, 0, 0);
    ctx.sfx.setPour(pouring ? 0.45 : 0, 1.6);

    if (d.tool === 'stick' && p) {
      const c = d.stick;
      c.off = false;
      c.vx = clamp((p.x - c.x) / Math.max(dt, 1e-3), -260, 260);
      c.vy = clamp((p.y - c.y) / Math.max(dt, 1e-3), -260, 260);
      c.x = p.x; c.y = p.y;
    } else { d.stick.off = true; d.stick.x = -999; }

    // 進捗: 首もとまでの充填 × 使った色
    const top = s.topAt(d.cx, 5);
    const fill = clamp((d.bottom - top) / (d.bottom - d.lineY), 0, 1);
    const colorFrac = Math.min(1, d.used.size / 4);
    ctx.progress(clamp(fill * 0.75 + colorFrac * 0.25, 0, fill >= 0.96 && d.used.size >= 4 ? 1 : 0.97));
  },

  onTool(ctx, id) {
    const d = ctx.data;
    const ci = COLORS.findIndex((c) => c.id === id);
    if (ci >= 0) {
      d.color = ci;
      d.tool = 'pour';
      ctx.setToolActive(id);
      ctx.toast(COLORS[ci].icon + ' ' + COLORS[ci].label + 'の砂!');
      return;
    }
    if (id === 'stick') {
      d.tool = 'stick';
      ctx.setToolActive(id);
      ctx.toast('🥢 砂にさして ゆっくり動かすと 模様ができる');
    }
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    g.fillStyle = vgrad(g, 0, H, [[0, '#fdf0f4'], [1, '#f4e0ec']]);
    g.fillRect(0, 0, W, H);
    // 工作テーブル
    woodTable(g, W, d.bottom + 5, H, 1);
    softShadow(g, d.cx, d.bottom + 4, d.bw * 0.8, 3, 0.16);
    // 見本ボトル (かざり)
    g.save();
    g.translate(W * 0.13, d.bottom - 12);
    g.scale(0.55, 0.55);
    for (let i = 0; i < 5; i++) {
      g.fillStyle = ['#ff9ab8', '#7ab8ff', '#ffd95a', '#8ae08a', '#c09aff'][i];
      g.fillRect(-9, -i * 5 - 5, 18, 5);
    }
    g.strokeStyle = 'rgba(150,170,190,0.8)';
    g.lineWidth = 1.2;
    g.strokeRect(-9, -30, 18, 30);
    g.restore();
    // 瓶 (背面)
    g.fillStyle = 'rgba(210,235,250,0.18)';
    g.beginPath();
    g.moveTo(d.cx - 7, d.top - 4);
    g.lineTo(d.cx - 7, d.neckY);
    g.lineTo(d.cx - d.bw / 2, d.neckY + 8);
    g.lineTo(d.cx - d.bw / 2, d.bottom);
    g.lineTo(d.cx + d.bw / 2, d.bottom);
    g.lineTo(d.cx + d.bw / 2, d.neckY + 8);
    g.lineTo(d.cx + 7, d.neckY);
    g.lineTo(d.cx + 7, d.top - 4);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(170,200,225,0.8)';
    g.lineWidth = 1;
    g.stroke();
    // ここまでライン
    g.strokeStyle = 'rgba(230,90,120,0.85)';
    g.lineWidth = 0.8;
    g.setLineDash([2.5, 2]);
    g.beginPath();
    g.moveTo(d.cx - d.bw / 2 - 5, d.lineY);
    g.lineTo(d.cx + d.bw / 2 + 5, d.lineY);
    g.stroke();
    g.setLineDash([]);
  },

  drawFront(ctx, g) {
    const d = ctx.data, p = ctx.primary;
    glassShine(g, d.cx - d.bw / 2 + 2, d.neckY + 12, d.bw, d.bottom - d.neckY - 16);
    if (d.tool === 'pour' && p) {
      // 砂のミニボトル (注ぎ具)
      g.save();
      g.translate(clamp(p.x, d.cx - 6, d.cx + 6), Math.min(p.y, d.top - 6) - 7);
      g.rotate(0.5 + Math.sin(ctx.t * 6) * 0.05);
      const col = COLORS[d.color].c[0];
      g.fillStyle = `rgb(${col[0] * 255},${col[1] * 255},${col[2] * 255})`;
      rr(g, -4.5, -10, 9, 14, 2);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.4)';
      rr(g, -3, -9, 2, 12, 1);
      g.fill();
      g.fillStyle = '#c8c8d4';
      rr(g, -2, 4, 4, 4, 1);
      g.fill();
      g.restore();
    } else if (d.tool === 'stick' && p) {
      g.strokeStyle = '#c89858';
      g.lineWidth = 1.4;
      g.beginPath();
      g.moveTo(p.x, p.y);
      g.lineTo(p.x + 5, p.y - 26);
      g.stroke();
    }
  },
};
