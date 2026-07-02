// 空・海・光・昼夜サイクル
import * as THREE from 'three';
import { clamp, lerp, smoothstep, TAU, rand } from '../core/utils.js';

// 1日の長さ(秒)
export const DAY_LENGTH = 240;

// 時刻ごとのカラーパレット (t: 0=まよなか 0.25=あさ 0.5=ひる 0.75=ゆうがた)
const SKY_STOPS = [
  { t: 0.0,  top: 0x1a1440, mid: 0x2c2260, bot: 0x4a3a80, sun: 0x8888ff, amb: 0x3a3468, fog: 0x2c2260, sunI: 0.25, ambI: 0.55 },
  { t: 0.22, top: 0x3a2a70, mid: 0xb06090, bot: 0xffb080, sun: 0xffc0a0, amb: 0x8a6a9a, fog: 0xd88ba0, sunI: 0.9, ambI: 0.7 },
  { t: 0.3,  top: 0x5aa0e8, mid: 0x9ecfff, bot: 0xffe0c0, sun: 0xfff0d8, amb: 0xbfd4ef, fog: 0xbfe0ff, sunI: 1.35, ambI: 0.85 },
  { t: 0.5,  top: 0x4a9ef0, mid: 0x8fd0ff, bot: 0xd8f0ff, sun: 0xffffff, amb: 0xcfe4f7, fog: 0xb8e2ff, sunI: 1.6, ambI: 0.95 },
  { t: 0.7,  top: 0x4a90e0, mid: 0xa0c8ff, bot: 0xffd8b0, sun: 0xfff0c8, amb: 0xc0cce8, fog: 0xc8d8ff, sunI: 1.3, ambI: 0.85 },
  { t: 0.78, top: 0x50307a, mid: 0xd06888, bot: 0xffa060, sun: 0xffb888, amb: 0x9a6a8a, fog: 0xd8809a, sunI: 0.85, ambI: 0.7 },
  { t: 0.88, top: 0x241a50, mid: 0x3a2a68, bot: 0x6a4a90, sun: 0x99aaff, amb: 0x453e78, fog: 0x3a2f68, sunI: 0.3, ambI: 0.55 },
  { t: 1.0,  top: 0x1a1440, mid: 0x2c2260, bot: 0x4a3a80, sun: 0x8888ff, amb: 0x3a3468, fog: 0x2c2260, sunI: 0.25, ambI: 0.55 },
];

function sampleStops(t) {
  let a = SKY_STOPS[0], b = SKY_STOPS[SKY_STOPS.length - 1];
  for (let i = 0; i < SKY_STOPS.length - 1; i++) {
    if (t >= SKY_STOPS[i].t && t <= SKY_STOPS[i + 1].t) { a = SKY_STOPS[i]; b = SKY_STOPS[i + 1]; break; }
  }
  const k = b.t === a.t ? 0 : (t - a.t) / (b.t - a.t);
  const mix = (ca, cb) => new THREE.Color(ca).lerp(new THREE.Color(cb), k);
  return {
    top: mix(a.top, b.top), mid: mix(a.mid, b.mid), bot: mix(a.bot, b.bot),
    sun: mix(a.sun, b.sun), amb: mix(a.amb, b.amb), fog: mix(a.fog, b.fog),
    sunI: lerp(a.sunI, b.sunI, k), ambI: lerp(a.ambI, b.ambI, k),
  };
}

export class Environment {
  constructor(scene, initialTime = 0.3) {
    this.scene = scene;
    this.time = initialTime; // 0..1
    this.elapsed = 0;

    scene.fog = new THREE.Fog(0xbfe0ff, 60, 190);

    // ---------- 空(グラデーションシェーダの大球) ----------
    this.skyUniforms = {
      topColor: { value: new THREE.Color(0x4a9ef0) },
      midColor: { value: new THREE.Color(0x8fd0ff) },
      botColor: { value: new THREE.Color(0xd8f0ff) },
      nightMix: { value: 0 },
      uTime: { value: 0 },
    };
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: this.skyUniforms,
      vertexShader: `
        varying vec3 vPos;
        void main() {
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        varying vec3 vPos;
        uniform vec3 topColor, midColor, botColor;
        uniform float nightMix, uTime;
        // 星のためのハッシュ
        float hash(vec3 p) {
          p = fract(p * 0.3183099 + .1);
          p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }
        void main() {
          float h = normalize(vPos).y;
          vec3 col;
          if (h > 0.15) col = mix(midColor, topColor, smoothstep(0.15, 0.8, h));
          else col = mix(botColor, midColor, smoothstep(-0.15, 0.15, h));
          // 星(夜だけ)
          if (nightMix > 0.01 && h > 0.02) {
            vec3 dir = normalize(vPos) * 90.0;
            vec3 cell = floor(dir);
            float star = step(0.985, hash(cell));
            float tw = 0.6 + 0.4 * sin(uTime * 2.5 + hash(cell + 1.0) * 40.0);
            col += vec3(1.0, 0.95, 0.85) * star * tw * nightMix * smoothstep(0.02, 0.25, h);
          }
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(180, 32, 24), skyMat);
    scene.add(this.sky);

    // ---------- 光 ----------
    this.sun = new THREE.DirectionalLight(0xffffff, 1.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.near = 5;
    this.sun.shadow.camera.far = 130;
    const S = 42;
    this.sun.shadow.camera.left = -S;
    this.sun.shadow.camera.right = S;
    this.sun.shadow.camera.top = S;
    this.sun.shadow.camera.bottom = -S;
    this.sun.shadow.bias = -0.0008;
    this.sun.shadow.normalBias = 0.02;
    scene.add(this.sun);
    scene.add(this.sun.target);

    this.hemi = new THREE.HemisphereLight(0xcfe4f7, 0x8fbf7f, 0.9);
    scene.add(this.hemi);

    // ---------- 太陽と月のビルボード ----------
    const glowTex = makeGlowTexture();
    this.sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: 0xfff2c0, transparent: true, opacity: 0.95, depthWrite: false, fog: false,
    }));
    this.sunSprite.scale.setScalar(30);
    scene.add(this.sunSprite);

    this.moonSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: 0xd8e4ff, transparent: true, opacity: 0.9, depthWrite: false, fog: false,
    }));
    this.moonSprite.scale.setScalar(18);
    scene.add(this.moonSprite);

    // ---------- 海 ----------
    this.oceanUniforms = {
      uTime: { value: 0 },
      shallow: { value: new THREE.Color(0x5fd8e8) },
      deep: { value: new THREE.Color(0x2a6fd0) },
      sparkleI: { value: 1.0 },
    };
    const oceanMat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, this.oceanUniforms]),
      fog: true,
      vertexShader: `
        #include <fog_pars_vertex>
        uniform float uTime;
        varying vec2 vUv;
        varying float vWave;
        void main() {
          vUv = uv;
          vec3 p = position;
          float w = sin(p.x * 0.28 + uTime * 1.1) * cos(p.y * 0.24 + uTime * 0.9) * 0.2
                  + sin(p.x * 0.1 - uTime * 0.6) * 0.12;
          p.z += w;
          vWave = w;
          vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: `
        #include <fog_pars_fragment>
        uniform vec3 shallow, deep;
        uniform float uTime, sparkleI;
        varying vec2 vUv;
        varying float vWave;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        void main() {
          float d = length(vUv - 0.5) * 2.0;
          vec3 col = mix(shallow, deep, smoothstep(0.16, 0.75, d));
          col += vWave * 0.09;
          // キラキラ
          vec2 cell = floor(vUv * 220.0 + vec2(uTime * 1.5, uTime * 0.8));
          float sp = step(0.994, hash(cell));
          col += vec3(1.0) * sp * sparkleI * 0.7;
          gl_FragColor = vec4(col, 1.0);
          #include <fog_fragment>
        }`,
    });
    // uniforms がマージでコピーされるので参照を取り直す
    this.oceanUniforms = oceanMat.uniforms;
    this.ocean = new THREE.Mesh(new THREE.PlaneGeometry(380, 380, 48, 48), oceanMat);
    this.ocean.rotation.x = -Math.PI / 2;
    this.ocean.position.y = -0.6;
    scene.add(this.ocean);

    // ---------- 雲 ----------
    this.clouds = new THREE.Group();
    const cloudMat = new THREE.MeshLambertMaterial({ color: 0xf2f6ff, transparent: true, opacity: 0.85 });
    for (let i = 0; i < 10; i++) {
      const cloud = new THREE.Group();
      const n = 3 + Math.floor(rand(3));
      for (let j = 0; j < n; j++) {
        const s = rand(2.2, 4.6);
        const puff = new THREE.Mesh(new THREE.SphereGeometry(s, 10, 8), cloudMat);
        puff.position.set(j * rand(2.4, 3.4) - n, rand(-0.6, 0.8), rand(-1.4, 1.4));
        puff.scale.y = 0.62;
        cloud.add(puff);
      }
      const ang = rand(TAU);
      const r = rand(70, 130);
      cloud.position.set(Math.cos(ang) * r, rand(26, 46), Math.sin(ang) * r);
      cloud.userData.speed = rand(0.4, 1.1);
      this.clouds.add(cloud);
    }
    scene.add(this.clouds);

    this.applyTime();
  }

  get isNight() { return this.time < 0.2 || this.time > 0.82; }
  get nightMix() {
    // 0=ひる 1=よる
    const t = this.time;
    if (t > 0.26 && t < 0.74) return 0;
    if (t <= 0.26) return smoothstep(0.26, 0.16, t);
    return smoothstep(0.74, 0.86, t);
  }

  update(dt, camera) {
    this.elapsed += dt;
    this.time = (this.time + dt / DAY_LENGTH) % 1;
    this.skyUniforms.uTime.value = this.elapsed;
    this.oceanUniforms.uTime.value = this.elapsed;

    // 雲を流す
    this.clouds.children.forEach((c) => {
      c.position.x += c.userData.speed * dt;
      if (c.position.x > 150) c.position.x = -150;
    });

    // 空・海・カメラ位置に追従
    this.sky.position.copy(camera.position);
    this.applyTime();
  }

  applyTime() {
    const s = sampleStops(this.time);
    this.skyUniforms.topColor.value.copy(s.top);
    this.skyUniforms.midColor.value.copy(s.mid);
    this.skyUniforms.botColor.value.copy(s.bot);
    this.skyUniforms.nightMix.value = this.nightMix;

    this.scene.fog.color.copy(s.fog);

    // 太陽の軌道: time 0.25 で東から昇り 0.75 で西に沈む
    const sunAng = (this.time - 0.25) * TAU; // 0 で日の出
    const sunY = Math.sin(sunAng);
    const sunX = Math.cos(sunAng);
    const dayLight = clamp(sunY + 0.15, 0, 1);

    // 夜は月が光源に
    if (sunY > -0.12) {
      this.sun.position.set(sunX * 60, Math.max(sunY, 0.06) * 70 + 8, 28);
      this.sun.color.copy(s.sun);
      this.sun.intensity = s.sunI;
    } else {
      this.sun.position.set(-sunX * 55, Math.max(-sunY, 0.1) * 55 + 10, -24);
      this.sun.color.set(0x9db4ff);
      this.sun.intensity = 0.5;
    }
    this.sun.target.position.set(0, 0, 0);

    this.hemi.color.copy(s.amb);
    this.hemi.intensity = s.ambI;

    // ビルボード
    this.sunSprite.position.set(sunX * 150, sunY * 120, -60);
    this.sunSprite.material.opacity = clamp(sunY + 0.3, 0, 1) * 0.95;
    this.moonSprite.position.set(-sunX * 140, -sunY * 110 + 8, 60);
    this.moonSprite.material.opacity = clamp(-sunY + 0.2, 0, 1) * 0.9;

    // 海の色
    const oceanDay = new THREE.Color(0x5fd8e8), oceanNight = new THREE.Color(0x1d2f6e);
    const deepDay = new THREE.Color(0x2a6fd0), deepNight = new THREE.Color(0x121a4a);
    const nm = this.nightMix;
    this.oceanUniforms.shallow.value.copy(oceanDay).lerp(oceanNight, nm);
    this.oceanUniforms.deep.value.copy(deepDay).lerp(deepNight, nm);
    this.oceanUniforms.sparkleI.value = lerp(1.0, 0.5, nm);

    // 雲は夜すこし暗く
    void dayLight;
  }

  clockLabel() {
    const t = this.time;
    if (t < 0.2 || t > 0.86) return '🌙';
    if (t < 0.3) return '🌅';
    if (t < 0.68) return '☀️';
    if (t < 0.86) return '🌇';
    return '🌙';
  }
}

function makeGlowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,240,0.9)');
  g.addColorStop(0.6, 'rgba(255,240,210,0.25)');
  g.addColorStop(1, 'rgba(255,240,210,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  return tex;
}
