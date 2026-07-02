// シーン: アイスコーヒーにガムシロップ (比重差でしずむ!)
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, softShadow, vgrad, woodTable, glassShine } from '../engine/art.js';
import { Pourer, verticalUniformity, drawPitcher } from './common.js';

export default {
  id: 'icedcoffee',
  name: 'アイスコーヒーとガムシロ',
  emoji: '🧋',
  desc: 'シロップが ゆらゆら しずんでいく',
  goal: '🎯 ガムシロを入れて、むらなく混ぜよう!',
  clearMsg: 'あまくて おいしい!',
  maxParticles: 2600,
  view: { shine: 1.4, refract: 1.6 },

  init(ctx) {
    const d = ctx.data;
    d.tool = 'syrup';
    d.pourer = new Pourer(45, 40);
    d.sunkShown = false;
    ctx.sim.definePhase(0, { // コーヒー
      sigma: 4, beta: 1.6, grav: 1, mix: 0.8, group: 1,
      color: [0.28, 0.16, 0.09], alpha: 0.72,
    });
    ctx.sim.definePhase(1, { // ガムシロップ (重い・ほぼ透明)
      sigma: 14, beta: 2.5, grav: 1.75, mix: 0.8, group: 1, repel: 0.12,
      color: [0.85, 0.87, 0.9], alpha: 0.3,
    });
    ctx.setTools([
      { id: 'syrup', icon: '🍶', label: 'ガムシロを注ぐ', active: true },
      { id: 'stir', icon: '🥢', label: 'マドラーでまぜる' },
      { id: 'ice', icon: '🧊', label: '氷を追加' },
    ]);
    ctx.setHint('ガムシロップは重いから しずんでいくよ。よーく見てて!');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.cx = W / 2;
    d.gw = Math.min(W * 0.44, 48);
    d.top = Math.max(H * 0.2, 30);
    d.bottom = Math.min(H - 18, d.top + Math.min(H * 0.62, 120));
    ctx.addCup(d.cx, d.top, d.bottom, d.gw, 1.8);
    d.stirCol = { kind: 'capsule', ax: -100, ay: -100, bx: -100, by: -90, r: 1.6, vx: 0, vy: 0, off: true, noSolid: true };
    ctx.sim.colliders.push(d.stirCol);
    if (!d.filled) {
      d.filled = true;
      ctx.fill(d.cx - d.gw / 2 + 2, d.top + (d.bottom - d.top) * 0.3, d.cx + d.gw / 2 - 2, d.bottom - 2, 0);
      for (let i = 0; i < 3; i++) this._addIce(ctx);
    }
  },

  _addIce(ctx) {
    const d = ctx.data;
    const so = ctx.sim.addSolid({
      x: d.cx + rand(-d.gw * 0.25, d.gw * 0.25),
      y: d.top + 10 + rand(0, 10),
      r: rand(4.2, 5.4), density: 0.55, drag: 4, upright: 0,
    });
    so.data.rot = rand(TAU);
    so.hitWall = (v) => { if (v > 26) ctx.sfx.clink(); };
  },

  update(ctx, dt) {
    const d = ctx.data, s = ctx.sim, p = ctx.primary;
    const pouring = d.tool === 'syrup' && !!p && p.y < d.bottom;
    d.pourer.phase = 1;
    d.pourer.update(ctx, dt, pouring, p ? p.x : 0, p ? p.y - 3 : 0, 0, 1, 1.4);

    if (d.tool === 'stir' && p) {
      const c = d.stirCol;
      c.off = false;
      c.vx = (p.x - c.ax) / Math.max(dt, 1e-3);
      c.vy = (p.y - c.ay) / Math.max(dt, 1e-3);
      c.ax = p.x; c.ay = p.y;
      c.bx = p.x + 0.8; c.by = p.y - 30;
    } else {
      d.stirCol.off = true;
      d.stirCol.ax = d.stirCol.bx = -100;
    }

    const syr = ctx.countPhase(1);
    if (!d.sunkShown && syr > 120) {
      d.sunkShown = true;
      ctx.toast('✨ シロップが底にしずんでいく…!');
    }
    if (syr > 250) {
      ctx.progress(verticalUniformity(s, 1, 5) * 1.06);
    } else ctx.progress(0);
  },

  onTool(ctx, id) {
    if (id === 'ice') {
      if (ctx.sim.solids.length < 6) { this._addIce(ctx); ctx.sfx.clink(); ctx.toast('🧊 カラン♪'); }
      return;
    }
    ctx.data.tool = id;
    ctx.setToolActive(id);
    ctx.toast(id === 'syrup' ? '🍶 タッチで注ごう' : '🥢 ドラッグでまぜまぜ!');
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    g.fillStyle = vgrad(g, 0, H, [[0, '#274262'], [1, '#1b2c44']]);
    g.fillRect(0, 0, W, H);
    // 窓の外の夕方
    g.fillStyle = 'rgba(255,190,120,0.15)';
    rr(g, W * 0.08, 6, W * 0.84, Math.max(14, d.top - 16), 4);
    g.fill();
    woodTable(g, W, d.bottom + 4, H, 0);
    softShadow(g, d.cx, d.bottom + 6, d.gw, 3, 0.25);
    // グラス背面
    const x0 = d.cx - d.gw / 2 - 2.6, wgl = d.gw + 5.2;
    g.fillStyle = 'rgba(200,225,245,0.16)';
    rr(g, x0, d.top - 2, wgl, d.bottom - d.top + 5, 3);
    g.fill();
    g.strokeStyle = 'rgba(220,240,255,0.5)';
    g.lineWidth = 0.9;
    rr(g, x0, d.top - 2, wgl, d.bottom - d.top + 5, 3);
    g.stroke();
    glassShine(g, x0 + 2, d.top + 6, wgl, d.bottom - d.top - 10);
  },

  drawFront(ctx, g) {
    const d = ctx.data, p = ctx.primary;
    // 氷 (角の丸い四角)
    for (const so of ctx.sim.solids) {
      g.save();
      g.translate(so.x, so.y);
      g.rotate(so.angle * 0.3 + so.data.rot * 0.1);
      g.fillStyle = 'rgba(235,248,255,0.75)';
      rr(g, -so.r * 0.9, -so.r * 0.9, so.r * 1.8, so.r * 1.8, 1.6);
      g.fill();
      g.strokeStyle = 'rgba(160,200,230,0.8)';
      g.lineWidth = 0.5;
      rr(g, -so.r * 0.9, -so.r * 0.9, so.r * 1.8, so.r * 1.8, 1.6);
      g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.75)';
      rr(g, -so.r * 0.55, -so.r * 0.6, so.r * 0.5, so.r * 0.9, 0.6);
      g.fill();
      g.restore();
    }
    // グラスのふち
    g.fillStyle = 'rgba(220,240,255,0.35)';
    rr(g, d.cx - d.gw / 2 - 2.6, d.top - 3, d.gw + 5.2, 2, 1);
    g.fill();
    if (d.tool === 'syrup' && p) {
      drawPitcher(g, p.x + 6, p.y - 7, -0.45, '#f3f3f8', '#eef0f4');
    } else if (d.tool === 'stir' && p) {
      g.save();
      g.translate(p.x, p.y);
      g.strokeStyle = '#7fd8c8';
      g.lineWidth = 1.4;
      g.beginPath(); g.moveTo(0.8, -30); g.lineTo(0, 0); g.stroke();
      g.fillStyle = '#5fc8b8';
      g.beginPath(); g.arc(0.9, -30, 1.6, 0, TAU); g.fill();
      g.restore();
    }
  },
};
