// ミニゲーム共通ベース
import * as THREE from 'three';
import { createSky, createLights } from '../world/sky.js';
import { FX } from '../world/fx.js';
import { disposeScene } from '../core/utils.js';

export class GameBase {
  constructor(app, key, skyOpts = {}) {
    this.app = app;
    this.key = key;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xbfe8ff, 30, 90);
    this.fx = new FX(this.scene);
    this.sky = createSky(this.scene, skyOpts);
    this.lights = createLights(this.scene, { shadowSize: 18 });
    this.t = 0;
    this.finished = false;
  }

  activate() {
    this.app.renderer.setScene(this.scene);
    this.app.ui.showGameHud();
    this.app.audio.playBgm('game');
    this.start();
  }

  start() {}

  // 各ゲームから呼ぶ:終了演出→リザルト
  finish(stars, centerPos = new THREE.Vector3(0, 2, 0)) {
    if (this.finished) return;
    this.finished = true;
    this.app.ui.clearActions();
    this.app.ui.hideGauge();
    this.app.ui.hideOrder();
    this.app.ui.setProgress('');
    this.app.audio.fanfare();
    this.app.ui.showMessage(stars >= 3 ? '🌟 だいせいこう!' : '🎉 できたね!', 2000);
    this.fx.confetti(centerPos, 60, 5);
    this.fx.emoji(centerPos, '💖', 6, 0.9);
    setTimeout(() => this.app.gameFinished(this.key, stars), 1900);
  }

  onPointerDown() {}
  onPointerMove() {}
  onPointerUp() {}
  update(dt) {
    this.t += dt;
    this.sky.update(dt);
    this.fx.update(dt);
  }

  dispose() {
    this.fx.clear();
    disposeScene(this.scene);
  }
}
