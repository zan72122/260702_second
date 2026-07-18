// シーン: 霧夜のヘッドライト (光の筋が見えるのは 散乱のおかげ)
// 輝度 ∝ 散乱係数β × 透過率 exp(-βL) を実計算 (チンダル現象)
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad } from '../engine/art.js';

export default {
  id: 'foglight',
  name: '霧夜のヘッドライト',
  emoji: '🌫️',
  desc: '光の筋は 霧の日だけ見える',
  goal: '🎯 霧のこさを調整して「光の筋くっきり&道も見える」夜にしよう!',
  clearMsg: 'ちょうどいい散乱=ミー散乱のバランス!',
  spectrumN: 8,

  init(ctx) {
    const d = ctx.data;
    d.fog = 0.02;
    d.okT = 0;
    d.motes = [];
    ctx.setTools([
      { id: 'up', icon: '🌫️', label: '霧をこくする' },
      { id: 'dn', icon: '🌬️', label: '霧をうすめる' },
    ]);
    ctx.setHint('霧ゼロ→筋は見えない / こすぎ→まっ白。ベストをさがせ!');
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.floorY = Math.min(H - 18, H * 0.88);
    d.carX = W * 0.14;
    d.carY = d.floorY - 7;
  },

  update(ctx, dt) {
    const d = ctx.data;
    // 物理: ビーム輝度 ∝ β·exp(-β·s)、遠景の視認性 ∝ exp(-β·L)
    const beta = d.fog * 0.05; // 単位長あたりの散乱
    d.beamVis = clamp(beta * Math.exp(-beta * 40) * 70, 0, 1); // 中距離での筋の見え
    d.sceneVis = Math.exp(-beta * 60);                          // 遠くの木の見え
    const good = d.beamVis > 0.5 && d.sceneVis > 0.3;
    if (good) {
      d.okT += dt;
      ctx.progress(Math.min(1, d.okT / 2));
      if (!d.saidOk) { d.saidOk = true; ctx.toast('✨ ベスト!散乱で光路が見えて 減衰もほどほど'); }
    } else {
      d.okT = Math.max(0, d.okT - dt * 0.6);
      d.saidOk = false;
      if (!ctx._cleared) ctx.progress(clamp(d.beamVis * 0.7 + clamp(d.sceneVis, 0, 0.3), 0, 0.95));
    }
    // 霧つぶ
    if (d.fog > 0.1 && d.motes.length < d.fog * 60) {
      d.motes.push({ x: rand(0, ctx.W), y: rand(20, d.floorY), v: rand(1.5, 4) });
    }
    for (let i = d.motes.length - 1; i >= 0; i--) {
      const m = d.motes[i];
      m.x += m.v * dt * 3;
      if (m.x > ctx.W + 2) m.x = -2;
      if (d.motes.length > d.fog * 60 + 4) { d.motes.splice(i, 1); }
    }
  },

  onTool(ctx, id) {
    const d = ctx.data;
    if (id === 'up') d.fog = clamp(d.fog + 0.13, 0, 1);
    if (id === 'dn') d.fog = clamp(d.fog - 0.13, 0, 1);
    ctx.backDirty();
    ctx.toast(`🌫️ 霧のこさ ${(d.fog * 100) | 0}%`);
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    g.fillStyle = vgrad(g, 0, H, [[0, '#0c1018'], [1, '#181c26']]);
    g.fillRect(0, 0, W, H);
    // 遠くの並木と家 (霧で見えなくなる → sceneVis)
    const vis = Math.exp(-(d.fog * 0.05) * 60);
    g.globalAlpha = clamp(vis, 0.03, 1);
    for (let k = 0; k < 5; k++) {
      const tx = W * (0.5 + k * 0.12);
      g.fillStyle = '#242c3a';
      g.fillRect(tx - 0.8, d.floorY - 22, 1.6, 22);
      g.beginPath();
      g.arc(tx, d.floorY - 24, 5 + (k % 2) * 1.5, 0, TAU);
      g.fill();
    }
    g.fillStyle = '#20283a';
    rr(g, W * 0.82, d.floorY - 18, 16, 18, 1);
    g.fill();
    g.fillStyle = 'rgba(255,220,140,0.9)';
    rr(g, W * 0.86, d.floorY - 13, 3, 3.6, 0.6);
    g.fill();
    g.globalAlpha = 1;
    // 道
    g.fillStyle = '#20222c';
    g.fillRect(0, d.floorY, W, H - d.floorY);
    g.fillStyle = 'rgba(220,220,230,0.5)';
    for (let x = 0; x < W; x += 14) g.fillRect(x, d.floorY + 5, 7, 1);
    // 車
    g.fillStyle = '#38445c';
    rr(g, d.carX - 12, d.carY - 6, 22, 8, 2.5);
    g.fill();
    rr(g, d.carX - 7, d.carY - 11, 12, 6, 2);
    g.fill();
    g.fillStyle = '#1a2030';
    g.beginPath(); g.arc(d.carX - 7, d.carY + 2.5, 2.8, 0, TAU); g.fill();
    g.beginPath(); g.arc(d.carX + 6, d.carY + 2.5, 2.8, 0, TAU); g.fill();
  },

  drawFront(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    const beta = d.fog * 0.05;
    // ヘッドライトの光すじ: 距離ごとに β·exp(-βs) で輝度を積む
    g.save();
    g.globalCompositeOperation = 'lighter';
    const hx = d.carX + 10, hy = d.carY - 2;
    for (const spread of [-0.06, 0, 0.06]) {
      const steps = 26;
      for (let s2 = 0; s2 < steps; s2++) {
        const t0 = s2 / steps, t1 = (s2 + 1) / steps;
        const L = 78;
        const bright = beta * Math.exp(-beta * t0 * L) * 34;
        if (bright < 0.012) continue;
        const y0 = hy + spread * t0 * L * 3, y1 = hy + spread * t1 * L * 3;
        const w0 = 1 + t0 * 9, w1 = 1 + t1 * 9;
        g.fillStyle = `rgba(255,240,190,${clamp(bright, 0, 0.5)})`;
        g.beginPath();
        g.moveTo(hx + t0 * L, y0 - w0);
        g.lineTo(hx + t1 * L, y1 - w1);
        g.lineTo(hx + t1 * L, y1 + w1);
        g.lineTo(hx + t0 * L, y0 + w0);
        g.closePath();
        g.fill();
      }
    }
    // 直接光 (ランプ自体)
    const lampG = g.createRadialGradient(hx, hy, 0, hx, hy, 6);
    lampG.addColorStop(0, 'rgba(255,250,220,0.95)');
    lampG.addColorStop(1, 'rgba(255,240,180,0)');
    g.fillStyle = lampG;
    g.beginPath(); g.arc(hx, hy, 6, 0, TAU); g.fill();
    g.restore();
    // 霧のオーバーレイ (全体を白く)
    g.fillStyle = `rgba(200,208,220,${clamp(d.fog * 0.34, 0, 0.5)})`;
    g.fillRect(0, 0, W, H);
    // 霧つぶ
    g.fillStyle = 'rgba(230,235,245,0.35)';
    for (const m of d.motes) {
      g.beginPath();
      g.arc(m.x, m.y, 0.5, 0, TAU);
      g.fill();
    }
    // メーター
    g.fillStyle = 'rgba(255,255,255,0.92)';
    rr(g, W - 44, 16, 42, 16, 3);
    g.fill();
    g.fillStyle = '#556';
    g.font = 'bold 2.6px sans-serif';
    g.fillText(`光のすじ ${((d.beamVis ?? 0) * 100) | 0}%`, W - 41, 20.5);
    g.fillStyle = '#ddd';
    rr(g, W - 41, 21.6, 36, 2.2, 1.1);
    g.fill();
    g.fillStyle = (d.beamVis ?? 0) > 0.5 ? '#5ad06a' : '#f0b840';
    rr(g, W - 41, 21.6, Math.max(0.01, 36 * (d.beamVis ?? 0)), 2.2, 1.1);
    g.fill();
    g.fillStyle = '#556';
    g.fillText(`見とおし ${((d.sceneVis ?? 1) * 100) | 0}%`, W - 41, 27.4);
    g.fillStyle = '#ddd';
    rr(g, W - 41, 28.5, 36, 2.2, 1.1);
    g.fill();
    g.fillStyle = (d.sceneVis ?? 1) > 0.3 ? '#5ad06a' : '#e86a5a';
    rr(g, W - 41, 28.5, Math.max(0.01, 36 * (d.sceneVis ?? 1)), 2.2, 1.1);
    g.fill();
  },
};
