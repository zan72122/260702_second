// シーン: めがねレンズ (近視・遠視を レンズで直すしくみ)
// 薄レンズ合成: 眼のパワー+めがねのパワー → 焦点位置と網膜のズレ=ボケ
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad } from '../engine/art.js';

const CASES = [
  { id: 'myopia', name: 'きんし (近視)', eyeLen: 24.8, emoji: '😵', hint: '眼球が長め → 焦点が手前' },
  { id: 'hyper', name: 'えんし (遠視)', eyeLen: 22.6, emoji: '🥲', hint: '眼球が短め → 焦点が奥' },
];
const EYE_POWER = 1000 / 24; // 正視の眼: 24mm で焦点 (D)

export default {
  id: 'glasses',
  name: 'めがねレンズ',
  emoji: '👓',
  desc: '近視も遠視も レンズでピタッ',
  goal: '🎯 レンズの度数を調整して 2人の目のボケを直そう!',
  clearMsg: '近視は凹レンズ (−)、遠視は凸レンズ (+)!',
  spectrumN: 6,

  init(ctx) {
    const d = ctx.data;
    d.caseIdx = 0;
    d.power = 0;   // めがねの度数 [D]
    d.fixed = [false, false];
    d.okT = 0;
    ctx.setTools([
      { id: 'minus', icon: '➖', label: 'ど数を−へ' },
      { id: 'plus', icon: '➕', label: 'ど数を+へ' },
      { id: 'next', icon: '👥', label: 'つぎの人' },
    ]);
    ctx.setHint('光が網膜 (目のおく) でピタッと集まれば くっきり見える');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.cy = H * 0.42;
    d.eyeX = W * 0.62;
    d.eyeR = Math.min(W * 0.19, 21);
    d.srcX = W * 0.08;
  },

  update(ctx, dt) {
    const d = ctx.data;
    const c = CASES[d.caseIdx];
    // 薄レンズ合成: 合成パワー = 眼 + めがね → 焦点距離 [mm]
    const total = EYE_POWER + d.power;
    const focal = 1000 / total;                 // mm
    // 網膜位置 c.eyeLen とのズレ → ボケ半径
    d.focusErr = focal - c.eyeLen;              // +なら奥 (遠視側)
    d.blur = Math.abs(d.focusErr) * 1.3;
    const sharp = d.blur < 0.45;
    if (sharp && !d.fixed[d.caseIdx]) {
      d.okT += dt;
      if (d.okT > 1.2) {
        d.fixed[d.caseIdx] = true;
        ctx.sfx.chime();
        ctx.vibrate(20);
        ctx.toast(`${c.emoji}→😄 くっきり! ${d.power > 0 ? '凸(+)' : '凹(−)'}レンズ ${d.power.toFixed(2)}D で矯正`);
      }
    } else if (!sharp) {
      d.okT = 0;
    }
    const done = d.fixed.filter(Boolean).length;
    ctx.progress(done >= 2 ? 1 : Math.min(0.97, done / 2 + clamp(0.45 / Math.max(d.blur, 0.45), 0, 1) * 0.2));
  },

  onTool(ctx, id) {
    const d = ctx.data;
    if (id === 'minus') d.power = clamp(d.power - 0.75, -6, 6);
    if (id === 'plus') d.power = clamp(d.power + 0.75, -6, 6);
    if (id === 'next') {
      d.caseIdx = (d.caseIdx + 1) % 2;
      d.power = 0;
      d.okT = 0;
      const c = CASES[d.caseIdx];
      ctx.toast(`${c.emoji} ${c.name}さん: ${c.hint}`);
      ctx.backDirty();
      return;
    }
    ctx.toast(`👓 ${d.power > 0 ? '+' : ''}${d.power.toFixed(2)}D ${d.power < 0 ? '(凹レンズ)' : d.power > 0 ? '(凸レンズ)' : '(ど数なし)'}`);
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    g.fillStyle = vgrad(g, 0, H, [[0, '#eef3f8'], [1, '#dbe5ee']]);
    g.fillRect(0, 0, W, H);
    // 視力検査表
    g.fillStyle = '#fff';
    rr(g, W * 0.03, d.cy - 26, 13, 34, 1.5);
    g.fill();
    g.strokeStyle = '#c8ccd8';
    g.lineWidth = 0.5;
    rr(g, W * 0.03, d.cy - 26, 13, 34, 1.5);
    g.stroke();
    g.strokeStyle = '#334';
    for (let k = 0; k < 4; k++) {
      const r2 = 3.4 - k * 0.7;
      const y = d.cy - 20 + k * 8.5;
      g.lineWidth = r2 * 0.5;
      g.beginPath();
      g.arc(W * 0.03 + 6.5, y, r2, 0.6 + k, 0.6 + k + TAU * 0.75);
      g.stroke();
    }
    g.fillStyle = '#667';
    g.font = '2.4px sans-serif';
    g.fillText('けんさ表', W * 0.03, d.cy + 12.5);
  },

  drawFront(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    const c = CASES[d.caseIdx];
    const eyeLenPx = d.eyeR * 2 * (c.eyeLen / 24); // 眼球の長さ (誇張表示)
    const lensX = d.eyeX - d.eyeR - 8;
    const retinaX = d.eyeX - d.eyeR + eyeLenPx;
    // 眼球 (断面)
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.beginPath();
    g.ellipse(d.eyeX - d.eyeR + eyeLenPx / 2, d.cy, eyeLenPx / 2, d.eyeR * 0.82, 0, 0, TAU);
    g.fill();
    g.strokeStyle = '#8a95a8';
    g.lineWidth = 0.9;
    g.stroke();
    // 水晶体
    g.fillStyle = 'rgba(160,200,240,0.55)';
    g.beginPath();
    g.ellipse(d.eyeX - d.eyeR + 3, d.cy, 2.6, 6.5, 0, 0, TAU);
    g.fill();
    // 網膜
    g.strokeStyle = '#e86a5a';
    g.lineWidth = 1.4;
    g.beginPath();
    g.arc(d.eyeX - d.eyeR + eyeLenPx - d.eyeR * 0.55, d.cy, d.eyeR * 0.62, -0.8, 0.8);
    g.stroke();
    g.fillStyle = '#e86a5a';
    g.font = 'bold 2.5px sans-serif';
    g.fillText('網膜', retinaX + 2, d.cy - 8);
    // めがねレンズ
    if (d.power !== 0) {
      g.fillStyle = 'rgba(170,215,245,0.4)';
      g.strokeStyle = '#5a8ac8';
      g.lineWidth = 0.8;
      g.beginPath();
      if (d.power > 0) {
        g.ellipse(lensX, d.cy, 1.6 + d.power * 0.25, 11, 0, 0, TAU);
      } else {
        // 凹レンズ (砂時計形)
        g.moveTo(lensX - 2, d.cy - 11);
        g.quadraticCurveTo(lensX + 0.5 - d.power * 0.2, d.cy, lensX - 2, d.cy + 11);
        g.lineTo(lensX + 2, d.cy + 11);
        g.quadraticCurveTo(lensX - 0.5 + d.power * 0.2, d.cy, lensX + 2, d.cy - 11);
        g.closePath();
      }
      g.fill();
      g.stroke();
    }
    // 光線: 遠くから平行に → (めがね) → 眼レンズ → 焦点
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = 'rgba(255,235,150,0.6)';
    g.lineWidth = 0.5;
    const focusPx = retinaX + d.focusErr * 1.3 * 3; // ズレを誇張
    for (const dy of [-7, -3.5, 3.5, 7]) {
      g.beginPath();
      g.moveTo(d.srcX + 12, d.cy + dy);
      if (d.power !== 0) {
        g.lineTo(lensX, d.cy + dy);
        const bend = dy * (1 - clamp(d.power / 8 + 1, 0.5, 1.5) * 0.0);
        g.lineTo(d.eyeX - d.eyeR + 2, d.cy + dy * (1 - d.power * 0.045));
      } else {
        g.lineTo(d.eyeX - d.eyeR + 2, d.cy + dy);
      }
      g.lineTo(focusPx, d.cy);
      // 焦点を超えて広がる (ボケ)
      const over = retinaX - focusPx;
      if (Math.abs(over) > 0.5) {
        g.lineTo(retinaX, d.cy - dy * clamp(over / 18, -1, 1));
      }
      g.stroke();
    }
    // 焦点マーク
    g.fillStyle = 'rgba(255,220,90,0.9)';
    g.beginPath();
    g.arc(focusPx, d.cy, 0.9, 0, TAU);
    g.fill();
    g.restore();
    // 見え方プレビュー (下)
    const pv = { x: W / 2, y: Math.min(H * 0.78, H - 46), w: Math.min(W * 0.5, 52), h: 24 };
    g.fillStyle = '#fff';
    rr(g, pv.x - pv.w / 2, pv.y - pv.h / 2, pv.w, pv.h, 2.5);
    g.fill();
    g.strokeStyle = '#aab';
    g.lineWidth = 0.6;
    rr(g, pv.x - pv.w / 2, pv.y - pv.h / 2, pv.w, pv.h, 2.5);
    g.stroke();
    const blurPx = clamp(d.blur * 1.6, 0, 5);
    g.save();
    g.beginPath();
    rr(g, pv.x - pv.w / 2, pv.y - pv.h / 2, pv.w, pv.h, 2.5);
    g.clip();
    // ボケ = ずらし重ね描き
    const steps2 = blurPx < 0.3 ? 1 : 6;
    g.globalAlpha = 1 / steps2 + 0.08;
    for (let s2 = 0; s2 < steps2; s2++) {
      const a = (s2 / steps2) * TAU;
      const ox = Math.cos(a) * blurPx, oy = Math.sin(a) * blurPx;
      g.fillStyle = '#334';
      g.font = `bold ${pv.h * 0.42}px sans-serif`;
      g.textAlign = 'center';
      g.fillText('ひかり', pv.x + ox, pv.y + pv.h * 0.16 + oy);
    }
    g.restore();
    g.globalAlpha = 1;
    g.textAlign = 'left';
    g.fillStyle = '#667';
    g.font = '2.4px sans-serif';
    g.textAlign = 'center';
    g.fillText(`${c.emoji} ${c.name}さんの見え方`, pv.x, pv.y + pv.h / 2 + 4);
    g.textAlign = 'left';
    // メーター
    g.fillStyle = 'rgba(255,255,255,0.92)';
    rr(g, W - 44, 16, 42, 15, 3);
    g.fill();
    g.fillStyle = '#556';
    g.font = 'bold 2.6px sans-serif';
    g.fillText(`ど数 ${d.power > 0 ? '+' : ''}${d.power.toFixed(2)}D`, W - 41, 20.5);
    g.fillStyle = d.blur < 0.45 ? '#2a9a4a' : '#a86';
    g.font = '2.4px sans-serif';
    g.fillText(d.blur < 0.45 ? '✨ ピント ぴったり!' : `ボケ ${d.blur.toFixed(1)}`, W - 41, 24.6);
    g.fillStyle = '#889';
    g.fillText(`なおした人 ${d.fixed.filter(Boolean).length}/2`, W - 41, 28.6);
  },
};
