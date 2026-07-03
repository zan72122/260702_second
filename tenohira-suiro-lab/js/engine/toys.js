// おもちゃ粒子 (葉っぱ・星)
// 流体ソルバーには入れない軽量な弾道粒子。
// 手のカプセルの上に「乗る」「すべり落ちる」ことができるのがポイントで、
// 平らな手のひらには積もり、傾けるとすべり落ちる — 水と同じ因果を軽い計算で再現する。

import { clamp, rand, TAU } from './utils.js';

// 絵文字を一度だけオフスクリーンに描いてスプライト化 (fillText 連打は重い)
const spriteCache = new Map();
export function emojiSprite(emoji, px = 64) {
  const key = emoji + px;
  if (spriteCache.has(key)) return spriteCache.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = px;
  const g = c.getContext('2d');
  g.font = `${px * 0.8}px sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(emoji, px / 2, px / 2 + px * 0.04);
  spriteCache.set(key, c);
  return c;
}

export const TOY = { LEAF: 0, STAR: 1 };

export class Toys {
  constructor(max = 120) {
    this.max = max;
    this.items = [];
    this.onLand = null;   // (item, speed) — カプセルに着地した瞬間
    this.onSplash = null; // (item) — 水面に落ちた瞬間
  }

  clear() { this.items.length = 0; }

  spawn(type, x, y, vx = 0, vy = 0) {
    if (this.items.length >= this.max) this.items.shift();
    this.items.push({
      type, x, y, vx, vy,
      rot: rand(TAU), vr: rand(-3, 3),
      t: 0, phase: rand(TAU),
      resting: 0,      // カプセル上で静止している時間
      inWater: false,
      size: type === TOY.LEAF ? rand(2.6, 3.6) : rand(2.2, 3.0),
    });
  }

  // capsules: {ax,ay,bx,by,r,vx,vy} の配列 (手 + ガジェット)
  update(dt, sim, capsules, W, H, gravity = 430) {
    const items = this.items;
    for (let idx = items.length - 1; idx >= 0; idx--) {
      const p = items[idx];
      p.t += dt; p.phase += dt * 5;

      const isLeaf = p.type === TOY.LEAF;
      // 重力 (葉っぱはゆっくり、ひらひら)
      const g = isLeaf ? gravity * 0.12 : gravity * 0.75;
      p.vy += g * dt;
      if (isLeaf) {
        p.vx += Math.sin(p.phase) * 18 * dt;           // ひらひら横揺れ
        const vmax = 26;                               // 終端速度
        if (p.vy > vmax) p.vy = vmax;
        p.rot = Math.sin(p.phase * 0.7) * 0.6;
      } else {
        p.rot += p.vr * dt;
      }

      // 水に浮く: 密度が高い場所では浮力 + 流れに追従
      const dens = sim.densityAt(p.x, p.y + p.size * 0.3);
      if (dens > 0.6) {
        if (!p.inWater) {
          p.inWater = true;
          this.onSplash?.(p);
        }
        p.vy -= gravity * 1.5 * clamp(dens - 0.5, 0, 1) * dt;
        const [fvx, fvy] = sim.velocityAt(p.x, p.y);
        p.vx += (fvx - p.vx) * Math.min(1, 4 * dt);
        p.vy += (fvy - p.vy) * Math.min(1, 2 * dt);
        p.vy *= (1 - 2.5 * dt);
      } else {
        p.inWater = false;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // カプセル衝突: 押し出し + 接線すべり
      let landed = false;
      for (const c of capsules) {
        if (c.off) continue;
        const ex = c.bx - c.ax, ey = c.by - c.ay;
        const el2 = ex * ex + ey * ey || 1e-6;
        let t = ((p.x - c.ax) * ex + (p.y - c.ay) * ey) / el2;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const qx = c.ax + ex * t, qy = c.ay + ey * t;
        let dx = p.x - qx, dy = p.y - qy;
        const R = c.r + p.size * 0.5;
        const d2 = dx * dx + dy * dy;
        if (d2 >= R * R) continue;
        const d = Math.sqrt(d2) || 0.001;
        dx /= d; dy /= d;
        p.x = qx + dx * R;
        p.y = qy + dy * R;
        // 法線方向の速度を消す
        const vn = p.vx * dx + p.vy * dy;
        const speed = Math.abs(vn);
        if (vn < 0) {
          if (isLeaf) {
            p.vx -= vn * dx; p.vy -= vn * dy;      // 葉っぱは反発せずぺたっと
          } else {
            p.vx -= vn * dx * 1.6; p.vy -= vn * dy * 1.6;  // 星は弾む (反発0.6)
          }
          if (speed > 18) this.onLand?.(p, speed);
        }
        // カプセル自体の動きを伝える (手で押せる)
        p.vx += (c.vx || 0) * 0.12;
        p.vy += (c.vy || 0) * 0.12;
        // 接線方向の摩擦: 上向きの面ならすべり止め
        if (dy < -0.5) {
          p.vx *= (1 - 6 * dt);
          p.vy *= (1 - 6 * dt);
          landed = true;
        }
      }
      p.resting = landed && Math.abs(p.vx) + Math.abs(p.vy) < 8 ? p.resting + dt : 0;

      // 画面端
      if (p.x < 1) { p.x = 1; p.vx = Math.abs(p.vx) * 0.4; }
      if (p.x > W - 1) { p.x = W - 1; p.vx = -Math.abs(p.vx) * 0.4; }
      if (p.y > H + 8 || p.t > 45) items.splice(idx, 1);
    }
  }

  draw(g) {
    const leaf = emojiSprite('🍃');
    const star = emojiSprite('⭐');
    for (const p of this.items) {
      const spr = p.type === TOY.LEAF ? leaf : star;
      const s = p.size * 2;
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.rot);
      g.drawImage(spr, -s / 2, -s / 2, s, s);
      g.restore();
    }
  }
}
