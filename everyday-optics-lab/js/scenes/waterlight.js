// シーン: 水流ライト (曲がる水の中を 光が全反射でついていく)
// ペットボトルのおうち実験: 光ファイバーとおなじ原理
import { TAU, rand, clamp } from '../engine/utils.js';
import { rr, vgrad, softShadow } from '../engine/art.js';
import { refIndex, criticalAngle } from '../engine/spectrum.js';
import { waveCss } from '../engine/render2d.js';

export default {
  id: 'waterlight',
  name: '水流ライト',
  emoji: '💧',
  desc: '水の中を 光がついてくる!',
  goal: '🎯 水のいきおいを調整して 光を もらさず バケツまで とどけよう!',
  clearMsg: '全反射!光ファイバーと同じしくみ!',
  spectrumN: 8,

  init(ctx) {
    const d = ctx.data;
    d.pressure = 0.3;   // 水圧 (低いと急カーブ→光がもれる)
    d.okT = 0;
    d.critDeg = criticalAngle(refIndex('water', 550)) * 180 / Math.PI;
    ctx.setTools([
      { id: 'up', icon: '⬆️', label: '水圧を上げる' },
      { id: 'dn', icon: '⬇️', label: '水圧を下げる' },
    ]);
    ctx.setHint(`水と空気のさかい目に ${d.critDeg.toFixed(0)}° より浅く当たると 全反射してもれない!`);
  },

  layout(ctx) {
    const { W, H } = ctx, d = ctx.data;
    d.holeX = W * 0.18;
    d.holeY = Math.min(H * 0.42, H - 110);
    d.floorY = Math.min(H - 16, H * 0.9);
    d.bucketX = W * 0.58;
    d.bucketW = Math.min(W * 0.24, 26);
  },

  // 水流の中心線 (放物線)。返り値: [x,y] 列と、その点の流れ方向
  _stream(ctx) {
    const d = ctx.data;
    const v0 = 22 + d.pressure * 42;      // 初速
    const gGrav = 300;
    const pts = [];
    let x = d.holeX, y = d.holeY, vx = v0, vy = 0;
    const dt2 = 0.028;
    for (let k = 0; k < 200; k++) {
      pts.push([x, y, vx, vy]);
      vy += gGrav * dt2;
      x += vx * dt2; y += vy * dt2;
      if (y > d.floorY + 3) break;
    }
    return pts;
  },

  update(ctx, dt) {
    const d = ctx.data;
    d.stream = this._stream(ctx);
    d.streamR = 1.7;
    // 光の追跡: 水流の中でジグザグ全反射
    // レイは水流のローカル座標 (中心からのオフセット q, 角度差 φ) で伝播し、
    // 境界入射角が臨界角より深いと そこで漏れる
    const nW = refIndex('water', 550);
    const critical = criticalAngle(nW); // 境界法線からの角度がこれ以上なら全反射
    d.leaks = [];
    d.rays = [];
    let delivered = 0;
    const NR = 5;
    for (let ri = 0; ri < NR; ri++) {
      let q = (ri / (NR - 1) - 0.5) * d.streamR * 1.4; // 中心からのオフセット
      let phi = (ri - 2) * 0.1;                         // 流れ方向との角度差
      const path = [];
      let alive = true;
      for (let k = 0; k < d.stream.length - 1; k++) {
        const [x, y, vx, vy] = d.stream[k];
        const sp = Math.hypot(vx, vy);
        const tx = vx / sp, ty = vy / sp;
        path.push([x + -ty * q, y + tx * q]);
        if (!alive) continue;
        // 流れの曲がり (dθ/ds) ぶん、レイの相対角がずれる
        const [, , vx2, vy2] = d.stream[k + 1];
        const a1 = Math.atan2(vy, vx), a2 = Math.atan2(vy2, vx2);
        phi -= (a2 - a1);
        // レイの横ずれ
        const ds = Math.hypot(d.stream[k + 1][0] - x, d.stream[k + 1][1] - y);
        q += Math.tan(phi) * ds;
        // 境界到達
        if (Math.abs(q) > d.streamR) {
          // 入射角 (境界法線=横方向 から測る): 90°-|φ|
          const inc = Math.PI / 2 - Math.abs(phi);
          if (inc >= critical) {
            // 全反射: 折り返し
            q = Math.sign(q) * (d.streamR - (Math.abs(q) - d.streamR));
            phi = -phi;
            if (Math.random() < 0.3) ctx.fx.addSpark?.(x - ty * q, y + tx * q);
          } else {
            // もれた!
            d.leaks.push([x + -ty * q, y + tx * q, phi + Math.atan2(ty, tx)]);
            alive = false;
          }
        }
      }
      if (alive) delivered++;
      d.rays.push({ path, alive });
    }
    d.delivered = delivered;
    // バケツに水流が届いているか
    const last = d.stream[d.stream.length - 1];
    const inBucket = Math.abs(last[0] - d.bucketX) < d.bucketW / 2 + 3;
    d.inBucket = inBucket;
    const frac = delivered / NR;
    if (inBucket && frac >= 0.8) {
      d.okT += dt;
      ctx.progress(Math.min(1, d.okT / 1.5));
      if (!d.saidOk) { d.saidOk = true; ctx.toast('✨ 光がぜんぶ バケツに!'); }
    } else {
      d.okT = 0; d.saidOk = false;
      if (!ctx._cleared) {
        ctx.progress(clamp(frac * 0.6 + (inBucket ? 0.3 : 0), 0, 0.95));
      }
    }
    ctx.sfx.setPour(0.3 + d.pressure * 0.2, 0.5);
  },

  onTool(ctx, id) {
    const d = ctx.data;
    if (id === 'up') d.pressure = clamp(d.pressure + 0.15, 0.15, 1);
    if (id === 'dn') d.pressure = clamp(d.pressure - 0.15, 0.15, 1);
    ctx.toast(`💧 水圧 ${(d.pressure * 100) | 0}% — カーブのきつさが変わる`);
  },

  drawBack(ctx, g) {
    const { W, H } = ctx, d = ctx.data;
    g.fillStyle = vgrad(g, 0, H, [[0, '#101624'], [1, '#1a2234']]);
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#242e42';
    g.fillRect(0, d.floorY + 2, W, H - d.floorY);
    // ペットボトル
    softShadow(g, d.holeX - 6, d.floorY + 2, 10, 2.5, 0.3);
    g.fillStyle = 'rgba(160,200,240,0.25)';
    rr(g, d.holeX - 13, d.holeY - 30, 13, 34, 3);
    g.fill();
    g.strokeStyle = 'rgba(180,215,245,0.6)';
    g.lineWidth = 0.8;
    rr(g, d.holeX - 13, d.holeY - 30, 13, 34, 3);
    g.stroke();
    g.fillStyle = '#5a9ad8';
    rr(g, d.holeX - 10, d.holeY - 35, 7, 5, 1.5);
    g.fill();
    // 水 (中身)
    g.fillStyle = 'rgba(120,180,230,0.4)';
    rr(g, d.holeX - 12, d.holeY - 22, 11, 25, 2);
    g.fill();
    // バケツ
    softShadow(g, d.bucketX, d.floorY + 3, d.bucketW * 0.8, 2.5, 0.3);
    g.fillStyle = '#3a4a68';
    g.beginPath();
    g.moveTo(d.bucketX - d.bucketW / 2 - 2, d.floorY - 16);
    g.lineTo(d.bucketX - d.bucketW / 2 + 2, d.floorY + 2);
    g.lineTo(d.bucketX + d.bucketW / 2 - 2, d.floorY + 2);
    g.lineTo(d.bucketX + d.bucketW / 2 + 2, d.floorY - 16);
    g.closePath();
    g.fill();
  },

  drawFront(ctx, g) {
    const d = ctx.data;
    if (!d.stream) return;
    // 水流
    g.strokeStyle = 'rgba(150,200,240,0.5)';
    g.lineWidth = d.streamR * 2;
    g.lineCap = 'round';
    g.beginPath();
    d.stream.forEach(([x, y], i) => (i === 0 ? g.moveTo(x, y) : g.lineTo(x, y)));
    g.stroke();
    // 光 (ジグザグ)
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (const ray of d.rays) {
      g.strokeStyle = waveCss(545, 0.5);
      g.lineWidth = 0.5;
      g.beginPath();
      ray.path.forEach(([x, y], i) => (i === 0 ? g.moveTo(x, y) : g.lineTo(x, y)));
      g.stroke();
    }
    // もれた光
    for (const [lx, ly, la] of d.leaks) {
      g.strokeStyle = waveCss(545, 0.35);
      g.lineWidth = 0.8;
      g.beginPath();
      g.moveTo(lx, ly);
      g.lineTo(lx + Math.cos(la) * 14, ly + Math.sin(la) * 14);
      g.stroke();
    }
    // バケツの光たまり
    if (d.inBucket && d.delivered > 0) {
      const a = d.delivered / 5;
      const grad = g.createRadialGradient(d.bucketX, d.floorY - 4, 0, d.bucketX, d.floorY - 4, d.bucketW * 0.6);
      grad.addColorStop(0, `rgba(160,255,180,${0.5 * a})`);
      grad.addColorStop(1, 'rgba(160,255,180,0)');
      g.fillStyle = grad;
      g.beginPath();
      g.arc(d.bucketX, d.floorY - 4, d.bucketW * 0.6, 0, TAU);
      g.fill();
    }
    g.restore();
    // ライト (穴のうしろから)
    g.fillStyle = '#4a5266';
    rr(g, d.holeX - 24, d.holeY - 3, 10, 6, 1.5);
    g.fill();
    g.fillStyle = '#b8f0c0';
    rr(g, d.holeX - 14.5, d.holeY - 2, 2.5, 4, 0.8);
    g.fill();
    // メーター
    g.fillStyle = 'rgba(255,255,255,0.92)';
    rr(g, ctx.W - 40, 16, 38, 12, 3);
    g.fill();
    g.fillStyle = '#556';
    g.font = 'bold 2.7px sans-serif';
    g.fillText(`とどいた光 ${d.delivered ?? 0}/5`, ctx.W - 37, 21);
    g.fillStyle = '#889';
    g.font = '2.3px sans-serif';
    g.fillText(`臨界角 ${d.critDeg.toFixed(0)}°`, ctx.W - 37, 25.3);
  },
};
