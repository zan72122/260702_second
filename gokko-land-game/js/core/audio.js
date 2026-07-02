// WebAudio によるサウンド(全て手続き生成・素材ファイル不要)
export class AudioSys {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.bgmGain = null;
    this.sfxGain = null;
    this.bgmTimer = null;
    this.bgmStep = 0;
    this.currentSong = null;
  }

  // iOSはユーザー操作でしか AudioContext を開始できない
  unlock() {
    if (this.ctx) { this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(this.ctx.destination);
    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.value = 0.24;
    this.bgmGain.connect(this.master);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.55;
    this.sfxGain.connect(this.master);
  }

  setEnabled(on) {
    this.enabled = on;
    if (this.master) this.master.gain.value = on ? 0.9 : 0;
  }

  tone({ freq = 440, dur = 0.15, type = 'sine', vol = 1, slide = 0, delay = 0, dest = null }) {
    if (!this.ctx || !this.enabled) return;
    const t0 = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol * 0.4, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(dest || this.sfxGain);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  noise({ dur = 0.2, vol = 0.5, freq = 1200, delay = 0, q = 1 }) {
    if (!this.ctx || !this.enabled) return;
    const t0 = this.ctx.currentTime + delay;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.value = vol * 0.5;
    src.connect(f); f.connect(g); g.connect(this.sfxGain);
    src.start(t0);
  }

  // ============ SFX ============
  tap() { this.tone({ freq: 660, dur: 0.08, type: 'triangle', slide: 220 }); }
  pop() { this.tone({ freq: 320, dur: 0.1, type: 'sine', slide: 480, vol: 1.1 }); }
  good() {
    this.tone({ freq: 660, dur: 0.1, type: 'triangle' });
    this.tone({ freq: 880, dur: 0.14, type: 'triangle', delay: 0.09 });
  }
  bad() { this.tone({ freq: 220, dur: 0.25, type: 'sawtooth', slide: -80, vol: 0.5 }); }
  coin() {
    this.tone({ freq: 988, dur: 0.07, type: 'square', vol: 0.5 });
    this.tone({ freq: 1319, dur: 0.2, type: 'square', vol: 0.5, delay: 0.07 });
  }
  sparkle() {
    for (let i = 0; i < 4; i++) this.tone({ freq: 1200 + i * 300, dur: 0.08, type: 'sine', vol: 0.5, delay: i * 0.05 });
  }
  fanfare() {
    const seq = [523, 523, 523, 659, 784, 659, 784, 1047];
    const durs = [0.12, 0.12, 0.12, 0.22, 0.14, 0.14, 0.18, 0.5];
    let t = 0;
    seq.forEach((f, i) => {
      this.tone({ freq: f, dur: durs[i], type: 'square', vol: 0.55, delay: t });
      this.tone({ freq: f / 2, dur: durs[i], type: 'triangle', vol: 0.5, delay: t });
      t += durs[i] * 0.9;
    });
  }
  stamp() {
    this.noise({ dur: 0.12, vol: 0.7, freq: 500 });
    this.tone({ freq: 180, dur: 0.15, type: 'sine', vol: 1 });
  }
  beep() { this.tone({ freq: 1760, dur: 0.1, type: 'square', vol: 0.4 }); }
  horn() {
    this.tone({ freq: 392, dur: 0.18, type: 'sawtooth', vol: 0.5 });
    this.tone({ freq: 494, dur: 0.24, type: 'sawtooth', vol: 0.5, delay: 0.14 });
  }
  splash() { this.noise({ dur: 0.3, vol: 0.35, freq: 2400, q: 0.6 }); }
  sizzle() { this.noise({ dur: 0.4, vol: 0.25, freq: 4000, q: 0.4 }); }
  whistle() { this.tone({ freq: 2200, dur: 0.4, type: 'sine', slide: 500, vol: 0.4 }); }
  ding() {
    this.tone({ freq: 1568, dur: 0.4, type: 'sine', vol: 0.6 });
    this.tone({ freq: 2093, dur: 0.5, type: 'sine', vol: 0.4, delay: 0.02 });
  }
  gachaRoll() {
    for (let i = 0; i < 6; i++) this.noise({ dur: 0.06, vol: 0.4, freq: 800 + i * 120, delay: i * 0.08 });
  }
  siren() {
    this.tone({ freq: 700, dur: 0.3, type: 'square', slide: 300, vol: 0.25 });
    this.tone({ freq: 1000, dur: 0.3, type: 'square', slide: -300, vol: 0.25, delay: 0.3 });
  }

  // ============ BGM(簡易シーケンサー) ============
  playBgm(songName) {
    if (this.currentSong === songName) return;
    this.stopBgm();
    this.currentSong = songName;
    if (!this.ctx) return;
    const songs = {
      // [メロディ(0=休符), ベース, テンポms]
      town: {
        mel: [523, 587, 659, 784, 659, 587, 523, 0, 659, 784, 880, 1047, 880, 784, 659, 0,
              523, 659, 784, 880, 784, 659, 587, 0, 659, 587, 523, 587, 659, 523, 0, 0],
        bass: [131, 0, 196, 0, 165, 0, 196, 0, 131, 0, 196, 0, 165, 0, 196, 0,
               147, 0, 220, 0, 165, 0, 196, 0, 131, 0, 196, 0, 131, 0, 131, 0],
        tempo: 210,
      },
      game: {
        mel: [659, 0, 659, 784, 880, 784, 659, 523, 587, 0, 587, 659, 784, 659, 587, 523,
              659, 0, 880, 0, 1047, 880, 784, 659, 587, 659, 587, 523, 494, 523, 0, 0],
        bass: [131, 131, 0, 131, 165, 165, 0, 165, 147, 147, 0, 147, 196, 196, 0, 196,
               131, 131, 0, 131, 165, 165, 0, 165, 147, 147, 0, 147, 131, 131, 131, 0],
        tempo: 170,
      },
    };
    const song = songs[songName] || songs.town;
    this.bgmStep = 0;
    const stepFn = () => {
      const i = this.bgmStep % song.mel.length;
      const m = song.mel[i];
      const b = song.bass[i];
      if (m) this.tone({ freq: m, dur: song.tempo / 1000 * 0.9, type: 'triangle', vol: 0.75, dest: this.bgmGain });
      if (b) this.tone({ freq: b, dur: song.tempo / 1000 * 0.85, type: 'sine', vol: 1.1, dest: this.bgmGain });
      if (i % 4 === 0) this.noiseTick();
      this.bgmStep++;
    };
    stepFn();
    this.bgmTimer = setInterval(stepFn, (songs[songName] || songs.town).tempo);
  }

  noiseTick() {
    if (!this.ctx || !this.enabled) return;
    const len = Math.floor(this.ctx.sampleRate * 0.03);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) * 0.3;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 6000;
    src.connect(f); f.connect(this.bgmGain);
    src.start();
  }

  stopBgm() {
    if (this.bgmTimer) clearInterval(this.bgmTimer);
    this.bgmTimer = null;
    this.currentSong = null;
  }
}
