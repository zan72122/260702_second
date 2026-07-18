// シーン: コップの水で矢印はんたい (円柱レンズの実験)
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad, woodTable, softShadow, glassShine } from '../engine/art.js';
import { refIndex } from '../engine/spectrum.js';

export default {
  id: 'arrowflip',
  name: 'コップの水で矢印はんたい',
  emoji: '🏺',
  desc: 'カードを遠ざけると…あれ?',
  goal: '🎯 カードを動かして 矢印が「ふつう⇔はんたい」になる境目を見つけよう!',
  clearMsg: '境目が焦点!水のコップは円柱レンズだった!',
  spectrumN: 8,

  init(ctx) {
    const d = ctx.data;
    d.sawN = 0; d.sawF = 0;
    ctx.setTools([{ id: 'focus', icon: '📐', label: '焦点を見る' }]);
    ctx.setHint('うしろのカード (➡) を左右にドラッグ。コップの水ごしに見ると…');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.cy = H * 0.5;
    d.glassX = W * 0.4;
    d.glassR = Math.min(W * 0.16, 16);
    // 円柱 (水) レンズの焦点: f = R·n/(2(n-1)) 中心から
    const n = refIndex('water', 550);
    d.f = d.glassR * n / (2 * (n - 1));
    d.cardX = d.cardX ?? d.glassX + d.glassR + 10;
    d.floorY = Math.min(H - 16, H * 0.9);
    d.eyeX = W * 0.08;
  },

  update(ctx, dt) {
    const d = ctx.data, p = ctx.primary;
    if (p) {
      d.cardX = clamp(p.x, d.glassX + d.glassR + 2.5, ctx.W - 8);
    }
    // カード距離 (レンズ中心から)
    const u = d.cardX - d.glassX;
    d.u = u;
    // 薄レンズ近似で見えかた: u > f → 倒立 (左右反転)、u < f → 正立拡大
    d.flipped = u > d.f;
    d.mag = Math.abs(u - d.f) < 1 ? 3 : clamp(Math.abs(d.f / (u - d.f)), 0.4, 3);
    if (d.flipped && u > d.f + 3) d.sawF = Math.min(1, d.sawF + dt * 0.8);
    if (!d.flipped && u < d.f - 2) d.sawN = Math.min(1, d.sawN + dt * 0.8);
    if (d.sawF >= 1 && !d.saidF) { d.saidF = true; ctx.sfx.chime(); ctx.toast('↔️ はんたい!焦点より遠いから左右が入れかわった'); }
    if (d.sawN >= 1 && !d.saidN) { d.saidN = true; ctx.sfx.chime(); ctx.toast('➡️ ふつうに拡大。焦点より近いとルーペと同じ'); }
    ctx.progress(Math.min(1, (d.sawF + d.sawN) / 2));
  },

  onTool(ctx, id) {
    if (id !== 'focus') return;
    const d = ctx.data;
    d.showF = !d.showF;
    ctx.toast(d.showF ? `📐 焦点は コップの右 ${d.f.toFixed(0)} のところ (f=R·n/2(n-1))` : '📐 OFF');
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    g.fillStyle = vgrad(g, 0, H, [[0, '#f6f0e2'], [1, '#eadfc8']]);
    g.fillRect(0, 0, W, H);
    woodTable(g, W, d.floorY, H, 1);
    softShadow(g, d.glassX, d.floorY, d.glassR * 1.1, 2.5, 0.18);
  },

  drawFront(ctx, g) {
    const { W } = ctx, d = ctx.data;
    // カード (実物)
    const ch = 13;
    g.fillStyle = '#fff';
    rr(g, d.cardX - 8, d.cy - ch / 2, 16, ch, 1.5);
    g.fill();
    g.strokeStyle = '#c8bca0';
    g.lineWidth = 0.6;
    rr(g, d.cardX - 8, d.cy - ch / 2, 16, ch, 1.5);
    g.stroke();
    this._arrow(g, d.cardX, d.cy, 1, '#e85a4a');
    g.fillStyle = '#889';
    g.font = '2.4px sans-serif';
    g.textAlign = 'center';
    g.fillText('⇄ ドラッグ', d.cardX, d.cy + ch / 2 + 4);
    g.textAlign = 'left';
    // 視線 (目→コップ→カード)
    g.strokeStyle = 'rgba(120,150,200,0.35)';
    g.lineWidth = 0.4;
    g.setLineDash([1.2, 1.2]);
    for (const dy of [-4, 4]) {
      g.beginPath();
      g.moveTo(d.eyeX + 4, d.cy + dy * 0.4);
      g.lineTo(d.glassX - d.glassR, d.cy + dy);
      // レンズで交差 (倒立のとき)
      g.lineTo(d.glassX + d.glassR, d.flipped ? d.cy - dy : d.cy + dy);
      g.lineTo(d.cardX, d.flipped ? d.cy - dy * 1.6 : d.cy + dy * 1.6);
      g.stroke();
    }
    g.setLineDash([]);
    // コップ (水入り円柱) と 中に見える矢印
    g.save();
    g.beginPath();
    g.arc(d.glassX, d.cy, d.glassR, 0, TAU);
    g.clip();
    g.fillStyle = 'rgba(150,200,235,0.4)';
    g.fillRect(d.glassX - d.glassR, d.cy - d.glassR, d.glassR * 2, d.glassR * 2);
    // 水ごしの矢印 (flipped なら左右反転・拡大)
    this._arrow(g, d.glassX, d.cy, (d.flipped ? -1 : 1) * d.mag, '#c83a2a');
    g.restore();
    g.strokeStyle = 'rgba(160,195,225,0.95)';
    g.lineWidth = 1.1;
    g.beginPath();
    g.arc(d.glassX, d.cy, d.glassR, 0, TAU);
    g.stroke();
    glassShine(g, d.glassX - d.glassR * 0.45, d.cy - d.glassR * 0.55, d.glassR * 0.3, d.glassR * 0.5);
    // 目
    g.font = '7px sans-serif';
    g.fillText('👁️', d.eyeX - 3, d.cy + 2.5);
    // 焦点マーカー
    if (d.showF) {
      g.fillStyle = '#e8783a';
      g.beginPath();
      g.arc(d.glassX + d.f, d.cy, 1.1, 0, TAU);
      g.fill();
      g.font = 'bold 2.6px sans-serif';
      g.fillText('F', d.glassX + d.f - 0.8, d.cy - 2.5);
      g.strokeStyle = 'rgba(232,120,58,0.5)';
      g.lineWidth = 0.4;
      g.setLineDash([1, 1.2]);
      g.beginPath();
      g.moveTo(d.glassX + d.f, d.cy - 16);
      g.lineTo(d.glassX + d.f, d.cy + 16);
      g.stroke();
      g.setLineDash([]);
    }
    // 観察メーター
    g.fillStyle = 'rgba(255,255,255,0.92)';
    rr(g, 4, 16, 46, 13, 3);
    g.fill();
    g.fillStyle = '#556';
    g.font = 'bold 2.6px sans-serif';
    g.fillText(`カードのきょり ${d.u?.toFixed(0)} (f=${d.f.toFixed(0)})`, 7, 20.6);
    g.fillStyle = d.sawN >= 1 ? '#2a9a4a' : '#bbb';
    g.fillText('➡️ふつう', 7, 25.5);
    g.fillStyle = d.sawF >= 1 ? '#2a9a4a' : '#bbb';
    g.fillText('⬅️はんたい', 24, 25.5);
  },

  _arrow(g, x, y, sx, col) {
    g.save();
    g.translate(x, y);
    g.scale(sx, Math.abs(sx));
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(-5.5, -1.3);
    g.lineTo(1.2, -1.3);
    g.lineTo(1.2, -3.2);
    g.lineTo(5.5, 0);
    g.lineTo(1.2, 3.2);
    g.lineTo(1.2, 1.3);
    g.lineTo(-5.5, 1.3);
    g.closePath();
    g.fill();
    g.restore();
  },
};
