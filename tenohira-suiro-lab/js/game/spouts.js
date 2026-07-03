// じゃぐち — 上からいろいろ降らせる装置
// 雲がゆっくり左右にただよいながら、選んだものを降らせる。
// あわ(🫧)だけは下のあわ発生器から上に向かって出る。

import { TAU } from '../engine/utils.js';
import { TOY, emojiSprite } from '../engine/toys.js';

export const SPOUT_DEFS = [
  { id: 'water', emoji: '💧', label: 'みず' },
  { id: 'rainbow', emoji: '🌈', label: 'にじ' },
  { id: 'leaf', emoji: '🍃', label: 'はっぱ' },
  { id: 'star', emoji: '⭐', label: 'ほし' },
  { id: 'bubble', emoji: '🫧', label: 'あわ' },
];

// HSL → RGB(0..1) 簡易版 (にじいろ用)
function hue2rgb(h) {
  const f = (n) => {
    const k = (n + h / 30) % 12;
    return 0.55 - 0.45 * Math.max(-1, Math.min(1, Math.min(k - 3, 9 - k)));
  };
  return [f(0), f(8), f(4)];
}

export class Spouts {
  constructor() {
    this.current = 'water';
    this.t = 0;
    this.acc = 0;        // 放出アキュムレーター
    this.rate = 1;       // 適応品質での流量倍率 (0.5..1)
    this.x = 50;
    this.bob = 0;
    this.fixedX = null;  // テスト用: 雲の位置を固定する
  }

  setType(id) {
    this.current = id;
    this.acc = 0;
  }

  // pour: (x, y, vx, vy, phase) => index  (リサイクル付き放出, main が提供)
  update(dt, W, H, pour, toys, sim) {
    this.t += dt;
    this.bob = Math.sin(this.t * 1.7) * 1.2;
    // 雲はゆっくり画面を行き来する
    this.x = this.fixedX ?? W * (0.5 + 0.33 * Math.sin(this.t * 0.30));
    const bx = this.fixedX ?? W * (0.5 + 0.33 * Math.sin(this.t * 0.23 + 2));  // あわ発生器
    const type = this.current;

    if (type === 'water' || type === 'rainbow') {
      this.acc += dt * 110 * this.rate;
      while (this.acc >= 1) {
        this.acc -= 1;
        const i = pour(this.x + (Math.random() - 0.5) * 4, 7, (Math.random() - 0.5) * 8, 36, type === 'rainbow' ? 1 : 0);
        if (i >= 0 && type === 'rainbow') {
          const [r, g, b] = hue2rgb((this.t * 60) % 360);
          sim.cr[i] = r; sim.cg[i] = g; sim.cb[i] = b;
        }
      }
    } else if (type === 'leaf') {
      this.acc += dt * 2.2 * this.rate;
      while (this.acc >= 1) {
        this.acc -= 1;
        toys.spawn(TOY.LEAF, this.x + (Math.random() - 0.5) * 10, 8, (Math.random() - 0.5) * 12, 5);
      }
    } else if (type === 'star') {
      this.acc += dt * 3.0 * this.rate;
      while (this.acc >= 1) {
        this.acc -= 1;
        toys.spawn(TOY.STAR, this.x + (Math.random() - 0.5) * 10, 8, (Math.random() - 0.5) * 18, 8);
      }
    } else if (type === 'bubble') {
      this.acc += dt * 45 * this.rate;
      this.bubbleX = bx;
      while (this.acc >= 1) {
        this.acc -= 1;
        pour(bx + (Math.random() - 0.5) * 6, H - 5, (Math.random() - 0.5) * 12, -30, 2);
      }
    }
  }

  draw(g, W, H) {
    const type = this.current;
    if (type === 'bubble') {
      // あわ発生器: 下でぷくぷくしている輪っか
      const x = this.bubbleX ?? W / 2;
      g.save();
      g.translate(x, H - 3.5 + this.bob * 0.4);
      g.fillStyle = 'rgba(190,240,255,0.85)';
      g.fillRect(-7, 0, 14, 3);
      g.strokeStyle = 'rgba(255,255,255,0.9)';
      g.lineWidth = 0.8;
      for (const ox of [-4, 0, 4]) {
        g.beginPath(); g.arc(ox, -2.5 - Math.abs(this.bob), 1.6, 0, TAU); g.stroke();
      }
      g.restore();
      return;
    }
    // 雲のじゃぐち
    const spr = emojiSprite('☁️', 96);
    const s = 17;
    g.drawImage(spr, this.x - s / 2, 0.5 + this.bob - s * 0.32, s, s);
    // いま出しているものを雲に表示
    const def = SPOUT_DEFS.find((d) => d.id === type);
    if (def) {
      const ic = emojiSprite(def.emoji, 64);
      g.globalAlpha = 0.95;
      g.drawImage(ic, this.x - 2.6, 3.4 + this.bob, 5.2, 5.2);
      g.globalAlpha = 1;
    }
  }
}
