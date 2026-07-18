// シーン: 万華鏡 (60°三枚鏡 → 12回対称の世界)
import { TAU, rand, clamp, pick } from '../engine/utils.js';
import { rr, vgrad } from '../engine/art.js';

const COLORS = ['#e85a72', '#f0a83a', '#f2d43a', '#5ac86a', '#4a9ae8', '#9a6ae8', '#e87ab8'];

export default {
  id: 'kaleido',
  name: '万華鏡',
  emoji: '🔮',
  desc: '3枚の鏡がつくる まんだら',
  goal: '🎯 ふって・ころがして 3回もようを変えて じっくり観察しよう!',
  clearMsg: '60°の鏡3枚=12個の世界のコピー!',
  spectrumN: 6,

  init(ctx) {
    const d = ctx.data;
    d.beads = [];
    d.shakes = 0;
    d.watchT = 0;
    for (let k = 0; k < 9; k++) this._addBead(ctx);
    ctx.setTools([{ id: 'shake', icon: '🫨', label: 'ふる' }]);
    ctx.setHint('中のビーズは1セルだけ。鏡のコピーが12個ならんで まんだらに!');
  },

  _addBead(ctx) {
    ctx.data.beads.push({
      // セル内座標 (半径方向 0..1, 角度 0..60°)
      r: rand(0.15, 0.92), a: rand(0.06, Math.PI / 3 - 0.06),
      vr: 0, va: 0,
      size: rand(1.6, 3.2),
      col: pick(COLORS),
      shape: (Math.random() * 3) | 0,
      rot: rand(0, TAU),
    });
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.cx = W / 2;
    d.cy = Math.min(H * 0.44, H - 100);
    d.R = Math.min(W * 0.42, H * 0.3, 44);
  },

  update(ctx, dt) {
    const d = ctx.data, p = ctx.primary;
    // ビーズの簡易物理 (重力=セルの下方向+減衰)
    for (const b of d.beads) {
      b.va += Math.sin(ctx.t * 0.4) * dt * 0.02;
      b.vr += dt * 0.25 * (0.6 - b.r) * -1; // ゆっくり外へ
      if (p && Math.hypot(p.x - d.cx, p.y - d.cy) < d.R * 1.2) {
        // ドラッグでかき回す
        b.vr += (p.vx ?? 0) * dt * 0.004 * Math.sin(b.a * 7);
        b.va += (p.vy ?? 0) * dt * 0.004;
      }
      b.r += b.vr * dt; b.a += b.va * dt;
      b.vr *= 1 - dt * 1.6; b.va *= 1 - dt * 1.6;
      b.rot += b.va * dt * 8;
      if (b.r > 0.94) { b.r = 0.94; b.vr = -Math.abs(b.vr) * 0.5; }
      if (b.r < 0.12) { b.r = 0.12; b.vr = Math.abs(b.vr) * 0.5; }
      const amax = Math.PI / 3 - 0.04;
      if (b.a > amax) { b.a = amax; b.va = -Math.abs(b.va) * 0.5; }
      if (b.a < 0.04) { b.a = 0.04; b.va = Math.abs(b.va) * 0.5; }
    }
    // 観察ゲージ
    d.watchT += dt;
    ctx.progress(Math.min(1, d.shakes / 3 * 0.7 + Math.min(d.watchT / 12, 0.3)));
  },

  onTool(ctx, id) {
    if (id !== 'shake') return;
    const d = ctx.data;
    d.shakes++;
    for (const b of d.beads) {
      b.vr += rand(-1.4, 1.4);
      b.va += rand(-1.4, 1.4);
    }
    ctx.sfx.pop(1.2);
    ctx.vibrate(20);
    ctx.toast(d.shakes < 3 ? `🫨 シャラシャラ… (${d.shakes}/3)` : '🫨 もようは二度と同じにならない!');
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    g.fillStyle = vgrad(g, 0, H, [[0, '#231c38'], [1, '#160f26']]);
    g.fillRect(0, 0, W, H);
    // 筒の外側
    g.strokeStyle = '#8a7ab8';
    g.lineWidth = 2.2;
    g.beginPath();
    g.arc(d.cx, d.cy, d.R + 3, 0, TAU);
    g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.25)';
    g.lineWidth = 0.8;
    g.beginPath();
    g.arc(d.cx, d.cy, d.R + 5, 0, TAU);
    g.stroke();
    // しくみ図 (下): 三角形の鏡3枚
    const ix = W * 0.5, iy = d.cy + d.R + 22;
    if (iy < H - 8) {
      g.strokeStyle = 'rgba(200,200,230,0.6)';
      g.lineWidth = 0.8;
      g.beginPath();
      for (let k = 0; k <= 3; k++) {
        const a = k / 3 * TAU - Math.PI / 2;
        const x = ix + Math.cos(a) * 7, y = iy + Math.sin(a) * 7;
        k === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
      }
      g.stroke();
      g.fillStyle = 'rgba(200,200,230,0.7)';
      g.font = '2.5px sans-serif';
      g.fillText('← 中は鏡3枚の三角の筒', ix + 10, iy + 1);
    }
  },

  drawFront(ctx, g) {
    const d = ctx.data;
    // 12回対称: セルを 6回転 × 鏡映で描画
    g.save();
    g.beginPath();
    g.arc(d.cx, d.cy, d.R, 0, TAU);
    g.clip();
    g.fillStyle = '#0c0a18';
    g.fillRect(d.cx - d.R, d.cy - d.R, d.R * 2, d.R * 2);
    for (let k = 0; k < 6; k++) {
      for (const flip of [1, -1]) {
        g.save();
        g.translate(d.cx, d.cy);
        g.rotate((k * TAU) / 6);
        g.scale(1, flip);
        // 反射回数が多いコピーほど少し暗く (reflect^n)
        const order = k === 0 && flip === 1 ? 0 : 1 + (k > 2 ? 1 : 0);
        g.globalAlpha = Math.pow(0.93, order);
        for (const b of d.beads) {
          const x = Math.cos(b.a) * b.r * d.R;
          const y = Math.sin(b.a) * b.r * d.R;
          g.save();
          g.translate(x, y);
          g.rotate(b.rot);
          g.fillStyle = b.col;
          if (b.shape === 0) {
            g.beginPath(); g.arc(0, 0, b.size, 0, TAU); g.fill();
          } else if (b.shape === 1) {
            rr(g, -b.size, -b.size * 0.6, b.size * 2, b.size * 1.2, b.size * 0.3);
            g.fill();
          } else {
            g.beginPath();
            g.moveTo(0, -b.size);
            g.lineTo(b.size * 0.9, b.size * 0.7);
            g.lineTo(-b.size * 0.9, b.size * 0.7);
            g.closePath();
            g.fill();
          }
          g.fillStyle = 'rgba(255,255,255,0.4)';
          g.beginPath();
          g.arc(-b.size * 0.25, -b.size * 0.25, b.size * 0.3, 0, TAU);
          g.fill();
          g.restore();
        }
        g.restore();
      }
    }
    g.globalAlpha = 1;
    // セルの境界 (鏡のライン) をうっすら
    g.strokeStyle = 'rgba(255,255,255,0.10)';
    g.lineWidth = 0.4;
    for (let k = 0; k < 6; k++) {
      g.save();
      g.translate(d.cx, d.cy);
      g.rotate((k * TAU) / 6);
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(d.R, 0);
      g.stroke();
      g.restore();
    }
    g.restore();
    // 中央のかがやき
    g.save();
    g.globalCompositeOperation = 'lighter';
    const grad = g.createRadialGradient(d.cx, d.cy, 0, d.cx, d.cy, d.R * 0.5);
    grad.addColorStop(0, 'rgba(255,255,255,0.08)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(d.cx, d.cy, d.R * 0.5, 0, TAU);
    g.fill();
    g.restore();
    // メーター
    g.fillStyle = 'rgba(255,255,255,0.92)';
    rr(g, 4, 16, 34, 10, 3);
    g.fill();
    g.fillStyle = '#556';
    g.font = 'bold 2.6px sans-serif';
    g.fillText(`ふった回数 ${d.shakes}/3`, 7, 20.5);
    g.fillStyle = '#889';
    g.font = '2.2px sans-serif';
    g.fillText('なぞってもうごくよ', 7, 24);
  },
};
