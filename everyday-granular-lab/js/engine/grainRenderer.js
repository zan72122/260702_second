// 粒レンダラー: WebGL2 インスタンス描画で全粒を 1 draw call
// スプライトは起動時に Canvas2D で描いてテクスチャアトラス化する。
// WebGL2 が無い環境は Canvas2D フォールバック。

import { TAU } from './utils.js';

export const SPRITES = {
  SAND: 0, BALL: 1, RICE: 2, SNOW: 3,
  BEAN: 4, KERNEL: 5, POPCORN: 6, RING: 7,
  SEED: 8, SALT: 9, RAISIN: 10, CRUMB: 11,
};

const CELLS = 4, ATLAS = 512, CELL = ATLAS / CELLS;

function drawAtlas() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = ATLAS;
  const g = cv.getContext('2d');
  const cell = (idx, fn) => {
    const cx = (idx % CELLS) * CELL + CELL / 2;
    const cy = ((idx / CELLS) | 0) * CELL + CELL / 2;
    g.save();
    g.translate(cx, cy);
    fn(CELL * 0.5 * 0.86); // 少し余白
    g.restore();
  };

  // 0 砂粒: ややいびつな白い塊 + 粒感 (色はインスタンスでかける)
  cell(SPRITES.SAND, (R) => {
    g.beginPath();
    for (let i = 0; i <= 9; i++) {
      const a = i / 9 * TAU;
      const rr = R * (0.78 + 0.16 * Math.sin(i * 2.3 + 1));
      g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    g.closePath();
    const gr = g.createRadialGradient(-R * 0.3, -R * 0.3, R * 0.1, 0, 0, R);
    gr.addColorStop(0, '#ffffff');
    gr.addColorStop(1, '#b9b0a4');
    g.fillStyle = gr;
    g.fill();
  });

  // 1 ボール (ビーズ/ガムボール): 光沢
  cell(SPRITES.BALL, (R) => {
    const gr = g.createRadialGradient(-R * 0.35, -R * 0.35, R * 0.08, 0, 0, R);
    gr.addColorStop(0, '#ffffff');
    gr.addColorStop(0.25, '#f2f2f2');
    gr.addColorStop(0.8, '#c9c9c9');
    gr.addColorStop(1, '#9a9a9a');
    g.fillStyle = gr;
    g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.beginPath(); g.ellipse(-R * 0.4, -R * 0.42, R * 0.2, R * 0.13, -0.6, 0, TAU); g.fill();
  });

  // 2 お米: 細長い粒 (白系)
  cell(SPRITES.RICE, (R) => {
    const gr = g.createLinearGradient(0, -R * 0.4, 0, R * 0.4);
    gr.addColorStop(0, '#ffffff');
    gr.addColorStop(1, '#ddd8ce');
    g.fillStyle = gr;
    g.beginPath(); g.ellipse(0, 0, R * 0.95, R * 0.42, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.8)';
    g.beginPath(); g.ellipse(-R * 0.25, -R * 0.12, R * 0.4, R * 0.12, 0, 0, TAU); g.fill();
  });

  // 3 雪: ふわっとした円 (中身はしっかり白く)
  cell(SPRITES.SNOW, (R) => {
    const gr = g.createRadialGradient(0, 0, R * 0.1, 0, 0, R);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.62, 'rgba(252,253,255,1)');
    gr.addColorStop(0.88, 'rgba(244,248,255,0.75)');
    gr.addColorStop(1, 'rgba(240,246,255,0)');
    g.fillStyle = gr;
    g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
  });

  // 4 大豆: そのままの色で描く (tint=白)
  cell(SPRITES.BEAN, (R) => {
    const gr = g.createRadialGradient(-R * 0.3, -R * 0.3, R * 0.1, 0, 0, R);
    gr.addColorStop(0, '#f7e3b0');
    gr.addColorStop(1, '#cfa252');
    g.fillStyle = gr;
    g.beginPath(); g.ellipse(0, 0, R * 0.92, R * 0.74, 0, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(150,105,40,0.55)';
    g.lineWidth = R * 0.07;
    g.beginPath(); g.ellipse(R * 0.25, 0, R * 0.16, R * 0.3, 0, -1, 1); g.stroke();
  });

  // 5 ポップコーンの豆 (コーン粒)
  cell(SPRITES.KERNEL, (R) => {
    const gr = g.createRadialGradient(-R * 0.2, -R * 0.3, R * 0.1, 0, 0, R);
    gr.addColorStop(0, '#ffd76e');
    gr.addColorStop(1, '#d99a2b');
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(0, -R * 0.85);
    g.quadraticCurveTo(R * 0.8, -R * 0.5, R * 0.62, R * 0.3);
    g.quadraticCurveTo(R * 0.4, R * 0.8, 0, R * 0.8);
    g.quadraticCurveTo(-R * 0.4, R * 0.8, -R * 0.62, R * 0.3);
    g.quadraticCurveTo(-R * 0.8, -R * 0.5, 0, -R * 0.85);
    g.fill();
  });

  // 6 はじけたポップコーン: もこもこ雲
  cell(SPRITES.POPCORN, (R) => {
    const lobes = [[0, -R * 0.35, 0.5], [-R * 0.42, R * 0.1, 0.44], [R * 0.42, R * 0.1, 0.44], [0, R * 0.34, 0.42], [-R * 0.1, -R * 0.02, 0.4], [R * 0.15, -R * 0.15, 0.36]];
    for (const [x, y, rr] of lobes) {
      const gr = g.createRadialGradient(x - R * 0.1, y - R * 0.12, R * 0.05, x, y, R * rr);
      gr.addColorStop(0, '#fffdf4');
      gr.addColorStop(0.8, '#f5e8c8');
      gr.addColorStop(1, '#e2c894');
      g.fillStyle = gr;
      g.beginPath(); g.arc(x, y, R * rr, 0, TAU); g.fill();
    }
    g.fillStyle = 'rgba(220,170,80,0.5)';
    g.beginPath(); g.arc(R * 0.05, R * 0.08, R * 0.09, 0, TAU); g.fill();
  });

  // 7 リングシリアル: ドーナツ型
  cell(SPRITES.RING, (R) => {
    g.beginPath();
    g.arc(0, 0, R * 0.9, 0, TAU);
    g.arc(0, 0, R * 0.38, 0, TAU, true);
    const gr = g.createRadialGradient(-R * 0.3, -R * 0.3, R * 0.2, 0, 0, R);
    gr.addColorStop(0, '#ffe9b8');
    gr.addColorStop(1, '#cf9440');
    g.fillStyle = gr;
    g.fill();
    g.strokeStyle = 'rgba(150,90,30,0.35)';
    g.lineWidth = R * 0.06;
    g.beginPath(); g.arc(0, 0, R * 0.62, 0, TAU); g.stroke();
  });

  // 8 麦・エサ: とがった小粒
  cell(SPRITES.SEED, (R) => {
    const gr = g.createLinearGradient(-R, 0, R, 0);
    gr.addColorStop(0, '#e8cf96');
    gr.addColorStop(1, '#b98d48');
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(-R * 0.85, 0);
    g.quadraticCurveTo(-R * 0.2, -R * 0.5, R * 0.85, -R * 0.05);
    g.quadraticCurveTo(-R * 0.2, R * 0.48, -R * 0.85, 0);
    g.fill();
  });

  // 9 塩: 角ばった結晶 (白)
  cell(SPRITES.SALT, (R) => {
    g.save();
    g.rotate(0.35);
    const gr = g.createLinearGradient(-R, -R, R, R);
    gr.addColorStop(0, '#ffffff');
    gr.addColorStop(1, '#d8dde4');
    g.fillStyle = gr;
    g.fillRect(-R * 0.62, -R * 0.62, R * 1.24, R * 1.24);
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.fillRect(-R * 0.62, -R * 0.62, R * 0.5, R * 0.5);
    g.restore();
  });

  // 10 レーズン: しわしわ
  cell(SPRITES.RAISIN, (R) => {
    const gr = g.createRadialGradient(-R * 0.2, -R * 0.2, R * 0.1, 0, 0, R);
    gr.addColorStop(0, '#7a4a52');
    gr.addColorStop(1, '#472530');
    g.fillStyle = gr;
    g.beginPath();
    for (let i = 0; i <= 10; i++) {
      const a = i / 10 * TAU;
      const rr = R * (0.7 + 0.12 * Math.sin(i * 3));
      g.lineTo(Math.cos(a) * rr * 1.1, Math.sin(a) * rr * 0.8);
    }
    g.closePath(); g.fill();
    g.strokeStyle = 'rgba(30,10,18,0.5)';
    g.lineWidth = R * 0.05;
    g.beginPath(); g.moveTo(-R * 0.4, -R * 0.1); g.quadraticCurveTo(0, R * 0.15, R * 0.42, -R * 0.05); g.stroke();
  });

  // 11 パンくず/かけら
  cell(SPRITES.CRUMB, (R) => {
    const gr = g.createRadialGradient(-R * 0.2, -R * 0.3, R * 0.1, 0, 0, R);
    gr.addColorStop(0, '#f5e0b8');
    gr.addColorStop(1, '#c89a58');
    g.fillStyle = gr;
    g.beginPath();
    for (let i = 0; i <= 8; i++) {
      const a = i / 8 * TAU;
      const rr = R * (0.6 + 0.25 * Math.sin(i * 2.7 + 0.6));
      g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    g.closePath(); g.fill();
  });

  return cv;
}

const VS = `#version 300 es
layout(location=0) in vec2 aCorner;   // クアッド [-1,1]
layout(location=1) in vec2 aPos;      // インスタンス: 位置 (world)
layout(location=2) in vec2 aSizeAng;  // 半径, 回転
layout(location=3) in vec4 aTint;     // rgb + スプライトID
uniform vec2 uWorld;
uniform float uStretchTable[16];      // スプライトごとの縦横比
out vec2 vUv;
out vec3 vTint;
void main(){
  int sid = int(aTint.a + 0.5);
  float stretch = uStretchTable[sid];
  vec2 c = aCorner * vec2(1.0, 1.0 / max(stretch, 0.001));
  float s = sin(aSizeAng.y), co = cos(aSizeAng.y);
  vec2 rot = vec2(c.x * co - c.y * s, c.x * s + c.y * co) * aSizeAng.x * max(stretch, 1.0) * 1.35;
  vec2 w = aPos + rot;
  gl_Position = vec4(w.x / uWorld.x * 2.0 - 1.0, 1.0 - w.y / uWorld.y * 2.0, 0.0, 1.0);
  vec2 base = vec2(float(sid % 4), float(sid / 4));
  vUv = (base + (aCorner * 0.5 + 0.5)) / 4.0;
  vTint = aTint.rgb;
}`;

const FS = `#version 300 es
precision mediump float;
in vec2 vUv;
in vec3 vTint;
uniform sampler2D uAtlas;
out vec4 frag;
void main(){
  vec4 t = texture(uAtlas, vUv);
  if (t.a < 0.02) discard;
  frag = vec4(t.rgb * vTint, t.a);
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}

export class GrainRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ok = false;
    try {
      const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false });
      if (!gl) throw new Error('no webgl2');
      this.gl = gl;
      const p = gl.createProgram();
      gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, VS));
      gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
      this.prog = p;

      this.vao = gl.createVertexArray();
      gl.bindVertexArray(this.vao);
      // クアッド
      const qb = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, qb);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      // インスタンス
      this.maxI = 9200;
      this.iData = new Float32Array(this.maxI * 8);
      this.iBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.iBuf);
      gl.bufferData(gl.ARRAY_BUFFER, this.iData.byteLength, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 32, 0);
      gl.vertexAttribDivisor(1, 1);
      gl.enableVertexAttribArray(2);
      gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 32, 8);
      gl.vertexAttribDivisor(2, 1);
      gl.enableVertexAttribArray(3);
      gl.vertexAttribPointer(3, 4, gl.FLOAT, false, 32, 16);
      gl.vertexAttribDivisor(3, 1);
      gl.bindVertexArray(null);

      // アトラス
      const atlas = drawAtlas();
      this.tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.tex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

      this.uWorld = gl.getUniformLocation(p, 'uWorld');
      this.uStretch = gl.getUniformLocation(p, 'uStretchTable');
      this.uAtlas = gl.getUniformLocation(p, 'uAtlas');
      this.ok = true;
    } catch (e) {
      console.warn('WebGL2 なし → 2D フォールバック', e);
      this.ctx2d = canvas.getContext('2d');
    }
  }

  resize(w, h) {
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w; this.canvas.height = h;
    }
  }

  render(sim, W, H) {
    if (!this.ok) { this._render2d(sim, W, H); return; }
    const gl = this.gl;
    const n = Math.min(sim.n, this.maxI);
    const d = this.iData;
    const mats = sim.mats;
    const PK = sim.pack;
    for (let i = 0; i < n; i++) {
      const o = i * 8;
      d[o] = sim.x[i]; d[o + 1] = sim.y[i];
      d[o + 2] = sim.r[i]; d[o + 3] = sim.ang[i];
      // 締固めで青白い氷っぽさに
      const p = PK[i];
      d[o + 4] = sim.cr[i] * (1 - p * 0.16);
      d[o + 5] = sim.cg[i] * (1 - p * 0.07);
      d[o + 6] = sim.cb[i];
      d[o + 7] = sim.sprite[i];
    }
    // stretch テーブル (素材の縦横比をスプライト ID 経由で)
    const st = new Float32Array(16).fill(1);
    for (const m of mats) if (m) st[m.sprite] = m.stretch;

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.prog);
    gl.uniform2f(this.uWorld, W, H);
    gl.uniform1fv(this.uStretch, st);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.uniform1i(this.uAtlas, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, d, 0, n * 8);
    if (n > 0) gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, n);
    gl.bindVertexArray(null);
  }

  _render2d(sim, W) {
    const g = this.ctx2d, c = this.canvas;
    g.clearRect(0, 0, c.width, c.height);
    const s = c.width / W;
    for (let i = 0; i < sim.n; i++) {
      g.fillStyle = `rgb(${sim.cr[i] * 230 | 0},${sim.cg[i] * 230 | 0},${sim.cb[i] * 230 | 0})`;
      g.beginPath();
      g.arc(sim.x[i] * s, sim.y[i] * s, sim.r[i] * s, 0, TAU);
      g.fill();
    }
  }
}
