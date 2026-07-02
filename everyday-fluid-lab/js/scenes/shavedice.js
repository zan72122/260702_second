// シーン: かき氷にシロップをかける
import { TAU, rand, clamp, css } from '../engine/utils.js';
import { rr, softShadow, vgrad } from '../engine/art.js';
import { Pourer, StainMap, drawSyrupBottle } from './common.js';

const FLAVORS = [
  { id: 'ichigo', label: 'いちご', icon: '🍓', color: [0.91, 0.20, 0.29], bottle: '#e8324a' },
  { id: 'melon', label: 'メロン', icon: '🍈', color: [0.24, 0.81, 0.35], bottle: '#3ecf5a' },
  { id: 'lemon', label: 'レモン', icon: '🍋', color: [1.0, 0.82, 0.24], bottle: '#ffd23e' },
  { id: 'blue', label: 'ブルーハワイ', icon: '🌊', color: [0.21, 0.65, 1.0], bottle: '#35a7ff' },
];

export default {
  id: 'shavedice',
  name: 'かき氷にシロップ',
  emoji: '🍧',
  desc: 'ふわふわの氷にシロップをとろ〜り',
  goal: '🎯 氷ぜんぶにシロップをかけよう!',
  clearMsg: '極上かき氷のできあがり!',
  maxParticles: 2400,
  view: { shine: 1.3, refract: 0.8 },
  tilt: true,

  init(ctx) {
    const d = ctx.data;
    d.flavor = 0;
    d.used = new Set();
    d.pourer = new Pourer(55, 50);
    d.coverage = new Set();
    d.bins = 22;
    d.rainbowShown = false;
    d.stainT = 0;
    d.speckles = Array.from({ length: 90 }, () => [rand(-1, 1), rand(-1, 1), rand(0.3, 0.9)]);
    for (let i = 0; i < 4; i++) {
      ctx.sim.definePhase(i, {
        sigma: 26, beta: 3, grav: 1.1, mix: 0.7, group: 9,
        color: FLAVORS[i].color, alpha: 0.88,
      });
    }
    ctx.setTools([
      ...FLAVORS.map((f, i) => ({ id: f.id, icon: f.icon, label: f.label, active: i === 0 })),
      { id: 'cherry', icon: '🍒', label: 'さくらんぼ' },
    ]);
    ctx.setHint('画面をタッチしてシロップをかけよう');
  },

  layout(ctx) {
    const { W, H } = ctx;
    const d = ctx.data;
    d.R = Math.min(W, H) * 0.21;
    d.cx = W / 2;
    d.bowlY = Math.min(H * 0.72, H - 26);
    d.cy = d.bowlY - d.R * 0.72;
    const s = ctx.sim;
    // 氷ドーム
    s.colliders.push({ kind: 'circle', x: d.cx, y: d.cy, r: d.R });
    // 器 (すり鉢型)
    const bw = d.R * 1.5;
    s.colliders.push(
      { kind: 'capsule', ax: d.cx - bw, ay: d.bowlY - 10, bx: d.cx - d.R * 0.55, by: d.bowlY + 3, r: 1.4 },
      { kind: 'capsule', ax: d.cx + bw, ay: d.bowlY - 10, bx: d.cx + d.R * 0.55, by: d.bowlY + 3, r: 1.4 },
      { kind: 'capsule', ax: d.cx - d.R * 0.55, ay: d.bowlY + 3, bx: d.cx + d.R * 0.55, by: d.bowlY + 3, r: 1.4 },
    );
    if (!d.stain) d.stain = new StainMap(d.R * 2 + 10, d.R * 2 + 10, 3);
  },

  update(ctx, dt) {
    const d = ctx.data, s = ctx.sim, p = ctx.primary;
    const pouring = !!p && p.y < d.bowlY + 8;
    if (pouring) {
      d.pourer.phase = d.flavor;
      d.pourer.update(ctx, dt, true, p.x, p.y - 4, 0, 1, 2.2);
      d.used.add(d.flavor);
    } else {
      d.pourer.update(ctx, dt, false, 0, 0);
    }

    // シロップの吸収 → 染み
    d.stainT += dt;
    const R2 = (d.R + 1.4) ** 2;
    for (let i = s.n - 1; i >= 0; i--) {
      const dx = s.x[i] - d.cx, dy = s.y[i] - d.cy;
      const dd = dx * dx + dy * dy;
      if (dd < R2 && s.age[i] > 0.1 && Math.random() < dt * 2.6) {
        const dist = Math.sqrt(dd) || 1;
        const px = d.cx + dx / dist * Math.min(dist, d.R - 0.5);
        const py = d.cy + dy / dist * Math.min(dist, d.R - 0.5);
        d.stain.stamp(px - (d.cx - d.R - 5), py - (d.cy - d.R - 5), rand(2.2, 3.6),
          css([s.cr[i], s.cg[i], s.cb[i]], 0.5));
        // カバレッジ (角度ビン)
        const ang = Math.atan2(dy, dx);
        d.coverage.add(Math.floor((ang + Math.PI) / TAU * d.bins));
        s.kill(i);
        if (d.stainT > 0.12) { d.stainT = 0; ctx.backDirty(); }
      }
    }
    const cov = clamp(d.coverage.size / (d.bins * 0.82), 0, 1);
    ctx.progress(cov);
    if (!d.rainbowShown && d.used.size >= 4 && cov > 0.5) {
      d.rainbowShown = true;
      ctx.toast('🌈 レインボーかき氷だ!すごい!', 2600);
      for (let i = 0; i < 14; i++) ctx.fx.addSpark(d.cx + rand(-d.R, d.R), d.cy + rand(-d.R, d.R * 0.4), '#fff');
      ctx.sfx.chime();
    }
    // さくらんぼが山頂に乗ったら
    for (const so of s.solids) {
      if (!so.data.cheered && Math.abs(so.vx) + Math.abs(so.vy) < 6 &&
          so.y < d.cy - d.R * 0.5 && Math.abs(so.x - d.cx) < d.R * 0.5) {
        so.data.cheered = true;
        ctx.toast('🍒 ベストポジション!');
        ctx.sfx.clink();
        for (let i = 0; i < 8; i++) ctx.fx.addSpark(so.x + rand(-4, 4), so.y + rand(-4, 4));
      }
    }
  },

  onTool(ctx, id) {
    const d = ctx.data;
    const fi = FLAVORS.findIndex((f) => f.id === id);
    if (fi >= 0) {
      d.flavor = fi;
      ctx.setToolActive(id);
      ctx.toast(FLAVORS[fi].label + 'シロップ!');
      return;
    }
    if (id === 'cherry' && ctx.sim.solids.length < 4) {
      const so = ctx.sim.addSolid({
        x: d.cx + rand(-d.R * 0.5, d.R * 0.5), y: d.cy - d.R - 20,
        r: 2.4, density: 1.15, drag: 2,
      });
      so.hitWall = () => ctx.sfx.pop(1.6);
      ctx.toast('🍒 さくらんぼトッピング!');
    }
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    // 涼しげな背景
    g.fillStyle = vgrad(g, 0, H, [[0, '#cfeef8'], [0.55, '#eaf8ff'], [1, '#bde3f0']]);
    g.fillRect(0, 0, W, H);
    // のれん風の飾り
    g.fillStyle = 'rgba(80,160,220,0.25)';
    for (let x = 0; x < W; x += 14) {
      g.beginPath();
      g.moveTo(x, 0); g.lineTo(x + 7, 0);
      g.lineTo(x + 7, 7); g.arc(x + 3.5, 7, 3.5, 0, Math.PI);
      g.closePath(); g.fill();
    }
    // テーブル
    g.fillStyle = vgrad(g, d.bowlY + 2, H, [[0, '#8fd0e2'], [1, '#5fb2ca']]);
    g.fillRect(0, d.bowlY + 2, W, H);
    softShadow(g, d.cx, d.bowlY + 6, d.R * 1.7, 3.5, 0.15);
    // 器 (奥側)
    g.fillStyle = 'rgba(180,225,245,0.9)';
    g.beginPath();
    g.moveTo(d.cx - d.R * 1.55, d.bowlY - 11);
    g.quadraticCurveTo(d.cx, d.bowlY + 9, d.cx + d.R * 1.55, d.bowlY - 11);
    g.lineTo(d.cx + d.R * 1.62, d.bowlY - 9);
    g.quadraticCurveTo(d.cx, d.bowlY + 11.5, d.cx - d.R * 1.62, d.bowlY - 9);
    g.closePath();
    g.fill();
    // 器の脚
    g.fillStyle = '#9fd4e8';
    rr(g, d.cx - 4, d.bowlY + 6, 8, 6, 2); g.fill();
    rr(g, d.cx - 9, d.bowlY + 11, 18, 3, 1.5); g.fill();
    // 氷ドーム
    const grd = g.createRadialGradient(d.cx - d.R * 0.3, d.cy - d.R * 0.4, d.R * 0.2, d.cx, d.cy, d.R * 1.05);
    grd.addColorStop(0, '#ffffff');
    grd.addColorStop(1, '#dceef8');
    g.fillStyle = grd;
    g.beginPath(); g.arc(d.cx, d.cy, d.R, 0, TAU); g.fill();
    // 氷の粒感
    g.fillStyle = 'rgba(190,220,240,0.55)';
    for (const [ux, uy, ur] of d.speckles) {
      const px = d.cx + ux * d.R * 0.92, py = d.cy + uy * d.R * 0.92;
      if (ux * ux + uy * uy < 0.94) { g.beginPath(); g.arc(px, py, ur, 0, TAU); g.fill(); }
    }
    // 染み(シロップ)
    g.save();
    g.beginPath(); g.arc(d.cx, d.cy, d.R - 0.3, 0, TAU); g.clip();
    d.stain.drawTo(g, d.cx - d.R - 5, d.cy - d.R - 5);
    g.restore();
    // 旗
    g.strokeStyle = '#b5743a'; g.lineWidth = 0.8;
    g.beginPath(); g.moveTo(d.cx, d.cy - d.R + 2); g.lineTo(d.cx + 6, d.cy - d.R - 14); g.stroke();
    g.fillStyle = '#ff5f6d';
    g.beginPath();
    g.moveTo(d.cx + 6, d.cy - d.R - 14);
    g.lineTo(d.cx + 20, d.cy - d.R - 11);
    g.lineTo(d.cx + 6, d.cy - d.R - 7);
    g.closePath(); g.fill();
    g.fillStyle = '#fff';
    g.font = 'bold 4px sans-serif';
    g.fillText('氷', d.cx + 9, d.cy - d.R - 9.5);
  },

  drawFront(ctx, g) {
    const d = ctx.data, p = ctx.primary;
    // さくらんぼ
    for (const so of ctx.sim.solids) {
      g.save();
      g.translate(so.x, so.y);
      g.strokeStyle = '#7a4a2a'; g.lineWidth = 0.6;
      g.beginPath(); g.moveTo(0, -so.r + 0.5); g.quadraticCurveTo(2, -so.r - 4, 0.5, -so.r - 6); g.stroke();
      g.fillStyle = '#d1173f';
      g.beginPath(); g.arc(0, 0, so.r, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.5)';
      g.beginPath(); g.arc(-so.r * 0.35, -so.r * 0.35, so.r * 0.3, 0, TAU); g.fill();
      g.restore();
    }
    // 器 (手前ガラス)
    g.fillStyle = 'rgba(210,240,255,0.35)';
    g.beginPath();
    g.moveTo(d.cx - d.R * 1.55, d.bowlY - 11);
    g.quadraticCurveTo(d.cx, d.bowlY + 9, d.cx + d.R * 1.55, d.bowlY - 11);
    g.lineTo(d.cx + d.R * 1.45, d.bowlY - 10);
    g.quadraticCurveTo(d.cx, d.bowlY + 6, d.cx - d.R * 1.45, d.bowlY - 10);
    g.closePath(); g.fill();
    // ボトル
    if (p && p.y < d.bowlY + 8) {
      drawSyrupBottle(g, p.x, p.y - 12, Math.sin(ctx.t * 6) * 0.06, FLAVORS[d.flavor].bottle);
    }
  },
};
