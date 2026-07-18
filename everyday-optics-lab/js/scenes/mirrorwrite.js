// シーン: 救急車の鏡文字 (バックミラーで正しく読めるひみつ)
import { TAU, rand, clamp, pick } from '../engine/utils.js';
import { rr, vgrad } from '../engine/art.js';

const QUIZ = [
  { word: 'キウイ', choices: ['キウイ', 'イウキ', 'キケイ'] },
  { word: 'ヤマ', choices: ['マヤ', 'ヤマ', 'サマ'] },
  { word: 'ミルク', choices: ['クミル', 'ミクル', 'ミルク'] },
];

export default {
  id: 'mirrorwrite',
  name: '救急車の鏡文字',
  emoji: '🚑',
  desc: 'ミラーで読める さかさ文字',
  goal: '🎯 ミラーにうつった文字の「もとの文字」を3問あてよう!',
  clearMsg: '鏡は前後を反転→文字は左右さかさに見える!',
  spectrumN: 6,

  init(ctx) {
    const d = ctx.data;
    d.q = 0;
    d.correct = 0;
    d.tapFx = [];
    ctx.setHint('救急車のボンネットの文字は 前の車のミラーで正しく見えるように鏡文字!');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.mirY = H * 0.28;              // バックミラーの位置
    d.carY = Math.min(H * 0.62, H - 90);
    d.choiceY = Math.min(H * 0.82, H - 44);
  },

  update(ctx, dt) {
    const d = ctx.data;
    for (let i = d.tapFx.length - 1; i >= 0; i--) {
      d.tapFx[i].t -= dt;
      if (d.tapFx[i].t <= 0) d.tapFx.splice(i, 1);
    }
    if (d.revealT > 0) d.revealT -= dt;
    if (!ctx._cleared) ctx.progress(Math.min(0.97, d.correct / 3));
  },

  onDown(ctx, p) {
    const d = ctx.data;
    const quiz = QUIZ[d.q];
    if (!quiz) return;
    // 選択肢のヒット判定
    const W = ctx.W;
    quiz.choices.forEach((c, i) => {
      const bx = W * (0.18 + i * 0.32), bw = W * 0.26;
      if (Math.abs(p.x - bx) < bw / 2 && Math.abs(p.y - d.choiceY) < 8) {
        if (c === quiz.word) {
          d.correct++;
          ctx.sfx.chime();
          ctx.vibrate(15);
          d.revealT = 1.6;
          d.revealWord = quiz.word;
          d.q++;
          if (d.correct >= 3) {
            ctx.progress(1);
          } else {
            ctx.toast(`⭕ せいかい!ミラーでかくにん (${d.correct}/3)`);
          }
        } else {
          ctx.sfx.pop(0.6);
          d.tapFx.push({ x: bx, y: d.choiceY, t: 0.6 });
          ctx.toast('❌ ミラーの中を よーく見て!');
        }
      }
    });
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    // 車内から見た風景
    g.fillStyle = vgrad(g, 0, H, [[0, '#a8d0e8'], [0.5, '#cfe4f2'], [1, '#e2eef6']]);
    g.fillRect(0, 0, W, H);
    // 道路
    g.fillStyle = '#68707e';
    g.beginPath();
    g.moveTo(W * 0.2, H);
    g.lineTo(W * 0.42, d.carY - 14);
    g.lineTo(W * 0.58, d.carY - 14);
    g.lineTo(W * 0.8, H);
    g.closePath();
    g.fill();
    g.fillStyle = '#fff';
    for (let k = 0; k < 4; k++) {
      const t = 0.2 + k * 0.22;
      g.fillRect(W * 0.5 - 0.8 - t, d.carY - 14 + t * (H - d.carY + 14) / 1, 1.6 + t * 2, 4 + t * 4);
    }
    // 街路樹
    for (const tx of [W * 0.08, W * 0.92]) {
      g.fillStyle = '#7a5a3a';
      g.fillRect(tx - 1, d.carY - 6, 2, 14);
      g.fillStyle = '#5a9a4a';
      g.beginPath();
      g.arc(tx, d.carY - 10, 6, 0, TAU);
      g.fill();
    }
  },

  drawFront(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    const quiz = QUIZ[d.q];
    // うしろの救急車 (ボンネットに鏡文字)
    const cy = d.carY;
    g.fillStyle = '#f4f6f8';
    rr(g, W * 0.32, cy - 12, W * 0.36, 22, 3);
    g.fill();
    g.strokeStyle = '#b8c0cc';
    g.lineWidth = 0.7;
    rr(g, W * 0.32, cy - 12, W * 0.36, 22, 3);
    g.stroke();
    // 赤ライン+ランプ
    g.fillStyle = '#e83a3a';
    rr(g, W * 0.32, cy + 3, W * 0.36, 3, 1);
    g.fill();
    g.fillStyle = Math.sin(ctx.t * 6) > 0 ? '#ff5a5a' : '#ffb0b0';
    rr(g, W * 0.47, cy - 15.5, W * 0.06, 3.5, 1.2);
    g.fill();
    // フロントガラス
    g.fillStyle = 'rgba(150,190,220,0.55)';
    rr(g, W * 0.36, cy - 10, W * 0.28, 7, 1.5);
    g.fill();
    // ボンネットの鏡文字 (左右反転で描く)
    if (quiz) {
      g.save();
      g.translate(W * 0.5, cy - 0.2);
      g.scale(-1, 1); // ← 鏡文字!
      g.fillStyle = '#c83a3a';
      g.font = 'bold 4.6px sans-serif';
      g.textAlign = 'center';
      g.fillText(quiz.word, 0, 1.6);
      g.restore();
    }
    // バックミラー (中に正しい向きの像)
    g.fillStyle = '#2c3038';
    rr(g, W * 0.5 - 21, d.mirY - 9, 42, 18, 3);
    g.fill();
    g.fillStyle = '#cfe0ea';
    rr(g, W * 0.5 - 19, d.mirY - 7, 38, 14, 2);
    g.fill();
    // ミラーの中: 正解した直後だけ「正しく読める文字」を見せて答え合わせ
    if ((d.revealT ?? 0) > 0 && d.revealWord) {
      g.fillStyle = '#f4f6f8';
      rr(g, W * 0.5 - 12, d.mirY - 4.5, 24, 8, 1.5);
      g.fill();
      g.fillStyle = '#c83a3a';
      g.font = 'bold 3.4px sans-serif';
      g.textAlign = 'center';
      g.fillText(d.revealWord, W * 0.5, d.mirY + 1.6); // ← 鏡でもう一度反転→正しく!
      g.textAlign = 'left';
    } else {
      g.fillStyle = '#8a99a8';
      g.font = 'bold 4px sans-serif';
      g.textAlign = 'center';
      g.fillText('?', W * 0.5, d.mirY + 1.6);
      g.textAlign = 'left';
    }
    g.fillStyle = '#667';
    g.font = '2.4px sans-serif';
    g.fillText('バックミラー', W * 0.5 - 20, d.mirY - 11);
    // 説明の矢印
    g.strokeStyle = 'rgba(90,110,140,0.6)';
    g.lineWidth = 0.5;
    g.setLineDash([1.5, 1.2]);
    g.beginPath();
    g.moveTo(W * 0.5, cy - 13);
    g.quadraticCurveTo(W * 0.62, (cy + d.mirY) / 2, W * 0.52, d.mirY + 10);
    g.stroke();
    g.setLineDash([]);
    // クイズ選択肢
    if (quiz) {
      g.fillStyle = 'rgba(255,255,255,0.95)';
      rr(g, W * 0.06, d.choiceY - 13, W * 0.88, 24, 3);
      g.fill();
      g.fillStyle = '#556';
      g.font = 'bold 2.8px sans-serif';
      g.textAlign = 'center';
      g.fillText('もとの文字 (ボンネットに書いてある通り) はどれ?', W * 0.5, d.choiceY - 8);
      quiz.choices.forEach((c, i) => {
        const bx = W * (0.18 + i * 0.32);
        const miss = d.tapFx.find((f) => Math.abs(f.x - bx) < 2);
        g.fillStyle = miss ? '#f0c0c0' : '#eef2f8';
        rr(g, bx - W * 0.13, d.choiceY - 4, W * 0.26, 12, 2.5);
        g.fill();
        g.strokeStyle = '#aab8cc';
        g.lineWidth = 0.5;
        rr(g, bx - W * 0.13, d.choiceY - 4, W * 0.26, 12, 2.5);
        g.stroke();
        g.fillStyle = '#334';
        g.font = 'bold 3.6px sans-serif';
        g.fillText(c, bx, d.choiceY + 4);
      });
      g.textAlign = 'left';
    }
    // スコア
    g.fillStyle = 'rgba(255,255,255,0.92)';
    rr(g, 4, 16, 30, 10, 3);
    g.fill();
    g.fillStyle = '#556';
    g.font = 'bold 2.7px sans-serif';
    g.fillText(`せいかい ${d.correct}/3`, 7, 22.5);
  },
};
