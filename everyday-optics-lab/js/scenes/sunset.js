// シーン: 夕焼けメーカー (青が散らばりきると 赤がのこる)
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad } from '../engine/art.js';
import { rayleighBeta } from '../engine/spectrum.js';

// シェーダと同じ式で「地平線ちかくの色」を JS 側でも評価 (ゴール判定用)
function horizonColor(sunEl, haze) {
  const beta = [0.652, 1.007, 1.956]; // 612/549/465nm の λ⁻⁴ 比
  const mSun = 1 / (Math.max(sunEl, -0.03) * 0.95 + 0.055);
  const T = beta.map((b) => Math.exp(-b * mSun * (0.22 + haze * 0.35)));
  const mView = 1 / (0.06 * 0.9 + 0.08);
  return beta.map((b, i) => b * T[i] * (1 - Math.exp(-0.35 * mView)) * 1.35 + T[i] * haze * 0.9);
}

export default {
  id: 'sunset',
  name: '夕焼けメーカー',
  emoji: '🌅',
  desc: 'いちばん赤い空をつくろう',
  goal: '🎯 太陽をしずめて ちりを調整…「真っ赤な夕焼け」をつくろう!',
  clearMsg: '青は散らばり 赤はまっすぐ届く!',
  spectrumN: 10,

  init(ctx) {
    const d = ctx.data;
    d.sunEl = 0.55;  // 高度 (0=地平線)
    d.sunX = 0.62;
    d.haze = 0.15;
    d.okT = 0;
    ctx.setTools([
      { id: 'hazeUp', icon: '🌫️', label: 'ちりをふやす' },
      { id: 'hazeDn', icon: '🍃', label: 'ちりをへらす' },
    ]);
    ctx.setHint('☀️ を下へドラッグ。空気の中を通る距離がのびると 青が散って消える');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.ground = Math.min(H - 26, H * 0.82);
  },

  sky(ctx) {
    const d = ctx.data;
    return {
      name: 'sunset',
      uniforms: {
        // シェーダ uv は下=0 なので反転: 画面の地平線位置に合わせる
        uSun: [d.sunX, d.sunEl],
        uHaze: d.haze,
      },
    };
  },

  update(ctx, dt) {
    const d = ctx.data, p = ctx.primary;
    if (p && p.y < d.ground) {
      d.sunX = clamp(p.x / ctx.W, 0.1, 0.9);
      // 画面の下=高度低。ground より上の範囲を 0..1 に
      d.sunEl = clamp(1 - p.y / d.ground, 0, 1) * 0.9 - 0.06;
    }
    // 赤さの評価 (物理式から)
    const [r, g2, b] = horizonColor(d.sunEl, d.haze);
    const redness = r / (g2 + b + 0.008);
    d.redness = redness;
    const good = d.sunEl < 0.1 && d.sunEl > -0.05 && redness > 1.35;
    if (good) {
      d.okT += dt;
      ctx.progress(Math.min(1, d.okT / 2));
      if (!d.saidR) { d.saidR = true; ctx.toast('🌅 まっか!ちり (ミー散乱) が赤をひきたてる'); }
    } else {
      d.okT = Math.max(0, d.okT - dt * 0.5);
      if (!ctx._cleared) {
        ctx.progress(clamp(redness / 1.35 * 0.6 + clamp(1 - Math.abs(d.sunEl - 0.03) * 4, 0, 1) * 0.3, 0, 0.95));
      }
    }
    // 鳥
    if (Math.random() < dt * 0.15 && d.sunEl > 0.1) {
      ctx.fx.addSpray(ctx.W + 4, rand(20, d.ground * 0.5), -rand(14, 22), 0, 'rgba(40,40,60,0.8)', 0.7, 4);
    }
  },

  onTool(ctx, id) {
    const d = ctx.data;
    if (id === 'hazeUp') d.haze = clamp(d.haze + 0.18, 0, 1);
    if (id === 'hazeDn') d.haze = clamp(d.haze - 0.18, 0, 1);
    ctx.toast(`🌫️ 空気中のちり: ${(d.haze * 100) | 0}% ${d.haze > 0.5 ? '(夕焼けが燃える!)' : ''}`);
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    // 地面と街のシルエット (空はシェーダ)
    g.fillStyle = '#1a1626';
    g.fillRect(0, d.ground, W, H - d.ground);
    g.fillStyle = 'rgba(24,20,38,0.96)';
    let x = 0;
    let k = 0;
    while (x < W) {
      const w = 6 + ((k * 37) % 10);
      const h = 8 + ((k * 53) % 22);
      g.fillRect(x, d.ground - h, w, h + 1);
      // 窓あかり
      g.fillStyle = 'rgba(255,220,140,0.8)';
      for (let wy = d.ground - h + 2; wy < d.ground - 3; wy += 4) {
        if ((k + wy) % 3 === 0) g.fillRect(x + 1.5, wy, 1.1, 1.6);
      }
      g.fillStyle = 'rgba(24,20,38,0.96)';
      x += w + 2 + (k % 4);
      k++;
    }
  },

  drawFront(ctx, g) {
    const { W } = ctx, d = ctx.data;
    // 赤さメーター
    g.fillStyle = 'rgba(255,255,255,0.92)';
    rr(g, 4, 16, 40, 12, 3);
    g.fill();
    g.fillStyle = '#556';
    g.font = 'bold 2.7px sans-serif';
    g.fillText('赤さメーター', 7, 20.6);
    g.fillStyle = '#ddd';
    rr(g, 7, 22.4, 34, 2.8, 1.4);
    g.fill();
    const t = clamp((d.redness ?? 0) / 2.2, 0, 1);
    g.fillStyle = `rgb(${140 + t * 115},${90 - t * 40},${70 - t * 40})`;
    rr(g, 7, 22.4, Math.max(0.01, 34 * t), 2.8, 1.4);
    g.fill();
    // しきい線
    g.fillStyle = '#889';
    g.fillRect(7 + 34 * (1.35 / 2.2), 21.8, 0.5, 4);
    // 太陽高度表示
    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.font = '2.5px sans-serif';
    g.fillText(`太陽高度 ${(d.sunEl * 40).toFixed(0)}°`, W - 30, 20);
  },
};
