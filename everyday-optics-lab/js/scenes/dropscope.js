// シーン: 水滴けんび鏡 (水のたまが 世界最初の顕微鏡)
// 水滴レンズ f=R·n/(2(n-1)) — 小さいしずくほど強力
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad, woodTable, softShadow } from '../engine/art.js';
import { refIndex } from '../engine/spectrum.js';

export default {
  id: 'dropscope',
  name: '水滴けんび鏡',
  emoji: '🔬',
  desc: 'しずく1つで ミクロの世界',
  goal: '🎯 しずくの大きさとピントを合わせて アリの顔を 5倍以上で見よう!',
  clearMsg: 'レーウェンフックも 小さな玉レンズで細菌を見つけた!',
  spectrumN: 8,

  init(ctx) {
    const d = ctx.data;
    d.dropR = 5;     // 水滴半径 [mm]
    d.gap = 14;      // 水滴とアリの距離 [mm] (上下ドラッグ)
    d.okT = 0;
    ctx.setTools([
      { id: 'small', icon: '💧', label: 'しずくを小さく' },
      { id: 'big', icon: '🫗', label: 'しずくを大きく' },
    ]);
    ctx.setHint('小さいしずくほど強いレンズ。ピント (高さ) は上下ドラッグ');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.cx = W / 2;
    d.deskY = Math.min(H * 0.72, H - 70);
    d.slideY = d.deskY - 8;
  },

  update(ctx, dt) {
    const d = ctx.data, p = ctx.primary;
    if (p) {
      d.gap = clamp(4 + (1 - p.y / ctx.H) * 36, 4, 36);
    }
    // 水滴レンズ: f = R·n/(2(n-1)) — 球形しずく
    const n = refIndex('water', 550);
    d.f = (d.dropR * n) / (2 * (n - 1));
    // 虫めがねとして: 物体を焦点の少し内側に置くと 虚像の倍率 m ≈ f/(f-u)
    const u = d.gap;
    if (u >= d.f - 0.2) {
      d.mag = 0.8;         // 焦点の外 = ぼやけ倒立 (今回は「見えない」扱い)
      d.sharp = false;
    } else {
      d.mag = clamp(d.f / (d.f - u), 1, 14);
      // シャープさ: 倍率が高すぎる端はピンぼけ気味に
      d.sharp = d.mag >= 2 && u < d.f * 0.92;
    }
    d.blur = d.sharp ? 0 : 2.2;
    const good = d.mag >= 5 && d.sharp;
    if (good) {
      d.okT += dt;
      ctx.progress(Math.min(1, d.okT / 1.5));
      if (!d.saidOk) { d.saidOk = true; ctx.toast('🐜 アリの顔!ちいさなレンズは強力けんび鏡'); }
    } else {
      d.okT = Math.max(0, d.okT - dt * 0.7);
      d.saidOk = false;
      if (!ctx._cleared) ctx.progress(clamp((d.mag ?? 1) / 5 * 0.9, 0.05, 0.95));
    }
  },

  onTool(ctx, id) {
    const d = ctx.data;
    if (id === 'small') d.dropR = clamp(d.dropR - 1, 1.5, 9);
    if (id === 'big') d.dropR = clamp(d.dropR + 1, 1.5, 9);
    ctx.sfx.drip();
    ctx.toast(`💧 半径${d.dropR}mm → 焦点きょり ${((d.dropR * 1.3335) / (2 * 0.3335)).toFixed(0)}mm (小さいほど強い!)`);
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    g.fillStyle = vgrad(g, 0, H, [[0, '#f2ecd8'], [1, '#e4d8bc']]);
    g.fillRect(0, 0, W, H);
    woodTable(g, W, d.deskY, H, 1);
    // スライドガラス
    softShadow(g, d.cx, d.deskY, 26, 2, 0.16);
    g.fillStyle = 'rgba(200,230,245,0.55)';
    rr(g, d.cx - 24, d.slideY, 48, 3, 1);
    g.fill();
    g.strokeStyle = 'rgba(150,190,215,0.8)';
    g.lineWidth = 0.5;
    rr(g, d.cx - 24, d.slideY, 48, 3, 1);
    g.stroke();
  },

  drawFront(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    // アリ (スライドの上、実物大=ちいさい)
    const antY = d.slideY - 1.6;
    this._ant(g, d.cx, antY, 1, false);
    // 水滴 (物体の上 gap の高さ)
    const dropY = antY - 4 - d.gap * 1.5;
    const dr = d.dropR * 1.7;
    g.save();
    g.fillStyle = 'rgba(160,205,240,0.45)';
    g.beginPath();
    g.ellipse(d.cx, dropY, dr, dr * 0.92, 0, 0, TAU);
    g.fill();
    g.strokeStyle = 'rgba(200,230,255,0.9)';
    g.lineWidth = 0.7;
    g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.5)';
    g.beginPath();
    g.ellipse(d.cx - dr * 0.3, dropY - dr * 0.35, dr * 0.22, dr * 0.32, -0.6, 0, TAU);
    g.fill();
    // しずくの中の拡大像!
    g.beginPath();
    g.ellipse(d.cx, dropY, dr * 0.92, dr * 0.85, 0, 0, TAU);
    g.clip();
    if (d.mag > 1) {
      const steps = d.sharp ? 1 : 5;
      for (let s2 = 0; s2 < steps; s2++) {
        g.globalAlpha = d.sharp ? 1 : 0.3;
        const off = d.sharp ? 0 : (s2 - 2) * 1.1;
        this._ant(g, d.cx + off, dropY + dr * 0.25, Math.min(d.mag, dr / 3.2), true);
      }
      g.globalAlpha = 1;
    }
    g.restore();
    // 視線ガイド
    g.strokeStyle = 'rgba(120,150,190,0.4)';
    g.lineWidth = 0.4;
    g.setLineDash([1.2, 1.2]);
    g.beginPath();
    g.moveTo(d.cx - dr, dropY);
    g.lineTo(d.cx - 3, antY);
    g.moveTo(d.cx + dr, dropY);
    g.lineTo(d.cx + 3, antY);
    g.stroke();
    g.setLineDash([]);
    // 目 (上から)
    g.font = '7px sans-serif';
    g.textAlign = 'center';
    g.fillText('👁️', d.cx, Math.max(dropY - dr - 6, 22));
    g.textAlign = 'left';
    // メーター
    g.fillStyle = 'rgba(255,255,255,0.92)';
    rr(g, 4, 16, 46, 16, 3);
    g.fill();
    g.fillStyle = '#556';
    g.font = 'bold 2.6px sans-serif';
    g.fillText(`しずく半径 ${d.dropR}mm / f=${d.f?.toFixed(0)}mm`, 7, 20.5);
    g.fillText(`高さ ${d.gap?.toFixed(0)}mm`, 7, 24.6);
    g.fillStyle = (d.mag ?? 1) >= 5 && d.sharp ? '#2a9a4a' : '#a86';
    g.fillText(d.sharp ? `倍率 ${d.mag?.toFixed(1)}× ${d.mag >= 5 ? '✨' : '(5×まで上げよう)'}` : 'ピンぼけ… 高さを調整!', 7, 28.8);
  },

  _ant(g, x, y, s, detail) {
    g.save();
    g.translate(x, y);
    g.scale(s, s);
    g.fillStyle = '#4a3226';
    // 体3節
    g.beginPath(); g.ellipse(-2.2, 0, 1.4, 1, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(-0.4, 0, 0.9, 0.75, 0, 0, TAU); g.fill();
    g.beginPath(); g.arc(1.2, -0.2, 1, 0, TAU); g.fill();
    // あし
    g.strokeStyle = '#4a3226';
    g.lineWidth = 0.16;
    for (const [ox, a] of [[-1.5, 0.7], [-0.5, 0.9], [0.3, 1.1]]) {
      g.beginPath();
      g.moveTo(ox, 0.3); g.lineTo(ox - 0.5, 1.3);
      g.moveTo(ox, 0.3); g.lineTo(ox + 0.5, 1.3);
      g.stroke();
    }
    if (detail) {
      // 拡大時のディテール: 複眼・触角・あごの笑顔
      g.fillStyle = '#181008';
      g.beginPath(); g.arc(1.5, -0.55, 0.3, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.5)';
      g.beginPath(); g.arc(1.6, -0.65, 0.1, 0, TAU); g.fill();
      g.strokeStyle = '#4a3226';
      g.lineWidth = 0.14;
      g.beginPath();
      g.moveTo(1.6, -1.1); g.quadraticCurveTo(2.2, -1.9, 2.9, -1.7);
      g.moveTo(1.1, -1.15); g.quadraticCurveTo(1.2, -2, 0.6, -2.2);
      g.stroke();
      g.strokeStyle = '#c05a3a';
      g.lineWidth = 0.14;
      g.beginPath();
      g.arc(1.6, 0.25, 0.4, 0.3, Math.PI - 0.5);
      g.stroke();
    }
    g.restore();
  },
};
