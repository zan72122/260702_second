// シーン: 偏光サングラス (水面のギラギラは かたよった光)
// フレネルの s/p 反射率を実計算 — ブリュースター角で p 成分がゼロになる
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad, sun as drawSun, cloud } from '../engine/art.js';

const N_WATER = 1.333;
const BREWSTER = Math.atan(N_WATER); // 53.1° (法線から)

function fresnelSP(thetaI) {
  const n = N_WATER;
  const cosI = Math.cos(thetaI);
  const sinT = Math.sin(thetaI) / n;
  if (sinT >= 1) return [1, 1];
  const cosT = Math.sqrt(1 - sinT * sinT);
  const rs = (cosI - n * cosT) / (cosI + n * cosT);
  const rp = (n * cosI - cosT) / (n * cosI + cosT);
  return [rs * rs, rp * rp];
}

export default {
  id: 'polarizer',
  name: '偏光サングラス',
  emoji: '🕶️',
  desc: '水面のギラギラを消す魔法',
  goal: '🎯 偏光板を回して ギラギラを消し 水の中の魚を3びき見つけよう!',
  clearMsg: '反射光は かたよった光 (s偏光) だった!',
  spectrumN: 8,

  init(ctx) {
    const d = ctx.data;
    d.polA = 0;       // 偏光板の透過軸 (0=s方向=水平)
    d.sunEl = 37;     // 太陽高度 → 入射角 = 90-高度
    d.found = [false, false, false];
    ctx.setTools([{ id: 'angle', icon: '📐', label: 'ブリュースター角' }]);
    ctx.setHint('右下のレンズの↻をドラッグして回転。太陽 (左上) も上下できる');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.waterY = H * 0.52;
    d.lensX = W * 0.5;
    d.lensY = Math.min(H - 46, H * 0.76);
    d.lensR = Math.min(W * 0.3, 30);
    d.fish = [
      { x: W * 0.3, y: d.waterY + 18, s: 1 },
      { x: W * 0.62, y: d.waterY + 30, s: -1 },
      { x: W * 0.45, y: d.waterY + 44, s: 1 },
    ];
  },

  update(ctx, dt) {
    const d = ctx.data, p = ctx.primary;
    if (p) {
      if (Math.hypot(p.x - d.lensX, p.y - d.lensY) < d.lensR + 8) {
        // レンズ上のドラッグ = 偏光軸の回転
        d.polA = Math.atan2(p.y - d.lensY, p.x - d.lensX);
      } else if (p.x < ctx.W * 0.4 && p.y < d.waterY) {
        d.sunEl = clamp(90 - (p.y / d.waterY) * 110, 15, 75);
        ctx.backDirty();
      }
    }
    // 入射角 (法線から) と s/p 反射率
    const thetaI = (90 - d.sunEl) * Math.PI / 180;
    const [Rs, Rp] = fresnelSP(thetaI);
    // 偏光板透過: 軸が水平 (=s方向) から phi 回転
    const phi = d.polA;
    const T = Rs * Math.cos(phi) * Math.cos(phi) + Rp * Math.sin(phi) * Math.sin(phi);
    d.glare = clamp(T / 0.12, 0, 1); // 表示正規化
    d.Rs = Rs; d.Rp = Rp;
    d.brewOff = Math.abs((90 - d.sunEl) - BREWSTER * 180 / Math.PI);
    // 魚さがし: ギラギラが小さいときレンズ内の魚が見える → タップで発見
    d.canSee = d.glare < 0.22;
    let n2 = 0;
    d.found.forEach((f) => { if (f) n2++; });
    if (!ctx._cleared) {
      ctx.progress(n2 >= 3 ? 1 : clamp(n2 / 3 + (d.canSee ? 0.1 : 0), 0, 0.97));
    }
  },

  onDown(ctx, p) {
    const d = ctx.data;
    if (!d.canSee) return;
    // レンズごしに見えている魚をタップ
    d.fish.forEach((f, i) => {
      if (d.found[i]) return;
      if (Math.hypot(p.x - f.x, p.y - f.y) < 8 &&
          Math.hypot(f.x - d.lensX, f.y - d.lensY) < d.lensR + 26) {
        d.found[i] = true;
        ctx.sfx.chime();
        ctx.vibrate(15);
        ctx.toast(`🐟 ${d.found.filter(Boolean).length}びきめ 発見!`);
      }
    });
  },

  onTool(ctx, id) {
    if (id !== 'angle') return;
    const d = ctx.data;
    d.showB = !d.showB;
    ctx.toast(d.showB ? `📐 ブリュースター角 ${(BREWSTER * 180 / Math.PI).toFixed(0)}° (水面から${(90 - BREWSTER * 180 / Math.PI).toFixed(0)}°) で反射光は完全にs偏光` : 'OFF');
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    g.fillStyle = vgrad(g, 0, d.waterY, [[0, '#8ec8ec'], [1, '#cfe8f6']]);
    g.fillRect(0, 0, W, d.waterY);
    const sy = (1 - d.sunEl / 90) * d.waterY * 0.85;
    drawSun(g, W * 0.14, sy, 4.5);
    cloud(g, W * 0.6, 14, 0.8, 0.8);
    // 湖
    g.fillStyle = vgrad(g, d.waterY, H, [[0, '#4a90b8'], [1, '#2c5a78']]);
    g.fillRect(0, d.waterY, W, H - d.waterY);
    // 岸
    g.fillStyle = '#7aa85a';
    g.beginPath();
    g.moveTo(0, d.waterY);
    g.quadraticCurveTo(W * 0.1, d.waterY - 4, W * 0.2, d.waterY);
    g.lineTo(0, d.waterY);
    g.fill();
  },

  drawFront(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    // 水中の魚 (レンズの外はギラギラで見えない)
    // ギラギラ (水面の反射): glare に比例して水面〜水中を白く覆う
    const glareA = d.glare * 0.85;
    // レンズの中は偏光板を通した光
    for (let pass = 0; pass < 2; pass++) {
      g.save();
      if (pass === 1) {
        // レンズ内
        g.beginPath();
        g.arc(d.lensX, d.lensY, d.lensR, 0, TAU);
        g.clip();
      } else {
        // レンズ外 (くり抜き)
        g.beginPath();
        g.rect(0, d.waterY, W, H - d.waterY);
        g.arc(d.lensX, d.lensY, d.lensR, 0, TAU, true);
        g.clip();
      }
      const a = pass === 1 ? glareA : 0.8; // レンズ外は生のギラギラ
      // 魚 (見えるのはギラギラが弱いとき)
      d.fish.forEach((f, i) => {
        const vis = pass === 1 ? 1 - glareA : 0.18;
        g.globalAlpha = d.found[i] ? 1 : clamp(vis, 0, 1) * 0.9;
        this._fish(g, f.x, f.y + Math.sin(ctx.t * 1.5 + i * 2) * 1.5, f.s, d.found[i]);
        g.globalAlpha = 1;
      });
      // ギラギラ光
      g.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 30; k++) {
        const gx = (k * 41 % 100) / 100 * W;
        const gy = d.waterY + ((k * 67 % 100) / 100) * (H - d.waterY) * 0.7;
        const tw = 0.6 + 0.4 * Math.sin(ctx.t * 3 + k * 1.7);
        g.fillStyle = `rgba(255,250,235,${a * tw * 0.7})`;
        g.beginPath();
        g.ellipse(gx, gy, 3.2 + (k % 3), 0.7, 0, 0, TAU);
        g.fill();
      }
      g.restore();
    }
    // 偏光レンズのふち
    g.strokeStyle = '#33383f';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(d.lensX, d.lensY, d.lensR, 0, TAU);
    g.stroke();
    // 透過軸の表示
    g.strokeStyle = 'rgba(255,255,255,0.75)';
    g.lineWidth = 0.7;
    g.setLineDash([2, 1.6]);
    g.beginPath();
    g.moveTo(d.lensX - Math.cos(d.polA) * d.lensR, d.lensY - Math.sin(d.polA) * d.lensR);
    g.lineTo(d.lensX + Math.cos(d.polA) * d.lensR, d.lensY + Math.sin(d.polA) * d.lensR);
    g.stroke();
    g.setLineDash([]);
    // 回転ノブ
    const kx = d.lensX + Math.cos(d.polA) * (d.lensR + 4.5);
    const ky = d.lensY + Math.sin(d.polA) * (d.lensR + 4.5);
    g.fillStyle = '#ffd25a';
    g.beginPath(); g.arc(kx, ky, 3.2, 0, TAU); g.fill();
    g.fillStyle = '#556';
    g.font = '3.4px sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('↻', kx, ky + 0.2);
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    // メーター
    g.fillStyle = 'rgba(255,255,255,0.92)';
    rr(g, W - 44, 16, 42, 15, 3);
    g.fill();
    g.fillStyle = '#556';
    g.font = 'bold 2.6px sans-serif';
    g.fillText(`ギラギラ ${((d.glare ?? 0) * 100) | 0}%`, W - 41, 20.5);
    g.fillStyle = '#ddd';
    rr(g, W - 41, 22, 36, 2.6, 1.3);
    g.fill();
    g.fillStyle = d.glare < 0.22 ? '#5ad06a' : '#f0b840';
    rr(g, W - 41, 22, Math.max(0.01, 36 * (d.glare ?? 0)), 2.6, 1.3);
    g.fill();
    g.fillStyle = '#889';
    g.font = '2.3px sans-serif';
    g.fillText(`🐟 ${d.found.filter(Boolean).length}/3  ${d.brewOff < 4 ? '✨ブリュースター角!' : ''}`, W - 41, 28.6);
  },

  _fish(g, x, y, s, found) {
    g.save();
    g.translate(x, y);
    g.scale(s, 1);
    g.fillStyle = found ? '#f0a03a' : '#d88a4a';
    g.beginPath();
    g.ellipse(0, 0, 4, 2.2, 0, 0, TAU);
    g.fill();
    g.beginPath();
    g.moveTo(-3.4, 0); g.lineTo(-5.8, -1.8); g.lineTo(-5.8, 1.8);
    g.closePath();
    g.fill();
    g.fillStyle = '#333';
    g.beginPath(); g.arc(2, -0.4, 0.5, 0, TAU); g.fill();
    g.restore();
  },
};
