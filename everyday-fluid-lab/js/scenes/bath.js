// シーン: おふろタイム (あつゆ+みず で ちょうどいい温度に)
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad, tileWall, eye } from '../engine/art.js';
import { Pourer } from './common.js';

export default {
  id: 'bath',
  name: 'おふろタイム',
  emoji: '🛁',
  desc: 'アヒルさんと ちゃぷちゃぷ',
  goal: '🎯 お湯をためて 40℃くらいの いいお湯に!',
  clearMsg: 'いいゆだな〜♪',
  maxParticles: 3200,
  view: { shine: 1.3, refract: 1.1, thresh: 0.35 },

  init(ctx) {
    const d = ctx.data;
    d.hotOn = false;
    d.coldOn = false;
    d.hotPour = new Pourer(115, 55);
    d.coldPour = new Pourer(115, 55);
    d.goodT = 0;
    d.temp = 0;
    d.steamT = 0;
    d.bombUsed = false;
    ctx.sim.definePhase(0, { // あつゆ
      sigma: 2.5, beta: 1.4, grav: 1, mix: 2.5, group: 1,
      color: [0.95, 0.62, 0.55], alpha: 0.42,
    });
    ctx.sim.definePhase(1, { // みず
      sigma: 2.5, beta: 1.4, grav: 1, mix: 2.5, group: 1,
      color: [0.5, 0.72, 0.95], alpha: 0.42,
    });
    ctx.setTools([
      { id: 'hot', icon: '🔴', label: 'あつゆ' },
      { id: 'cold', icon: '🔵', label: 'みず' },
      { id: 'duck', icon: '🦆', label: 'アヒル追加' },
      { id: 'bomb', icon: '🧴', label: 'バスボム' },
    ]);
    ctx.setHint('じゃぐちで お湯はり!ドラッグで ちゃぷちゃぷ できるよ');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.cx = W / 2;
    d.tw = Math.min(W * 0.84, 150);
    d.bottom = H - 10;
    d.top = Math.max(H * 0.45, d.bottom - Math.min(H * 0.44, 82));
    d.lineY = d.top + (d.bottom - d.top) * 0.42;
    ctx.addCup(d.cx, d.top, d.bottom, d.tw, 2.6);
    d.hotX = d.cx - d.tw * 0.22;
    d.coldX = d.cx + d.tw * 0.22;
    d.faucetY = d.top - Math.min(18, H * 0.08);
    if (!d.duck) {
      d.duck = true;
      this._addDuck(ctx);
    }
  },

  _addDuck(ctx) {
    const d = ctx.data;
    const so = ctx.sim.addSolid({
      x: d.cx + rand(-d.tw * 0.3, d.tw * 0.3), y: d.top - 10,
      r: 4.6, density: 0.3, drag: 4, upright: 26,
    });
    so.data.duck = true;
    so.hitWall = (v) => { if (v > 30) ctx.sfx.squeak(); };
  },

  update(ctx, dt) {
    const d = ctx.data, s = ctx.sim, p = ctx.primary;
    d.hotPour.phase = 0;
    d.coldPour.phase = 1;
    d.hotPour.update(ctx, dt, d.hotOn, d.hotX, d.faucetY + 6, 0, 1, 3);
    // 2本目の音は片方だけ鳴らす
    const n2 = d.coldPour.rate * dt;
    if (d.coldOn) {
      d.coldPour.acc += n2;
      while (d.coldPour.acc >= 1) {
        d.coldPour.acc -= 1;
        ctx.pour(d.coldX + rand(-1.5, 1.5), d.faucetY + 6, 0, 55, 1);
      }
      if (!d.hotOn) ctx.sfx.setPour(0.6);
    } else if (!d.hotOn) ctx.sfx.setPour(0);

    // ドラッグでちゃぷちゃぷ
    if (p && p.y > d.top - 4) {
      const sp = Math.hypot(p.vx, p.vy);
      if (sp > 50) {
        s.impulse(p.x, p.y, 11, p.vx * 0.1, p.vy * 0.1);
        if (Math.random() < dt * 5) ctx.sfx.splash(Math.min(0.5, sp / 500));
      }
    }

    // バスボム
    for (const so of s.solids) {
      if (!so.data.bomb) continue;
      if (so.wet > 0.3) {
        so.r -= dt * 0.8;
        so.data.fizzT = (so.data.fizzT || 0) + dt;
        if (Math.random() < dt * 26) ctx.fx.addBubble(so.x + rand(-3, 3), so.y + rand(-2, 2), rand(0.4, 0.9), rand(-30, -16));
        if (Math.random() < dt * 8) ctx.fx.addSpark(so.x + rand(-5, 5), so.y + rand(-5, 2), '#ffb0e8');
        // まわりをピンクに染める
        s.forEachInCircle(so.x, so.y, 12, (i) => {
          s.cr[i] += (0.95 - s.cr[i]) * dt * 1.6;
          s.cg[i] += (0.55 - s.cg[i]) * dt * 1.6;
          s.cb[i] += (0.8 - s.cb[i]) * dt * 1.6;
        });
        ctx.sfx.setFizz(0.5);
      }
    }
    for (let i = s.solids.length - 1; i >= 0; i--) {
      if (s.solids[i].data.bomb && s.solids[i].r < 1) {
        s.solids.splice(i, 1);
        ctx.sfx.setFizz(0);
        ctx.toast('💗 いいかおり〜');
      }
    }

    // 温度 = 赤み平均 (あつゆ=1, みず=0)
    let hot = 0, cnt = 0;
    for (let i = 0; i < s.n; i += 2) {
      hot += clamp((s.cr[i] - s.cb[i]) + 0.5, 0, 1);
      cnt++;
    }
    const mixTemp = cnt ? hot / cnt : 0;
    d.temp = 15 + mixTemp * 33; // 15〜48℃
    // 湯かさ
    const level = clamp((d.bottom - this._surface(ctx)) / (d.bottom - d.lineY), 0, 1.4);
    d.level = level;
    // 湯気
    if (d.temp > 36 && cnt > 300) {
      d.steamT += dt;
      if (d.steamT > 0.3) {
        d.steamT = 0;
        ctx.fx.addSteam(d.cx + rand(-d.tw * 0.4, d.tw * 0.4), this._surface(ctx) - 3, rand(3, 5));
      }
    }
    // ゴール判定: 湯かさOK & 38〜43℃をキープ
    const good = level >= 0.96 && d.temp >= 38 && d.temp <= 43;
    if (good) {
      d.goodT += dt;
      ctx.progress(Math.min(1, d.goodT / 2.5));
    } else if (!ctx._cleared) {
      d.goodT = 0;
      ctx.progress(Math.min(0.85, level * 0.6 + (d.temp > 30 ? 0.2 : 0)));
    }
  },

  _surface(ctx) {
    const d = ctx.data, s = ctx.sim;
    for (let y = d.top - 6; y < d.bottom; y += 2) {
      if (s.densityAt(d.cx, y) > 0.55) return y;
    }
    return d.bottom;
  },

  onTool(ctx, id) {
    const d = ctx.data;
    if (id === 'hot') { d.hotOn = !d.hotOn; ctx.toast(d.hotOn ? '🔴 あつゆ ジャー' : '🔴 とめた'); return; }
    if (id === 'cold') { d.coldOn = !d.coldOn; ctx.toast(d.coldOn ? '🔵 みず ジャー' : '🔵 とめた'); return; }
    if (id === 'duck') {
      if (ctx.sim.solids.filter((x) => x.data.duck).length < 4) { this._addDuck(ctx); ctx.sfx.squeak(); }
      return;
    }
    if (id === 'bomb') {
      if (ctx.sim.solids.some((x) => x.data.bomb)) return;
      const so = ctx.sim.addSolid({ x: d.cx, y: d.top - 30, r: 3.6, density: 1.3, drag: 2 });
      so.data.bomb = true;
      ctx.toast('🧴 バスボム ぽちゃん!');
    }
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    tileWall(g, W, 0, H, '#dff0ea');
    // 小窓
    g.fillStyle = 'rgba(140,200,230,0.5)';
    rr(g, W * 0.72, 6, 22, 14, 3);
    g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 1;
    rr(g, W * 0.72, 6, 22, 14, 3);
    g.stroke();
    // 浴槽 (背面)
    const x0 = d.cx - d.tw / 2 - 5;
    g.fillStyle = '#f4f8f8';
    rr(g, x0, d.top - 4, d.tw + 10, d.bottom - d.top + 10, 6);
    g.fill();
    g.fillStyle = '#d8e8e8';
    rr(g, x0 + 2, d.top - 2, d.tw + 6, 5, 2.5);
    g.fill();
    // 蛇口ユニット
    g.fillStyle = '#aab8c0';
    rr(g, d.hotX - 4, d.faucetY - 4, (d.coldX - d.hotX) + 8, 6, 3);
    g.fill();
    for (const [x, col] of [[d.hotX, '#e85a4a'], [d.coldX, '#4a8ae8']]) {
      g.fillStyle = '#98a8b2';
      rr(g, x - 2, d.faucetY, 4, 7, 1.5);
      g.fill();
      g.fillStyle = col;
      g.beginPath(); g.arc(x, d.faucetY - 5.5, 2.6, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.5)';
      g.beginPath(); g.arc(x - 0.8, d.faucetY - 6.2, 0.8, 0, TAU); g.fill();
    }
    // 湯かさライン
    g.strokeStyle = 'rgba(90,160,200,0.55)';
    g.lineWidth = 0.8;
    g.setLineDash([2.5, 2]);
    g.beginPath();
    g.moveTo(x0 + 3, d.lineY);
    g.lineTo(x0 + d.tw + 7, d.lineY);
    g.stroke();
    g.setLineDash([]);
    // おふろセット
    g.fillStyle = '#f0d048';
    g.beginPath();
    g.ellipse(W * 0.12, H - 6, 8, 3, 0, 0, TAU);
    g.fill();
    g.fillStyle = '#e8c030';
    g.beginPath();
    g.ellipse(W * 0.12, H - 7.5, 8, 3, 0, Math.PI, TAU);
    g.fill();
  },

  drawFront(ctx, g) {
    const d = ctx.data, s = ctx.sim;
    // アヒル & バスボム
    for (const so of s.solids) {
      g.save();
      g.translate(so.x, so.y);
      g.rotate(clamp(so.angle, -0.6, 0.6));
      if (so.data.bomb) {
        const grd = g.createRadialGradient(-1, -1, 0.5, 0, 0, so.r);
        grd.addColorStop(0, '#ffd8f0');
        grd.addColorStop(1, '#e878c0');
        g.fillStyle = grd;
        g.beginPath(); g.arc(0, 0, so.r, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.6)';
        g.beginPath(); g.arc(-so.r * 0.3, -so.r * 0.3, so.r * 0.3, 0, TAU); g.fill();
      } else {
        // アヒル
        const r = so.r;
        g.fillStyle = '#ffd23e';
        g.beginPath(); g.ellipse(0, r * 0.15, r * 1.05, r * 0.8, 0, 0, TAU); g.fill(); // 体
        g.beginPath(); g.arc(-r * 0.75, -r * 0.65, r * 0.62, 0, TAU); g.fill();       // 頭
        // しっぽ
        g.beginPath();
        g.moveTo(r * 0.8, 0);
        g.quadraticCurveTo(r * 1.5, -r * 0.5, r * 1.1, -r * 0.75);
        g.quadraticCurveTo(r * 1.0, -r * 0.2, r * 0.55, -r * 0.2);
        g.closePath(); g.fill();
        // くちばし
        g.fillStyle = '#f08828';
        g.beginPath();
        g.ellipse(-r * 1.35, -r * 0.55, r * 0.34, r * 0.2, 0, 0, TAU);
        g.fill();
        eye(g, -r * 0.85, -r * 0.85, r * 0.17, -0.5);
        // ほっぺ
        g.fillStyle = 'rgba(255,140,120,0.5)';
        g.beginPath(); g.arc(-r * 0.62, -r * 0.5, r * 0.14, 0, TAU); g.fill();
      }
      g.restore();
    }
    // 温度計 (トップバーの下)
    g.fillStyle = 'rgba(255,255,255,0.9)';
    rr(g, 2, 16, 26, 12, 3);
    g.fill();
    const tcol = d.temp >= 38 && d.temp <= 43 ? '#e86a3a' : (d.temp > 43 ? '#e83a3a' : '#4a8ae8');
    g.fillStyle = tcol;
    g.font = 'bold 5px sans-serif';
    g.fillText(`${d.temp.toFixed(0)}℃`, 5, 23.5);
    g.fillStyle = '#889';
    g.font = '2.4px sans-serif';
    g.fillText(d.temp >= 38 && d.temp <= 43 ? 'いいゆ!' : (d.temp > 43 ? 'あつい!' : 'ぬるい'), 5, 26.6);
    // 蛇口の水流表示
    for (const [on, x, col] of [[d.hotOn, d.hotX, 'rgba(255,150,130,0.4)'], [d.coldOn, d.coldX, 'rgba(140,190,250,0.4)']]) {
      if (!on) continue;
      g.fillStyle = col;
      rr(g, x - 1.8, d.faucetY + 6, 3.6, 9, 1.8);
      g.fill();
    }
  },
};
