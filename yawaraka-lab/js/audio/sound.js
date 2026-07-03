/* やわらかラボ — procedural WebAudio sound (zero assets) */
(function () {
  'use strict';
  window.YL = window.YL || {};

  // -------------------------------------------------------------------------
  // Master amplitude (post-compressor). Kept low: pleasant to overhear.
  const MASTER_LEVEL = 0.5;
  // Continuous voice modulation time constant (setTargetAtTime): soft, no clicks.
  const TC = 0.06;

  // Material sound profiles (keyed by material soundId / id).
  // squishFreq   : bandpass (or highpass cutoff for dry) centre, Hz
  // squishQ      : bandpass resonance
  // noiseTone    : lowpass over the squish noise (lower = softer/"pinker")
  // stretchBase  : triangle base freq for the stretch (びよ〜ん) voice
  // stretchRise  : how far pitch climbs as stretch -> 1
  // jiggleFreq   : low sine freq for wobble
  // jiggleVib    : vibrato LFO rate (Hz)
  // vibDepth     : max vibrato depth (Hz) at jiggle == 1
  // flags        : dry / bubbly / fizzy / crackle / airy / wetTear
  const PROFILES = {
    nendo:  { squishFreq: 220, squishQ: 1.0, noiseTone: 1500, stretchBase: 130, stretchRise: 1.2, jiggleFreq: 140, jiggleVib: 5.5, vibDepth: 4 },
    slime:  { squishFreq: 150, squishQ: 3.0, noiseTone: 900,  stretchBase: 120, stretchRise: 1.6, jiggleFreq: 120, jiggleVib: 6,   vibDepth: 5, bubbly: true },
    mochi:  { squishFreq: 200, squishQ: 1.5, noiseTone: 1400, stretchBase: 90,  stretchRise: 3.0, jiggleFreq: 130, jiggleVib: 5,   vibDepth: 6 },
    pan:    { squishFreq: 240, squishQ: 0.9, noiseTone: 1200, stretchBase: 140, stretchRise: 1.0, jiggleFreq: 150, jiggleVib: 5,   vibDepth: 3, airy: true },
    purin:  { squishFreq: 230, squishQ: 1.2, noiseTone: 1600, stretchBase: 150, stretchRise: 1.4, jiggleFreq: 110, jiggleVib: 7,   vibDepth: 10, wetTear: true },
    cream:  { squishFreq: 320, squishQ: 0.7, noiseTone: 1000, stretchBase: 200, stretchRise: 1.2, jiggleFreq: 170, jiggleVib: 6,   vibDepth: 4, airy: true },
    choco:  { squishFreq: 300, squishQ: 1.1, noiseTone: 1800, stretchBase: 180, stretchRise: 1.5, jiggleFreq: 160, jiggleVib: 5,   vibDepth: 4 },
    cookie: { squishFreq: 350, squishQ: 1.4, noiseTone: 3000, stretchBase: 200, stretchRise: 0.9, jiggleFreq: 180, jiggleVib: 5,   vibDepth: 3, crackle: true },
    jelly:  { squishFreq: 260, squishQ: 1.6, noiseTone: 1600, stretchBase: 170, stretchRise: 1.6, jiggleFreq: 120, jiggleVib: 7,   vibDepth: 9, wetTear: true },
    mallow: { squishFreq: 300, squishQ: 0.8, noiseTone: 1100, stretchBase: 190, stretchRise: 1.3, jiggleFreq: 150, jiggleVib: 6,   vibDepth: 5, airy: true },
    sand:   { squishFreq: 2200, squishQ: 0.8, noiseTone: 8000, stretchBase: 220, stretchRise: 0.6, jiggleFreq: 200, jiggleVib: 5,  vibDepth: 2, dry: true },
    awa:    { squishFreq: 400, squishQ: 1.0, noiseTone: 2500, stretchBase: 230, stretchRise: 0.9, jiggleFreq: 190, jiggleVib: 6,   vibDepth: 3, fizzy: true },
  };
  const DEFAULT_PROFILE = PROFILES.nendo;

  // -------------------------------------------------------------------------
  // Private state
  let ctx = null;
  let started = false;
  let enabled = true;
  let profile = DEFAULT_PROFILE;

  // node graph
  let input = null;        // shared bus feeding lowpass -> compressor -> master
  let masterGain = null;
  let noiseBuf = null;

  // continuous voices
  let fSquish = null, gSquish = null;
  let oStretch = null, gStretch = null;
  let oJiggle = null, gJiggle = null, gVib = null, oVib = null;
  let gSizzle = null;

  // event rate-limiting
  const recentTimes = [];            // global window (1s)
  const lastByName = Object.create(null);
  const MIN_INTERVAL = { rebond: 0.15 };
  const DEFAULT_MIN_INTERVAL = 0.06;
  const MAX_PER_SEC = 14;

  // -------------------------------------------------------------------------
  function makeNoiseBuffer() {
    const len = Math.floor(ctx.sampleRate * 2);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function buildGraph() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    noiseBuf = makeNoiseBuffer();

    // master chain: input -> gentle lowpass -> compressor -> master gain -> out
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 4500;
    lp.Q.value = 0.5;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 24;
    comp.ratio.value = 4;
    comp.attack.value = 0.005;
    comp.release.value = 0.18;

    masterGain = ctx.createGain();
    masterGain.gain.value = enabled ? MASTER_LEVEL : 0;

    lp.connect(comp);
    comp.connect(masterGain);
    masterGain.connect(ctx.destination);
    input = lp;

    // --- continuous voice 1: squish (looped noise -> band/highpass -> gain) ---
    const squishSrc = ctx.createBufferSource();
    squishSrc.buffer = noiseBuf;
    squishSrc.loop = true;
    const noiseTone = ctx.createBiquadFilter();
    noiseTone.type = 'lowpass';
    noiseTone.frequency.value = profile.noiseTone;
    fSquish = ctx.createBiquadFilter();
    fSquish.type = profile.dry ? 'highpass' : 'bandpass';
    fSquish.frequency.value = profile.squishFreq;
    fSquish.Q.value = profile.squishQ;
    gSquish = ctx.createGain();
    gSquish.gain.value = 0;
    squishSrc.connect(noiseTone);
    noiseTone.connect(fSquish);
    fSquish.connect(gSquish);
    gSquish.connect(input);
    squishSrc.start();
    // slow wobble LFO on the bandpass centre
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.7;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 60;
    lfo.connect(lfoGain);
    lfoGain.connect(fSquish.frequency);
    lfo.start();
    // keep a handle so noiseTone can be retuned on material switch
    fSquish._noiseTone = noiseTone;

    // --- continuous voice 2: stretch (triangle -> lowpass -> gain) ---
    oStretch = ctx.createOscillator();
    oStretch.type = 'triangle';
    oStretch.frequency.value = profile.stretchBase;
    const lpStretch = ctx.createBiquadFilter();
    lpStretch.type = 'lowpass';
    lpStretch.frequency.value = 1400;
    gStretch = ctx.createGain();
    gStretch.gain.value = 0;
    oStretch.connect(lpStretch);
    lpStretch.connect(gStretch);
    gStretch.connect(input);
    oStretch.start();

    // --- continuous voice 3: jiggle (sine + vibrato -> gain) ---
    oJiggle = ctx.createOscillator();
    oJiggle.type = 'sine';
    oJiggle.frequency.value = profile.jiggleFreq;
    gJiggle = ctx.createGain();
    gJiggle.gain.value = 0;
    oJiggle.connect(gJiggle);
    gJiggle.connect(input);
    oJiggle.start();
    oVib = ctx.createOscillator();
    oVib.type = 'sine';
    oVib.frequency.value = profile.jiggleVib;
    gVib = ctx.createGain();
    gVib.gain.value = 0;
    oVib.connect(gVib);
    gVib.connect(oJiggle.frequency);
    oVib.start();

    // --- continuous voice 4: sizzle (noise -> highpass 3k -> gain) ---
    const sizzleSrc = ctx.createBufferSource();
    sizzleSrc.buffer = noiseBuf;
    sizzleSrc.loop = true;
    const hpSizzle = ctx.createBiquadFilter();
    hpSizzle.type = 'highpass';
    hpSizzle.frequency.value = 3000;
    gSizzle = ctx.createGain();
    gSizzle.gain.value = 0;
    sizzleSrc.connect(hpSizzle);
    hpSizzle.connect(gSizzle);
    gSizzle.connect(input);
    sizzleSrc.start();

    started = true;
    return true;
  }

  function resume() {
    if (!ctx) return;
    // iOS: also handle 'interrupted'
    if (ctx.state === 'suspended' || ctx.state === 'interrupted') {
      if (ctx.resume) ctx.resume();
    }
  }

  // -------------------------------------------------------------------------
  // One-shot helpers (short synthesized events; self-cleaning via onended).
  function tone(type, f0, f1, glide, dur, peak, delay, vib) {
    const t = ctx.currentTime + (delay || 0);
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) {
      o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + (glide || dur));
    }
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(input);
    o.start(t);
    o.stop(t + dur + 0.03);
    let vo = null;
    if (vib) {
      vo = ctx.createOscillator();
      vo.type = 'sine';
      vo.frequency.value = vib.rate;
      const vg = ctx.createGain();
      vg.gain.value = vib.depth;
      vo.connect(vg);
      vg.connect(o.frequency);
      vo.start(t);
      vo.stop(t + dur + 0.03);
      vo.onended = function () { try { vo.disconnect(); vg.disconnect(); } catch (e) { } };
    }
    o.onended = function () { try { o.disconnect(); g.disconnect(); } catch (e) { } };
    return o;
  }

  function noiseBurst(filterType, freq, dur, peak, delay) {
    const t = ctx.currentTime + (delay || 0);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = filterType;
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(input);
    src.start(t);
    src.stop(t + dur + 0.03);
    src.onended = function () { try { src.disconnect(); f.disconnect(); g.disconnect(); } catch (e) { } };
  }

  // -------------------------------------------------------------------------
  // Event definitions. All peaks conservative (<= ~0.15 pre-compressor).
  function playEvent(name, vel, pv) {
    switch (name) {
      case 'tear': {
        tone('triangle', 300 * pv, 120 * pv, 0.15, 0.15, 0.12 * vel, 0);
        noiseBurst('bandpass', 1600 * pv, 0.05, 0.05 * vel, 0);
        if (profile.wetTear) tone('sine', 520 * pv, 300 * pv, 0.07, 0.09, 0.06 * vel, 0.02);
        break;
      }
      case 'pop': {
        // higher pitch for a small/gentle pop
        const up = 1 + (1 - vel) * 0.5;
        tone('sine', 600 * pv * up, 900 * pv * up, 0.06, 0.07, 0.10 * vel, 0);
        noiseBurst('highpass', 2400, 0.03, 0.035 * vel, 0);
        break;
      }
      case 'cut': {
        tone('sine', 180 * pv, 120 * pv, 0.12, 0.13, 0.14 * vel, 0);       // thump
        tone('sine', 880 * pv, 0, 0, 0.30, 0.03 * vel, 0);                 // soft ring (-30dB)
        break;
      }
      case 'spawn': {
        // bouncy "ぼよん": 220 -> 330 -> 280 with vibrato
        const t = ctx.currentTime;
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(220 * pv, t);
        o.frequency.linearRampToValueAtTime(330 * pv, t + 0.12);
        o.frequency.linearRampToValueAtTime(280 * pv, t + 0.25);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.12 * vel, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
        const vo = ctx.createOscillator();
        vo.type = 'sine';
        vo.frequency.value = 11;
        const vg = ctx.createGain();
        vg.gain.value = 8;
        vo.connect(vg);
        vg.connect(o.frequency);
        o.connect(g);
        g.connect(input);
        o.start(t); o.stop(t + 0.29);
        vo.start(t); vo.stop(t + 0.29);
        o.onended = function () { try { o.disconnect(); g.disconnect(); } catch (e) { } };
        vo.onended = function () { try { vo.disconnect(); vg.disconnect(); } catch (e) { } };
        break;
      }
      case 'sprinkle': {
        const f = Math.random() < 0.5 ? 1320 : 1760;
        tone('sine', f * pv, 0, 0, 0.18, 0.06 * vel, 0);
        tone('sine', f * 2 * pv, 0, 0, 0.10, 0.02 * vel, 0.01);            // shimmer
        break;
      }
      case 'crack': {
        noiseBurst('bandpass', 2000, 0.03, 0.10 * vel, 0);                 // woody snap
        tone('sine', 90 * pv, 0, 0, 0.09, 0.10 * vel, 0);                  // low knock
        break;
      }
      case 'switch': {
        tone('sine', 523 * pv, 0, 0, 0.18, 0.07 * vel, 0);
        tone('sine', 784 * pv, 0, 0, 0.20, 0.07 * vel, 0.09);
        break;
      }
      case 'tool': {
        tone('sine', 660 * pv, 0, 0, 0.08, 0.06 * vel, 0);
        break;
      }
      case 'uiTap': {
        tone('sine', 1200 * pv, 0, 0, 0.03, 0.04 * vel, 0);
        break;
      }
      case 'rebond': {
        tone('sine', 200 * pv, 260 * pv, 0.09, 0.10, 0.03 * vel, 0);       // soft "nゅ"
        break;
      }
      case 'drop': {
        tone('sine', 900 * pv, 400 * pv, 0.11, 0.12, 0.09 * vel, 0);       // water "ぴちょん"
        break;
      }
      default:
        break;
    }
  }

  // small continuous-layer extras (bubbles / fizz / crumbs)
  function spawnBlip(freq, dur, peak, type, filt) {
    if (filt) noiseBurst(filt, freq, dur, peak, 0);
    else tone(type || 'sine', freq, 0, 0, dur, peak, 0);
  }

  // -------------------------------------------------------------------------
  const Sound = {
    get enabled() { return enabled; },

    init: function () {
      if (!ctx) {
        buildGraph();
      }
      resume();
    },

    setEnabled: function (b) {
      enabled = !!b;
      if (masterGain && ctx) {
        masterGain.gain.setTargetAtTime(enabled ? MASTER_LEVEL : 0, ctx.currentTime, 0.05);
      }
    },

    setMaterial: function (matId) {
      profile = PROFILES[matId] || DEFAULT_PROFILE;
      if (!ctx || !started) return;
      const now = ctx.currentTime;
      // squish filter can switch character (bandpass <-> dry highpass)
      fSquish.type = profile.dry ? 'highpass' : 'bandpass';
      fSquish.Q.setTargetAtTime(profile.squishQ, now, TC);
      fSquish.frequency.setTargetAtTime(profile.squishFreq, now, TC);
      if (fSquish._noiseTone) fSquish._noiseTone.frequency.setTargetAtTime(profile.noiseTone, now, TC);
      oStretch.frequency.setTargetAtTime(profile.stretchBase, now, TC);
      oJiggle.frequency.setTargetAtTime(profile.jiggleFreq, now, TC);
      oVib.frequency.setTargetAtTime(profile.jiggleVib, now, TC);
    },

    frame: function (stats, dt) {
      if (!ctx || !started || !stats) return;
      const now = ctx.currentTime;
      const p = profile;

      // 1 + 5: squish, boosted & pitched up by kneading
      const squishG = Math.min(0.22, stats.press * 0.14 + stats.knead * 0.08);
      gSquish.gain.setTargetAtTime(squishG, now, TC);
      const kneadPush = 1 + stats.knead * 0.4;                 // up to 1.4x
      fSquish.frequency.setTargetAtTime(p.squishFreq * kneadPush, now, TC);

      // 2: stretch — pitch glides UP as the child pulls (びよ〜〜ん)
      const stretchF = p.stretchBase * (1 + stats.stretch * p.stretchRise);
      oStretch.frequency.setTargetAtTime(stretchF, now, TC);
      gStretch.gain.setTargetAtTime(stats.stretch * 0.10, now, TC);

      // 3: jiggle — low wobble with vibrato depth tracking jiggle
      gJiggle.gain.setTargetAtTime(stats.jiggle * 0.07, now, TC);
      gVib.gain.setTargetAtTime(stats.jiggle * p.vibDepth, now, TC);

      // 4: sizzle — baking hiss
      gSizzle.gain.setTargetAtTime(stats.heat * 0.05, now, TC);

      // material-flavoured continuous extras (only when audible)
      if (enabled) {
        if (p.bubbly && stats.press > 0.3 && Math.random() < 0.06) {
          spawnBlip(300 + Math.random() * 400, 0.08, 0.03, 'sine');
        }
        if (p.fizzy && Math.random() < 0.04 + stats.size * 0.08) {
          spawnBlip(700 + Math.random() * 900, 0.03, 0.02 + stats.size * 0.015, 'sine');
        }
        if (p.crackle && stats.press > 0.5 && Math.random() < 0.15) {
          spawnBlip(4000, 0.02, 0.04, null, 'highpass');
        }
      }
    },

    event: function (name, o) {
      if (!ctx || !started) return;
      o = o || {};
      const now = ctx.currentTime;
      // per-name min interval
      const minGap = MIN_INTERVAL[name] || DEFAULT_MIN_INTERVAL;
      const last = lastByName[name];
      if (last !== undefined && now - last < minGap) return;
      // global rate limit (rolling 1s window)
      while (recentTimes.length && now - recentTimes[0] > 1) recentTimes.shift();
      if (recentTimes.length >= MAX_PER_SEC) return;

      const vel = Math.max(0, Math.min(1, o.v == null ? 0.7 : o.v));
      const pv = 1 + (Math.random() * 0.12 - 0.06);            // ±6% pitch
      playEvent(name, vel, pv);

      lastByName[name] = now;
      recentTimes.push(now);
    },
  };

  YL.Sound = Sound;
})();
