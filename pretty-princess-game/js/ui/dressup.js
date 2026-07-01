// ドレスアップ画面(専用プレビューレンダラー + 着せかえオプション)
import * as THREE from 'three';
import { Princess, DRESS_STYLES, HAIR_STYLES, HAIR_COLORS, ACCESSORIES, DRESS_COLORS } from '../princess/princess.js';
import { PALETTES } from '../items/style.js';
import { audio } from '../core/audio.js';
import { $, show, hide } from './ui.js';

export class DressUpUI {
  constructor(game, onDone) {
    this.game = game;
    this.onDone = onDone;
    this.renderer = null;
    this.running = false;
    $('#btn-dressup-done').addEventListener('click', () => {
      audio.se('buy');
      this.game.data.flags.dressChanged = true;
      this.game.emit();
      this.close();
      this.onDone();
    });
  }

  open() {
    show('#dressup-screen');
    this.running = true;
    if (!this.renderer) this._setup();
    this._renderOptions();
    this._rebuild();
    this._loop();
  }

  close() {
    this.running = false;
    hide('#dressup-screen');
  }

  _setup() {
    const canvas = $('#dressup-canvas');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 30);
    this.camera.position.set(0, 1.15, 3.2);
    this.camera.lookAt(0, 0.85, 0);
    const key = new THREE.DirectionalLight('#fff4e8', 2.6);
    key.position.set(2, 4, 3);
    this.scene.add(key);
    this.scene.add(new THREE.HemisphereLight('#fff0f8', '#e0c0e8', 1.5));
    const rim = new THREE.DirectionalLight('#ffd0e8', 1.4);
    rim.position.set(-2, 2, -3);
    this.scene.add(rim);
    // ステージ
    const stage = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.2, 0.12, 32),
      new THREE.MeshStandardMaterial({ color: '#ffd7ea', roughness: 0.5 }),
    );
    stage.position.y = -0.06;
    this.scene.add(stage);
    this.princess = null;
    this.t = 0;
  }

  _rebuild() {
    if (this.princess) this.scene.remove(this.princess.group);
    this.princess = new Princess(this.game.data.dress);
    this.scene.add(this.princess.group);
  }

  _loop() {
    if (!this.running) return;
    requestAnimationFrame(() => this._loop());
    const canvas = $('#dressup-canvas');
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (w && h && (canvas.width !== w || canvas.height !== h)) {
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
    this.t += 1 / 60;
    this.princess.group.rotation.y = Math.sin(this.t * 0.5) * 0.7;
    this.princess.update(1 / 60);
    this.renderer.render(this.scene, this.camera);
  }

  _optRow(title, options, currentId, onPick, swatches = false) {
    const group = document.createElement('div');
    group.className = 'dress-opt-group';
    group.innerHTML = `<div class="dress-opt-title">${title}</div>`;
    const row = document.createElement('div');
    row.className = 'dress-opt-row';
    for (const opt of options) {
      let el;
      if (swatches) {
        el = document.createElement('div');
        el.className = 'dress-swatch' + (opt.id === currentId ? ' active' : '');
        el.style.background = opt.color;
        el.title = opt.name;
      } else {
        el = document.createElement('button');
        el.className = 'dress-opt' + (opt.id === currentId ? ' active' : '');
        el.textContent = opt.name;
      }
      el.addEventListener('click', () => {
        audio.se('click');
        onPick(opt.id);
        this._renderOptions();
        this._rebuild();
      });
      row.appendChild(el);
    }
    group.appendChild(row);
    return group;
  }

  _renderOptions() {
    const d = this.game.data.dress;
    const box = $('#dressup-options');
    box.innerHTML = '';
    box.appendChild(this._optRow('👗 ドレスのかたち', DRESS_STYLES, d.dress, (v) => { d.dress = v; this.game.emit(); }));
    box.appendChild(this._optRow('🎨 ドレスのいろ',
      DRESS_COLORS.map((id) => ({ id, name: PALETTES[id].name, color: PALETTES[id].main })),
      d.dressColor, (v) => { d.dressColor = v; this.game.emit(); }, true));
    box.appendChild(this._optRow('💇 かみがた', HAIR_STYLES, d.hair, (v) => { d.hair = v; this.game.emit(); }));
    box.appendChild(this._optRow('🎀 かみのいろ', HAIR_COLORS, d.hairColor, (v) => { d.hairColor = v; this.game.emit(); }, true));
    box.appendChild(this._optRow('👑 あたまのかざり', ACCESSORIES, d.acc, (v) => { d.acc = v; this.game.emit(); }));
  }
}
