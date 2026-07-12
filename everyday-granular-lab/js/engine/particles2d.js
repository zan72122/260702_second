// オーバーレイ用 2D エフェクト粒子 (泡・しぶき・湯気・キラキラ・紙吹雪)
// すべて world 座標系で管理し、overlay キャンバスに描画する。

import { rand, TAU, clamp } from './utils.js';

export class Effects {
  constructor() {
    this.spray = [];    // しぶき(弾道の小滴)
    this.bubbles = [];  // 流体内を上昇する泡
    this.foam = [];     // 表面の泡(白いドット)
    this.steam = [];    // 湯気
    this.sparks = [];   // キラキラ
    this.confetti = [];
    this.rings = [];    // 波紋
    this.texts = [];    // 浮かぶ文字 (+1 など)
    this.gravity = 430;
  }

  clear() {
    for (const k of ['spray', 'bubbles', 'foam', 'steam', 'sparks', 'confetti', 'rings', 'texts']) this[k].length = 0;
  }

  // ---- スポーン ----
  addSpray(x, y, vx, vy, color = 'rgba(170,210,255,0.85)', r = 0.7, life = 0.9) {
    if (this.spray.length > 320) this.spray.shift();
    this.spray.push({ x, y, vx, vy, r, life, t: 0, color });
  }
  splashBurst(x, y, power, color) {
    const n = Math.min(26, 4 + power * 0.14);
    for (let i = 0; i < n; i++) {
      const a = rand(-Math.PI * 0.85, -Math.PI * 0.15);
      const s = power * rand(0.35, 1.0);
      this.addSpray(x + rand(-2, 2), y, Math.cos(a) * s, Math.sin(a) * s, color, rand(0.45, 1.0), rand(0.5, 1.0));
    }
  }
  addBubble(x, y, r = 0.8, vy = -22) {
    if (this.bubbles.length > 240) this.bubbles.shift();
    this.bubbles.push({ x, y, r, vy, t: 0, wob: rand(TAU) });
  }
  addFoam(x, y, r = 1.2, life = 6) {
    if (this.foam.length > 420) this.foam.shift();
    this.foam.push({ x, y, r, life, t: 0, wob: rand(TAU) });
  }
  addSteam(x, y, r = 4, col = '255,255,255', a = 0.16) {
    if (this.steam.length > 60) this.steam.shift();
    this.steam.push({ x, y, r, t: 0, life: rand(1.6, 2.6), drift: rand(-3, 3), col, alpha: a });
  }
  // 砂ぼこり (着地の衝撃で ふわっ)
  addDust(x, y, r = 3, col = '205,180,140') {
    if (this.steam.length > 60) this.steam.shift();
    this.steam.push({ x, y, r, t: 0, life: rand(0.5, 0.9), drift: rand(-6, 6), col, alpha: 0.22 });
  }
  addSpark(x, y, color = '#fff2a8') {
    if (this.sparks.length > 120) this.sparks.shift();
    this.sparks.push({ x, y, t: 0, life: rand(0.5, 1.0), color, r: rand(0.8, 1.9), rot: rand(TAU) });
  }
  addRing(x, y, rMax = 8, life = 0.7) {
    if (this.rings.length > 40) this.rings.shift();
    this.rings.push({ x, y, rMax, life, t: 0 });
  }
  addText(x, y, str, color = '#ffffff') {
    this.texts.push({ x, y, str, color, t: 0, life: 1.2 });
  }
  burstConfetti(x, y, n = 60) {
    const cols = ['#ff6b8a', '#ffd93d', '#6bd5ff', '#8affc1', '#d59bff', '#ffb46b'];
    for (let i = 0; i < n; i++) {
      const a = rand(TAU), s = rand(30, 130);
      this.confetti.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60,
        rot: rand(TAU), vr: rand(-8, 8), t: 0, life: rand(1.6, 2.8),
        color: cols[i % cols.length], w: rand(1.4, 2.6), h: rand(0.8, 1.6),
      });
    }
  }

  // ---- 更新 ----
  update(dt, sim) {
    const g = this.gravity;
    let arr = this.spray;
    for (let i = arr.length - 1; i >= 0; i--) {
      const p = arr[i];
      p.t += dt; p.vy += g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.t > p.life || (sim && p.vy > 0 && sim.densityAt(p.x, p.y) > 0.7)) arr.splice(i, 1);
    }
    arr = this.bubbles;
    for (let i = arr.length - 1; i >= 0; i--) {
      const b = arr[i];
      b.t += dt; b.wob += dt * 7;
      b.x += Math.sin(b.wob) * 3.5 * dt;
      b.y += b.vy * dt;
      const inFluid = sim ? sim.densityAt(b.x, b.y) > 0.35 : true;
      if (!inFluid || b.t > 6) {
        if (inFluid === false && sim) this.addFoam(b.x, b.y, b.r * rand(0.9, 1.6), rand(2, 5));
        arr.splice(i, 1);
      }
    }
    arr = this.foam;
    for (let i = arr.length - 1; i >= 0; i--) {
      const f = arr[i];
      f.t += dt; f.wob += dt * 2;
      if (sim) {
        // 表面に追従: 下が液体でなければ沈む、埋まってたら浮く
        const below = sim.densityAt(f.x, f.y + 1.2);
        const here = sim.densityAt(f.x, f.y - 0.4);
        if (here > 0.5) f.y -= 14 * dt;
        else if (below < 0.3) f.y += 30 * dt;
        const [vx] = sim.velocityAt(f.x, f.y + 1);
        f.x += vx * dt * 0.7;
      }
      if (f.t > f.life || f.y > 9999) arr.splice(i, 1);
    }
    arr = this.steam;
    for (let i = arr.length - 1; i >= 0; i--) {
      const s = arr[i];
      s.t += dt;
      s.y -= 14 * dt; s.x += s.drift * dt; s.r += 3.5 * dt;
      if (s.t > s.life) arr.splice(i, 1);
    }
    arr = this.sparks;
    for (let i = arr.length - 1; i >= 0; i--) { arr[i].t += dt; if (arr[i].t > arr[i].life) arr.splice(i, 1); }
    arr = this.rings;
    for (let i = arr.length - 1; i >= 0; i--) { arr[i].t += dt; if (arr[i].t > arr[i].life) arr.splice(i, 1); }
    arr = this.texts;
    for (let i = arr.length - 1; i >= 0; i--) {
      const t = arr[i]; t.t += dt; t.y -= 9 * dt;
      if (t.t > t.life) arr.splice(i, 1);
    }
    arr = this.confetti;
    for (let i = arr.length - 1; i >= 0; i--) {
      const c = arr[i];
      c.t += dt; c.vy += g * 0.35 * dt; c.vx *= (1 - 1.2 * dt);
      c.x += c.vx * dt; c.y += c.vy * dt; c.rot += c.vr * dt;
      if (c.t > c.life) arr.splice(i, 1);
    }
  }

  // ---- 描画 (g は world 座標に変換済みの ctx) ----
  draw(g) {
    // 泡 (流体の上に描く)
    for (const b of this.bubbles) {
      g.strokeStyle = 'rgba(255,255,255,0.75)';
      g.lineWidth = 0.22;
      g.beginPath(); g.arc(b.x, b.y, b.r, 0, TAU); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.28)';
      g.beginPath(); g.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.32, 0, TAU); g.fill();
    }
    for (const f of this.foam) {
      const a = clamp(1 - f.t / f.life, 0, 1);
      g.fillStyle = `rgba(255,255,255,${0.78 * a})`;
      g.beginPath();
      g.arc(f.x + Math.sin(f.wob) * 0.3, f.y, f.r * (0.8 + 0.2 * a), 0, TAU);
      g.fill();
    }
    for (const p of this.spray) {
      const a = clamp(1 - p.t / p.life, 0, 1);
      g.globalAlpha = a;
      g.fillStyle = p.color;
      g.beginPath(); g.arc(p.x, p.y, p.r, 0, TAU); g.fill();
      g.globalAlpha = 1;
    }
    for (const s of this.steam) {
      const a = Math.sin(Math.min(1, s.t / s.life) * Math.PI) * (s.alpha ?? 0.16);
      g.fillStyle = `rgba(${s.col ?? '255,255,255'},${a})`;
      g.beginPath(); g.arc(s.x, s.y, s.r, 0, TAU); g.fill();
    }
    for (const r of this.rings) {
      const k = r.t / r.life;
      g.strokeStyle = `rgba(255,255,255,${0.5 * (1 - k)})`;
      g.lineWidth = 0.5;
      g.beginPath(); g.ellipse(r.x, r.y, r.rMax * k + 0.5, (r.rMax * k + 0.5) * 0.35, 0, 0, TAU); g.stroke();
    }
    for (const s of this.sparks) {
      const k = s.t / s.life, a = Math.sin(Math.min(1, k) * Math.PI);
      g.save();
      g.translate(s.x, s.y); g.rotate(s.rot + k * 2);
      g.fillStyle = s.color;
      g.globalAlpha = a;
      const r = s.r * (0.6 + 0.4 * a);
      g.beginPath();
      for (let i = 0; i < 4; i++) {
        const an = i * Math.PI / 2;
        g.lineTo(Math.cos(an) * r, Math.sin(an) * r);
        g.lineTo(Math.cos(an + Math.PI / 4) * r * 0.32, Math.sin(an + Math.PI / 4) * r * 0.32);
      }
      g.closePath(); g.fill();
      g.globalAlpha = 1;
      g.restore();
    }
    for (const c of this.confetti) {
      const a = clamp((c.life - c.t) / 0.5, 0, 1);
      g.save();
      g.translate(c.x, c.y); g.rotate(c.rot);
      g.globalAlpha = a;
      g.fillStyle = c.color;
      g.fillRect(-c.w / 2, -c.h / 2, c.w, c.h * (0.4 + 0.6 * Math.abs(Math.sin(c.rot * 2))));
      g.globalAlpha = 1;
      g.restore();
    }
    for (const t of this.texts) {
      const a = clamp(1 - t.t / t.life, 0, 1);
      g.save();
      g.globalAlpha = a;
      g.fillStyle = t.color;
      g.strokeStyle = 'rgba(0,0,0,0.35)';
      g.lineWidth = 0.5;
      g.font = 'bold 5px sans-serif';
      g.textAlign = 'center';
      g.strokeText(t.str, t.x, t.y);
      g.fillText(t.str, t.x, t.y);
      g.restore();
    }
  }
}
