// ゆびモード: カメラが使えない時のフォールバック
// 画面にふれた指1本1本が、水をせき止められる「ゆびカプセル」になる。
// 動かすとカプセルの速度が水に伝わる — カメラの手とまったく同じ物理。

export class TouchHands {
  constructor() {
    this.pointers = new Map();   // pointerId → capsule
    this.capsules = [];          // 描画/物理用の生きているカプセル一覧
  }

  down(p) {
    // hand プロパティは付けない (排水路スキップの対象は手のカプセルのみ)
    const c = {
      kind: 'capsule', ax: p.x, ay: p.y, bx: p.x, by: p.y + 0.01,
      r: 4.2, vx: 0, vy: 0, touch: true,
    };
    this.pointers.set(p.id, c);
    this._rebuild();
  }

  move(p) {
    const c = this.pointers.get(p.id);
    if (!c) return;
    c.tx = p.x; c.ty = p.y;
  }

  up(p) {
    this.pointers.delete(p.id);
    this._rebuild();
  }

  clear() {
    this.pointers.clear();
    this._rebuild();
  }

  _rebuild() {
    this.capsules = [...this.pointers.values()];
  }

  // 毎フレーム: 位置をなめらかに追従させ、速度を計算。
  // 動きの方向に少し伸びたカプセルにすると「指でなぞった線」でせき止めやすい。
  update(dt, pointerMap) {
    for (const [id, c] of this.pointers) {
      const p = pointerMap.get(id);
      if (!p) continue;
      const px = (c.ax + c.bx) / 2, py = (c.ay + c.by) / 2;
      const nx = px + (p.x - px) * Math.min(1, dt * 28);
      const ny = py + (p.y - py) * Math.min(1, dt * 28);
      c.vx = (nx - px) / Math.max(dt, 1e-3);
      c.vy = (ny - py) / Math.max(dt, 1e-3);
      // 動きの方向へ伸ばす (最小0.8 = 静止時も点にならない, 最大6)
      const sp = Math.hypot(c.vx, c.vy);
      const len = Math.max(0.8, Math.min(6, sp * 0.04));
      const dx = sp > 1 ? c.vx / sp : 0, dy = sp > 1 ? c.vy / sp : 1;
      c.ax = nx - dx * len * 0.5; c.ay = ny - dy * len * 0.5;
      c.bx = nx + dx * len * 0.5; c.by = ny + dy * len * 0.5;
    }
  }
}
