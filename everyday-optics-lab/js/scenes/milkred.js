// シーン: コップの中の夕焼け (牛乳水のチンダル散乱 — おうちでできる夕焼け)
// 透過光 T=exp(−β·λ⁻⁴·L) を波長計算。横からは青白く、抜けた光は赤く
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad, woodTable, softShadow, glassShine } from '../engine/art.js';
import { rayleighBeta, gamma } from '../engine/spectrum.js';
import { drawFlashlight } from './common.js';

export default {
  id: 'milkred',
  name: 'コップの中の夕焼け',
  emoji: '🥛',
  desc: '牛乳ひとたらしで 夕焼け再現',
  goal: '🎯 牛乳を1てきずつ足して 出口の光を「夕焼け色」にしよう!',
  clearMsg: '青は散らされ 赤が生きのこる — 空とおなじ!',
  spectrumN: 16,

  init(ctx) {
    const d = ctx.data;
    d.drops = 0;
    d.okT = 0;
    ctx.setTools([
      { id: 'drop', icon: '🥛', label: '牛乳を1てき' },
      { id: 'reset', icon: '🚰', label: '水をとりかえる' },
    ]);
    ctx.setHint('ライトの光が水を通りぬける間に 青い光だけ散らされていく');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.cy = Math.min(H * 0.5, H - 100);
    d.gx = W * 0.5;
    d.gw = Math.min(W * 0.52, 56);
    d.gh = Math.min(H * 0.24, 40);
    d.srcX = W * 0.5 - d.gw / 2 - 12;
    d.exitX = d.gx + d.gw / 2 + 10;
  },

  // 距離 t (0..1) 進んだ地点での透過スペクトル色と、散乱光の色
  _colors(ctx, beta) {
    const d = ctx.data;
    // 出口の透過色
    let tr = 0, tg = 0, tb = 0;
    // 散乱光 (経路の平均: β·λ⁻⁴ に比例して散らされた光)
    let sr = 0, sg = 0, sb = 0;
    for (const s of ctx.spectrum) {
      const k = rayleighBeta(s.l);
      const T = Math.exp(-beta * k);
      tr += s.rgb[0] * T; tg += s.rgb[1] * T; tb += s.rgb[2] * T;
      const sc = (1 - Math.exp(-beta * k * 0.5)) * 1.2;
      sr += s.rgb[0] * sc; sg += s.rgb[1] * sc; sb += s.rgb[2] * sc;
    }
    return { trans: [tr, tg, tb], scat: [sr, sg, sb] };
  },

  update(ctx, dt) {
    const d = ctx.data;
    d.beta = d.drops * 0.45;
    const { trans, scat } = this._colors(ctx, d.beta);
    d.trans = trans; d.scat = scat;
    d.redness = trans[0] / (trans[1] + trans[2] + 0.01);
    // 夕焼けゾーン: redness 1.1〜2.3 (足しすぎ=まっ暗)
    const bright = trans[0] + trans[1] + trans[2];
    const good = d.redness > 1.1 && d.redness < 2.6 && bright > 0.12;
    if (good) {
      d.okT += dt;
      ctx.progress(Math.min(1, d.okT / 1.6));
      if (!d.saidOk) { d.saidOk = true; ctx.toast('🌅 夕焼け色!ミニチュアの夕日だ'); }
    } else {
      d.okT = Math.max(0, d.okT - dt * 0.6);
      d.saidOk = false;
      if (!ctx._cleared) {
        ctx.progress(clamp(d.redness / 1.1 * 0.8, 0.04 * d.drops, 0.95));
      }
      if (bright <= 0.12 && !d.saidDark) {
        d.saidDark = true;
        ctx.toast('🌑 こすぎて光がとどかない…🚰でやりなおし');
      }
    }
  },

  onTool(ctx, id) {
    const d = ctx.data;
    if (id === 'drop') {
      d.drops++;
      ctx.sfx.drip();
      ctx.fx.addSpray(d.gx + rand(-5, 5), d.cy - d.gh / 2 - 2, 0, 8, 'rgba(255,255,255,0.9)', 0.8, 0.5);
      ctx.toast(`🥛 ${d.drops}てき目 (にごり β=${(d.drops * 0.45).toFixed(1)})`);
    }
    if (id === 'reset') {
      d.drops = 0;
      d.saidDark = false;
      ctx.sfx.splash(0.6);
      ctx.toast('🚰 きれいな水にとりかえた');
    }
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    g.fillStyle = vgrad(g, 0, H, [[0, '#242030'], [1, '#161320']]);
    g.fillRect(0, 0, W, H);
    woodTable(g, W, d.cy + d.gh / 2 + 6, H, 0);
    softShadow(g, d.gx, d.cy + d.gh / 2 + 6, d.gw * 0.6, 3, 0.3);
  },

  drawFront(ctx, g) {
    const { W } = ctx, d = ctx.data;
    if (!d.trans) return;
    const x0 = d.gx - d.gw / 2, x1 = d.gx + d.gw / 2;
    const y0 = d.cy - d.gh / 2, y1 = d.cy + d.gh / 2;
    // 水 (にごり)
    g.fillStyle = `rgba(235,240,248,${clamp(0.08 + d.beta * 0.06, 0, 0.55)})`;
    rr(g, x0, y0, d.gw, d.gh, 2);
    g.fill();
    // ビーム: 左→右へ、距離とともに透過色が変わる (実計算)
    g.save();
    g.globalCompositeOperation = 'lighter';
    const steps = 22;
    for (let s2 = 0; s2 < steps; s2++) {
      const t0 = s2 / steps;
      const betaHere = d.beta * t0;
      let r = 0, g2 = 0, b = 0;
      for (const s of ctx.spectrum) {
        const T = Math.exp(-betaHere * rayleighBeta(s.l));
        r += s.rgb[0] * T; g2 += s.rgb[1] * T; b += s.rgb[2] * T;
      }
      const bx0 = x0 + t0 * d.gw, bw2 = d.gw / steps + 0.3;
      const a = clamp((r + g2 + b) * 0.4, 0.03, 0.75);
      g.fillStyle = `rgba(${gamma(clamp(r, 0, 1)) * 255},${gamma(clamp(g2, 0, 1)) * 255},${gamma(clamp(b, 0, 1)) * 255},${a})`;
      rr(g, bx0, d.cy - 2.6, bw2, 5.2, 0);
      g.fill();
      // 散乱のもや (横方向): 青っぽい
      if (d.beta > 0.1) {
        const [sr, sg, sb] = d.scat;
        const mx = Math.max(sr, sg, sb, 0.01);
        g.fillStyle = `rgba(${(sr / mx) * 235},${(sg / mx) * 235},${(sb / mx) * 255},${clamp(d.beta * 0.05, 0, 0.3) * (1 - t0 * 0.4)})`;
        rr(g, bx0, y0 + 2, bw2, d.gh - 4, 0);
        g.fill();
      }
    }
    // 出口の光だまり (壁のスポット)
    const [tr, tg2, tb] = d.trans;
    const bright = tr + tg2 + tb;
    if (bright > 0.02) {
      const grad = g.createRadialGradient(d.exitX + 8, d.cy, 0, d.exitX + 8, d.cy, 12);
      grad.addColorStop(0, `rgba(${gamma(clamp(tr, 0, 1)) * 255},${gamma(clamp(tg2, 0, 1)) * 255},${gamma(clamp(tb, 0, 1)) * 255},${clamp(bright * 0.5, 0, 0.95)})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad;
      g.beginPath();
      g.arc(d.exitX + 8, d.cy, 12, 0, TAU);
      g.fill();
    }
    g.restore();
    // グラス
    g.strokeStyle = 'rgba(180,210,235,0.9)';
    g.lineWidth = 1.1;
    rr(g, x0 - 1.5, y0 - 2, d.gw + 3, d.gh + 4, 2.5);
    g.stroke();
    glassShine(g, x0 + 3, y0 + 2, 4, d.gh * 0.5);
    // ライト
    drawFlashlight(g, d.srcX, d.cy, 0, 1.2);
    // メーター
    g.fillStyle = 'rgba(255,255,255,0.92)';
    rr(g, W - 44, 16, 42, 15, 3);
    g.fill();
    g.fillStyle = '#556';
    g.font = 'bold 2.6px sans-serif';
    g.fillText(`牛乳 ${d.drops}てき`, W - 41, 20.5);
    g.fillText('夕焼け度', W - 41, 25);
    g.fillStyle = '#ddd';
    rr(g, W - 27, 22.8, 24, 2.6, 1.3);
    g.fill();
    const t = clamp((d.redness ?? 0) / 2.6, 0, 1);
    g.fillStyle = d.redness > 1.1 && d.redness < 2.6 ? '#e8783a' : '#f0c060';
    rr(g, W - 27, 22.8, Math.max(0.01, 24 * t), 2.6, 1.3);
    g.fill();
    g.fillStyle = '#889';
    g.font = '2.3px sans-serif';
    g.fillText('よこの光は青白い (チンダル)', W - 41, 29);
  },
};
