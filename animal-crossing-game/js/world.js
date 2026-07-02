// ============================================================
// 島ワールド
//  地形（段丘・川・滝・砂浜）/ 海 / 空と昼夜 / 木 / 岩 / 花 /
//  建物 / 風船 / 雨 / ホタル / 地面アイテム / パーティクル
// ============================================================

import * as THREE from 'three';
import { applyCurve, CURVE_UNIFORM } from './curve.js';
import { FRUITS, FLOWERS, fruitById } from './items.js';
import { daySeed, seededRng, state } from './state.js';

// ---------------- 地形パラメータ ----------------
const MASK_RX = 56, MASK_RZ = 46, MASK_CZ = 2;
const TIER_H = 2.6;                       // 段丘の高さ
const RIVER_W = 3.4, RIVER_DEPTH = 1.4;   // 川幅・深さ
const BRIDGES = [{ z: 6, hw: 2.4 }, { z: 32, hw: 2.4 }];
const RAMPS = [[-24, -16], [-2, 6]];      // 坂道の x 範囲

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function smoothstep(a, b, v) {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

export function islandMask(x, z) {
  const sx = Math.abs(x) / MASK_RX;
  const sz = Math.abs(z - MASK_CZ) / MASK_RZ;
  return Math.pow(sx, 5) + Math.pow(sz, 5);
}

export function riverX(z) {
  return 18 + 7 * Math.sin((z + 42) * 0.05);
}
export function riverDist(x, z) {
  return Math.abs(x - riverX(z));
}

function inRamp(x) {
  return RAMPS.some(([a, b]) => x >= a && x <= b);
}

// 段丘ブレンド 0(下段)〜1(上段)
function tierT(x, z) {
  return inRamp(x) ? smoothstep(-9, -20, z) : smoothstep(-13, -15.5, z);
}

function onBridge(x, z) {
  for (const b of BRIDGES) {
    if (Math.abs(z - b.z) <= b.hw && riverDist(x, z) <= RIVER_W + 0.6) return b;
  }
  return null;
}

// 川を掘る前の地面高さ
function baseHeight(x, z) {
  let y = TIER_H * tierT(x, z);
  const m = islandMask(x, z);
  y = y * (1 - smoothstep(0.74, 1.0, m)) + -0.9 * smoothstep(0.74, 1.0, m);
  y += (-2.6 - -0.9) * smoothstep(1.0, 1.3, m);
  return y;
}

export function heightAt(x, z) {
  if (onBridge(x, z)) return 0.18;
  let y = baseHeight(x, z);
  const rd = riverDist(x, z);
  if (rd < RIVER_W && islandMask(x, z) < 1.05) {
    y -= RIVER_DEPTH * (0.5 + 0.5 * Math.cos((rd / RIVER_W) * Math.PI));
  }
  return y;
}

// 水面情報（釣り判定用）
export function waterAt(x, z) {
  const m = islandMask(x, z);
  if (m > 1.0) return { type: 'sea', surfaceY: -1.02 };
  const rd = riverDist(x, z);
  if (rd < RIVER_W - 0.6) {
    return { type: 'river', surfaceY: baseHeight(x, z) - 0.55 };
  }
  return null;
}

export function createWorld(scene) {
  const world = {
    trees: [], rocks: [], flowers: null, digSpots: [], groundItems: [],
    balloons: [], buildings: [], colliders: [],
    weather: 'sunny', time: 0,
    heightAt, waterAt, riverX, islandMask,
  };
  const rng = seededRng(daySeed());
  world.weather = rng() < 0.25 ? 'rain' : 'sunny';

  const timeU = { value: 0 };

  // ============ ならではの歩行判定 ============
  world.walkable = function (x, z) {
    if (islandMask(x, z) > 0.97) return false;
    if (!onBridge(x, z)) {
      if (riverDist(x, z) < RIVER_W - 0.5 && islandMask(x, z) < 1.0) return false;
      const t = tierT(x, z);
      if (!inRamp(x) && t > 0.03 && t < 0.97) return false;
    }
    for (const c of world.colliders) {
      const dx = x - c.x, dz = z - c.z;
      if (c.hw !== undefined) {
        if (Math.abs(dx) < c.hw && Math.abs(dz) < c.hd) return false;
      } else if (dx * dx + dz * dz < c.r * c.r) return false;
    }
    return true;
  };

  // ============ 地面テクスチャを焼く ============
  const TEX = 1024;
  const WX0 = -70, WX1 = 70, WZ0 = -60, WZ1 = 62;
  function bakeGround() {
    const cv = document.createElement('canvas');
    cv.width = cv.height = TEX;
    const g = cv.getContext('2d');
    const img = g.createImageData(TEX, TEX);
    const d = img.data;
    const hash = (a, b) => {
      let h = (a * 374761393 + b * 668265263) | 0;
      h = ((h ^ (h >> 13)) * 1274126177) | 0;
      return ((h ^ (h >> 16)) >>> 0) / 4294967296;
    };
    for (let py = 0; py < TEX; py++) {
      const z = WZ0 + ((WZ1 - WZ0) * py) / TEX;
      for (let px = 0; px < TEX; px++) {
        const x = WX0 + ((WX1 - WX0) * px) / TEX;
        const m = islandMask(x, z);
        const rd = riverDist(x, z);
        const t = tierT(x, z);
        let r, gg, b;
        const beach = smoothstep(0.76, 0.95, m);
        if (m > 1.02) {
          // 海底の砂
          const deep = smoothstep(1.02, 1.35, m);
          r = 216 - deep * 90; gg = 200 - deep * 70; b = 150 - deep * 20;
        } else if (rd < RIVER_W - 0.3 && m < 1.0) {
          // 川底
          r = 196; gg = 176; b = 128;
        } else if (beach > 0.55) {
          // 砂浜（点々もよう）
          const sp = hash(px, py) > 0.92 ? -18 : 0;
          r = 238 + sp; gg = 219 + sp; b = 160 + sp;
        } else if (!inRamp(x) && t > 0.03 && t < 0.97) {
          // 崖の岩肌（しましま）
          const strata = Math.sin(z * 6.0) > 0.3 ? -14 : 0;
          r = 158 + strata; gg = 122 + strata; b = 82 + strata;
        } else {
          // 草地（あつ森風さんかくパターン）
          const cell = 7;
          const cx = Math.floor(px / cell), cy = Math.floor(py / cell);
          const u = (px % cell) / cell, v = (py % cell) / cell;
          const up = (cx + cy) % 2 === 0;
          const inside = up ? v > Math.abs(u - 0.5) * 2 : 1 - v > Math.abs(u - 0.5) * 2;
          const jitter = (hash(cx, cy) - 0.5) * 14;
          let base = inside ? [104, 190, 76] : [96, 178, 68];
          if (t > 0.5) base = [92, 176, 88]; // 上の段はちょっと青みどり
          // 広場は石だたみ
          const pdx = x + 6, pdz = z - 8;
          const pd = Math.hypot(pdx, pdz);
          if (pd < 8.5) {
            const tile = ((Math.floor(x * 1.4) + Math.floor(z * 1.4)) % 2 === 0) ? 6 : 0;
            const edge = pd > 7.8 ? -20 : 0;
            base = [212 + tile + edge, 190 + tile + edge, 150 + edge];
          }
          // 川辺にちょっと濃い草
          if (rd < RIVER_W + 1.2) base = [base[0] - 12, base[1] - 10, base[2] - 6];
          r = base[0] + jitter; gg = base[1] + jitter; b = base[2] + jitter * 0.6;
        }
        const i = (py * TEX + px) * 4;
        d[i] = clamp(r, 0, 255); d[i + 1] = clamp(gg, 0, 255); d[i + 2] = clamp(b, 0, 255); d[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }

  // ============ 地面メッシュ ============
  {
    const seg = 150;
    const geo = new THREE.PlaneGeometry(WX1 - WX0, WZ1 - WZ0, seg, seg);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) + (WX0 + WX1) / 2;
      const z = pos.getZ(i) + (WZ0 + WZ1) / 2;
      pos.setX(i, x); pos.setZ(i, z);
      pos.setY(i, heightAt(x, z));
    }
    geo.computeVertexNormals();
    const mat = applyCurve(new THREE.MeshLambertMaterial({ map: bakeGround() }));
    const ground = new THREE.Mesh(geo, mat);
    ground.receiveShadow = true;
    scene.add(ground);
  }

  // ============ 海 ============
  {
    const geo = new THREE.PlaneGeometry(460, 460, 70, 70);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: timeU,
        uWorldCurve: CURVE_UNIFORM,
        uDeep: { value: new THREE.Color(0x1d6fa8) },
        uShallow: { value: new THREE.Color(0x5fc8dd) },
        uNight: { value: 0 },
      },
      vertexShader: `
        uniform float uTime; uniform float uWorldCurve;
        varying vec3 vWorld;
        void main() {
          vec3 p = position;
          p.y += sin(p.x * 0.25 + uTime * 1.4) * 0.06 + cos(p.z * 0.22 + uTime * 1.1) * 0.06;
          vec4 w = modelMatrix * vec4(p, 1.0);
          vWorld = w.xyz;
          vec4 mv = viewMatrix * w;
          mv.y -= uWorldCurve * mv.z * mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform float uTime; uniform float uNight;
        uniform vec3 uDeep; uniform vec3 uShallow;
        varying vec3 vWorld;
        void main() {
          float sx = abs(vWorld.x) / ${MASK_RX.toFixed(1)};
          float sz = abs(vWorld.z - ${MASK_CZ.toFixed(1)}) / ${MASK_RZ.toFixed(1)};
          float m = pow(sx, 5.0) + pow(sz, 5.0);
          float sh = 1.0 - smoothstep(1.0, 1.6, m);
          vec3 col = mix(uDeep, uShallow, sh);
          // きらめき
          float sp = sin(vWorld.x * 2.1 + uTime * 2.0) * sin(vWorld.z * 1.7 - uTime * 1.6);
          col += vec3(0.06) * smoothstep(0.86, 1.0, sp);
          // 岸辺の泡
          float foam = smoothstep(0.985, 1.005, m) * (1.0 - smoothstep(1.1, 1.22, m));
          float band = sin(m * 90.0 - uTime * 2.2);
          col = mix(col, vec3(0.97), foam * smoothstep(0.2, 0.9, band));
          col *= (1.0 - uNight * 0.72);
          gl_FragColor = vec4(col, 0.88);
        }`,
    });
    const sea = new THREE.Mesh(geo, mat);
    sea.position.y = -1.02;
    sea.renderOrder = 2;
    scene.add(sea);
    world._seaMat = mat;
  }

  // ============ 川と滝 ============
  {
    const pts = [];
    const uvs = [];
    const idx = [];
    let n = 0;
    for (let z = -44; z <= 52; z += 1) {
      const cx = riverX(z);
      const y = baseHeight(cx, z) - 0.55;
      const hw = RIVER_W - 0.4;
      pts.push(cx - hw, y, z, cx + hw, y, z);
      uvs.push(0, z * 0.14, 1, z * 0.14);
      if (z > -44) {
        const a = n * 2;
        idx.push(a - 2, a, a - 1, a - 1, a, a + 1);
      }
      n++;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: { uTime: timeU, uWorldCurve: CURVE_UNIFORM, uNight: { value: 0 } },
      vertexShader: `
        uniform float uWorldCurve;
        varying vec2 vUv; varying float vY;
        void main() {
          vUv = uv; vY = position.y;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          mv.y -= uWorldCurve * mv.z * mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform float uTime; uniform float uNight;
        varying vec2 vUv; varying float vY;
        void main() {
          vec3 col = mix(vec3(0.32, 0.68, 0.82), vec3(0.45, 0.8, 0.9), sin(vUv.y * 40.0 - uTime * 2.6) * 0.5 + 0.5);
          // 岸の泡
          float edge = smoothstep(0.42, 0.5, abs(vUv.x - 0.5));
          float dots = step(0.72, fract(vUv.y * 6.0 - uTime * 0.7 + sin(vUv.x * 21.0)));
          col = mix(col, vec3(0.97), edge * dots);
          // 滝（高いところ）は白く
          float falls = smoothstep(0.6, 1.8, vY);
          float streak = step(0.5, fract(vUv.y * 10.0 - uTime * 3.5 + vUv.x * 2.0));
          col = mix(col, vec3(0.94, 0.98, 1.0), falls * (0.5 + 0.5 * streak));
          col *= (1.0 - uNight * 0.65);
          gl_FragColor = vec4(col, 0.82);
        }`,
    });
    const river = new THREE.Mesh(geo, mat);
    river.renderOrder = 2;
    scene.add(river);
    world._riverMat = mat;
  }

  // ============ 橋 ============
  for (const b of BRIDGES) {
    const cx = riverX(b.z);
    const g = new THREE.Group();
    const wood = applyCurve(new THREE.MeshLambertMaterial({ color: 0x9a6a3c }));
    const woodDark = applyCurve(new THREE.MeshLambertMaterial({ color: 0x7c5330 }));
    const deck = new THREE.Mesh(new THREE.BoxGeometry(RIVER_W * 2 + 2.4, 0.3, b.hw * 2), wood);
    deck.position.y = 0.1;
    deck.castShadow = true; deck.receiveShadow = true;
    g.add(deck);
    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(RIVER_W * 2 + 2.4, 0.16, 0.14), woodDark);
      rail.position.set(0, 0.82, side * (b.hw - 0.15));
      g.add(rail);
      for (let i = -2; i <= 2; i++) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.85, 0.16), woodDark);
        post.position.set(i * (RIVER_W / 1.6), 0.45, side * (b.hw - 0.15));
        g.add(post);
      }
    }
    g.position.set(cx, 0.05, b.z);
    scene.add(g);
  }

  // ============ 空・太陽・月・星・雲 ============
  const skyU = {
    uTop: { value: new THREE.Color(0x63b4f0) },
    uHor: { value: new THREE.Color(0xcfeafc) },
  };
  {
    const geo = new THREE.SphereGeometry(320, 24, 14);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: skyU,
      vertexShader: `
        varying float vH;
        void main() {
          vH = normalize(position).y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 uTop; uniform vec3 uHor;
        varying float vH;
        void main() {
          float t = smoothstep(-0.05, 0.45, vH);
          gl_FragColor = vec4(mix(uHor, uTop, t), 1.0);
        }`,
    });
    const sky = new THREE.Mesh(geo, mat);
    sky.renderOrder = -10;
    scene.add(sky);
    world._sky = sky;
  }

  function glowSprite(inner, outer, size = 128) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const g = cv.getContext('2d');
    const gr = g.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
    gr.addColorStop(0, inner);
    gr.addColorStop(0.55, outer);
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  const sun = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowSprite('rgba(255,250,220,1)', 'rgba(255,215,110,0.75)'),
    transparent: true, depthWrite: false,
  }));
  sun.scale.setScalar(46);
  scene.add(sun);
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowSprite('rgba(245,245,235,1)', 'rgba(200,210,240,0.5)'),
    transparent: true, depthWrite: false,
  }));
  moon.scale.setScalar(26);
  scene.add(moon);

  let stars;
  {
    const N = 350;
    const p = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const a = Math.random() * Math.PI * 2;
      const e = Math.random() * Math.PI * 0.46 + 0.06;
      const r = 300;
      p[i * 3] = Math.cos(a) * Math.cos(e) * r;
      p[i * 3 + 1] = Math.sin(e) * r;
      p[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const mat = new THREE.PointsMaterial({ color: 0xfffbe8, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0 });
    stars = new THREE.Points(geo, mat);
    scene.add(stars);
  }

  const clouds = [];
  {
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 128;
    const g = cv.getContext('2d');
    g.fillStyle = 'rgba(255,255,255,0.95)';
    for (const [bx, by, br] of [[70, 80, 38], [120, 62, 46], [175, 80, 38], [110, 92, 40]]) {
      g.beginPath(); g.arc(bx, by, br, 0, Math.PI * 2); g.fill();
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    for (let i = 0; i < 9; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.85, depthWrite: false }));
      const s = 18 + Math.random() * 22;
      sp.scale.set(s, s * 0.5, 1);
      sp.position.set((Math.random() - 0.5) * 360, 42 + Math.random() * 30, (Math.random() - 0.5) * 320 - 40);
      sp.userData.speed = 0.6 + Math.random() * 0.9;
      scene.add(sp);
      clouds.push(sp);
    }
  }

  // ============ ライティング ============
  const hemi = new THREE.HemisphereLight(0xbfe3ff, 0x7aa05a, 0.9);
  scene.add(hemi);
  const sunLight = new THREE.DirectionalLight(0xfff2d8, 1.6);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.left = -30;
  sunLight.shadow.camera.right = 30;
  sunLight.shadow.camera.top = 30;
  sunLight.shadow.camera.bottom = -30;
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 120;
  sunLight.shadow.bias = -0.0015;
  scene.add(sunLight);
  scene.add(sunLight.target);
  scene.fog = new THREE.Fog(0xcfeafc, 70, 260);

  // 時間帯キーフレーム [hour, 空上, 地平, 太陽色, 太陽強さ, 空環境, 地環境, 環境強さ]
  const ENV = [
    [0.0, 0x0e1b3d, 0x1d2e57, 0x9fb5ec, 0.34, 0x32436f, 0x28324e, 0.66],
    [4.5, 0x16264f, 0x2e4070, 0x9fb5ec, 0.34, 0x32436f, 0x28324e, 0.66],
    [6.0, 0x5a7ec2, 0xf5b98a, 0xffd9a8, 0.9, 0x9db8e0, 0x6d8a5a, 0.75],
    [8.0, 0x63b0ec, 0xcfe8f8, 0xfff2d8, 1.5, 0xbfe3ff, 0x7aa05a, 0.9],
    [12.0, 0x5eb2f2, 0xd6eeff, 0xfff6e0, 1.65, 0xcfeaff, 0x84aa62, 0.95],
    [16.0, 0x5aa4e8, 0xcfe4f5, 0xffedc8, 1.4, 0xbfdcf5, 0x7aa05a, 0.9],
    [18.0, 0x4a6db8, 0xf5a05e, 0xffc888, 0.95, 0xd8b090, 0x6d7a52, 0.75],
    [19.3, 0x24336b, 0xd06a4a, 0xe89a70, 0.5, 0x5a548a, 0x3c4050, 0.66],
    [20.5, 0x12204a, 0x263566, 0x9fb5ec, 0.36, 0x32436f, 0x28324e, 0.66],
    [24.0, 0x0e1b3d, 0x1d2e57, 0x9fb5ec, 0.34, 0x32436f, 0x28324e, 0.66],
  ];
  const cA = new THREE.Color(), cB = new THREE.Color();
  function lerpEnvColor(a, b, t, out) {
    cA.setHex(a); cB.setHex(b);
    out.copy(cA).lerp(cB, t);
  }
  world.updateEnv = function (hour) {
    let i = 0;
    while (i < ENV.length - 1 && ENV[i + 1][0] < hour) i++;
    const A = ENV[i], B = ENV[Math.min(i + 1, ENV.length - 1)];
    const t = clamp((hour - A[0]) / Math.max(0.001, B[0] - A[0]), 0, 1);
    lerpEnvColor(A[1], B[1], t, skyU.uTop.value);
    lerpEnvColor(A[2], B[2], t, skyU.uHor.value);
    lerpEnvColor(A[3], B[3], t, sunLight.color);
    sunLight.intensity = A[4] + (B[4] - A[4]) * t;
    lerpEnvColor(A[5], B[5], t, hemi.color);
    lerpEnvColor(A[6], B[6], t, hemi.groundColor);
    hemi.intensity = A[7] + (B[7] - A[7]) * t;
    scene.fog.color.copy(skyU.uHor.value);

    const night = hour < 5 || hour >= 19.5 ? 1 : hour < 6.5 ? (6.5 - hour) / 1.5 : hour >= 18 ? (hour - 18) / 1.5 : 0;
    const nn = clamp(night, 0, 1);
    stars.material.opacity = nn * 0.95;
    world._seaMat.uniforms.uNight.value = nn;
    world._riverMat.uniforms.uNight.value = nn;
    world._night = nn;

    // 太陽と月の位置
    const sa = ((hour - 6) / 12) * Math.PI;
    sun.position.set(-Math.cos(sa) * 200, Math.sin(sa) * 150 - 15, -180);
    sun.material.opacity = clamp(Math.sin(sa) + 0.25, 0, 1);
    const ma = ((hour - 18 + 24) % 24 / 12) * Math.PI;
    moon.position.set(-Math.cos(ma) * 200, Math.sin(ma) * 150 - 15, -170);
    moon.material.opacity = clamp(Math.sin(ma), 0, 1) * 0.95;
  };

  // ============ 木 ============
  const treeMats = {
    trunk: applyCurve(new THREE.MeshLambertMaterial({ color: 0x8a5a30 })),
    leaf: applyCurve(new THREE.MeshLambertMaterial({ color: 0x3fa14e })),
    leafDark: applyCurve(new THREE.MeshLambertMaterial({ color: 0x2f8a42 })),
    cedar: applyCurve(new THREE.MeshLambertMaterial({ color: 0x2a7a4a })),
    frond: applyCurve(new THREE.MeshLambertMaterial({ color: 0x4fae56, side: THREE.DoubleSide })),
  };
  const fruitMatCache = {};
  function fruitMat(color) {
    if (!fruitMatCache[color]) fruitMatCache[color] = applyCurve(new THREE.MeshLambertMaterial({ color }));
    return fruitMatCache[color];
  }

  function makeTree(x, z, type) {
    const g = new THREE.Group();
    const y = heightAt(x, z);
    g.position.set(x, y, z);
    const tree = { x, z, type, group: g, fruits: [], shakeT: 0, fruitTimer: 0, canopy: null };

    if (type === 'cedar') {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 1.4, 7), treeMats.trunk);
      trunk.position.y = 0.7; trunk.castShadow = true;
      g.add(trunk);
      const canopy = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(1.5 - i * 0.38, 1.5, 8), treeMats.cedar);
        cone.position.y = 1.7 + i * 0.95;
        cone.castShadow = true;
        canopy.add(cone);
      }
      g.add(canopy);
      tree.canopy = canopy;
    } else if (type === 'palm') {
      const trunkG = new THREE.Group();
      for (let i = 0; i < 4; i++) {
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.18 - i * 0.015, 0.22 - i * 0.015, 0.9, 7), treeMats.trunk);
        seg.position.set(i * 0.16, 0.4 + i * 0.85, 0);
        seg.rotation.z = -0.12 * i;
        seg.castShadow = true;
        trunkG.add(seg);
      }
      g.add(trunkG);
      const canopy = new THREE.Group();
      canopy.position.set(0.55, 3.6, 0);
      for (let i = 0; i < 6; i++) {
        const frond = new THREE.Mesh(new THREE.SphereGeometry(1.35, 6, 4, 0, Math.PI * 0.5), treeMats.frond);
        frond.scale.set(1.25, 0.22, 0.4);
        frond.rotation.y = (i / 6) * Math.PI * 2;
        frond.rotation.z = -0.25;
        frond.castShadow = true;
        canopy.add(frond);
      }
      g.add(canopy);
      tree.canopy = canopy;
      tree.fruitType = 'coconut';
    } else {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.38, 1.7, 7), treeMats.trunk);
      trunk.position.y = 0.85; trunk.castShadow = true;
      g.add(trunk);
      const canopy = new THREE.Group();
      canopy.position.y = 2.6;
      const blobs = [[0, 0.3, 0, 1.5], [-0.9, -0.15, 0.4, 1.0], [0.85, -0.1, -0.35, 1.05], [0.1, -0.2, 0.85, 0.95]];
      blobs.forEach(([bx, by, bz, r], bi) => {
        const s = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), bi % 2 ? treeMats.leafDark : treeMats.leaf);
        s.position.set(bx, by, bz);
        s.castShadow = true;
        canopy.add(s);
      });
      g.add(canopy);
      tree.canopy = canopy;
      tree.fruitType = type;
    }
    scene.add(g);
    world.colliders.push({ x, z, r: 0.85 });
    world.trees.push(tree);
    return tree;
  }

  world.addFruitsToTree = function (tree) {
    if (!tree.fruitType || tree.fruits.length) return;
    const def = fruitById(tree.fruitType === 'coconut' ? 'coconut' : tree.fruitType);
    const spots = tree.type === 'palm'
      ? [[0.9, 3.2, 0.3], [0.2, 3.15, -0.5], [1.0, 3.1, -0.3]]
      : [[-0.8, 1.7, 0.6], [0.75, 1.75, -0.5], [0.1, 1.6, 0.9]];
    for (const [fx, fy, fz] of spots) {
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), fruitMat(def.color));
      f.position.set(fx, fy, fz);
      tree.group.add(f);
      tree.fruits.push(f);
    }
  };

  // 木の配置
  {
    const taken = [];
    const treeOK = (x, z, minD) => {
      if (islandMask(x, z) > 0.68) return false;
      if (riverDist(x, z) < RIVER_W + 1.6) return false;
      if (Math.hypot(x + 6, z - 8) < 11) return false; // 広場
      const t = tierT(x, z);
      if (t > 0.03 && t < 0.97) return false;
      for (const [tx, tz] of taken) if (Math.hypot(x - tx, z - tz) < minD) return false;
      return true;
    };
    let placed = 0, tries = 0;
    while (placed < 26 && tries++ < 500) {
      const x = (rng() * 2 - 1) * 48;
      const z = (rng() * 2 - 1) * 40 + 2;
      if (!treeOK(x, z, 5)) continue;
      let type;
      if (z < -14) type = 'cedar';
      else type = x < -18 ? 'apple' : x < 8 ? 'orange' : 'peach';
      const tree = makeTree(x, z, type);
      world.addFruitsToTree(tree);
      taken.push([x, z]);
      placed++;
    }
    // ナシは川の東エリアに数本
    let pears = 0; tries = 0;
    while (pears < 4 && tries++ < 200) {
      const x = 26 + rng() * 22;
      const z = 10 + rng() * 28;
      if (!treeOK(x, z, 5)) continue;
      const tree = makeTree(x, z, 'pear');
      world.addFruitsToTree(tree);
      taken.push([x, z]);
      pears++;
    }
    // ヤシは南の砂浜
    let palms = 0; tries = 0;
    while (palms < 6 && tries++ < 300) {
      const x = (rng() * 2 - 1) * 46;
      const z = 38 + rng() * 8;
      const m = islandMask(x, z);
      if (m < 0.78 || m > 0.94) continue;
      if (riverDist(x, z) < RIVER_W + 2) continue;
      let ok = true;
      for (const [tx, tz] of taken) if (Math.hypot(x - tx, z - tz) < 6) ok = false;
      if (!ok) continue;
      const tree = makeTree(x, z, 'palm');
      world.addFruitsToTree(tree);
      taken.push([x, z]);
      palms++;
    }
  }

  // ============ 岩 ============
  {
    const rockMat = applyCurve(new THREE.MeshLambertMaterial({ color: 0x9aa0a8, flatShading: true }));
    const spots = [];
    let tries = 0;
    while (spots.length < 6 && tries++ < 300) {
      const x = (rng() * 2 - 1) * 44;
      const z = (rng() * 2 - 1) * 36 + 2;
      if (islandMask(x, z) > 0.62 || riverDist(x, z) < RIVER_W + 2) continue;
      const t = tierT(x, z);
      if (t > 0.03 && t < 0.97) continue;
      if (Math.hypot(x + 6, z - 8) < 11) continue;
      if (spots.some(([sx, sz]) => Math.hypot(x - sx, z - sz) < 12)) continue;
      let nearTree = false;
      for (const tr of world.trees) if (Math.hypot(x - tr.x, z - tr.z) < 3) nearTree = true;
      if (nearTree) continue;
      spots.push([x, z]);
    }
    const moneyIdx = daySeed() % Math.max(1, spots.length);
    spots.forEach(([x, z], i) => {
      const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.9, 0), rockMat);
      mesh.position.set(x, heightAt(x, z) + 0.55, z);
      mesh.scale.set(1.15, 0.8, 1);
      mesh.rotation.y = rng() * Math.PI;
      mesh.castShadow = true;
      scene.add(mesh);
      world.colliders.push({ x, z, r: 1.25 });
      world.rocks.push({ x, z, mesh, isMoney: i === moneyIdx, hitCount: 0, bounceT: 0 });
    });
  }

  // ============ 花（インスタンス描画） ============
  {
    const MAX = 240;
    const stemGeo = new THREE.CylinderGeometry(0.03, 0.045, 0.42, 5);
    stemGeo.translate(0, 0.21, 0);
    const headGeo = new THREE.IcosahedronGeometry(0.16, 0);
    headGeo.translate(0, 0.48, 0);
    const stemMat = applyCurve(new THREE.MeshLambertMaterial({ color: 0x3f9142 }));
    const headMat = applyCurve(new THREE.MeshLambertMaterial({ color: 0xffffff }));
    const stems = new THREE.InstancedMesh(stemGeo, stemMat, MAX);
    const heads = new THREE.InstancedMesh(headGeo, headMat, MAX);
    stems.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    heads.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(stems, heads);

    const list = []; // {x,z,def,alive}
    const dummy = new THREE.Object3D();
    const col = new THREE.Color();

    function writeInstance(i) {
      const f = list[i];
      if (f && f.alive) {
        dummy.position.set(f.x, heightAt(f.x, f.z), f.z);
        dummy.rotation.y = f.rot;
        dummy.scale.setScalar(1);
      } else {
        dummy.position.set(0, -50, 0);
        dummy.scale.setScalar(0.001);
      }
      dummy.updateMatrix();
      stems.setMatrixAt(i, dummy.matrix);
      heads.setMatrixAt(i, dummy.matrix);
      if (f) {
        col.setHex(f.def.color);
        heads.setColorAt(i, col);
      }
      stems.instanceMatrix.needsUpdate = true;
      heads.instanceMatrix.needsUpdate = true;
      if (heads.instanceColor) heads.instanceColor.needsUpdate = true;
    }

    world.flowers = {
      list,
      add(x, z, def) {
        if (list.length >= MAX) return null;
        const f = { x, z, def, alive: true, rot: Math.random() * Math.PI * 2 };
        list.push(f);
        writeInstance(list.length - 1);
        return f;
      },
      pick(f) {
        f.alive = false;
        writeInstance(list.indexOf(f));
      },
      nearest(x, z, r) {
        let best = null, bd = r;
        for (const f of list) {
          if (!f.alive) continue;
          const d = Math.hypot(f.x - x, f.z - z);
          if (d < bd) { bd = d; best = f; }
        }
        return best;
      },
    };

    // 初期配置：花のかたまり
    let clusters = 0, tries = 0;
    while (clusters < 9 && tries++ < 300) {
      const cx = (rng() * 2 - 1) * 42;
      const cz = (rng() * 2 - 1) * 34 + 4;
      if (islandMask(cx, cz) > 0.6 || riverDist(cx, cz) < RIVER_W + 2.5) continue;
      const t = tierT(cx, cz);
      if (t > 0.03 && t < 0.97) continue;
      if (Math.hypot(cx + 6, cz - 8) < 10) continue;
      const def = FLOWERS[Math.floor(rng() * FLOWERS.length)];
      const n = 5 + Math.floor(rng() * 4);
      for (let i = 0; i < n; i++) {
        const x = cx + (rng() * 2 - 1) * 2.4;
        const z = cz + (rng() * 2 - 1) * 2.4;
        if (!world.walkable(x, z)) continue;
        world.flowers.add(x, z, rng() < 0.8 ? def : FLOWERS[Math.floor(rng() * FLOWERS.length)]);
      }
      clusters++;
    }
  }

  // ============ 建物 ============
  function makeBuilding(opt) {
    const g = new THREE.Group();
    const wall = applyCurve(new THREE.MeshLambertMaterial({ color: opt.wall }));
    const roofM = applyCurve(new THREE.MeshLambertMaterial({ color: opt.roof }));
    const doorM = applyCurve(new THREE.MeshLambertMaterial({ color: 0x6b4a2a }));
    const w = opt.w, hgt = opt.h, dep = opt.d;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, hgt, dep), wall);
    body.position.y = hgt / 2;
    body.castShadow = true; body.receiveShadow = true;
    g.add(body);
    // 屋根（前後方向の切妻）
    const roofGeo = new THREE.CylinderGeometry(w * 0.62, w * 0.62, dep + 0.7, 3, 1);
    roofGeo.rotateX(Math.PI / 2);
    roofGeo.rotateZ(Math.PI);
    const roof = new THREE.Mesh(roofGeo, roofM);
    roof.scale.y = 0.62;
    roof.position.y = hgt + w * 0.19;
    roof.castShadow = true;
    g.add(roof);
    // ドア
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.8, 0.12), doorM);
    door.position.set(0, 0.9, dep / 2 + 0.06);
    g.add(door);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), applyCurve(new THREE.MeshLambertMaterial({ color: 0xf2c14e })));
    knob.position.set(0.35, 0.95, dep / 2 + 0.14);
    g.add(knob);
    // まど
    const winM = applyCurve(new THREE.MeshLambertMaterial({ color: 0xbfe8f5 }));
    for (const sx of [-w / 4 - 0.35, w / 4 + 0.35]) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.1), winM);
      win.position.set(sx, hgt * 0.55, dep / 2 + 0.05);
      g.add(win);
    }
    // かんばん
    if (opt.sign) {
      const cv = document.createElement('canvas');
      cv.width = 256; cv.height = 96;
      const c2 = cv.getContext('2d');
      c2.fillStyle = '#7a5a3a';
      c2.beginPath();
      if (c2.roundRect) c2.roundRect(0, 0, 256, 96, 22);
      else c2.rect(0, 0, 256, 96);
      c2.fill();
      c2.fillStyle = '#fff3d0';
      c2.font = 'bold 46px "Hiragino Maru Gothic ProN", sans-serif';
      c2.textAlign = 'center'; c2.textBaseline = 'middle';
      c2.fillText(opt.sign, 128, 52);
      const tex = new THREE.CanvasTexture(cv);
      tex.colorSpace = THREE.SRGBColorSpace;
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
      sp.scale.set(3.4, 1.28, 1);
      sp.position.set(0, hgt + w * 0.42 + 0.7, 0);
      g.add(sp);
    }
    const y = heightAt(opt.x, opt.z);
    g.position.set(opt.x, y, opt.z);
    g.rotation.y = opt.rotY || 0;
    scene.add(g);
    world.colliders.push({ x: opt.x, z: opt.z, hw: w / 2 + 0.4, hd: dep / 2 + 0.4 });
    world.buildings.push({
      kind: opt.kind, label: opt.label,
      x: opt.x, z: opt.z + dep / 2 + 1.3, // ドア前の対話ポイント
    });
    return g;
  }

  makeBuilding({ kind: 'shop', label: 'おみせに はいる', sign: 'おみせ', x: -14, z: -2, w: 6, h: 3.2, d: 5, wall: 0xf2e2b8, roof: 0x4d9de8 });
  makeBuilding({ kind: 'museum', label: 'はくぶつかんに はいる', sign: 'はくぶつかん', x: 4, z: -3, w: 7.5, h: 3.6, d: 5.5, wall: 0xd8cdb4, roof: 0x8a6ec2 });
  makeBuilding({ kind: 'home', label: 'ひとやすみする', sign: null, x: -6, z: 22, w: 4.5, h: 2.8, d: 4, wall: 0xf5d9a8, roof: 0xe8554d });
  makeBuilding({ kind: 'house', label: null, x: -34, z: 12, w: 4, h: 2.6, d: 3.8, wall: 0xcfe8c0, roof: 0xf2b53a });
  makeBuilding({ kind: 'house', label: null, x: 36, z: 24, w: 4, h: 2.6, d: 3.8, wall: 0xf5cfc0, roof: 0x6fbf44 });
  makeBuilding({ kind: 'house', label: null, x: -30, z: -26, w: 4, h: 2.6, d: 3.8, wall: 0xc0d8f5, roof: 0xf28ab5 });

  // ============ 掲示板 ============
  {
    const g = new THREE.Group();
    const post = applyCurve(new THREE.MeshLambertMaterial({ color: 0x8a6034 }));
    for (const sx of [-0.7, 0.7]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.5, 6), post);
      p.position.set(sx, 0.75, 0);
      g.add(p);
    }
    const board = new THREE.Mesh(new THREE.BoxGeometry(2, 1.1, 0.12), applyCurve(new THREE.MeshLambertMaterial({ color: 0xc9a56a })));
    board.position.y = 1.35;
    board.castShadow = true;
    g.add(board);
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.5), applyCurve(new THREE.MeshLambertMaterial({ color: 0xfffbe8 })));
    paper.position.set(-0.35, 1.35, 0.07);
    paper.rotation.z = 0.06;
    g.add(paper);
    const x = -9, z = 8;
    g.position.set(x, heightAt(x, z), z);
    scene.add(g);
    world.colliders.push({ x, z, r: 1.1 });
    world.buildings.push({ kind: 'board', label: 'けいじばんを みる', x, z: z + 1.4 });
  }

  // ============ 広場の旗 ============
  {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 4.4, 6), applyCurve(new THREE.MeshLambertMaterial({ color: 0xd8d8d8 })));
    pole.position.y = 2.2;
    g.add(pole);
    const flagGeo = new THREE.PlaneGeometry(1.6, 1.0, 8, 1);
    const flagMat = applyCurve(new THREE.MeshLambertMaterial({ color: 0x6fbf44, side: THREE.DoubleSide }));
    const flag = new THREE.Mesh(flagGeo, flagMat);
    flag.position.set(0.85, 3.8, 0);
    g.add(flag);
    world._flag = flag;
    const x = -2, z = 4;
    g.position.set(x, heightAt(x, z), z);
    scene.add(g);
    world.colliders.push({ x, z, r: 0.5 });
  }

  // ============ ほりあと（★マーク・毎日リセット） ============
  {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const g2 = cv.getContext('2d');
    g2.strokeStyle = 'rgba(120, 85, 40, 0.9)';
    g2.lineWidth = 5;
    g2.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI;
      g2.beginPath();
      g2.moveTo(32 - Math.cos(a) * 20, 32 - Math.sin(a) * 20);
      g2.lineTo(32 + Math.cos(a) * 20, 32 + Math.sin(a) * 20);
      g2.stroke();
    }
    const starTex = new THREE.CanvasTexture(cv);
    starTex.colorSpace = THREE.SRGBColorSpace;
    const starMat = applyCurve(new THREE.MeshBasicMaterial({ map: starTex, transparent: true, depthWrite: false }));
    let placedSpots = 0, tries = 0;
    while (placedSpots < 6 && tries++ < 400) {
      const x = (rng() * 2 - 1) * 44;
      const z = (rng() * 2 - 1) * 36 + 2;
      if (!world.walkable(x, z)) continue;
      if (islandMask(x, z) > 0.6) continue;
      if (Math.hypot(x + 6, z - 8) < 10) continue;
      if (world.digSpots.some((s) => Math.hypot(x - s.x, z - s.z) < 10)) continue;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.0), starMat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(x, heightAt(x, z) + 0.03, z);
      mesh.renderOrder = 1;
      const idx = placedSpots;
      const dug = state.daily.dugSpots.includes(idx);
      mesh.visible = !dug;
      scene.add(mesh);
      world.digSpots.push({ x, z, mesh, index: idx, dug });
      placedSpots++;
    }
  }

  // ============ 地面アイテム ============
  const itemBuilders = {
    fruit(def) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), fruitMat(def.color));
      return m;
    },
    bells() {
      const g = new THREE.Group();
      const bag = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), applyCurve(new THREE.MeshLambertMaterial({ color: 0xf2c14e })));
      bag.scale.y = 1.1;
      g.add(bag);
      const knot = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 0.16, 6), applyCurve(new THREE.MeshLambertMaterial({ color: 0xc99a2e })));
      knot.position.y = 0.36;
      g.add(knot);
      return g;
    },
    fossil() {
      const m = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.1, 6, 10), applyCurve(new THREE.MeshLambertMaterial({ color: 0xa08a6a })));
      m.rotation.x = -Math.PI / 2.4;
      return m;
    },
    present() {
      const g = new THREE.Group();
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.42, 0.5), applyCurve(new THREE.MeshLambertMaterial({ color: 0xef8fb0 })));
      g.add(box);
      const r1 = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.44, 0.12), applyCurve(new THREE.MeshLambertMaterial({ color: 0xfff3d0 })));
      const r2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.44, 0.54), r1.material);
      g.add(r1, r2);
      return g;
    },
    treasure() {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.36, 0.4), applyCurve(new THREE.MeshLambertMaterial({ color: 0xd8a838 })));
      return m;
    },
  };

  // def: { kind:'fruit'|'bells'|'fossil'|'present'|'treasure', payload }
  world.spawnGroundItem = function (def, x, z, hop = true) {
    const builder = itemBuilders[def.kind] || itemBuilders.treasure;
    const mesh = builder(def.payload || {});
    const y = heightAt(x, z);
    mesh.position.set(x, y + (hop ? 1.2 : 0.3), z);
    mesh.castShadow = true;
    scene.add(mesh);
    const item = { ...def, x, z, mesh, vy: hop ? 2.5 : 0, groundY: y + 0.3, bobT: Math.random() * 6 };
    world.groundItems.push(item);
    return item;
  };

  world.removeGroundItem = function (item) {
    const i = world.groundItems.indexOf(item);
    if (i >= 0) world.groundItems.splice(i, 1);
    scene.remove(item.mesh);
  };

  // ============ 風船プレゼント ============
  const balloonMats = [0xe8554d, 0xf2b53a, 0x4d9de8, 0xf28ab5].map((c) =>
    applyCurve(new THREE.MeshLambertMaterial({ color: c })));
  world.spawnBalloon = function () {
    const g = new THREE.Group();
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.75, 10, 8),
      balloonMats[Math.floor(Math.random() * balloonMats.length)]);
    ball.scale.y = 1.12;
    g.add(ball);
    const str = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.4, 4),
      applyCurve(new THREE.MeshLambertMaterial({ color: 0xffffff })));
    str.position.y = -1.4;
    g.add(str);
    const box = itemBuilders.present();
    box.position.y = -2.2;
    box.scale.setScalar(0.9);
    g.add(box);
    const dir = Math.random() < 0.5 ? 1 : -1;
    g.position.set(-dir * 75, 9 + Math.random() * 2.5, -10 + Math.random() * 40);
    scene.add(g);
    const b = { group: g, ball, dir, speed: 1.5 + Math.random() * 0.8, popped: false, fallV: 0 };
    world.balloons.push(b);
    return b;
  };
  world.removeBalloon = function (b) {
    const i = world.balloons.indexOf(b);
    if (i >= 0) world.balloons.splice(i, 1);
    scene.remove(b.group);
  };
  let balloonTimer = 40 + Math.random() * 60;

  // ============ キラキラ・パーティクル ============
  const particles = [];
  const partTex = glowSprite('rgba(255,255,255,1)', 'rgba(255,240,180,0.6)', 64);
  world.spawnSparkle = function (x, y, z, color = 0xffe9a8, count = 10, spread = 0.8) {
    for (let i = 0; i < count; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: partTex, color, transparent: true, depthWrite: false,
      }));
      sp.position.set(
        x + (Math.random() - 0.5) * spread,
        y + Math.random() * 0.4,
        z + (Math.random() - 0.5) * spread
      );
      sp.scale.setScalar(0.3 + Math.random() * 0.3);
      scene.add(sp);
      particles.push({
        sp,
        vx: (Math.random() - 0.5) * 1.6,
        vy: 1.6 + Math.random() * 2,
        vz: (Math.random() - 0.5) * 1.6,
        life: 0.7 + Math.random() * 0.5,
        t: 0,
      });
    }
  };

  // ============ 雨 ============
  let rain = null;
  if (world.weather === 'rain') {
    const N = 600;
    const p = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      p[i * 3] = (Math.random() - 0.5) * 70;
      p[i * 3 + 1] = Math.random() * 26;
      p[i * 3 + 2] = (Math.random() - 0.5) * 70;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const cv = document.createElement('canvas');
    cv.width = 8; cv.height = 32;
    const g2 = cv.getContext('2d');
    const grad = g2.createLinearGradient(0, 0, 0, 32);
    grad.addColorStop(0, 'rgba(200,225,255,0)');
    grad.addColorStop(1, 'rgba(200,225,255,0.9)');
    g2.fillStyle = grad;
    g2.fillRect(2, 0, 4, 32);
    const tex = new THREE.CanvasTexture(cv);
    const mat = new THREE.PointsMaterial({
      map: tex, size: 0.9, transparent: true, opacity: 0.55, depthWrite: false,
    });
    rain = new THREE.Points(geo, mat);
    scene.add(rain);
  }

  // ============ ホタル（夜・川辺） ============
  const fireflies = [];
  {
    const mat = new THREE.SpriteMaterial({
      map: glowSprite('rgba(230,255,150,1)', 'rgba(180,240,80,0.5)', 64),
      color: 0xd8ff8a, transparent: true, depthWrite: false,
    });
    for (let i = 0; i < 34; i++) {
      const z = 2 + Math.random() * 40;
      const x = riverX(z) + (Math.random() - 0.5) * 12;
      const sp = new THREE.Sprite(mat.clone());
      sp.scale.setScalar(0.35);
      sp.position.set(x, heightAt(x, z) + 0.8 + Math.random() * 1.2, z);
      sp.visible = false;
      scene.add(sp);
      fireflies.push({ sp, baseY: sp.position.y, phase: Math.random() * 10, x, z });
    }
  }

  // ============ 滝のしぶき ============
  const mist = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowSprite('rgba(255,255,255,0.9)', 'rgba(230,245,255,0.4)', 128),
    transparent: true, opacity: 0.55, depthWrite: false,
  }));
  {
    const mz = -11;
    mist.position.set(riverX(mz), 0.4, mz);
    mist.scale.set(5, 2.4, 1);
    scene.add(mist);
  }

  // ============ 毎フレーム更新 ============
  world.update = function (dt, hour, playerPos, spawnBalloonOK = true) {
    world.time += dt;
    timeU.value = world.time;

    // 影用ライトはプレイヤーに追従
    sunLight.position.set(playerPos.x + 18, 30, playerPos.z + 14);
    sunLight.target.position.set(playerPos.x, 0, playerPos.z);
    // 空・星・太陽なども追従（地平の丸みを演出）
    world._sky.position.set(playerPos.x, 0, playerPos.z);
    stars.position.set(playerPos.x, 0, playerPos.z);

    // 木のゆれ
    for (const tr of world.trees) {
      if (tr.shakeT > 0) {
        tr.shakeT -= dt;
        const s = Math.sin(world.time * 30) * 0.09 * Math.min(1, tr.shakeT * 2);
        tr.canopy.rotation.z = s;
        if (tr.shakeT <= 0) tr.canopy.rotation.z = 0;
      } else {
        // そよ風
        tr.canopy.rotation.z = Math.sin(world.time * 1.2 + tr.x) * 0.015;
      }
      // 実の復活（3分）
      if (tr.fruitType && tr.fruits.length === 0) {
        tr.fruitTimer += dt;
        if (tr.fruitTimer > 180) {
          tr.fruitTimer = 0;
          world.addFruitsToTree(tr);
        }
      }
    }

    // 岩のバウンス
    for (const r of world.rocks) {
      if (r.bounceT > 0) {
        r.bounceT -= dt * 4;
        const s = 1 + Math.sin(Math.max(0, r.bounceT) * Math.PI) * 0.12;
        r.mesh.scale.set(1.15 * s, 0.8 / s, 1 * s);
      }
    }

    // 地面アイテムのバウンド＆ふわふわ
    for (const it of world.groundItems) {
      it.bobT += dt;
      if (it.mesh.position.y > it.groundY || it.vy > 0) {
        it.vy -= 9 * dt;
        it.mesh.position.y += it.vy * dt;
        if (it.mesh.position.y <= it.groundY && it.vy < 0) {
          it.mesh.position.y = it.groundY;
          it.vy = Math.abs(it.vy) > 1.2 ? Math.abs(it.vy) * 0.4 : 0;
        }
      } else {
        it.mesh.position.y = it.groundY + Math.sin(it.bobT * 2.2) * 0.05;
      }
      it.mesh.rotation.y += dt * 0.8;
    }

    // 風船
    balloonTimer -= dt;
    if (balloonTimer <= 0 && spawnBalloonOK && world.balloons.length < 2) {
      world.spawnBalloon();
      balloonTimer = 120 + Math.random() * 120;
    }
    for (const b of [...world.balloons]) {
      if (!b.popped) {
        b.group.position.x += b.dir * b.speed * dt;
        b.group.position.y += Math.sin(world.time * 1.4 + b.group.position.x * 0.2) * dt * 0.5;
        if (Math.abs(b.group.position.x) > 80) world.removeBalloon(b);
      } else {
        b.fallV += 9 * dt;
        b.group.position.y -= b.fallV * dt;
        const gy = heightAt(b.group.position.x, b.group.position.z) + 0.3;
        if (b.group.position.y <= gy + 2.2) {
          const px = b.group.position.x, pz = b.group.position.z;
          world.removeBalloon(b);
          world.onBalloonLand && world.onBalloonLand(px, pz);
        }
      }
    }

    // パーティクル
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.t += dt;
      if (p.t >= p.life) {
        scene.remove(p.sp);
        particles.splice(i, 1);
        continue;
      }
      p.vy -= 3.2 * dt;
      p.sp.position.x += p.vx * dt;
      p.sp.position.y += p.vy * dt;
      p.sp.position.z += p.vz * dt;
      p.sp.material.opacity = 1 - p.t / p.life;
    }

    // 雨
    if (rain) {
      rain.position.set(playerPos.x, 0, playerPos.z);
      const p = rain.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        let y = p.getY(i) - dt * 20;
        if (y < -1) y = 24 + Math.random() * 3;
        p.setY(i, y);
      }
      p.needsUpdate = true;
    }

    // ホタル
    const fireflyOn = hour >= 19 || hour < 1;
    for (const f of fireflies) {
      f.sp.visible = fireflyOn;
      if (fireflyOn) {
        f.sp.position.y = f.baseY + Math.sin(world.time * 0.9 + f.phase) * 0.5;
        f.sp.position.x = f.x + Math.sin(world.time * 0.5 + f.phase * 2) * 1.2;
        f.sp.material.opacity = 0.5 + 0.5 * Math.sin(world.time * 2.4 + f.phase * 3);
      }
    }

    // 滝しぶき・旗
    mist.material.opacity = 0.4 + 0.18 * Math.sin(world.time * 5);
    if (world._flag) {
      const pos = world._flag.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const px = pos.getX(i);
        pos.setZ(i, Math.sin(px * 2.4 + world.time * 5) * 0.09 * (px + 0.8));
      }
      pos.needsUpdate = true;
    }
  };

  return world;
}

