// シーン: ホットケーキにはちみつをかける
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, softShadow, vgrad, woodTable } from '../engine/art.js';
import { Pourer, drawSyrupBottle } from './common.js';

const SAUCES = [
  { id: 'honey', label: 'はちみつ', icon: '🍯', color: [0.95, 0.68, 0.12], alpha: 0.85, sigma: 55, beta: 7, bottle: '#f0ad2a' },
  { id: 'choco', label: 'チョコ', icon: '🍫', color: [0.32, 0.18, 0.10], alpha: 0.96, sigma: 65, beta: 8, bottle: '#5a3620' },
  { id: 'berry', label: 'いちごソース', icon: '🍓', color: [0.88, 0.22, 0.35], alpha: 0.9, sigma: 30, beta: 4, bottle: '#e0385a' },
];

export default {
  id: 'pancake',
  name: 'ホットケーキにはちみつ',
  emoji: '🥞',
  desc: 'とろ〜り はちみつが たれる',
  goal: '🎯 ホットケーキの上をソースでいっぱいに!',
  clearMsg: 'おいしそう!いただきます!',
  maxParticles: 2200,
  view: { shine: 1.5, refract: 0.7 },

  init(ctx) {
    const d = ctx.data;
    d.sauce = 0;
    d.pourer = new Pourer(42, 40);
    d.steamT = 0;
    SAUCES.forEach((sc, i) => {
      ctx.sim.definePhase(i, {
        sigma: sc.sigma, beta: sc.beta, grav: 1.15, mix: 0.4, group: 7,
        color: sc.color, alpha: sc.alpha,
      });
    });
    // バター (溶けて液体になる)
    ctx.sim.definePhase(3, {
      sigma: 20, beta: 3, grav: 1.0, mix: 0.5, group: 7,
      color: [1.0, 0.86, 0.45], alpha: 0.8,
    });
    ctx.setTools([
      ...SAUCES.map((s, i) => ({ id: s.id, icon: s.icon, label: s.label, active: i === 0 })),
      { id: 'butter', icon: '🧈', label: 'バター' },
    ]);
    ctx.setHint('タッチしてソースをかけよう。バターはアツアツでとろけるよ');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data, s = ctx.sim;
    d.cx = W / 2;
    d.pw = Math.min(W * 0.62, 70) / 2;   // パンケーキ半幅
    d.top = Math.min(H * 0.56, H - 52);
    d.thick = 8;
    d.plateY = d.top + d.thick * 3 + 2;
    // 3段のパンケーキ (カプセル)
    d.cakes = [];
    for (let i = 0; i < 3; i++) {
      const y = d.top + d.thick / 2 + i * d.thick;
      const shrink = i === 0 ? 4 : (i === 1 ? 1.5 : 0);
      const c = { kind: 'capsule', ax: d.cx - d.pw + shrink, ay: y, bx: d.cx + d.pw - shrink, by: y, r: d.thick / 2 };
      d.cakes.push(c);
      s.colliders.push(c);
    }
    // お皿
    s.colliders.push({ kind: 'capsule', ax: d.cx - d.pw - 14, ay: d.plateY, bx: d.cx + d.pw + 14, by: d.plateY, r: 1.6 });
  },

  update(ctx, dt) {
    const d = ctx.data, s = ctx.sim, p = ctx.primary;
    const pouring = !!p && p.y < d.plateY;
    d.pourer.phase = d.sauce;
    d.pourer.update(ctx, dt, pouring, p ? p.x : 0, p ? p.y - 4 : 0, 0, 1, 1.8);

    // バターが熱で溶ける
    for (let i = s.solids.length - 1; i >= 0; i--) {
      const so = s.solids[i];
      const onCake = so.y < d.top + 2 && Math.abs(so.x - d.cx) < d.pw + 4 && Math.abs(so.vy) < 8;
      if (onCake) {
        so.r -= dt * 0.55;
        if (Math.random() < dt * 14 && s.n < s.max - 2) {
          s.emit(so.x + rand(-so.r, so.r), so.y + so.r * 0.6, rand(-4, 4), 6, 3);
        }
        if (Math.random() < dt * 3) ctx.fx.addSteam(so.x, so.y - 4, 2.5);
        if (so.r < 1.0) { s.solids.splice(i, 1); ctx.toast('🧈 とろけた〜'); }
      }
    }
    // 湯気
    d.steamT += dt;
    if (d.steamT > 0.5) {
      d.steamT = 0;
      ctx.fx.addSteam(d.cx + rand(-d.pw * 0.7, d.pw * 0.7), d.top - 4, rand(2.5, 4));
    }
    // カバレッジ: 一番上の表面をサンプル
    let hit = 0;
    const SAMPLES = 15;
    for (let k = 0; k < SAMPLES; k++) {
      const x = d.cx - d.pw + 6 + (d.pw * 2 - 12) * k / (SAMPLES - 1);
      if (s.densityAt(x, d.top - d.thick * 0.5 - 1.2) > 0.5) hit++;
    }
    ctx.progress(hit / SAMPLES / 0.92);
  },

  onTool(ctx, id) {
    const d = ctx.data;
    const si = SAUCES.findIndex((sc) => sc.id === id);
    if (si >= 0) {
      d.sauce = si;
      ctx.setToolActive(id);
      ctx.toast(SAUCES[si].label + '!');
      return;
    }
    if (id === 'butter' && ctx.sim.solids.length < 3) {
      ctx.sim.addSolid({ x: d.cx + rand(-10, 10), y: d.top - 40, r: 3.2, density: 1.4, drag: 1.5 });
      ctx.sfx.pop(0.9);
    }
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    g.fillStyle = vgrad(g, 0, H, [[0, '#fff3dd'], [1, '#ffe3c2']]);
    g.fillRect(0, 0, W, H);
    // 水玉模様
    g.fillStyle = 'rgba(255,190,130,0.25)';
    for (let y = 6; y < H; y += 16) for (let x = (y % 32) ? 8 : 16; x < W; x += 16) {
      g.beginPath(); g.arc(x, y, 2.4, 0, TAU); g.fill();
    }
    woodTable(g, W, d.plateY + 3, H, 1);
    // お皿
    softShadow(g, d.cx, d.plateY + 3.5, d.pw + 18, 3, 0.14);
    g.fillStyle = '#fdfdfd';
    g.beginPath();
    g.ellipse(d.cx, d.plateY, d.pw + 16, 4.5, 0, 0, TAU);
    g.fill();
    g.strokeStyle = '#e3e3ee'; g.lineWidth = 0.7;
    g.beginPath();
    g.ellipse(d.cx, d.plateY - 0.5, d.pw + 12, 3.2, 0, 0, TAU);
    g.stroke();
    // パンケーキ 3段
    for (let i = 2; i >= 0; i--) {
      const c = d.cakes[i];
      const grd = g.createLinearGradient(0, c.ay - c.r, 0, c.ay + c.r);
      grd.addColorStop(0, i === 0 ? '#f3b95f' : '#eaa94e');
      grd.addColorStop(0.5, '#d98e35');
      grd.addColorStop(1, '#c47d2c');
      g.fillStyle = grd;
      rr(g, c.ax - c.r, c.ay - c.r, (c.bx - c.ax) + c.r * 2, c.r * 2, c.r);
      g.fill();
      // 焼き色
      g.fillStyle = 'rgba(196,110,40,0.35)';
      g.beginPath();
      g.ellipse((c.ax + c.bx) / 2, c.ay - c.r * 0.1, (c.bx - c.ax) * 0.42, c.r * 0.55, 0, 0, TAU);
      g.fill();
    }
    // 一番上のハイライト
    const t = d.cakes[0];
    g.fillStyle = 'rgba(255,230,170,0.5)';
    g.beginPath();
    g.ellipse((t.ax + t.bx) / 2, t.ay - t.r * 0.55, (t.bx - t.ax) * 0.4, t.r * 0.32, 0, 0, TAU);
    g.fill();
  },

  drawFront(ctx, g) {
    const d = ctx.data, p = ctx.primary;
    // バター
    for (const so of ctx.sim.solids) {
      g.save();
      g.translate(so.x, so.y);
      g.rotate(so.angle * 0.2);
      g.fillStyle = '#ffe08a';
      rr(g, -so.r, -so.r * 0.8, so.r * 2, so.r * 1.6, 0.8);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.5)';
      rr(g, -so.r * 0.7, -so.r * 0.6, so.r * 1.4, so.r * 0.4, 0.5);
      g.fill();
      g.restore();
    }
    if (p && p.y < d.plateY) {
      drawSyrupBottle(g, p.x, p.y - 12, Math.sin(ctx.t * 5) * 0.05, SAUCES[d.sauce].bottle);
    }
  },
};
