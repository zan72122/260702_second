// HUD とオーバーレイ画面の DOM 操作
import { FRUIT_INFO } from './collectibles.js';

const $ = (id) => document.getElementById(id);

export class UI {
  constructor() {
    this.fruitNum = $('fruit-num');
    this.fruitCounter = $('fruit-counter');
    this.fruitRow = $('fruit-row');
    this.petalsEl = $('petals');
    this.scoreEl = $('score-num');
    this.comboEl = $('combo-label');
    this.banner = $('stage-banner');
    this.hint = $('hint-msg');
    this.fader = $('fader');
    this._bannerTimer = null;
    this._hintTimer = null;
    this._shownScore = 0;
    this._targetScore = 0;
  }

  setFruits(collected, goal = 30) {
    this.fruitNum.textContent = Math.min(collected.length, goal);
    this.fruitCounter.classList.toggle('full', collected.length >= goal);
    // 30 スロットのフルーツフレーム
    let html = '';
    for (let i = 0; i < goal; i++) {
      html += collected[i] ? FRUIT_INFO[collected[i]].emoji : '<span style="opacity:.25">·</span>';
      if (i === 14) html += '<br>';
    }
    this.fruitRow.innerHTML = html;
  }

  setPetals(n, max = 8) {
    let html = '';
    for (let i = 0; i < max; i++) {
      html += i < n ? '🌸' : '<span style="opacity:.22;filter:grayscale(1)">🌸</span>';
    }
    this.petalsEl.innerHTML = html;
  }

  setScore(n) { this._targetScore = n; }

  // スコアはコロコロ増える演出
  tick(dt) {
    if (this._shownScore !== this._targetScore) {
      const diff = this._targetScore - this._shownScore;
      this._shownScore += Math.ceil(Math.abs(diff) * Math.min(1, dt * 8)) * Math.sign(diff);
      this.scoreEl.textContent = this._shownScore;
    }
  }

  setCombo(count, type) {
    if (count >= 2 && type) {
      this.comboEl.textContent = `${FRUIT_INFO[type].emoji} コンボ ×${count}!`;
    } else {
      this.comboEl.textContent = '';
    }
  }

  showBanner(text, dur = 2.2) {
    this.banner.innerHTML = text;
    this.banner.classList.add('show');
    clearTimeout(this._bannerTimer);
    this._bannerTimer = setTimeout(() => this.banner.classList.remove('show'), dur * 1000);
  }

  showHint(text, dur = 2.4) {
    this.hint.textContent = text;
    this.hint.classList.add('show');
    clearTimeout(this._hintTimer);
    this._hintTimer = setTimeout(() => this.hint.classList.remove('show'), dur * 1000);
  }

  // ワールド座標を投影したスクリーン位置に出すスコアポップ
  scorePop(sx, sy, text, color = '#fff') {
    const el = document.createElement('div');
    el.className = 'score-pop';
    el.textContent = text;
    el.style.left = `${sx}px`;
    el.style.top = `${sy}px`;
    el.style.color = color;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
  }

  screen(id, show) {
    $(id).classList.toggle('hidden', !show);
  }

  setClearTally({ fruits, coins, enemies, petals, stageScore, isEnding, total, best }) {
    $('clear-title').textContent = isEnding ? '🎉 ぜんぶクリア! 🎉' : 'ステージクリア!';
    let html =
      `フルーツ 🍎 <span class="num">${fruits}</span> こ<br>` +
      `コイン 🪙 <span class="num">${coins}</span> まい<br>` +
      `たおした敵 💥 <span class="num">${enemies}</span> たい<br>` +
      `のこり花びら 🌸 <span class="num">${petals}</span> まい → ボーナス <span class="num">${petals * 200}</span><br>` +
      `<br>ステージスコア <span class="num">${stageScore}</span>`;
    if (isEnding) {
      html += `<br><br>トータルスコア <span class="num">${total}</span>`;
      if (total >= best) html += '<br>✨ ベストスコア こうしん! ✨';
      else html += `<br>ベストスコア: ${best}`;
    }
    $('clear-tally').innerHTML = html;
    $('clear-next').textContent = isEnding
      ? 'クリック か スペースキー で タイトルへ'
      : 'クリック か スペースキー で つぎのステージへ!';
  }

  setBest(best) {
    $('best-score').textContent = best > 0 ? `👑 ベストスコア: ${best}` : '';
  }

  fade(on) { this.fader.style.opacity = on ? 1 : 0; }
}
