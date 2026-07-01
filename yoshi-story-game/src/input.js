// 入力: キーボード + ゲームパッド + タッチを一つの状態に統合
export class Input {
  constructor() {
    this.state = { left: false, right: false, down: false, jump: false, eat: false, egg: false, pause: false };
    this.prev = { ...this.state };
    this._kb = {};
    this._tap = {}; // 前フレーム以降に押された瞬間 (低 FPS でも取りこぼさないバッファ)
    this._touch = {};
    this.anyPressed = false; // 画面遷移用「何か押した」

    const KEYMAP = {
      ArrowLeft: 'left', KeyA: 'left',
      ArrowRight: 'right', KeyD: 'right',
      ArrowDown: 'down', KeyS: 'down',
      Space: 'jump', KeyZ: 'jump', ArrowUp: 'jump', KeyW: 'jump',
      KeyX: 'eat', KeyK: 'eat',
      KeyC: 'egg', KeyL: 'egg',
      Escape: 'pause', KeyP: 'pause',
    };

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const a = KEYMAP[e.code];
      if (a) { this._kb[a] = true; this._tap[a] = true; e.preventDefault(); }
      this.anyPressed = true;
      this._debugKey = e.code;
    });
    window.addEventListener('keyup', (e) => {
      const a = KEYMAP[e.code];
      if (a) this._kb[a] = false;
    });
    window.addEventListener('pointerdown', () => { this.anyPressed = true; });
    window.addEventListener('blur', () => { this._kb = {}; });

    this._setupTouch();
  }

  _setupTouch() {
    const bind = (id, action) => {
      const el = document.getElementById(id);
      if (!el) return;
      const on = (e) => { e.preventDefault(); this._touch[action] = true; };
      const off = (e) => { e.preventDefault(); this._touch[action] = false; };
      el.addEventListener('pointerdown', on);
      el.addEventListener('pointerup', off);
      el.addEventListener('pointerleave', off);
      el.addEventListener('pointercancel', off);
    };
    bind('tb-left', 'left');
    bind('tb-right', 'right');
    bind('tb-down', 'down');
    bind('tb-jump', 'jump');
    bind('tb-egg', 'egg');
    bind('tb-eat', 'eat');
    window.addEventListener('touchstart', () => document.body.classList.add('touch'), { once: true });
  }

  _pollGamepad() {
    const gp = navigator.getGamepads && navigator.getGamepads()[0];
    if (!gp) return {};
    const ax = gp.axes[0] || 0;
    return {
      left: ax < -0.35 || gp.buttons[14]?.pressed,
      right: ax > 0.35 || gp.buttons[15]?.pressed,
      down: (gp.axes[1] || 0) > 0.5 || gp.buttons[13]?.pressed,
      jump: gp.buttons[0]?.pressed || gp.buttons[3]?.pressed,
      eat: gp.buttons[2]?.pressed,
      egg: gp.buttons[1]?.pressed || gp.buttons[5]?.pressed,
      pause: gp.buttons[9]?.pressed,
    };
  }

  update() {
    this.prev = { ...this.state };
    const gp = this._pollGamepad();
    for (const k of Object.keys(this.state)) {
      // _tap: keydown→keyup が 1 フレーム内に完結しても必ず 1 回は押下扱いにする
      this.state[k] = !!(this._kb[k] || this._touch[k] || gp[k] || (this._tap[k] && !this.prev[k]));
    }
    this._tap = {};
    if (Object.values(gp).some(Boolean)) this.anyPressed = true;
  }

  held(a) { return this.state[a]; }
  pressed(a) { return this.state[a] && !this.prev[a]; }
  released(a) { return !this.state[a] && this.prev[a]; }

  // 遷移用: 押しっぱなし誤爆を避けるためフラグ消費式
  consumeAny() {
    const v = this.anyPressed;
    this.anyPressed = false;
    return v;
  }

  consumeDebugKey() {
    const k = this._debugKey;
    this._debugKey = null;
    return k;
  }
}
