// お城(シンボル)— 塔・旗・光る窓
import * as THREE from 'three';
import { mat, shadow, brickTexture, roofTexture, rand } from '../core/utils.js';

export function buildCastle(scene) {
  const castle = new THREE.Group();
  const brick = brickTexture();
  const roofTex = roofTexture('#7b5cd6', '#5d41b0');
  const roofTexPink = roofTexture('#e46fae', '#b84e8c');

  const wallMat = new THREE.MeshStandardMaterial({ map: brick, roughness: 0.9 });
  const roofMat = new THREE.MeshStandardMaterial({ map: roofTex, roughness: 0.75 });
  const roofMatP = new THREE.MeshStandardMaterial({ map: roofTexPink, roughness: 0.75 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd76e, metalness: 0.6, roughness: 0.3, emissive: 0x805e10, emissiveIntensity: 0.25 });

  const windows = [];  // 夜に光る窓
  const flags = [];

  function tower(x, z, h, r, pink = false) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.08, h, 14), wallMat);
    body.position.y = h / 2;
    g.add(body);
    // 屋根(とんがり)
    const roof = new THREE.Mesh(new THREE.ConeGeometry(r * 1.5, h * 0.62, 14), pink ? roofMatP : roofMat);
    roof.position.y = h + h * 0.3;
    g.add(roof);
    // 金の先端 + 旗
    const tip = new THREE.Mesh(new THREE.SphereGeometry(r * 0.16, 8, 8), goldMat);
    tip.position.y = h + h * 0.62;
    g.add(tip);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 6), goldMat);
    pole.position.y = h + h * 0.62 + 0.8;
    g.add(pole);
    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 0.8, 6, 1),
      new THREE.MeshStandardMaterial({ color: pink ? 0xff8fc0 : 0xffd76e, side: THREE.DoubleSide, roughness: 0.8 })
    );
    flag.position.set(0.7, h + h * 0.62 + 1.3, 0);
    g.add(flag);
    flags.push(flag);
    // 窓(縦に並べる)
    const winGeo = new THREE.PlaneGeometry(r * 0.42, r * 0.62);
    for (let i = 0; i < Math.floor(h / 3.2); i++) {
      const wm = new THREE.MeshStandardMaterial({ color: 0x63d0e8, emissive: 0xffe089, emissiveIntensity: 0 });
      const win = new THREE.Mesh(winGeo, wm);
      const a = rand(-0.5, 0.5);
      win.position.set(Math.sin(a) * (r + 0.02), 2.4 + i * 3.2, Math.cos(a) * (r + 0.02));
      win.lookAt(win.position.x * 2, win.position.y, win.position.z * 2);
      g.add(win);
      windows.push(wm);
    }
    g.position.set(x, 0, z);
    return g;
  }

  // 本丸
  const keep = new THREE.Mesh(new THREE.BoxGeometry(16, 12, 10), wallMat);
  keep.position.y = 6;
  castle.add(keep);
  const keepRoof = new THREE.Mesh(new THREE.ConeGeometry(11.5, 7, 4), roofMat);
  keepRoof.position.y = 15.5;
  keepRoof.rotation.y = Math.PI / 4;
  castle.add(keepRoof);

  // 正面の壁窓
  for (let i = -1; i <= 1; i++) {
    const wm = new THREE.MeshStandardMaterial({ color: 0x63d0e8, emissive: 0xffe089, emissiveIntensity: 0 });
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.6), wm);
    win.position.set(i * 4.4, 7.5, 5.02);
    castle.add(win);
    windows.push(wm);
  }

  // 大きな門
  const gate = new THREE.Group();
  const arch = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 1.6, 20, 1, false, 0, Math.PI), wallMat);
  arch.rotation.z = Math.PI / 2;
  arch.rotation.y = Math.PI / 2;
  arch.position.set(0, 4.4, 5.4);
  gate.add(arch);
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x8a5a30, roughness: 0.85 });
  const door = new THREE.Mesh(new THREE.BoxGeometry(5.4, 4.4, 0.5), doorMat);
  door.position.set(0, 2.2, 5.3);
  gate.add(door);
  // 金の縁どり
  const rim = new THREE.Mesh(new THREE.TorusGeometry(3, 0.22, 8, 20, Math.PI), goldMat);
  rim.position.set(0, 4.4, 5.65);
  gate.add(rim);
  castle.add(gate);

  // 塔:四隅 + 中央大塔
  castle.add(tower(-9, 4, 14, 2.2));
  castle.add(tower(9, 4, 14, 2.2));
  castle.add(tower(-7, -5, 18, 2.4, true));
  castle.add(tower(7, -5, 18, 2.4, true));
  const main = tower(0, -2, 26, 3.0, true);
  castle.add(main);

  // 城壁(左右へ)
  const wallL = new THREE.Mesh(new THREE.BoxGeometry(14, 6, 2.4), wallMat);
  wallL.position.set(-16, 3, 2);
  castle.add(wallL);
  const wallR = wallL.clone();
  wallR.position.x = 16;
  castle.add(wallR);
  // 城壁の凸凹
  for (let s = -1; s <= 1; s += 2) {
    for (let i = 0; i < 5; i++) {
      const crn = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 2.6), wallMat);
      crn.position.set(s * (10.5 + i * 2.8), 6.6, 2);
      castle.add(crn);
    }
  }

  castle.position.set(0, 0, -34);
  shadow(castle, true, true);
  scene.add(castle);

  // お城のライトアップ(夜)
  const upLight = new THREE.PointLight(0xffc2f0, 0, 40, 1.6);
  upLight.position.set(0, 8, -26);
  scene.add(upLight);

  return {
    group: castle,
    colliders: [
      { x: 0, z: -34, r: 12 },
      { x: -16, z: -32, r: 6.5 },
      { x: 16, z: -32, r: 6.5 },
    ],
    update(dt, t, nightF) {
      // 旗ぱたぱた
      for (const f of flags) {
        const pos = f.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i);
          pos.setZ(i, Math.sin(t * 6 + x * 3) * 0.1 * (x + 0.7));
        }
        pos.needsUpdate = true;
      }
      // 窓あかり
      const glow = nightF * (1.1 + Math.sin(t * 1.5) * 0.15);
      for (const w of windows) w.emissiveIntensity = glow;
      upLight.intensity = nightF * 18;
    },
  };
}
