// シーン: えのぐの三原色 (まぜるほど暗くなる減法混色)
// 各えのぐ=透過スペクトル T(λ)、まぜる=積 — を本当に波長計算する
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad, woodTable, softShadow } from '../engine/art.js';
import { gamma } from '../engine/spectrum.js';

// 透過スペクトル (シアン=赤を吸収 / マゼンタ=緑を吸収 / イエロー=青を吸収)
const PAINTS = {
  C: { name: 'シアン', T: (l) => (l < 520 ? 0.9 : l < 580 ? 0.55 : 0.08) },
  M: { name: 'マゼンタ', T: (l) => (l < 480 ? 0.9 : l < 590 ? 0.1 : 0.9) },
  Y: { name: 'イエロー', T: (l) => (l < 470 ? 0.06 : l < 520 ? 0.5 : 0.92) },
};
const QUESTS = [
  { name: 'あか', want: ['M', 'Y'] },
  { name: 'みどり', want: ['C', 'Y'] },
  { name: 'あお', want: ['C', 'M'] },
];

export default {
  id: 'paints',
  name: 'えのぐの三原色',
  emoji: '🎨',
  desc: 'まぜると暗くなるのは なぜ?',
  goal: '🎯 2色ずつまぜて あか・みどり・あお を作ろう! (テレビと反対!)',
  clearMsg: 'えのぐは光を「引き算」する=減法混色!',
  spectrumN: 20,

  init(ctx) {
    const d = ctx.data;
    d.mix = { C: false, M: false, Y: false };
    d.quest = 0;
    d.okT = 0;
    ctx.setTools([
      { id: 'C', icon: '🟦', label: 'シアン' },
      { id: 'M', icon: '🟪', label: 'マゼンタ' },
      { id: 'Y', icon: '🟨', label: 'イエロー' },
      { id: 'wash', icon: '🚿', label: 'あらう' },
    ]);
    ctx.setHint('えのぐは「その色以外を吸収」する。まぜる=吸収が重なる');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.cx = W / 2;
    d.cy = Math.min(H * 0.46, H - 96);
    d.R = Math.min(W * 0.24, 26);
  },

  _mixColor(ctx) {
    const d = ctx.data;
    let r = 0, g2 = 0, b = 0;
    for (const s of ctx.spectrum) {
      let t = 1;
      for (const k of ['C', 'M', 'Y']) if (d.mix[k]) t *= PAINTS[k].T(s.l);
      r += s.rgb[0] * t; g2 += s.rgb[1] * t; b += s.rgb[2] * t;
    }
    return [r, g2, b];
  },

  update(ctx, dt) {
    const d = ctx.data;
    d.col = this._mixColor(ctx);
    const q = QUESTS[d.quest];
    if (!q) { ctx.progress(1); return; }
    const on = Object.keys(d.mix).filter((k) => d.mix[k]);
    const correct = q.want.every((k) => d.mix[k]) && on.length === q.want.length;
    if (correct) {
      d.okT += dt;
      if (d.okT > 1) {
        ctx.sfx.chime();
        ctx.vibrate(15);
        d.quest++;
        d.okT = 0;
        d.mix = { C: false, M: false, Y: false };
        if (d.quest >= QUESTS.length) {
          ctx.progress(1);
        } else {
          ctx.toast(`✅ ${q.name}! つぎは「${QUESTS[d.quest].name}」`);
        }
      }
    } else d.okT = 0;
    if (!ctx._cleared) {
      ctx.progress(Math.min(0.97, d.quest / QUESTS.length + (correct ? 0.1 : 0)));
    }
  },

  onTool(ctx, id) {
    const d = ctx.data;
    if (id === 'wash') {
      d.mix = { C: false, M: false, Y: false };
      ctx.sfx.splash(0.5);
      ctx.toast('🚿 パレットをあらった');
      return;
    }
    if (!(id in d.mix)) return;
    d.mix[id] = !d.mix[id];
    ctx.setToolActive('');
    ctx.sfx.drip();
    const on = Object.keys(d.mix).filter((k) => d.mix[k]).map((k) => PAINTS[k].name);
    ctx.toast(on.length ? `🎨 ${on.join('+')}` : 'まっさらなパレット');
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    g.fillStyle = vgrad(g, 0, H, [[0, '#f8f2e4'], [1, '#eee2cc']]);
    g.fillRect(0, 0, W, H);
    woodTable(g, W, Math.min(H - 14, H * 0.92), H, 1);
    // パレット
    softShadow(g, d.cx, d.cy + d.R + 4, d.R * 1.4, 3, 0.15);
    g.fillStyle = '#fbf8f0';
    g.beginPath();
    g.ellipse(d.cx, d.cy, d.R * 1.55, d.R * 1.25, 0, 0, TAU);
    g.fill();
    g.strokeStyle = '#d0c4a8';
    g.lineWidth = 0.8;
    g.stroke();
  },

  drawFront(ctx, g) {
    const { W } = ctx, d = ctx.data;
    // まぜた色 (中央) — スペクトル積の色
    const [r, g2, b] = d.col ?? [1, 1, 1];
    const on = Object.keys(d.mix).filter((k) => d.mix[k]);
    if (on.length) {
      g.fillStyle = `rgb(${gamma(clamp(r, 0, 1)) * 255},${gamma(clamp(g2, 0, 1)) * 255},${gamma(clamp(b, 0, 1)) * 255})`;
      g.beginPath();
      // べちゃっとした形
      for (let k = 0; k <= 14; k++) {
        const a = (k / 14) * TAU;
        const rad = d.R * (0.72 + 0.14 * Math.sin(k * 2.6 + 1));
        const x = d.cx + Math.cos(a) * rad, y = d.cy + Math.sin(a) * rad * 0.8;
        k === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
      }
      g.closePath();
      g.fill();
    } else {
      g.fillStyle = '#aab';
      g.font = '3px sans-serif';
      g.textAlign = 'center';
      g.fillText('下のボタンで えのぐを出そう', d.cx, d.cy);
      g.textAlign = 'left';
    }
    // 選択中のチューブしるし
    const marks = { C: '🟦', M: '🟪', Y: '🟨' };
    let mx0 = d.cx - 12;
    for (const k of on) {
      g.font = '4px sans-serif';
      g.fillText(marks[k], mx0, d.cy - d.R - 4);
      mx0 += 8;
    }
    // 吸収のしくみ (どの波長が生きのこったか)
    const bx = 10, bw = W - 20, by = d.cy + d.R * 1.4 + 10;
    g.fillStyle = 'rgba(255,255,255,0.9)';
    rr(g, bx - 3, by - 4, bw + 6, 13, 2.5);
    g.fill();
    g.fillStyle = '#667';
    g.font = '2.4px sans-serif';
    g.fillText('生きのこった光 (波長ごと):', bx, by - 0.5);
    for (let i = 0; i < ctx.spectrum.length; i++) {
      const s = ctx.spectrum[i];
      let t = 1;
      for (const k of on) t *= PAINTS[k].T(s.l);
      const mx = Math.max(...s.rgb, 1e-6);
      g.fillStyle = `rgba(${(s.rgb[0] / mx) * 255},${(s.rgb[1] / mx) * 255},${(s.rgb[2] / mx) * 255},${0.15 + t * 0.85})`;
      const w2 = bw / ctx.spectrum.length;
      rr(g, bx + i * w2, by + 2, w2 - 0.4, 4.5 * Math.max(t, 0.08), 0.6);
      g.fill();
    }
    // クエスト表示
    const q = QUESTS[d.quest];
    g.fillStyle = 'rgba(255,255,255,0.92)';
    rr(g, 4, 16, 44, 13, 3);
    g.fill();
    g.fillStyle = '#556';
    g.font = 'bold 2.8px sans-serif';
    g.fillText(q ? `つくる色: 「${q.name}」` : '🎉 ぜんぶ完成!', 7, 21);
    g.fillStyle = '#889';
    g.font = '2.4px sans-serif';
    g.fillText(`できた ${d.quest}/3  (2色えらんでね)`, 7, 25.6);
  },
};
