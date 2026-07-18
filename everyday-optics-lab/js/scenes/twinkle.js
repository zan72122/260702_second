// シーン: 星のまたたき (またたかない星=惑星をさがせ!)
// 点光源はゆらぎ直撃、面光源 (惑星) は多数の光路の平均→またたかない — を実計算
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad } from '../engine/art.js';

const NSTAR = 26;

// 時間相関ノイズ (大気ゆらぎ): sin の重ね合わせ
function turb(t, seed) {
  return (
    Math.sin(t * 5.1 + seed * 7.3) * 0.45 +
    Math.sin(t * 8.7 + seed * 3.1) * 0.3 +
    Math.sin(t * 13.9 + seed * 11.7) * 0.25
  );
}

export default {
  id: 'twinkle',
  name: '星のまたたき',
  emoji: '⭐',
  desc: 'またたかない星が 1つある',
  goal: '🎯 じーっと観察して「またたかない星」=惑星を タップで当てよう!',
  clearMsg: '惑星は面光源だから ゆらぎが平均されてしずか!',
  spectrumN: 6,

  init(ctx) {
    const d = ctx.data;
    d.strength = 0.7;
    d.stars = [];
    d.wrong = 0;
    for (let i = 0; i < NSTAR; i++) {
      d.stars.push({
        u: rand(0.06, 0.94), v: rand(0.08, 0.72),
        base: rand(0.45, 1), seed: rand(0, 100),
        hue: rand(0, 1),
      });
    }
    d.planetIdx = Math.floor(rand(0, NSTAR));
    const pl = d.stars[d.planetIdx];
    pl.base = 0.95; // 惑星は明るめ (金星っぽく)
    ctx.setTools([{ id: 'jet', icon: '💨', label: 'ジェット気流つよめ' }]);
    ctx.setHint('星の光は大気のゆらぎでチカチカ。1つだけ しずかな光がある…');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.ground = Math.min(H - 20, H * 0.9);
  },

  _bright(d, i, t) {
    const s = d.stars[i];
    if (i === d.planetIdx) {
      // 面光源: 9本の独立な光路の平均 → 分散が 1/9
      let sum = 0;
      for (let k = 0; k < 9; k++) sum += 1 + turb(t, s.seed + k * 17.7) * d.strength;
      return s.base * (sum / 9);
    }
    return s.base * (1 + turb(t, s.seed) * d.strength);
  },

  update(ctx, dt) {
    const d = ctx.data;
    if (!ctx._cleared) {
      d.watchT = (d.watchT ?? 0) + dt;
      ctx.progress(clamp(0.2 + d.watchT * 0.02 + (d.found ? 0.8 : 0), 0, d.found ? 1 : 0.6));
    }
  },

  onDown(ctx, p) {
    const d = ctx.data;
    if (d.found) return;
    // タップした星
    let best = -1, bd = 99;
    d.stars.forEach((s, i) => {
      const sx = s.u * ctx.W, sy = s.v * d.ground;
      const dd = Math.hypot(p.x - sx, p.y - sy);
      if (dd < bd) { bd = dd; best = i; }
    });
    if (bd > 8) return;
    if (best === d.planetIdx) {
      d.found = true;
      ctx.sfx.fanfare();
      ctx.progress(1);
      ctx.toast('🪐 せいかい!惑星は「円ばん」だから またたかない!');
    } else {
      d.wrong++;
      ctx.sfx.pop(0.6);
      ctx.vibrate(10);
      ctx.toast(d.wrong < 3 ? '❌ それは恒星 (チカチカしてる)。よーく見て!' : '💡 ヒント: いちばん おだやかに光る星だよ');
    }
  },

  onTool(ctx, id) {
    if (id !== 'jet') return;
    const d = ctx.data;
    d.strength = d.strength > 0.8 ? 0.45 : 1.15;
    ctx.toast(d.strength > 0.8 ? '💨 ジェット気流ビュー!またたき最大 (見つけやすい?)' : '🍃 おだやかな夜');
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    g.fillStyle = vgrad(g, 0, H, [[0, '#060a18'], [0.7, '#0c1226'], [1, '#141a30']]);
    g.fillRect(0, 0, W, H);
    // 天の川 うっすら
    g.save();
    g.rotate(-0.3);
    g.fillStyle = 'rgba(180,190,230,0.06)';
    g.fillRect(-30, H * 0.3, W * 1.6, 26);
    g.restore();
    // 山なみ
    g.fillStyle = '#0a0e1a';
    g.beginPath();
    g.moveTo(0, d.ground);
    for (let x = 0; x <= W; x += 10) {
      g.lineTo(x, d.ground - 4 - Math.abs(Math.sin(x * 0.05 + 2)) * 8);
    }
    g.lineTo(W, H); g.lineTo(0, H);
    g.closePath();
    g.fill();
    // 望遠鏡のシルエット
    g.fillStyle = '#080c16';
    g.save();
    g.translate(W * 0.82, d.ground + 2);
    g.rotate(-0.6);
    rr(g, -2, -16, 4.5, 18, 1.5);
    g.fill();
    g.restore();
    g.fillStyle = '#080c16';
    g.beginPath();
    g.moveTo(W * 0.78, d.ground + 2); g.lineTo(W * 0.86, d.ground + 2); g.lineTo(W * 0.82, d.ground + 14);
    g.closePath();
    g.fill();
  },

  drawFront(ctx, g) {
    const { W } = ctx, d = ctx.data;
    g.save();
    g.globalCompositeOperation = 'lighter';
    d.stars.forEach((s, i) => {
      const sx = s.u * W, sy = s.v * d.ground;
      const b = clamp(this._bright(d, i, ctx.t), 0.05, 2);
      // 位置ゆらぎ (惑星はほぼなし)
      const jx = i === d.planetIdx ? 0 : turb(ctx.t * 1.3, s.seed + 50) * 0.35 * d.strength;
      const r2 = 0.7 + b * 0.75;
      const grad = g.createRadialGradient(sx + jx, sy, 0, sx + jx, sy, r2 * 2.6);
      const warm = s.hue > 0.7;
      grad.addColorStop(0, `rgba(255,255,255,${clamp(b * 0.85, 0, 1)})`);
      grad.addColorStop(0.35, warm ? `rgba(255,220,170,${clamp(b * 0.5, 0, 0.8)})` : `rgba(190,215,255,${clamp(b * 0.5, 0, 0.8)})`);
      grad.addColorStop(1, 'rgba(120,150,255,0)');
      g.fillStyle = grad;
      g.beginPath();
      g.arc(sx + jx, sy, r2 * 2.6, 0, TAU);
      g.fill();
      if (d.found && i === d.planetIdx) {
        // 正解の惑星: リングつきでズームアップ表示
        g.strokeStyle = 'rgba(255,220,150,0.9)';
        g.lineWidth = 0.6;
        g.beginPath();
        g.arc(sx, sy, 5 + Math.sin(ctx.t * 3) * 0.6, 0, TAU);
        g.stroke();
      }
    });
    g.restore();
    if (d.found) {
      const pl = d.stars[d.planetIdx];
      g.fillStyle = 'rgba(255,255,255,0.92)';
      rr(g, W / 2 - 26, 34, 52, 22, 3);
      g.fill();
      // 惑星のズーム図 (円ばん+輪)
      g.fillStyle = '#e8c88a';
      g.beginPath();
      g.arc(W / 2 - 14, 45, 5, 0, TAU);
      g.fill();
      g.strokeStyle = '#c8a86a';
      g.lineWidth = 1.2;
      g.save();
      g.translate(W / 2 - 14, 45);
      g.rotate(-0.4);
      g.beginPath();
      g.ellipse(0, 0, 8.5, 2.4, 0, 0, TAU);
      g.stroke();
      g.restore();
      g.fillStyle = '#556';
      g.font = 'bold 2.8px sans-serif';
      g.fillText('円ばん=たくさんの点の', W / 2 - 4, 42);
      g.fillText('平均→またたかない!', W / 2 - 4, 46.5);
      g.font = '2.4px sans-serif';
      g.fillStyle = '#889';
      g.fillText('恒星は遠すぎて「点」', W / 2 - 4, 51);
    }
    // メーター
    g.fillStyle = 'rgba(255,255,255,0.92)';
    rr(g, 4, 16, 40, 11, 3);
    g.fill();
    g.fillStyle = '#556';
    g.font = 'bold 2.6px sans-serif';
    g.fillText(`大気のゆらぎ ${(d.strength * 100) | 0}%`, 7, 20.6);
    g.fillStyle = '#889';
    g.font = '2.3px sans-serif';
    g.fillText(d.found ? '🪐 発見ずみ!' : `はずれ ${d.wrong}回`, 7, 24.6);
  },
};
