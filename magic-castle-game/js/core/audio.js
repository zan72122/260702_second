// WebAudio によるオルゴール風 BGM と効果音(素材ファイル不要)
const NOTE = {};
{
  const names = ['C', 'Cs', 'D', 'Ds', 'E', 'F', 'Fs', 'G', 'Gs', 'A', 'As', 'B'];
  for (let oct = 2; oct <= 7; oct++) {
    names.forEach((n, i) => {
      NOTE[n + oct] = 440 * Math.pow(2, (oct * 12 + i - 57) / 12);
    });
  }
}

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.bgmGain = null;
    this.sfxGain = null;
    this.enabled = true;
    this.bgmName = null;
    this._seqTimer = null;
    this._step = 0;
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(this.ctx.destination);
    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.value = 0.5;
    this.bgmGain.connect(this.master);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.8;
    this.sfxGain.connect(this.master);
    // リバーブ風ディレイ(お城の広間っぽさ)
    this.delay = this.ctx.createDelay(0.6);
    this.delay.delayTime.value = 0.28;
    this.delayGain = this.ctx.createGain();
    this.delayGain.gain.value = 0.22;
    this.bgmGain.connect(this.delay);
    this.delay.connect(this.delayGain);
    this.delayGain.connect(this.master);
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  setEnabled(on) {
    this.enabled = on;
    if (this.master) this.master.gain.value = on ? 0.9 : 0;
  }

  // ---- 音符 ----
  _tone(freq, t0, dur, { type = 'sine', gain = 0.2, dest = null, attack = 0.005, sweep = 0 } = {}) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (sweep) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + sweep), t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    osc.connect(g);
    g.connect(dest || this.sfxGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  // オルゴール音(倍音つき)
  _bell(name, t0, dur = 1.2, vol = 0.16) {
    const f = NOTE[name];
    if (!f) return;
    this._tone(f, t0, dur, { type: 'sine', gain: vol, dest: this.bgmGain });
    this._tone(f * 2, t0, dur * 0.6, { type: 'sine', gain: vol * 0.35, dest: this.bgmGain });
    this._tone(f * 4, t0, dur * 0.25, { type: 'sine', gain: vol * 0.12, dest: this.bgmGain });
  }

  _bass(name, t0, dur = 0.5, vol = 0.10) {
    const f = NOTE[name];
    if (!f) return;
    this._tone(f, t0, dur, { type: 'triangle', gain: vol, dest: this.bgmGain });
  }

  // ---- BGM シーケンサ ----
  playBGM(name) {
    if (!this.ctx || this.bgmName === name) return;
    this.stopBGM();
    this.bgmName = name;
    this._step = 0;
    const song = SONGS[name];
    if (!song) return;
    const stepDur = 60 / song.bpm / 2; // 8分音符
    let nextT = this.ctx.currentTime + 0.1;
    const loop = () => {
      if (this.bgmName !== name) return;
      const ahead = this.ctx.currentTime + 0.5;
      while (nextT < ahead) {
        const i = this._step % song.length;
        const mel = song.melody[i];
        const bas = song.bass[i % song.bass.length];
        if (mel) (Array.isArray(mel) ? mel : [mel]).forEach((n) => this._bell(n, nextT, stepDur * 3.2, song.vol ?? 0.15));
        if (bas) this._bass(bas, nextT, stepDur * 1.8);
        nextT += stepDur;
        this._step++;
      }
      this._seqTimer = setTimeout(loop, 120);
    };
    loop();
  }

  stopBGM() {
    this.bgmName = null;
    if (this._seqTimer) { clearTimeout(this._seqTimer); this._seqTimer = null; }
  }

  // ---- SFX ----
  sfx(name) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    switch (name) {
      case 'coin':
        this._tone(988, t, 0.09, { type: 'square', gain: 0.08 });
        this._tone(1319, t + 0.08, 0.22, { type: 'square', gain: 0.08 });
        break;
      case 'sparkle':
        for (let i = 0; i < 5; i++) {
          this._tone(1200 + i * 320 + Math.random() * 120, t + i * 0.045, 0.25, { type: 'sine', gain: 0.06 });
        }
        break;
      case 'magic':
        this._tone(500, t, 0.5, { type: 'sawtooth', gain: 0.05, sweep: 900 });
        for (let i = 0; i < 7; i++) {
          this._tone(900 + Math.random() * 1400, t + 0.05 + i * 0.05, 0.3, { type: 'sine', gain: 0.05 });
        }
        break;
      case 'talk':
        this._tone(600 + Math.random() * 150, t, 0.07, { type: 'square', gain: 0.045 });
        break;
      case 'splash':
        this._tone(300, t, 0.3, { type: 'sine', gain: 0.1, sweep: -220 });
        this._noise(t, 0.35, 0.07, 900);
        break;
      case 'reel':
        this._tone(200, t, 0.08, { type: 'square', gain: 0.05, sweep: 60 });
        break;
      case 'catch':
        this._tone(659, t, 0.1, { type: 'triangle', gain: 0.1 });
        this._tone(880, t + 0.09, 0.1, { type: 'triangle', gain: 0.1 });
        this._tone(1319, t + 0.18, 0.3, { type: 'triangle', gain: 0.1 });
        break;
      case 'fanfare': {
        const seq = ['C5', 'E5', 'G5', 'C6'];
        seq.forEach((n, i) => this._tone(NOTE[n], t + i * 0.12, 0.4, { type: 'triangle', gain: 0.1 }));
        this._tone(NOTE.E6, t + 0.5, 0.7, { type: 'triangle', gain: 0.09 });
        break;
      }
      case 'plant':
        this._tone(220, t, 0.12, { type: 'sine', gain: 0.09, sweep: 120 });
        break;
      case 'water':
        this._noise(t, 0.4, 0.05, 2400);
        this._tone(700, t + 0.05, 0.2, { type: 'sine', gain: 0.04, sweep: 300 });
        break;
      case 'pop':
        this._tone(400, t, 0.12, { type: 'sine', gain: 0.1, sweep: 500 });
        break;
      case 'error':
        this._tone(220, t, 0.15, { type: 'square', gain: 0.06 });
        this._tone(180, t + 0.14, 0.25, { type: 'square', gain: 0.06 });
        break;
      case 'heart':
        this._tone(784, t, 0.14, { type: 'sine', gain: 0.09 });
        this._tone(1047, t + 0.12, 0.3, { type: 'sine', gain: 0.09 });
        break;
      case 'firework':
        this._tone(160, t, 0.7, { type: 'sine', gain: 0.1, sweep: -100 });
        this._noise(t + 0.02, 0.6, 0.08, 1200);
        break;
      case 'note':
        this._tone(NOTE[['C5', 'E5', 'G5', 'B5'][Math.floor(Math.random() * 4)]], t, 0.25, { type: 'triangle', gain: 0.09 });
        break;
      case 'miss':
        this._tone(200, t, 0.2, { type: 'sawtooth', gain: 0.05, sweep: -80 });
        break;
      case 'camera':
        this._tone(1600, t, 0.05, { type: 'square', gain: 0.07 });
        this._tone(1100, t + 0.06, 0.05, { type: 'square', gain: 0.07 });
        break;
      case 'ghost':
        this._tone(300, t, 0.5, { type: 'sine', gain: 0.07, sweep: 500 });
        this._tone(150, t, 0.5, { type: 'triangle', gain: 0.05, sweep: 260 });
        break;
    }
  }

  _noise(t0, dur, gain, filterFreq = 1000) {
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.connect(f); f.connect(g); g.connect(this.sfxGain);
    src.start(t0);
  }
}

// ---- 楽曲データ(8分音符グリッド) ----
const _ = null;
const SONGS = {
  // 昼:ワルツ風メインテーマ
  day: {
    bpm: 96, length: 64, vol: 0.15,
    melody: [
      'G4', _, 'C5', _, 'E5', _, 'G5', _, 'E5', _, 'C5', _, 'E5', _, _, _,
      'A4', _, 'D5', _, 'F5', _, 'A5', _, 'F5', _, 'D5', _, 'F5', _, _, _,
      'G4', _, 'C5', _, 'E5', _, 'G5', _, ['E5', 'C6'], _, 'B5', _, 'A5', _, 'G5', _,
      'F5', _, 'E5', _, 'D5', _, 'E5', _, ['C5', 'E5'], _, _, _, _, _, _, _,
    ],
    bass: [
      'C3', _, 'G3', _, 'E3', _, 'G3', _, 'C3', _, 'G3', _, 'E3', _, 'G3', _,
      'F3', _, 'A3', _, 'D3', _, 'A3', _, 'F3', _, 'A3', _, 'D3', _, 'A3', _,
      'C3', _, 'G3', _, 'E3', _, 'G3', _, 'A3', _, 'E3', _, 'F3', _, 'G3', _,
      'D3', _, 'F3', _, 'G3', _, 'B3', _, 'C3', _, 'G3', _, 'C4', _, _, _,
    ],
  },
  // 夜:ゆったり星空
  night: {
    bpm: 72, length: 64, vol: 0.13,
    melody: [
      'E5', _, _, _, 'B4', _, _, _, 'C5', _, _, _, 'G4', _, _, _,
      'A4', _, _, _, 'C5', _, 'E5', _, 'D5', _, _, _, _, _, _, _,
      'E5', _, _, _, 'G5', _, _, _, 'F5', _, 'E5', _, 'D5', _, _, _,
      ['C5', 'E5'], _, _, _, 'B4', _, _, _, ['A4', 'C5'], _, _, _, _, _, _, _,
    ],
    bass: [
      'A2', _, _, _, 'E3', _, _, _, 'A2', _, _, _, 'E3', _, _, _,
      'F3', _, _, _, 'C3', _, _, _, 'G3', _, _, _, 'D3', _, _, _,
      'A2', _, _, _, 'E3', _, _, _, 'D3', _, _, _, 'G3', _, _, _,
      'F3', _, _, _, 'E3', _, _, _, 'A2', _, _, _, _, _, _, _,
    ],
  },
  // ダンスパーティー
  dance: {
    bpm: 132, length: 32, vol: 0.16,
    melody: [
      'C5', 'E5', 'G5', 'E5', 'A5', _, 'G5', _, 'F5', 'A5', 'C6', 'A5', 'G5', _, 'E5', _,
      'D5', 'F5', 'A5', 'F5', 'B5', _, 'A5', _, ['G5', 'C6'], _, 'E5', 'G5', 'C6', _, _, _,
    ],
    bass: [
      'C3', 'C3', 'G3', 'C3', 'F3', 'F3', 'C3', 'F3', 'D3', 'D3', 'A3', 'D3', 'G3', 'G3', 'D3', 'G3',
      'D3', 'D3', 'A3', 'D3', 'G3', 'G3', 'B2', 'G3', 'C3', 'G3', 'C3', 'G3', 'C3', 'G3', 'C4', _,
    ],
  },
};

export const audio = new AudioEngine();
