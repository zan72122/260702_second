// つりミニゲーム
import * as THREE from 'three';
import { mat, glowMat, rand, pick, clamp } from '../core/utils.js';
import { FISH } from './data.js';
import { state, addItem, recordCollection, questProgress } from './state.js';
import { ui } from '../ui/ui.js';
import { audio } from '../core/audio.js';

const $ = (id) => document.getElementById(id);

export class Fishing {
  constructor(scene, particles, pondCenter) {
    this.scene = scene;
    this.particles = particles;
    this.pond = pondCenter;
    this.active = false;
    this.phase = 'idle'; // wait | strike | reel
    this.bobber = null;
    this._makeBobber();
    this.onEnd = null;

    $('fishing-btn').addEventListener('pointerdown', () => this._onButton());
  }

  _makeBobber() {
    const g = new THREE.Group();
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), mat(0xff4a5e, { roughness: 0.4 }));
    g.add(ball);
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), glowMat(0xfff0b8, 0.6));
    top.position.y = 0.18;
    g.add(top);
    g.visible = false;
    this.scene.add(g);
    this.bobber = g;
    this.bobberTop = top;
  }

  start(playerPos, isNight, onEnd) {
    if (this.active) return;
    this.active = true;
    this.isNight = isNight;
    this.onEnd = onEnd;
    this.phase = 'wait';
    this.waitT = rand(2.2, 5.5);
    this.t = 0;

    // ウキを池の方向へ
    const dx = this.pond.x - playerPos.x, dz = this.pond.z - playerPos.z;
    const d = Math.hypot(dx, dz) || 1;
    const bx = playerPos.x + (dx / d) * 3.2;
    const bz = playerPos.z + (dz / d) * 3.2;
    this.bobber.position.set(bx, 0.15, bz);
    this.bobber.visible = true;
    audio.sfx('splash');
    this.particles.splash(this.bobber.position.clone(), 10);

    $('fishing-ui').classList.remove('hidden');
    $('fishing-msg').textContent = 'ウキを みていてね…';
    $('fishing-gauge').classList.add('hidden');
    $('fishing-btn').classList.remove('hidden');
  }

  _onButton() {
    if (this.phase === 'wait') {
      // 早あわせ → にげられた
      this._fail('はやすぎた! さかなに にげられた…');
    } else if (this.phase === 'strike') {
      // ヒット → リールゲージへ
      this.phase = 'reel';
      audio.sfx('reel');
      this._startGauge();
    } else if (this.phase === 'reel') {
      this._judgeGauge();
    }
  }

  _startGauge() {
    // ターゲットゾーンにカーソルが入った瞬間にタップ
    this.gaugePos = 0;
    this.gaugeDir = 1;
    this.gaugeSpeed = rand(1.3, 1.9);
    this.targetC = rand(0.3, 0.7);
    this.targetW = rand(0.14, 0.2);
    $('fishing-msg').textContent = 'みどりのゾーンで タップ!';
    const tgt = $('fishing-target');
    tgt.style.left = `${(this.targetC - this.targetW / 2) * 100}%`;
    tgt.style.width = `${this.targetW * 100}%`;
    $('fishing-gauge').classList.remove('hidden');
  }

  _judgeGauge() {
    const hit = Math.abs(this.gaugePos - this.targetC) < this.targetW / 2;
    if (hit) this._success();
    else this._fail('あぁっ、バラしちゃった…');
  }

  _success() {
    // 夜限定魚 + レア度抽選
    const candidates = FISH.filter((f) => !f.night || this.isNight);
    const weighted = [];
    for (const f of candidates) weighted.push(...Array(Math.max(1, 6 - f.rarity * 1.4 | 0)).fill(f));
    const fish = pick(weighted);
    addItem(fish.id, 1);
    const first = recordCollection('fish', fish.id);
    questProgress('fish');
    questProgress('fishSpecies', { id: fish.id });
    audio.sfx('catch');
    this.particles.splash(this.bobber.position.clone(), 20);
    this.particles.sparkle(this.bobber.position.clone().setY(1), 16);
    const stars = '⭐'.repeat(fish.rarity);
    ui.showResult('🎣 つれた!', `<div style="font-size:44px">${fish.icon}</div><b>${fish.name}</b> ${stars}<br>${fish.desc}` + (first ? '<br><span style="color:var(--gold)">✨ ずかんに とうろく!</span>' : ''));
    this._end();
  }

  _fail(msg) {
    audio.sfx('miss');
    ui.toast('💧 ' + msg);
    this._end();
  }

  cancel() {
    if (this.active) this._end();
  }

  _end() {
    this.active = false;
    this.phase = 'idle';
    this.bobber.visible = false;
    $('fishing-ui').classList.add('hidden');
    if (this.onEnd) { this.onEnd(); this.onEnd = null; }
  }

  update(dt, t) {
    if (!this.active) return;
    this.t += dt;
    // ウキのぷかぷか
    this.bobber.position.y = 0.12 + Math.sin(this.t * 3) * 0.05;

    if (this.phase === 'wait') {
      this.waitT -= dt;
      // ちょんちょん(フェイク)
      if (Math.random() < dt * 0.5) {
        this.bobber.position.y -= 0.08;
        audio.sfx('reel');
      }
      if (this.waitT <= 0) {
        this.phase = 'strike';
        this.strikeT = 1.1; // 1.1秒以内にあわせる
        $('fishing-msg').textContent = '❗ いまだ! あわせて!';
        this.bobber.position.y = -0.15;
        audio.sfx('splash');
        this.particles.splash(this.bobber.position.clone(), 8);
        this.bobberTop.material.emissiveIntensity = 2.5;
      }
    } else if (this.phase === 'strike') {
      this.strikeT -= dt;
      if (this.strikeT <= 0) {
        this.bobberTop.material.emissiveIntensity = 0.6;
        this._fail('にげられた…もういちど!');
      }
    } else if (this.phase === 'reel') {
      this.gaugePos += this.gaugeDir * this.gaugeSpeed * dt;
      if (this.gaugePos > 1) { this.gaugePos = 1; this.gaugeDir = -1; }
      if (this.gaugePos < 0) { this.gaugePos = 0; this.gaugeDir = 1; }
      $('fishing-cursor').style.left = `${clamp(this.gaugePos, 0, 1) * 100}%`;
    }
  }
}
