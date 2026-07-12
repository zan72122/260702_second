// シーン: カルピスの濃度まぜ (ちょうどいい濃さの実験)
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad, softShadow } from '../engine/art.js';
import { Pourer } from './common.js';

export default {
  id: 'calpis',
  name: 'カルピス濃度まぜ',
  emoji: '🥛',
  desc: 'うすい?こい?ちょうどいい?',
  goal: '🎯 原液1:水4 の「ちょうどいい」濃さをつくろう!',
  clearMsg: 'ゴクゴク…完ぺきな一杯!',
  maxParticles: 2800,
  view: { shine: 1.25, refract: 0.9, thresh: 0.34 },
  tilt: false,

  init(ctx) {
    const d = ctx.data;
    d.sel = 'syrup';
    d.okT = 0;
    ctx.sim.definePhase(0, { // 原液 (白くにごって重い)
      sigma: 3.2, beta: 1.6, grav: 1.06, mix: 2.6, group: 1,
      color: [0.98, 0.96, 0.9], alpha: 0.85,
    });
    ctx.sim.definePhase(1, { // 水
      sigma: 3, beta: 1.5, grav: 1, mix: 2.6, group: 1,
      color: [0.62, 0.8, 0.94], alpha: 0.38,
    });
    ctx.setTools([
      { id: 'syrup', icon: '🥛', label: '原液をそそぐ' },
      { id: 'water', icon: '🚰', label: '水をそそぐ' },
    ]);
    ctx.setToolActive('syrup');
    d.pourer = new Pourer(140, 40);
    ctx.setHint('そそいだら グラスの中を なぞって まぜまぜ。メーターを見ながら調整!');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.cx = W / 2;
    d.gw = Math.min(W * 0.4, 40);
    d.bottom = Math.min(H - 16, H * 0.88);
    d.top = d.bottom - Math.min(H * 0.42, 74);
    d.line = d.top + (d.bottom - d.top) * 0.42; // ここまで入れる線
    ctx.addCup(d.cx, d.top, d.bottom, d.gw, 2);
  },

  update(ctx, dt) {
    const d = ctx.data, s = ctx.sim, p = ctx.primary;
    // グラスの上=そそぐ / 液の中=まぜる
    let pouring = false;
    if (p) {
      const inGlass = Math.abs(p.x - d.cx) < d.gw / 2 && p.y > d.top - 2;
      const inLiquid = inGlass && s.densityAt(p.x, p.y) > 0.35;
      if (inLiquid) {
        // マドラーでまぜる
        s.impulse(p.x, p.y, 8, (p.vx || 0) * 0.35, (p.vy || 0) * 0.35);
      } else {
        pouring = true;
        d.pourer.phase = d.sel === 'syrup' ? 0 : 1;
        const px = clamp(p.x, d.cx - d.gw / 2 + 4, d.cx + d.gw / 2 - 4);
        d.pourer.update(ctx, dt, true, px, d.top - 14, 0, 1, 2.2);
      }
    }
    if (!pouring) d.pourer.update(ctx, dt, false, 0, 0);
    ctx.sfx.setPour(pouring ? 0.45 : 0);

    // グラス内の原液・水の数
    let c0 = 0, c1 = 0, top = d.bottom;
    s.forEachInCircle(d.cx, (d.top + d.bottom) / 2, d.gw + 20, (i) => {
      if (Math.abs(s.x[i] - d.cx) < d.gw / 2 + 1 && s.y[i] > d.top - 3) {
        if (s.phase[i] === 0) c0++; else c1++;
        if (s.y[i] < top) top = s.y[i];
      }
    });
    const total = c0 + c1;
    d.ratio = total > 30 ? c0 / total : 0;
    d.total = total;
    d.level = top;
    const enough = total >= 300 && top <= d.line + 4;
    const inZone = d.ratio >= 0.16 && d.ratio <= 0.26;
    if (enough && inZone) {
      d.okT += dt;
      ctx.progress(Math.min(1, d.okT / 1.5));
      if (!d.saidOk) { d.saidOk = true; ctx.toast('😋 いまが「ちょうどいい」!キープ!'); }
    } else {
      d.okT = 0;
      d.saidOk = false;
      if (!ctx._cleared) {
        const amt = Math.min(1, total / 300) * 0.5;
        const near = total > 30 ? clamp(1 - Math.abs(d.ratio - 0.21) / 0.4, 0, 1) * 0.45 : 0;
        ctx.progress(Math.min(0.97, amt + near));
      }
    }
  },

  onTool(ctx, id) {
    const d = ctx.data;
    if (id !== 'syrup' && id !== 'water') return;
    d.sel = id;
    ctx.setToolActive(id);
    ctx.toast(id === 'syrup' ? '🥛 原液モード (こくなるよ)' : '🚰 水モード (うすまるよ)');
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    g.fillStyle = vgrad(g, 0, H, [[0, '#fef6ea'], [1, '#f6e6d0']]);
    g.fillRect(0, 0, W, H);
    // 夏のテーブル
    g.fillStyle = '#e0cfae';
    g.fillRect(0, d.bottom + 4, W, H - d.bottom);
    // カルピスのびん
    const bx = W * 0.14;
    softShadow(g, bx, d.bottom + 4, 12, 2.5, 0.15);
    g.fillStyle = '#fff';
    rr(g, bx - 6, d.bottom - 32, 12, 36, 3);
    g.fill();
    g.fillStyle = '#4a78c8';
    for (let k = 0; k < 14; k++) {
      g.beginPath();
      g.arc(bx - 4.5 + (k % 5) * 2.3, d.bottom - 28 + Math.floor(k / 5) * 3 + (k % 2), 0.9, 0, TAU);
      g.fill();
    }
    g.fillStyle = '#4a78c8';
    rr(g, bx - 3, d.bottom - 37, 6, 6, 1.5);
    g.fill();
    // グラス
    softShadow(g, d.cx, d.bottom + 3, d.gw * 0.8, 2.5, 0.16);
    g.fillStyle = 'rgba(220,240,255,0.28)';
    rr(g, d.cx - d.gw / 2 - 2.5, d.top - 4, d.gw + 5, d.bottom - d.top + 7, 3);
    g.fill();
    g.strokeStyle = 'rgba(150,190,220,0.85)';
    g.lineWidth = 1;
    rr(g, d.cx - d.gw / 2 - 2.5, d.top - 4, d.gw + 5, d.bottom - d.top + 7, 3);
    g.stroke();
    // ここまで線
    g.strokeStyle = 'rgba(90,130,180,0.75)';
    g.lineWidth = 0.7;
    g.setLineDash([2, 1.6]);
    g.beginPath();
    g.moveTo(d.cx - d.gw / 2, d.line);
    g.lineTo(d.cx + d.gw / 2, d.line);
    g.stroke();
    g.setLineDash([]);
    g.fillStyle = 'rgba(90,130,180,0.85)';
    g.font = '2.6px sans-serif';
    g.fillText('ここまで', d.cx + d.gw / 2 + 2, d.line + 1);
  },

  drawFront(ctx, g) {
    const { W } = ctx, d = ctx.data;
    // 濃度メーター
    const mx = 4, my = 16, mw = 46;
    g.fillStyle = 'rgba(255,255,255,0.94)';
    rr(g, mx, my, mw, 17, 3);
    g.fill();
    g.fillStyle = '#556';
    g.font = 'bold 2.8px sans-serif';
    g.fillText('こさメーター', mx + 3, my + 4.5);
    // バー (うすい←→こい, ちょうどいいゾーン)
    const bx = mx + 3, bw = mw - 6, by = my + 6.5;
    g.fillStyle = '#e8e2d8';
    rr(g, bx, by, bw, 4, 2);
    g.fill();
    const z0 = 0.16 / 0.5, z1 = 0.26 / 0.5; // 表示レンジ 0..0.5
    g.fillStyle = 'rgba(90,190,110,0.55)';
    rr(g, bx + bw * z0, by, bw * (z1 - z0), 4, 1.5);
    g.fill();
    const rx = clamp((d.ratio ?? 0) / 0.5, 0, 1);
    g.fillStyle = '#e86a3a';
    g.beginPath();
    g.moveTo(bx + bw * rx, by + 4.6);
    g.lineTo(bx + bw * rx - 1.4, by + 7);
    g.lineTo(bx + bw * rx + 1.4, by + 7);
    g.closePath();
    g.fill();
    const st = (d.total ?? 0) < 30 ? 'まずは そそごう'
      : d.ratio < 0.16 ? 'まだ うすい…' : d.ratio > 0.26 ? 'こすぎ!水をたそう' : 'ちょうどいい!';
    g.fillStyle = d.ratio >= 0.16 && d.ratio <= 0.26 && (d.total ?? 0) >= 30 ? '#2a9a4a' : '#a86';
    g.font = 'bold 2.8px sans-serif';
    g.fillText(st, mx + 3, my + 15);
  },
};
