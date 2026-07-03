// WebAudio による効果音シンセ (音源ファイル不要)
// 注ぐ音・水しぶき・炭酸のシュワシュワ・チャイムなどを合成する。

export class Sfx {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('egl_mute') === '1';
    this._pour = null;
    this._fizz = null;
    this._lastSplash = 0;
  }

  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.9;
      this.master.connect(this.ctx.destination);
      // 共有ノイズバッファ
      const len = this.ctx.sampleRate * 2;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const ch = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
    } catch (e) { /* audio なしでも遊べる */ }
  }

  setMuted(m) {
    this.muted = m;
    localStorage.setItem('egl_mute', m ? '1' : '0');
    if (this.master) this.master.gain.value = m ? 0 : 0.9;
  }

  _noise(filterType, freq, q = 1) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf; src.loop = true;
    const filt = this.ctx.createBiquadFilter();
    filt.type = filterType; filt.frequency.value = freq; filt.Q.value = q;
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    src.connect(filt); filt.connect(gain); gain.connect(this.master);
    src.start();
    return { src, filt, gain };
  }

  // 注ぐ音: 0..1 の強度で常時制御
  setPour(intensity, pitch = 1) {
    if (!this.ctx) return;
    if (!this._pour) this._pour = this._noise('bandpass', 900, 1.2);
    const t = this.ctx.currentTime;
    const g = Math.min(0.5, intensity * 0.5);
    this._pour.gain.gain.setTargetAtTime(g, t, 0.08);
    this._pour.filt.frequency.setTargetAtTime(600 + 900 * pitch + Math.random() * 250, t, 0.1);
  }

  // 炭酸シュワシュワ: 0..1
  setFizz(intensity) {
    if (!this.ctx) return;
    if (!this._fizz) this._fizz = this._noise('highpass', 5200, 0.8);
    const t = this.ctx.currentTime;
    this._fizz.gain.gain.setTargetAtTime(Math.min(0.22, intensity * 0.22), t, 0.12);
  }

  splash(power = 0.5) {
    if (!this.ctx) return;
    const now = performance.now();
    if (now - this._lastSplash < 90) return;
    this._lastSplash = now;
    const t = this.ctx.currentTime;
    const { src, filt, gain } = this._noise('lowpass', 2800, 0.8);
    const p = Math.min(1, power);
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.exponentialRampToValueAtTime(0.3 * p + 0.02, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28 + 0.2 * p);
    filt.frequency.setValueAtTime(3200, t);
    filt.frequency.exponentialRampToValueAtTime(320, t + 0.3);
    src.stop(t + 0.6);
  }

  drip() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(900, t);
    o.frequency.exponentialRampToValueAtTime(340, t + 0.08);
    g.gain.setValueAtTime(0.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + 0.14);
  }

  pop(pitch = 1) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(600 * pitch, t);
    o.frequency.exponentialRampToValueAtTime(150 * pitch, t + 0.09);
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + 0.12);
  }

  clink() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (const [f, d] of [[2093, 0.18], [3136, 0.12]]) {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sine'; o.frequency.value = f * (0.98 + Math.random() * 0.04);
      g.gain.setValueAtTime(0.12, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + d);
      o.connect(g); g.connect(this.master);
      o.start(t); o.stop(t + d + 0.02);
    }
  }

  squeak() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(700 + Math.random() * 300, t);
    o.frequency.linearRampToValueAtTime(1100 + Math.random() * 400, t + 0.12);
    g.gain.setValueAtTime(0.035, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + 0.17);
  }

  chime() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      const st = t + i * 0.09;
      g.gain.setValueAtTime(0.0001, st);
      g.gain.exponentialRampToValueAtTime(0.16, st + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, st + 0.7);
      o.connect(g); g.connect(this.master);
      o.start(st); o.stop(st + 0.75);
    });
  }

  fanfare() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const seq = [[523, 0], [523, 0.12], [523, 0.24], [659, 0.36], [784, 0.6], [1047, 0.84]];
    for (const [f, dt] of seq) {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'square'; o.frequency.value = f;
      const st = t + dt;
      g.gain.setValueAtTime(0.0001, st);
      g.gain.exponentialRampToValueAtTime(0.08, st + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, st + 0.28);
      o.connect(g); g.connect(this.master);
      o.start(st); o.stop(st + 0.32);
    }
  }

  // ---- 粒状物用の追加効果音 ----

  // 粒がぶつかるパラパラ音 (衝突エネルギー連動)
  setRattle(intensity, pitch = 1) {
    if (!this.ctx) return;
    if (!this._rattle) this._rattle = this._noise('bandpass', 3200, 0.65);
    const t = this.ctx.currentTime;
    const g = Math.min(0.4, intensity * 0.4);
    this._rattle.gain.gain.setTargetAtTime(g, t, 0.06);
    this._rattle.filt.frequency.setTargetAtTime(1800 + 2200 * pitch + Math.random() * 400, t, 0.08);
  }

  // ポップコーンのポン!
  pon(pitch = 1) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(160 * pitch, t);
    o.frequency.exponentialRampToValueAtTime(420 * pitch, t + 0.05);
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + 0.16);
    const { src, filt, gain } = this._noise('highpass', 2500, 0.7);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    src.stop(t + 0.1);
  }

  // シャベルのザクッ
  zaku() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const { src, filt, gain } = this._noise('lowpass', 900, 0.8);
    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    filt.frequency.setValueAtTime(1100, t);
    filt.frequency.exponentialRampToValueAtTime(240, t + 0.16);
    src.stop(t + 0.2);
  }

  // ハトのクルック―
  coo() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (let k = 0; k < 2; k++) {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'triangle';
      const st = t + k * 0.16;
      o.frequency.setValueAtTime(430, st);
      o.frequency.exponentialRampToValueAtTime(300, st + 0.1);
      g.gain.setValueAtTime(0.0001, st);
      g.gain.exponentialRampToValueAtTime(0.09, st + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, st + 0.13);
      o.connect(g); g.connect(this.master);
      o.start(st); o.stop(st + 0.15);
    }
  }

  // ガチャのハンドル (カリカリ)
  ratchet() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (let k = 0; k < 3; k++) {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'square';
      o.frequency.value = 1400 + k * 180;
      const st = t + k * 0.05;
      g.gain.setValueAtTime(0.06, st);
      g.gain.exponentialRampToValueAtTime(0.001, st + 0.03);
      o.connect(g); g.connect(this.master);
      o.start(st); o.stop(st + 0.05);
    }
  }

  stopLoops() {
    this.setPour(0); this.setFizz(0); this.setRattle(0);
  }
}
