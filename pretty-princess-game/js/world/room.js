// お部屋の3D(壁・ゆか・窓・腰壁・モールディング)と 荒廃⇔復興 の見た目
import * as THREE from 'three';
import { wallpaperTexture, floorTexture, skyTexture } from './textures.js';
import { ITEM_BY_ID } from '../items/catalog.js';
import { lerp } from '../core/utils.js';

const WALL_H = 5;

function crackTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.strokeStyle = 'rgba(60,45,55,.75)';
  ctx.lineWidth = 2;
  for (let k = 0; k < 3; k++) {
    let x = 20 + k * 40, y = 0;
    ctx.beginPath();
    ctx.moveTo(x, y);
    while (y < 128) {
      x += (Math.random() - 0.5) * 26;
      y += 12 + Math.random() * 14;
      ctx.lineTo(x, y);
      if (Math.random() > 0.6) {
        ctx.moveTo(x, y);
        ctx.lineTo(x + (Math.random() - 0.5) * 30, y + Math.random() * 16);
        ctx.moveTo(x, y);
      }
    }
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function cobwebTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.strokeStyle = 'rgba(235,235,240,.7)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i <= 5; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    const a = (i / 5) * Math.PI / 2;
    ctx.lineTo(Math.cos(a) * 128, Math.sin(a) * 128);
    ctx.stroke();
  }
  for (let r = 20; r < 130; r += 24) {
    ctx.beginPath();
    for (let i = 0; i <= 5; i++) {
      const a = (i / 5) * Math.PI / 2;
      const rr = r + (i % 2) * 6;
      i === 0 ? ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class Room3D {
  constructor(def, roomState) {
    this.def = def;
    this.w = def.size[0];
    this.d = def.size[1];
    this.group = new THREE.Group();
    this.ruinFactor = roomState.restored ? 0 : 1;
    this.night = false;

    // ---- ゆか ----
    this.floorMat = new THREE.MeshStandardMaterial({ roughness: 0.85 });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(this.w, 0.2, this.d), this.floorMat);
    floor.position.y = -0.1;
    floor.receiveShadow = true;
    floor.name = 'floor';
    this.group.add(floor);
    this.floorMesh = floor;

    // ---- かべ(4面) ----
    this.wallMat = new THREE.MeshStandardMaterial({ roughness: 0.9 });
    this.wainscotMat = new THREE.MeshStandardMaterial({ color: '#fdf8f4', roughness: 0.7 });
    this.trimMat = new THREE.MeshStandardMaterial({ color: '#f3e3ee', roughness: 0.6 });
    this.walls = [];
    const dims = [
      { len: this.w, pos: [0, 0, -this.d / 2], rot: 0 },              // 奥
      { len: this.w, pos: [0, 0, this.d / 2], rot: Math.PI },         // 手前
      { len: this.d, pos: [-this.w / 2, 0, 0], rot: Math.PI / 2 },    // 左
      { len: this.d, pos: [this.w / 2, 0, 0], rot: -Math.PI / 2 },    // 右
    ];
    dims.forEach((wd, i) => {
      const wall = this.buildWall(wd.len, i);
      wall.position.set(...wd.pos);
      wall.rotation.y = wd.rot;
      wall.userData.normal = new THREE.Vector3(0, 0, 1).applyEuler(new THREE.Euler(0, wd.rot, 0));
      wall.userData.wallIndex = i;
      this.group.add(wall);
      this.walls.push(wall);
    });

    // ---- てんじょう ----
    this.ceilMat = new THREE.MeshStandardMaterial({ color: '#fff5fa', roughness: 0.95 });
    const ceil = new THREE.Mesh(new THREE.BoxGeometry(this.w, 0.15, this.d), this.ceilMat);
    ceil.position.y = WALL_H + 0.075;
    ceil.name = 'ceiling';
    this.group.add(ceil);
    this.ceiling = ceil;

    // ---- 荒廃デコ(ひび・クモの巣) ----
    this.ruinDeco = new THREE.Group();
    const crackMat = new THREE.MeshBasicMaterial({ map: crackTexture(), transparent: true, depthWrite: false });
    for (let i = 0; i < 4; i++) {
      const crack = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), crackMat);
      const wd = dims[i % 4];
      crack.position.set(wd.pos[0], 2.4 + (i % 2) * 1.2, wd.pos[2]);
      crack.rotation.y = wd.rot;
      crack.translateZ(0.13);
      crack.translateX((i - 1.5) * 1.2);
      this.ruinDeco.add(crack);
    }
    const webMat = new THREE.MeshBasicMaterial({ map: cobwebTexture(), transparent: true, side: THREE.DoubleSide, depthWrite: false });
    for (const [x, z, ry] of [[-this.w / 2 + 0.1, -this.d / 2 + 0.1, Math.PI / 4], [this.w / 2 - 0.1, -this.d / 2 + 0.1, -Math.PI / 4]]) {
      const web = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), webMat);
      web.position.set(x, WALL_H - 0.8, z);
      web.rotation.y = ry;
      this.ruinDeco.add(web);
    }
    this.group.add(this.ruinDeco);

    this.setWallpaper(roomState.wallpaper);
    this.setFloor(roomState.floor);
    this.applyRuin();
  }

  buildWall(len, index) {
    const g = new THREE.Group();
    // 上部: かべがみ
    const upper = new THREE.Mesh(new THREE.BoxGeometry(len, WALL_H - 1.1, 0.2), this.wallMat);
    upper.position.y = 1.1 + (WALL_H - 1.1) / 2;
    upper.receiveShadow = true;
    upper.name = 'wall';
    g.add(upper);
    // 腰壁(白いパネル)
    const wains = new THREE.Mesh(new THREE.BoxGeometry(len, 1.1, 0.24), this.wainscotMat);
    wains.position.y = 0.55;
    wains.receiveShadow = true;
    wains.name = 'wall';
    g.add(wains);
    // 腰壁の飾り彫り
    const nPanel = Math.max(2, Math.round(len / 1.6));
    for (let i = 0; i < nPanel; i++) {
      const px = -len / 2 + (i + 0.5) * (len / nPanel);
      const panel = new THREE.Mesh(new THREE.BoxGeometry(len / nPanel - 0.3, 0.6, 0.02), this.trimMat);
      panel.position.set(px, 0.55, 0.13);
      g.add(panel);
    }
    // 巾木・モールディング
    const base = new THREE.Mesh(new THREE.BoxGeometry(len, 0.14, 0.28), this.trimMat);
    base.position.y = 0.07;
    g.add(base);
    const chair = new THREE.Mesh(new THREE.BoxGeometry(len, 0.08, 0.28), this.trimMat);
    chair.position.y = 1.12;
    g.add(chair);
    const crownM = new THREE.Mesh(new THREE.BoxGeometry(len, 0.16, 0.26), this.trimMat);
    crownM.position.y = WALL_H - 0.08;
    g.add(crownM);

    // 奥のかべ(index 0)にまど、左のかべ(index 2)にもまど
    if (index === 0 || index === 2) {
      const winCount = index === 0 ? 2 : 1;
      this.skyMats = this.skyMats || [];
      for (let wi = 0; wi < winCount; wi++) {
        const wx = winCount === 2 ? (wi === 0 ? -len / 4 : len / 4) : 0;
        const win = new THREE.Group();
        // そらの見えるガラス(自発光であかるく)
        const skyMat = new THREE.MeshBasicMaterial({ map: skyTexture('day') });
        const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.9), skyMat);
        glass.position.set(0, 0, 0.13);
        win.add(glass);
        this.skyMats.push(skyMat);
        // 白いまどわく
        const frameM = this.wainscotMat;
        const mkBar = (w, h, x, y) => {
          const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.1), frameM);
          b.position.set(x, y, 0.16);
          win.add(b);
        };
        mkBar(1.5, 0.1, 0, 0.98); mkBar(1.5, 0.1, 0, -0.98);
        mkBar(0.1, 2.0, -0.7, 0); mkBar(0.1, 2.0, 0.7, 0);
        mkBar(0.06, 1.9, 0, 0); mkBar(1.4, 0.06, 0, 0.32);
        // アーチ上部
        const arch = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.1, 18, 1, false, -Math.PI / 2, Math.PI), frameM);
        arch.rotation.x = Math.PI / 2;
        arch.position.set(0, 1.0, 0.16);
        win.add(arch);
        win.position.set(wx, 2.6, 0);
        g.add(win);
      }
    }
    return g;
  }

  setWallpaper(itemId) {
    const item = ITEM_BY_ID.get(itemId);
    if (!item) return;
    this.wallMat.map = wallpaperTexture(item.palette, item.pattern);
    this.wallMat.needsUpdate = true;
  }

  setFloor(itemId) {
    const item = ITEM_BY_ID.get(itemId);
    if (!item) return;
    this.floorMat.map = floorTexture(item.floorType, item.palette);
    this.floorMat.needsUpdate = true;
  }

  setNight(night) {
    this.night = night;
    const tex = skyTexture(night ? 'night' : 'day');
    if (this.skyMats) for (const m of this.skyMats) { m.map = tex; m.needsUpdate = true; }
  }

  // 荒廃度 0(きれい)〜1(ボロボロ)
  setRuinFactor(f) {
    this.ruinFactor = f;
    this.applyRuin();
  }

  applyRuin() {
    const f = this.ruinFactor;
    this.wallMat.color.copy(new THREE.Color('#ffffff').lerp(new THREE.Color('#8d8590'), f));
    this.floorMat.color.copy(new THREE.Color('#ffffff').lerp(new THREE.Color('#7d7580'), f));
    this.wainscotMat.color.copy(new THREE.Color('#fdf8f4').lerp(new THREE.Color('#9a9098'), f));
    this.trimMat.color.copy(new THREE.Color('#f3e3ee').lerp(new THREE.Color('#8d8390'), f));
    this.ceilMat.color.copy(new THREE.Color('#fff5fa').lerp(new THREE.Color('#a89ea8'), f));
    this.ruinDeco.visible = f > 0.35;
    this.ruinDeco.traverse((o) => {
      if (o.isMesh) { o.material.opacity = Math.min(1, f); o.material.transparent = true; }
    });
  }

  // カメラのある側のかべを消す
  updateWallVisibility(camera) {
    const camDir = camera.position.clone().sub(new THREE.Vector3(0, 1.5, 0)).normalize();
    for (const wall of this.walls) {
      // かべの内向き法線がカメラと逆をむいている(=カメラとの間にある)かべを消す
      const dot = wall.userData.normal.dot(camDir);
      wall.visible = dot > -0.35;
    }
    this.ceiling.visible = camera.position.y < WALL_H + 0.4;
  }

  // まどからの光の方向(奥かべ想定)
  get bounds() {
    return { minX: -this.w / 2 + 0.3, maxX: this.w / 2 - 0.3, minZ: -this.d / 2 + 0.3, maxZ: this.d / 2 - 0.3 };
  }
}

export { WALL_H };
