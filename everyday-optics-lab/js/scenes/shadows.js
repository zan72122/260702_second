// シーン: 影のふしぎ (本影・半影・色つき影)
// 壁を1Dスキャンして 面光源の見える割合 → 影の濃さと色を実計算
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad } from '../engine/art.js';

export default {
  id: 'shadows',
  name: '影のふしぎ',
  emoji: '🕳️',
  desc: 'ぼんやり影と 色つき影',
  goal: '🎯 大きなライトで「半影」、赤+青ライトで「色つき影」を観察しよう!',
  clearMsg: '影は「光がとどかない場所」— 光源しだいで七変化!',
  spectrumN: 6,

  init(ctx) {
    const d = ctx.data;
    d.mode = 'one';       // one | two
    d.lampSize = 2;
    d.sawPenumbra = 0;
    d.sawColor = 0;
    ctx.setTools([
      { id: 'size', icon: '💡', label: 'ライトを大きく/小さく' },
      { id: 'two', icon: '🔴🔵', label: '赤+青ライトにする' },
    ]);
    ctx.setHint('クマちゃんをドラッグで動かせる。影のふちに注目!');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.wallY = Math.min(H * 0.62, H - 84);   // 影のうつる床ライン
    d.lampY = H * 0.24;
    d.bear = d.bear ?? { x: W * 0.5, y: (d.lampY + d.wallY) / 2 + 8 };
    d.bearR = 6;
    d.bins = 100;
  },

  update(ctx, dt) {
    const d = ctx.data, W = ctx.W, p = ctx.primary;
    if (p) {
      d.bear.x = clamp(p.x, 12, W - 12);
      d.bear.y = clamp(p.y, d.lampY + 14, d.wallY - 10);
    }
    // ランプ構成
    const lamps = d.mode === 'one'
      ? [{ x: W * 0.5, col: [1, 0.95, 0.85], size: d.lampSize }]
      : [{ x: W * 0.32, col: [1, 0.25, 0.2], size: 2 }, { x: W * 0.68, col: [0.25, 0.45, 1], size: 2 }];
    d.lamps = lamps;
    // 壁 (床) を 1D スキャン: 各点から各ランプの見える割合
    const shade = [];
    for (let i = 0; i < d.bins; i++) {
      const x = (i / (d.bins - 1)) * W;
      let r = 0.06, g2 = 0.06, b = 0.08; // 環境光
      for (const lp of lamps) {
        // ランプ (幅 size) 上の 7 サンプルのうち クマに遮られない割合
        let vis = 0;
        const N = 7;
        for (let k = 0; k < N; k++) {
          const lx = lp.x + ((k / (N - 1)) - 0.5) * lp.size * 6;
          // 線分 (lx,lampY)→(x,wallY) とクマ円の交差
          const dx = x - lx, dy = d.wallY - d.lampY;
          const len2 = dx * dx + dy * dy;
          const t = clamp(((d.bear.x - lx) * dx + (d.bear.y - d.lampY) * dy) / len2, 0, 1);
          const px2 = lx + dx * t, py2 = d.lampY + dy * t;
          if (Math.hypot(d.bear.x - px2, d.bear.y - py2) > d.bearR) vis++;
        }
        vis /= N;
        r += lp.col[0] * vis * 0.85;
        g2 += lp.col[1] * vis * 0.85;
        b += lp.col[2] * vis * 0.85;
      }
      shade.push([r, g2, b]);
    }
    d.shade = shade;
    // 観察判定
    if (d.mode === 'one' && d.lampSize >= 5) {
      // 半影: 遮蔽率が中間の帯があるか
      let mid = 0;
      for (const [r] of shade) if (r > 0.25 && r < 0.7) mid++;
      if (mid >= 6) {
        d.sawPenumbra = Math.min(1, d.sawPenumbra + dt * 0.6);
        if (d.sawPenumbra >= 1 && !d.saidP) { d.saidP = true; ctx.sfx.chime(); ctx.toast('🌗 ふちがぼんやり=半影 (光源の一部だけ見える場所)'); }
      }
    }
    if (d.mode === 'two') {
      // 色つき影: 赤だけ/青だけ遮られた帯
      let redSh = 0, bluSh = 0;
      for (const [r, , b] of shade) {
        if (r < 0.4 && b > 0.6) bluSh++;
        if (b < 0.4 && r > 0.6) redSh++;
      }
      if (redSh >= 3 && bluSh >= 3) {
        d.sawColor = Math.min(1, d.sawColor + dt * 0.6);
        if (d.sawColor >= 1 && !d.saidC) { d.saidC = true; ctx.sfx.chime(); ctx.toast('🔴🔵 影が2つ!それぞれ「欠けた色」の反対色に!'); }
      }
    }
    ctx.progress(Math.min(1, (d.sawPenumbra + d.sawColor) / 2));
  },

  onTool(ctx, id) {
    const d = ctx.data;
    if (id === 'size') {
      d.lampSize = d.lampSize >= 5 ? 2 : 7;
      d.mode = 'one';
      ctx.toast(d.lampSize >= 5 ? '💡 大きな面ライト → 影のふちに注目' : '💡 小さな点ライト → 影がくっきり');
    }
    if (id === 'two') {
      d.mode = d.mode === 'two' ? 'one' : 'two';
      ctx.toast(d.mode === 'two' ? '🔴🔵 2色ライトON!影は何色になる?' : '💡 1灯にもどした');
    }
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    g.fillStyle = vgrad(g, 0, H, [[0, '#2a2536'], [1, '#1c1826']]);
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#3a3448';
    g.fillRect(0, d.wallY + 14, W, H - d.wallY);
  },

  drawFront(ctx, g) {
    const { W } = ctx, d = ctx.data;
    if (!d.shade) return;
    // 床の照らされ方 (スキャン結果)
    const bw = W / d.bins;
    for (let i = 0; i < d.bins; i++) {
      const [r, g2, b] = d.shade[i];
      g.fillStyle = `rgb(${clamp(r, 0, 1) * 255},${clamp(g2, 0, 1) * 255},${clamp(b, 0, 1) * 255})`;
      g.fillRect(i * bw, d.wallY, bw + 0.3, 14);
    }
    // ランプ
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (const lp of d.lamps ?? []) {
      const grad = g.createRadialGradient(lp.x, d.lampY, 0, lp.x, d.lampY, 14);
      grad.addColorStop(0, `rgba(${lp.col[0] * 255},${lp.col[1] * 255},${lp.col[2] * 255},0.8)`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad;
      g.beginPath();
      g.arc(lp.x, d.lampY, 14, 0, TAU);
      g.fill();
      g.fillStyle = `rgb(${lp.col[0] * 255},${lp.col[1] * 255},${lp.col[2] * 255})`;
      rr(g, lp.x - lp.size * 3, d.lampY - 1.8, lp.size * 6, 3.6, 1.8);
      g.fill();
    }
    g.restore();
    // コード
    for (const lp of d.lamps ?? []) {
      g.strokeStyle = '#556';
      g.lineWidth = 0.5;
      g.beginPath();
      g.moveTo(lp.x, 14);
      g.lineTo(lp.x, d.lampY - 2);
      g.stroke();
    }
    // クマちゃん
    const b2 = d.bear;
    g.fillStyle = '#a8764a';
    g.beginPath(); g.arc(b2.x, b2.y, d.bearR, 0, TAU); g.fill();
    g.beginPath(); g.arc(b2.x - 4.4, b2.y - 4.4, 2.4, 0, TAU); g.fill();
    g.beginPath(); g.arc(b2.x + 4.4, b2.y - 4.4, 2.4, 0, TAU); g.fill();
    g.fillStyle = '#c89868';
    g.beginPath(); g.ellipse(b2.x, b2.y + 1.5, 2.8, 2.2, 0, 0, TAU); g.fill();
    g.fillStyle = '#333';
    g.beginPath(); g.arc(b2.x - 1.8, b2.y - 1.5, 0.7, 0, TAU); g.fill();
    g.beginPath(); g.arc(b2.x + 1.8, b2.y - 1.5, 0.7, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(b2.x, b2.y + 0.8, 1, 0.7, 0, 0, TAU); g.fill();
    // 観察スタンプ
    g.fillStyle = 'rgba(255,255,255,0.92)';
    rr(g, 4, 16, 46, 13, 3);
    g.fill();
    g.fillStyle = d.sawPenumbra >= 1 ? '#2a9a4a' : '#bbb';
    g.font = 'bold 2.6px sans-serif';
    g.fillText('🌗はんえい', 7, 21);
    g.fillStyle = d.sawColor >= 1 ? '#2a9a4a' : '#bbb';
    g.fillText('🔴🔵色つき影', 24, 21);
    g.fillStyle = '#889';
    g.font = '2.3px sans-serif';
    g.fillText('クマをドラッグして影を動かそう', 7, 25.6);
  },
};
