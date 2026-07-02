// レンダラー・カメラ・ブルーム(綺麗担当)
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export function initRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 400);
  camera.position.set(0, 6, 12);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.55,   // strength
    0.65,   // radius
    0.82    // threshold
  );
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    // 縦画面では視野を広げて周囲が見えるように
    camera.fov = w < h ? 62 : 52;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 250));
  resize();

  return { renderer, scene, camera, composer, bloom };
}

// プレイヤー追従カメラ
export class FollowCamera {
  constructor(camera) {
    this.camera = camera;
    this.target = new THREE.Vector3();
    this.yaw = 0;            // プレイヤーの背後(お城が正面に見える向き)
    this.pitch = 0.42;
    this.dist = 9.5;
    this.lookAt = new THREE.Vector3();
    this.pos = new THREE.Vector3(0, 6, 12);
    this.shakeT = 0;
    this.mode = 'follow'; // follow | fixed
    this.fixedPos = new THREE.Vector3();
    this.fixedLook = new THREE.Vector3();
  }

  orbit(dx, dy) {
    this.yaw -= dx * 0.006;
    this.pitch = Math.min(1.1, Math.max(0.12, this.pitch + dy * 0.004));
  }

  zoom(f) {
    this.dist = Math.min(16, Math.max(4.5, this.dist * f));
  }

  shake(t = 0.3) { this.shakeT = t; }

  update(dt, targetPos) {
    if (this.mode === 'fixed') {
      this.camera.position.lerp(this.fixedPos, 1 - Math.pow(0.001, dt));
      this.lookAt.lerp(this.fixedLook, 1 - Math.pow(0.001, dt));
      this.camera.lookAt(this.lookAt);
      return;
    }
    this.target.lerp(targetPos, 1 - Math.pow(0.0001, dt));
    const cy = Math.cos(this.pitch), sy = Math.sin(this.pitch);
    const desired = new THREE.Vector3(
      this.target.x + Math.sin(this.yaw) * this.dist * cy,
      this.target.y + this.dist * sy + 1.2,
      this.target.z + Math.cos(this.yaw) * this.dist * cy
    );
    this.pos.lerp(desired, 1 - Math.pow(0.0005, dt));
    this.camera.position.copy(this.pos);
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      this.camera.position.x += (Math.random() - 0.5) * 0.12;
      this.camera.position.y += (Math.random() - 0.5) * 0.12;
    }
    this.lookAt.lerp(new THREE.Vector3(this.target.x, this.target.y + 1.6, this.target.z), 1 - Math.pow(0.0001, dt));
    this.camera.lookAt(this.lookAt);
  }
}
