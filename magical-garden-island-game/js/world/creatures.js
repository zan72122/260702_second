// ちょうちょ・ようせい・とり・ホタル
import * as THREE from 'three';
import { rand, pick, TAU, damp } from '../core/utils.js';
import { BUTTERFLIES } from '../game/state.js';
import { ISLAND_R, groundHeight } from '../world/island.js';

// ---------- ちょうちょ ----------
class Butterfly {
  constructor(typeId, anchor) {
    const def = BUTTERFLIES[typeId];
    this.typeId = typeId;
    this.def = def;
    this.group = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({
      color: def.color, side: THREE.DoubleSide,
      emissive: def.glow ? def.color : 0x000000,
      emissiveIntensity: def.glow ? 0.5 : 0,
    });
    this.mat = mat;
    const wingGeo = new THREE.CircleGeometry(0.22, 8);
    wingGeo.scale(1, 1.5, 1);
    wingGeo.translate(0.2, 0.05, 0);
    this.wingL = new THREE.Mesh(wingGeo, mat);
    this.wingR = new THREE.Mesh(wingGeo.clone(), mat);
    this.wingR.scale.x = -1;
    this.group.add(this.wingL, this.wingR);
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.03, 0.18, 3, 6),
      new THREE.MeshLambertMaterial({ color: 0x4a3a5a }),
    );
    body.rotation.x = Math.PI / 2;
    this.group.add(body);

    this.anchor = anchor.clone();
    this.group.position.copy(anchor).add(new THREE.Vector3(rand(-1, 1), rand(1, 2), rand(-1, 1)));
    this.phase = rand(TAU);
    this.wanderT = 0;
    this.target = this.group.position.clone();
    this.life = rand(40, 80); // 一定時間でとんでいく
    this.caught = false;
    this.group.traverse((o) => { o.userData.butterfly = this; });
  }

  update(dt, elapsed) {
    this.life -= dt;
    this.wanderT -= dt;
    if (this.wanderT <= 0) {
      this.wanderT = rand(1.5, 3.5);
      this.target = this.anchor.clone().add(new THREE.Vector3(rand(-2.5, 2.5), rand(0.8, 2.2), rand(-2.5, 2.5)));
    }
    const p = this.group.position;
    const to = this.target.clone().sub(p);
    const d = to.length();
    if (d > 0.1) {
      to.normalize().multiplyScalar(Math.min(d, 1.6) * dt);
      p.add(to);
      this.group.rotation.y = damp(this.group.rotation.y, Math.atan2(to.x, to.z), 4, dt);
    }
    p.y += Math.sin(elapsed * 3 + this.phase) * 0.006;
    // はばたき
    const flap = Math.sin(elapsed * 14 + this.phase) * 1.0;
    this.wingL.rotation.y = -0.4 + flap * 0.6;
    this.wingR.rotation.y = 0.4 - flap * 0.6;
    // にじいろ
    if (this.def.rainbow) {
      const hue = (elapsed * 0.3 + this.phase) % 1;
      this.mat.color.setHSL(hue, 0.75, 0.65);
      this.mat.emissive.setHSL(hue, 0.75, 0.4);
    }
  }
}

// ---------- ようせい ルミ ----------
class Fairy {
  constructor() {
    this.group = new THREE.Group();
    const bodyMat = new THREE.MeshPhongMaterial({
      color: 0xfff0b0, emissive: 0xffd166, emissiveIntensity: 1.2,
    });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), bodyMat);
    this.group.add(body);
    const wingMat = new THREE.MeshLambertMaterial({
      color: 0xffffff, transparent: true, opacity: 0.75, side: THREE.DoubleSide,
      emissive: 0xaaddff, emissiveIntensity: 0.4,
    });
    this.wings = [];
    for (const sx of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.CircleGeometry(0.16, 8), wingMat);
      wing.geometry.scale(0.7, 1.6, 1);
      wing.position.set(sx * 0.1, 0.05, -0.06);
      wing.rotation.y = sx * 0.5;
      this.group.add(wing);
      this.wings.push(wing);
    }
    this.light = new THREE.PointLight(0xffe08a, 0.9, 7, 1.8);
    this.group.add(this.light);
    this.phase = rand(TAU);
  }

  update(dt, elapsed, princessPos, particles) {
    // プリンセスの左うしろ上をふわふわついていく
    const target = princessPos.clone().add(new THREE.Vector3(
      Math.sin(elapsed * 0.7) * 0.5 - 0.9,
      2.5 + Math.sin(elapsed * 1.8 + this.phase) * 0.25,
      Math.cos(elapsed * 0.9) * 0.5 - 0.6,
    ));
    this.group.position.lerp(target, 1 - Math.exp(-3.5 * dt));
    const flap = Math.sin(elapsed * 18) * 0.7;
    this.wings[0].rotation.y = -0.5 - flap * 0.4;
    this.wings[1].rotation.y = 0.5 + flap * 0.4;
    this.light.intensity = 0.8 + Math.sin(elapsed * 3) * 0.2;
    if (Math.random() < dt * 4) {
      particles.sparkleTrail(this.group.position, 0xffe9a0);
    }
  }
}

// ---------- とり ----------
class Bird {
  constructor() {
    this.group = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: pick([0xffffff, 0xffd8e8, 0x9be8ff]) });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), mat);
    body.scale.set(1, 0.8, 1.6);
    this.group.add(body);
    this.wingL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 0.2), mat);
    this.wingL.position.x = -0.28;
    this.wingR = this.wingL.clone();
    this.wingR.position.x = 0.28;
    this.group.add(this.wingL, this.wingR);
    this.r = rand(18, 34);
    this.h = rand(8, 15);
    this.speed = rand(0.15, 0.3) * (Math.random() < 0.5 ? 1 : -1);
    this.ang = rand(TAU);
    this.phase = rand(TAU);
  }

  update(dt, elapsed) {
    this.ang += this.speed * dt;
    this.group.position.set(
      Math.cos(this.ang) * this.r,
      this.h + Math.sin(elapsed * 0.8 + this.phase) * 1.2,
      Math.sin(this.ang) * this.r,
    );
    this.group.rotation.y = -this.ang + (this.speed > 0 ? 0 : Math.PI);
    const flap = Math.sin(elapsed * 9 + this.phase) * 0.6;
    this.wingL.rotation.z = flap;
    this.wingR.rotation.z = -flap;
  }
}

// ---------- まとめ ----------
export class Creatures {
  constructor(scene, state, particles) {
    this.scene = scene;
    this.state = state;
    this.particles = particles;
    this.butterflies = [];
    this.birds = [];
    this.fairy = new Fairy();
    scene.add(this.fairy.group);
    for (let i = 0; i < 3; i++) {
      const b = new Bird();
      this.birds.push(b);
      scene.add(b.group);
    }
    this.fireflyTimer = 0;
  }

  // 咲いた花のそばにちょうちょを呼ぶ
  spawnButterfly(anchor, luck = 0) {
    if (this.butterflies.length >= 8) return null;
    // レア度抽選(luck が高いとレアが出やすい)
    const roll = Math.random() + luck;
    let typeId;
    if (roll > 1.35) typeId = 'rainbow';
    else if (roll > 1.15) typeId = 'gold';
    else if (roll > 0.9) typeId = 'purple';
    else if (roll > 0.65) typeId = pick(['pink', 'blue']);
    else typeId = pick(['white', 'yellow']);
    const b = new Butterfly(typeId, anchor);
    this.butterflies.push(b);
    this.scene.add(b.group);
    return b;
  }

  catchButterfly(b, princessPos) {
    if (b.caught) return null;
    if (b.group.position.distanceTo(princessPos) > 6.5) return 'far';
    b.caught = true;
    this.state.data.album[b.typeId] = (this.state.data.album[b.typeId] || 0) + 1;
    this.state.stat('butterflies');
    const petals = b.def.rarity * 2;
    this.state.addPetals(petals);
    this.state.save();
    this.particles.burst(b.group.position, b.def.color, 16, 2);
    this.scene.remove(b.group);
    this.butterflies = this.butterflies.filter((x) => x !== b);
    return { def: b.def, petals };
  }

  update(dt, elapsed, env, princessPos) {
    this.fairy.update(dt, elapsed, princessPos, this.particles);
    this.birds.forEach((b) => b.update(dt, elapsed));

    this.butterflies = this.butterflies.filter((b) => {
      b.update(dt, elapsed);
      if (b.life <= 0) {
        this.scene.remove(b.group);
        return false;
      }
      return true;
    });

    // 夜はホタル
    if (env.nightMix > 0.5) {
      this.fireflyTimer -= dt;
      if (this.fireflyTimer <= 0) {
        this.fireflyTimer = rand(0.1, 0.3);
        const ang = rand(TAU), r = Math.sqrt(Math.random()) * (ISLAND_R - 4);
        const x = Math.cos(ang) * r, z = Math.sin(ang) * r;
        const h = groundHeight(x, z);
        if (h > 0.3) this.particles.firefly(x, h + rand(0.5, 2), z);
      }
    }
  }
}
