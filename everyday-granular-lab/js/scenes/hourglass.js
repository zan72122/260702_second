// シーン: 砂時計をひっくり返す
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad, softShadow } from '../engine/art.js';
import { SPRITES } from '../engine/grainRenderer.js';

export default {
  id: 'hourglass',
  name: '砂時計をひっくり返す',
  emoji: '⏳',
  desc: 'サラサラ…10びょう ぴったり?',
  clearMsg: 'じかんはかり名人!',
  goal: '🎯 ひっくり返して 砂をぜんぶ落としきろう!',
  maxParticles: 3400,
  rattlePitch: 1.4,

  init(ctx) {
    const d = ctx.data;
    d.flips = 0;
    d.timer = 0;
    d.running = false;
    d.doneShown = false;
    ctx.sim.defineMaterial(0, {
      r: 0.55, rJit: 0.06, mu: 0.55, vmax: 55, interlock: 2,
      sprite: SPRITES.SAND,
      colors: [[0.98, 0.75, 0.45], [0.95, 0.68, 0.38], [1, 0.82, 0.55]],
    });
    ctx.setTools([{ id: 'flip', icon: '🔄', label: 'ひっくり返す!' }]);
    ctx.setHint('「ひっくり返す!」で スタート。傾きセンサーONなら 端末をかたむけても遊べる');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    const s = ctx.sim;
    d.cx = W / 2;
    d.cy = H / 2;
    d.hw = Math.min(W * 0.3, 34);       // 胴の半幅
    d.hh = Math.min(H * 0.33, 62);      // 半高
    d.neck = 2.1;                        // くびれ半幅
    const { cx, cy, hw, hh, neck } = d;
    const r = 1.6;
    // ガラス: 上下の漏斗 (X 字に交差する 4 本) + 上下フタ + 胴の縦壁
    s.colliders.push(
      // 上室: 縦壁→漏斗
      { kind: 'capsule', ax: cx - hw, ay: cy - hh, bx: cx - hw, by: cy - hh * 0.45, r },
      { kind: 'capsule', ax: cx + hw, ay: cy - hh, bx: cx + hw, by: cy - hh * 0.45, r },
      { kind: 'capsule', ax: cx - hw, ay: cy - hh * 0.45, bx: cx - neck, by: cy - 1.2, r },
      { kind: 'capsule', ax: cx + hw, ay: cy - hh * 0.45, bx: cx + neck, by: cy - 1.2, r },
      // 下室
      { kind: 'capsule', ax: cx - neck, ay: cy + 1.2, bx: cx - hw, by: cy + hh * 0.45, r },
      { kind: 'capsule', ax: cx + neck, ay: cy + 1.2, bx: cx + hw, by: cy + hh * 0.45, r },
      { kind: 'capsule', ax: cx - hw, ay: cy + hh * 0.45, bx: cx - hw, by: cy + hh, r },
      { kind: 'capsule', ax: cx + hw, ay: cy + hh * 0.45, bx: cx + hw, by: cy + hh, r },
      // フタ
      { kind: 'capsule', ax: cx - hw, ay: cy - hh, bx: cx + hw, by: cy - hh, r },
      { kind: 'capsule', ax: cx - hw, ay: cy + hh, bx: cx + hw, by: cy + hh, r },
    );
    if (!d.filled) {
      d.filled = true;
      // 上室に砂 (漏斗形状を避けて台形に)
      const m = ctx.sim.mats[0];
      const sp = m.r * 2 * 1.05;
      let row = 0;
      for (let y = cy - 4; y > cy - hh + 3; y -= sp * 0.87, row++) {
        // その高さでの内側幅
        const t = (cy - y) / (hh * 0.55);
        const half = Math.min(hw - 2.5, neck + t * (hw - neck) - 1);
        if (half < 1) continue;
        for (let x = cx - half + (row % 2) * sp * 0.5; x < cx + half; x += sp) {
          ctx.sim.emit(x, y, 0, 0, 0, 0.1);
        }
      }
      d.total = ctx.sim.n;
    }
  },

  update(ctx, dt) {
    const d = ctx.data, s = ctx.sim;
    // 上室に残っている砂
    let up = 0;
    for (let i = 0; i < s.n; i++) if (s.y[i] < d.cy) up++;
    d.up = up;
    if (d.running) {
      d.timer += dt;
      // ときどき微振動 → 斜面で固まった砂を流す (本物の砂時計のアーチ崩し)
      d.wakeT = (d.wakeT || 0) + dt;
      if (d.wakeT > 1.2 && up > 0) {
        d.wakeT = 0;
        s.forEachInCircle(d.cx, d.cy - d.hh * 0.5, d.hw + 4, (i) => { s.rest[i] = 0; });
        s.impulse(d.cx, d.cy - 6, d.hw * 0.5, 0, 8);
      }
      const frac = 1 - up / Math.max(1, d.total);
      if (!ctx._cleared) ctx.progress(Math.min(0.98, frac));
      if (up <= d.total * 0.04 && !d.doneShown) {
        d.doneShown = true;
        d.running = false;
        ctx.progress(1);
        ctx.celebrate(`⏳ 落ちきった!タイムは ${d.timer.toFixed(1)} 秒!`);
      }
    }
    // 砂の流れのキラキラ
    if (Math.random() < dt * 8 && up > 0 && up < d.total) {
      ctx.fx.addSpark(d.cx + rand(-1.5, 1.5), d.cy + rand(-2, 4), '#ffdf9e');
    }
  },

  onTool(ctx, id) {
    if (id !== 'flip') return;
    const d = ctx.data, s = ctx.sim;
    // 中心点対称に全粒を回転 (=本体をひっくり返した)
    for (let i = 0; i < s.n; i++) {
      s.x[i] = 2 * d.cx - s.x[i];
      s.y[i] = 2 * d.cy - s.y[i];
      s.px[i] = s.x[i]; s.py[i] = s.y[i];
      s.vx[i] = 0; s.vy[i] = 0;
    }
    s.wakeAll();
    d.flips++;
    d.timer = 0;
    d.running = true;
    d.doneShown = false;
    ctx.toast('🔄 くるん!サラサラ…');
    ctx.sfx.pop(1.3);
    ctx.vibrate(30);
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    g.fillStyle = vgrad(g, 0, H, [[0, '#3d3a55'], [1, '#252238']]);
    g.fillRect(0, 0, W, H);
    // 本棚の雰囲気
    g.fillStyle = 'rgba(140,110,80,0.25)';
    for (const y of [H * 0.12, H * 0.85]) g.fillRect(0, y, W, 3);
    softShadow(g, d.cx, d.cy + d.hh + 6, d.hw * 1.4, 3, 0.3);
    // 木の枠
    g.fillStyle = '#8a5c34';
    rr(g, d.cx - d.hw - 6, d.cy - d.hh - 7, d.hw * 2 + 12, 6, 2.5); g.fill();
    rr(g, d.cx - d.hw - 6, d.cy + d.hh + 1, d.hw * 2 + 12, 6, 2.5); g.fill();
    // 支柱
    g.fillStyle = '#75492a';
    rr(g, d.cx - d.hw - 5, d.cy - d.hh - 3, 3.5, d.hh * 2 + 6, 1.5); g.fill();
    rr(g, d.cx + d.hw + 1.5, d.cy - d.hh - 3, 3.5, d.hh * 2 + 6, 1.5); g.fill();
    // ガラス面 (うっすら)
    g.fillStyle = 'rgba(190,220,240,0.10)';
    g.beginPath();
    g.moveTo(d.cx - d.hw, d.cy - d.hh);
    g.lineTo(d.cx + d.hw, d.cy - d.hh);
    g.lineTo(d.cx + d.hw, d.cy - d.hh * 0.45);
    g.lineTo(d.cx + d.neck, d.cy);
    g.lineTo(d.cx + d.hw, d.cy + d.hh * 0.45);
    g.lineTo(d.cx + d.hw, d.cy + d.hh);
    g.lineTo(d.cx - d.hw, d.cy + d.hh);
    g.lineTo(d.cx - d.hw, d.cy + d.hh * 0.45);
    g.lineTo(d.cx - d.neck, d.cy);
    g.lineTo(d.cx - d.hw, d.cy - d.hh * 0.45);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(200,230,250,0.55)';
    g.lineWidth = 1;
    g.stroke();
  },

  drawFront(ctx, g) {
    const d = ctx.data;
    // ガラスのつや
    g.fillStyle = 'rgba(255,255,255,0.13)';
    g.beginPath();
    g.moveTo(d.cx - d.hw + 3, d.cy - d.hh + 2);
    g.lineTo(d.cx - d.hw + 9, d.cy - d.hh + 2);
    g.lineTo(d.cx - d.neck - 1, d.cy - 1);
    g.lineTo(d.cx - d.neck - 4, d.cy - 1);
    g.closePath();
    g.fill();
    // タイマー表示
    g.fillStyle = 'rgba(255,255,255,0.92)';
    rr(g, 2, 16, 30, 13, 3);
    g.fill();
    g.fillStyle = '#4a3a80';
    g.font = 'bold 5.5px monospace';
    g.fillText(d.running || d.timer > 0 ? d.timer.toFixed(1) + 's' : '--.-s', 5, 24.5);
    g.fillStyle = '#889';
    g.font = '2.4px sans-serif';
    g.fillText(`のこり ${d.up ?? '-'} つぶ`, 5, 27.6);
  },
};
