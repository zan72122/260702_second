// シーン: お米を計量して炊飯釜へ
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad, woodTable, tileWall, softShadow } from '../engine/art.js';
import { SPRITES } from '../engine/grainRenderer.js';
import { Pourer, levelProgress } from './common.js';

export default {
  id: 'rice',
  name: 'お米を計量しよう',
  emoji: '🍚',
  desc: 'ザーッと入れて 目盛りピッタリ!',
  goal: '🎯 釜の目盛りぴったりまで お米を入れよう!',
  clearMsg: 'おいしいごはんが炊けそう!',
  maxParticles: 4200,
  rattlePitch: 0.9,

  init(ctx) {
    const d = ctx.data;
    d.pourer = new Pourer(230, 35);
    d.stableT = 0;
    d.overShown = false;
    ctx.sim.defineMaterial(0, {
      r: 0.8, rJit: 0.07, mu: 0.5, vmax: 75, interlock: 0.8, sleepK: 0.7,
      sprite: SPRITES.RICE, stretch: 1.9,
      colors: [[1, 1, 1], [0.97, 0.96, 0.9], [1, 0.99, 0.95]],
    });
    ctx.setTools([{ id: 'sweep', icon: '🖐️', label: 'ならす/かき出す' }, { id: 'pour', icon: '🛍️', label: '袋からそそぐ', active: true }]);
    d.tool = 'pour';
    ctx.setHint('タッチで袋からザーッ。目盛りの赤線ぴったりが ごうかく!');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.cx = W / 2;
    d.pw = Math.min(W * 0.52, 58);
    d.bottom = Math.min(H - 16, H * 0.88);
    d.top = d.bottom - Math.min(H * 0.42, 62);
    d.lineY = d.top + (d.bottom - d.top) * 0.42;
    ctx.addCup(d.cx, d.top, d.bottom, d.pw, 2.2);
    // ならすツール (指の丸)
    d.hand = { kind: 'circle', x: -999, y: -999, r: 4.5, vx: 0, vy: 0, off: true, noSolid: true, mu: 0.5 };
    ctx.sim.colliders.push(d.hand);
  },

  update(ctx, dt) {
    const d = ctx.data, s = ctx.sim, p = ctx.primary;
    const pouring = d.tool === 'pour' && !!p && p.y < d.bottom;
    d.pourer.mat = 0;
    d.pourer.update(ctx, dt, pouring, p ? p.x : 0, p ? Math.min(p.y, d.top - 4) : 0, 3);
    ctx.sfx.setPour(pouring ? 0.5 : 0, 0.5);

    // ならす
    if (d.tool === 'sweep' && p) {
      const c = d.hand;
      c.off = false;
      c.vx = clamp((p.x - c.x) / Math.max(dt, 1e-3), -260, 260);
      c.vy = clamp((p.y - c.y) / Math.max(dt, 1e-3), -260, 260);
      c.x = p.x; c.y = p.y;
    } else { d.hand.off = true; d.hand.x = -999; }

    // 判定: 中央±の粒面がラインぴったり & 落ち着いている
    const lv = levelProgress(s, d.cx, d.lineY, d.bottom, 2.6);
    d.top2 = lv.top;
    if (lv.done && !pouring && s.collisionEnergy < 6) {
      d.stableT += dt;
      ctx.progress(Math.min(1, d.stableT / 1.0));
    } else {
      d.stableT = 0;
      if (!ctx._cleared) ctx.progress(lv.frac);
    }
    if (!d.overShown && lv.top < d.lineY - 6) {
      d.overShown = true;
      ctx.toast('🍚 多すぎ!「ならす/かき出す」で けずろう');
    }
  },

  onTool(ctx, id) {
    ctx.data.tool = id;
    ctx.setToolActive(id);
    ctx.toast(id === 'pour' ? '🛍️ タッチでそそぐ' : '🖐️ ドラッグで ならしたり かき出したり');
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    tileWall(g, W, 0, d.bottom + 6, '#f2ead8');
    woodTable(g, W, d.bottom + 6, H, 1);
    softShadow(g, d.cx, d.bottom + 7, d.pw * 0.85, 3, 0.18);
    // 炊飯釜 (内釜)
    const x0 = d.cx - d.pw / 2 - 4, wI = d.pw + 8;
    g.fillStyle = vgrad(g, d.top - 4, d.bottom + 5, [[0, '#c9ced8'], [0.5, '#9aa2b2'], [1, '#767e90']]);
    rr(g, x0, d.top - 4, wI, d.bottom - d.top + 9, 5);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.35)';
    rr(g, x0 + 2.5, d.top - 2, 3, d.bottom - d.top + 4, 1.5);
    g.fill();
    // 取っ手
    g.fillStyle = '#5a6272';
    rr(g, x0 - 4, d.top + 2, 5, 8, 2); g.fill();
    rr(g, x0 + wI - 1, d.top + 2, 5, 8, 2); g.fill();
    // 内側
    g.fillStyle = '#e8ebf0';
    rr(g, d.cx - d.pw / 2, d.top - 1, d.pw, d.bottom - d.top + 2, 3);
    g.fill();
    // 目盛り
    for (let k = 1; k <= 3; k++) {
      const y = d.top + (d.bottom - d.top) * (0.25 + k * 0.17);
      g.strokeStyle = 'rgba(120,130,150,0.6)';
      g.lineWidth = 0.5;
      g.beginPath(); g.moveTo(d.cx - d.pw / 2 + 1, y); g.lineTo(d.cx - d.pw / 2 + 7, y); g.stroke();
    }
    // 目標ライン
    g.strokeStyle = '#e85a5a';
    g.lineWidth = 0.9;
    g.setLineDash([2.5, 1.8]);
    g.beginPath();
    g.moveTo(d.cx - d.pw / 2 + 1, d.lineY);
    g.lineTo(d.cx + d.pw / 2 - 1, d.lineY);
    g.stroke();
    g.setLineDash([]);
    g.fillStyle = '#e85a5a';
    g.font = 'bold 3.6px sans-serif';
    g.fillText('2ごう▶', d.cx - d.pw / 2 - 13, d.lineY + 1.2);
    // しゃもじ立て
    g.fillStyle = '#e8b04a';
    rr(g, W * 0.08, d.bottom - 12, 4, 18, 2); g.fill();
    g.beginPath(); g.ellipse(W * 0.08 + 2, d.bottom - 14, 4, 5.5, 0, 0, TAU); g.fill();
  },

  drawFront(ctx, g) {
    const d = ctx.data, p = ctx.primary;
    if (d.tool === 'pour' && p && p.y < d.bottom) {
      // お米の袋
      g.save();
      g.translate(p.x, Math.min(p.y, d.top - 4) - 8);
      g.rotate(0.5 + Math.sin(ctx.t * 6) * 0.05);
      g.fillStyle = '#f4efe2';
      rr(g, -7, -12, 14, 22, 2.5);
      g.fill();
      g.strokeStyle = 'rgba(160,140,100,0.5)';
      g.lineWidth = 0.5;
      rr(g, -7, -12, 14, 22, 2.5);
      g.stroke();
      g.fillStyle = '#d84a3a';
      g.font = 'bold 4px sans-serif';
      g.textAlign = 'center';
      g.fillText('米', 0, 0);
      g.fillStyle = '#7a6a4a';
      g.font = '2.2px sans-serif';
      g.fillText('新米 こしひかり', 0, 4.5);
      g.restore();
    } else if (d.tool === 'sweep' && p) {
      // 手
      g.save();
      g.translate(p.x, p.y);
      g.fillStyle = '#ffd9b8';
      g.beginPath(); g.ellipse(0, 0, 4.5, 5.4, -0.3, 0, TAU); g.fill();
      for (let i = 0; i < 4; i++) {
        g.beginPath();
        g.ellipse(-3 + i * 2, -4.5, 1.05, 2.2, (i - 1.5) * 0.12, 0, TAU);
        g.fill();
      }
      g.restore();
    }
  },
};
