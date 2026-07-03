// シーン: 砂場でお山づくり
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad, sun, cloud, softShadow } from '../engine/art.js';
import { SPRITES } from '../engine/grainRenderer.js';
import { Pourer } from './common.js';

export default {
  id: 'sandbox',
  name: '砂場でお山づくり',
  emoji: '🏖️',
  desc: '安息角で できる ほんものの砂山',
  goal: '🎯 旗のラインまで 高いお山を つくろう!',
  clearMsg: 'りっぱなお山!はた を立てたよ!',
  maxParticles: 3000,

  init(ctx) {
    const d = ctx.data;
    d.tool = 'pour';
    d.pourer = new Pourer(160, 30);
    d.flagPlanted = false;
    ctx.sim.defineMaterial(0, {
      r: 0.85, rJit: 0.12, mu: 1.0, vmax: 55,
      sprite: SPRITES.SAND,
      colors: [[0.93, 0.8, 0.55], [0.88, 0.74, 0.48], [0.97, 0.86, 0.62], [0.85, 0.7, 0.45]],
    });
    ctx.setTools([
      { id: 'pour', icon: '🪣', label: 'すなを注ぐ', active: true },
      { id: 'dig', icon: '🖐️', label: '手でおす/ほる' },
      { id: 'mold', icon: '🍮', label: 'バケツ型ぬき' },
    ]);
    ctx.setHint('注いだ砂が くずれながら 山になる — ほんものの安息角!');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.groundY = H - Math.min(H * 0.13, 22);
    d.targetY = d.groundY - Math.min(H * 0.24, W * 0.28, 42);
    d.hand = { kind: 'circle', x: -999, y: -999, r: 5, vx: 0, vy: 0, off: true, noSolid: true, mu: 0.8 };
    ctx.sim.colliders.push(d.hand);
    // 砂場の枠
    ctx.sim.colliders.push(
      { kind: 'box', x: 2, y: d.groundY + 6, hw: 3.5, hh: 6, mu: 0.8 },
      { kind: 'box', x: W - 2, y: d.groundY + 6, hw: 3.5, hh: 6, mu: 0.8 },
    );
    if (!d.filled) {
      d.filled = true;
      ctx.fill(4, d.groundY - 2, W - 4, H - 3, 0);
    }
  },

  update(ctx, dt) {
    const d = ctx.data, s = ctx.sim, p = ctx.primary;
    const { W } = ctx;
    // 注ぐ
    const pouring = d.tool === 'pour' && !!p;
    d.pourer.mat = 0;
    d.pourer.update(ctx, dt, pouring, p ? p.x : 0, p ? Math.min(p.y, d.targetY - 20) : 0, 4);
    ctx.sfx.setPour(pouring ? 0.4 : 0, 1.3);

    // 手でおす/ほる
    if (d.tool === 'dig' && p) {
      const c = d.hand;
      c.off = false;
      c.vx = clamp((p.x - c.x) / Math.max(dt, 1e-3), -260, 260);
      c.vy = clamp((p.y - c.y) / Math.max(dt, 1e-3), -260, 260);
      c.x = p.x; c.y = p.y;
      if (Math.hypot(c.vx, c.vy) > 60 && Math.random() < dt * 6) ctx.sfx.zaku();
    } else { d.hand.off = true; d.hand.x = -999; }

    // 山の高さ (自由落下中の粒は除外)
    let top = ctx.H;
    let topX = W / 2;
    for (let i = 0; i < s.n; i++) {
      if (s.y[i] < top && Math.abs(s.vy[i]) < 15) { top = s.y[i]; topX = s.x[i]; }
    }
    d.peakX = topX; d.peakY = top;
    const h0 = d.groundY - 2;
    const prog = clamp((h0 - top) / (h0 - d.targetY), 0, 1);
    if (prog >= 1 && !d.flagPlanted) {
      d.flagPlanted = true;
      ctx.progress(1);
      for (let k = 0; k < 10; k++) ctx.fx.addSpark(topX + rand(-6, 6), top - rand(0, 10), '#fff');
    } else if (!ctx._cleared) {
      ctx.progress(prog * 0.97);
    }
  },

  onTool(ctx, id) {
    const d = ctx.data;
    if (id === 'mold') {
      // バケツ型ぬき: 山の上あたりにプリン型の砂をドサッ
      const x = clamp(d.peakX ?? ctx.W / 2, 20, ctx.W - 20);
      const y = (d.peakY ?? d.groundY) - 26;
      const m = ctx.sim.mats[0];
      const sp = m.r * 2 * 1.02;
      let row = 0;
      for (let yy = y + 18; yy > y; yy -= sp * 0.87, row++) {
        const half = 8 - (y + 18 - yy) * 0.14;
        for (let xx = x - half + (row % 2) * sp * 0.5; xx < x + half; xx += sp) {
          ctx.pour(xx, yy, 0, 0, 0);
        }
      }
      ctx.sfx.pop(0.7);
      ctx.toast('🍮 ぷっちん!');
      return;
    }
    d.tool = id;
    ctx.setToolActive(id);
    ctx.toast(id === 'pour' ? '🪣 タッチで ザーッ' : '🖐️ ドラッグで おしたり ほったり');
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    g.fillStyle = vgrad(g, 0, H, [[0, '#8fd0f5'], [0.7, '#c8e8fa'], [1, '#e8f6ff']]);
    g.fillRect(0, 0, W, H);
    sun(g, W * 0.85, 14, 6.5);
    cloud(g, W * 0.25, 16, 1.1, 0.92);
    cloud(g, W * 0.6, 26, 0.8, 0.8);
    // 公園の遊具 (すべり台シルエット)
    g.fillStyle = 'rgba(120,160,130,0.5)';
    g.beginPath();
    g.moveTo(W * 0.06, d.groundY - 20);
    g.lineTo(W * 0.1, d.groundY - 34);
    g.lineTo(W * 0.13, d.groundY - 34);
    g.lineTo(W * 0.26, d.groundY - 8);
    g.lineTo(W * 0.22, d.groundY - 8);
    g.lineTo(W * 0.1, d.groundY - 28);
    g.closePath();
    g.fill();
    // 目標ライン
    g.strokeStyle = 'rgba(230,90,90,0.85)';
    g.lineWidth = 0.9;
    g.setLineDash([3, 2.2]);
    g.beginPath();
    g.moveTo(6, d.targetY);
    g.lineTo(W - 6, d.targetY);
    g.stroke();
    g.setLineDash([]);
    g.fillStyle = '#e85a5a';
    g.font = 'bold 3.4px sans-serif';
    g.fillText('ここまで!', 7, d.targetY - 2);
    // 砂場の枠 (木)
    g.fillStyle = '#a2703e';
    rr(g, -2, d.groundY, 8, 14, 2); g.fill();
    rr(g, W - 6, d.groundY, 8, 14, 2); g.fill();
    // 地面 (砂場の底)
    g.fillStyle = '#caa268';
    g.fillRect(0, d.groundY + 6, W, H - d.groundY);
  },

  drawFront(ctx, g) {
    const { W } = ctx, d = ctx.data, p = ctx.primary;
    // 旗 (クリアで山頂に)
    if (d.flagPlanted) {
      const x = d.peakX, y = d.peakY;
      g.strokeStyle = '#8a5a2a';
      g.lineWidth = 1;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 16); g.stroke();
      g.fillStyle = '#e8433a';
      g.beginPath();
      g.moveTo(x, y - 16);
      g.lineTo(x + 12, y - 13);
      g.lineTo(x, y - 10);
      g.closePath();
      g.fill();
    }
    if (d.tool === 'pour' && p) {
      // バケツ
      g.save();
      g.translate(p.x, Math.min(p.y, d.targetY - 20) - 6);
      g.rotate(0.6 + Math.sin(ctx.t * 7) * 0.05);
      g.fillStyle = '#e8554a';
      g.beginPath();
      g.moveTo(-7, -8); g.lineTo(7, -8); g.lineTo(5, 4); g.lineTo(-5, 4);
      g.closePath(); g.fill();
      g.strokeStyle = '#c04038'; g.lineWidth = 1;
      g.beginPath(); g.arc(0, -8, 7, Math.PI, TAU); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.3)';
      rr(g, -5.5, -7, 2.5, 10, 1);
      g.fill();
      g.restore();
    } else if (d.tool === 'dig' && p) {
      g.save();
      g.translate(p.x, p.y);
      g.fillStyle = '#ffd9b8';
      g.beginPath(); g.ellipse(0, 0, 5, 5.8, -0.3, 0, TAU); g.fill();
      for (let i = 0; i < 4; i++) {
        g.beginPath();
        g.ellipse(-3.2 + i * 2.1, -4.8, 1.1, 2.3, (i - 1.5) * 0.12, 0, TAU);
        g.fill();
      }
      g.restore();
    }
    // スコップ (飾り)
    g.save();
    g.translate(W * 0.92, ctx.H - 8);
    g.rotate(-0.5);
    g.fillStyle = '#4a90d8';
    g.beginPath(); g.ellipse(0, -2, 3, 4.5, 0, 0, TAU); g.fill();
    g.fillStyle = '#e8b04a';
    rr(g, -0.8, -12, 1.6, 9, 0.8); g.fill();
    g.restore();
  },
};
