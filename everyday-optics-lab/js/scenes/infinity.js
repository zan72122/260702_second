// シーン: 合わせ鏡の無限トンネル (エレベーターのあの光景)
// 像 n 個目: 距離 2nd、明るさ reflect^n、ガラスの吸収で緑シフト — を実計算
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad } from '../engine/art.js';

export default {
  id: 'infinity',
  name: '合わせ鏡の無限トンネル',
  emoji: '🪩',
  desc: '鏡の中に 鏡の中に 鏡…',
  goal: '🎯 鏡の角度を平行にそろえて 10人以上の自分をならべよう!',
  clearMsg: '平行なら無限!少しズレると列が曲がって消える',
  spectrumN: 6,

  init(ctx) {
    const d = ctx.data;
    d.tilt = 6;       // 鏡の角度ズレ [deg]
    d.gap = 26;       // 鏡の間隔
    d.okT = 0;
    ctx.setTools([{ id: 'reset', icon: '📐', label: 'きっちり平行に' }]);
    ctx.setHint('うしろの鏡を左右にドラッグ=角度、上下=間隔。像は1回ごとに暗く緑っぽく');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.cx = W / 2;
    d.cy = Math.min(H * 0.46, H - 90);
    d.mirW = Math.min(W * 0.62, 64);
    d.mirH = Math.min(H * 0.42, 74);
  },

  update(ctx, dt) {
    const d = ctx.data, p = ctx.primary;
    if (p) {
      d.tilt = clamp((p.x / ctx.W - 0.5) * 24, -12, 12);
      d.gap = clamp(14 + (p.y / ctx.H) * 30, 14, 42);
    }
    // 見える像の数: 各像は角度ズレ 2n·tilt で横に逃げていく + reflect^n 減光
    // 像 n が「鏡のわく内 & 明るさ>しきい値」の間カウント
    const reflect = 0.88;
    let count = 0;
    d.images = [];
    for (let n = 1; n <= 24; n++) {
      const bright = Math.pow(reflect, n);
      // 角度ズレの累積で横にドリフト (2n(n+1)/2 ≈ n² に比例)
      const drift = Math.sin(d.tilt * Math.PI / 180) * n * n * 2.2;
      const scale = 1 / (1 + (n * d.gap) / 40);
      const visible = bright > 0.06 && Math.abs(drift) * scale < d.mirW * 0.45;
      d.images.push({ n, bright, drift, scale, visible });
      if (visible) count++;
    }
    d.count = count;
    if (count >= 10) {
      d.okT += dt;
      ctx.progress(Math.min(1, d.okT / 1.5));
      if (!d.saidOk) { d.saidOk = true; ctx.toast('🪩 トンネル開通!奥は緑っぽい=ガラスの吸収'); }
    } else {
      d.okT = Math.max(0, d.okT - dt);
      d.saidOk = false;
      if (!ctx._cleared) ctx.progress(clamp(count / 10, 0, 0.95));
    }
  },

  onTool(ctx, id) {
    if (id !== 'reset') return;
    ctx.data.tilt = 0.4;
    ctx.toast('📐 ほぼ平行!(完全な平行は現実にはむずかしい)');
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    // エレベーターの内装
    g.fillStyle = vgrad(g, 0, H, [[0, '#3a3f4e'], [1, '#262a36']]);
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#4a505e';
    g.fillRect(0, d.cy + d.mirH / 2 + 6, W, H);
    // ボタンパネル
    g.fillStyle = '#2c3040';
    rr(g, W * 0.06, d.cy - 10, 7, 26, 2);
    g.fill();
    for (let k = 0; k < 4; k++) {
      g.fillStyle = k === 1 ? '#ffd25a' : '#5a6270';
      g.beginPath();
      g.arc(W * 0.06 + 3.5, d.cy - 5 + k * 6, 1.6, 0, TAU);
      g.fill();
    }
  },

  drawFront(ctx, g) {
    const { W } = ctx, d = ctx.data;
    // 鏡のわく
    g.save();
    g.beginPath();
    rr(g, d.cx - d.mirW / 2, d.cy - d.mirH / 2, d.mirW, d.mirH, 3);
    g.clip();
    // 鏡面の下地
    g.fillStyle = '#1a2230';
    g.fillRect(d.cx - d.mirW / 2, d.cy - d.mirH / 2, d.mirW, d.mirH);
    // 多重像 (奥から描く)
    for (let i = d.images.length - 1; i >= 0; i--) {
      const im = d.images[i];
      if (im.bright < 0.03) continue;
      const s = im.scale;
      const x = d.cx + im.drift * s;
      const y = d.cy + d.mirH * 0.18 * (1 - s);
      // 緑シフト: ガラスは赤をわずかに吸収 → 奥ほど緑
      const rK = Math.pow(0.86, im.n), gK = Math.pow(0.97, im.n), bK = Math.pow(0.93, im.n);
      g.globalAlpha = clamp(im.bright * 1.5, 0, 1);
      this._kid(g, x, y, 10 * s, [rK, gK, bK], im.n % 2 === 1);
      // 鏡のわくの像も
      g.strokeStyle = `rgba(${140 * rK},${150 * gK},${160 * bK},${im.bright})`;
      g.lineWidth = 0.7 * s + 0.2;
      rr(g, x - (d.mirW / 2) * s, d.cy - (d.mirH / 2) * s, d.mirW * s, d.mirH * s, 2);
      g.stroke();
    }
    g.globalAlpha = 1;
    g.restore();
    // 手前のわく
    g.strokeStyle = '#b8c0d0';
    g.lineWidth = 1.8;
    rr(g, d.cx - d.mirW / 2, d.cy - d.mirH / 2, d.mirW, d.mirH, 3);
    g.stroke();
    // メーター
    g.fillStyle = 'rgba(255,255,255,0.92)';
    rr(g, 4, 16, 42, 14, 3);
    g.fill();
    g.fillStyle = '#556';
    g.font = 'bold 2.7px sans-serif';
    g.fillText(`見えている自分: ${d.count}人`, 7, 20.6);
    g.fillStyle = Math.abs(d.tilt) < 1.5 ? '#2a9a4a' : '#a86';
    g.font = '2.4px sans-serif';
    g.fillText(`角度ズレ ${d.tilt.toFixed(1)}° / 間隔 ${d.gap.toFixed(0)}cm`, 7, 25);
    g.fillStyle = '#889';
    g.fillText('⇄角度 ⇅間隔 (ドラッグ)', 7, 28.6);
  },

  _kid(g, x, y, h, [rK, gK, bK], flip) {
    g.save();
    g.translate(x, y);
    if (flip) g.scale(-1, 1); // 1回反射ごとに左右反転!
    // 体
    g.fillStyle = `rgb(${232 * rK},${122 * gK},${90 * bK})`;
    rr(g, -h * 0.32, -h * 0.15, h * 0.64, h * 0.75, h * 0.15);
    g.fill();
    // 顔
    g.fillStyle = `rgb(${250 * rK},${214 * gK},${175 * bK})`;
    g.beginPath();
    g.arc(0, -h * 0.42, h * 0.3, 0, TAU);
    g.fill();
    g.fillStyle = `rgb(${100 * rK},${72 * gK},${45 * bK})`;
    g.beginPath();
    g.arc(0, -h * 0.55, h * 0.26, Math.PI, TAU);
    g.fill();
    // 手をふる (片手だけ → 反転がわかる)
    g.strokeStyle = `rgb(${250 * rK},${214 * gK},${175 * bK})`;
    g.lineWidth = h * 0.13;
    g.beginPath();
    g.moveTo(h * 0.3, 0);
    g.lineTo(h * 0.55, -h * 0.35);
    g.stroke();
    g.restore();
  },
};
