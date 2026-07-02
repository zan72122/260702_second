/* ================================================================
   audio.js — WebAudio synthesized cute SFX + music-box BGM.
   No audio files; everything is generated.
   ================================================================ */

import { save, persist } from "./state.js";

let ctx = null;
let bgmTimer = null;
let bgmGain = null;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

/* one enveloped oscillator note */
function tone({ freq = 880, dur = 0.18, type = "sine", vol = 0.2, delay = 0, slide = 0, out = null }) {
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
  o.connect(g).connect(out || a.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

function noise({ dur = 0.12, vol = 0.12, delay = 0, hp = 800 }) {
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime + delay;
  const len = Math.max(1, Math.floor(a.sampleRate * dur));
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = hp;
  const g = a.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  src.connect(f).connect(g).connect(a.destination);
  src.start(t0);
}

/* ---------------- SFX ---------------- */

export const sfx = {
  tap()      { if (!save.sfx) return; tone({ freq: 720, dur: 0.09, type: "triangle", vol: 0.22 }); tone({ freq: 1080, dur: 0.09, type: "sine", vol: 0.12, delay: 0.02 }); },
  pop()      { if (!save.sfx) return; tone({ freq: 420, dur: 0.1, type: "triangle", vol: 0.25, slide: 420 }); },
  pick()     { if (!save.sfx) return; tone({ freq: 660, dur: 0.1, type: "triangle", vol: 0.22 }); tone({ freq: 990, dur: 0.12, type: "triangle", vol: 0.18, delay: 0.06 }); },
  no()       { if (!save.sfx) return; tone({ freq: 240, dur: 0.16, type: "square", vol: 0.1 }); tone({ freq: 200, dur: 0.2, type: "square", vol: 0.1, delay: 0.12 }); },
  crack()    { if (!save.sfx) return; noise({ dur: 0.08, vol: 0.2, hp: 1400 }); tone({ freq: 300, dur: 0.08, type: "triangle", vol: 0.16, delay: 0.02, slide: -120 }); },
  plop()     { if (!save.sfx) return; tone({ freq: 300, dur: 0.14, type: "sine", vol: 0.24, slide: -140 }); },
  swish()    { if (!save.sfx) return; noise({ dur: 0.1, vol: 0.06, hp: 2200 }); },
  stir()     { if (!save.sfx) return; noise({ dur: 0.09, vol: 0.05, hp: 1000 }); },
  chop()     { if (!save.sfx) return; noise({ dur: 0.05, vol: 0.18, hp: 500 }); tone({ freq: 190, dur: 0.07, type: "triangle", vol: 0.28, slide: -60 }); },
  ding()     { if (!save.sfx) return; tone({ freq: 1318, dur: 0.5, type: "sine", vol: 0.2 }); tone({ freq: 1976, dur: 0.6, type: "sine", vol: 0.1, delay: 0.03 }); },
  sparkle()  { if (!save.sfx) return; [1568, 2093, 2637].forEach((f, i) => tone({ freq: f, dur: 0.14, type: "sine", vol: 0.09, delay: i * 0.05 })); },
  heart()    { if (!save.sfx) return; tone({ freq: 880, dur: 0.12, type: "sine", vol: 0.16 }); tone({ freq: 1174, dur: 0.16, type: "sine", vol: 0.14, delay: 0.07 }); },
  perfect()  { if (!save.sfx) return; [784, 988, 1175, 1568].forEach((f, i) => tone({ freq: f, dur: 0.16, type: "triangle", vol: 0.16, delay: i * 0.07 })); },
  fanfare()  {
    if (!save.sfx) return;
    const seq = [523, 659, 784, 1047, 784, 1047];
    seq.forEach((f, i) => tone({ freq: f, dur: i >= 4 ? 0.4 : 0.16, type: "triangle", vol: 0.18, delay: i * 0.13 }));
    [1319, 1568, 2093].forEach((f, i) => tone({ freq: f, dur: 0.5, type: "sine", vol: 0.08, delay: 0.7 + i * 0.05 }));
  },
  timerTick(){ if (!save.sfx) return; tone({ freq: 980, dur: 0.05, type: "square", vol: 0.05 }); },
  whoosh()   { if (!save.sfx) return; noise({ dur: 0.25, vol: 0.08, hp: 400 }); },
};

/* --------------- BGM: music-box loop ---------------- */
/* A gentle waltz-y music box: melody + soft bass, 3/4 feel. */

const MELODY = [
  // [semitone offset from C5, beat length]  (-99 = rest)
  [0, 1], [4, 1], [7, 1], [12, 2], [7, 1],
  [9, 1], [7, 1], [4, 1], [5, 2], [4, 1],
  [2, 1], [4, 1], [5, 1], [7, 2], [4, 1],
  [0, 1], [2, 1], [4, 1], [2, 2], [-99, 1],
  [0, 1], [4, 1], [7, 1], [12, 2], [16, 1],
  [14, 1], [12, 1], [9, 1], [7, 2], [4, 1],
  [5, 1], [9, 1], [7, 1], [4, 2], [2, 1],
  [0, 1], [2, 1], [4, 1], [0, 2], [-99, 1],
];
const BASS = [0, -5, -3, -8]; // root cycle per bar (C, G, A, F)

function playMusicBoxLoop() {
  const a = ac();
  if (!a || !save.bgm) return;
  if (!bgmGain) {
    bgmGain = a.createGain();
    bgmGain.gain.value = 0.5;
    bgmGain.connect(a.destination);
  }
  const beat = 0.32;
  const C5 = 523.25;
  let t = 0;
  let bar = 0;
  MELODY.forEach(([st, len], i) => {
    if (i % 3 === 0) {
      const root = C5 / 2 * Math.pow(2, BASS[bar % 4] / 12);
      tone({ freq: root / 2, dur: beat * 2.6, type: "sine", vol: 0.05, delay: t, out: bgmGain });
      tone({ freq: root, dur: beat * 1.4, type: "triangle", vol: 0.035, delay: t + beat, out: bgmGain });
      bar++;
    }
    if (st !== -99) {
      const f = C5 * Math.pow(2, st / 12);
      tone({ freq: f, dur: beat * len * 1.15, type: "sine", vol: 0.085, delay: t, out: bgmGain });
      tone({ freq: f * 2, dur: beat * len * 0.9, type: "sine", vol: 0.02, delay: t, out: bgmGain });
    }
    t += beat * len;
  });
  bgmTimer = setTimeout(playMusicBoxLoop, t * 1000);
}

export function startBgm() {
  if (bgmTimer || !save.bgm) return;
  playMusicBoxLoop();
}

export function stopBgm() {
  clearTimeout(bgmTimer);
  bgmTimer = null;
}

export function setBgm(on) {
  save.bgm = on;
  persist();
  if (on) startBgm();
  else stopBgm();
}

export function setSfx(on) {
  save.sfx = on;
  persist();
}

/* unlock audio on the first user gesture (iOS requirement) */
export function armAudio() {
  const kick = () => {
    ac();
    startBgm();
    window.removeEventListener("pointerdown", kick);
  };
  window.addEventListener("pointerdown", kick);
}

export function vibrate(ms = 12) {
  if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) { /* ok */ } }
}
