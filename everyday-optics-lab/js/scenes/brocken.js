// シーン: ブロッケン現象 (自分の影のまわりに 虹の輪 = グローリー)
// 霧つぶの後方散乱リング: 角半径 ∝ λ/d、赤が外側 — を波長サンプルで計算
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad } from '../engine/art.js';
import { gamma } from '../engine/spectrum.js';

export default {
  id: 'brocken',
  name: 'ブロッケン現象',
  emoji: '🏔️',
  desc: '自分の影に 虹の輪!?',
  goal: '🎯 太陽をせなかに 霧をちょうどよくして 影のまわりにグローリーを出そう!',
  clearMsg: '山でも飛行機からも見える「ブロッケンの妖怪」!',
  spectrumN: 14,

  init(ctx) {
    const d = ctx.data;
    d.fog = 0.1;
    d.drop = 14;  // 霧つぶ µm
    d.okT = 0;
    ctx.setTools([
      { id: 'fogUp', icon: '🌫️', label: '霧をこくする' },
      { id: 'fogDn', icon: '🌬️', label: '霧をうすめる' },
      { id: 'drop', icon: '💧', label: 'つぶを小さく' },
    ]);
    ctx.setHint('朝の山頂。太陽 (うしろ) は低く…霧のスクリーンに影がのびる');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.ridgeY = Math.min(H - 30, H * 0.82);   // 山の稜線 (足元)
    d.shadowX = W * 0.5;
    d.headY = H * 0.42;                       // 影の頭 (対日点)
    d.degPx = Math.min(W, H) * 0.032;
    this._lut(ctx);
  },

  _lut(ctx) {
    const d = ctx.data;
    // グローリー: 後方散乱の干渉リング。角半径 θ ≈ k·λ/d (赤が外)
    const N = 70; // 0..7°
    const lut = [];
    for (let i = 0; i < N; i++) lut.push([0, 0, 0]);
    for (const s of ctx.spectrum) {
      const th = 0.85 * (s.l / 1000) / d.drop * (180 / Math.PI) * 1.3;
      const w = 0.3 + th * 0.22;
      for (let i = 0; i < N; i++) {
        const a = (i / N) * 7;
        const ring1 = Math.exp(-((a - th) ** 2) / (w * w));
        const ring2 = Math.exp(-((a - th * 2.1) ** 2) / (w * w * 3)) * 0.35; // 2次リング
        const v = ring1 + ring2;
        lut[i][0] += s.rgb[0] * v;
        lut[i][1] += s.rgb[1] * v;
        lut[i][2] += s.rgb[2] * v;
      }
    }
    d.lut = lut;
  },

  update(ctx, dt) {
    const d = ctx.data, p = ctx.primary;
    if (p) {
      // 影の位置 (=自分の立ち位置) を動かせる
      d.shadowX = clamp(p.x, ctx.W * 0.2, ctx.W * 0.8);
      d.headY = clamp(p.y, ctx.H * 0.3, d.ridgeY - 20);
    }
    // グローリーの見え: 霧 0.35..0.8 が適正 (うすい=スクリーンなし、こい=影も没する)
    const f = d.fog;
    d.vis = f < 0.3 ? clamp((f - 0.05) / 0.25, 0, 1) * 0.5 : f <= 0.8 ? 1 : clamp(1 - (f - 0.8) * 4, 0, 1);
    const good = d.vis > 0.75;
    if (good) {
      d.okT += dt;
      ctx.progress(Math.min(1, d.okT / 2));
      if (!d.saidOk) { d.saidOk = true; ctx.toast('👻 出た!影の頭 (対日点) を中心に虹の輪'); ctx.sfx.chime(); }
    } else {
      d.okT = Math.max(0, d.okT - dt * 0.5);
      d.saidOk = false;
      if (!ctx._cleared) ctx.progress(clamp(d.vis, 0, 0.9));
    }
  },

  onTool(ctx, id) {
    const d = ctx.data;
    if (id === 'fogUp') d.fog = clamp(d.fog + 0.15, 0, 1.05);
    if (id === 'fogDn') d.fog = clamp(d.fog - 0.15, 0, 1.05);
    if (id === 'drop') {
      d.drop = d.drop <= 8 ? 20 : d.drop - 4;
      this._lut(ctx);
      ctx.toast(`💧 霧つぶ ${d.drop}µm — 小さいほど輪が大きい (θ∝λ/d)`);
      return;
    }
    ctx.toast(`🌫️ 霧 ${(d.fog * 100) | 0}% ${d.fog > 0.85 ? '(こすぎて影がうもれる…)' : d.fog < 0.3 ? '(うすくてスクリーンにならない)' : ''}`);
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    // 朝の空 (太陽はカメラのうしろ=描かない)
    g.fillStyle = vgrad(g, 0, H, [[0, '#ffd9a8'], [0.5, '#ffeacc'], [1, '#fff6e8']]);
    g.fillRect(0, 0, W, H);
    // 遠くの山なみ
    g.fillStyle = 'rgba(120,110,140,0.35)';
    g.beginPath();
    g.moveTo(0, H * 0.35);
    for (let x = 0; x <= W; x += 12) g.lineTo(x, H * 0.35 - Math.abs(Math.sin(x * 0.06)) * 12);
    g.lineTo(W, H * 0.5); g.lineTo(0, H * 0.5);
    g.closePath();
    g.fill();
    // 足元の稜線 (岩)
    g.fillStyle = '#5a5248';
    g.beginPath();
    g.moveTo(0, H);
    g.lineTo(0, d.ridgeY + 6);
    for (let x = 0; x <= W; x += 8) g.lineTo(x, d.ridgeY + Math.sin(x * 0.2) * 2.5);
    g.lineTo(W, H);
    g.closePath();
    g.fill();
  },

  drawFront(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    // 雲海 (霧のスクリーン)
    const fogA = clamp(d.fog, 0, 1);
    g.fillStyle = `rgba(255,250,242,${fogA * 0.75})`;
    g.beginPath();
    g.moveTo(0, H);
    g.lineTo(0, d.headY - 26);
    for (let x = 0; x <= W; x += 8) {
      g.lineTo(x, d.headY - 26 + Math.sin(x * 0.09 + ctx.t * 0.7) * 5);
    }
    g.lineTo(W, H);
    g.closePath();
    g.fill();
    // もやの動き
    for (let k = 0; k < 4; k++) {
      g.fillStyle = `rgba(255,252,246,${fogA * 0.2})`;
      const y = d.headY + k * 18 - 10;
      g.beginPath();
      g.ellipse((ctx.t * 4 + k * 37) % (W + 40) - 20, y, 22, 5, 0, 0, TAU);
      g.fill();
    }
    if (d.vis > 0.03) {
      // 自分の影 (対日点から放射状にのびる巨人)
      g.save();
      g.globalAlpha = clamp(d.vis, 0, 1) * clamp(1.15 - d.fog * 0.35, 0.4, 1);
      g.fillStyle = 'rgba(70,75,100,0.55)';
      const hx = d.shadowX, hy = d.headY;
      // 頭
      g.beginPath();
      g.ellipse(hx, hy, 4, 5, 0, 0, TAU);
      g.fill();
      // 体 (下へ広がる)
      g.beginPath();
      g.moveTo(hx - 3.5, hy + 3);
      g.lineTo(hx - 13, d.ridgeY + 4);
      g.lineTo(hx + 13, d.ridgeY + 4);
      g.lineTo(hx + 3.5, hy + 3);
      g.closePath();
      g.fill();
      // 手をふる (自分が動くと影も動く!)
      const wave = Math.sin(ctx.t * 2.2) * 0.4;
      g.save();
      g.translate(hx + 3, hy + 8);
      g.rotate(-0.7 + wave);
      g.fillRect(0, -1.4, 10, 2.8);
      g.restore();
      g.restore();
      // グローリー (頭のまわりの回折リング)
      g.save();
      g.globalCompositeOperation = 'lighter';
      const N = d.lut.length;
      for (let i = 1; i < N; i++) {
        const [r, g2, b] = d.lut[i];
        const mx = Math.max(r, g2, b);
        if (mx < 0.02) continue;
        const k = 2.4;
        g.strokeStyle = `rgba(${(gamma(clamp(r * k, 0, 1)) * 255) | 0},${(gamma(clamp(g2 * k, 0, 1)) * 255) | 0},${(gamma(clamp(b * k, 0, 1)) * 255) | 0},${clamp(mx, 0, 0.5) * d.vis})`;
        g.lineWidth = (7 / N) * d.degPx + 0.4;
        g.beginPath();
        g.arc(d.shadowX, d.headY, Math.max(0.5, (i / N) * 7 * d.degPx), 0, TAU);
        g.stroke();
      }
      // 中心の明るいオーレオール
      const ag = g.createRadialGradient(d.shadowX, d.headY, 0, d.shadowX, d.headY, 3.5);
      ag.addColorStop(0, `rgba(255,255,255,${0.35 * d.vis})`);
      ag.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = ag;
      g.beginPath();
      g.arc(d.shadowX, d.headY, 3.5, 0, TAU);
      g.fill();
      g.restore();
    }
    // メーター
    g.fillStyle = 'rgba(255,255,255,0.92)';
    rr(g, 4, 16, 42, 13, 3);
    g.fill();
    g.fillStyle = '#556';
    g.font = 'bold 2.6px sans-serif';
    g.fillText(`霧 ${(d.fog * 100) | 0}% / つぶ ${d.drop}µm`, 7, 20.6);
    g.fillStyle = (d.vis ?? 0) > 0.75 ? '#2a9a4a' : '#a86';
    g.font = '2.4px sans-serif';
    g.fillText((d.vis ?? 0) > 0.75 ? '👻 グローリー出現中!' : '霧 35〜80% がねらいめ', 7, 25.2);
  },
};
