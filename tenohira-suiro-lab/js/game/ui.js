// DOM UI — 文字が読めなくても遊べるように、大きな絵文字ボタンだけで構成
// (ひらがなの文字はぜんぶ飾り。押すものは絵文字で伝わる)

import { SPOUT_DEFS } from './spouts.js';

const $ = (s) => document.querySelector(s);

export class UI {
  constructor() {
    this.onStart = null;
    this.onSpout = null;
    this.onDuck = null;
    this.onReset = null;
    this.onSound = null;
    this.onCamera = null;
    this._toastT = 0;
  }

  bind() {
    $('#btnStart').addEventListener('click', () => this.onStart?.());
    $('#btnReset').addEventListener('click', () => this.onReset?.());
    $('#btnSound').addEventListener('click', () => this.onSound?.());
    $('#btnCamera').addEventListener('click', () => this.onCamera?.());
    // じゃぐちトレイ
    const tray = $('#tray');
    for (const def of SPOUT_DEFS) {
      const b = document.createElement('button');
      b.className = 'spout';
      b.dataset.id = def.id;
      b.innerHTML = `<span class="s-emoji">${def.emoji}</span><span class="s-label">${def.label}</span>`;
      b.addEventListener('click', () => this.onSpout?.(def.id));
      tray.appendChild(b);
    }
    // アヒルボタン (モードではなく1回きりのアクション)
    const duck = document.createElement('button');
    duck.className = 'spout duckbtn';
    duck.innerHTML = `<span class="s-emoji">🦆</span><span class="s-label">あひる</span>`;
    duck.addEventListener('click', () => this.onDuck?.());
    tray.appendChild(duck);
  }

  hideBoot() {
    $('#boot').classList.add('gone');
    setTimeout(() => { $('#boot').hidden = true; }, 600);
  }

  setSpout(id) {
    document.querySelectorAll('#tray .spout').forEach((b) => {
      b.classList.toggle('on', b.dataset.id === id);
    });
  }

  // ロード進捗のコップ (0..1)。1で紙吹雪クラスをつけて消す。
  setLoadProgress(v) {
    const cup = $('#loadCup');
    if (v === null) { cup.hidden = true; return; }
    cup.hidden = false;
    $('#loadWater').style.height = `${Math.round(Math.min(1, v) * 86)}%`;
    if (v >= 1) {
      cup.classList.add('full');
      setTimeout(() => { cup.hidden = true; cup.classList.remove('full'); }, 1400);
    }
  }

  setSound(muted) {
    $('#btnSound').textContent = muted ? '🔇' : '🔊';
  }

  // camera state: on | touch | denied | loading
  setCameraBadge(state) {
    const b = $('#btnCamera');
    b.classList.toggle('on', state === 'on');
    b.classList.toggle('waiting', state === 'loading');
    b.textContent = state === 'on' ? '📷' : state === 'loading' ? '⏳' : '👆';
  }

  toast(msg, ms = 2400) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => t.classList.remove('show'), ms);
  }
}
