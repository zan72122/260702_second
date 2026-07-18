// シーン: 水の中から見た空 (スネルの窓 — 頭の上 48.6° の丸窓)
// 視線ごとに水中→水面の屈折/全反射を実際に解いて描く
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad } from '../engine/art.js';
import { refIndex, criticalAngle } from '../engine/spectrum.js';

export default {
  id: 'snellwindow',
  name: '水の中から見た空',
  emoji: '🏊',
  desc: 'もぐると空は まるい窓',
  goal: '🎯 分度器マーカーを 窓のふちに合わせて 臨界角を実測しよう!',
  clearMsg: 'ふちの角度=48.6° (全反射のはじまり)!',
  spectrumN: 8,

  init(ctx) {
    const d = ctx.data;
    d.crit = criticalAngle(refIndex('water', 550)); // rad
    d.marker = 30; // ユーザーの分度器マーカー角度 [deg]
    d.okT = 0;
    ctx.setHint('画面ドラッグで 黄色いマーカー角度を動かす。空が見えるのはどこまで?');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    // 一人称: 真上 (0°) が画面上端、下にいくほど視線が横に倒れる (90°)
    d.cx = W / 2;
    d.mapDeg = (H * 0.86) / 90; // 1°あたりの縦距離
  },

  update(ctx, dt) {
    const d = ctx.data, p = ctx.primary;
    if (p) {
      d.marker = clamp(p.y / d.mapDeg, 5, 85);
    }
    const critDeg = d.crit * 180 / Math.PI;
    d.err = Math.abs(d.marker - critDeg);
    if (d.err < 2) {
      d.okT += dt;
      ctx.progress(Math.min(1, d.okT / 1.5));
      if (!d.saidOk) { d.saidOk = true; ctx.toast(`📐 ぴったり!窓のふち = 臨界角 ${critDeg.toFixed(1)}°`); }
    } else {
      d.okT = Math.max(0, d.okT - dt);
      d.saidOk = false;
      if (!ctx._cleared) ctx.progress(clamp(1 - d.err / 40, 0, 0.9));
    }
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    const critDeg = d.crit * 180 / Math.PI;
    const nW = refIndex('water', 550);
    // 視線角 0..90° を行スキャン: 窓内=屈折した空、外=底の全反射鏡
    const rows = 96;
    for (let r2 = 0; r2 < rows; r2++) {
      const a0 = (r2 / rows) * 90, a1 = ((r2 + 1) / rows) * 90;
      const y0 = a0 * d.mapDeg, y1 = a1 * d.mapDeg + 0.3;
      const aMid = (a0 + a1) / 2;
      let col;
      if (aMid < critDeg) {
        // スネルの窓: 水中角→空の角度 (圧縮された全天)
        const sinAir = Math.sin(aMid * Math.PI / 180) * nW;
        const airDeg = Math.asin(clamp(sinAir, 0, 1)) * 180 / Math.PI; // 0(天頂)..90(地平)
        const t = airDeg / 90;
        // 空: 天頂の青 → 地平の白 + 夕陽っぽい太陽は上部に
        col = `rgb(${70 + t * 150},${140 + t * 90},${230 + t * 20})`;
      } else {
        // 全反射: 暗い水の鏡 (プール底の反射)
        const t = (aMid - critDeg) / (90 - critDeg);
        col = `rgb(${20 + t * 22},${60 + t * 30},${80 + t * 24})`;
      }
      g.fillStyle = col;
      g.fillRect(0, y0, W, y1 - y0);
    }
    // 窓のふちのにじ色 (臨界角は波長でわずかに違う=分散)
    for (const [l, colr] of [[650, 'rgba(255,120,80,0.5)'], [550, 'rgba(120,255,120,0.4)'], [450, 'rgba(120,140,255,0.5)']]) {
      const c2 = Math.asin(1 / refIndex('water', l)) * 180 / Math.PI;
      g.strokeStyle = colr;
      g.lineWidth = 0.7;
      g.beginPath();
      g.moveTo(0, c2 * d.mapDeg);
      g.lineTo(W, c2 * d.mapDeg);
      g.stroke();
    }
    // 鏡面ゾーンにうつる底の魚 (全反射の証拠)
    g.globalAlpha = 0.5;
    for (let k = 0; k < 3; k++) {
      const fy = (critDeg + 8 + k * 11) * d.mapDeg;
      const fx = W * (0.25 + k * 0.25);
      g.save();
      g.translate(fx, fy);
      g.scale(k % 2 ? -1 : 1, -1); // 鏡像なので上下逆
      g.fillStyle = '#e8a05a';
      g.beginPath(); g.ellipse(0, 0, 3.5, 1.9, 0, 0, TAU); g.fill();
      g.beginPath(); g.moveTo(-3, 0); g.lineTo(-5, -1.5); g.lineTo(-5, 1.5); g.closePath(); g.fill();
      g.restore();
    }
    g.globalAlpha = 1;
    // 泡
    for (let k = 0; k < 10; k++) {
      g.strokeStyle = 'rgba(255,255,255,0.35)';
      g.lineWidth = 0.4;
      g.beginPath();
      g.arc((k * 37 % 100) / 100 * W, H * 0.3 + (k * 53 % 100) / 100 * H * 0.6, 0.8 + (k % 3) * 0.5, 0, TAU);
      g.stroke();
    }
  },

  drawFront(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    const critDeg = d.crit * 180 / Math.PI;
    // ゆらめき (水中感)
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 5; k++) {
      const y = ((k * 47 % 90)) * d.mapDeg;
      g.strokeStyle = `rgba(255,255,255,${0.06 + 0.04 * Math.sin(ctx.t * 2 + k * 2)})`;
      g.lineWidth = 1.5;
      g.beginPath();
      for (let x = 0; x <= W; x += 6) {
        const yy = y + Math.sin(x * 0.12 + ctx.t * 1.8 + k) * 1.6;
        x === 0 ? g.moveTo(x, yy) : g.lineTo(x, yy);
      }
      g.stroke();
    }
    g.restore();
    // ユーザーの分度器マーカー
    const my = d.marker * d.mapDeg;
    g.strokeStyle = '#ffd25a';
    g.lineWidth = 1;
    g.setLineDash([2.4, 1.6]);
    g.beginPath();
    g.moveTo(0, my); g.lineTo(W, my);
    g.stroke();
    g.setLineDash([]);
    g.fillStyle = '#ffd25a';
    g.font = 'bold 3.2px sans-serif';
    g.fillText(`📐 ${d.marker.toFixed(1)}°`, 4, my - 2);
    // 角度めもり (左端)
    g.fillStyle = 'rgba(255,255,255,0.6)';
    g.font = '2.3px sans-serif';
    for (let a = 0; a <= 80; a += 20) {
      g.fillText(`${a}°`, 1.5, a * d.mapDeg + 3.4);
      g.fillRect(0, a * d.mapDeg, 3, 0.3);
    }
    g.fillText('0°=真上', 8, 5.5 + 16);
    // ガイド
    g.fillStyle = 'rgba(255,255,255,0.92)';
    rr(g, W - 44, 16, 42, 12, 3);
    g.fill();
    g.fillStyle = '#556';
    g.font = 'bold 2.6px sans-serif';
    g.fillText('窓のふちに合わせて!', W - 41, 20.6);
    g.fillStyle = d.err < 2 ? '#2a9a4a' : '#a86';
    g.font = '2.4px sans-serif';
    g.fillText(d.err < 2 ? '✨ そこがふち!キープ' : `ずれ ${d.err?.toFixed(1)}°`, W - 41, 25);
  },
};
