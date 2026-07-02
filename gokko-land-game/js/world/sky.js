// グラデーション空+雲+太陽(全シーン共通で使う)
import * as THREE from 'three';
import { rand } from '../core/utils.js';

export function createSky(scene, { top = 0x4aa8ff, bottom = 0xcfefff, sun = true, clouds = 10 } = {}) {
  const group = new THREE.Group();

  // グラデーションドーム
  const geo = new THREE.SphereGeometry(140, 24, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      cTop: { value: new THREE.Color(top) },
      cBottom: { value: new THREE.Color(bottom) },
    },
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      varying vec3 vPos;
      uniform vec3 cTop;
      uniform vec3 cBottom;
      void main() {
        float h = clamp(vPos.y / 90.0, 0.0, 1.0);
        gl_FragColor = vec4(mix(cBottom, cTop, pow(h, 0.8)), 1.0);
      }`,
  });
  const dome = new THREE.Mesh(geo, mat);
  group.add(dome);

  // 太陽(スプライト)
  if (sun) {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 8, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,230,1)');
    gr.addColorStop(0.35, 'rgba(255,235,150,0.9)');
    gr.addColorStop(1, 'rgba(255,220,120,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    sp.position.set(-45, 70, -90);
    sp.scale.setScalar(38);
    group.add(sp);
  }

  // ぷかぷか雲(球の集まり)
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, emissive: 0x8899aa, emissiveIntensity: 0.12 });
  const cloudList = [];
  for (let i = 0; i < clouds; i++) {
    const cl = new THREE.Group();
    const n = 3 + Math.floor(rand(3));
    for (let j = 0; j < n; j++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(rand(2, 3.6), 10, 8), cloudMat);
      s.position.set(j * 2.6 - n * 1.3 + rand(-0.6, 0.6), rand(-0.6, 0.6), rand(-1, 1));
      s.scale.y = 0.65;
      cl.add(s);
    }
    const ang = rand(Math.PI * 2);
    const r = rand(50, 100);
    cl.position.set(Math.cos(ang) * r, rand(24, 46), Math.sin(ang) * r);
    cl.userData.speed = rand(0.4, 1.2);
    group.add(cl);
    cloudList.push(cl);
  }

  scene.add(group);
  return {
    group,
    update(dt) {
      for (const cl of cloudList) {
        cl.position.x += cl.userData.speed * dt;
        if (cl.position.x > 110) cl.position.x = -110;
      }
    },
  };
}

// 標準ライティング一式
export function createLights(scene, { sunPos = [-18, 30, 14], shadowSize = 30, intensity = 2.4 } = {}) {
  const hemi = new THREE.HemisphereLight(0xcfefff, 0xffe0b0, 0.85);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2d8, intensity);
  sun.position.set(...sunPos);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -shadowSize;
  sun.shadow.camera.right = shadowSize;
  sun.shadow.camera.top = shadowSize;
  sun.shadow.camera.bottom = -shadowSize;
  sun.shadow.camera.far = 120;
  sun.shadow.bias = -0.0005;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xbfd8ff, 0.5);
  fill.position.set(14, 16, -12);
  scene.add(fill);
  return { hemi, sun, fill };
}
