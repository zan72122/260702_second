// シーン: ふるい分け実験 (砂と小石が ふるいで分かれる)
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad, sun, cloud, softShadow } from '../engine/art.js';
import { SPRITES } from '../engine/grainRenderer.js';
import { ToolRig } from './common.js';

export default {
  id: 'sieve',
  name: 'ふるい分け実験',
  emoji: '🪨',
  desc: 'ゆすると 砂だけ下に おちる',
  goal: '🎯 ふるいをゆすって 砂と小石を わけよう!',
  clearMsg: 'きれいに分別できた!',
  maxParticles: 3200,
  tilt: false,
  rattlePitch: 1.1,

  init(ctx) {
    const d = ctx.data;
    d.passed = 0;
    ctx.sim.defineMaterial(0, { // 砂
      r: 0.55, rJit: 0.06, mu: 0.9, interlock: 3, vmax: 45,
      sprite: SPRITES.SAND,
      colors: [[0.92, 0.8, 0.58], [0.86, 0.72, 0.48]],
    });
    ctx.sim.defineMaterial(1, { // 小石
      r: 2.1, rJit: 0.3, mu: 0.6, interlock: 0.8, vmax: 100, sleepK: 0.7,
      sprite: SPRITES.CRUMB,
      colors: [[0.72, 0.7, 0.68], [0.6, 0.58, 0.56], [0.8, 0.76, 0.7]],
    });
    ctx.setHint('ふるい (指) を左右に ゆすってみよう。あみ目より小さい砂だけ おちるよ');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.bw = Math.min(W * 0.4, 44);
    d.bucketBottom = Math.min(H - 12, H * 0.92);
    d.bucketTop = d.bucketBottom - Math.min(H * 0.22, 36);
    d.homeY = Math.max(H * 0.32, 44);
    ctx.addCup(W / 2, d.bucketTop, d.bucketBottom, d.bw * 2, 1.8);
    // ふるい: すきまのある底 + 左右のふち
    const segs = [];
    const slot = 3.4, bar = 2.2, r = 0.5;
    const half = d.bw / 2 + 4;
    for (let x = -half; x < half; x += slot + bar) {
      segs.push([x, 0, Math.min(x + bar, half), 0]);
    }
    segs.push([-half, 0, -half, -10]);
    segs.push([half, 0, half, -10]);
    d.sieve = new ToolRig(ctx.sim, segs, r, 0.3);
    if (!d.filled) {
      d.filled = true;
      // ふるいの上に砂+小石ミックスをのせる (初期は空中のふるい位置に固定できないので後で)
      d.needFill = true;
    }
  },

  update(ctx, dt) {
    const d = ctx.data, s = ctx.sim, p = ctx.primary;
    const { W, H } = ctx;
    const sx = p ? clamp(p.x, d.bw / 2 + 6, W - d.bw / 2 - 6) : W / 2;
    const sy = p ? clamp(p.y, 30, d.bucketTop - 16) : d.homeY;
    const tiltAng = p ? clamp((p.vx || 0) * 0.0008, -0.3, 0.3) : 0;
    d.sieve.place(sx, sy, tiltAng, p ? dt : 0);
    // 初回: ふるいの上にミックスを投入
    if (d.needFill) {
      d.needFill = false;
      for (let k = 0; k < 500; k++) {
        s.emit(sx + rand(-d.bw / 2 + 3, d.bw / 2 - 3), sy - rand(3, 16), 0, 0, 0, 0.2);
      }
      for (let k = 0; k < 26; k++) {
        s.emit(sx + rand(-d.bw / 2 + 5, d.bw / 2 - 5), sy - rand(4, 14), 0, 0, 1, 0.2);
      }
      d.total = 500;
    }
    // ゆすり検出 → 音
    if (p) {
      const sp = Math.hypot(p.vx, p.vy);
      if (sp > 70 && Math.random() < dt * 8) ctx.sfx.setRattle(0.7, 1.2);
    }
    // バケツに落ちた砂 / ふるいに残った小石
    let sandInBucket = 0, pebbleInSieve = 0, sandInSieve = 0;
    for (let i = 0; i < s.n; i++) {
      if (s.y[i] > d.bucketTop - 4) {
        if (s.mat[i] === 0) sandInBucket++;
      } else if (Math.abs(s.x[i] - sx) < d.bw / 2 + 6 && Math.abs(s.y[i] - sy) < 14) {
        if (s.mat[i] === 1) pebbleInSieve++;
        else sandInSieve++;
      }
    }
    d.sandInBucket = sandInBucket;
    d.pebbleInSieve = pebbleInSieve;
    // 進捗: 砂の 85% がバケツへ & 小石はふるいに残っている
    const frac = clamp(sandInBucket / (d.total * 0.55), 0, 1);
    ctx.progress(frac >= 1 && pebbleInSieve >= 12 ? 1 : Math.min(0.97, frac));
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    g.fillStyle = vgrad(g, 0, H, [[0, '#a8d8f0'], [0.7, '#d0eaf8'], [1, '#e8f6ff']]);
    g.fillRect(0, 0, W, H);
    sun(g, W * 0.85, 14, 5.5);
    cloud(g, W * 0.3, 15, 1, 0.9);
    // 公園の砂場のすみ
    g.fillStyle = '#caa268';
    g.fillRect(0, H - 8, W, 8);
    softShadow(g, W / 2, d.bucketBottom + 3, d.bw + 6, 3, 0.16);
    // バケツ
    g.fillStyle = vgrad(g, d.bucketTop - 2, d.bucketBottom + 3, [[0, '#e8554a'], [1, '#c03a32']]);
    g.beginPath();
    g.moveTo(W / 2 - d.bw - 4, d.bucketTop - 2);
    g.lineTo(W / 2 - d.bw + 1, d.bucketBottom + 3);
    g.lineTo(W / 2 + d.bw - 1, d.bucketBottom + 3);
    g.lineTo(W / 2 + d.bw + 4, d.bucketTop - 2);
    g.lineTo(W / 2 + d.bw - 1, d.bucketTop - 2);
    g.lineTo(W / 2 + d.bw - 4, d.bucketBottom - 1);
    g.lineTo(W / 2 - d.bw + 4, d.bucketBottom - 1);
    g.lineTo(W / 2 - d.bw + 1, d.bucketTop - 2);
    g.closePath();
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.25)';
    rr(g, W / 2 - d.bw + 3, d.bucketTop + 2, 3, d.bucketBottom - d.bucketTop - 4, 1.5);
    g.fill();
  },

  drawFront(ctx, g) {
    const d = ctx.data;
    const rig = d.sieve;
    if (rig.x > -500) {
      g.save();
      g.translate(rig.x, rig.y);
      g.rotate(rig.ang);
      const half = d.bw / 2 + 4;
      // ふち
      g.strokeStyle = '#b8894a';
      g.lineWidth = 2;
      g.beginPath(); g.moveTo(-half, -10); g.lineTo(-half, 0); g.stroke();
      g.beginPath(); g.moveTo(half, -10); g.lineTo(half, 0); g.stroke();
      // あみ (バーとすきま)
      g.strokeStyle = '#8a8f9a';
      g.lineWidth = 1.1;
      const slot = 3.4, bar = 2.2;
      for (let x = -half; x < half; x += slot + bar) {
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(Math.min(x + bar, half), 0);
        g.stroke();
      }
      // 取っ手
      g.strokeStyle = '#b8894a';
      g.lineWidth = 1.8;
      g.beginPath(); g.moveTo(half, -5); g.lineTo(half + 12, -8); g.stroke();
      g.restore();
    }
    // 分別カウント
    g.fillStyle = 'rgba(255,255,255,0.92)';
    rr(g, ctx.W - 44, 16, 42, 17, 3);
    g.fill();
    g.fillStyle = '#a06a2a';
    g.font = 'bold 3.6px sans-serif';
    g.fillText(`すな ${d.sandInBucket ?? 0}/${((d.total ?? 500) * 0.55) | 0}`, ctx.W - 41, 22.5);
    g.fillStyle = '#667';
    g.fillText(`こいし ${d.pebbleInSieve ?? 0}こ キープ`, ctx.W - 41, 28.5);
  },
};
