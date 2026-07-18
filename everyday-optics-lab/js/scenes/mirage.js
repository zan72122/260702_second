// シーン: 逃げ水 (あつい道路の上で 光が曲がる)
// 目線ごとにレイを屈折率勾配の中でマーチして「なにが見えるか」を描く本物の蜃気楼計算
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad, sun, cloud } from '../engine/art.js';
import { marchRay } from '../engine/march.js';

export default {
  id: 'mirage',
  name: '逃げ水',
  emoji: '🛣️',
  desc: '道路のさきに 水たまり!?',
  goal: '🎯 道路をあつくして 「逃げ水」と 車のさかさ像を観察しよう!',
  clearMsg: '正体は 曲がった光がうつす「空」だった!',
  spectrumN: 8,

  init(ctx) {
    const d = ctx.data;
    d.roadTemp = 20;    // 路面温度 [℃]
    d.carX = 999;       // 車 (遠景) の位置
    d.carOn = false;
    d.okT = 0;
    ctx.setTools([
      { id: 'heat', icon: '🔥', label: '道路をあたためる' },
      { id: 'cool', icon: '🧊', label: 'ひやす' },
      { id: 'car', icon: '🚗', label: '車を走らせる' },
    ]);
    ctx.setHint('道路のすぐ上のあつい空気は 屈折率が小さい→光が上ぞりに曲がる!');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    // 遠近感のある一人称の道路ビュー
    d.horizon = H * 0.5;
    d.rows = 64; // 地平線から手前までの視線サンプル
  },

  // 屈折率場: 路面 (y=0) 近くが熱く n が小さい
  _nField(temp) {
    const dn = (temp - 20) * 4.5e-6; // 温度差→屈折率差
    return (x, y) => 1.000293 - dn * Math.exp(-Math.max(0, y) / 0.35);
  },

  update(ctx, dt) {
    const d = ctx.data;
    // 車
    if (d.carOn) {
      d.carX -= dt * 55;
      if (d.carX < 25) { d.carOn = false; d.carX = 999; }
    }
    // 視線マーチ (側面図: x=前方距離[m], y=高さ[m])
    // 目の高さ 1.5m。画面の各行 = 見おろし角。何にぶつかるかを記録
    const nFn = this._nField(d.roadTemp);
    const eyeH = 1.5;
    d.view = [];
    let mirageRows = 0, carMirage = 0;
    for (let r2 = 0; r2 < d.rows; r2++) {
      const t = r2 / (d.rows - 1);
      // 見おろし角: 0.1°(遠く) 〜 8°(手前)
      const ang = (0.1 + t * t * 7.9) * Math.PI / 180;
      const res = marchRay(0, eyeH, Math.cos(ang), -Math.sin(ang), nFn, {
        step: 1.1, maxSteps: 260,
        stop: (x, y, dx2, dy2) => y <= 0.005 || x > 260 || y > 30,
      });
      // 何が見えたか: 上向きに曲がって空へぬけたレイだけが「逃げ水」
      let kind = 'road', dist = res.x;
      if (res.y > 0.02 && res.dy > 0.0005) {
        kind = 'sky';
        mirageRows++;
      } else if (d.carOn) {
        // 車 (x=carX..carX+4, h<1.6) にぶつかったか: マーチ経路をチェック
        const pts = res.pts;
        for (let k = 0; k < pts.length - 2; k += 2) {
          if (pts[k] > d.carX && pts[k] < d.carX + 5 && pts[k + 1] < 1.7) {
            kind = pts[k + 3] !== undefined && pts[k + 1] < pts[k + 3] ? 'carUp' : 'car';
            // 上向きに当たった (=下から見上げた) → さかさ像
            const goingUp = k > 2 && pts[k + 1] > pts[k - 1];
            kind = goingUp ? 'carM' : 'car';
            if (goingUp) carMirage++;
            dist = pts[k];
            break;
          }
        }
      }
      d.view.push({ kind, dist });
    }
    d.mirageRows = mirageRows;
    d.carMirage = carMirage;
    // ゴール: 逃げ水が見えている + (車のさかさ像 or 十分観察)
    const hasMirage = mirageRows >= 6;
    if (hasMirage && !d.saidM) { d.saidM = true; ctx.toast('💧 道路に水!? …実は下から曲がってきた「空の光」'); }
    d.mirT = (d.mirT ?? 0) + (hasMirage ? dt : 0);
    if (hasMirage && (carMirage >= 2 || d.carSeen || d.mirT > 7)) {
      if (carMirage >= 2) d.carSeen = true;
      d.okT += dt;
      ctx.progress(Math.min(1, d.okT / 1.6));
    } else {
      if (!ctx._cleared) ctx.progress(clamp(mirageRows / 6 * 0.55 + (d.roadTemp - 20) / 45 * 0.3, 0, 0.95));
    }
    // かげろうエフェクト
    if (d.roadTemp > 35 && Math.random() < dt * 8) {
      ctx.fx.addSteam(rand(ctx.W * 0.3, ctx.W * 0.7), d.horizon + rand(2, 14), 2);
    }
  },

  onTool(ctx, id) {
    const d = ctx.data;
    if (id === 'heat') {
      d.roadTemp = clamp(d.roadTemp + 8, 20, 65);
      ctx.toast(`🔥 路面 ${d.roadTemp}℃ ${d.roadTemp >= 50 ? '— 真夏のアスファルト!' : ''}`);
    }
    if (id === 'cool') {
      d.roadTemp = clamp(d.roadTemp - 8, 20, 65);
      ctx.toast(`🧊 路面 ${d.roadTemp}℃`);
    }
    if (id === 'car') {
      if (!d.carOn) { d.carOn = true; d.carX = 240; ctx.toast('🚗 遠くから車がきた…下をよく見て!'); }
    }
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    // 空
    g.fillStyle = vgrad(g, 0, d.horizon, [[0, '#7db8e8'], [1, '#cfe8f6']]);
    g.fillRect(0, 0, W, d.horizon);
    sun(g, W * 0.82, 12, 5);
    cloud(g, W * 0.25, 16, 0.9, 0.85);
    // 遠くの山
    g.fillStyle = '#9fbf9a';
    g.beginPath();
    g.moveTo(0, d.horizon);
    g.lineTo(W * 0.2, d.horizon - 7);
    g.lineTo(W * 0.45, d.horizon);
    g.lineTo(W * 0.7, d.horizon - 9);
    g.lineTo(W, d.horizon - 2);
    g.lineTo(W, d.horizon);
    g.closePath();
    g.fill();
  },

  drawFront(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    if (!d.view) return;
    // 一人称の道路: 行ごとに「見えたもの」を描く
    const y0 = d.horizon;
    const rowH = (H - y0) / d.rows;
    for (let r2 = 0; r2 < d.rows; r2++) {
      const v = d.view[r2];
      const y = y0 + r2 * rowH;
      const t = r2 / d.rows;
      // 道路の遠近 (台形)
      const roadHalf = W * (0.06 + t * 0.5);
      let col;
      if (v.kind === 'sky') col = `rgba(175,215,245,${0.95 - t * 0.1})`;               // 逃げ水 (空の色!)
      else if (v.kind === 'carM') col = 'rgba(220,80,70,0.9)';                          // 車のさかさ像
      else if (v.kind === 'car') col = 'rgba(190,60,50,0.95)';
      else {
        const shade = 92 - t * 26 + (d.roadTemp > 35 ? Math.sin(ctx.t * 6 + r2) * 3 : 0);
        col = `rgb(${shade},${shade},${shade + 6})`;
      }
      g.fillStyle = col;
      g.fillRect(W / 2 - roadHalf, y, roadHalf * 2, rowH + 0.3);
      // 路肩の草
      g.fillStyle = '#8fbf62';
      g.fillRect(0, y, W / 2 - roadHalf, rowH + 0.3);
      g.fillRect(W / 2 + roadHalf, y, W / 2 - roadHalf + 1, rowH + 0.3);
    }
    // センターライン
    g.fillStyle = 'rgba(255,255,255,0.85)';
    for (let k = 0; k < 7; k++) {
      const t = 0.06 + k * 0.14;
      const y = y0 + t * (H - y0);
      const w2 = 0.4 + t * 2.2;
      g.fillRect(W / 2 - w2 / 2, y, w2, rowH * 2.2 * (0.3 + t));
    }
    // 遠景の車 (地平線上)
    if (d.carOn && d.carX < 250) {
      const t = 1 - d.carX / 250;
      const cw = 2 + t * 10, chh = 1 + t * 4;
      g.fillStyle = '#c83a32';
      rr(g, W / 2 - cw / 2, y0 - chh, cw, chh, chh * 0.3);
      g.fill();
    }
    // 温度計
    g.fillStyle = 'rgba(255,255,255,0.92)';
    rr(g, 4, 16, 40, 12, 3);
    g.fill();
    g.fillStyle = '#556';
    g.font = 'bold 2.7px sans-serif';
    g.fillText(`路面 ${d.roadTemp}℃`, 7, 20.6);
    g.fillStyle = (d.mirageRows ?? 0) >= 6 ? '#2a9a4a' : '#889';
    g.font = '2.4px sans-serif';
    g.fillText((d.mirageRows ?? 0) >= 6 ? '💧 逃げ水 発生中!' : '50℃くらいで見えるかも', 7, 25);
  },
};
