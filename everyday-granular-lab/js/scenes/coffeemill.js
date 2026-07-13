// シーン: コーヒーミルで豆を挽く (豆→粉の粒度変化)
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad, woodTable, softShadow, glassShine } from '../engine/art.js';
import { SPRITES } from '../engine/grainRenderer.js';
import { levelProgress } from './common.js';

export default {
  id: 'coffeemill',
  name: 'コーヒーミルで挽く',
  emoji: '☕',
  desc: 'ガリガリ… 豆が粉にかわっていく',
  goal: '🎯 豆を挽いて 粉を目盛りまで ためよう!',
  clearMsg: 'いいかおり!淹れごろの粉!',
  maxParticles: 3800,
  tilt: false,
  rattlePitch: 0.7,

  init(ctx) {
    const d = ctx.data;
    d.crankAng = 0;
    d.grinding = 0;
    ctx.sim.defineMaterial(0, { // コーヒー豆
      r: 1.5, rJit: 0.15, mu: 0.5, interlock: 0.8, vmax: 90, sleepK: 0.7,
      sprite: SPRITES.BEAN, colors: [[0.62, 0.42, 0.28], [0.55, 0.36, 0.22], [0.68, 0.48, 0.32]],
      stretch: 1.2,
    });
    ctx.sim.defineMaterial(1, { // 挽いた粉
      r: 0.55, rJit: 0.06, mu: 0.9, interlock: 3, vmax: 38,
      sprite: SPRITES.SAND, colors: [[0.42, 0.28, 0.18], [0.36, 0.23, 0.14], [0.48, 0.33, 0.22]],
    });
    ctx.setTools([
      { id: 'crank', icon: '🔄', label: 'ハンドルをまわす!' },
      { id: 'beans', icon: '🫘', label: '豆をたす' },
    ]);
    ctx.setHint('ハンドルをまわすと ガリガリ…豆が粉になって下にたまるよ');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.cx = W / 2;
    // 上: ホッパー (豆) / 中: 刃 / 下: 粉受けジャー
    d.hopperW = Math.min(W * 0.44, 46);
    d.burrY = Math.max(H * 0.42, 58);
    d.hopperTop = d.burrY - Math.min(H * 0.24, 38);
    d.jarW = Math.min(W * 0.4, 42);
    d.jarBottom = Math.min(H - 14, H * 0.9);
    d.jarTop = d.burrY + 14;
    d.lineY = d.jarBottom - (d.jarBottom - d.jarTop) * 0.32;
    const s = ctx.sim;
    // ホッパー (漏斗)
    s.colliders.push(
      { kind: 'capsule', ax: d.cx - d.hopperW / 2, ay: d.hopperTop, bx: d.cx - 5, by: d.burrY - 3, r: 1.4, mu: 0.3 },
      { kind: 'capsule', ax: d.cx + d.hopperW / 2, ay: d.hopperTop, bx: d.cx + 5, by: d.burrY - 3, r: 1.4, mu: 0.3 },
    );
    // 刃 (ゲート: まわしている間だけ通す)
    d.gate = { kind: 'capsule', ax: d.cx - 5, ay: d.burrY - 2, bx: d.cx + 5, by: d.burrY - 2, r: 1.3, mu: 0.3 };
    s.colliders.push(d.gate);
    // 粉ジャー
    ctx.addCup(d.cx, d.jarTop, d.jarBottom, d.jarW, 1.8);
    if (!d.filled) {
      d.filled = true;
      this._addBeans(ctx, 130);
    }
  },

  _addBeans(ctx, n) {
    const d = ctx.data;
    for (let k = 0; k < n; k++) {
      ctx.sim.emit(
        d.cx + rand(-d.hopperW / 2 + 4, d.hopperW / 2 - 4),
        rand(d.hopperTop - 16, d.hopperTop + 8),
        0, 10, 0,
      );
    }
  },

  update(ctx, dt) {
    const d = ctx.data, s = ctx.sim;
    if (d.grinding > 0) {
      d.grinding -= dt;
      d.crankAng += dt * 8;
      // ミルの振動でホッパーの豆のアーチ (目詰まり) を崩す (間欠・弱め)
      d.jiggleT = (d.jiggleT || 0) + dt;
      if (d.jiggleT > 0.18) {
        d.jiggleT = 0;
        s.impulse(d.cx, d.burrY - 7, 7, (Math.random() - 0.5) * 14, 8);
      }
      // 刃の近くの豆を粉にする
      const kills = [];
      s.forEachInCircle(d.cx, d.burrY - 4, 5.5, (i) => {
        if (s.mat[i] === 0) kills.push(i);
      });
      kills.sort((a, b) => b - a);
      let ground = 0;
      for (const i of kills.slice(0, 3)) {
        const bx = s.x[i];
        s.kill(i);
        ground++;
        d.grinding = Math.max(d.grinding, 0.2);
        // 1粒の豆 → 9粒の粉が刃の下から出る
        for (let k = 0; k < 9; k++) {
          s.emit(d.cx + rand(-2.5, 2.5), d.burrY + rand(2, 5), rand(-8, 8), rand(15, 30), 1);
        }
      }
      if (ground > 0) {
        ctx.sfx.setRattle(0.7, 0.5);
        if (Math.random() < 0.5) ctx.sfx.zaku();
        ctx.fx.addDust(d.cx, d.burrY + 6, 2, '120,85,55');
      }
      d.gate.off = true;
    } else {
      d.gate.off = false;
      ctx.sfx.setRattle(0, 0.5);
    }
    // 粉の量 (目盛りに届いたら OK)
    const top = Math.min(s.topAt(d.cx - 6, 3), s.topAt(d.cx, 3), s.topAt(d.cx + 6, 3));
    const frac = clamp(1 - Math.max(0, top - d.lineY) / (d.jarBottom - d.lineY), 0, 1);
    ctx.progress(top <= d.lineY + 3 ? 1 : Math.min(0.95, frac * 0.95));
  },

  onTool(ctx, id) {
    const d = ctx.data;
    if (id === 'crank') {
      d.grinding = 0.7;
      ctx.sfx.ratchet();
      ctx.vibrate(20);
      return;
    }
    if (id === 'beans') {
      if (ctx.sim.countMat(0) < 200) {
        this._addBeans(ctx, 60);
        ctx.sfx.pop(0.9);
        ctx.toast('🫘 豆を追加!');
      }
    }
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    g.fillStyle = vgrad(g, 0, H, [[0, '#6d5344'], [1, '#4e3a2f']]);
    g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,220,160,0.12)';
    for (let i = 0; i < 3; i++) { rr(g, W * (0.12 + i * 0.3), 6, W * 0.18, 22, 3); g.fill(); }
    woodTable(g, W, d.jarBottom + 5, H, 0);
    softShadow(g, d.cx, d.jarBottom + 5, d.jarW, 3, 0.25);
    // ミル本体 (木の箱)
    g.fillStyle = '#8a5c34';
    rr(g, d.cx - d.hopperW / 2 - 5, d.burrY - 6, d.hopperW + 10, 16, 3);
    g.fill();
    g.fillStyle = '#75492a';
    rr(g, d.cx - d.hopperW / 2 - 5, d.burrY + 6, d.hopperW + 10, 4, 2);
    g.fill();
    // ホッパー (金属の漏斗)
    g.fillStyle = 'rgba(200,205,215,0.5)';
    g.beginPath();
    g.moveTo(d.cx - d.hopperW / 2 - 2, d.hopperTop - 2);
    g.lineTo(d.cx - 3, d.burrY - 4);
    g.lineTo(d.cx + 3, d.burrY - 4);
    g.lineTo(d.cx + d.hopperW / 2 + 2, d.hopperTop - 2);
    g.closePath();
    g.fill();
    g.strokeStyle = '#c8ccd8';
    g.lineWidth = 1;
    g.stroke();
    // 粉ジャー (ガラス)
    g.fillStyle = 'rgba(210,235,250,0.15)';
    rr(g, d.cx - d.jarW / 2 - 2.6, d.jarTop, d.jarW + 5.2, d.jarBottom - d.jarTop + 4, 3);
    g.fill();
    g.strokeStyle = 'rgba(200,225,245,0.6)';
    g.lineWidth = 1;
    rr(g, d.cx - d.jarW / 2 - 2.6, d.jarTop, d.jarW + 5.2, d.jarBottom - d.jarTop + 4, 3);
    g.stroke();
    glassShine(g, d.cx - d.jarW / 2, d.jarTop + 4, d.jarW, d.jarBottom - d.jarTop - 8);
    // 目盛りライン
    g.strokeStyle = 'rgba(230,90,90,0.85)';
    g.lineWidth = 0.9;
    g.setLineDash([2.5, 1.8]);
    g.beginPath();
    g.moveTo(d.cx - d.jarW / 2 - 7, d.lineY);
    g.lineTo(d.cx + d.jarW / 2 + 7, d.lineY);
    g.stroke();
    g.setLineDash([]);
    g.fillStyle = '#ff9a9a';
    g.font = 'bold 3.2px sans-serif';
    g.fillText('2はい分', d.cx + d.jarW / 2 + 8, d.lineY + 1);
  },

  drawFront(ctx, g) {
    const d = ctx.data;
    // 挽いている時の香り (湯気)
    if (d.grinding > 0 && Math.random() < 0.2) {
      ctx.fx.addSteam(d.cx + rand(-8, 8), d.burrY - 10, rand(2, 3));
    }
    // ハンドル
    g.save();
    g.translate(d.cx, d.burrY - 8);
    g.rotate(d.crankAng);
    g.strokeStyle = '#3a3a42';
    g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(13, -6); g.stroke();
    g.fillStyle = '#c8a052';
    g.beginPath(); g.arc(13, -6, 2.6, 0, TAU); g.fill();
    g.fillStyle = '#3a3a42';
    g.beginPath(); g.arc(0, 0, 2.2, 0, TAU); g.fill();
    g.restore();
  },
};
