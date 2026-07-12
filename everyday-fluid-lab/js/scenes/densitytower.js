// シーン: はちみつ・水・油の3層タワー (密度の実験)
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad, woodTable, softShadow, glassShine } from '../engine/art.js';
import { Pourer } from './common.js';

const LIQUIDS = [
  { id: 'honey', label: 'はちみつ', icon: '🍯', phase: 0 },
  { id: 'water', label: 'みず', icon: '💧', phase: 1 },
  { id: 'oil', label: 'あぶら', icon: '🫒', phase: 2 },
];

export default {
  id: 'densitytower',
  name: '3層タワーの実験',
  emoji: '🗼',
  desc: 'おもさ順に かってに ならぶ!',
  goal: '🎯 3つの液体をそそいで きれいな3層をつくろう!',
  clearMsg: '密度タワーかんせい!重い順に ならんだ!',
  maxParticles: 2400,
  view: { shine: 1.4, refract: 1.1 },

  init(ctx) {
    const d = ctx.data;
    d.pick = 0;
    d.pourer = new Pourer(80, 40);
    d.sortedShown = false;
    ctx.sim.definePhase(0, { // はちみつ (いちばん重い)
      sigma: 40, beta: 5, grav: 1.5, repel: 0.7, mix: 0, group: 0,
      color: [0.93, 0.65, 0.15], alpha: 0.88,
    });
    ctx.sim.definePhase(1, { // 水 (青く着色)
      sigma: 3, beta: 1.5, grav: 1.0, repel: 0.7, mix: 0, group: 1,
      color: [0.35, 0.62, 0.95], alpha: 0.55,
    });
    ctx.sim.definePhase(2, { // 油 (いちばん軽い)
      sigma: 10, beta: 2, grav: 0.6, repel: 0.7, mix: 0, group: 2,
      color: [0.97, 0.85, 0.4], alpha: 0.5,
    });
    ctx.setTools([
      ...LIQUIDS.map((l, i) => ({ id: l.id, icon: l.icon, label: l.label, active: i === 0 })),
      { id: 'grape', icon: '🍇', label: 'ぶどうを落とす' },
    ]);
    ctx.setHint('どの順番でそそいでも 重いものが下へ。ぶどうは どこに浮くかな?');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.cx = W / 2;
    d.gw = Math.min(W * 0.4, 44);
    d.bottom = Math.min(H - 16, H * 0.9);
    d.top = d.bottom - Math.min(H * 0.55, 96);
    ctx.addCup(d.cx, d.top, d.bottom, d.gw, 1.8);
  },

  update(ctx, dt) {
    const d = ctx.data, s = ctx.sim, p = ctx.primary;
    const pouring = !!p && p.y < d.bottom;
    d.pourer.phase = LIQUIDS[d.pick].phase;
    d.pourer.update(ctx, dt, pouring, p ? clamp(p.x, d.cx - d.gw / 2 + 4, d.cx + d.gw / 2 - 4) : 0,
      p ? Math.min(p.y, d.top - 6) : 0, 0, 1, 2.5);
    ctx.sfx.setPour(pouring ? 0.5 : 0);

    // 各相の平均高さと量
    const sums = [0, 0, 0], counts = [0, 0, 0];
    for (let i = 0; i < s.n; i++) {
      const ph = s.phase[i];
      if (ph < 3) { sums[ph] += s.y[i]; counts[ph]++; }
    }
    d.counts = counts;
    const enough = counts.every((c) => c > 220);
    if (enough) {
      const avg = sums.map((v, k) => v / counts[k]);
      // 下から はちみつ > 水 > 油 (y は下ほど大きい)
      const sorted = avg[0] > avg[1] + 5 && avg[1] > avg[2] + 5;
      if (sorted) {
        d.stableT = (d.stableT || 0) + dt;
        ctx.progress(Math.min(1, d.stableT / 1.5));
        if (!d.sortedShown) {
          d.sortedShown = true;
          ctx.toast('✨ 重い順に 3層に わかれてきた!');
        }
      } else {
        d.stableT = 0;
        if (!ctx._cleared) ctx.progress(0.85);
      }
    } else if (!ctx._cleared) {
      ctx.progress(Math.min(0.8, counts.reduce((a, c) => a + Math.min(c, 220), 0) / 660 * 0.8));
    }
  },

  onTool(ctx, id) {
    const d = ctx.data;
    const li = LIQUIDS.findIndex((l) => l.id === id);
    if (li >= 0) {
      d.pick = li;
      ctx.setToolActive(id);
      ctx.toast(LIQUIDS[li].icon + ' ' + LIQUIDS[li].label + 'をそそぐ');
      return;
    }
    if (id === 'grape' && ctx.sim.solids.length < 3) {
      // ぶどう: はちみつより軽く水より重い → 真ん中の層に浮かぶ!
      const so = ctx.sim.addSolid({
        x: d.cx + rand(-8, 8), y: d.top - 15,
        r: 2.6, density: 1.2, drag: 3,
      });
      so.data.grape = true;
      ctx.toast('🍇 どの層で とまるかな?');
      ctx.sfx.pop(1.1);
    }
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    g.fillStyle = vgrad(g, 0, H, [[0, '#f2ede0'], [1, '#e2d8c2']]);
    g.fillRect(0, 0, W, H);
    // 実験メモ
    g.fillStyle = 'rgba(255,255,255,0.9)';
    rr(g, 4, 16, Math.min(42, W * 0.38), 24, 3);
    g.fill();
    g.fillStyle = '#7a5230';
    g.font = 'bold 3.2px sans-serif';
    g.fillText('みつど実験', 7, 22);
    g.font = '2.6px sans-serif';
    g.fillText('重い液体は下へ', 7, 27);
    g.fillText('はちみつ>水>油', 7, 31);
    g.fillText('の3層になるよ', 7, 35);
    woodTable(g, W, d.bottom + 5, H, 1);
    softShadow(g, d.cx, d.bottom + 5, d.gw * 0.8, 3, 0.18);
    // メスシリンダー風の目盛り
    const x0 = d.cx - d.gw / 2 - 2.6, wgl = d.gw + 5.2;
    g.fillStyle = 'rgba(210,235,250,0.16)';
    rr(g, x0, d.top - 2, wgl, d.bottom - d.top + 5, 3);
    g.fill();
    g.strokeStyle = 'rgba(180,215,240,0.7)';
    g.lineWidth = 1;
    rr(g, x0, d.top - 2, wgl, d.bottom - d.top + 5, 3);
    g.stroke();
    g.strokeStyle = 'rgba(120,150,180,0.5)';
    g.lineWidth = 0.5;
    for (let k = 1; k <= 5; k++) {
      const y = d.bottom - (d.bottom - d.top) * k / 6;
      g.beginPath(); g.moveTo(x0 + 1, y); g.lineTo(x0 + 5, y); g.stroke();
    }
    glassShine(g, x0 + 2, d.top + 6, wgl, d.bottom - d.top - 10);
  },

  drawFront(ctx, g) {
    const d = ctx.data, p = ctx.primary;
    // ぶどう
    for (const so of ctx.sim.solids) {
      const grd = g.createRadialGradient(so.x - 0.8, so.y - 0.8, 0.4, so.x, so.y, so.r);
      grd.addColorStop(0, '#a86ac8');
      grd.addColorStop(1, '#5a2a78');
      g.fillStyle = grd;
      g.beginPath(); g.arc(so.x, so.y, so.r, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.5)';
      g.beginPath(); g.arc(so.x - so.r * 0.3, so.y - so.r * 0.35, so.r * 0.25, 0, TAU); g.fill();
    }
    // 注ぎボトル
    if (p && p.y < d.bottom) {
      const cols = ['#e8a020', '#4a90d8', '#e8cf5a'];
      g.save();
      g.translate(clamp(p.x, d.cx - d.gw / 2 + 4, d.cx + d.gw / 2 - 4), Math.min(p.y, d.top - 6) - 8);
      g.rotate(0.5 + Math.sin(ctx.t * 6) * 0.05);
      g.fillStyle = cols[d.pick];
      rr(g, -4.5, -11, 9, 15, 3);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.4)';
      rr(g, -3, -10, 2, 13, 1);
      g.fill();
      g.restore();
    }
    // 量メーター
    if (d.counts) {
      g.font = 'bold 3px sans-serif';
      LIQUIDS.forEach((l, k) => {
        g.fillStyle = d.counts[k] > 220 ? '#2a9a4a' : '#99a';
        g.fillText(`${l.icon} ${d.counts[k] > 220 ? '✓' : d.counts[k]}`, ctx.W - 18, 20 + k * 5);
      });
    }
  },
};
