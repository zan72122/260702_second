// スクリーンスペース流体レンダラー (WebGL2)
// 1パス目: 粒子をガウシアンスプラットとして密度場に加算描画 (MRT: 色場 + 不透明度場)
// 2パス目: 密度場をしきい値処理し、法線を勾配から推定して
//          疑似3Dシェーディング(スペキュラ/リム/屈折)を行う。
// WebGL2 が無い環境では Canvas2D フォールバック。

const VS_POINT = `#version 300 es
layout(location=0) in vec2 aPos;
layout(location=1) in vec4 aCol;
uniform vec2 uWorld;    // world w,h
uniform float uPointPx; // 点の直径(px, field解像度)
out vec4 vCol;
void main(){
  vec2 clip = vec2(aPos.x / uWorld.x * 2.0 - 1.0, 1.0 - aPos.y / uWorld.y * 2.0);
  gl_Position = vec4(clip, 0.0, 1.0);
  gl_PointSize = uPointPx;
  vCol = aCol;
}`;

const FS_POINT = `#version 300 es
precision mediump float;
in vec4 vCol;
layout(location=0) out vec4 o0;
layout(location=1) out vec4 o1;
void main(){
  vec2 d = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(d, d);
  if (r2 > 1.0) discard;
  float w = 1.0 - r2;
  w = w * w * 0.24; // 8bitバッファ飽和対策のスケール
  o0 = vec4(vCol.rgb * w, w);
  o1 = vec4(vCol.a * w, 0.0, 0.0, w);
}`;

const VS_QUAD = `#version 300 es
layout(location=0) in vec2 aPos;
out vec2 vUv;
void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FS_COMP = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uField;   // rgb=色*w, a=密度
uniform sampler2D uAlpha;   // r=不透明度*w
uniform sampler2D uBack;    // 背景キャンバス
uniform vec2 uInvField;
uniform float uThresh;
uniform float uShine;       // ハイライト強度
uniform float uRefract;     // 屈折強度
out vec4 frag;

void main(){
  vec2 uv = vUv; // field/背景とも画面と同じ向き
  vec4 f = texture(uField, uv);
  float dens = f.a;
  float T = uThresh * 0.24; // 点描画側のスケールに合わせる
  float edge = smoothstep(T, T * 1.55, dens);
  if (edge <= 0.003) discard;
  vec3 col = f.rgb / max(dens, 1e-4);
  float alpha = texture(uAlpha, uv).r / max(dens, 1e-4);

  // 勾配→法線
  vec2 e = uInvField * 1.6;
  float dxp = texture(uField, uv + vec2(e.x, 0.0)).a;
  float dxm = texture(uField, uv - vec2(e.x, 0.0)).a;
  float dyp = texture(uField, uv + vec2(0.0, e.y)).a;
  float dym = texture(uField, uv - vec2(0.0, e.y)).a;
  vec2 g = vec2(dxp - dxm, dyp - dym); // Y下向き画面系
  vec3 n = normalize(vec3(-g.x * 9.0, -g.y * 9.0, 0.62));

  // 屈折: 背景を法線でゆがめてサンプル
  vec2 ofs = g * uRefract * 4.0;
  vec3 back = texture(uBack, clamp(vUv + ofs, 0.001, 0.999)).rgb;

  // シェーディング
  vec3 L = normalize(vec3(-0.35, 0.55, 0.75)); // 画面上方より
  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
  float spec = pow(max(dot(n, H), 0.0), 60.0) * uShine;
  float rim = pow(1.0 - clamp(n.z, 0.0, 1.0), 2.0);
  float inner = smoothstep(T * 1.1, T * 3.2, dens);
  // 深い所ほど濃く
  vec3 fluid = col * (0.72 + 0.28 * (1.0 - inner));
  fluid *= 1.0 - rim * 0.28;
  float a = clamp(alpha * (0.55 + inner * 0.5), 0.0, 1.0);
  vec3 rgb = mix(back, fluid, a);
  // 内部のノイズ状ハイライトを抑え、表面近くだけ光らせる
  rgb += spec * (0.35 + 0.65 * a) * mix(1.0, 0.2, inner);
  rgb += rim * col * 0.10;
  frag = vec4(rgb * edge, edge);
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    throw new Error('shader: ' + gl.getShaderInfoLog(s));
  }
  return s;
}
function program(gl, vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('link: ' + gl.getProgramInfoLog(p));
  return p;
}

export class FluidRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ok = false;
    try {
      const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false });
      if (!gl) throw new Error('no webgl2');
      this.gl = gl;
      this.progPoint = program(gl, VS_POINT, FS_POINT);
      this.progComp = program(gl, VS_QUAD, FS_COMP);
      // クアッド
      this.quadVao = gl.createVertexArray();
      gl.bindVertexArray(this.quadVao);
      const qb = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, qb);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      // 粒子VBO (x,y,r,g,b,a)
      this.maxP = 4096;
      this.pData = new Float32Array(this.maxP * 6);
      this.pVao = gl.createVertexArray();
      gl.bindVertexArray(this.pVao);
      this.pBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.pBuf);
      gl.bufferData(gl.ARRAY_BUFFER, this.pData.byteLength, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 24, 0);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 24, 8);
      gl.bindVertexArray(null);
      // 背景テクスチャ
      this.backTex = this._makeTex(gl.LINEAR, gl.CLAMP_TO_EDGE);
      this.fbo = null;
      this.ok = true;
    } catch (e) {
      console.warn('WebGL2 レンダラー初期化失敗 → 2Dフォールバック', e);
      this.ctx2d = canvas.getContext('2d');
    }
  }

  _makeTex(filter, wrap) {
    const gl = this.gl;
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    return t;
  }

  resize(w, h) {
    const c = this.canvas;
    if (c.width === w && c.height === h && this.fbo) return;
    c.width = w; c.height = h;
    if (!this.ok) return;
    const gl = this.gl;
    // 密度場は半解像度 (滑らか + 高速)
    this.fw = Math.max(64, Math.round(w / 2));
    this.fh = Math.max(64, Math.round(h / 2));
    if (this.fbo) { gl.deleteFramebuffer(this.fbo); gl.deleteTexture(this.fieldTex); gl.deleteTexture(this.alphaTex); }
    // float バッファが使えれば飽和なしの滑らかな密度場になる
    if (this.floatOk === undefined) this.floatOk = !!gl.getExtension('EXT_color_buffer_float');
    const ifmt = this.floatOk ? gl.RGBA16F : gl.RGBA8;
    const type = this.floatOk ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE;
    this.fieldTex = this._makeTex(gl.LINEAR, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, ifmt, this.fw, this.fh, 0, gl.RGBA, type, null);
    this.alphaTex = this._makeTex(gl.LINEAR, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, ifmt, this.fw, this.fh, 0, gl.RGBA, type, null);
    this.fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.fieldTex, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, this.alphaTex, 0);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  uploadBackdrop(canvas) {
    if (!this.ok) return;
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.backTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  }

  // sim: FluidSim, view: {W,H(world), shine, refract, radius(倍率)}
  render(sim, view) {
    if (!this.ok) { this._render2d(sim, view); return; }
    const gl = this.gl;
    const n = Math.min(sim.n, this.maxP);
    const d = this.pData;
    for (let i = 0; i < n; i++) {
      const o = i * 6;
      d[o] = sim.x[i]; d[o + 1] = sim.y[i];
      d[o + 2] = sim.cr[i]; d[o + 3] = sim.cg[i]; d[o + 4] = sim.cb[i]; d[o + 5] = sim.ca[i];
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.pBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, d, 0, n * 6);

    // pass 1: 密度場
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.viewport(0, 0, this.fw, this.fh);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.progPoint);
    gl.uniform2f(gl.getUniformLocation(this.progPoint, 'uWorld'), view.W, view.H);
    const pxPerUnit = this.fw / view.W;
    const rad = (view.radius || 1) * sim.h * 0.95;
    gl.uniform1f(gl.getUniformLocation(this.progPoint, 'uPointPx'), rad * 2 * pxPerUnit);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.bindVertexArray(this.pVao);
    if (n > 0) gl.drawArrays(gl.POINTS, 0, n);

    // pass 2: 合成
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.progComp);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.fieldTex);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.alphaTex);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.backTex);
    gl.uniform1i(gl.getUniformLocation(this.progComp, 'uField'), 0);
    gl.uniform1i(gl.getUniformLocation(this.progComp, 'uAlpha'), 1);
    gl.uniform1i(gl.getUniformLocation(this.progComp, 'uBack'), 2);
    gl.uniform2f(gl.getUniformLocation(this.progComp, 'uInvField'), 1 / this.fw, 1 / this.fh);
    gl.uniform1f(gl.getUniformLocation(this.progComp, 'uThresh'), view.thresh || 0.38);
    gl.uniform1f(gl.getUniformLocation(this.progComp, 'uShine'), view.shine ?? 1.0);
    gl.uniform1f(gl.getUniformLocation(this.progComp, 'uRefract'), (view.refract ?? 1.0) * 0.05);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); // premultiplied
    gl.bindVertexArray(this.quadVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  }

  // Canvas2D フォールバック: ソフトブロブ描画
  _render2d(sim, view) {
    const g = this.ctx2d, c = this.canvas;
    g.clearRect(0, 0, c.width, c.height);
    const s = c.width / view.W;
    const r = sim.h * 0.75 * s;
    g.globalCompositeOperation = 'source-over';
    for (let i = 0; i < sim.n; i++) {
      const x = sim.x[i] * s, y = sim.y[i] * s;
      g.fillStyle = `rgba(${sim.cr[i] * 255 | 0},${sim.cg[i] * 255 | 0},${sim.cb[i] * 255 | 0},${sim.ca[i] * 0.55})`;
      g.beginPath();
      g.arc(x, y, r, 0, 6.2832);
      g.fill();
    }
  }
}
