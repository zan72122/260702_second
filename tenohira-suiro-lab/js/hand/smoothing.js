// One-Euro フィルター (Casiez et al. 2012)
// 手のランドマークの揺れを取るための適応ローパス。
// 静止時: 強くなめらか → ダムにした手からポロポロ漏れない
// 高速時: 遅延最小   → 水を押す動きがすぐ伝わる

function alpha(cutoff, dt) {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
}

class OneEuro1D {
  constructor(minCutoff = 1.2, beta = 0.02, dCutoff = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
    this.x = null;
    this.dx = 0;
  }
  reset() { this.x = null; this.dx = 0; }
  filter(v, dt) {
    if (this.x === null) { this.x = v; this.dx = 0; return v; }
    const dRaw = (v - this.x) / dt;
    this.dx += (dRaw - this.dx) * alpha(this.dCutoff, dt);
    const cutoff = this.minCutoff + this.beta * Math.abs(this.dx);
    this.x += (v - this.x) * alpha(cutoff, dt);
    return this.x;
  }
}

// 1つの手 = 21ランドマーク × (x,y) のフィルター束
export class HandFilter {
  constructor(n = 21) {
    this.fx = [];
    this.fy = [];
    for (let i = 0; i < n; i++) {
      // 正規化座標(0..1)に対するチューニング
      this.fx.push(new OneEuro1D(1.2, 4.0, 1.0));
      this.fy.push(new OneEuro1D(1.2, 4.0, 1.0));
    }
    this.out = new Float32Array(n * 2);
  }
  reset() {
    for (const f of this.fx) f.reset();
    for (const f of this.fy) f.reset();
  }
  // norm: Float32Array(42) [x0,y0,x1,y1,...] 正規化座標
  filter(norm, dt) {
    const o = this.out;
    for (let i = 0; i < this.fx.length; i++) {
      o[i * 2] = this.fx[i].filter(norm[i * 2], dt);
      o[i * 2 + 1] = this.fy[i].filter(norm[i * 2 + 1], dt);
    }
    return o;
  }
}
