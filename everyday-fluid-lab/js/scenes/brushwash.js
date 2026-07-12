// シーン: 絵の具の筆あらい (にごりの観察)
import { TAU, rand, clamp, pick } from '../engine/utils.js';
import { rr, vgrad, softShadow } from '../engine/art.js';

const PAINTS = [
  [0.9, 0.2, 0.25], [0.2, 0.4, 0.9], [0.95, 0.75, 0.15], [0.3, 0.75, 0.4], [0.7, 0.35, 0.85],
];

export default {
  id: 'brushwash',
  name: 'えのぐの筆あらい',
  emoji: '🖌️',
  desc: 'ゆすぐほど 水がにごっていく',
  goal: '🎯 筆を3本 きれいに洗おう (にごったら 水をかえて!)',
  clearMsg: 'おかたづけ かんぺき!',
  maxParticles: 2800,
  view: { shine: 1.2, refract: 0.9 },

  init(ctx) {
    const d = ctx.data;
    d.cleaned = 0;
    d.paint = 1;
    d.color = pick(PAINTS);
    d.changes = 0;
    ctx.sim.definePhase(0, { // 水 (顔料とまざる)
      sigma: 3, beta: 1.5, grav: 1, mix: 2.8, group: 1,
      color: [0.75, 0.85, 0.92], alpha: 0.4,
    });
    ctx.setTools([{ id: 'change', icon: '🚰', label: '水をかえる' }]);
    ctx.setHint('筆を水の中で ふりふり!にごった水では おちにくいよ');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.cx = W / 2;
    d.gw = Math.min(W * 0.56, 62);
    d.bottom = Math.min(H - 16, H * 0.9);
    d.top = d.bottom - Math.min(H * 0.42, 72);
    ctx.addCup(d.cx, d.top, d.bottom, d.gw, 2);
    // 筆先の可動コライダー
    d.brushCol = { kind: 'circle', x: -100, y: -100, r: 2.4, vx: 0, vy: 0, off: true, noSolid: true };
    ctx.sim.colliders.push(d.brushCol);
    if (!d.filled) {
      d.filled = true;
      this._refill(ctx);
    }
  },

  _refill(ctx) {
    const d = ctx.data, s = ctx.sim;
    // 既存の水を捨てて新しい水
    for (let i = s.n - 1; i >= 0; i--) s.kill(i);
    ctx.fill(d.cx - d.gw / 2 + 2, d.top + (d.bottom - d.top) * 0.3, d.cx + d.gw / 2 - 2, d.bottom - 2, 0);
  },

  update(ctx, dt) {
    const d = ctx.data, s = ctx.sim, p = ctx.primary;
    // 筆の追従
    if (p) {
      const c = d.brushCol;
      c.off = false;
      c.vx = clamp((p.x - c.x) / Math.max(dt, 1e-3), -260, 260);
      c.vy = clamp((p.y - c.y) / Math.max(dt, 1e-3), -260, 260);
      c.x = p.x; c.y = p.y + 6;
      const speed = Math.hypot(c.vx, c.vy);
      const inWater = s.densityAt(c.x, c.y) > 0.4;
      if (inWater && speed > 26 && d.paint > 0) {
        // 水のきれいさで落ちやすさが変わる (にごり観察の核)
        const clarity = 1 - (d.turbidity ?? 0);
        const rate = dt * 0.36 * (0.25 + clarity * 0.75) * Math.min(2, speed / 120);
        d.paint = Math.max(0, d.paint - rate);
        // 顔料がにじみ出て水を染める
        s.forEachInCircle(c.x, c.y, 7, (i) => {
          s.cr[i] += (d.color[0] - s.cr[i]) * dt * 2.2;
          s.cg[i] += (d.color[1] - s.cg[i]) * dt * 2.2;
          s.cb[i] += (d.color[2] - s.cb[i]) * dt * 2.2;
          s.ca[i] = Math.min(0.85, s.ca[i] + dt * 0.4);
        });
        if (Math.random() < dt * 5) ctx.sfx.splash(0.25);
        if (d.paint <= 0) {
          d.cleaned++;
          ctx.sfx.chime();
          if (d.cleaned >= 3) {
            ctx.progress(1);
          } else {
            d.color = pick(PAINTS.filter((c2) => c2 !== d.color));
            d.paint = 1;
            ctx.toast(`✨ ${d.cleaned}本目 ピカピカ!つぎの筆いくよ`);
          }
        }
      }
    } else { d.brushCol.off = true; d.brushCol.x = -100; }

    // にごり = 水の平均彩度
    let sat = 0, n2 = 0;
    for (let i = 0; i < s.n; i += 4) {
      const mx = Math.max(s.cr[i], s.cg[i], s.cb[i]);
      const mn = Math.min(s.cr[i], s.cg[i], s.cb[i]);
      sat += mx - mn; n2++;
    }
    d.turbidity = n2 ? clamp(sat / n2 * 3.2, 0, 1) : 0;

    if (!ctx._cleared) {
      ctx.progress(Math.min(0.97, (d.cleaned + (1 - d.paint)) / 3));
    }
  },

  onTool(ctx, id) {
    if (id !== 'change') return;
    const d = ctx.data;
    d.changes++;
    this._refill(ctx);
    ctx.sfx.splash(0.7);
    ctx.toast('🚰 ジャー…きれいな水に交換! (よく落ちるようになった)');
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    g.fillStyle = vgrad(g, 0, H, [[0, '#fdf6e8'], [1, '#f2e8d2']]);
    g.fillRect(0, 0, W, H);
    // 絵とパレット
    g.fillStyle = '#fff';
    rr(g, W * 0.06, 14, Math.min(34, W * 0.3), 26, 2);
    g.fill();
    g.strokeStyle = '#c8b898';
    g.lineWidth = 1;
    rr(g, W * 0.06, 14, Math.min(34, W * 0.3), 26, 2);
    g.stroke();
    // 子どもの絵 (にじ)
    for (let k = 0; k < 4; k++) {
      g.strokeStyle = ['#e85a5a', '#e8a83a', '#5aa84a', '#4a7ae8'][k];
      g.lineWidth = 1.6;
      g.beginPath();
      g.arc(W * 0.06 + 17, 40, 14 - k * 2.2, Math.PI * 1.1, Math.PI * 1.9);
      g.stroke();
    }
    g.fillStyle = '#d8cdb8';
    g.fillRect(0, d.bottom + 4, W, H - d.bottom);
    // バケツ
    softShadow(g, d.cx, d.bottom + 4, d.gw * 0.8, 3, 0.16);
    g.fillStyle = vgrad(g, d.top - 3, d.bottom + 4, [[0, '#8898a8'], [1, '#68788a']]);
    g.beginPath();
    g.moveTo(d.cx - d.gw / 2 - 4, d.top - 3);
    g.lineTo(d.cx - d.gw / 2, d.bottom + 4);
    g.lineTo(d.cx + d.gw / 2, d.bottom + 4);
    g.lineTo(d.cx + d.gw / 2 + 4, d.top - 3);
    g.closePath();
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.25)';
    rr(g, d.cx - d.gw / 2 + 2, d.top, 3.5, d.bottom - d.top, 1.5);
    g.fill();
  },

  drawFront(ctx, g) {
    const d = ctx.data, p = ctx.primary;
    // 筆
    if (p) {
      g.save();
      g.translate(p.x, p.y);
      g.rotate(0.25 + clamp((p.vx || 0) * 0.0012, -0.3, 0.3));
      g.fillStyle = '#c89858';
      rr(g, -1.2, -24, 2.4, 18, 1.2);
      g.fill();
      g.fillStyle = '#b8bcc8';
      rr(g, -1.5, -7, 3, 3.5, 0.8);
      g.fill();
      // 穂先 (残ってる絵の具の色)
      const pc = d.color;
      const mixT = 1 - d.paint;
      g.fillStyle = `rgb(${(pc[0] * (1 - mixT) + 0.55 * mixT) * 255},${(pc[1] * (1 - mixT) + 0.5 * mixT) * 255},${(pc[2] * (1 - mixT) + 0.5 * mixT) * 255})`;
      g.beginPath();
      g.moveTo(-1.6, -4);
      g.quadraticCurveTo(-1.4, 4, 0, 6.5);
      g.quadraticCurveTo(1.4, 4, 1.6, -4);
      g.closePath();
      g.fill();
      g.restore();
    }
    // メーター: のこり絵の具 & にごり
    g.fillStyle = 'rgba(255,255,255,0.94)';
    rr(g, ctx.W - 42, 16, 40, 18, 3);
    g.fill();
    g.fillStyle = '#556';
    g.font = 'bold 2.8px sans-serif';
    g.fillText(`筆 ${d.cleaned}/3 きれい`, ctx.W - 39, 21);
    g.fillStyle = '#ccc';
    rr(g, ctx.W - 39, 23, 34, 3, 1.5);
    g.fill();
    g.fillStyle = `rgb(${d.color[0] * 255},${d.color[1] * 255},${d.color[2] * 255})`;
    rr(g, ctx.W - 39, 23, Math.max(0.01, 34 * d.paint), 3, 1.5);
    g.fill();
    g.fillStyle = '#889';
    g.font = '2.4px sans-serif';
    g.fillText(`にごり ${((d.turbidity ?? 0) * 100) | 0}%`, ctx.W - 39, 31.5);
  },
};
