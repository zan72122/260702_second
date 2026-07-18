// 屈折率が連続的に変わる媒質の中のレイマーチ (逃げ水・かげろう用)
// 光線方程式 d(n·T)/ds = ∇n を単位方向 T で積分する
// n(x,y) はシーンから関数で渡す (例: 熱い路面ほど n が小さい)

export function marchRay(x, y, dx, dy, nFn, opts = {}) {
  const step = opts.step ?? 1.2;
  const maxSteps = opts.maxSteps ?? 400;
  const pts = [x, y];
  for (let i = 0; i < maxSteps; i++) {
    const n = nFn(x, y);
    // ∇n を中心差分で
    const e = 0.5;
    const gx = (nFn(x + e, y) - nFn(x - e, y)) / (2 * e);
    const gy = (nFn(x, y + e) - nFn(x, y - e)) / (2 * e);
    // 進行方向に垂直な成分だけが向きを曲げる
    const dot = gx * dx + gy * dy;
    const px = (gx - dot * dx) / n;
    const py = (gy - dot * dy) / n;
    dx += px * step; dy += py * step;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    x += dx * step; y += dy * step;
    pts.push(x, y);
    if (opts.stop && opts.stop(x, y, dx, dy)) break;
  }
  return { pts, dx, dy, x, y };
}
