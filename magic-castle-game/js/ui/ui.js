// HUD・会話・トースト・リザルト
import { state } from '../game/state.js';
import { audio } from '../core/audio.js';
import { questById } from '../game/data.js';

const $ = (id) => document.getElementById(id);

export const ui = {
  // ---------- HUD ----------
  updateHUD() {
    $('coins-val').textContent = state.coins;
    $('happy-val').textContent = state.happiness;
    $('level-val').textContent = `Lv.${state.level}`;
  },

  bump(statId) {
    const el = $(statId);
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  },

  setClock(icon, label) {
    $('clock-icon').textContent = icon;
    $('clock-text').textContent = label;
  },

  updateQuestTracker() {
    const tracker = $('quest-tracker');
    const body = $('qt-body');
    if (state.activeQuests.length === 0) {
      tracker.classList.add('hidden');
      return;
    }
    tracker.classList.remove('hidden');
    body.innerHTML = state.activeQuests.slice(0, 3).map((aq) => {
      const q = questById(aq.id);
      if (!q) return '';
      const cur = q.type === 'item' || q.type === 'deliver'
        ? Math.min(q.count, state.inventory[q.item] || 0)
        : Math.min(q.count, aq.prog);
      const done = cur >= q.count;
      return `<div class="${done ? 'done' : ''}">${done ? '✅' : '▫️'} ${q.name} (${cur}/${q.count})</div>`;
    }).join('');
  },

  // ---------- トースト ----------
  toast(msg) {
    const area = $('toast-area');
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = msg;
    area.appendChild(el);
    setTimeout(() => el.remove(), 3000);
    while (area.children.length > 4) area.firstChild.remove();
  },

  // ---------- インタラクトヒント / アクションボタン ----------
  setInteract(hint, icon, label) {
    const h = $('interact-hint');
    const btn = $('btn-action');
    if (!hint) {
      h.classList.add('hidden');
      btn.classList.add('hidden');
      return;
    }
    h.textContent = hint;
    h.classList.remove('hidden');
    $('action-icon').textContent = icon;
    $('action-label').textContent = label;
    btn.classList.remove('hidden');
  },

  // ---------- 会話 ----------
  _dialogResolve: null,
  _typing: null,

  async showDialog(name, lines) {
    const box = $('dialog-box');
    const nameEl = $('dialog-name');
    const textEl = $('dialog-text');
    $('dialog-choices').classList.add('hidden');
    $('dialog-next').classList.remove('hidden');
    box.classList.remove('hidden');
    nameEl.textContent = name;

    for (const line of lines) {
      await this._typeLine(textEl, line);
      await this._waitTap(box);
    }
    box.classList.add('hidden');
  },

  _typeLine(el, line) {
    return new Promise((res) => {
      el.textContent = '';
      let i = 0;
      clearInterval(this._typing);
      this._typing = setInterval(() => {
        el.textContent = line.slice(0, ++i);
        if (i % 3 === 0) audio.sfx('talk');
        if (i >= line.length) { clearInterval(this._typing); res(); }
      }, 28);
      // タップでスキップ
      const skip = () => {
        clearInterval(this._typing);
        el.textContent = line;
        el.removeEventListener('pointerdown', skip);
        setTimeout(res, 30);
      };
      el.addEventListener('pointerdown', skip, { once: true });
    });
  },

  _waitTap(box) {
    return new Promise((res) => {
      const h = (e) => { e.stopPropagation(); box.removeEventListener('pointerdown', h); res(); };
      setTimeout(() => box.addEventListener('pointerdown', h), 120);
    });
  },

  // 選択肢つき会話 → 選ばれた index を返す
  async showChoices(name, text, options) {
    const box = $('dialog-box');
    const nameEl = $('dialog-name');
    const textEl = $('dialog-text');
    const chWrap = $('dialog-choices');
    box.classList.remove('hidden');
    nameEl.textContent = name;
    $('dialog-next').classList.add('hidden');
    await this._typeLine(textEl, text);
    chWrap.innerHTML = '';
    chWrap.classList.remove('hidden');
    return new Promise((res) => {
      options.forEach((opt, i) => {
        const b = document.createElement('button');
        b.className = 'dialog-choice';
        b.textContent = opt;
        b.addEventListener('pointerdown', (e) => {
          e.stopPropagation();
          audio.sfx('pop');
          chWrap.classList.add('hidden');
          box.classList.add('hidden');
          res(i);
        });
        chWrap.appendChild(b);
      });
    });
  },

  // ---------- リザルト ----------
  showResult(title, bodyHTML) {
    return new Promise((res) => {
      $('result-title').innerHTML = title;
      $('result-body').innerHTML = bodyHTML;
      $('result-overlay').classList.remove('hidden');
      const ok = $('result-ok');
      const h = () => { ok.removeEventListener('pointerdown', h); $('result-overlay').classList.add('hidden'); res(); };
      ok.addEventListener('pointerdown', h);
    });
  },

  fade(dark) {
    $('fader').classList.toggle('dark', dark);
  },
};
