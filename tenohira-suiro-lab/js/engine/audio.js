// WebAudio による効果音シンセ (音源ファイル不要)
// everyday-fluid-lab の Sfx をベースに、このゲーム向けの音を追加:
//  - plink: 水が手にふれた時のペンタトニック音 (因果フィードバックの主役)
//  - swoosh: 手を速く動かした時の風切りループ
//  - fillTone: コップがたまるほど音程が上がる
//  - ratchet / twinkle / rustle / slurp / boing: ギミック用ワンショット

// ペンタトニックスケール (Cメジャーペンタ × 2オクターブ) — どの順で鳴っても心地よい
const PENTA = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.7, 1318.5, 1568.0, 1760.0];

export class Sfx {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('tsl_mute') === '1';
    this._pour = null;
    this._swoosh = null;
    this._lastSplash = 0;
    this._lastPlink = 0;
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
    localStorage.setItem('tsl_mute', m ? '1' : '0');
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

  // ---- ループ音 (毎フレーム強度で制御) ----

  // 水が流れ落ちる音: 0..1
  setPour(intensity, pitch = 1) {
    if (!this.ctx) return;
    if (!this._pour) this._pour = this._noise('bandpass', 900, 1.2);
    const t = this.ctx.currentTime;
    const g = Math.min(0.4, intensity * 0.4);
    this._pour.gain.gain.setTargetAtTime(g, t, 0.08);
    this._pour.filt.frequency.setTargetAtTime(600 + 900 * pitch + Math.random() * 250, t, 0.1);
  }

  // 手を速く動かした時の水かき音: 0..1
  setSwoosh(intensity) {
    if (!this.ctx) return;
    if (!this._swoosh) this._swoosh = this._noise('bandpass', 420, 0.7);
    const t = this.ctx.currentTime;
    this._swoosh.gain.gain.setTargetAtTime(Math.min(0.3, intensity * 0.3), t, 0.06);
    this._swoosh.filt.frequency.setTargetAtTime(300 + 700 * intensity, t, 0.08);
  }

  // ---- ワンショット ----

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

  // 水が手にふれた時のペンタトニック・プリンク。連打してもうるさくならないようレート制限。
  plink(note = -1, vol = 1) {
    if (!this.ctx) return;
    const now = performance.now();
    if (now - this._lastPlink < 70) return;
    this._lastPlink = now;
    const f = PENTA[note >= 0 ? note % PENTA.length : (Math.random() * PENTA.length) | 0];
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.12 * vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + 0.4);
  }

  // コップの水位で音程が上がる「たまってきた!」音
  fillTone(level) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'triangle';
    const f = 300 + 700 * Math.min(1, level);
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 1.25, t + 0.08);
    g.gain.setValueAtTime(0.1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + 0.2);
  }

  // コップが飲み干す音 (下降グリス + ノイズ)
  slurp() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(900, t);
    o.frequency.exponentialRampToValueAtTime(120, t + 0.4);
    g.gain.setValueAtTime(0.07, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + 0.5);
    const { src, filt, gain } = this._noise('bandpass', 1400, 1.5);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    filt.frequency.exponentialRampToValueAtTime(300, t + 0.4);
    src.stop(t + 0.45);
  }

  // 水車のカタカタ音
  ratchet() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(1600 + Math.random() * 400, t);
    g.gain.setValueAtTime(0.04, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + 0.05);
  }

  // 星のキラキラ
  twinkle() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [1568, 2093, 2637].forEach((f, i) => {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sine'; o.frequency.value = f * (0.99 + Math.random() * 0.02);
      const st = t + i * 0.05;
      g.gain.setValueAtTime(0.05, st);
      g.gain.exponentialRampToValueAtTime(0.001, st + 0.3);
      o.connect(g); g.connect(this.master);
      o.start(st); o.stop(st + 0.35);
    });
  }

  // 葉っぱのカサッ
  rustle() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const { src, filt, gain } = this._noise('highpass', 3000, 0.6);
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    src.stop(t + 0.12);
  }

  // 泡のポン
  bubblePop(pitch = 1) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(400 * pitch, t);
    o.frequency.exponentialRampToValueAtTime(900 * pitch, t + 0.04);
    g.gain.setValueAtTime(0.09, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + 0.09);
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

  stopLoops() {
    this.setPour(0); this.setSwoosh(0);
  }
}
