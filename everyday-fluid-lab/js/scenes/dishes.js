// シーン: おさらをピカピカに洗おう
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad, tileWall, softShadow } from '../engine/art.js';
import { Pourer } from './common.js';

export default {
  id: 'dishes',
  name: 'おさらをピカピカに',
  emoji: '🍽️',
  desc: 'スポンジでゴシゴシ、水でジャー',
  goal: '🎯 よごれを ぜんぶ おとそう!',
  clearMsg: 'ピッカピカ!おてつだい めいじん!',
  maxParticles: 2400,
  view: { shine: 1.4, refract: 1.1, thresh: 0.36 },
  tilt: false,

  init(ctx) {
    const d = ctx.data;
    d.tool = 'sponge';
    d.faucetOn = false;
    d.pourer = new Pourer(85, 65);
    d.cells = null;
    d.squeakT = 0;
    d.sparkleT = 0;
    ctx.sim.definePhase(0, { // 水
      sigma: 2.5, beta: 1.4, grav: 1, mix: 0,
      color: [0.6, 0.78, 0.9], alpha: 0.4,
    });
    ctx.setTools([
      { id: 'sponge', icon: '🧽', label: 'スポンジ', active: true },
      { id: 'water', icon: '🚰', label: '水を出す/とめる' },
    ]);
    ctx.setHint('スポンジでゴシゴシ→水でながすと よごれが おちるよ');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data, s = ctx.sim;
    d.cx = W / 2;
    d.R = Math.min(W * 0.36, H * 0.3, 40);
    d.cy = Math.min(H * 0.62, H - d.R - 14);
    d.faucetX = d.cx;
    d.sinkY = H - 8;
    // お皿 (円コライダー)
    s.colliders.push({ kind: 'circle', x: d.cx, y: d.cy, r: d.R });
    // シンクの底は抜ける (bounds bottom を開ける)
    s.setBounds(W, H, { bottom: false });
    // 汚れグリッド (皿の上のみ)
    if (!d.cells) {
      const N = 9;
      d.cells = [];
      for (let gy = 0; gy < N; gy++) {
        for (let gx = 0; gx < N; gx++) {
          const ux = (gx + 0.5) / N * 2 - 1, uy = (gy + 0.5) / N * 2 - 1;
          const rr2 = ux * ux + uy * uy;
          if (rr2 < 0.86 && uy < 0.25) { // 見えている上面だけ
            d.cells.push({ ux, uy, dirt: 1, soap: 0, kind: Math.random() < 0.5 ? 0 : 1 });
          }
        }
      }
      // まだらに: 3割はきれい
      for (const c of d.cells) if (Math.random() < 0.3) c.dirt = 0;
      if (!d.cells.some((c) => c.dirt > 0)) d.cells[0].dirt = 1;
    }
  },

  update(ctx, dt) {
    const d = ctx.data, s = ctx.sim, p = ctx.primary;
    // 蛇口
    d.pourer.phase = 0;
    d.pourer.update(ctx, dt, d.faucetOn, d.faucetX, 27, 0, 1, 2.5);
    // スポンジでこする
    if (d.tool === 'sponge' && p) {
      const sp = Math.hypot(p.vx, p.vy);
      if (sp > 25) {
        d.squeakT += dt;
        if (d.squeakT > 0.28) { d.squeakT = 0; ctx.sfx.squeak(); }
        for (const c of d.cells) {
          const wx = d.cx + c.ux * d.R, wy = d.cy + c.uy * d.R;
          if (Math.hypot(p.x - wx, p.y - wy) < 7) {
            if (c.soap < 1) { c.soap = Math.min(1, c.soap + dt * 2.4); ctx.backDirty(); }
          }
        }
        // 泡がでる
        if (Math.random() < dt * 22) {
          const hyp = Math.hypot(p.x - d.cx, p.y - d.cy);
          if (hyp < d.R + 8) ctx.fx.addFoam(p.x + rand(-3, 3), p.y + rand(-3, 3), rand(1, 2.2), rand(2, 5));
        }
      }
    }
    // 水で流す: 泡がついた汚れ + 皿の上面を流れる水 → 落ちる
    let cleaned = false;
    for (const c of d.cells) {
      if (c.dirt <= 0) continue;
      const wx = d.cx + c.ux * d.R, wy = d.cy + c.uy * d.R;
      if (c.soap > 0.5) {
        // 水は皿(円)の表面しか流れないので、セルの真上の円弧上でチェック
        const dx = clamp(wx - d.cx, -d.R * 0.94, d.R * 0.94);
        const arcY = d.cy - Math.sqrt(Math.max(1, d.R * d.R - dx * dx));
        const [vx, vy, w] = s.velocityAt(d.cx + dx, arcY - 1.8);
        if (w > 0.35 && Math.hypot(vx, vy) > 22) {
          c.dirt -= dt * 3.2;
          if (c.dirt <= 0) {
            c.dirt = 0;
            cleaned = true;
            if (Math.random() < 0.6) ctx.fx.addSpark(wx, wy, '#fff');
          }
        }
      }
    }
    if (cleaned) { ctx.backDirty(); ctx.sfx.drip(); }
    const dirty = d.cells.filter((c) => c.dirt > 0).length;
    const initial = d.initialDirty ?? (d.initialDirty = dirty);
    ctx.progress(initial ? (initial - dirty) / initial : 0);
    // ピカピカ演出
    if (dirty === 0) {
      d.sparkleT += dt;
      if (d.sparkleT > 0.4) {
        d.sparkleT = 0;
        ctx.fx.addSpark(d.cx + rand(-d.R, d.R) * 0.7, d.cy + rand(-d.R, d.R) * 0.5, '#fff');
      }
    }
  },

  onTool(ctx, id) {
    const d = ctx.data;
    if (id === 'water') {
      d.faucetOn = !d.faucetOn;
      ctx.toast(d.faucetOn ? '🚰 ジャーーー' : '🚰 きゅっ (とめた)');
      return;
    }
    d.tool = id;
    ctx.setToolActive(id);
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    tileWall(g, W, 0, H * 0.55);
    // シンク
    g.fillStyle = vgrad(g, H * 0.5, H, [[0, '#c3ccd4'], [1, '#9aa6b2']]);
    g.fillRect(0, H * 0.5, W, H * 0.5);
    g.fillStyle = 'rgba(70,80,95,0.35)';
    g.beginPath();
    g.ellipse(d.cx, H - 4, W * 0.3, 3, 0, 0, TAU);
    g.fill();
    // 蛇口 (トップバーの下に見えるように)
    g.fillStyle = '#aab4c0';
    rr(g, d.faucetX - 3, 0, 6, 24, 2);
    g.fill();
    rr(g, d.faucetX - 2.2, 22, 4.4, 4, 1.5);
    g.fill();
    g.fillStyle = '#c8d2dc';
    g.beginPath(); g.arc(d.faucetX, 18, 2, 0, TAU); g.fill();
    // お皿
    softShadow(g, d.cx, d.cy + d.R * 0.7, d.R * 1.05, d.R * 0.24, 0.2);
    const grd = g.createRadialGradient(d.cx - d.R * 0.3, d.cy - d.R * 0.3, d.R * 0.2, d.cx, d.cy, d.R);
    grd.addColorStop(0, '#ffffff');
    grd.addColorStop(0.8, '#eef0f4');
    grd.addColorStop(1, '#d8dce4');
    g.fillStyle = grd;
    g.beginPath(); g.arc(d.cx, d.cy, d.R, 0, TAU); g.fill();
    g.strokeStyle = '#c8cede'; g.lineWidth = 1;
    g.beginPath(); g.arc(d.cx, d.cy, d.R * 0.72, 0, TAU); g.stroke();
    g.strokeStyle = '#dde2ec';
    g.beginPath(); g.arc(d.cx, d.cy, d.R * 0.94, 0, TAU); g.stroke();
    // 汚れ
    for (const c of d.cells) {
      if (c.dirt <= 0) continue;
      const wx = d.cx + c.ux * d.R, wy = d.cy + c.uy * d.R;
      g.fillStyle = c.kind === 0
        ? `rgba(200,80,40,${0.65 * c.dirt})`   // ケチャップ
        : `rgba(160,120,40,${0.6 * c.dirt})`;  // カレー
      g.beginPath();
      g.arc(wx, wy, d.R / 9 * 0.95, 0, TAU);
      g.fill();
      if (c.soap > 0.3) {
        g.fillStyle = `rgba(255,255,255,${0.5 * c.soap})`;
        for (let i = 0; i < 3; i++) {
          g.beginPath();
          g.arc(wx + (i - 1) * 2, wy - 1 + (i % 2), 1.4, 0, TAU);
          g.fill();
        }
      }
    }
  },

  drawFront(ctx, g) {
    const d = ctx.data, p = ctx.primary;
    if (d.tool === 'sponge' && p) {
      g.save();
      g.translate(p.x, p.y);
      g.rotate(Math.sin(ctx.t * 10) * 0.06);
      g.fillStyle = '#ffd23e';
      rr(g, -6, -4, 12, 8, 2);
      g.fill();
      g.fillStyle = '#4ac06a';
      rr(g, -6, -6.5, 12, 3.5, 1.5);
      g.fill();
      g.fillStyle = 'rgba(200,160,30,0.5)';
      for (const [ox, oy] of [[-3, 0], [1, 2], [3, -1]]) {
        g.beginPath(); g.arc(ox, oy, 0.7, 0, TAU); g.fill();
      }
      g.restore();
    }
    // 蛇口の水流ガイド
    if (d.faucetOn) {
      g.fillStyle = 'rgba(200,230,250,0.25)';
      rr(g, d.faucetX - 1.6, 26, 3.2, 8, 1.5);
      g.fill();
    }
  },
};
