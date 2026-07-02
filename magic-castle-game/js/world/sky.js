// 空・昼夜サイクル・星・雲・照明
import * as THREE from 'three';
import { rand, TAU, lerp, clamp, glowTexture, starTexture } from '../core/utils.js';

const DAY_LENGTH = 300; // 1日 = 300秒(昼びいき)

const COL = {
  dayTop: new THREE.Color(0x4aa8ff),
  dayHor: new THREE.Color(0xbfe8ff),
  sunsetTop: new THREE.Color(0x7455c9),
  sunsetHor: new THREE.Color(0xffab7a),
  nightTop: new THREE.Color(0x0d0a33),
  nightHor: new THREE.Color(0x33246e),
  fogDay: new THREE.Color(0xcfe8ff),
  fogSunset: new THREE.Color(0xe8b090),
  fogNight: new THREE.Color(0x241a52),
};

export class Sky {
  constructor(scene) {
    this.scene = scene;
    this.time = DAY_LENGTH * 0.12; // 朝からスタート
    this.t = 0;          // 0..1
    this.isNight = false;
    this.nightF = 0;     // 0=昼 1=夜

    // --- 空ドーム(シェーダーグラデーション) ---
    this.uni = {
      topColor: { value: COL.dayTop.clone() },
      horColor: { value: COL.dayHor.clone() },
    };
    const skyGeo = new THREE.SphereGeometry(190, 24, 16);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: this.uni,
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: `
        varying vec3 vPos;
        void main() {
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 horColor;
        varying vec3 vPos;
        void main() {
          float h = normalize(vPos).y;
          float f = pow(max(h, 0.0), 0.55);
          gl_FragColor = vec4(mix(horColor, topColor, f), 1.0);
        }`,
    });
    this.dome = new THREE.Mesh(skyGeo, skyMat);
    scene.add(this.dome);

    scene.fog = new THREE.Fog(COL.fogDay.clone(), 55, 180);

    // --- 照明 ---
    this.hemi = new THREE.HemisphereLight(0xcfe8ff, 0x7a9e6a, 0.75);
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff3d8, 2.1);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = -42;
    this.sun.shadow.camera.right = 42;
    this.sun.shadow.camera.top = 42;
    this.sun.shadow.camera.bottom = -42;
    this.sun.shadow.camera.far = 140;
    this.sun.shadow.bias = -0.0008;
    scene.add(this.sun);
    scene.add(this.sun.target);

    // --- 太陽・月スプライト ---
    this.sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture('rgba(255,240,190,1)', 'rgba(255,200,90,0)'),
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.sunSprite.scale.setScalar(34);
    scene.add(this.sunSprite);

    this.moon = new THREE.Group();
    const moonBall = new THREE.Mesh(
      new THREE.SphereGeometry(4.5, 20, 14),
      new THREE.MeshBasicMaterial({ color: 0xfff8dc })
    );
    this.moon.add(moonBall);
    const moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture('rgba(255,250,220,.9)', 'rgba(200,190,255,0)'),
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    moonGlow.scale.setScalar(24);
    this.moon.add(moonGlow);
    scene.add(this.moon);

    // --- 星 ---
    const starN = 320;
    const sPos = new Float32Array(starN * 3);
    for (let i = 0; i < starN; i++) {
      const th = rand(TAU), ph = Math.acos(rand(0.05, 1));
      const r = 180;
      sPos[i * 3] = Math.sin(ph) * Math.cos(th) * r;
      sPos[i * 3 + 1] = Math.cos(ph) * r * 0.9 + 8;
      sPos[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * r;
    }
    const sGeo = new THREE.BufferGeometry();
    sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
    this.starMat = new THREE.PointsMaterial({
      size: 1.6, map: starTexture('#ffffff'), transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    });
    this.stars = new THREE.Points(sGeo, this.starMat);
    scene.add(this.stars);

    // --- 雲(ぷかぷか) ---
    this.clouds = [];
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.92 });
    for (let i = 0; i < 10; i++) {
      const g = new THREE.Group();
      const m = cloudMat.clone();
      const n = 3 + Math.floor(rand(3));
      for (let j = 0; j < n; j++) {
        const s = rand(2.2, 4.5);
        const puff = new THREE.Mesh(new THREE.SphereGeometry(s, 10, 8), m);
        puff.position.set(j * rand(2.4, 3.4) - n, rand(-0.6, 0.6), rand(-1.4, 1.4));
        puff.scale.y = 0.62;
        g.add(puff);
      }
      g.position.set(rand(-120, 120), rand(34, 60), rand(-120, 120));
      g.userData.speed = rand(0.4, 1.1);
      g.userData.mat = m;
      this.scene.add(g);
      this.clouds.push(g);
    }
  }

  // フェーズ計算: 0-0.42 昼 / 0.42-0.55 夕 / 0.55-0.92 夜 / 0.92-1 朝
  update(dt) {
    this.time = (this.time + dt) % DAY_LENGTH;
    const t = this.time / DAY_LENGTH;
    this.t = t;

    let top = new THREE.Color(), hor = new THREE.Color(), fog = new THREE.Color();
    let sunI, hemiI, night;
    const mix3 = (a, b, k) => { top.copy(COL[a + 'Top']).lerp(COL[b + 'Top'], k); hor.copy(COL[a + 'Hor']).lerp(COL[b + 'Hor'], k); };
    const fmix = (a, b, k) => fog.copy(COL['fog' + a]).lerp(COL['fog' + b], k);

    if (t < 0.42) { mix3('day', 'day', 0); fmix('Day', 'Day', 0); night = 0; }
    else if (t < 0.5) { const k = (t - 0.42) / 0.08; mix3('day', 'sunset', k); fmix('Day', 'Sunset', k); night = 0; }
    else if (t < 0.58) { const k = (t - 0.5) / 0.08; mix3('sunset', 'night', k); fmix('Sunset', 'Night', k); night = k; }
    else if (t < 0.9) { mix3('night', 'night', 0); fmix('Night', 'Night', 0); night = 1; }
    else if (t < 0.96) { const k = (t - 0.9) / 0.06; mix3('night', 'sunset', k); fmix('Night', 'Sunset', k); night = 1 - k; }
    else { const k = (t - 0.96) / 0.04; mix3('sunset', 'day', k); fmix('Sunset', 'Day', k); night = 0; }

    this.nightF = night;
    this.isNight = night > 0.6;
    this.uni.topColor.value.copy(top);
    this.uni.horColor.value.copy(hor);
    this.scene.fog.color.copy(fog);

    // 太陽の軌道(昼の間に東→西)
    const dayProg = clamp(t / 0.55, 0, 1);
    const sunA = lerp(0.12, Math.PI - 0.12, dayProg);
    const sx = Math.cos(sunA) * 120, sy = Math.sin(sunA) * 90 + 6, sz = -55;
    this.sun.position.set(sx, Math.max(sy, 4), sz);
    this.sunSprite.position.set(sx * 1.4, sy * 1.4, sz * 1.4);
    this.sunSprite.material.opacity = 1 - night;

    // 月の軌道(夜)
    const nightProg = clamp((t - 0.52) / 0.44, 0, 1);
    const moonA = lerp(0.15, Math.PI - 0.15, nightProg);
    this.moon.position.set(Math.cos(moonA) * 130, Math.sin(moonA) * 80 + 10, 60);
    this.moon.visible = night > 0.05;

    // 照明強度・色
    sunI = lerp(2.1, 0.25, night);
    hemiI = lerp(0.75, 0.28, night);
    this.sun.intensity = sunI;
    this.hemi.intensity = hemiI;
    this.sun.color.setHex(night > 0.5 ? 0xa8b4ff : 0xfff3d8);
    this.hemi.color.copy(hor);

    // 星のまたたき
    this.starMat.opacity = night * (0.75 + 0.25 * Math.sin(performance.now() * 0.002));

    // 雲の流れ
    for (const c of this.clouds) {
      c.position.x += c.userData.speed * dt;
      if (c.position.x > 130) c.position.x = -130;
      c.userData.mat.opacity = lerp(0.92, 0.25, night);
      c.userData.mat.color.setHex(night > 0.5 ? 0x8890c8 : 0xffffff);
    }
  }

  // 時刻表示用
  clockInfo() {
    const t = this.t;
    if (t < 0.42) return { icon: '☀️', label: 'ひる' };
    if (t < 0.55) return { icon: '🌇', label: 'ゆうがた' };
    if (t < 0.92) return { icon: '🌙', label: 'よる' };
    return { icon: '🌅', label: 'あさ' };
  }
}
