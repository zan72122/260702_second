// WebAudio による手続き生成サウンド: 陽気なチップチューン BGM + 効果音
// 外部音声ファイルは一切使わない
const NOTE = {}; // 音名 -> 周波数
{
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  for (let oct = 1; oct <= 7; oct++) {
    names.forEach((n, i) => {
      NOTE[n + oct] = 440 * Math.pow(2, (i - 9) / 12 + (oct - 4));
    });
  }
}

// ステージごとの曲: 8分音符グリッド(2小節 = 16 ステップ)のループ
const SONGS = [
  { // 1: のどかな草原 — 明るいハ長調
    tempo: 132, melWave: 'square', melGain: 0.16,
    melody: [
      'E5', null, 'G5', 'E5', 'C5', null, 'D5', 'E5',
      'G5', null, 'A5', 'G5', 'E5', 'D5', 'C5', null,
      'D5', null, 'F5', 'D5', 'B4', null, 'C5', 'D5',
      'E5', 'G5', 'E5', 'C5', 'D5', null, 'C5', null,
    ],
    bass: ['C3', 'G3', 'C3', 'G3', 'F3', 'C4', 'F3', 'C4', 'G3', 'D4', 'G3', 'D4', 'C3', 'G3', 'C4', 'G3'],
    chords: [['C4', 'E4'], ['F4', 'A4'], ['G4', 'B4'], ['C4', 'E4']],
  },
  { // 2: 夕焼けビーチ — ゆったりスウィング風
    tempo: 116, melWave: 'triangle', melGain: 0.22,
    melody: [
      'A4', null, 'C5', null, 'E5', 'D5', 'C5', 'A4',
      'B4', null, 'D5', null, 'F5', 'E5', 'D5', 'B4',
      'C5', null, 'E5', null, 'G5', 'F5', 'E5', 'C5',
      'B4', 'D5', 'C5', 'B4', 'A4', null, null, null,
    ],
    bass: ['A2', 'E3', 'A2', 'E3', 'G2', 'D3', 'G2', 'D3', 'F2', 'C3', 'F2', 'C3', 'E3', 'B2', 'E3', 'B2'],
    chords: [['A3', 'C4'], ['G3', 'B3'], ['F3', 'A3'], ['E3', 'G#3']],
  },
  { // 3: 星空ナイト — きらきらワルツ気味
    tempo: 144, melWave: 'sine', melGain: 0.26,
    melody: [
      'G5', null, 'D5', null, 'B5', null, 'G5', null,
      'A5', null, 'F#5', null, 'D5', null, 'E5', 'F#5',
      'G5', null, 'B5', null, 'D6', null, 'B5', 'A5',
      'G5', 'F#5', 'E5', 'D5', 'G5', null, null, null,
    ],
    bass: ['G2', 'D3', 'G3', 'D3', 'C3', 'G3', 'C4', 'G3', 'D3', 'A3', 'D4', 'A3', 'G2', 'D3', 'G3', 'B3'],
    chords: [['G3', 'B3'], ['C4', 'E4'], ['D4', 'F#4'], ['G3', 'B3']],
  },
];

export class AudioSys {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this._songTimer = null;
    this._happy = false;
  }

  // ユーザー操作後に呼ぶこと
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.55;
    const comp = this.ctx.createDynamicsCompressor();
    this.master.connect(comp).connect(this.ctx.destination);
    this.bgmBus = this.ctx.createGain();
    this.bgmBus.gain.value = 1;
    this.bgmBus.connect(this.master);
    this.sfxBus = this.ctx.createGain();
    this.sfxBus.gain.value = 1;
    this.sfxBus.connect(this.master);
    // ノイズバッファ (打楽器・効果音用)
    const len = this.ctx.sampleRate * 0.5;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  resume() { this.ctx?.resume(); }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.55;
  }

  // ---------- BGM ----------
  playSong(index) {
    if (!this.ctx) return;
    this.stopSong();
    const song = SONGS[index % SONGS.length];
    const stepDur = 60 / song.tempo / 2; // 8 分音符
    let step = 0;
    let nextTime = this.ctx.currentTime + 0.08;
    const N = song.melody.length;

    const scheduler = () => {
      while (nextTime < this.ctx.currentTime + 0.25) {
        const t = nextTime;
        const rate = this._happy ? 1.19 : 1; // スーパーハッピー中はテンポ&ピッチアップ
        const s = step % N;
        const m = song.melody[s];
        if (m) this._tone(m, t, stepDur * 0.92 / rate, song.melWave, song.melGain, this.bgmBus, rate);
        const b = song.bass[s % song.bass.length];
        if (b && s % 2 === 0) this._tone(b, t, stepDur * 1.6 / rate, 'triangle', 0.30, this.bgmBus, rate);
        const chord = song.chords[Math.floor(s / 8) % song.chords.length];
        if (s % 4 === 2) for (const c of chord) this._tone(c, t, stepDur * 1.1 / rate, 'sine', 0.07, this.bgmBus, rate);
        // ハイハット / キック
        if (s % 2 === 0) this._noiseHit(t, 0.03, 6000, 0.045);
        if (s % 8 === 0) this._kick(t);
        step++;
        nextTime += stepDur / rate;
      }
      this._songTimer = setTimeout(scheduler, 60);
    };
    scheduler();
  }

  stopSong() {
    if (this._songTimer) { clearTimeout(this._songTimer); this._songTimer = null; }
  }

  setHappyMode(on) { this._happy = on; }

  _tone(note, t, dur, wave, gain, bus, rate = 1) {
    const f = typeof note === 'number' ? note : NOTE[note];
    if (!f) return;
    const o = this.ctx.createOscillator();
    o.type = wave;
    o.frequency.value = f * rate;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(bus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  _noiseHit(t, dur, freq, gain) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(this.bgmBus);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  _kick(t) {
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.09);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.4, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
    o.connect(g).connect(this.bgmBus);
    o.start(t);
    o.stop(t + 0.13);
  }

  // ---------- SFX ----------
  _now() { return this.ctx ? this.ctx.currentTime : 0; }

  sfx(name) {
    if (!this.ctx) return;
    const t = this._now();
    switch (name) {
      case 'jump': this._sweep(300, 640, 0.14, 'square', 0.16); break;
      case 'flutter': {
        for (let i = 0; i < 6; i++) this._sweep(500 + i * 40, 560 + i * 40, 0.05, 'triangle', 0.10, t + i * 0.055);
        break;
      }
      case 'pound': this._sweep(500, 90, 0.2, 'sawtooth', 0.2); break;
      case 'land': this._noiseSfx(t, 0.06, 400, 0.12); break;
      case 'tongue': this._sweep(900, 1400, 0.08, 'square', 0.09); break;
      case 'gulp': this._sweep(700, 240, 0.16, 'triangle', 0.22); break;
      case 'egg-make': this._arp(['C5', 'E5', 'G5'], 0.05, 'square', 0.12); break;
      case 'egg-throw': this._sweep(400, 900, 0.1, 'square', 0.13); break;
      case 'egg-pop': this._noiseSfx(t, 0.1, 1200, 0.18); this._sweep(600, 300, 0.08, 'square', 0.1); break;
      case 'fruit': this._arp(['E5', 'G5', 'C6'], 0.045, 'square', 0.15); break;
      case 'combo': this._arp(['C5', 'E5', 'G5', 'C6', 'E6'], 0.05, 'square', 0.16); break;
      case 'coin': this._tone(NOTE['B5'], t, 0.06, 'square', 0.12, this.sfxBus); this._tone(NOTE['E6'], t + 0.06, 0.18, 'square', 0.12, this.sfxBus); break;
      case 'heart': this._arp(['C5', 'F5', 'A5', 'C6'], 0.06, 'triangle', 0.2); break;
      case 'stomp': this._sweep(300, 120, 0.1, 'square', 0.2); this._noiseSfx(t, 0.08, 800, 0.1); break;
      case 'hurt': this._sweep(400, 150, 0.25, 'sawtooth', 0.2); break;
      case 'spring': this._sweep(200, 950, 0.22, 'square', 0.16); break;
      case 'checkpoint': this._arp(['C5', 'E5', 'G5', 'C6'], 0.07, 'triangle', 0.2); break;
      case 'happy-start': this._arp(['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6'], 0.05, 'square', 0.16); break;
      case 'clear': this._fanfare(); break;
      case 'gameover': this._arp(['E4', 'D4', 'C4', 'B3', 'A3'], 0.18, 'triangle', 0.22); break;
      case 'select': this._sweep(600, 900, 0.07, 'square', 0.12); break;
      case 'break': this._noiseSfx(t, 0.16, 500, 0.22); break;
      case 'firework': this._noiseSfx(t, 0.3, 900, 0.16); this._sweep(800, 200, 0.3, 'sine', 0.1); break;
    }
  }

  _sweep(f0, f1, dur, wave, gain, t = this._now()) {
    const o = this.ctx.createOscillator();
    o.type = wave;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.sfxBus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  _arp(notes, stepDur, wave, gain) {
    const t = this._now();
    notes.forEach((n, i) => this._tone(n, t + i * stepDur, stepDur * 2.2, wave, gain, this.sfxBus));
  }

  _noiseSfx(t, dur, freq, gain) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(this.sfxBus);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  _fanfare() {
    const seq = [
      ['C5', 0, 0.14], ['C5', 0.16, 0.14], ['C5', 0.32, 0.14], ['E5', 0.48, 0.3],
      ['D5', 0.82, 0.14], ['E5', 0.98, 0.14], ['G5', 1.14, 0.55], ['C6', 1.14, 0.55],
    ];
    const t = this._now();
    for (const [n, dt, dur] of seq) {
      this._tone(n, t + dt, dur, 'square', 0.18, this.sfxBus);
      this._tone(NOTE[n] / 2, t + dt, dur, 'triangle', 0.14, this.sfxBus);
    }
  }
}
