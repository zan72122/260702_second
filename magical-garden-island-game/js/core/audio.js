// WebAudio によるプロシージャルBGM & 効果音(音源ファイル不要)
import { pick, rand } from './utils.js';

export class AudioSystem {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.musicTimer = null;
    this.step = 0;
    this._unlocked = false;
  }

  // 最初のユーザー操作で呼ぶ(iOS対応)
  unlock() {
    if (this._unlocked) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    // マスター
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.6;
    this.master.connect(this.ctx.destination);
    // BGM系統(ディレイでふんわり)
    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = 0.5;
    const delay = this.ctx.createDelay(1);
    delay.delayTime.value = 0.28;
    const fb = this.ctx.createGain();
    fb.gain.value = 0.3;
    const wet = this.ctx.createGain();
    wet.gain.value = 0.35;
    this.musicBus.connect(this.master);
    this.musicBus.connect(delay);
    delay.connect(fb).connect(delay);
    delay.connect(wet).connect(this.master);
    // SFX系統
    this.sfxBus = this.ctx.createGain();
    this.sfxBus.gain.value = 0.85;
    this.sfxBus.connect(this.master);
    this._unlocked = true;
    this.startMusic();
  }

  setEnabled(on) {
    this.enabled = on;
    if (this.master) this.master.gain.value = on ? 0.6 : 0;
  }

  _tone(freq, { type = 'sine', dur = 0.3, vol = 0.2, attack = 0.01, bus = null, detune = 0, when = 0 } = {}) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(bus || this.sfxBus);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  // ---------------- BGM ----------------
  // オルゴール風:ペンタトニックのゆったりアルペジオ
  startMusic() {
    if (this.musicTimer) return;
    const scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.7, 1318.5]; // C D E G A ...
    const bass = [130.81, 98.0, 110.0, 146.83]; // C G A D
    const pattern = [0, 2, 4, 7, 4, 2, 5, 3];
    const stepDur = 0.42;
    const tick = () => {
      if (!this.ctx) return;
      const bar = Math.floor(this.step / 8) % 4;
      const idx = this.step % 8;
      // メロディ(すこしランダムにきらめく)
      let note = scale[(pattern[idx] + (bar % 2 === 1 ? 1 : 0)) % scale.length];
      if (Math.random() < 0.15) note = pick(scale);
      this._tone(note, { type: 'triangle', dur: 1.1, vol: 0.10, attack: 0.005, bus: this.musicBus });
      this._tone(note * 2, { type: 'sine', dur: 0.9, vol: 0.035, attack: 0.005, bus: this.musicBus });
      // ベース(小節あたま)
      if (idx === 0) {
        this._tone(bass[bar], { type: 'sine', dur: 2.6, vol: 0.10, attack: 0.03, bus: this.musicBus });
        this._tone(bass[bar] * 1.5, { type: 'sine', dur: 2.2, vol: 0.045, attack: 0.03, bus: this.musicBus });
      }
      // キラキラ(たまに)
      if (Math.random() < 0.22) {
        this._tone(rand(1800, 3200), { type: 'sine', dur: 0.5, vol: 0.02, bus: this.musicBus, when: stepDur * 0.5 });
      }
      this.step++;
    };
    tick();
    this.musicTimer = setInterval(tick, stepDur * 1000);
  }

  // ---------------- 効果音 ----------------
  tap() { this._tone(880, { type: 'sine', dur: 0.08, vol: 0.12 }); }

  plant() {
    this._tone(392, { type: 'triangle', dur: 0.12, vol: 0.2 });
    this._tone(587, { type: 'triangle', dur: 0.15, vol: 0.18, when: 0.08 });
  }

  water() {
    // シャラシャラ(高音の粒)
    for (let i = 0; i < 6; i++) {
      this._tone(rand(1400, 2600), { type: 'sine', dur: 0.14, vol: 0.05, when: i * 0.05 });
    }
  }

  bloom() {
    [523, 659, 784, 1047].forEach((f, i) =>
      this._tone(f, { type: 'triangle', dur: 0.5, vol: 0.14, when: i * 0.08 }));
  }

  harvest() {
    [784, 988, 1175, 1568].forEach((f, i) =>
      this._tone(f, { type: 'sine', dur: 0.35, vol: 0.13, when: i * 0.06 }));
  }

  coin() {
    this._tone(1319, { type: 'square', dur: 0.09, vol: 0.05 });
    this._tone(1760, { type: 'square', dur: 0.18, vol: 0.05, when: 0.07 });
  }

  buy() {
    this._tone(659, { type: 'triangle', dur: 0.12, vol: 0.16 });
    this._tone(880, { type: 'triangle', dur: 0.12, vol: 0.16, when: 0.09 });
    this._tone(1319, { type: 'triangle', dur: 0.25, vol: 0.16, when: 0.18 });
  }

  error() { this._tone(196, { type: 'square', dur: 0.18, vol: 0.07 }); }

  butterfly() {
    [1047, 1319, 1568, 2093].forEach((f, i) =>
      this._tone(f, { type: 'sine', dur: 0.22, vol: 0.1, when: i * 0.05 }));
  }

  place() {
    this._tone(440, { type: 'triangle', dur: 0.1, vol: 0.18 });
    this._tone(659, { type: 'triangle', dur: 0.2, vol: 0.15, when: 0.07 });
  }

  dress() {
    [659, 784, 988, 1319, 1568].forEach((f, i) =>
      this._tone(f, { type: 'sine', dur: 0.3, vol: 0.1, when: i * 0.05 }));
  }

  fanfare() {
    const seq = [523, 659, 784, 1047, 784, 1047, 1319, 1568];
    seq.forEach((f, i) => {
      this._tone(f, { type: 'triangle', dur: 0.4, vol: 0.15, when: i * 0.11 });
      this._tone(f / 2, { type: 'sine', dur: 0.4, vol: 0.08, when: i * 0.11 });
    });
  }

  questDone() {
    [784, 1047, 1319].forEach((f, i) =>
      this._tone(f, { type: 'triangle', dur: 0.4, vol: 0.15, when: i * 0.09 }));
  }

  shutter() {
    this._tone(2200, { type: 'square', dur: 0.05, vol: 0.08 });
    this._tone(1100, { type: 'square', dur: 0.06, vol: 0.08, when: 0.06 });
  }

  pop() { this._tone(rand(600, 900), { type: 'sine', dur: 0.09, vol: 0.1 }); }
}
