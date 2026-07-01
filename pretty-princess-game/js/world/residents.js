// 復興した部屋にあらわれる住民(こうさぎ・ことり・こねこ・ようせい)
import * as THREE from 'three';
import { mesh, sph, cone, cyl } from '../furniture/parts.js';
import { rand, pick } from '../core/utils.js';

function matOf(color, rough = 0.85) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough });
}

function buildBunny() {
  const g = new THREE.Group();
  const fur = matOf('#fdfaf7');
  g.add(sph(fur, 0.12, 0, 0.12, 0, 1, 0.95, 1.25));
  g.add(sph(fur, 0.09, 0, 0.24, 0.08));
  for (const s of [-1, 1]) {
    g.add(sph(fur, 0.03, s * 0.04, 0.36, 0.06, 1, 3, 0.7));
    g.add(sph(matOf('#ffc9de'), 0.017, s * 0.04, 0.37, 0.075, 1, 2.4, 0.5));
  }
  const eye = matOf('#3a2430', 0.3);
  g.add(sph(eye, 0.013, -0.035, 0.26, 0.15), sph(eye, 0.013, 0.035, 0.26, 0.15));
  g.add(sph(fur, 0.045, 0, 0.1, -0.13));
  return g;
}

function buildCat() {
  const g = new THREE.Group();
  const fur = matOf('#f5d7a8');
  g.add(sph(fur, 0.12, 0, 0.13, 0, 1.2, 0.9, 1.3));
  g.add(sph(fur, 0.095, 0, 0.27, 0.1));
  for (const s of [-1, 1]) g.add(cone(fur, 0.035, 0.07, s * 0.055, 0.36, 0.09, 4));
  const eye = matOf('#3a5a30', 0.3);
  g.add(sph(eye, 0.013, -0.04, 0.29, 0.18), sph(eye, 0.013, 0.04, 0.29, 0.18));
  const tail = cyl(fur, 0.02, 0.03, 0.24, 0, 0.2, -0.18);
  tail.rotation.x = 0.8;
  g.add(tail);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 8, 16), matOf('#ff6fa8', 0.5));
  collar.position.set(0, 0.21, 0.08);
  collar.rotation.x = Math.PI / 2.4;
  g.add(collar);
  return g;
}

function buildBird() {
  const g = new THREE.Group();
  const body = matOf(pick(['#8fd0f0', '#ffc0d8', '#fce8a8']));
  g.add(sph(body, 0.06, 0, 0.06, 0, 1, 0.95, 1.25));
  g.add(sph(body, 0.045, 0, 0.12, 0.045));
  g.add(cone(matOf('#e8a53a', 0.5), 0.013, 0.03, 0, 0.115, 0.095, 6));
  const eye = matOf('#3a2430', 0.3);
  g.add(sph(eye, 0.009, -0.02, 0.13, 0.075), sph(eye, 0.009, 0.02, 0.13, 0.075));
  for (const s of [-1, 1]) g.add(sph(body, 0.03, s * 0.055, 0.06, -0.01, 0.5, 0.8, 1.2));
  return g;
}

function buildFairy() {
  const g = new THREE.Group();
  const skin = matOf('#ffe8d8', 0.6);
  const dress = matOf('#d8f0b8', 0.6);
  g.add(cone(dress, 0.05, 0.12, 0, 0.1, 0, 10));
  g.add(sph(skin, 0.04, 0, 0.2, 0));
  g.add(sph(matOf('#f0d060', 0.4), 0.045, 0, 0.225, -0.015, 1, 0.8, 1));
  const wingM = new THREE.MeshStandardMaterial({ color: '#e8f8ff', transparent: true, opacity: 0.7, roughness: 0.2, side: THREE.DoubleSide });
  for (const s of [-1, 1]) {
    const w = sph(wingM, 0.05, s * 0.05, 0.16, -0.04, 0.4, 1.4, 1);
    w.rotation.z = s * 0.5;
    g.add(w);
  }
  const light = new THREE.PointLight('#d8ffb0', 0.6, 1.5);
  light.position.y = 0.2;
  g.add(light);
  return g;
}

const KINDS = { bunny: buildBunny, cat: buildCat, bird: buildBird, fairy: buildFairy };

export class Resident {
  constructor(kind, bounds) {
    this.kind = kind;
    this.bounds = bounds;
    this.group = KINDS[kind]();
    this.group.position.set(rand(bounds.minX, bounds.maxX) * 0.7, kind === 'bird' || kind === 'fairy' ? rand(0.8, 2.2) : 0, rand(bounds.minZ, bounds.maxZ) * 0.7);
    this.target = this.group.position.clone();
    this.wait = rand(1, 3);
    this.t = rand(10);
  }
  update(dt) {
    this.t += dt;
    const flying = this.kind === 'bird' || this.kind === 'fairy';
    const p = this.group.position;
    const d = this.target.clone().sub(p);
    if (d.length() < 0.1) {
      this.wait -= dt;
      if (this.wait <= 0) {
        this.target.set(
          rand(this.bounds.minX, this.bounds.maxX) * 0.75,
          flying ? rand(0.6, 2.6) : 0,
          rand(this.bounds.minZ, this.bounds.maxZ) * 0.75,
        );
        this.wait = rand(1.5, 4.5);
      }
      // その場でちょんちょんはねる
      if (!flying) this.group.position.y = Math.abs(Math.sin(this.t * 6)) * 0.02;
    } else {
      d.normalize();
      const speed = flying ? 0.9 : 0.5;
      p.addScaledVector(d, speed * dt);
      this.group.rotation.y = Math.atan2(d.x, d.z);
      if (!flying) p.y = Math.abs(Math.sin(this.t * 9)) * 0.06;
      else p.y += Math.sin(this.t * 4) * dt * 0.4;
    }
    if (this.kind === 'fairy') {
      this.group.position.y += Math.sin(this.t * 3) * dt * 0.2;
    }
  }
}

// 復興ずみの部屋に出す住民セットをつくる
export function spawnResidents(scene, bounds, stars) {
  const residents = [];
  const kinds = ['bunny', 'bird'];
  if (stars >= 2) kinds.push('cat');
  if (stars >= 3) kinds.push('fairy');
  for (const k of kinds) {
    const r = new Resident(k, bounds);
    r.group.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
    scene.add(r.group);
    residents.push(r);
  }
  return residents;
}
