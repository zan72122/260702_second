// シーン: オムライスにケチャップでおえかき
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, softShadow, vgrad, woodTable } from '../engine/art.js';
import { StainMap } from './common.js';

export default {
  id: 'ketchup',
  name: 'オムライスにケチャップ',
  emoji: '🍳',
  desc: 'もったりケチャップで おえかき',
  goal: '🎯 ケチャップで じゆうに おえかきしよう!',
  clearMsg: 'せかいにひとつのオムライス!',
  maxParticles: 1600,
  view: { shine: 1.2, refract: 0.4 },
  tilt: false,

  init(ctx) {
    const d = ctx.data;
    d.acc = 0;
    d.drawn = 0;
    d.deco = [];
    ctx.sim.definePhase(0, { // ケチャップ (超粘性)
      sigma: 95, beta: 12, grav: 1.0, mix: 0.2,
      color: [0.83, 0.19, 0.13], alpha: 0.97,
    });
    ctx.setTools([
      { id: 'parsley', icon: '🌿', label: 'パセリ' },
      { id: 'flag', icon: '🚩', label: 'はた' },
      { id: 'done', icon: '✅', label: 'かんせい!' },
    ]);
    ctx.setHint('オムライスの上を なぞって おえかき!とまった ケチャップは そのまま のこるよ');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data, s = ctx.sim;
    d.cx = W / 2;
    d.ry = Math.min(H * 0.16, 26);
    d.rx = Math.min(W * 0.38, 46);
    d.cy = Math.min(H * 0.55, H - d.ry - 30);
    d.plateY = d.cy + d.ry + 6;
    // オムライス: 横向きカプセル
    s.colliders.push({ kind: 'capsule', ax: d.cx - d.rx + d.ry, ay: d.cy, bx: d.cx + d.rx - d.ry, by: d.cy, r: d.ry });
    // お皿
    s.colliders.push({ kind: 'capsule', ax: d.cx - d.rx - 14, ay: d.plateY, bx: d.cx + d.rx + 14, by: d.plateY, r: 1.6 });
    if (!d.stain) d.stain = new StainMap(W, H, 2.5);
  },

  update(ctx, dt) {
    const d = ctx.data, s = ctx.sim, p = ctx.primary;
    // 描く (指先がノズル)
    if (p) {
      d.acc += 42 * dt;
      while (d.acc >= 1) {
        d.acc -= 1;
        ctx.pour(p.x + rand(-0.8, 0.8), p.y, 0, 26, 0);
      }
      ctx.sfx.setPour(0.35, 0.4);
    } else {
      d.acc = 0;
      ctx.sfx.setPour(0);
    }
    // 落ち着いたケチャップ → 染みとして定着
    let stamped = false;
    for (let i = s.n - 1; i >= 0; i--) {
      if (s.rest[i] > 1.5 && s.age[i] > 2) {
        d.stain.stamp(s.x[i], s.y[i], rand(1.3, 1.9), 'rgba(202,38,24,0.92)');
        d.drawn++;
        s.kill(i);
        stamped = true;
      }
    }
    if (stamped) ctx.backDirty();
    ctx.progress(clamp(d.drawn / 420, 0, 0.99)); // 完成ボタンでクリア
  },

  onTool(ctx, id) {
    const d = ctx.data;
    if (id === 'done') {
      if (d.drawn + ctx.sim.n > 130) {
        ctx.progress(1);
        ctx.celebrate('🎨 かんせい!せかいにひとつのオムライス!');
      } else {
        ctx.toast('まだ まっしろ!もっと かいてみよう');
      }
      return;
    }
    if (d.deco.length > 14) return;
    if (id === 'parsley') {
      d.deco.push({ kind: 'parsley', x: d.cx + rand(-d.rx * 0.8, d.rx * 0.8), y: d.cy - d.ry * rand(0.3, 0.8), s: rand(2, 3) });
      ctx.toast('🌿 パセリ!');
    } else if (id === 'flag') {
      d.deco.push({ kind: 'flag', x: d.cx + rand(-d.rx * 0.5, d.rx * 0.5), y: d.cy - d.ry, s: 1 });
      ctx.toast('🚩 おこさまランチ風!');
    }
    ctx.backDirty();
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    g.fillStyle = vgrad(g, 0, H, [[0, '#fdeeea'], [1, '#fbdcd2']]);
    g.fillRect(0, 0, W, H);
    // チェックのテーブルクロス
    woodTable(g, W, d.plateY + 4, H, 1);
    g.fillStyle = 'rgba(230,90,80,0.14)';
    for (let x = 0; x < W; x += 12) g.fillRect(x, 0, 6, d.plateY + 4);
    for (let y = 0; y < d.plateY + 4; y += 12) g.fillRect(0, y, W, 6);
    // お皿
    softShadow(g, d.cx, d.plateY + 4, d.rx + 20, 3.5, 0.15);
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.ellipse(d.cx, d.plateY, d.rx + 18, 5.5, 0, 0, TAU);
    g.fill();
    g.strokeStyle = '#f0c8d8'; g.lineWidth = 0.8;
    g.beginPath();
    g.ellipse(d.cx, d.plateY - 0.6, d.rx + 13, 4, 0, 0, TAU);
    g.stroke();
    // オムライス本体
    const grd = g.createLinearGradient(0, d.cy - d.ry, 0, d.cy + d.ry);
    grd.addColorStop(0, '#ffd94e');
    grd.addColorStop(0.65, '#f5b93a');
    grd.addColorStop(1, '#e8a030');
    g.fillStyle = grd;
    rr(g, d.cx - d.rx, d.cy - d.ry, d.rx * 2, d.ry * 2, d.ry);
    g.fill();
    // 卵のつや
    g.fillStyle = 'rgba(255,245,200,0.55)';
    g.beginPath();
    g.ellipse(d.cx - d.rx * 0.25, d.cy - d.ry * 0.5, d.rx * 0.45, d.ry * 0.3, -0.08, 0, TAU);
    g.fill();
    // 定着したケチャップ
    d.stain.drawTo(g, 0, 0);
    // デコ
    for (const dec of d.deco) {
      if (dec.kind === 'parsley') {
        g.fillStyle = '#3f7d3a';
        for (let i = 0; i < 5; i++) {
          const a = i / 5 * TAU;
          g.beginPath();
          g.arc(dec.x + Math.cos(a) * dec.s * 0.8, dec.y + Math.sin(a) * dec.s * 0.5, dec.s * 0.6, 0, TAU);
          g.fill();
        }
      } else {
        g.strokeStyle = '#8a6a4a'; g.lineWidth = 0.7;
        g.beginPath(); g.moveTo(dec.x, dec.y + 2); g.lineTo(dec.x, dec.y - 10); g.stroke();
        g.fillStyle = '#e8433a';
        g.beginPath();
        g.moveTo(dec.x, dec.y - 10);
        g.lineTo(dec.x + 9, dec.y - 7.5);
        g.lineTo(dec.x, dec.y - 5);
        g.closePath(); g.fill();
      }
    }
  },

  drawFront(ctx, g) {
    const p = ctx.primary;
    if (!p) return;
    // ケチャップボトル
    g.save();
    g.translate(p.x, p.y - 1);
    g.rotate(Math.sin(ctx.t * 7) * 0.04);
    g.fillStyle = '#e8e8e8';
    g.beginPath();
    g.moveTo(-0.9, 1); g.lineTo(0.9, 1); g.lineTo(1.6, 5); g.lineTo(-1.6, 5);
    g.closePath(); g.fill();
    g.fillStyle = '#d8281c';
    rr(g, -5, -18, 10, 23, 4.5);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.85)';
    rr(g, -3.4, -13, 6.8, 9, 1.5);
    g.fill();
    g.fillStyle = '#d8281c';
    g.font = 'bold 3.2px sans-serif';
    g.textAlign = 'center';
    g.fillText('🍅', 0, -7);
    g.restore();
  },
};
