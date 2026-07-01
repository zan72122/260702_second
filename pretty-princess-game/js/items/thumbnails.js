// アイテムサムネイルのオフスクリーン生成(必要になったときだけ描画してキャッシュ)
import * as THREE from 'three';
import { buildItemMesh } from '../furniture/factory.js';
import { wallpaperTexture, floorTexture } from '../world/textures.js';

const SIZE = 128;
const cache = new Map();
let renderer = null, scene = null, camera = null;

function ensureRenderer() {
  if (renderer) return;
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(SIZE, SIZE);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  scene = new THREE.Scene();
  const key = new THREE.DirectionalLight('#fff4e8', 2.6);
  key.position.set(2, 4, 3);
  scene.add(key);
  scene.add(new THREE.HemisphereLight('#ffeef8', '#d8b8e8', 1.4));
  const rim = new THREE.DirectionalLight('#ffd0e8', 1.0);
  rim.position.set(-2, 2, -3);
  scene.add(rim);
  camera = new THREE.PerspectiveCamera(34, 1, 0.05, 50);
}

export function thumbnailFor(item) {
  if (cache.has(item.id)) return cache.get(item.id);
  let url;
  if (item.kind === 'wallpaper') {
    url = wallpaperTexture(item.palette, item.pattern).image.toDataURL();
  } else if (item.kind === 'floor') {
    url = floorTexture(item.floorType, item.palette).image.toDataURL();
  } else {
    ensureRenderer();
    const group = buildItemMesh(item);
    scene.add(group);
    const bbox = new THREE.Box3().setFromObject(group);
    const center = bbox.getCenter(new THREE.Vector3());
    const size = bbox.getSize(new THREE.Vector3());
    const radius = Math.max(size.x, size.y, size.z) * 0.62 + 0.12;
    const dist = radius / Math.tan((camera.fov * Math.PI) / 360);
    camera.position.set(center.x + dist * 0.62, center.y + dist * 0.52, center.z + dist * 0.72);
    camera.lookAt(center);
    renderer.render(scene, camera);
    url = renderer.domElement.toDataURL();
    scene.remove(group);
    // ジオメトリはビルダー間で共有していないので破棄してメモリ節約
    group.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
  }
  cache.set(item.id, url);
  return url;
}
