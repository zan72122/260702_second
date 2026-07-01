// UI共通ヘルパー(画面切りかえ・ダイアログ・トースト・HUD)
import { formatNum } from '../core/utils.js';
import { audio } from '../core/audio.js';

export const $ = (sel) => document.querySelector(sel);
export const $$ = (sel) => [...document.querySelectorAll(sel)];

export function show(sel) { $(sel).classList.remove('hidden'); }
export function hide(sel) { $(sel).classList.add('hidden'); }

export function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = msg;
  $('#toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

let dialogCleanup = null;

// dialog({ title, html, buttons: [{label, cb, ghost, keep}] })
export function dialog({ title, html, buttons = [{ label: 'とじる' }] }) {
  $('#dialog-title').innerHTML = title;
  $('#dialog-content').innerHTML = html;
  const btnBox = $('#dialog-buttons');
  btnBox.innerHTML = '';
  for (const b of buttons) {
    const el = document.createElement('button');
    el.className = 'royal-btn' + (b.ghost ? ' ghost' : '');
    el.innerHTML = b.label;
    el.addEventListener('click', () => {
      audio.se('click');
      if (!b.keep) closeDialog();
      if (b.cb) b.cb();
    });
    btnBox.appendChild(el);
  }
  show('#dialog-overlay');
  return $('#dialog-content');
}

export function closeDialog() {
  hide('#dialog-overlay');
  if (dialogCleanup) { dialogCleanup(); dialogCleanup = null; }
}

export function onDialogClose(fn) { dialogCleanup = fn; }

export function updateWallet(game) {
  $('#hud-coins').textContent = formatNum(game.coins);
  $('#hud-jewels').textContent = formatNum(game.jewels);
}

export function setHint(text) {
  const el = $('#hud-hint');
  el.textContent = text;
  el.style.opacity = 1;
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.opacity = 0; }, 5000);
}

// タイトル画面のCSSキラキラ
export function spawnTitleSparkles() {
  const holder = $('.title-sparkles');
  holder.innerHTML = '';
  const glyphs = ['✦', '✧', '❀', '♡', '★', '✿'];
  for (let i = 0; i < 26; i++) {
    const s = document.createElement('span');
    s.className = 'tsp';
    s.textContent = glyphs[i % glyphs.length];
    s.style.left = Math.random() * 100 + 'vw';
    s.style.setProperty('--s', (0.5 + Math.random() * 1.4).toFixed(2));
    s.style.fontSize = 10 + Math.random() * 18 + 'px';
    s.style.animationDuration = 7 + Math.random() * 9 + 's';
    s.style.animationDelay = -Math.random() * 14 + 's';
    holder.appendChild(s);
  }
}
