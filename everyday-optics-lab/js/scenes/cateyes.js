// シーン: 夜道の猫の目と反射板 (再帰反射 — 光はきた道を帰る)
// コーナーキューブ (90°鏡2枚) をレイトレーサで実演
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad, star } from '../engine/art.js';
import { drawFlashlight } from './common.js';

export default {
  id: 'cateyes',
  name: '夜道の猫の目',
  emoji: '🐱',
  desc: 'どこから照らしても 光る!',
  goal: '🎯 ライトを動かして 反射板・標識・猫の目 みんな光らせよう!',
  clearMsg: '再帰反射=光がそのまま帰ってくる!',
  spectrumN: 6,

  init(ctx) {
    const d = ctx.data;
    d.lit = { bike: 0, sign: 0, cat: 0 };
    ctx.setHint('🔦 をドラッグ。ふつうの鏡 (窓) とのちがいにも注目');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.floorY = Math.min(H - 14, H * 0.9);
    d.src = d.src ?? { x: W * 0.18, y: H * 0.55 };
    // ターゲット: 自転車の反射板 / 道路標識 / 猫の目 (それぞれコーナーキューブ)
    d.targets = [
      { id: 'bike', x: W * 0.62, y: d.floorY - 12, size: 4.2, label: '🚲', a: Math.PI },
      { id: 'sign', x: W * 0.86, y: H * 0.36, size: 4.5, label: '🛑', a: Math.PI },
      { id: 'cat', x: W * 0.8, y: d.floorY - 5, size: 3.2, label: '🐱', a: Math.PI },
    ];
    // ふつうの鏡 (家の窓)
    d.window = { x: W * 0.42, y: H * 0.3 };
  },

  _buildTracer(ctx) {
    const d = ctx.data, tr = ctx.tracer;
    tr.clear();
    // 各ターゲット = 90° コーナーキューブ (V字を光源方向へ向ける…のではなく固定!
    // 固定でも光が返るのが再帰反射のすごさ)
    for (const tg of d.targets) {
      const s = tg.size;
      // V字 (頂点が右、開口は左=ライト側に固定。固定でも光が返るのが再帰反射)
      const c = Math.SQRT1_2 * s;
      tr.add({ kind: 'mirror', ax: tg.x, ay: tg.y, bx: tg.x - c, by: tg.y - c, reflect: 0.97, tid: tg.id });
      tr.add({ kind: 'mirror', ax: tg.x, ay: tg.y, bx: tg.x - c, by: tg.y + c, reflect: 0.97, tid: tg.id });
    }
    // ふつうの鏡 (窓ガラス, 縦)
    tr.add({ kind: 'mirror', ax: d.window.x, ay: d.window.y - 6, bx: d.window.x, by: d.window.y + 6, reflect: 0.9, tid: 'win' });
    // 地面は吸収
    tr.add({ kind: 'absorber', ax: -5, ay: d.floorY + 1, bx: ctx.W + 5, by: d.floorY + 1 });
  },

  update(ctx, dt) {
    const d = ctx.data, p = ctx.primary;
    if (p) { d.src.x = clamp(p.x, 6, ctx.W * 0.5); d.src.y = clamp(p.y, 24, d.floorY - 4); }
    this._buildTracer(ctx);
    d.segs = [];
    // ライトから各ターゲットへ扇状にレイ
    const retHit = { bike: false, sign: false, cat: false, win: false };
    for (const tg of [...d.targets, { x: d.window.x, y: d.window.y }]) {
      const base = Math.atan2(tg.y - d.src.y, tg.x - d.src.x);
      const bdx = Math.cos(base), bdy = Math.sin(base);
      for (let k = -2; k <= 2; k++) {
        // 平行ビーム (垂直オフセット): 頂点ど真ん中 (縮退) を避けて鏡面の途中に当てる
        const off = k * 0.75;
        const segs = [];
        ctx.tracer.trace({ x: d.src.x - bdy * off, y: d.src.y + bdx * off, dx: bdx, dy: bdy, l: 575, I: 1.4 }, segs);
        // 再帰反射判定: 最後のセグメントが光源方向へ戻っているか
        const last = segs[segs.length - 1];
        if (last && segs.length >= 2) {
          const dx = last.x1 - last.x0, dy = last.y1 - last.y0;
          const len = Math.hypot(dx, dy) || 1;
          const tx = d.src.x - last.x0, ty = d.src.y - last.y0;
          const tlen = Math.hypot(tx, ty) || 1;
          const dot = (dx / len) * (tx / tlen) + (dy / len) * (ty / tlen);
          if (dot > 0.985) {
            // どのターゲットで反射した?
            for (const tg2 of d.targets) {
              if (Math.hypot(last.x0 - tg2.x, last.y0 - tg2.y) < tg2.size * 2.2) retHit[tg2.id] = true;
            }
            if (Math.hypot(last.x0 - d.window.x, last.y0 - d.window.y) < 8) retHit.win = true;
          }
        }
        d.segs.push(...segs);
      }
    }
    // 点灯ゲージ (再帰反射が起きている間たまる、ラッチ)
    let done = 0;
    for (const tg of d.targets) {
      if (retHit[tg.id]) {
        if (d.lit[tg.id] < 1) {
          d.lit[tg.id] = Math.min(1, d.lit[tg.id] + dt * 1.4);
          if (d.lit[tg.id] >= 1) {
            ctx.sfx.chime();
            ctx.toast(`${tg.label} が光った!べつの角度からも ためしてみて`);
          }
        }
      }
    }
    d.winGlow = retHit.win;
    for (const v of Object.values(d.lit)) if (v >= 1) done++;
    ctx.progress(done >= 3 ? 1 : Math.min(0.97, (d.lit.bike + d.lit.sign + d.lit.cat) / 3));
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    // 夜の住宅街
    g.fillStyle = vgrad(g, 0, H, [[0, '#0e1220'], [1, '#1a1e30']]);
    g.fillRect(0, 0, W, H);
    // 月と星
    g.fillStyle = '#f0ead0';
    g.beginPath(); g.arc(W * 0.12, 14, 3.4, 0, TAU); g.fill();
    g.fillStyle = '#0e1220';
    g.beginPath(); g.arc(W * 0.12 + 1.4, 13.4, 3, 0, TAU); g.fill();
    for (let k = 0; k < 20; k++) {
      g.fillStyle = `rgba(255,255,255,${0.3 + (k % 3) * 0.2})`;
      g.fillRect((k * 37 % 100) / 100 * W, (k * 53 % 100) / 100 * H * 0.3, 0.5, 0.5);
    }
    // 家 (窓=ふつうの鏡)
    g.fillStyle = '#242838';
    rr(g, d.window.x - 14, d.window.y - 12, 24, d.floorY - d.window.y + 12, 1.5);
    g.fill();
    g.fillStyle = '#161a28';
    rr(g, d.window.x - 1.5, d.window.y - 7, 3.5, 14, 1);
    g.fill();
    // 標識のポール
    g.fillStyle = '#3a4050';
    g.fillRect(d.targets[1].x - 0.7, d.targets[1].y, 1.4, d.floorY - d.targets[1].y);
    // 道
    g.fillStyle = '#22242e';
    g.fillRect(0, d.floorY, W, H - d.floorY);
    // 自転車 (シルエット)
    const b = d.targets[0];
    g.strokeStyle = '#3c4254';
    g.lineWidth = 1;
    g.beginPath();
    g.arc(b.x - 8, d.floorY - 6, 5.5, 0, TAU);
    g.moveTo(b.x + 3.5, d.floorY - 6);
    g.arc(b.x + 9, d.floorY - 6, 5.5, 0, TAU);
    g.moveTo(b.x - 8, d.floorY - 6);
    g.lineTo(b.x - 2, d.floorY - 14);
    g.lineTo(b.x + 6, d.floorY - 14);
    g.lineTo(b.x + 9, d.floorY - 6);
    g.stroke();
    // 猫のシルエット
    const c = d.targets[2];
    g.fillStyle = '#1c2030';
    g.beginPath();
    g.ellipse(c.x + 3, c.y + 1.5, 5, 3, 0, 0, TAU);
    g.fill();
    g.beginPath();
    g.arc(c.x, c.y - 0.5, 2.6, 0, TAU);
    g.fill();
    g.beginPath();
    g.moveTo(c.x - 2, c.y - 2); g.lineTo(c.x - 1.2, c.y - 4.4); g.lineTo(c.x - 0.2, c.y - 2.4);
    g.moveTo(c.x + 2, c.y - 2); g.lineTo(c.x + 1.2, c.y - 4.4); g.lineTo(c.x + 0.2, c.y - 2.4);
    g.fill();
  },

  drawFront(ctx, g) {
    const { W } = ctx, d = ctx.data;
    ctx.drawRays(g, d.segs, { gain: 0.85, glowWidth: 2 });
    // 再帰反射のかがやき
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (const tg of d.targets) {
      const v = d.lit[tg.id];
      if (v <= 0.02) continue;
      const grad = g.createRadialGradient(tg.x, tg.y, 0, tg.x, tg.y, tg.size * 3);
      const col = tg.id === 'cat' ? '120,255,160' : tg.id === 'sign' ? '255,120,100' : '255,180,80';
      grad.addColorStop(0, `rgba(${col},${0.9 * v})`);
      grad.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = grad;
      g.beginPath();
      g.arc(tg.x, tg.y, tg.size * 3, 0, TAU);
      g.fill();
      // 猫は目が2つ
      if (tg.id === 'cat') {
        g.fillStyle = `rgba(150,255,170,${v})`;
        g.beginPath(); g.arc(tg.x - 1, tg.y - 0.6, 0.55, 0, TAU); g.fill();
        g.beginPath(); g.arc(tg.x + 1, tg.y - 0.6, 0.55, 0, TAU); g.fill();
      }
    }
    if (d.winGlow) {
      g.fillStyle = 'rgba(200,220,255,0.3)';
      rr(g, d.window.x - 1.5, d.window.y - 7, 3.5, 14, 1);
      g.fill();
    }
    g.restore();
    // ライト
    const aim = Math.atan2(d.targets[0].y - d.src.y, d.targets[0].x - d.src.x);
    drawFlashlight(g, d.src.x, d.src.y, aim, 1.15);
    // メーター
    g.fillStyle = 'rgba(255,255,255,0.92)';
    rr(g, W - 40, 16, 38, 12, 3);
    g.fill();
    g.fillStyle = '#556';
    g.font = 'bold 2.6px sans-serif';
    const marks = ['🚲', '🛑', '🐱'];
    ['bike', 'sign', 'cat'].forEach((k, i) => {
      g.globalAlpha = 0.25 + d.lit[k] * 0.75;
      g.font = '4px sans-serif';
      g.fillText(marks[i], W - 37 + i * 11, 25);
      g.globalAlpha = 1;
    });
  },
};
