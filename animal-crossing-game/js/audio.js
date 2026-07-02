// ============================================================
// サウンドエンジン（WebAudio）
//   - 時間帯で変わる BGM（ループ・シーケンサ）
//   - 効果音（合成）
//   - どうぶつ語ふうボイス
// ============================================================

import { state } from './state.js';

let ctx = null;
let masterGain = null;
let bgmGain = null;
let sfxGain = null;
let voiceGain = null;

let bgmTimer = null;
let currentTuneName = null;

function ensureCtx() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  masterGain = ctx.createGain();
  masterGain.gain.value = state.muted ? 0 : 1;
  masterGain.connect(ctx.destination);
  bgmGain = ctx.createGain();
  bgmGain.gain.value = 0.20;
  bgmGain.connect(masterGain);
  sfxGain = ctx.createGain();
  sfxGain.gain.value = 0.5;
  sfxGain.connect(masterGain);
  voiceGain = ctx.createGain();
  voiceGain.gain.value = 0.32;
  voiceGain.connect(masterGain);
  return ctx;
}

export function initAudio() {
  const c = ensureCtx();
  if (c && c.state === 'suspended') c.resume();
}

export function setMuted(muted) {
  state.muted = muted;
  if (masterGain) {
    masterGain.gain.cancelScheduledValues(ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(muted ? 0 : 1, ctx.currentTime + 0.15);
  }
}

function midi(m) { return 440 * Math.pow(2, (m - 69) / 12); }

// ------------------------------------------------------------
// BGM シーケンサ
//   melody / bass: [midiノート(0=休符), 拍数] の配列
// ------------------------------------------------------------
const TUNES = {
  // あさ（5-9時）: やさしいワルツ
  morning: {
    bpm: 92, beatsPerBar: 3, wave: 'triangle', bassWave: 'sine',
    melody: [
      [72, 1], [76, 1], [79, 1], [81, 2], [79, 1],
      [76, 1], [72, 1], [74, 1], [76, 3],
      [74, 1], [77, 1], [81, 1], [83, 2], [81, 1],
      [79, 1], [76, 1], [74, 1], [72, 3],
    ],
    bass: [
      [48, 3], [52, 3], [50, 3], [43, 3],
      [50, 3], [53, 3], [43, 3], [48, 3],
    ],
  },
  // ひる（9-17時）: はずむポップ
  day: {
    bpm: 116, beatsPerBar: 4, wave: 'square', bassWave: 'triangle',
    melody: [
      [76, 0.5], [76, 0.5], [0, 0.5], [76, 0.5], [79, 1], [76, 1],
      [74, 0.5], [74, 0.5], [0, 0.5], [74, 0.5], [77, 1], [74, 1],
      [72, 0.5], [74, 0.5], [76, 0.5], [77, 0.5], [79, 1], [81, 1],
      [79, 0.5], [77, 0.5], [76, 0.5], [74, 0.5], [72, 2],
      [72, 0.5], [76, 0.5], [79, 0.5], [84, 0.5], [83, 1], [79, 1],
      [81, 0.5], [79, 0.5], [77, 0.5], [76, 0.5], [77, 1], [74, 1],
      [76, 0.5], [77, 0.5], [79, 0.5], [81, 0.5], [83, 1], [84, 1],
      [79, 1], [76, 1], [72, 2],
    ],
    bass: [
      [48, 1], [55, 1], [48, 1], [55, 1],
      [50, 1], [57, 1], [50, 1], [57, 1],
      [45, 1], [52, 1], [45, 1], [52, 1],
      [43, 1], [50, 1], [43, 1], [50, 1],
      [48, 1], [55, 1], [48, 1], [55, 1],
      [50, 1], [57, 1], [50, 1], [57, 1],
      [45, 1], [52, 1], [43, 1], [50, 1],
      [48, 1], [55, 1], [48, 2],
    ],
  },
  // ゆうがた（17-20時）: しっとり
  evening: {
    bpm: 84, beatsPerBar: 4, wave: 'triangle', bassWave: 'sine',
    melody: [
      [69, 1.5], [72, 0.5], [76, 1], [74, 1],
      [72, 1.5], [69, 0.5], [67, 2],
      [65, 1.5], [69, 0.5], [72, 1], [74, 1],
      [76, 3], [0, 1],
      [77, 1.5], [76, 0.5], [74, 1], [72, 1],
      [74, 1.5], [72, 0.5], [69, 2],
      [67, 1], [69, 1], [72, 1], [74, 1],
      [72, 3], [0, 1],
    ],
    bass: [
      [45, 2], [52, 2], [41, 2], [48, 2],
      [38, 2], [45, 2], [48, 2], [52, 2],
      [41, 2], [48, 2], [43, 2], [50, 2],
      [45, 2], [52, 2], [48, 2], [45, 2],
    ],
  },
  // よる（20-5時）: オルゴールふう
  night: {
    bpm: 72, beatsPerBar: 4, wave: 'sine', bassWave: 'sine',
    melody: [
      [79, 1], [0, 1], [76, 1], [0, 1],
      [74, 1], [76, 1], [72, 2],
      [0, 1], [69, 1], [72, 1], [76, 1],
      [74, 3], [0, 1],
      [77, 1], [0, 1], [74, 1], [0, 1],
      [72, 1], [74, 1], [69, 2],
      [0, 1], [67, 1], [69, 1], [71, 1],
      [72, 3], [0, 1],
    ],
    bass: [
      [48, 4], [45, 4], [41, 4], [43, 4],
      [48, 4], [45, 4], [43, 4], [48, 4],
    ],
  },
};

export function tuneForHour(h) {
  if (h >= 5 && h < 9) return 'morning';
  if (h >= 9 && h < 17) return 'day';
  if (h >= 17 && h < 20) return 'evening';
  return 'night';
}

function scheduleNote(time, freq, dur, wave, gainNode, vol) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = wave;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, time);
  g.gain.linearRampToValueAtTime(vol, time + 0.02);
  g.gain.setValueAtTime(vol, time + Math.max(0.03, dur - 0.08));
  g.gain.linearRampToValueAtTime(0.0001, time + dur);
  osc.connect(g).connect(gainNode);
  osc.start(time);
  osc.stop(time + dur + 0.05);
}

let seq = null; // { tune, melIdx, melTime, bassIdx, bassTime }

export function playBGM(name) {
  if (!ensureCtx()) return;
  if (currentTuneName === name) return;
  currentTuneName = name;
  const tune = TUNES[name];
  if (bgmTimer) clearInterval(bgmTimer);
  const start = ctx.currentTime + 0.2;
  seq = { tune, melIdx: 0, melTime: start, bassIdx: 0, bassTime: start };

  const tick = () => {
    if (!seq || state.muted) { /* ミュート中も時刻だけ進めず待機 */ }
    const horizon = ctx.currentTime + 0.6;
    const spb = 60 / seq.tune.bpm;
    while (seq.melTime < horizon) {
      const [note, beats] = seq.tune.melody[seq.melIdx];
      const dur = beats * spb;
      if (note > 0) scheduleNote(seq.melTime, midi(note), dur * 0.92, seq.tune.wave, bgmGain, 0.55);
      seq.melTime += dur;
      seq.melIdx = (seq.melIdx + 1) % seq.tune.melody.length;
    }
    while (seq.bassTime < horizon) {
      const [note, beats] = seq.tune.bass[seq.bassIdx];
      const dur = beats * spb;
      if (note > 0) scheduleNote(seq.bassTime, midi(note), dur * 0.9, seq.tune.bassWave, bgmGain, 0.4);
      seq.bassTime += dur;
      seq.bassIdx = (seq.bassIdx + 1) % seq.tune.bass.length;
    }
  };
  tick();
  bgmTimer = setInterval(tick, 250);
}

export function updateBGMByHour(hour) {
  playBGM(tuneForHour(hour));
}

// ------------------------------------------------------------
// 効果音
// ------------------------------------------------------------
function blip(freq, dur, wave = 'square', vol = 0.4, slideTo = null, delay = 0) {
  if (!ensureCtx()) return;
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = wave;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(g).connect(sfxGain);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noiseBurst(dur, vol = 0.3, filterFreq = 2000, delay = 0) {
  if (!ensureCtx()) return;
  const t = ctx.currentTime + delay;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = filterFreq;
  const g = ctx.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(sfxGain);
  src.start(t);
}

export const sfx = {
  tap() { blip(880, 0.06, 'square', 0.2); },
  select() { blip(660, 0.05, 'square', 0.25); blip(990, 0.07, 'square', 0.25, null, 0.05); },
  cancel() { blip(440, 0.08, 'square', 0.25, 330); },
  coin() { blip(988, 0.05, 'square', 0.3); blip(1319, 0.16, 'square', 0.3, null, 0.06); },
  buy() { blip(784, 0.06, 'triangle', 0.35); blip(988, 0.06, 'triangle', 0.35, null, 0.07); blip(1175, 0.14, 'triangle', 0.35, null, 0.14); },
  splash() { noiseBurst(0.28, 0.4, 900); blip(300, 0.15, 'sine', 0.2, 120); },
  plop() { blip(500, 0.1, 'sine', 0.3, 200); },
  bite() { blip(200, 0.1, 'sine', 0.5, 90); noiseBurst(0.12, 0.3, 600); },
  reel() { noiseBurst(0.35, 0.35, 2500); },
  catch() { // ファンファーレ
    const notes = [72, 76, 79, 84];
    notes.forEach((n, i) => blip(midi(n), 0.16, 'square', 0.3, null, i * 0.09));
    blip(midi(88), 0.4, 'triangle', 0.3, null, 0.38);
  },
  fanfare() {
    const notes = [72, 72, 72, 76, 79, 84];
    notes.forEach((n, i) => blip(midi(n), 0.14, 'square', 0.28, null, i * 0.11));
  },
  rustle() { noiseBurst(0.22, 0.4, 4200); noiseBurst(0.18, 0.3, 3200, 0.08); },
  thud() { blip(120, 0.12, 'sine', 0.5, 60); },
  dig() { noiseBurst(0.16, 0.5, 700); blip(180, 0.08, 'sine', 0.3, 90, 0.02); },
  hitRock() { noiseBurst(0.08, 0.5, 1500); blip(1100, 0.05, 'square', 0.2, null, 0.01); },
  swing() { noiseBurst(0.14, 0.28, 3000); },
  miss() { blip(330, 0.12, 'sawtooth', 0.2, 165); },
  pickup() { blip(740, 0.06, 'triangle', 0.3); blip(1109, 0.09, 'triangle', 0.3, null, 0.06); },
  pop() { blip(600, 0.05, 'square', 0.4, 1200); noiseBurst(0.08, 0.3, 2000); },
  bee() { blip(220, 0.5, 'sawtooth', 0.18, 260); },
  door() { blip(523, 0.1, 'sine', 0.3); blip(659, 0.18, 'sine', 0.3, null, 0.1); },
  water() { noiseBurst(0.4, 0.25, 1800); },
  step() { noiseBurst(0.05, 0.12, 1000); },
  newRecord() {
    const notes = [76, 79, 84, 88, 91];
    notes.forEach((n, i) => blip(midi(n), 0.13, 'triangle', 0.3, null, i * 0.08));
  },
  bell() { blip(1568, 0.5, 'sine', 0.25); blip(2093, 0.4, 'sine', 0.15, null, 0.02); },
  wave() { noiseBurst(1.2, 0.06, 500); },
};

// ------------------------------------------------------------
// どうぶつ語ふうボイス（1文字ごとにピッチの違うブリップ）
// ------------------------------------------------------------
let voiceSeq = 0;
export function speak(text, basePitch = 1.0) {
  if (!ensureCtx() || state.muted) return;
  voiceSeq++;
  const mySeq = voiceSeq;
  const chars = String(text).replace(/[\s。、！？!?…♪〜ー・「」]/g, '');
  const n = Math.min(chars.length, 22);
  const t0 = ctx.currentTime;
  for (let i = 0; i < n; i++) {
    if (mySeq !== voiceSeq) break;
    const code = chars.charCodeAt(i);
    const semitone = (code % 10) - 4 + (i % 3);
    const freq = 320 * basePitch * Math.pow(2, semitone / 14);
    const t = t0 + i * 0.052;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.14, t + 0.045);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.5, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 1800 * basePitch;
    osc.connect(f).connect(g).connect(voiceGain);
    osc.start(t);
    osc.stop(t + 0.06);
  }
}

export function stopSpeak() { voiceSeq++; }

export function vibrate(pattern) {
  if (navigator.vibrate) { try { navigator.vibrate(pattern); } catch { /* noop */ } }
}
