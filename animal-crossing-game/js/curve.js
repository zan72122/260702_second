// ============================================================
// 「まるい地平線」シェーダー
// あつ森名物・地面が奥へ丸く落ちていく見た目を全マテリアルに適用する
// ============================================================

export const CURVE_UNIFORM = { value: 0.0014 };

// ビュー空間の奥行きに応じて頂点を下へ曲げる
export const CURVE_GLSL = `
  mvPosition.y -= uWorldCurve * mvPosition.z * mvPosition.z;
`;

export function applyCurve(material) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWorldCurve = CURVE_UNIFORM;
    shader.vertexShader = shader.vertexShader
      .replace(
        'void main() {',
        'uniform float uWorldCurve;\nvoid main() {'
      )
      .replace(
        'gl_Position = projectionMatrix * mvPosition;',
        CURVE_GLSL + '\n  gl_Position = projectionMatrix * mvPosition;'
      );
  };
  // onBeforeCompile を変えたのでキャッシュキーも変える
  material.customProgramCacheKey = () => 'world-curve';
  return material;
}
