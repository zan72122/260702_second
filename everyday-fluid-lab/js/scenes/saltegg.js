// シーン: 塩水でたまごを浮かす実験
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad, tileWall, woodTable, softShadow, glassShine, eye } from '../engine/art.js';

export default {
  id: 'saltegg',
  name: '塩水でたまご浮かし',
  emoji: '🥚',
  desc: '塩をとかすと 浮力が変わる!',
  goal: '🎯 塩をとかして しずんだ たまごを 浮かせよう!',
  clearMsg: '浮力の実験 だいせいこう!',
  maxParticles: 2600,
  view: { shine: 1.3, refract: 1.2 },

  init(ctx) {
    const d = ctx.data;
    d.salt = 0;        // とけた塩 0..1
    d.floatT = 0;
    d.spoonT = 0;
    ctx.sim.definePhase(0, { // 水 (塩がとけるほど少し白く)
      sigma: 3, beta: 1.5, grav: 1.0, mix: 1.5, group: 1,
      color: [0.55, 0.75, 0.9], alpha: 0.4,
    });
    ctx.setTools([
      { id: 'salt', icon: '🧂', label: '塩を1ぱい入れる' },
      { id: 'stir', icon: '🥄', label: 'まぜる' },
    ]);
    d.tool = 'stir';
    ctx.setHint('たまごは 真水だと しずむ…塩を入れて まぜてみよう!');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.cx = W / 2;
    d.gw = Math.min(W * 0.5, 56);
    d.bottom = Math.min(H - 16, H * 0.9);
    d.top = d.bottom - Math.min(H * 0.5, 86);
    ctx.addCup(d.cx, d.top, d.bottom, d.gw, 2);
    d.spoonCol = { kind: 'capsule', ax: -100, ay: -100, bx: -100, by: -90, r: 2.2, vx: 0, vy: 0, off: true, noSolid: true };
    ctx.sim.colliders.push(d.spoonCol);
    if (!d.filled) {
      d.filled = true;
      ctx.fill(d.cx - d.gw / 2 + 2, d.top + (d.bottom - d.top) * 0.28, d.cx + d.gw / 2 - 2, d.bottom - 2, 0, 1.25);
      // たまご (真水ではしずむ密度)
      d.egg = ctx.sim.addSolid({
        x: d.cx, y: d.top + 10,
        r: 5, density: 1.12, drag: 3.2,
      });
    }
  },

  update(ctx, dt) {
    const d = ctx.data, s = ctx.sim, p = ctx.primary;
    // スプーンでまぜる
    if (d.tool === 'stir' && p) {
      const c = d.spoonCol;
      c.off = false;
      c.vx = clamp((p.x - c.ax) / Math.max(dt, 1e-3), -260, 260);
      c.vy = clamp((p.y - c.ay) / Math.max(dt, 1e-3), -260, 260);
      c.ax = p.x; c.ay = p.y;
      c.bx = p.x + 1; c.by = p.y - 24;
    } else { d.spoonCol.off = true; d.spoonCol.ax = d.spoonCol.bx = -100; }

    // 塩投入アニメーション
    if (d.spoonT > 0) {
      d.spoonT -= dt;
      if (Math.random() < dt * 30) {
        ctx.fx.addSpray(d.cx + rand(-3, 3), d.top - 6, rand(-5, 5), rand(10, 30), 'rgba(255,255,255,0.95)', 0.5, 0.5);
      }
    }

    // 塩分 → たまごの実効密度 (塩水は重い = 相対的に卵が軽くなる)
    if (d.egg) {
      d.egg.density = 1.12 / (1 + d.salt * 0.55);
      // 水没度 (頭の上の水): 浮き判定と水の抵抗に使う
      const subD = s.densityAt(d.egg.x, d.egg.y - d.egg.r * 1.2);
      const f = clamp(subD / 0.9, 0, 1);
      const prevF = d.subF ?? 1;
      d.subF = prevF + (f - prevF) * Math.min(1, dt * 6);
      // 水の抵抗: 卵サイズの物体は水中でゆっくりしか動けない (暴れ防止)
      if (d.egg.wet > 0.25) {
        d.egg.vy -= d.egg.vy * Math.min(0.9, 9 * dt);
        d.egg.vy = clamp(d.egg.vy, -14, 16);
      }
      // 塩分で水を少し白濁
      const w = clamp(d.salt, 0, 1);
      for (let i = 0; i < s.n; i += 7) {
        s.cr[i] += (0.55 + w * 0.3 - s.cr[i]) * dt * 0.5;
        s.ca[i] += (0.4 + w * 0.18 - s.ca[i]) * dt * 0.5;
      }
      // 浮き判定: 水面近くで安定
      // 浮き判定: 頭が水面から出ていて (subF小) おしりは水中 (wet大)、落ちついている
      // ぷかぷか中の一瞬の水没/飛び出しでリセットしない (漏れバケツ式)
      const floating = d.subF < 0.5 && d.egg.wet > 0.22;
      if (floating) d.floatT += dt;
      else d.floatT = Math.max(0, d.floatT - dt * 0.6);
      if (d.floatT > 0.2) {
        ctx.progress(Math.min(1, d.floatT / 1.8));
      } else if (!ctx._cleared) {
        ctx.progress(clamp(d.salt * 0.7, 0, 0.9));
      }
    }
  },

  onTool(ctx, id) {
    const d = ctx.data;
    if (id === 'salt') {
      if (d.salt >= 1.3) { ctx.toast('🧂 もう しょっぱすぎ!'); return; }
      d.salt += 0.18;
      d.spoonT = 0.6;
      ctx.sfx.pop(0.7);
      ctx.toast(`🧂 塩 ${Math.round(d.salt / 0.18)}はいめ… (とかすには まぜよう)`);
      return;
    }
    d.tool = id;
    ctx.setToolActive(id);
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    tileWall(g, W, 0, H * 0.5, '#eef4ea');
    g.fillStyle = vgrad(g, H * 0.5, H, [[0, '#e2ead8'], [1, '#d4dec8']]);
    g.fillRect(0, H * 0.5, W, H * 0.5);
    // 実験メモ
    g.fillStyle = 'rgba(255,255,255,0.9)';
    rr(g, 4, 16, Math.min(44, W * 0.4), 24, 3);
    g.fill();
    g.fillStyle = '#5a7a3a';
    g.font = 'bold 3.2px sans-serif';
    g.fillText('ふりょく実験', 7, 22);
    g.font = '2.6px sans-serif';
    g.fillText('塩水は 真水より重い', 7, 27);
    g.fillText('→ たまごが 浮く!', 7, 31);
    g.fillText('(死海とおなじ)', 7, 35);
    woodTable(g, W, d.bottom + 5, H, 1);
    softShadow(g, d.cx, d.bottom + 5, d.gw * 0.8, 3, 0.18);
    const x0 = d.cx - d.gw / 2 - 2.6, wgl = d.gw + 5.2;
    g.fillStyle = 'rgba(210,235,250,0.16)';
    rr(g, x0, d.top - 2, wgl, d.bottom - d.top + 5, 3);
    g.fill();
    g.strokeStyle = 'rgba(180,215,240,0.7)';
    g.lineWidth = 1;
    rr(g, x0, d.top - 2, wgl, d.bottom - d.top + 5, 3);
    g.stroke();
    glassShine(g, x0 + 2, d.top + 6, wgl, d.bottom - d.top - 10);
    // 塩つぼ
    g.fillStyle = '#f0f0f4';
    rr(g, W * 0.83, d.bottom - 8, 12, 12, 2);
    g.fill();
    g.fillStyle = '#889';
    g.font = 'bold 3px sans-serif';
    g.fillText('塩', W * 0.83 + 4, d.bottom - 1);
  },

  drawFront(ctx, g) {
    const d = ctx.data, p = ctx.primary;
    // たまご
    const e = d.egg;
    if (e) {
      g.save();
      g.translate(e.x, e.y);
      g.rotate(clamp(e.angle * 0.2, -0.4, 0.4));
      const grd = g.createRadialGradient(-1.5, -2, 1, 0, 0, e.r * 1.2);
      grd.addColorStop(0, '#fff8ec');
      grd.addColorStop(1, '#e8d5b0');
      g.fillStyle = grd;
      g.beginPath();
      g.ellipse(0, 0, e.r * 0.82, e.r * 1.05, 0, 0, TAU);
      g.fill();
      if (ctx._cleared) {
        eye(g, -1.5, -1, 0.8, 0);
        eye(g, 1.5, -1, 0.8, 0);
        g.strokeStyle = '#8a6a4a';
        g.lineWidth = 0.4;
        g.beginPath(); g.arc(0, 1.2, 1.2, 0.4, Math.PI - 0.4); g.stroke();
      }
      g.restore();
    }
    // 塩分メーター
    g.fillStyle = 'rgba(255,255,255,0.92)';
    rr(g, ctx.W - 34, 16, 32, 12, 3);
    g.fill();
    g.fillStyle = '#556';
    g.font = 'bold 3.4px sans-serif';
    g.fillText(`塩分 ${(d.salt * 100 / 1.3 | 0)}%`, ctx.W - 31, 24);
    // 道具
    if (d.spoonT > 0) {
      g.save();
      g.translate(d.cx, d.top - 12);
      g.rotate(-0.8 + d.spoonT * 1.2);
      g.fillStyle = '#c8ccd8';
      rr(g, -1, -12, 2, 11, 1);
      g.fill();
      g.beginPath(); g.ellipse(0, 1, 2.6, 3.4, 0, 0, TAU); g.fill();
      g.fillStyle = '#fff';
      g.beginPath(); g.ellipse(0, 0.4, 1.8, 2.2, 0, 0, TAU); g.fill();
      g.restore();
    } else if (d.tool === 'stir' && p) {
      g.save();
      g.translate(p.x, p.y);
      g.strokeStyle = '#c8ccd8';
      g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(1, -24); g.lineTo(0, -2); g.stroke();
      g.fillStyle = '#dfe3ee';
      g.beginPath(); g.ellipse(0, 0, 2.2, 3.2, 0, 0, TAU); g.fill();
      g.restore();
    }
  },
};
