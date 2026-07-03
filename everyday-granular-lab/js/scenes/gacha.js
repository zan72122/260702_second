// シーン: ガチャガチャキャンディマシン
import { TAU, rand, clamp, pick } from '../engine/utils.js';
import { rr, vgrad, softShadow } from '../engine/art.js';
import { SPRITES } from '../engine/grainRenderer.js';

const CANDY_COLORS = [
  [1, 0.42, 0.5], [0.42, 0.72, 1], [1, 0.8, 0.3],
  [0.5, 0.9, 0.55], [0.8, 0.58, 1], [1, 0.62, 0.35],
];

export default {
  id: 'gacha',
  name: 'ガチャガチャキャンディ',
  emoji: '🍬',
  desc: 'ハンドルをまわすと コロン♪',
  goal: '🎯 ハンドルをまわして キャンディを8こ あつめよう!',
  clearMsg: 'ポケットいっぱいのキャンディ!',
  maxParticles: 300,
  tilt: false,
  rattlePitch: 0.7,

  init(ctx) {
    const d = ctx.data;
    d.got = 0;
    d.crankAng = 0;
    d.gateT = 0;
    ctx.sim.defineMaterial(0, {
      r: 2.7, rJit: 0.12, mu: 0.12, bounce: 0.45, vmax: 200, rollRes: 0.8,
      sprite: SPRITES.BALL, colors: CANDY_COLORS,
    });
    ctx.setTools([{ id: 'crank', icon: '🔄', label: 'ハンドルをまわす!' }]);
    ctx.setHint('ガチャッとまわすと 中のキャンディが かきまぜられて…コロン!');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.cx = W / 2;
    d.R = Math.min(W * 0.34, H * 0.26, 38);
    d.gy = Math.max(H * 0.28, d.R + 20);
    d.chuteW = 4.2;
    d.trayY = Math.min(H - 12, d.gy + d.R + Math.min(H * 0.3, 52));
    const s = ctx.sim;
    // ガラスドーム (円弧をカプセルで近似、下部にゲート穴)
    const segs = 18;
    for (let k = 0; k < segs; k++) {
      const a0 = (k / segs) * TAU, a1 = ((k + 1) / segs) * TAU;
      const mid = (a0 + a1) / 2;
      // 下向き (90°) 付近 ±18° は開口
      const deg = ((mid * 180 / Math.PI) % 360 + 360) % 360;
      if (Math.abs(deg - 90) < 18) continue;
      s.colliders.push({
        kind: 'capsule',
        ax: d.cx + Math.cos(a0) * d.R, ay: d.gy + Math.sin(a0) * d.R,
        bx: d.cx + Math.cos(a1) * d.R, by: d.gy + Math.sin(a1) * d.R,
        r: 1.5, mu: 0.15,
      });
    }
    // ゲート (開閉)
    const gx0 = d.cx + Math.cos((90 - 18) / 180 * Math.PI) * d.R;
    const gy0 = d.gy + Math.sin((90 - 18) / 180 * Math.PI) * d.R;
    const gx1 = d.cx + Math.cos((90 + 18) / 180 * Math.PI) * d.R;
    const gy1 = d.gy + Math.sin((90 + 18) / 180 * Math.PI) * d.R;
    d.gate = { kind: 'capsule', ax: gx0, ay: gy0, bx: gx1, by: gy1, r: 1.5, mu: 0.15 };
    s.colliders.push(d.gate);
    // シュート (下の受け口へ)
    const bottomY = d.gy + d.R;
    s.colliders.push(
      { kind: 'capsule', ax: gx1, ay: gy1, bx: d.cx - d.chuteW, by: bottomY + 8, r: 1.4, mu: 0.1 },
      { kind: 'capsule', ax: gx0, ay: gy0, bx: d.cx + d.chuteW, by: bottomY + 8, r: 1.4, mu: 0.1 },
      { kind: 'capsule', ax: d.cx - d.chuteW, ay: bottomY + 8, bx: d.cx - d.chuteW, by: d.trayY - 6, r: 1.4, mu: 0.1 },
      { kind: 'capsule', ax: d.cx + d.chuteW, ay: bottomY + 8, bx: d.cx + d.chuteW, by: d.trayY - 6, r: 1.4, mu: 0.1 },
    );
    if (!d.filled) {
      d.filled = true;
      for (let k = 0; k < 105; k++) {
        const a = rand(TAU), rrr = rand(0, d.R - 5);
        ctx.sim.emit(d.cx + Math.cos(a) * rrr, d.gy + Math.sin(a) * rrr * 0.8 - 4, 0, 0, 0);
      }
    }
  },

  update(ctx, dt) {
    const d = ctx.data, s = ctx.sim;
    // ゲート開閉タイマー
    if (d.gateT > 0) {
      d.gateT -= dt;
      d.gate.off = true;
      d.crankAng += dt * 9;
      if (d.gateT <= 0) d.gate.off = false;
    }
    // 受け口に落ちたキャンディを回収
    for (let i = s.n - 1; i >= 0; i--) {
      if (s.y[i] > d.trayY - 8 && Math.abs(s.x[i] - d.cx) < 12) {
        d.got++;
        const col = [s.cr[i], s.cg[i], s.cb[i]];
        ctx.fx.addText(d.cx, d.trayY - 16, `+1 (${d.got}こ)`, '#fff');
        for (let k = 0; k < 6; k++) {
          ctx.fx.addSpark(s.x[i] + rand(-4, 4), s.y[i] + rand(-4, 4),
            `rgb(${col[0] * 255},${col[1] * 255},${col[2] * 255})`);
        }
        s.kill(i);
        ctx.sfx.clink();
        ctx.vibrate(20);
      }
    }
    ctx.progress(d.got / 8);
  },

  onTool(ctx, id) {
    if (id !== 'crank') return;
    const d = ctx.data, s = ctx.sim;
    d.gateT = 0.6;
    ctx.sfx.ratchet();
    // かき混ぜ (アジテーター)
    s.impulse(d.cx, d.gy, d.R, rand(-60, 60), -rand(80, 150));
    s.impulse(d.cx - d.R * 0.4, d.gy + d.R * 0.4, d.R * 0.5, rand(40, 90), -rand(40, 90));
    ctx.vibrate(25);
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    g.fillStyle = vgrad(g, 0, H, [[0, '#ffe2ec'], [1, '#ffd0e0']]);
    g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,0.4)';
    for (let i = 0; i < 14; i++) {
      const x = (i * 53.7) % W, y = (i * 37.3) % H;
      g.beginPath(); g.arc(x, y, 1.6 + (i % 3), 0, TAU); g.fill();
    }
    // マシンの土台
    const bw = d.R + 12;
    softShadow(g, d.cx, d.trayY + 8, bw, 3, 0.2);
    g.fillStyle = vgrad(g, d.gy + d.R - 4, d.trayY + 8, [[0, '#e8465a'], [1, '#c02848']]);
    rr(g, d.cx - bw, d.gy + d.R - 4, bw * 2, d.trayY - d.gy - d.R + 12, 5);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.22)';
    rr(g, d.cx - bw + 3, d.gy + d.R, 4, d.trayY - d.gy - d.R + 4, 2);
    g.fill();
    // シュート窓
    g.fillStyle = 'rgba(60,20,30,0.55)';
    rr(g, d.cx - d.chuteW - 2, d.gy + d.R + 4, d.chuteW * 2 + 4, d.trayY - d.gy - d.R - 12, 3);
    g.fill();
    // 受け口
    g.fillStyle = '#7a1830';
    rr(g, d.cx - 13, d.trayY - 8, 26, 12, 3);
    g.fill();
    g.fillStyle = '#ffd0da';
    g.font = 'bold 3.2px sans-serif';
    g.textAlign = 'center';
    g.fillText('とりだしぐち', d.cx, d.trayY + 8.5);
    g.textAlign = 'left';
    // ドーム受けリング
    g.fillStyle = '#d83a56';
    rr(g, d.cx - d.R - 4, d.gy + d.R - 3, d.R * 2 + 8, 6, 3);
    g.fill();
  },

  drawFront(ctx, g) {
    const { W } = ctx, d = ctx.data;
    // ガラスドーム
    g.strokeStyle = 'rgba(255,255,255,0.7)';
    g.lineWidth = 1.2;
    g.beginPath(); g.arc(d.cx, d.gy, d.R + 1.5, 0, TAU); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.10)';
    g.beginPath(); g.arc(d.cx, d.gy, d.R + 1.5, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.beginPath();
    g.ellipse(d.cx - d.R * 0.45, d.gy - d.R * 0.5, d.R * 0.18, d.R * 0.34, -0.7, 0, TAU);
    g.fill();
    // てっぺんの飾り
    g.fillStyle = '#ffd23e';
    g.beginPath(); g.arc(d.cx, d.gy - d.R - 3.5, 3, 0, TAU); g.fill();
    // ハンドル
    const hx = d.cx, hy = d.gy + d.R + (d.trayY - d.gy - d.R) * 0.32;
    g.save();
    g.translate(hx, hy);
    g.rotate(d.crankAng);
    g.fillStyle = '#f8f0e0';
    g.beginPath(); g.arc(0, 0, 6.5, 0, TAU); g.fill();
    g.fillStyle = '#c8b898';
    rr(g, -7, -1.8, 14, 3.6, 1.8);
    g.fill();
    rr(g, -1.8, -7, 3.6, 14, 1.8);
    g.fill();
    g.fillStyle = '#8a7858';
    g.beginPath(); g.arc(0, 0, 1.8, 0, TAU); g.fill();
    g.restore();
    // カウント
    g.fillStyle = 'rgba(255,255,255,0.92)';
    rr(g, W - 34, 16, 32, 12, 3);
    g.fill();
    g.fillStyle = '#c02848';
    g.font = 'bold 5px sans-serif';
    g.fillText(`🍬 ${d.got}/8`, W - 31, 24.5);
  },
};
