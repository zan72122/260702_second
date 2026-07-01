// WebAudio によるオルゴール風BGMと効果音(外部ファイル不要)
class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.bgmGain = null;
    this.seGain = null;
    this.enabled = true;
    this.bgmTimer = null;
    this.currentSong = null;
    this._step = 0;
  }

  // ブラウザの自動再生制限のため、最初のユーザー操作で初期化する
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    // ほんのりエコー(オルゴールの響き)
    this.delay = this.ctx.createDelay(1);
    this.delay.delayTime.value = 0.28;
    this.delayFb = this.ctx.createGain();
    this.delayFb.gain.value = 0.3;
    this.delayWet = this.ctx.createGain();
    this.delayWet.gain.value = 0.22;
    this.delay.connect(this.delayFb).connect(this.delay);
    this.delay.connect(this.delayWet).connect(this.master);

    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.value = 0.5;
    this.bgmGain.connect(this.master);
    this.bgmGain.connect(this.delay);
    this.seGain = this.ctx.createGain();
    this.seGain.gain.value = 0.65;
    this.seGain.connect(this.master);
    this.master.connect(this.ctx.destination);
  }

  setEnabled(on) {
    this.enabled = on;
    if (this.master) this.master.gain.value = on ? 0.9 : 0;
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  // ---- 音色 ----
  // オルゴール/チェレスタ風の1音
  _note(freq, time, dur = 0.9, gainNode = this.bgmGain, vol = 0.5) {
    if (!this.ctx) return;
    const t = time ?? this.ctx.currentTime;
    for (const [mult, amp] of [[1, 1], [4, 0.18], [5.4, 0.06]]) {
      const o = this.ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq * mult;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol * amp, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0004, t + dur);
      o.connect(g).connect(gainNode);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
  }

  // ---- BGM ----
  // 音名→周波数
  static F(n) { return 440 * Math.pow(2, (n - 69) / 12); }

  // 曲データ: [ステップ毎の[音符...], ...] 16分音符グリッド / MIDIノート番号
  static SONGS = {
    // メインテーマ(お部屋): やさしいワルツ風オルゴール
    room: {
      bpm: 92, steps: 48, loopBars: 4,
      melody: {
        0: [76], 3: [79], 6: [83], 9: [81], 12: [79], 18: [76],
        24: [74], 27: [78], 30: [81], 33: [79], 36: [78], 42: [74],
      },
      bass: { 0: [52], 6: [59, 64], 12: [47], 18: [59, 62], 24: [50], 30: [57, 62], 36: [43], 42: [55, 59] },
      melody2: {
        0: [76], 3: [79], 6: [83], 9: [86], 12: [88], 18: [83],
        24: [86], 27: [83], 30: [81], 33: [78], 36: [76], 42: [74],
      },
    },
    // タイトル: きらきら上昇形
    title: {
      bpm: 80, steps: 32, loopBars: 2,
      melody: { 0: [72], 2: [76], 4: [79], 6: [84], 8: [83], 12: [79], 16: [77], 18: [81], 20: [84], 22: [88], 24: [86], 28: [84] },
      bass: { 0: [48], 8: [55, 60], 16: [53], 24: [55, 59] },
      melody2: { 0: [84], 4: [88], 8: [91], 12: [88], 16: [89], 20: [86], 24: [84], 28: [79] },
    },
    // マップ: 明るくはずむ
    map: {
      bpm: 108, steps: 32, loopBars: 2,
      melody: { 0: [79], 2: [79], 4: [83], 8: [81], 10: [81], 12: [84], 16: [83], 18: [81], 20: [79], 24: [76], 28: [74] },
      bass: { 0: [55], 4: [62], 8: [50], 12: [57], 16: [52], 20: [59], 24: [43], 28: [50] },
      melody2: { 0: [79], 4: [86], 8: [84], 12: [88], 16: [86], 20: [83], 24: [79], 28: [78] },
    },
    // 荒廃した部屋: ものさびしい
    ruined: {
      bpm: 66, steps: 32, loopBars: 2,
      melody: { 0: [69], 6: [72], 12: [71], 16: [64], 22: [67], 28: [65] },
      bass: { 0: [45], 8: [52], 16: [40], 24: [47] },
      melody2: { 0: [69], 8: [76], 16: [71], 24: [72] },
    },
  };

  playBgm(name) {
    if (!this.ctx) { this.currentSong = name; return; }
    if (this.currentSong === name && this.bgmTimer) return;
    this.stopBgm();
    this.currentSong = name;
    const song = AudioManager.SONGS[name];
    if (!song) return;
    const stepDur = 60 / song.bpm / 4;
    this._step = 0;
    let nextTime = this.ctx.currentTime + 0.1;
    let phrase = 0;
    const tick = () => {
      if (!this.ctx) return;
      // 先読みスケジューリング
      while (nextTime < this.ctx.currentTime + 0.35) {
        const s = this._step % song.steps;
        if (s === 0 && this._step > 0) phrase++;
        const mel = (phrase % 2 === 1 && song.melody2) ? song.melody2 : song.melody;
        if (mel[s]) for (const n of mel[s]) this._note(AudioManager.F(n), nextTime, 1.1, this.bgmGain, 0.34);
        if (song.bass[s]) for (const n of song.bass[s]) this._note(AudioManager.F(n), nextTime, 1.3, this.bgmGain, 0.16);
        this._step++;
        nextTime += stepDur;
      }
      this.bgmTimer = setTimeout(tick, 90);
    };
    tick();
  }

  stopBgm() {
    if (this.bgmTimer) { clearTimeout(this.bgmTimer); this.bgmTimer = null; }
    this.currentSong = null;
  }

  // ---- 効果音 ----
  se(name) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const F = AudioManager.F;
    switch (name) {
      case 'click':
        this._note(F(88), t, 0.18, this.seGain, 0.3);
        break;
      case 'place': // 家具設置: ぽん+きらり
        this._note(F(76), t, 0.3, this.seGain, 0.4);
        this._note(F(88), t + 0.07, 0.5, this.seGain, 0.3);
        break;
      case 'remove':
        this._note(F(64), t, 0.25, this.seGain, 0.35);
        this._note(F(57), t + 0.08, 0.3, this.seGain, 0.25);
        break;
      case 'rotate':
        this._note(F(81), t, 0.15, this.seGain, 0.25);
        break;
      case 'coin':
        this._note(F(93), t, 0.2, this.seGain, 0.3);
        this._note(F(100), t + 0.06, 0.4, this.seGain, 0.3);
        break;
      case 'buy':
        this._note(F(84), t, 0.2, this.seGain, 0.3);
        this._note(F(88), t + 0.08, 0.2, this.seGain, 0.3);
        this._note(F(93), t + 0.16, 0.5, this.seGain, 0.35);
        break;
      case 'error':
        this._note(F(59), t, 0.25, this.seGain, 0.3);
        this._note(F(58), t + 0.12, 0.3, this.seGain, 0.3);
        break;
      case 'fanfare': { // 部屋復興ファンファーレ
        const seq = [[72, 0], [76, .12], [79, .24], [84, .36], [83, .6], [84, .72], [88, .9]];
        for (const [n, dt] of seq) this._note(F(n), t + dt, 0.8, this.seGain, 0.4);
        this._note(F(48), t + 0.9, 1.4, this.seGain, 0.25);
        this._note(F(64), t + 0.9, 1.4, this.seGain, 0.2);
        break;
      }
      case 'gacha': { // ガチャ: ころころ→きらーん
        for (let i = 0; i < 6; i++) this._note(F(60 + (i % 3) * 2), t + i * 0.09, 0.12, this.seGain, 0.2);
        this._note(F(84), t + 0.65, 0.5, this.seGain, 0.35);
        this._note(F(91), t + 0.78, 0.9, this.seGain, 0.4);
        break;
      }
      case 'quest': // クエスト達成
        this._note(F(79), t, 0.25, this.seGain, 0.35);
        this._note(F(84), t + 0.1, 0.25, this.seGain, 0.35);
        this._note(F(91), t + 0.2, 0.6, this.seGain, 0.4);
        break;
      case 'camera': // シャッター
        this._note(F(96), t, 0.08, this.seGain, 0.4);
        this._note(F(90), t + 0.05, 0.08, this.seGain, 0.3);
        break;
      case 'walk':
        this._note(F(70 + Math.random() * 4), t, 0.07, this.seGain, 0.08);
        break;
      case 'sparkle':
        this._note(F(96 + Math.floor(Math.random() * 7)), t, 0.4, this.seGain, 0.14);
        break;
    }
  }
}

export const audio = new AudioManager();
