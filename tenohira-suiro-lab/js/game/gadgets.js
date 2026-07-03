// ガジェット — 水の因果が「見てわかる」しかけたち
//   水車: 流れが当たると回る (流れの強さ = 回る速さ)
//   コップ: たまるほど音が上がり、満タンで紙吹雪 → ごくごく → また空に
//   アヒル: 浮く・流される・手で押せる (sim.addSolid の浮力そのまま)
//   魚:   水たまりができると遊びに来る (せき止め・おわんへのごほうび)

import { TAU, clamp, rand } from '../engine/utils.js';
import { emojiSprite } from '../engine/toys.js';

const WHEEL_PADDLES = 6;

export class Gadgets {
  constructor(sim, fx, sfx) {
    this.sim = sim;
    this.fx = fx;
    this.sfx = sfx;
    this.colliders = [];      // 毎フレーム main が sim.colliders に合成する
    this.wheel = { x: 14, y: 60, R: 12, angle: 0, omega: 0, tickAcc: 0 };
    this.cups = [];
    this.ducks = [];          // sim.solids への参照
    this.fish = [];
    this.pools = [];          // {cx,cy,age} クラスター持続時間の追跡
    this._poolTimer = 0;
    this._wheelCaps = [];
    for (let i = 0; i < WHEEL_PADDLES; i++) {
      this._wheelCaps.push({ kind: 'capsule', ax: 0, ay: 0, bx: 0, by: 0, r: 1.3, vx: 0, vy: 0 });
    }
  }

  // 画面サイズに合わせて配置 (縦横どちらでも)
  layout(W, H) {
    const portrait = H >= W;
    const wh = this.wheel;
    wh.R = portrait ? 11 : 12;
    wh.x = wh.R * 0.62;                 // 左端に半分めり込ませて「壁の水車」に
    wh.y = portrait ? H * 0.56 : H * 0.52;

    this.cups.length = 0;
    const cupY = H - 1.5;
    const defs = portrait
      ? [{ x: W * 0.40 }, { x: W * 0.78 }]
      : [{ x: W * 0.42 }, { x: W * 0.72 }];
    for (const d of defs) {
      this.cups.push({
        x: d.x, yBottom: cupY, w: 15, h: 17,
        level: 0, count: 0, lastStep: 0, bounce: 0, capacity: 60,
      });
    }
    this._rebuildStatic();
  }

  _rebuildStatic() {
    this.colliders.length = 0;
    // コップ: 左壁 + 右壁 + 底 (少し外に開いた形)
    for (const c of this.cups) {
      const hw = c.w / 2, r = 1.4;
      const yT = c.yBottom - c.h, yB = c.yBottom;
      this.colliders.push(
        { kind: 'capsule', ax: c.x - hw - r, ay: yT, bx: c.x - hw + 0.8 - r, by: yB, r },
        { kind: 'capsule', ax: c.x + hw + r, ay: yT, bx: c.x + hw - 0.8 + r, by: yB, r },
        { kind: 'capsule', ax: c.x - hw, ay: yB, bx: c.x + hw, by: yB, r },
      );
    }
    // 水車のパドル (毎フレーム update で位置更新)
    for (const cap of this._wheelCaps) this.colliders.push(cap);
  }

  addDuck(x, y) {
    if (this.ducks.length >= 2) {
      const old = this.ducks.shift();
      const i = this.sim.solids.indexOf(old);
      if (i >= 0) this.sim.solids.splice(i, 1);
      this.fx.addRing(old.x, old.y, 6, 0.5);
    }
    const d = this.sim.addSolid({
      x, y, r: 4.2, density: 0.42, drag: 4, upright: 2.2,
      hitWall: () => this.sfx.squeak(),
    });
    this.ducks.push(d);
    this.sfx.squeak();
    return d;
  }

  update(dt, W, H) {
    this._updateWheel(dt);
    this._updateCups(dt);
    this._updateFish(dt, W, H);
  }

  _updateWheel(dt) {
    const wh = this.wheel, sim = this.sim;
    // トルク: パドル先端で流れの速度をサンプリング → 接線成分
    let torque = 0;
    for (let i = 0; i < WHEEL_PADDLES; i++) {
      const a = wh.angle + (i / WHEEL_PADDLES) * TAU;
      const tipX = wh.x + Math.cos(a) * wh.R;
      const tipY = wh.y + Math.sin(a) * wh.R;
      const [fvx, fvy, w] = sim.velocityAt(tipX, tipY);
      if (w > 0.15) {
        // 接線方向 (反時計まわりが正)
        const tx = -Math.sin(a), ty = Math.cos(a);
        torque += (fvx * tx + fvy * ty) * Math.min(1, w);
      }
    }
    wh.omega += torque * dt * 0.13;
    wh.omega *= (1 - 1.6 * dt);            // 摩擦
    wh.omega = clamp(wh.omega, -7, 7);
    wh.angle += wh.omega * dt;
    // カタカタ音 + 高速回転のキラキラ
    wh.tickAcc += Math.abs(wh.omega) * dt;
    if (wh.tickAcc > TAU / WHEEL_PADDLES) {
      wh.tickAcc = 0;
      this.sfx.ratchet();
      if (Math.abs(wh.omega) > 3.2) {
        const a = wh.angle + rand(TAU);
        this.fx.addSpark(wh.x + Math.cos(a) * wh.R, wh.y + Math.sin(a) * wh.R, '#aef2ff');
      }
    }
    // パドルカプセル更新 (回転の速度も粒子に伝わる → 回る水車が水を運ぶ)
    for (let i = 0; i < WHEEL_PADDLES; i++) {
      const a = wh.angle + (i / WHEEL_PADDLES) * TAU;
      const cap = this._wheelCaps[i];
      cap.ax = wh.x + Math.cos(a) * wh.R * 0.25;
      cap.ay = wh.y + Math.sin(a) * wh.R * 0.25;
      cap.bx = wh.x + Math.cos(a) * wh.R;
      cap.by = wh.y + Math.sin(a) * wh.R;
      const midR = wh.R * 0.6;
      cap.vx = -Math.sin(a) * wh.omega * midR;
      cap.vy = Math.cos(a) * wh.omega * midR;
    }
  }

  _updateCups(dt) {
    const sim = this.sim;
    for (const c of this.cups) {
      c.bounce = Math.max(0, c.bounce - dt * 2.5);
      // コップ内の粒子数 (整った計測より「だいたい」で十分)
      let count = 0;
      const x0 = c.x - c.w / 2, x1 = c.x + c.w / 2;
      const y0 = c.yBottom - c.h, y1 = c.yBottom;
      for (let i = 0; i < sim.n; i++) {
        if (sim.phase[i] > 1) continue;
        const x = sim.x[i], y = sim.y[i];
        if (x > x0 && x < x1 && y > y0 && y < y1) count++;
      }
      c.count = count;
      c.level = clamp(count / c.capacity, 0, 1);
      // 水位が1段上がるごとに音程アップ
      const step = (c.level * 6) | 0;
      if (step > c.lastStep) this.sfx.fillTone(c.level);
      c.lastStep = step;
      // 満タン! → おいわい → ごくごく → リセット
      if (c.level >= 1) {
        this.fx.burstConfetti(c.x, y0 - 4, 50);
        this.sfx.chime();
        this.sfx.slurp();
        this.fx.addRing(c.x, y0, 12, 0.8);
        c.bounce = 1;
        c.lastStep = 0;
        for (let i = sim.n - 1; i >= 0; i--) {
          if (sim.phase[i] > 1) continue;
          const x = sim.x[i], y = sim.y[i];
          if (x > x0 - 1 && x < x1 + 1 && y > y0 - 2 && y < y1) sim.kill(i);
        }
      }
    }
  }

  _updateFish(dt, W, H) {
    // 0.4秒ごとに水たまりを調べ、1.5秒つづいたら魚が来る
    this._poolTimer -= dt;
    if (this._poolTimer <= 0) {
      this._poolTimer = 0.4;
      const clusters = this.sim.pooledClusters(8, 70);
      const next = [];
      for (const cl of clusters) {
        const prev = this.pools.find((p) => Math.hypot(p.cx - cl.cx, p.cy - cl.cy) < 14);
        next.push({ cx: cl.cx, cy: cl.cy, r: cl.r, age: (prev ? prev.age : 0) + 0.4 });
      }
      this.pools = next;
      for (const p of this.pools) {
        if (p.age < 1.5 || this.fish.length >= 3) continue;
        if (this.fish.some((f) => Math.hypot(f.x - p.cx, f.y - p.cy) < p.r + 10)) continue;
        this.fish.push({
          x: p.cx + rand(-3, 3), y: p.cy, vx: rand(-8, 8), vy: 0,
          t: 0, wob: rand(TAU), dry: 0, size: rand(4, 5.2),
        });
        this.fx.addRing(p.cx, p.cy, 8, 0.7);
        this.sfx.plink(7, 0.8);
        this.fx.addSpark(p.cx, p.cy - 2, '#ffd9f0');
      }
    }
    // 魚の遊泳: 水の中をゆらゆら、水がなくなったらキラッと消える
    for (let i = this.fish.length - 1; i >= 0; i--) {
      const f = this.fish[i];
      f.t += dt; f.wob += dt * 3;
      const dens = this.sim.densityAt(f.x, f.y);
      const pool = this.pools.find((p) => Math.hypot(p.cx - f.x, p.cy - f.y) < p.r + 8);
      if (dens > 0.4) {
        f.dry = 0;
        // たまりの中心へゆるく引き寄せ + ゆらゆら
        if (pool) {
          f.vx += (pool.cx - f.x) * 0.8 * dt + Math.cos(f.wob) * 26 * dt;
          f.vy += (pool.cy - f.y) * 1.2 * dt;
        }
        f.vx *= (1 - 1.5 * dt);
        f.vy *= (1 - 2.5 * dt);
      } else {
        f.dry += dt;
        f.vy += 200 * dt;   // 水がないと落ちる
      }
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      if (f.dry > 0.7 || f.y > H + 6 || f.t > 60) {
        this.fx.addSpark(f.x, f.y, '#ffd9f0');
        this.fx.addRing(f.x, f.y, 5, 0.5);
        this.fish.splice(i, 1);
      }
    }
  }

  // ---- 描画 ----
  drawBack(g) {
    // コップ本体 (半透明ガラス)
    for (const c of this.cups) {
      const hw = c.w / 2 + 1.2;
      const yT = c.yBottom - c.h, yB = c.yBottom;
      const b = 1 + c.bounce * 0.08 * Math.sin(c.bounce * 14);
      g.save();
      g.translate(c.x, yB);
      g.scale(b, 1 / b);
      g.fillStyle = 'rgba(200,230,255,0.20)';
      g.strokeStyle = 'rgba(255,255,255,0.75)';
      g.lineWidth = 1.1;
      g.beginPath();
      g.moveTo(-hw, -c.h);
      g.lineTo(-hw + 0.8, 0);
      g.lineTo(hw - 0.8, 0);
      g.lineTo(hw, -c.h);
      g.stroke();
      g.fill();
      g.restore();
      // 満タンライン (ここまで入れてね、の点線)
      g.strokeStyle = 'rgba(255,255,255,0.45)';
      g.setLineDash([1.2, 1.2]);
      g.lineWidth = 0.5;
      g.beginPath();
      g.moveTo(c.x - hw + 1.5, yT + 2);
      g.lineTo(c.x + hw - 1.5, yT + 2);
      g.stroke();
      g.setLineDash([]);
    }
    // 水車の台座
    const wh = this.wheel;
    g.fillStyle = 'rgba(90,60,40,0.55)';
    g.beginPath(); g.arc(wh.x, wh.y, wh.R * 0.28, 0, TAU); g.fill();
  }

  drawFront(g) {
    const wh = this.wheel;
    // 水車
    g.save();
    g.translate(wh.x, wh.y);
    g.rotate(wh.angle);
    g.strokeStyle = 'rgba(255,190,120,0.95)';
    g.lineCap = 'round';
    for (let i = 0; i < WHEEL_PADDLES; i++) {
      const a = (i / WHEEL_PADDLES) * TAU;
      g.lineWidth = 2.6;
      g.beginPath();
      g.moveTo(Math.cos(a) * wh.R * 0.25, Math.sin(a) * wh.R * 0.25);
      g.lineTo(Math.cos(a) * wh.R, Math.sin(a) * wh.R);
      g.stroke();
      // パドルの先の板
      g.lineWidth = 1.4;
      const tx = Math.cos(a) * wh.R, ty = Math.sin(a) * wh.R;
      g.beginPath();
      g.moveTo(tx - Math.sin(a) * 2.4, ty + Math.cos(a) * 2.4);
      g.lineTo(tx + Math.sin(a) * 2.4, ty - Math.cos(a) * 2.4);
      g.stroke();
    }
    g.fillStyle = '#ffe9b8';
    g.beginPath(); g.arc(0, 0, wh.R * 0.22, 0, TAU); g.fill();
    g.restore();

    // アヒル
    const duckSpr = emojiSprite('🦆', 96);
    for (const d of this.ducks) {
      const s = d.r * 2.6;
      g.save();
      g.translate(d.x, d.y - d.r * 0.3);
      g.rotate(clamp(d.angle, -0.6, 0.6));
      g.drawImage(duckSpr, -s / 2, -s / 2, s, s);
      g.restore();
    }

    // 魚
    const fishSpr = emojiSprite('🐟', 96);
    for (const f of this.fish) {
      const s = f.size * 2;
      g.save();
      g.translate(f.x, f.y);
      if (f.vx < -2) g.scale(1, 1); else g.scale(-1, 1);   // 進行方向を向く
      g.rotate(Math.sin(f.wob) * 0.15);
      g.globalAlpha = f.dry > 0 ? clamp(1 - f.dry / 0.7, 0, 1) : 1;
      g.drawImage(fishSpr, -s / 2, -s / 2, s, s);
      g.restore();
      g.globalAlpha = 1;
    }

    // コップの水位ハート (満タンに近づくワクワク)
    for (const c of this.cups) {
      if (c.level > 0.12) {
        const yT = c.yBottom - c.h;
        g.font = '3.6px sans-serif';
        g.textAlign = 'center';
        g.globalAlpha = 0.85;
        g.fillText(c.level >= 0.95 ? '🎉' : c.level > 0.6 ? '😆' : '😊', c.x, yT - 2.4);
        g.globalAlpha = 1;
      }
    }
  }
}
