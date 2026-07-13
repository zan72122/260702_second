// シーン: アリの巣観察キット (砂の中にトンネルが掘られていく)
import { TAU, rand, clamp, pick } from '../engine/utils.js';
import { rr, vgrad, sun, softShadow } from '../engine/art.js';
import { SPRITES } from '../engine/grainRenderer.js';

export default {
  id: 'antfarm',
  name: 'アリの巣観察キット',
  emoji: '🐜',
  desc: 'トンネルが すこしずつ のびていく',
  goal: '🎯 アリたちにトンネルを 200つぶぶん 掘ってもらおう!',
  clearMsg: 'りっぱなアリの巣が できた!',
  maxParticles: 6500,
  tilt: false,
  rattle: 0.2,

  init(ctx) {
    const d = ctx.data;
    d.ants = [];
    d.dug = 0;
    d.food = [];
    ctx.sim.defineMaterial(0, { // 観察キットの砂
      r: 0.68, rJit: 0.07, mu: 1.0, interlock: 4, coh: 0.15, vmax: 50,
      sprite: SPRITES.SAND,
      colors: [[0.9, 0.78, 0.55], [0.84, 0.7, 0.46], [0.95, 0.85, 0.62]],
    });
    ctx.setTools([{ id: 'food', icon: '🍬', label: 'エサを置く' }]);
    ctx.setHint('そっと見守ろう。アリは エサの近くを めざして掘るよ');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.frameX0 = Math.max(6, W * 0.08);
    d.frameX1 = W - d.frameX0;
    // 底は画面の底 (ワールド境界) を使う — 深い砂柱の圧力でも漏れない
    d.bottom = H - 1;
    d.soilY = H - Math.min(H * 0.45, 88);
    const s = ctx.sim;
    // ケースの枠 (左右のみ)
    s.colliders.push(
      { kind: 'capsule', ax: d.frameX0, ay: d.soilY - 30, bx: d.frameX0, by: H, r: 2.2, mu: 0.4 },
      { kind: 'capsule', ax: d.frameX1, ay: d.soilY - 30, bx: d.frameX1, by: H, r: 2.2, mu: 0.4 },
    );
    if (!d.filled) {
      d.filled = true;
      ctx.fill(d.frameX0 + 2, d.soilY, d.frameX1 - 2, d.bottom - 1, 0);
      // アリたち
      for (let k = 0; k < 5; k++) {
        d.ants.push({
          x: rand(d.frameX0 + 10, d.frameX1 - 10),
          y: d.soilY - 3,
          tx: 0, ty: 0,
          state: 'surface', // surface | dig | carry
          t: rand(0, 2), legT: rand(TAU), dir: pick([-1, 1]),
          carried: 0,
        });
      }
    }
  },

  update(ctx, dt) {
    const d = ctx.data, s = ctx.sim;
    const surfaceAt = (x) => s.topAt(clamp(x, d.frameX0 + 3, d.frameX1 - 3), 2, d.soilY - 30);
    for (const a of d.ants) {
      a.legT += dt * 10;
      a.t -= dt;
      if (a.state === 'surface') {
        // 表面を歩く
        const sy = surfaceAt(a.x);
        a.y += (sy - 1.6 - a.y) * Math.min(1, dt * 8);
        a.x += a.dir * 14 * dt;
        if (a.x < d.frameX0 + 6) { a.x = d.frameX0 + 6; a.dir = 1; }
        if (a.x > d.frameX1 - 6) { a.x = d.frameX1 - 6; a.dir = -1; }
        if (a.t <= 0) {
          // 掘りはじめる: いまの砂面より下を目指す (エサがあればその近く)
          const food = d.food[0];
          const gx = clamp(food ? food.x + rand(-8, 8) : rand(d.frameX0 + 10, d.frameX1 - 10), d.frameX0 + 6, d.frameX1 - 6);
          const surf = surfaceAt(gx);
          const gy = food ? food.y + rand(-4, 4) : rand(surf + 10, d.bottom - 8);
          a.tx = gx;
          a.ty = clamp(gy, surf + 8, d.bottom - 5);
          a.state = 'dig';
          a.digT = 0;
        }
      } else if (a.state === 'dig') {
        // 目的地へ向かって掘り進む
        const dx = a.tx - a.x, dy = a.ty - a.y;
        const dd = Math.hypot(dx, dy);
        if (dd < 3) {
          a.state = 'carry';
          a.t = 0;
        } else {
          a.digT += dt;
          const sp = 7;
          a.x += dx / dd * sp * dt;
          a.y += dy / dd * sp * dt;
          // まわりの粒をどける (掘る)
          if (a.digT > 0.12) {
            a.digT = 0;
            const kills = [];
            s.forEachInCircle(a.x, a.y, 2.1, (i) => kills.push(i));
            kills.sort((x, y) => y - x);
            for (const i of kills.slice(0, 3)) { s.kill(i); a.carried++; d.dug++; }
            if (kills.length && Math.random() < 0.4) {
              ctx.fx.addDust(a.x, a.y, 1.5, '205,180,140');
            }
          }
        }
      } else if (a.state === 'carry') {
        // 表面へ運んで捨てる
        const sy = surfaceAt(a.x);
        if (a.y > sy - 2) {
          a.y -= 9 * dt;
          a.x += Math.sin(a.legT * 0.3) * 3 * dt;
        } else {
          // 地表に砂を捨てる (小山ができる)
          for (let k = 0; k < Math.min(a.carried, 3); k++) {
            ctx.pour(a.x + rand(-2, 2), sy - 3, rand(-6, 6), -4, 0);
          }
          a.carried = 0;
          a.state = 'surface';
          a.dir = pick([-1, 1]);
          a.t = rand(1.5, 4);
        }
      }
    }
    // エサはだんだん食べられて小さくなる
    for (let k = d.food.length - 1; k >= 0; k--) {
      const f = d.food[k];
      const nearAnt = d.ants.some((a) => Math.hypot(a.x - f.x, a.y - f.y) < 5);
      if (nearAnt) f.r -= dt * 0.25;
      if (f.r < 0.8) { d.food.splice(k, 1); ctx.toast('🐜 エサをたべきった!'); }
    }
    ctx.progress(Math.min(1, d.dug / 200));
  },

  onTool(ctx, id) {
    const d = ctx.data;
    if (id !== 'food' || d.food.length >= 2) return;
    // 砂の中ほどにエサを置く (観察用キットのゼリー風)
    d.food.push({
      x: rand(d.frameX0 + 15, d.frameX1 - 15),
      y: rand(d.soilY + 14, d.bottom - 12),
      r: 3,
    });
    ctx.toast('🍬 エサをセット!アリが目指すよ');
    ctx.sfx.pop(1.2);
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    g.fillStyle = vgrad(g, 0, H, [[0, '#dff0e2'], [1, '#c2e0ca']]);
    g.fillRect(0, 0, W, H);
    sun(g, W * 0.14, 14, 5);
    // 自由研究っぽいメモ
    g.fillStyle = 'rgba(255,255,255,0.85)';
    rr(g, W * 0.4, 8, W * 0.26, 20, 2);
    g.fill();
    g.strokeStyle = '#9ab';
    g.lineWidth = 0.4;
    for (let k = 1; k <= 3; k++) {
      g.beginPath(); g.moveTo(W * 0.42, 8 + k * 4.5); g.lineTo(W * 0.63, 8 + k * 4.5); g.stroke();
    }
    g.fillStyle = '#567';
    g.font = 'bold 3px sans-serif';
    g.fillText('かんさつ日記', W * 0.42, 12);
    // ケース (背面)
    
    g.fillStyle = 'rgba(200,230,245,0.25)';
    rr(g, d.frameX0 - 3, d.soilY - 32, d.frameX1 - d.frameX0 + 6, H - d.soilY + 32, 3);
    g.fill();
    g.strokeStyle = 'rgba(120,160,180,0.8)';
    g.lineWidth = 1.2;
    rr(g, d.frameX0 - 3, d.soilY - 32, d.frameX1 - d.frameX0 + 6, H - d.soilY + 32, 3);
    g.stroke();
  },

  drawFront(ctx, g) {
    const d = ctx.data;
    // エサ
    for (const f of d.food) {
      g.fillStyle = '#e8788a';
      g.beginPath(); g.arc(f.x, f.y, f.r, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.5)';
      g.beginPath(); g.arc(f.x - f.r * 0.3, f.y - f.r * 0.3, f.r * 0.3, 0, TAU); g.fill();
    }
    // アリ
    for (const a of d.ants) {
      g.save();
      g.translate(a.x, a.y);
      const moving = a.state !== 'surface' || true;
      const wob = Math.sin(a.legT) * 0.15;
      g.rotate(wob);
      g.fillStyle = '#4a2e20';
      // 頭・胸・腹
      g.beginPath(); g.arc(-1.6, 0, 0.85, 0, TAU); g.fill();
      g.beginPath(); g.arc(0, 0, 0.75, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(1.7, 0, 1.15, 0.85, 0, 0, TAU); g.fill();
      // あし
      g.strokeStyle = '#4a2e20';
      g.lineWidth = 0.25;
      for (let k = 0; k < 3; k++) {
        const lx = -0.8 + k * 0.8;
        const sw = Math.sin(a.legT + k * 2) * 0.6;
        g.beginPath(); g.moveTo(lx, 0.3); g.lineTo(lx + sw, 1.6); g.stroke();
        g.beginPath(); g.moveTo(lx, -0.3); g.lineTo(lx - sw, -1.6); g.stroke();
      }
      // 触角
      g.beginPath(); g.moveTo(-2.2, -0.4); g.lineTo(-3, -1.2); g.stroke();
      g.beginPath(); g.moveTo(-2.2, 0.4); g.lineTo(-3, 1.2); g.stroke();
      // 運んでいる砂
      if (a.state === 'carry' && a.carried > 0) {
        g.fillStyle = '#d8b878';
        g.beginPath(); g.arc(-2.8, 0, 0.7, 0, TAU); g.fill();
      }
      g.restore();
    }
    // 掘った量メーター
    g.fillStyle = 'rgba(255,255,255,0.92)';
    rr(g, ctx.W - 36, 16, 34, 12, 3);
    g.fill();
    g.fillStyle = '#7a5230';
    g.font = 'bold 4.4px sans-serif';
    g.fillText(`🐜 ${ctx.data.dug}/200`, ctx.W - 33, 24.5);
  },
};
