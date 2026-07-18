// 空のシェーダレンダラ (WebGL2): レイリー散乱の空 / オーロラ / 氷晶ハロ
// 物理項 (λ⁻⁴ 散乱・輝線の色・22° リング) をフラグメントシェーダで計算する
import { waveToRgb, gamma } from './spectrum.js';

const VERT = `#version 300 es
layout(location=0) in vec2 p;
out vec2 uv;
void main(){ uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0., 1.); }`;

const COMMON = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outC;
uniform vec2 uRes;
uniform float uTime;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){
  vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}
float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<4;i++){ v+=a*noise(p); p*=2.03; a*=.5; } return v; }
vec3 tone(vec3 c){ c = 1.0 - exp(-c); return pow(c, vec3(1./2.2)); }
`;

const FRAGS = {
  // レイリー散乱の空 (青空〜夕焼け)。uSun: (x 0..1, 高度 -0.1..1)
  sunset: COMMON + `
uniform vec2 uSun;      // 太陽 (x, 高度)
uniform float uHaze;    // ちり (ミー散乱) 0..1
void main(){
  // 波長 612/549/465nm の散乱係数比 (λ^-4)
  vec3 beta = vec3(0.652, 1.007, 1.956);
  float elev = uv.y;                          // 画面上ほど天頂
  float sunEl = uSun.y;
  // 視線の空気量 (地平線ほど長い) と太陽光の空気量
  float mView = 1.0 / (elev * 0.9 + 0.08);
  float mSun  = 1.0 / (max(sunEl, -0.03) * 0.95 + 0.055);
  // 太陽光が視点上空に届くまでの透過 (夕方は青が抜けて赤くなる)
  vec3 T = exp(-beta * mSun * (0.22 + uHaze * 0.35));
  // レイリー内散乱: β·T·(視線の空気量)
  vec3 sky = beta * T * (1.0 - exp(-vec3(0.35) * mView)) * 1.35;
  // ミー散乱 (太陽方向のもや)
  vec2 sunPos = vec2(uSun.x, clamp(sunEl * 0.8 + 0.1, -0.2, 1.0));
  float d = distance(vec2(uv.x, uv.y * 0.9), sunPos);
  float mie = uHaze * exp(-d * 5.0) * 1.6 + uHaze * exp(-d * 1.4) * 0.35;
  sky += T * mie * vec3(1.0, 0.9, 0.75);
  // 太陽円盤
  float disk = smoothstep(0.035, 0.028, d);
  sky += disk * T * 14.0;
  // 夜への減光
  float night = smoothstep(-0.12, 0.10, sunEl);
  sky *= mix(0.045, 1.0, night);
  outC = vec4(tone(sky), 1.0);
}`,

  // オーロラカーテン。uStrength: 太陽風 0..1, uGreen/uRed/uPurple: 輝線RGB
  aurora: COMMON + `
uniform float uStrength;
uniform vec3 uGreen;   // O 557.7nm
uniform vec3 uRed;     // O 630nm
uniform vec3 uPurple;  // N2+ 427.8nm
void main(){
  vec3 col = vec3(0.004, 0.006, 0.014);            // 夜空
  // 星
  vec2 sp = uv * uRes / 3.0;
  float st = step(0.9985, hash(floor(sp)));
  col += st * (0.5 + 0.5 * sin(uTime * 2.0 + hash(floor(sp) + 7.0) * 20.0)) * vec3(0.8);
  if (uStrength > 0.01) {
    // カーテン: ゆらぐ縦の帯 (磁力線に沿う筋)
    for (int L = 0; L < 3; L++) {
      float fl = float(L);
      float x = uv.x + fbm(vec2(uv.x * 2.0 + fl * 7.3, uTime * 0.07 + fl)) * 0.35;
      float band = fbm(vec2(x * 3.0 + fl * 13.1, uTime * 0.12));
      float curtain = smoothstep(0.42, 0.72, band) * (0.6 + 0.4 * noise(vec2(x * 40.0, uTime * 0.6)));
      // 高度プロファイル: 下端 (y~0.35) 緑が濃く、上へ尾を引く
      float base = 0.30 + fl * 0.06 + fbm(vec2(x * 2.0, fl * 3.0)) * 0.10;
      float h = uv.y - base;                        // カーテン内の高さ
      float inC = smoothstep(-0.015, 0.03, h);
      float greenBand = inC * exp(-max(h, 0.0) * 6.0);
      float redBand = smoothstep(0.10, 0.30, h) * exp(-max(h - 0.18, 0.0) * 4.0) * step(0.35, uStrength);
      float purpleBand = smoothstep(0.012, -0.012, h) * exp(max(h, -0.2) * 18.0) * step(0.7, uStrength);
      float amp = curtain * uStrength * (1.0 - fl * 0.25);
      col += amp * (uGreen * greenBand * 1.5 + uRed * redBand * 0.9 + uPurple * purpleBand * 1.1);
    }
  }
  // 地平の山影
  float ridge = smoothstep(0.0, 0.005, uv.y - (0.12 + fbm(vec2(uv.x * 3.0, 4.2)) * 0.05));
  col *= ridge;
  outC = vec4(tone(col), 1.0);
}`,

  // 月のハロ (22°暈)。uMoon: 画面uv, uDegPx: 1°あたりのuv距離, uCirrus: 氷晶雲量, uPlate: 板状結晶率
  halo: COMMON + `
uniform vec2 uMoon;
uniform float uDegPx;
uniform float uCirrus;
uniform float uPlate;
void main(){
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  vec2 d2 = (uv - uMoon) * asp;
  float deg = length(d2) / uDegPx;                  // 月からの角距離 [deg]
  vec3 col = vec3(0.010, 0.014, 0.030);             // 夜空
  vec2 sp = uv * uRes / 3.0;
  col += step(0.9982, hash(floor(sp))) * vec3(0.7) * (1.0 - uCirrus * 0.7);
  // 月
  col += smoothstep(1.3, 0.9, deg) * vec3(1.0, 0.98, 0.9) * 2.2;
  col += exp(-deg * 0.9) * vec3(0.5, 0.55, 0.65) * (0.25 + uCirrus * 0.4);
  if (uCirrus > 0.02) {
    // 薄雲のむら
    float cl = fbm(uv * 6.0 + vec2(uTime * 0.01, 0.0));
    // 22° リング: 最小偏角 → 内側は急峻に暗く、外へなだらか (内縁が赤い)
    float t = deg - 22.0;
    float ring = smoothstep(-0.5, 0.4, t) * exp(-max(t, 0.0) * 0.55);
    vec3 ringCol = mix(vec3(0.9, 0.35, 0.25), vec3(0.75, 0.82, 0.95), clamp(t * 0.5, 0.0, 1.0));
    col += ring * ringCol * uCirrus * (0.5 + cl * 0.5) * 0.55;
    // 幻月 (板状結晶): 月と同じ高さの左右 22°
    if (uPlate > 0.02) {
      for (float s = -1.0; s <= 1.0; s += 2.0) {
        vec2 dogPos = uMoon + vec2(s * 22.0 * uDegPx / asp.x, 0.0);
        float dd = length((uv - dogPos) * asp) / uDegPx;
        col += exp(-dd * dd * 1.4) * vec3(1.0, 0.75, 0.55) * uPlate * uCirrus * 1.3;
      }
      // 上端接弧 (おまけ)
      vec2 arcPos = uMoon + vec2(0.0, 22.0 * uDegPx);
      float da = length((uv - arcPos) * asp) / uDegPx;
      col += exp(-da * da * 0.5) * vec3(0.8, 0.85, 1.0) * uPlate * uCirrus * 0.35;
    }
  }
  outC = vec4(tone(col), 1.0);
}`,
};

export class SkyRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2', { alpha: false, antialias: false });
    this.ok = !!this.gl;
    this.progs = {};
    if (!this.ok) return;
    const gl = this.gl;
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    // 輝線の色 (スペクトル変換をJS側で計算して渡す)
    const norm = (l) => {
      const c = waveToRgb(l);
      const m = Math.max(...c, 1e-6);
      return [c[0] / m, c[1] / m, c[2] / m];
    };
    this.emission = { green: norm(557.7), red: norm(630), purple: norm(427.8) };
  }

  _prog(name) {
    if (this.progs[name]) return this.progs[name];
    const gl = this.gl;
    const mk = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error(name, gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, mk(gl.VERTEX_SHADER, VERT));
    gl.attachShader(p, mk(gl.FRAGMENT_SHADER, FRAGS[name]));
    gl.linkProgram(p);
    this.progs[name] = p;
    return p;
  }

  resize(w, h) {
    if (!this.ok) return;
    this.canvas.width = w;
    this.canvas.height = h;
    this.gl.viewport(0, 0, w, h);
  }

  // effect: { name, uniforms: {uSun:[x,y], uHaze:0.3, ...} }
  render(effect, time) {
    if (!this.ok || !effect) return;
    const gl = this.gl;
    const p = this._prog(effect.name);
    if (!p) return;
    gl.useProgram(p);
    gl.uniform2f(gl.getUniformLocation(p, 'uRes'), this.canvas.width, this.canvas.height);
    gl.uniform1f(gl.getUniformLocation(p, 'uTime'), time);
    if (effect.name === 'aurora') {
      gl.uniform3fv(gl.getUniformLocation(p, 'uGreen'), this.emission.green);
      gl.uniform3fv(gl.getUniformLocation(p, 'uRed'), this.emission.red);
      gl.uniform3fv(gl.getUniformLocation(p, 'uPurple'), this.emission.purple);
    }
    for (const [k, v] of Object.entries(effect.uniforms || {})) {
      const loc = gl.getUniformLocation(p, k);
      if (loc === null) continue;
      if (Array.isArray(v)) {
        if (v.length === 2) gl.uniform2fv(loc, v);
        else if (v.length === 3) gl.uniform3fv(loc, v);
      } else gl.uniform1f(loc, v);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}

export { gamma };
