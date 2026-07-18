// スペクトル: 波長→色変換と、素材の分散 (波長ごとの屈折率)
// 物理ベース: CIE 等色関数のガウス近似 (Wyman et al. 2013) + sRGB 変換

// CIE 1931 xyz 等色関数の区分ガウス近似
function gauss(x, a, mu, s1, s2) {
  const t = (x - mu) * (x < mu ? 1 / s1 : 1 / s2);
  return a * Math.exp(-0.5 * t * t);
}
export function cieX(l) {
  return gauss(l, 1.056, 599.8, 37.9, 31.0) + gauss(l, 0.362, 442.0, 16.0, 26.7) + gauss(l, -0.065, 501.1, 20.4, 26.2);
}
export function cieY(l) {
  return gauss(l, 0.821, 568.8, 46.9, 40.5) + gauss(l, 0.286, 530.9, 16.3, 31.1);
}
export function cieZ(l) {
  return gauss(l, 1.217, 437.0, 11.8, 36.0) + gauss(l, 0.681, 459.0, 26.0, 13.8);
}

// XYZ → linear sRGB
export function xyzToRgb(X, Y, Z) {
  return [
    3.2406 * X - 1.5372 * Y - 0.4986 * Z,
    -0.9689 * X + 1.8758 * Y + 0.0415 * Z,
    0.0557 * X - 0.2040 * Y + 1.0570 * Z,
  ];
}

// 波長 (nm) → linear RGB (単色光, 正規化前)
export function waveToRgb(l) {
  const rgb = xyzToRgb(cieX(l), cieY(l), cieZ(l));
  // 負値は色域外 → 0 にクリップ (デソシエーションせず単純クリップで十分)
  return [Math.max(0, rgb[0]), Math.max(0, rgb[1]), Math.max(0, rgb[2])];
}

// ガンマ (表示用)
export function gamma(c) {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

// 可視域のスペクトルサンプル列 [ { l, rgb:[r,g,b], w } ]
// 等エネルギー白が無彩色になるよう、合計RGBで正規化した重みを持つ
export function makeSpectrum(n = 16, l0 = 390, l1 = 700) {
  const out = [];
  let sr = 0, sg = 0, sb = 0;
  for (let i = 0; i < n; i++) {
    const l = l0 + ((i + 0.5) / n) * (l1 - l0);
    const rgb = waveToRgb(l);
    sr += rgb[0]; sg += rgb[1]; sb += rgb[2];
    out.push({ l, rgb });
  }
  // 白 = 全サンプル合計が (1,1,1) になるスケール
  for (const s of out) {
    s.rgb = [s.rgb[0] / sr, s.rgb[1] / sg, s.rgb[2] / sb];
  }
  return out;
}

// ---- 分散モデル (コーシーの式 n(λ) = A + B/λ², λ は µm) ----
export const MATERIALS = {
  // BK7 ガラス相当
  glass: { A: 1.5046, B: 0.00420 },
  // 水 (20℃): n(589)≈1.333, n(400)≈1.344, n(700)≈1.331
  water: { A: 1.3247, B: 0.00305 },
  // 氷
  ice: { A: 1.3049, B: 0.00512 },
  // 高分散ガラス (おもちゃのプリズム風、虹が広がりやすい)
  flint: { A: 1.60, B: 0.010 },
};

export function refIndex(mat, lNm) {
  const m = MATERIALS[mat] || MATERIALS.glass;
  const um = lNm / 1000;
  return m.A + m.B / (um * um);
}

// 全反射の臨界角 (rad): n1 → n2 (n1 > n2)
export function criticalAngle(n1, n2 = 1) {
  return Math.asin(n2 / n1);
}

// ---- 薄膜干渉 (シャボン玉・油膜) ----
// 屈折率 nf の膜 (厚み d nm) に空気から角度 θi で入射した光の反射率
// 2光線干渉近似: R = R1 + R2 + 2√(R1R2)cos(δ)、位相反転は表面反射のみ
export function thinFilmReflectance(lNm, dNm, nf = 1.33, cosTi = 1) {
  const sinTi2 = 1 - cosTi * cosTi;
  const sinTf2 = sinTi2 / (nf * nf);
  const cosTf = Math.sqrt(Math.max(0, 1 - sinTf2));
  // フレネル (s/p 平均の簡易形): 垂直入射近似の振幅反射率
  const r = (1 - nf) / (1 + nf);
  const R1 = r * r;
  // 光路差による位相 (表面反射の π 反転込み)
  const delta = (4 * Math.PI * nf * dNm * cosTf) / lNm + Math.PI;
  const A = 2 * Math.sqrt(R1 * R1);
  return Math.max(0, Math.min(1, R1 + R1 + A * Math.cos(delta)));
}

// 薄膜の見た目の色 (linear RGB)
export function thinFilmColor(dNm, spectrum, nf = 1.33, cosTi = 1) {
  let r = 0, g = 0, b = 0;
  for (const s of spectrum) {
    const R = thinFilmReflectance(s.l, dNm, nf, cosTi);
    r += s.rgb[0] * R; g += s.rgb[1] * R; b += s.rgb[2] * R;
  }
  return [r, g, b];
}

// ---- レイリー散乱 (夕焼け・青空) ----
// 散乱係数 ∝ λ⁻⁴ (550nm 基準で正規化)
export function rayleighBeta(lNm) {
  const x = 550 / lNm;
  return x * x * x * x;
}
