// シーン: スプーンのさかさま顔 (凹面鏡の焦点をまたぐと像がひっくり返る)
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad, woodTable, softShadow } from '../engine/art.js';

export default {
  id: 'spoon',
  name: 'スプーンのさかさま顔',
  emoji: '🥄',
  desc: 'なんで逆さにうつるの?',
  goal: '🎯 顔を近づけたり遠ざけたり…「正立」と「さかさま」両方を見つけよう!',
  clearMsg: '切りかわる場所が焦点 (R/2)!',
  spectrumN: 8,

  init(ctx) {
    const d = ctx.data;
    d.sawUp = 0; d.sawDown = 0;
    ctx.setTools([{ id: 'focus', icon: '📐', label: '焦点を見る' }]);
    ctx.setHint('顔 (👧) を左右にドラッグ。スプーンの丸みが凹面鏡になっている');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.cy = H * 0.46;
    d.mirX = W * 0.84;          // 鏡面の頂点
    d.R = Math.min(W * 0.62, 62); // 曲率半径
    d.f = d.R / 2;
    d.faceX = d.faceX ?? d.mirX - d.f * 1.7;
    d.faceR = 6.5;
    d.floorY = Math.min(H - 16, H * 0.9);
  },

  update(ctx, dt) {
    const d = ctx.data, p = ctx.primary;
    if (p) {
      d.faceX = clamp(p.x, d.mirX - d.R * 1.45, d.mirX - 9);
    }
    // 鏡の公式: 1/v + 1/u = 2/R (符号: 実像側+)
    const u = d.mirX - d.faceX;
    d.u = u;
    const f = d.f;
    if (Math.abs(u - f) < 0.5) {
      d.v = 1e6; d.m = 40;
    } else {
      d.v = 1 / (1 / f - 1 / u);
      d.m = -d.v / u; // 負=倒立
    }
    // 観察フラグ (倒立: u>f, 正立拡大: u<f)
    if (u > f + 3 && Math.abs(d.m) > 0.15) d.sawDown = Math.min(1, d.sawDown + dt * 0.8);
    if (u < f - 3) d.sawUp = Math.min(1, d.sawUp + dt * 0.8);
    if (d.sawDown >= 1 && !d.saidD) { d.saidD = true; ctx.toast('🙃 さかさま!焦点より遠いと倒立像'); ctx.sfx.chime(); }
    if (d.sawUp >= 1 && !d.saidU) { d.saidU = true; ctx.toast('🙂 大きな正立像!焦点より近いと虫めがねと同じ'); ctx.sfx.chime(); }
    ctx.progress(Math.min(1, (d.sawDown + d.sawUp) / 2));
  },

  onTool(ctx, id) {
    if (id !== 'focus') return;
    const d = ctx.data;
    d.showF = !d.showF;
    ctx.toast(d.showF ? `📐 焦点 f = R/2 = ${d.f.toFixed(0)} のところ` : '📐 OFF');
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    g.fillStyle = vgrad(g, 0, H, [[0, '#fdf3e2'], [1, '#f4e3c8']]);
    g.fillRect(0, 0, W, H);
    woodTable(g, W, d.floorY, H, 1);
    // スプーン (柄+ボウルの背)
    softShadow(g, d.mirX + 4, d.floorY, 10, 2.5, 0.18);
    g.strokeStyle = '#b8bcc8';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(d.mirX + 7, d.cy + 16);
    g.quadraticCurveTo(d.mirX + 12, d.cy + 40, d.mirX + 8, d.floorY);
    g.stroke();
  },

  drawFront(ctx, g) {
    const { W } = ctx, d = ctx.data;
    const cx = d.mirX - d.R; // 曲率中心
    // 凹面鏡 (スプーンのボウル面)
    g.strokeStyle = '#dde2ec';
    g.lineWidth = 2.6;
    g.beginPath();
    g.arc(cx, d.cy, d.R, -0.42, 0.42);
    g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.85)';
    g.lineWidth = 1;
    g.beginPath();
    g.arc(cx - 1.2, d.cy, d.R, -0.36, 0.36);
    g.stroke();
    // 光線 (顔の頭のてっぺんから: 平行光線と中心光線)
    const oy = d.cy - d.faceR; // 物体の頭
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = 'rgba(255,230,140,0.5)';
    g.lineWidth = 0.5;
    const iy = d.cy + d.m * -d.faceR; // 像の頭 (m<0 で下)
    const ix = d.mirX - clamp(d.v, -300, 300);
    // 平行光線→焦点経由
    g.beginPath();
    g.moveTo(d.faceX, oy);
    g.lineTo(d.mirX - (d.mirX - cx) * 0.01, oy);
    if (Math.abs(d.v) < 300) g.lineTo(ix, iy);
    g.stroke();
    // 中心 (曲率中心) 光線はまっすぐ反射
    g.beginPath();
    g.moveTo(d.faceX, oy);
    const t2 = (d.mirX - d.faceX) / (d.mirX - d.faceX);
    g.lineTo(d.mirX, oy + (oy - d.cy) * ((d.mirX - d.faceX) / (cx - d.faceX) - 1) * 0);
    g.stroke();
    g.restore();
    // 顔 (物体)
    this._face(g, d.faceX, d.cy, d.faceR, 1, false);
    g.fillStyle = 'rgba(80,90,110,0.8)';
    g.font = '2.6px sans-serif';
    g.textAlign = 'center';
    g.fillText('⇄ ドラッグ', d.faceX, d.cy + d.faceR + 4.5);
    g.textAlign = 'left';
    // 像 (鏡の中/前)
    const mAbs = clamp(Math.abs(d.m), 0.1, 2.6);
    if (Math.abs(d.v) < 300) {
      const ixc = clamp(ix, 8, W - 4);
      g.globalAlpha = 0.75;
      this._face(g, ixc, d.cy, d.faceR * mAbs, Math.sign(d.m), true);
      g.globalAlpha = 1;
      g.fillStyle = '#667';
      g.font = '2.4px sans-serif';
      g.textAlign = 'center';
      g.fillText(d.m < 0 ? 'さかさまの像' : '大きな正立像', ixc, d.cy + d.faceR * mAbs + 5);
      g.textAlign = 'left';
    }
    // 焦点マーカー
    if (d.showF) {
      for (const [x, label, col] of [[d.mirX - d.f, 'F (焦点)', '#e8783a'], [cx, 'C (中心)', '#5a9ad8']]) {
        g.fillStyle = col;
        g.beginPath();
        g.arc(x, d.cy, 1.1, 0, TAU);
        g.fill();
        g.font = 'bold 2.5px sans-serif';
        g.fillText(label, x - 4, d.cy - 3);
      }
    }
    // 観察メーター
    g.fillStyle = 'rgba(255,255,255,0.92)';
    rr(g, 4, 16, 44, 13, 3);
    g.fill();
    g.fillStyle = '#556';
    g.font = 'bold 2.6px sans-serif';
    g.fillText(`きょり ${d.u?.toFixed(0)} (f=${d.f.toFixed(0)})`, 7, 20.6);
    g.fillStyle = d.sawDown >= 1 ? '#2a9a4a' : '#bbb';
    g.fillText('🙃さかさま', 7, 25.5);
    g.fillStyle = d.sawUp >= 1 ? '#2a9a4a' : '#bbb';
    g.fillText('🙂せいりつ', 26, 25.5);
  },

  _face(g, x, y, r, flip, isImage) {
    g.save();
    g.translate(x, y);
    g.scale(1, flip);
    g.fillStyle = isImage ? '#f5c9a0' : '#fcd6ae';
    g.beginPath();
    g.arc(0, 0, r, 0, TAU);
    g.fill();
    // かみのけ
    g.fillStyle = '#6a4a2e';
    g.beginPath();
    g.arc(0, -r * 0.42, r * 0.82, Math.PI, TAU);
    g.fill();
    // 目・口
    g.fillStyle = '#333';
    g.beginPath(); g.arc(-r * 0.32, -r * 0.05, r * 0.1, 0, TAU); g.fill();
    g.beginPath(); g.arc(r * 0.32, -r * 0.05, r * 0.1, 0, TAU); g.fill();
    g.strokeStyle = '#a05a4a';
    g.lineWidth = r * 0.1;
    g.beginPath();
    g.arc(0, r * 0.3, r * 0.32, 0.25, Math.PI - 0.25);
    g.stroke();
    g.restore();
  },
};
