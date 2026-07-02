// シーン: 手づくりドレッシング (油とお酢は混ざらない!)
import { TAU, rand, clamp, css } from '../engine/utils.js';
import { rr, softShadow, vgrad, woodTable } from '../engine/art.js';
import { StainMap } from './common.js';
import { MAXN } from '../engine/sim.js';

export default {
  id: 'dressing',
  name: 'ドレッシングをふりふり',
  emoji: '🥗',
  desc: '油とお酢をシェイクして乳化させよう',
  goal: '🎯 ふって乳化→サラダにかけよう!',
  clearMsg: 'シェフの味!',
  maxParticles: 2000,
  view: { shine: 1.4, refract: 1.0 },
  gravity: 430,

  init(ctx) {
    const d = ctx.data;
    d.mode = 'mix';
    d.emul = 0;
    d.salad = 0;
    d.tiltAng = 0;
    d.emulT = 0;
    d.emulDone = false;
    d.sepShown = false;
    ctx.sim.definePhase(0, { // オリーブオイル (軽い)
      sigma: 12, beta: 2, grav: 0.6, repel: 0.85, mix: 0,
      color: [0.95, 0.78, 0.25], alpha: 0.6,
    });
    ctx.sim.definePhase(1, { // お酢 (重い)
      sigma: 5, beta: 1.6, grav: 1.2, repel: 0.85, mix: 0,
      color: [0.72, 0.28, 0.18], alpha: 0.82,
    });
    ctx.setTools([
      { id: 'mix', icon: '🫙', label: 'ふりふりモード', active: true },
      { id: 'pour', icon: '🥗', label: 'サラダにかける' },
    ]);
    ctx.setHint('ボトルをつかんで はげしく ふろう!');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.k = clamp(Math.min(H, W) / 105, 0.7, 1.15); // ボトル縮尺
    d.homeX = W / 2;
    d.homeY = H * 0.42;
    if (d.bx === undefined) { d.bx = d.homeX; d.by = d.homeY; d.bvx = 0; d.bvy = 0; }
    else { d.bx = d.homeX; d.by = d.homeY; }
    d.saladX = W * 0.72;
    d.saladY = H - 16;
    if (!d.stain) d.stain = new StainMap(60, 26, 3);
    // ボトルコライダー (毎フレーム update で座標を再計算)
    const mk = () => ({ kind: 'capsule', ax: 0, ay: 0, bx: 0, by: 0, r: 1.5, vx: 0, vy: 0 });
    d.walls = Array.from({ length: 8 }, mk);
    d.cap = d.walls[7];
    ctx.sim.colliders.push(...d.walls);
    this._placeBottle(ctx, 0);
    if (!d.filled) {
      d.filled = true;
      const k = d.k;
      // お酢 (下) と油 (上)
      ctx.fill(d.bx - 14 * k, d.by + 4 * k, d.bx + 14 * k, d.by + 24 * k, 1, 1.5);
      ctx.fill(d.bx - 14 * k, d.by - 16 * k, d.bx + 14 * k, d.by + 2 * k, 0, 1.5);
    }
  },

  // angle でボトルコライダーを配置
  _placeBottle(ctx, ang) {
    const d = ctx.data, k = d.k;
    const bw = 17 * k, neck = 5.5 * k;
    const P = (x, y) => {
      const c = Math.cos(ang), s = Math.sin(ang);
      return [d.bx + (x * c - y * s), d.by + (x * s + y * c)];
    };
    const segs = [
      [-bw, -10 * k, -bw, 28 * k],       // 左壁
      [bw, -10 * k, bw, 28 * k],         // 右壁
      [-bw, 28 * k, bw, 28 * k],         // 底
      [-bw, -10 * k, -neck, -27 * k],    // 左肩
      [bw, -10 * k, neck, -27 * k],      // 右肩
      [-neck, -27 * k, -neck, -39 * k],  // 首左
      [neck, -27 * k, neck, -39 * k],    // 首右
      [-neck, -39 * k, neck, -39 * k],   // フタ (注ぐときは外す)
    ];
    segs.forEach(([x0, y0, x1, y1], i) => {
      const c = d.walls[i];
      const [ax, ay] = P(x0, y0), [bx, by] = P(x1, y1);
      c.ax = ax; c.ay = ay; c.bx = bx; c.by = by;
    });
  },

  update(ctx, dt) {
    const d = ctx.data, s = ctx.sim, p = ctx.primary;
    // ボトルの動き
    let tx = d.homeX, ty = d.homeY, targetAng = 0;
    if (d.mode === 'pour') {
      tx = ctx.W * 0.34; ty = ctx.H * 0.35;
      targetAng = 2.0; // 首が右下を向く
    } else if (p) {
      tx = p.x; ty = p.y;
    }
    d.tiltAng += (targetAng - d.tiltAng) * Math.min(1, dt * 3);
    const ox = d.bx, oy = d.by;
    const spring = d.mode === 'pour' ? 4 : 14;
    let mx = (tx - d.bx) * Math.min(1, dt * spring);
    let my = (ty - d.by) * Math.min(1, dt * spring);
    // 速すぎるとガラス壁を粒子がすり抜けるので移動量を制限
    const mlen = Math.hypot(mx, my), mmax = 170 * dt;
    if (mlen > mmax) { mx *= mmax / mlen; my *= mmax / mlen; }
    d.bx += mx; d.by += my;
    const bvx = (d.bx - ox) / Math.max(dt, 1e-3), bvy = (d.by - oy) / Math.max(dt, 1e-3);
    this._placeBottle(ctx, d.tiltAng);
    for (const w of d.walls) { w.vx = bvx; w.vy = bvy; }
    d.cap.off = d.mode === 'pour';
    // シェイクで中身に勢いを
    const shake = Math.hypot(bvx, bvy);
    if (shake > 60 && d.mode === 'mix') {
      s.impulse(d.bx, d.by, 30 * d.k, bvx * 0.10, bvy * 0.10);
      if (Math.random() < dt * 8) ctx.sfx.splash(Math.min(0.6, shake / 500));
    }

    // 乳化度: 異相のおとなりの割合
    d.emulT += dt;
    if (d.emulT > 0.25) {
      d.emulT = 0;
      let sum = 0, cnt = 0;
      for (let i = 0; i < s.n; i += 3) {
        const nc = s.nCount[i];
        if (nc < 3) continue;
        let other = 0;
        for (let kk = 0; kk < nc; kk++) {
          const j = s.nList[i * MAXN + kk];
          if (j < s.n && s.phase[j] !== s.phase[i]) other++;
        }
        sum += other / nc; cnt++;
      }
      d.emul = cnt ? clamp(sum / cnt / 0.42, 0, 1) : 0;
      if (!d.emulDone && d.emul >= 0.82) {
        d.emulDone = true;
        ctx.toast('✨ 乳化した!とろとろドレッシング!');
        ctx.sfx.chime();
      }
      if (d.emulDone && !d.sepShown && d.emul < 0.45 && d.mode === 'mix') {
        d.sepShown = true;
        ctx.toast('👀 ほうっておくと また分離していく…');
      }
    }

    // サラダにかかった分
    if (d.mode === 'pour') {
      for (let i = s.n - 1; i >= 0; i--) {
        if (s.y[i] > d.saladY - 14 && Math.abs(s.x[i] - d.saladX) < 26) {
          d.stain.stamp(s.x[i] - (d.saladX - 30), s.y[i] - (d.saladY - 20), rand(1.6, 2.6),
            css([s.cr[i], s.cg[i], s.cb[i]], 0.55));
          d.salad++;
          s.kill(i);
          if ((d.salad & 7) === 0) ctx.backDirty();
        }
      }
    }
    ctx.progress(clamp(Math.max(d.emul, d.emulDone ? 1 : 0) * 0.7 + Math.min(1, d.salad / 140) * 0.3, 0, 1));
  },

  onTool(ctx, id) {
    const d = ctx.data;
    d.mode = id;
    ctx.setToolActive(id);
    if (id === 'pour') {
      ctx.toast(d.emul > 0.6 ? '🥗 とろ〜り かけよう!' : '💡 まだ分離してるかも…ふってからが おすすめ!');
      ctx.backDirty();
    } else {
      ctx.toast('🫙 ドラッグで シェイク!');
    }
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    g.fillStyle = vgrad(g, 0, H, [[0, '#f4f0e2'], [1, '#e7ddc4']]);
    g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(150,180,120,0.18)';
    for (let x = 0; x < W + 20; x += 22) {
      g.beginPath(); g.arc(x, 4, 8, 0, TAU); g.fill();
    }
    woodTable(g, W, H - 26, H, 1);
    // サラダボウル
    softShadow(g, d.saladX, d.saladY + 7, 26, 3, 0.15);
    g.fillStyle = '#7fb069';
    // レタス
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * TAU;
      g.fillStyle = i % 2 ? '#8fc177' : '#6da75b';
      g.beginPath();
      g.arc(d.saladX + Math.cos(a) * 13, d.saladY - 8 + Math.sin(a) * 5 - 3, 5 + (i * 0.7) % 2, 0, TAU);
      g.fill();
    }
    // トマト
    for (const [ox, oy] of [[-9, -8], [8, -11], [0, -4]]) {
      g.fillStyle = '#e84a3e';
      g.beginPath(); g.arc(d.saladX + ox, d.saladY + oy - 3, 3.2, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.4)';
      g.beginPath(); g.arc(d.saladX + ox - 1, d.saladY + oy - 4, 1, 0, TAU); g.fill();
    }
    // ドレッシングのかかりぐあい
    d.stain.drawTo(g, d.saladX - 30, d.saladY - 20);
    // ボウル
    g.fillStyle = '#e8e2d0';
    g.beginPath();
    g.moveTo(d.saladX - 27, d.saladY - 6);
    g.quadraticCurveTo(d.saladX, d.saladY + 14, d.saladX + 27, d.saladY - 6);
    g.lineTo(d.saladX + 23, d.saladY + 8);
    g.quadraticCurveTo(d.saladX, d.saladY + 16, d.saladX - 23, d.saladY + 8);
    g.closePath();
    g.fill();
  },

  drawFront(ctx, g) {
    const d = ctx.data, k = d.k;
    // 乳化メーター (トップバーの下)
    g.fillStyle = 'rgba(255,255,255,0.8)';
    rr(g, 2, 17, 30, 6, 3);
    g.fill();
    g.fillStyle = d.emul > 0.75 ? '#f0a840' : '#c8b090';
    rr(g, 3, 18, 28 * d.emul + 0.01, 4, 2);
    g.fill();
    g.fillStyle = '#6a5030';
    g.font = '3px sans-serif';
    g.fillText('にゅうか度', 4, 27);
    // ボトル (ガラス)
    g.save();
    g.translate(d.bx, d.by);
    g.rotate(d.tiltAng);
    g.scale(k, k);
    g.fillStyle = 'rgba(210,230,235,0.25)';
    g.strokeStyle = 'rgba(150,180,190,0.85)';
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(-5.5, -39);
    g.lineTo(-5.5, -27);
    g.lineTo(-17, -10);
    g.lineTo(-17, 24);
    g.quadraticCurveTo(-17, 28.5, -12, 28.5);
    g.lineTo(12, 28.5);
    g.quadraticCurveTo(17, 28.5, 17, 24);
    g.lineTo(17, -10);
    g.lineTo(5.5, -27);
    g.lineTo(5.5, -39);
    g.closePath();
    g.fill(); g.stroke();
    // フタ
    if (ctx.data.mode !== 'pour') {
      g.fillStyle = '#c8a052';
      rr(g, -6.5, -44, 13, 6, 1.5);
      g.fill();
    }
    // つや
    g.fillStyle = 'rgba(255,255,255,0.35)';
    rr(g, -14, -8, 3, 30, 1.5);
    g.fill();
    g.restore();
  },
};
