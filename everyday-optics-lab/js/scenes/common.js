// シーン共通部品
import { TAU, clamp } from '../engine/utils.js';
import { rr } from '../engine/art.js';

// 動かせる/回せる光学要素のマネージャ
// item: { x, y, r(つかみ半径), angle, rot: {len, r}|null, minA?, maxA?, onChange? }
export class DragMgr {
  constructor() {
    this.items = [];
    this.active = null;
    this.mode = null;
  }
  add(item) {
    item.angle = item.angle ?? 0;
    this.items.push(item);
    return item;
  }
  knobPos(it) {
    return [it.x + Math.cos(it.angle) * it.rot.len, it.y + Math.sin(it.angle) * it.rot.len];
  }
  down(p) {
    // 回転ノブ優先
    for (const it of this.items) {
      if (it.rot) {
        const [kx, ky] = this.knobPos(it);
        if (Math.hypot(p.x - kx, p.y - ky) < it.rot.r + 3) {
          this.active = it; this.mode = 'rot';
          return true;
        }
      }
    }
    for (const it of this.items) {
      if (Math.hypot(p.x - it.x, p.y - it.y) < it.r + 2) {
        this.active = it; this.mode = 'move';
        this.offX = it.x - p.x; this.offY = it.y - p.y;
        return true;
      }
    }
    return false;
  }
  move(p, ctx) {
    const it = this.active;
    if (!it) return false;
    if (this.mode === 'rot') {
      let a = Math.atan2(p.y - it.y, p.x - it.x);
      if (it.minA !== undefined) a = clamp(a, it.minA, it.maxA);
      it.angle = a;
    } else {
      if (it.fixed) return true;
      it.x = clamp(p.x + this.offX, it.boundsX?.[0] ?? 4, it.boundsX?.[1] ?? (ctx?.W ?? 999) - 4);
      it.y = clamp(p.y + this.offY, it.boundsY?.[0] ?? 4, it.boundsY?.[1] ?? (ctx?.H ?? 999) - 4);
    }
    it.onChange?.(it);
    return true;
  }
  up() { this.active = null; this.mode = null; }

  // つかみやすさの視覚ヒント (点線リング+回転ノブ)
  draw(g, opts = {}) {
    for (const it of this.items) {
      if (it.hideRing !== true) {
        g.strokeStyle = this.active === it ? 'rgba(255,220,90,0.8)' : 'rgba(255,255,255,0.28)';
        g.lineWidth = 0.5;
        g.setLineDash([1.6, 1.6]);
        g.beginPath();
        g.arc(it.x, it.y, it.r, 0, TAU);
        g.stroke();
        g.setLineDash([]);
      }
      if (it.rot) {
        const [kx, ky] = this.knobPos(it);
        g.strokeStyle = 'rgba(255,255,255,0.35)';
        g.lineWidth = 0.4;
        g.beginPath();
        g.moveTo(it.x, it.y);
        g.lineTo(kx, ky);
        g.stroke();
        g.fillStyle = this.active === it && this.mode === 'rot' ? '#ffd25a' : 'rgba(255,255,255,0.85)';
        g.beginPath();
        g.arc(kx, ky, it.rot.r, 0, TAU);
        g.fill();
        g.fillStyle = '#556';
        g.font = `${it.rot.r * 1.1}px sans-serif`;
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText('↻', kx, ky + 0.2);
        g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      }
    }
  }
}

// 分度器風の角度表示
export function drawAngleArc(g, x, y, a0, a1, r, label, color = 'rgba(255,255,255,0.85)') {
  g.strokeStyle = color;
  g.lineWidth = 0.5;
  g.setLineDash([1.2, 1]);
  g.beginPath();
  g.arc(x, y, r, a0, a1, a1 < a0);
  g.stroke();
  g.setLineDash([]);
  if (label) {
    const am = (a0 + a1) / 2;
    g.fillStyle = color;
    g.font = 'bold 3px sans-serif';
    g.fillText(label, x + Math.cos(am) * (r + 3), y + Math.sin(am) * (r + 3));
  }
}

// 光源 (懐中電灯) の絵
export function drawFlashlight(g, x, y, angle, scale = 1) {
  g.save();
  g.translate(x, y);
  g.rotate(angle);
  g.scale(scale, scale);
  g.fillStyle = '#4a5266';
  rr(g, -14, -2.6, 10, 5.2, 1.4);
  g.fill();
  g.fillStyle = '#5c6478';
  g.beginPath();
  g.moveTo(-4, -2.6); g.lineTo(0, -3.8); g.lineTo(0, 3.8); g.lineTo(-4, 2.6);
  g.closePath();
  g.fill();
  g.fillStyle = '#fff8d8';
  g.beginPath();
  g.ellipse(0.2, 0, 0.9, 3.4, 0, 0, TAU);
  g.fill();
  g.restore();
}
