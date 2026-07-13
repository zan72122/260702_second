// シーン: 氷がとけるのを観察 (冷たい水は沈む!)
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad, woodTable, softShadow, glassShine } from '../engine/art.js';
import { Pourer } from './common.js';

export default {
  id: 'icemelt',
  name: '氷がとける観察',
  emoji: '🧊',
  desc: 'とけた冷たい水が しずんでいく',
  goal: '🎯 冷たい水の「たきくだり」を見つけて、氷をぜんぶとかそう!',
  clearMsg: '対流のかんさつ、だいせいこう!',
  maxParticles: 2600,
  view: { shine: 1.4, refract: 1.4 },

  init(ctx) {
    const d = ctx.data;
    d.plumeSeen = false;
    d.pourer = new Pourer(70, 45);
    ctx.sim.definePhase(0, { // ぬるま湯 (ほんのり赤)
      sigma: 3, beta: 1.5, grav: 1.0, mix: 1.2, group: 1,
      color: [0.85, 0.62, 0.55], alpha: 0.4,
    });
    ctx.sim.definePhase(1, { // 冷たいとけ水 (青) — わずかに重い
      sigma: 3.5, beta: 1.5, grav: 1.07, mix: 1.2, group: 1,
      color: [0.4, 0.65, 0.95], alpha: 0.5,
    });
    ctx.setTools([
      { id: 'ice', icon: '🧊', label: '氷を入れる' },
      { id: 'warm', icon: '🫖', label: 'ぬるま湯をたす' },
    ]);
    ctx.setHint('氷のまわりの青い水が どう動くか よーく見てて!');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.cx = W / 2;
    d.gw = Math.min(W * 0.52, 58);
    d.bottom = Math.min(H - 16, H * 0.9);
    d.top = d.bottom - Math.min(H * 0.5, 88);
    ctx.addCup(d.cx, d.top, d.bottom, d.gw, 2);
    if (!d.filled) {
      d.filled = true;
      ctx.fill(d.cx - d.gw / 2 + 2, d.top + (d.bottom - d.top) * 0.3, d.cx + d.gw / 2 - 2, d.bottom - 2, 0);
      this._addIce(ctx, 2);
    }
  },

  _addIce(ctx, n = 1) {
    const d = ctx.data;
    for (let k = 0; k < n; k++) {
      const so = ctx.sim.addSolid({
        x: d.cx + rand(-d.gw * 0.25, d.gw * 0.25),
        y: d.top + 4,
        r: rand(4, 5), density: 0.55, drag: 4,
      });
      so.data.ice = true;
      so.hitWall = (v) => { if (v > 25) ctx.sfx.clink(); };
    }
  },

  update(ctx, dt) {
    const d = ctx.data, s = ctx.sim, p = ctx.primary;
    // ぬるま湯をたす
    const pouring = d.warming && !!p && p.y < d.bottom;
    d.pourer.phase = 0;
    d.pourer.update(ctx, dt, pouring, p ? p.x : 0, p ? Math.min(p.y, d.top - 5) : 0, 0, 1, 2);
    ctx.sfx.setPour(pouring ? 0.4 : 0);

    // 氷: とけて冷たい水を出す
    let iceCount = 0;
    for (let k = s.solids.length - 1; k >= 0; k--) {
      const so = s.solids[k];
      if (!so.data.ice) continue;
      iceCount++;
      if (so.wet > 0.25) {
        so.r -= dt * 0.22;
        // とけ水 (冷・青) がにじみ出て沈んでいく
        if (Math.random() < dt * 16 && s.n < s.max - 2) {
          s.emit(so.x + rand(-so.r, so.r), so.y + so.r * 0.7, rand(-3, 3), 6, 1);
        }
      }
      if (so.r < 1.2) {
        s.solids.splice(k, 1);
        ctx.sfx.drip();
        ctx.toast('🧊 ひとつ とけきった!');
      }
    }
    d.iceCount = iceCount;

    // 「冷たい水の下降流」の観察判定: 下 1/3 に青が届いた
    if (!d.plumeSeen) {
      let deepCold = 0;
      const yLim = d.bottom - (d.bottom - d.top) * 0.25;
      for (let i = 0; i < s.n; i++) {
        if (s.phase[i] === 1 && s.y[i] > yLim && s.cb[i] > 0.7) deepCold++;
      }
      if (deepCold > 25) {
        d.plumeSeen = true;
        ctx.toast('🔍 冷たい水が底までしずんだ!(対流)');
        ctx.sfx.chime();
      }
    }
    // 平均水温 (青み) メーター
    let blue = 0;
    for (let i = 0; i < s.n; i += 3) blue += s.cb[i] > s.cr[i] ? 1 : 0;
    d.tempFrac = s.n ? 1 - blue / Math.ceil(s.n / 3) : 1;

    ctx.progress((d.plumeSeen ? 0.5 : 0.15) + (iceCount === 0 && d.filled ? 0.5 : clamp(0.3 - iceCount * 0.15, 0, 0.3)));
  },

  onTool(ctx, id) {
    const d = ctx.data;
    if (id === 'ice') {
      if (ctx.sim.solids.length < 4) {
        this._addIce(ctx, 1);
        ctx.sfx.splash(0.4);
        d.warming = false;
      }
      return;
    }
    if (id === 'warm') {
      d.warming = !d.warming;
      ctx.toast(d.warming ? '🫖 タッチでぬるま湯をそそぐ (とけるのが早くなる)' : 'ストップ');
    }
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    g.fillStyle = vgrad(g, 0, H, [[0, '#e8f2f4'], [1, '#d2e4e8']]);
    g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,0.9)';
    rr(g, 4, 16, Math.min(44, W * 0.4), 24, 3);
    g.fill();
    g.fillStyle = '#38708a';
    g.font = 'bold 3.2px sans-serif';
    g.fillText('たいりゅう観察', 7, 22);
    g.font = '2.6px sans-serif';
    g.fillText('冷たい水は重いので', 7, 27);
    g.fillText('下にしずんで', 7, 31);
    g.fillText('ぐるぐる回るよ', 7, 35);
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
  },

  drawFront(ctx, g) {
    const d = ctx.data, p = ctx.primary;
    // 氷
    for (const so of ctx.sim.solids) {
      if (!so.data.ice) continue;
      g.save();
      g.translate(so.x, so.y);
      g.rotate(so.angle * 0.3);
      g.fillStyle = 'rgba(235,248,255,0.8)';
      rr(g, -so.r * 0.9, -so.r * 0.9, so.r * 1.8, so.r * 1.8, 1.6);
      g.fill();
      g.strokeStyle = 'rgba(160,200,230,0.8)';
      g.lineWidth = 0.5;
      rr(g, -so.r * 0.9, -so.r * 0.9, so.r * 1.8, so.r * 1.8, 1.6);
      g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.75)';
      rr(g, -so.r * 0.5, -so.r * 0.55, so.r * 0.45, so.r * 0.8, 0.6);
      g.fill();
      g.restore();
    }
    // 水温計
    g.fillStyle = 'rgba(255,255,255,0.92)';
    rr(g, ctx.W - 30, 16, 28, 12, 3);
    g.fill();
    const t = 8 + (d.tempFrac ?? 1) * 20;
    g.fillStyle = t > 20 ? '#e86a3a' : '#4a8ae8';
    g.font = 'bold 4.6px sans-serif';
    g.fillText(`${t.toFixed(0)}℃`, ctx.W - 26, 24.5);
    // ぬるま湯ポット
    if (d.warming && p && p.y < d.bottom) {
      g.save();
      g.translate(p.x + 6, Math.min(p.y, d.top - 5) - 7);
      g.rotate(-0.45);
      g.fillStyle = '#e8564a';
      rr(g, -7, -8, 14, 12, 3);
      g.fill();
      g.beginPath();
      g.moveTo(-7, -5); g.lineTo(-12, -1); g.lineTo(-11, 1.5); g.lineTo(-6.5, -2);
      g.closePath(); g.fill();
      g.restore();
    }
  },
};
