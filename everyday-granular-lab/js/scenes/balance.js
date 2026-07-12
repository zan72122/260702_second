// シーン: てんびんで粒はかり (左右つりあい実験)
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad, woodTable, softShadow } from '../engine/art.js';
import { SPRITES } from '../engine/grainRenderer.js';
import { ToolRig } from './common.js';

export default {
  id: 'balance',
  name: 'てんびんで粒はかり',
  emoji: '⚖️',
  desc: 'そそいで ぴったり つりあわせよう',
  goal: '🎯 左右のお皿を 2びょうかん つりあわせよう!',
  clearMsg: 'ぴったり!はかりの名人!',
  maxParticles: 2600,
  tilt: false,
  rattlePitch: 0.9,

  init(ctx) {
    const d = ctx.data;
    d.angle = 0;
    d.angleV = 0;
    d.stableT = 0;
    d.acc = 0;
    ctx.sim.defineMaterial(0, { // お米
      r: 0.8, rJit: 0.07, mu: 0.5, interlock: 0.8, sleepK: 0.7, vmax: 75,
      sprite: SPRITES.RICE, stretch: 1.9,
      colors: [[1, 1, 1], [0.97, 0.96, 0.9]],
    });
    ctx.setHint('タッチした側のお皿に お米がそそがれるよ。かたむきをよく見て!');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.cx = W / 2;
    d.pivotY = Math.min(H * 0.42, H - 90);
    d.arm = Math.min(W * 0.32, 42);
    d.panW = Math.min(W * 0.24, 30);
    d.dropH = 8;
    // 左右のお皿 (3セグの U字コライダー: 毎フレーム angle で再配置)
    d.panL = new ToolRig(ctx.sim, [
      [-d.panW / 2, 0, d.panW / 2, 0],
      [-d.panW / 2, 0, -d.panW / 2 - 2, -7],
      [d.panW / 2, 0, d.panW / 2 + 2, -7],
    ], 1.2, 0.5);
    d.panR = new ToolRig(ctx.sim, [
      [-d.panW / 2, 0, d.panW / 2, 0],
      [-d.panW / 2, 0, -d.panW / 2 - 2, -7],
      [d.panW / 2, 0, d.panW / 2 + 2, -7],
    ], 1.2, 0.5);
    // 事前におもり (ランダムな初期不均衡): 右皿に少し米
    d.seeded = d.seeded || false;
  },

  update(ctx, dt) {
    const d = ctx.data, s = ctx.sim, p = ctx.primary;
    // てんびんのお皿位置 (angle から)
    const lx = d.cx - Math.cos(d.angle) * d.arm;
    const ly = d.pivotY - Math.sin(d.angle) * d.arm + d.dropH;
    const rx = d.cx + Math.cos(d.angle) * d.arm;
    const ry = d.pivotY + Math.sin(d.angle) * d.arm + d.dropH;
    d.panL.place(lx, ly, 0, dt);
    d.panR.place(rx, ry, 0, dt);
    d.lx = lx; d.ly = ly; d.rx = rx; d.ry = ry;
    // 初期おもり
    if (!d.seeded) {
      d.seeded = true;
      for (let k = 0; k < 55; k++) {
        s.emit(rx + rand(-d.panW / 2 + 2, d.panW / 2 - 2), ry - rand(2, 8), 0, 0, 0, 0.2);
      }
    }
    // タッチで注ぐ (タッチ側の皿の上から)
    if (p) {
      d.acc += 60 * dt;
      const side = p.x < d.cx ? -1 : 1;
      const px = side < 0 ? lx : rx;
      const py = (side < 0 ? ly : ry) - 26;
      while (d.acc >= 1) {
        d.acc -= 1;
        ctx.pour(px + rand(-3, 3), py, 0, 25, 0);
      }
      ctx.sfx.setPour(0.35, 0.9);
    } else {
      d.acc = 0;
      ctx.sfx.setPour(0);
    }
    // お皿の上の粒を数えてトルク
    let mL = 0, mR = 0;
    for (let i = 0; i < s.n; i++) {
      if (Math.abs(s.x[i] - lx) < d.panW / 2 + 3 && s.y[i] > ly - 12 && s.y[i] < ly + 2) mL++;
      else if (Math.abs(s.x[i] - rx) < d.panW / 2 + 3 && s.y[i] > ry - 12 && s.y[i] < ry + 2) mR++;
    }
    d.mL = mL; d.mR = mR;
    // てんびんの回転ダイナミクス (バネ+減衰)
    const torque = (mR - mL) * 0.0016;
    d.angleV += (torque - d.angle * 0.18 - d.angleV * 1.6) * dt * 8;
    d.angle = clamp(d.angle + d.angleV * dt * 8, -0.42, 0.42);
    // つりあい判定
    const balanced = Math.abs(mL - mR) <= 7 && mL + mR > 80 && Math.abs(d.angle) < 0.07;
    if (balanced) {
      d.stableT += dt;
      ctx.progress(Math.min(1, d.stableT / 2));
    } else {
      d.stableT = 0;
      if (!ctx._cleared) {
        const total = clamp((mL + mR) / 200, 0, 0.5);
        const closeness = mL + mR > 40 ? clamp(1 - Math.abs(mL - mR) / 60, 0, 1) * 0.45 : 0;
        ctx.progress(Math.min(0.95, total + closeness));
      }
    }
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    g.fillStyle = vgrad(g, 0, H, [[0, '#f4eede'], [1, '#e8dcc0']]);
    g.fillRect(0, 0, W, H);
    woodTable(g, W, H - 22, H, 1);
    // 支柱と台
    softShadow(g, d.cx, H - 20, 26, 3, 0.15);
    g.fillStyle = '#8a6a44';
    rr(g, d.cx - 2.2, d.pivotY, 4.4, H - 22 - d.pivotY, 2);
    g.fill();
    rr(g, d.cx - 16, H - 24, 32, 4, 2);
    g.fill();
    // 理科室風の黒板メモ
    g.fillStyle = '#3a5a48';
    rr(g, 4, 16, Math.min(46, W * 0.42), 22, 2);
    g.fill();
    g.strokeStyle = '#c8a052';
    g.lineWidth = 1;
    rr(g, 4, 16, Math.min(46, W * 0.42), 22, 2);
    g.stroke();
    g.fillStyle = '#f0f0e0';
    g.font = 'bold 3.2px sans-serif';
    g.fillText('つりあいの実験', 7, 22);
    g.font = '2.6px sans-serif';
    g.fillText('左右の重さが同じとき', 7, 27);
    g.fillText('うでは 水平になる', 7, 31);
  },

  drawFront(ctx, g) {
    const d = ctx.data;
    if (d.lx === undefined) return;
    // うで
    g.save();
    g.translate(d.cx, d.pivotY);
    g.rotate(d.angle);
    g.fillStyle = '#c8a052';
    rr(g, -d.arm - 3, -1.4, d.arm * 2 + 6, 2.8, 1.4);
    g.fill();
    g.restore();
    // 支点
    g.fillStyle = '#8a6a44';
    g.beginPath();
    g.moveTo(d.cx - 4, d.pivotY + 2);
    g.lineTo(d.cx, d.pivotY - 3);
    g.lineTo(d.cx + 4, d.pivotY + 2);
    g.closePath();
    g.fill();
    // つりひも + お皿
    for (const [px, py] of [[d.lx, d.ly], [d.rx, d.ry]]) {
      const ax = d.cx + (px < d.cx ? -1 : 1) * Math.cos(d.angle) * d.arm;
      const ay = d.pivotY + (px < d.cx ? -1 : 1) * Math.sin(d.angle) * d.arm;
      g.strokeStyle = '#9a8a6a';
      g.lineWidth = 0.5;
      for (const ox of [-d.panW / 2, d.panW / 2]) {
        g.beginPath();
        g.moveTo(ax, ay);
        g.lineTo(px + ox, py - 6);
        g.stroke();
      }
      g.strokeStyle = '#b8894a';
      g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(px - d.panW / 2 - 2, py - 7);
      g.lineTo(px - d.panW / 2, py);
      g.lineTo(px + d.panW / 2, py);
      g.lineTo(px + d.panW / 2 + 2, py - 7);
      g.stroke();
    }
    // 目盛りと数
    g.fillStyle = 'rgba(255,255,255,0.92)';
    rr(g, ctx.W / 2 - 26, 16, 52, 12, 3);
    g.fill();
    g.font = 'bold 4px sans-serif';
    g.fillStyle = '#8a4a2a';
    g.textAlign = 'center';
    const diff = (d.mL ?? 0) - (d.mR ?? 0);
    g.fillText(`ひだり ${d.mL ?? 0}  |  みぎ ${d.mR ?? 0}  (${diff > 0 ? '+' + diff : diff})`, ctx.W / 2, 24.5);
    g.textAlign = 'left';
  },
};
