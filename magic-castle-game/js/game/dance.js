// ダンスパーティー(リズムゲーム)
import { rand, pick } from '../core/utils.js';
import { questProgress, addCoins, addHappiness } from './state.js';
import { ui } from '../ui/ui.js';
import { audio } from '../core/audio.js';

const $ = (id) => document.getElementById(id);
const LANE_EMOJI = ['💜', '💛', '💙'];
const NOTE_FALL_TIME = 1.6; // 上から判定ラインまでの秒数
const GAME_LEN = 30;        // 秒

export class Dance {
  constructor(particles) {
    this.particles = particles;
    this.active = false;
    this.notes = [];  // {lane, el, t0(判定時刻)}
    this.onEnd = null;

    for (const laneEl of document.querySelectorAll('.dance-lane')) {
      laneEl.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this._tap(parseInt(laneEl.dataset.lane, 10));
      });
    }
  }

  start(onEnd) {
    if (this.active) return;
    this.active = true;
    this.onEnd = onEnd;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.t = 0;
    this.spawnT = 0.5;
    this.endT = GAME_LEN;
    this.notes = [];
    $('dance-ui').classList.remove('hidden');
    $('dance-score').textContent = 'SCORE 0';
    audio.playBGM('dance');
  }

  _spawn() {
    const lane = Math.floor(rand(3));
    const laneEl = document.querySelector(`.dance-lane[data-lane="${lane}"]`);
    const el = document.createElement('div');
    el.className = 'dance-note';
    el.textContent = LANE_EMOJI[lane];
    el.style.top = '-46px';
    laneEl.appendChild(el);
    this.notes.push({ lane, el, t0: this.t + NOTE_FALL_TIME, judged: false });
  }

  _tap(lane) {
    if (!this.active) return;
    // このレーンで判定時刻がいちばん近いノーツ
    let best = null, bestD = 1e9;
    for (const n of this.notes) {
      if (n.lane !== lane || n.judged) continue;
      const d = Math.abs(n.t0 - this.t);
      if (d < bestD) { bestD = d; best = n; }
    }
    if (!best || bestD > 0.45) {
      this._judge(null, 'ミス…');
      return;
    }
    best.judged = true;
    best.el.remove();
    if (bestD < 0.12) { this.score += 100 + this.combo * 5; this.combo++; this._judge(best, 'パーフェクト!✨'); audio.sfx('note'); }
    else if (bestD < 0.25) { this.score += 60 + this.combo * 3; this.combo++; this._judge(best, 'グッド!'); audio.sfx('note'); }
    else { this.score += 20; this.combo = 0; this._judge(best, 'おしい!'); audio.sfx('pop'); }
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    $('dance-score').textContent = `SCORE ${this.score}` + (this.combo > 2 ? `  🔥${this.combo}コンボ` : '');
  }

  _judge(note, text) {
    const j = $('dance-judge');
    j.textContent = text;
    j.classList.remove('pop');
    void j.offsetWidth;
    j.classList.add('pop');
    if (!note) { this.combo = 0; audio.sfx('miss'); }
  }

  async _finish() {
    this.active = false;
    for (const n of this.notes) n.el.remove();
    this.notes = [];
    $('dance-ui').classList.add('hidden');

    const coins = Math.floor(this.score / 30);
    const happy = Math.floor(this.score / 100);
    addCoins(coins);
    addHappiness(happy);
    questProgress('dance', { n: this.score });
    audio.sfx('fanfare');
    const rank = this.score >= 3000 ? 'S✨' : this.score >= 2000 ? 'A' : this.score >= 1200 ? 'B' : 'C';
    await ui.showResult('💃 ダンスしゅうりょう!',
      `スコア <b>${this.score}</b>(ランク ${rank})<br>さいだいコンボ ${this.maxCombo}<br><br>🪙 +${coins} / 💖 +${happy}`);
    if (this.onEnd) { this.onEnd(this.score); this.onEnd = null; }
  }

  update(dt) {
    if (!this.active) return;
    this.t += dt;
    this.endT -= dt;

    // ノーツ生成(だんだん速く)
    this.spawnT -= dt;
    if (this.spawnT <= 0 && this.endT > NOTE_FALL_TIME) {
      this.spawnT = rand(0.35, 0.8) * (this.endT > 15 ? 1.15 : 0.85);
      this._spawn();
      if (Math.random() < 0.22) this._spawn(); // たまに同時押し
    }

    // ノーツ落下
    const laneH = document.querySelector('.dance-lane').offsetHeight;
    for (let i = this.notes.length - 1; i >= 0; i--) {
      const n = this.notes[i];
      const p = 1 - (n.t0 - this.t) / NOTE_FALL_TIME;
      const y = p * (laneH - 40) - 46;
      n.el.style.top = `${y}px`;
      if (!n.judged && this.t > n.t0 + 0.4) {
        n.judged = true;
        n.el.remove();
        this.combo = 0;
        this._judge(null, 'ミス…');
      }
      if (this.t > n.t0 + 0.6) {
        this.notes.splice(i, 1);
      }
    }

    if (this.endT <= 0) this._finish();
  }
}
void pick;
