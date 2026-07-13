// シーン: ティーバッグの抽出観察 (じわ〜っと広がる紅茶色)
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad, softShadow } from '../engine/art.js';

const TEA = [0.52, 0.27, 0.1];
const BASE_DIFF = -0.08; // 透明なお湯の cr-cb
const TEA_DIFF = TEA[0] - TEA[2];

export default {
  id: 'teabag',
  name: 'ティーバッグ抽出',
  emoji: '🫖',
  desc: 'ダンクするほど 早くこくなる',
  goal: '🎯 ちょうどいい濃さで バッグを引きあげよう!',
  clearMsg: 'かおり高い一杯、めしあがれ!',
  maxParticles: 2600,
  view: { shine: 1.3, refract: 1.0, thresh: 0.34 },
  tilt: false,

  init(ctx) {
    const d = ctx.data;
    d.extract = 1;
    d.strength = 0;
    d.outT = 0;
    ctx.sim.definePhase(0, { // お湯 (色は粒子ごとに染まる)
      sigma: 3, beta: 1.5, grav: 1, mix: 2.4, group: 1,
      color: [0.8, 0.86, 0.9], alpha: 0.4,
    });
    ctx.setTools([{ id: 'hotwater', icon: '🫖', label: 'お湯をたす (うすめる)' }]);
    ctx.setHint('バッグをつまんで お湯の中へ。上下にダンクすると 早く出るよ');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.cx = W / 2;
    d.gw = Math.min(W * 0.46, 46);
    d.bottom = Math.min(H - 18, H * 0.86);
    d.top = d.bottom - Math.min(H * 0.36, 62);
    ctx.addCup(d.cx, d.top, d.bottom, d.gw, 2.2);
    // ティーバッグ (可動コライダー)
    d.bag = { kind: 'circle', x: d.cx, y: d.top - 22, r: 3.4, vx: 0, vy: 0, noSolid: true };
    ctx.sim.colliders.push(d.bag);
    d.bagX = d.cx; d.bagY = d.top - 22;
    if (!d.filled) {
      d.filled = true;
      ctx.fill(d.cx - d.gw / 2 + 2, d.top + (d.bottom - d.top) * 0.28, d.cx + d.gw / 2 - 2, d.bottom - 2, 0);
    }
  },

  update(ctx, dt) {
    const d = ctx.data, s = ctx.sim, p = ctx.primary;
    // バッグの追従 (つまんでいる間) / はなすと ふちに掛かる
    const tx = p ? p.x : d.cx + d.gw / 2 + 6;
    const ty = p ? p.y + 5 : d.top - 8;
    const b = d.bag;
    const nx = b.x + (tx - b.x) * Math.min(1, dt * 14);
    const ny = b.y + (ty - b.y) * Math.min(1, dt * 14);
    b.vx = clamp((nx - b.x) / Math.max(dt, 1e-3), -260, 260);
    b.vy = clamp((ny - b.y) / Math.max(dt, 1e-3), -260, 260);
    b.x = nx; b.y = ny;
    const speed = Math.hypot(b.vx, b.vy);

    // 抽出: お湯の中にいる間、まわりを紅茶色に染める
    const wet = s.densityAt(b.x, b.y) > 0.35;
    d.wet = wet;
    if (wet && d.extract > 0) {
      const rate = (0.18 + Math.min(1.8, speed / 50) * 0.35) * dt;
      d.extract = Math.max(0, d.extract - rate * 0.22);
      const k = rate * 8;
      s.forEachInCircle(b.x, b.y, 8.5, (i) => {
        s.cr[i] += (TEA[0] - s.cr[i]) * k;
        s.cg[i] += (TEA[1] - s.cg[i]) * k;
        s.cb[i] += (TEA[2] - s.cb[i]) * k;
        s.ca[i] = Math.min(0.82, s.ca[i] + k * 0.5);
      });
      if (Math.random() < dt * 3) ctx.sfx.drip();
    }

    // カップ全体の濃さ = 紅茶色への近さの平均
    let sum = 0, n2 = 0;
    for (let i = 0; i < s.n; i += 3) {
      sum += clamp(((s.cr[i] - s.cb[i]) - BASE_DIFF) / (TEA_DIFF - BASE_DIFF), 0, 1);
      n2++;
    }
    d.strength = n2 ? sum / n2 : 0;

    // 判定: ちょうどいい濃さ (0.45..0.75) でバッグが お湯の外 → 蒸らし完了
    const inZone = d.strength >= 0.45 && d.strength <= 0.75;
    if (inZone && !wet) {
      d.outT += dt;
      ctx.progress(Math.min(1, d.outT / 1.2));
    } else {
      d.outT = 0;
      if (!ctx._cleared) {
        if (d.strength > 0.75) {
          ctx.progress(0.6);
          if (!d.saidOver) { d.saidOver = true; ctx.toast('☕ こくなりすぎ!🫖 お湯をたして うすめよう'); }
        } else {
          ctx.progress(Math.min(0.97, d.strength / 0.45 * (inZone ? 1 : 0.85)));
        }
      }
    }
    if (inZone && wet && !d.saidUp) {
      d.saidUp = true;
      ctx.toast('✨ いい色!バッグを引きあげて キープしよう');
    }
    if (!inZone) d.saidUp = false;
    if (d.strength <= 0.75) d.saidOver = false;
  },

  onTool(ctx, id) {
    if (id !== 'hotwater') return;
    const d = ctx.data, s = ctx.sim;
    // 上からお湯をたす (こすぎた時のリカバリー)
    for (let k = 0; k < 60; k++) {
      ctx.pour(d.cx + rand(-d.gw * 0.3, d.gw * 0.3), d.top - 10 - rand(0, 8), 0, 40, 0);
    }
    ctx.sfx.splash(0.5);
    ctx.toast('🫖 お湯をたした!すこし うすくなるよ');
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    g.fillStyle = vgrad(g, 0, H, [[0, '#f6ede0'], [1, '#e8d8c2']]);
    g.fillRect(0, 0, W, H);
    // 窓とやわらかい光
    g.fillStyle = 'rgba(255,250,235,0.6)';
    rr(g, W * 0.62, 15, Math.min(30, W * 0.3), 30, 2);
    g.fill();
    g.strokeStyle = '#c8b498';
    g.lineWidth = 1;
    rr(g, W * 0.62, 15, Math.min(30, W * 0.3), 30, 2);
    g.stroke();
    g.beginPath();
    g.moveTo(W * 0.62 + Math.min(30, W * 0.3) / 2, 15);
    g.lineTo(W * 0.62 + Math.min(30, W * 0.3) / 2, 45);
    g.moveTo(W * 0.62, 30);
    g.lineTo(W * 0.62 + Math.min(30, W * 0.3), 30);
    g.stroke();
    // テーブル
    g.fillStyle = '#d8c0a0';
    g.fillRect(0, d.bottom + 4, W, H - d.bottom);
    // ソーサーとカップ
    softShadow(g, d.cx, d.bottom + 5, d.gw * 0.95, 3, 0.18);
    g.fillStyle = '#fff';
    g.beginPath();
    g.ellipse(d.cx, d.bottom + 4, d.gw * 0.72 + 6, 3.4, 0, 0, TAU);
    g.fill();
    g.fillStyle = vgrad(g, d.top - 4, d.bottom + 3, [[0, '#ffffff'], [1, '#e8e2da']]);
    rr(g, d.cx - d.gw / 2 - 3, d.top - 4, d.gw + 6, d.bottom - d.top + 7, 4);
    g.fill();
    // 取っ手
    g.strokeStyle = '#e8e2da';
    g.lineWidth = 3;
    g.beginPath();
    g.arc(d.cx + d.gw / 2 + 5, (d.top + d.bottom) / 2, 7, -Math.PI * 0.45, Math.PI * 0.45);
    g.stroke();
    // 金の縁どり
    g.strokeStyle = '#d8b878';
    g.lineWidth = 0.8;
    g.beginPath();
    g.moveTo(d.cx - d.gw / 2 - 2, d.top - 3);
    g.lineTo(d.cx + d.gw / 2 + 2, d.top - 3);
    g.stroke();
  },

  drawFront(ctx, g) {
    const { W } = ctx, d = ctx.data;
    // 湯気 (ゆらゆら)
    const t = performance.now() / 1000;
    g.strokeStyle = 'rgba(255,255,255,0.35)';
    g.lineWidth = 1.1;
    for (let k = 0; k < 3; k++) {
      const sx = d.cx + (k - 1) * 7;
      g.beginPath();
      g.moveTo(sx, d.top - 3);
      for (let q = 1; q <= 4; q++) {
        g.lineTo(sx + Math.sin(t * 1.6 + k * 2 + q) * 2, d.top - 3 - q * 3.2);
      }
      g.stroke();
    }
    // ティーバッグ (ひも+タグ+バッグ)
    const b = d.bag;
    const ax = ctx.primary ? ctx.primary.x : b.x;
    const ay = ctx.primary ? ctx.primary.y - 14 : b.y - 16;
    g.strokeStyle = '#c8b898';
    g.lineWidth = 0.5;
    g.beginPath();
    g.moveTo(ax, ay);
    g.quadraticCurveTo((ax + b.x) / 2 + 1.5, (ay + b.y) / 2, b.x, b.y - 3);
    g.stroke();
    // タグ
    g.fillStyle = '#e8c84a';
    rr(g, ax - 2.4, ay - 3.4, 4.8, 3.4, 0.7);
    g.fill();
    g.fillStyle = '#7a6820';
    g.font = 'bold 1.7px sans-serif';
    g.textAlign = 'center';
    g.fillText('TEA', ax, ay - 1);
    g.textAlign = 'left';
    // バッグ本体 (残り茶葉で色が変わる)
    g.save();
    g.translate(b.x, b.y);
    g.rotate(clamp(b.vx * 0.002, -0.35, 0.35));
    const e = d.extract ?? 1;
    g.fillStyle = `rgb(${235 - e * 50},${225 - e * 75},${205 - e * 105})`;
    rr(g, -3, -3.6, 6, 7, 1.2);
    g.fill();
    g.strokeStyle = 'rgba(120,90,50,0.4)';
    g.lineWidth = 0.4;
    rr(g, -3, -3.6, 6, 7, 1.2);
    g.stroke();
    // 茶葉のすけ感
    g.fillStyle = `rgba(90,55,20,${0.25 + e * 0.3})`;
    rr(g, -2.2, 0.4 - e * 1.6, 4.4, 2.4 + e * 1.6, 0.8);
    g.fill();
    g.restore();
    // 濃さメーター
    const mx = 4, my = 16, mw = 44;
    g.fillStyle = 'rgba(255,255,255,0.94)';
    rr(g, mx, my, mw, 15, 3);
    g.fill();
    g.fillStyle = '#556';
    g.font = 'bold 2.8px sans-serif';
    g.fillText('こさ', mx + 3, my + 4.5);
    const bx = mx + 3, bw = mw - 6, by = my + 6.5;
    g.fillStyle = '#eee6da';
    rr(g, bx, by, bw, 4, 2);
    g.fill();
    g.fillStyle = 'rgba(90,190,110,0.5)';
    rr(g, bx + bw * 0.45, by, bw * 0.3, 4, 1.5);
    g.fill();
    const st = clamp(d.strength ?? 0, 0, 1);
    g.fillStyle = `rgb(${120 + (1 - st) * 120},${80 + (1 - st) * 130},${40 + (1 - st) * 150})`;
    rr(g, bx, by, Math.max(0.01, bw * st), 4, 2);
    g.fill();
    g.fillStyle = '#889';
    g.font = '2.3px sans-serif';
    g.fillText(`のこり茶葉 ${((d.extract ?? 1) * 100) | 0}%`, bx, by + 7);
  },
};
