// シーン: 金魚鉢のサイフォン水換え (水が上って流れる!)
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad, woodTable, softShadow, glassShine, eye } from '../engine/art.js';

export default {
  id: 'siphon',
  name: 'サイフォンで水換え',
  emoji: '🐟',
  desc: 'ホースの中を 水が上っていく!?',
  goal: '🎯 呼び水でサイフォンを動かして 金魚鉢の水を半分ぬこう!',
  clearMsg: '水換えかんりょう!金魚もよろこんでる!',
  maxParticles: 3000,
  view: { shine: 1.3, refract: 1.2 },
  tilt: false,

  init(ctx) {
    const d = ctx.data;
    d.primed = false;
    d.fish = { t: 0 };
    ctx.sim.definePhase(0, {
      sigma: 3, beta: 1.5, grav: 1, mix: 0,
      color: [0.5, 0.75, 0.88], alpha: 0.42,
    });
    ctx.setTools([{ id: 'prime', icon: '💧', label: 'よび水スタート!' }]);
    ctx.setHint('ホースに「よび水」を満たすと…水が高いところをこえて流れだす!');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    const s = ctx.sim;
    // 金魚鉢 (左・台の上) / バケツ (右・低い)
    d.bowlX = W * 0.28;
    d.bowlW = Math.min(W * 0.4, 46);
    d.bowlBottom = Math.min(H * 0.62, H - 60);
    d.bowlTop = d.bowlBottom - Math.min(H * 0.3, 52);
    d.bucketX = W * 0.78;
    d.bucketW = Math.min(W * 0.3, 34);
    d.bucketBottom = Math.min(H - 14, H * 0.92);
    d.bucketTop = d.bucketBottom - Math.min(H * 0.24, 40);
    ctx.addCup(d.bowlX, d.bowlTop, d.bowlBottom, d.bowlW, 1.8);
    ctx.addCup(d.bucketX, d.bucketTop, d.bucketBottom, d.bucketW, 1.6);
    // ホース経路 (鉢の中→上をこえて→バケツ)
    const apexY = d.bowlTop - 10;
    d.path = [
      [d.bowlX + d.bowlW * 0.25, d.bowlBottom - 4],
      [d.bowlX + d.bowlW * 0.25, apexY],
      [d.bowlX + d.bowlW / 2 + 14, apexY],
      [d.bucketX - 6, d.bucketTop - 8],
      [d.bucketX - 2, d.bucketTop + 4],
    ];
    // ホースの壁 (経路の両側)
    d.tubeR = 2.6;
    for (let k = 0; k < d.path.length - 1; k++) {
      const [x0, y0] = d.path[k], [x1, y1] = d.path[k + 1];
      const dx = x1 - x0, dy = y1 - y0;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      for (const sgn of [-1, 1]) {
        s.colliders.push({
          kind: 'capsule',
          ax: x0 + sgn * nx * d.tubeR, ay: y0 + sgn * ny * d.tubeR,
          bx: x1 + sgn * nx * d.tubeR, by: y1 + sgn * ny * d.tubeR,
          r: 1.0, noSolid: true,
        });
      }
    }
    if (!d.filled) {
      d.filled = true;
      ctx.fill(d.bowlX - d.bowlW / 2 + 2, d.bowlTop + 10, d.bowlX + d.bowlW / 2 - 2, d.bowlBottom - 2, 0);
      d.level0 = d.bowlTop + 10;
      d.targetLevel = d.bowlTop + (d.bowlBottom - d.bowlTop) * 0.55;
    }
  },

  update(ctx, dt) {
    const d = ctx.data, s = ctx.sim;
    // サイフォンの流れ: チューブ内の粒子を経路に沿って押す
    if (d.primed) {
      let inTube = 0;
      for (let k = 0; k < d.path.length - 1; k++) {
        const [x0, y0] = d.path[k], [x1, y1] = d.path[k + 1];
        const dx = x1 - x0, dy = y1 - y0;
        const len = Math.hypot(dx, dy) || 1;
        const tx = dx / len, ty = dy / len;
        const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
        s.forEachInCircle(mx, my, len / 2 + 3, (i) => {
          // セグメントの近くだけ
          const px = s.x[i] - x0, py = s.y[i] - y0;
          const t = clamp((px * tx + py * ty) / len, 0, 1);
          const qx = x0 + tx * len * t, qy = y0 + ty * len * t;
          if ((s.x[i] - qx) ** 2 + (s.y[i] - qy) ** 2 < d.tubeR * d.tubeR * 1.2) {
            s.vx[i] += tx * 260 * dt;
            s.vy[i] += ty * 260 * dt;
            inTube++;
          }
        });
      }
      if (inTube < 4) {
        // 空気が入って止まった
        d.primed = false;
        ctx.toast('💨 ホースが空になって 流れが止まった');
      }
      ctx.sfx.setPour(inTube > 4 ? 0.4 : 0, 0.8);
    } else ctx.sfx.setPour(0);

    // 金魚: 水の中を泳ぐ
    const f = d.fish;
    f.t += dt;
    const waterLevel = this._bowlLevel(ctx);
    d.level = waterLevel;
    const swimTop = Math.min(waterLevel + 6, d.bowlBottom - 8);
    f.x = d.bowlX + Math.sin(f.t * 0.8) * d.bowlW * 0.26;
    f.y = clamp(swimTop + 6 + Math.sin(f.t * 1.7) * 5, swimTop, d.bowlBottom - 5);
    f.dir = Math.cos(f.t * 0.8) > 0 ? 1 : -1;

    // 進捗: 鉢の水位が半分まで下がったら
    const prog = clamp((waterLevel - d.level0) / (d.targetLevel - d.level0), 0, 1);
    ctx.progress(prog >= 1 ? 1 : Math.min(0.97, prog));
  },

  _bowlLevel(ctx) {
    const d = ctx.data, s = ctx.sim;
    // ホースの縦管 (鉢の中を通る) の中の水は水面とみなさない
    const legX = d.path[0][0];
    let level = d.bowlBottom;
    for (let i = 0; i < s.n; i++) {
      if (Math.abs(s.x[i] - legX) < d.tubeR + 2) continue;
      if (s.y[i] < d.bowlTop - 1) continue;
      if (Math.abs(s.x[i] - d.bowlX) < d.bowlW / 2 - 2 && s.y[i] < level) level = s.y[i];
    }
    return level;
  },

  onTool(ctx, id) {
    if (id !== 'prime') return;
    const d = ctx.data, s = ctx.sim;
    if (d.primed) { ctx.toast('もう流れてるよ!'); return; }
    // よび水: チューブ内を水で満たす (これが本物のサイフォンの始動法!)
    for (let k = 0; k < d.path.length - 1; k++) {
      const [x0, y0] = d.path[k], [x1, y1] = d.path[k + 1];
      const len = Math.hypot(x1 - x0, y1 - y0);
      const n = Math.ceil(len / 1.5);
      for (let j = 0; j <= n; j++) {
        const t = j / n;
        ctx.pour(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, 0, 0, 0);
      }
    }
    d.primed = true;
    ctx.sfx.splash(0.5);
    ctx.toast('💧 よび水オン!サイフォンが うごきだす…');
    ctx.vibrate(20);
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    g.fillStyle = vgrad(g, 0, H, [[0, '#eef4f8'], [1, '#dce8f0']]);
    g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,0.9)';
    rr(g, 4, 16, Math.min(44, W * 0.4), 20, 3);
    g.fill();
    g.fillStyle = '#38708a';
    g.font = 'bold 3.2px sans-serif';
    g.fillText('サイフォンの原理', 7, 22);
    g.font = '2.6px sans-serif';
    g.fillText('水面の高低差があれば', 7, 27);
    g.fillText('山をこえて流れる', 7, 31);
    woodTable(g, W, d.bucketBottom + 4, H, 1);
    // 金魚鉢の台
    g.fillStyle = '#a2703e';
    rr(g, d.bowlX - d.bowlW / 2 - 6, d.bowlBottom + 2, d.bowlW + 12, d.bucketBottom - d.bowlBottom + 2, 2);
    g.fill();
    g.fillStyle = 'rgba(120,80,40,0.4)';
    for (let y = d.bowlBottom + 8; y < d.bucketBottom; y += 8) {
      g.fillRect(d.bowlX - d.bowlW / 2 - 4, y, d.bowlW + 8, 1);
    }
    // 金魚鉢 (丸ガラス風)
    softShadow(g, d.bowlX, d.bowlBottom + 3, d.bowlW * 0.7, 2.5, 0.18);
    g.fillStyle = 'rgba(210,235,250,0.2)';
    rr(g, d.bowlX - d.bowlW / 2 - 2.5, d.bowlTop - 4, d.bowlW + 5, d.bowlBottom - d.bowlTop + 7, 6);
    g.fill();
    g.strokeStyle = 'rgba(160,200,230,0.85)';
    g.lineWidth = 1.2;
    rr(g, d.bowlX - d.bowlW / 2 - 2.5, d.bowlTop - 4, d.bowlW + 5, d.bowlBottom - d.bowlTop + 7, 6);
    g.stroke();
    glassShine(g, d.bowlX - d.bowlW / 2, d.bowlTop, d.bowlW, d.bowlBottom - d.bowlTop - 4);
    // 水草と砂利
    g.fillStyle = '#4a9a5a';
    for (const ox of [-d.bowlW * 0.3, d.bowlW * 0.32]) {
      g.beginPath();
      g.moveTo(d.bowlX + ox, d.bowlBottom - 1);
      g.quadraticCurveTo(d.bowlX + ox - 3, d.bowlBottom - 10, d.bowlX + ox - 1, d.bowlBottom - 16);
      g.quadraticCurveTo(d.bowlX + ox + 2, d.bowlBottom - 9, d.bowlX + ox + 1, d.bowlBottom - 1);
      g.fill();
    }
    // バケツ
    softShadow(g, d.bucketX, d.bucketBottom + 3, d.bucketW * 0.8, 2.5, 0.16);
    g.fillStyle = vgrad(g, d.bucketTop - 2, d.bucketBottom + 3, [[0, '#68a0c8'], [1, '#4a80a8']]);
    g.beginPath();
    g.moveTo(d.bucketX - d.bucketW / 2 - 3, d.bucketTop - 2);
    g.lineTo(d.bucketX - d.bucketW / 2 + 1, d.bucketBottom + 3);
    g.lineTo(d.bucketX + d.bucketW / 2 - 1, d.bucketBottom + 3);
    g.lineTo(d.bucketX + d.bucketW / 2 + 3, d.bucketTop - 2);
    g.closePath();
    g.fill();
    // ホース
    g.strokeStyle = 'rgba(120,200,140,0.65)';
    g.lineWidth = d.tubeR * 2 + 2;
    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.beginPath();
    d.path.forEach(([x, y], k) => (k === 0 ? g.moveTo(x, y) : g.lineTo(x, y)));
    g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.25)';
    g.lineWidth = 1.2;
    g.beginPath();
    d.path.forEach(([x, y], k) => (k === 0 ? g.moveTo(x, y) : g.lineTo(x, y)));
    g.stroke();
    // 目標ライン
    g.strokeStyle = 'rgba(230,90,90,0.85)';
    g.lineWidth = 0.8;
    g.setLineDash([2.5, 2]);
    g.beginPath();
    g.moveTo(d.bowlX - d.bowlW / 2 - 6, d.targetLevel ?? 0);
    g.lineTo(d.bowlX + d.bowlW / 2 + 6, d.targetLevel ?? 0);
    g.stroke();
    g.setLineDash([]);
    g.fillStyle = '#e85a5a';
    g.font = 'bold 3px sans-serif';
    g.fillText('ここまでぬく', d.bowlX - d.bowlW / 2 - 4, (d.targetLevel ?? 0) - 2);
  },

  drawFront(ctx, g) {
    const d = ctx.data;
    // 金魚
    const f = d.fish;
    if (f && f.x !== undefined) {
      g.save();
      g.translate(f.x, f.y);
      g.scale(-(f.dir || 1), 1);
      const wag = Math.sin(f.t * 8) * 0.6;
      g.fillStyle = '#ff6a3c';
      g.beginPath();
      g.moveTo(2.5, 0);
      g.quadraticCurveTo(5.5, wag - 2.4, 6.5, wag - 2.8);
      g.quadraticCurveTo(5.2, wag, 6.5, wag + 2.8);
      g.quadraticCurveTo(5.5, wag + 2.4, 2.5, 0);
      g.fill();
      g.beginPath();
      g.ellipse(0, 0, 3.6, 2.3, 0, 0, TAU);
      g.fill();
      eye(g, -2.2, -0.6, 0.6, -0.4);
      g.restore();
    }
  },
};
