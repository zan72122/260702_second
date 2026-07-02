// タッチ・キーボード入力(仮想ジョイスティック / カメラ操作 / ピンチズーム)
export class Input {
  constructor() {
    this.moveX = 0;       // -1..1
    this.moveY = 0;       // -1..1(前が -1)
    this.camDX = 0;       // このフレームのカメラ回転量
    this.camDY = 0;
    this.zoomF = 1;       // ピンチズーム係数
    this.enabled = true;

    this._keys = new Set();
    this._joyId = null;
    this._camId = null;
    this._pinch = null;

    this._joyBase = document.getElementById('joystick-base');
    this._joyKnob = document.getElementById('joystick-knob');
    this._zone = document.getElementById('joystick-zone');

    this._bind();
  }

  _bind() {
    const zone = this._zone;
    zone.addEventListener('touchstart', (e) => this._joyStart(e), { passive: false });
    zone.addEventListener('touchmove', (e) => this._joyMove(e), { passive: false });
    zone.addEventListener('touchend', (e) => this._joyEnd(e));
    zone.addEventListener('touchcancel', (e) => this._joyEnd(e));

    // マウスでも遊べるように(PC 確認用)
    zone.addEventListener('mousedown', (e) => { this._joyId = 'mouse'; this._joyOrigin(e.clientX, e.clientY); });
    window.addEventListener('mousemove', (e) => {
      if (this._joyId === 'mouse') this._joyVec(e.clientX, e.clientY);
      if (this._camId === 'mouse') { this.camDX += e.movementX; this.camDY += e.movementY; }
    });
    window.addEventListener('mouseup', () => { if (this._joyId === 'mouse') this._resetJoy(); this._camId = null; });

    // 画面右半分ドラッグ = カメラ / 2本指 = ピンチズーム
    const canvas = document.getElementById('game-canvas');
    canvas.addEventListener('touchstart', (e) => {
      for (const t of e.changedTouches) {
        if (this._camId === null) { this._camId = t.identifier; this._camLast = { x: t.clientX, y: t.clientY }; }
      }
      if (e.touches.length === 2) {
        this._pinch = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        this._camId = null;
      }
    }, { passive: true });
    canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2 && this._pinch !== null) {
        const d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        this.zoomF *= this._pinch / d;
        this._pinch = d;
        return;
      }
      for (const t of e.changedTouches) {
        if (t.identifier === this._camId && this._camLast) {
          this.camDX += t.clientX - this._camLast.x;
          this.camDY += t.clientY - this._camLast.y;
          this._camLast = { x: t.clientX, y: t.clientY };
        }
      }
    }, { passive: true });
    const endCam = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this._camId) this._camId = null;
      }
      if (e.touches.length < 2) this._pinch = null;
    };
    canvas.addEventListener('touchend', endCam);
    canvas.addEventListener('touchcancel', endCam);
    canvas.addEventListener('mousedown', () => { this._camId = 'mouse'; });

    // キーボード(PC)
    window.addEventListener('keydown', (e) => this._keys.add(e.code));
    window.addEventListener('keyup', (e) => this._keys.delete(e.code));
  }

  _joyStart(e) {
    e.preventDefault();
    if (this._joyId !== null) return;
    const t = e.changedTouches[0];
    this._joyId = t.identifier;
    this._joyOrigin(t.clientX, t.clientY);
  }

  _joyOrigin(x, y) {
    // タッチ位置にジョイスティックを移動(親指の自由度)
    const base = this._joyBase;
    const r = base.offsetWidth / 2;
    base.style.left = `${x - r}px`;
    base.style.top = `${y - r}px`;
    base.style.bottom = 'auto';
    this._origin = { x, y };
  }

  _joyMove(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier === this._joyId) this._joyVec(t.clientX, t.clientY);
    }
  }

  _joyVec(x, y) {
    if (!this._origin) return;
    const dx = x - this._origin.x, dy = y - this._origin.y;
    const max = 52;
    const len = Math.hypot(dx, dy) || 1;
    const cl = Math.min(len, max);
    const nx = (dx / len) * cl, ny = (dy / len) * cl;
    this._joyKnob.style.transform = `translate(calc(-50% + ${nx}px), calc(-50% + ${ny}px))`;
    this.moveX = nx / max;
    this.moveY = ny / max;
  }

  _joyEnd(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === this._joyId) this._resetJoy();
    }
  }

  _resetJoy() {
    this._joyId = null;
    this._origin = null;
    this.moveX = 0; this.moveY = 0;
    this._joyKnob.style.transform = 'translate(-50%, -50%)';
    const base = this._joyBase;
    base.style.left = ''; base.style.top = ''; base.style.bottom = '';
  }

  // 毎フレーム呼び、キーボード入力を合成しつつカメラ差分を取り出す
  poll() {
    let kx = 0, ky = 0;
    if (this._keys.has('KeyW') || this._keys.has('ArrowUp')) ky -= 1;
    if (this._keys.has('KeyS') || this._keys.has('ArrowDown')) ky += 1;
    if (this._keys.has('KeyA') || this._keys.has('ArrowLeft')) kx -= 1;
    if (this._keys.has('KeyD') || this._keys.has('ArrowRight')) kx += 1;
    const mx = this.moveX + kx, my = this.moveY + ky;
    const len = Math.hypot(mx, my);
    const out = {
      x: len > 1 ? mx / len : mx,
      y: len > 1 ? my / len : my,
      camDX: this.camDX,
      camDY: this.camDY,
      zoomF: this.zoomF,
    };
    this.camDX = 0; this.camDY = 0; this.zoomF = 1;
    if (!this.enabled) { out.x = 0; out.y = 0; }
    return out;
  }
}
