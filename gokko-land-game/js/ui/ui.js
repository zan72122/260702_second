// DOM UI(HUD・リザルト・パネル・ガチャ・トースト)
import { HATS } from '../chars/chara.js';

const $ = (id) => document.getElementById(id);

export const GAME_INFO = {
  cake:     { name: 'ケーキやさん',   icon: '🍰', color: '#ff8fc2' },
  sushi:    { name: 'おすしやさん',   icon: '🍣', color: '#66c2ff' },
  delivery: { name: 'たくはいびん',   icon: '🚚', color: '#66e07a' },
  fire:     { name: 'しょうぼうし',   icon: '🚒', color: '#ff6b5f' },
  register: { name: 'スーパーのレジ', icon: '🛒', color: '#ffb84d' },
};

export class UI {
  constructor(app) {
    this.app = app;
    this.el = {
      loading: $('loading-screen'), loadFill: $('loading-fill'), loadText: $('loading-text'),
      title: $('title-screen'), btnStart: $('btn-start'),
      hudHub: $('hud-hub'), coins: $('coins-val'), hubHint: $('hub-hint'),
      btnStamp: $('btn-stamp'), btnSound: $('btn-sound'),
      hudGame: $('hud-game'), btnBack: $('btn-back'),
      orderBubble: $('order-bubble'), orderFace: $('order-face'), orderText: $('order-text'),
      progress: $('game-progress'), message: $('game-message'),
      gauge: $('game-gauge'), gaugeFill: $('game-gauge-fill'), gaugeZone: $('game-gauge-zone'),
      actions: $('game-actions'),
      result: $('result-overlay'), resultTitle: $('result-title'), resultStars: $('result-stars'),
      resultBody: $('result-body'), resultStamp: $('result-stamp'), resultStampIcon: $('result-stamp-icon'),
      resultRetry: $('result-retry'), resultHome: $('result-home'),
      panelOverlay: $('panel-overlay'), panelBody: $('panel-body'), panelClose: $('panel-close'),
      gachaOverlay: $('gacha-overlay'), gachaSpin: $('gacha-spin'), gachaClose: $('gacha-close'),
      gachaDome: $('gacha-dome'), gachaCapsule: $('gacha-capsule'), gachaPrize: $('gacha-prize'),
      gachaMsg: $('gacha-msg'),
      toastArea: $('toast-area'), fader: $('fader'),
    };
    this.msgTimer = null;

    this.el.panelClose.addEventListener('click', () => { app.audio.tap(); this.hidePanel(); });
    document.querySelectorAll('.panel-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        app.audio.tap();
        document.querySelectorAll('.panel-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        this.renderPanel(tab.dataset.tab);
      });
    });
  }

  setLoading(pct, text) {
    this.el.loadFill.style.width = `${Math.round(pct * 100)}%`;
    if (text) this.el.loadText.textContent = text;
  }
  hideLoading() { this.el.loading.classList.add('hidden'); }

  showTitle() {
    this.el.title.classList.remove('hidden');
    // ふわふわ浮かぶ絵文字デコ
    const deco = this.el.title.querySelector('.title-deco');
    if (deco && !deco.childElementCount) {
      const icons = ['🍰', '🍣', '🚚', '🚒', '🛒', '🎈', '⭐', '💖', '🎁', '🎵'];
      icons.forEach((ic, i) => {
        const sp = document.createElement('span');
        sp.textContent = ic;
        sp.style.left = `${(i * 9.7 + 4) % 92}%`;
        sp.style.animationDuration = `${7 + (i % 5) * 2.3}s`;
        sp.style.animationDelay = `${-i * 1.7}s`;
        deco.appendChild(sp);
      });
    }
  }
  hideTitle() { this.el.title.classList.add('hidden'); }

  showHub() { this.el.hudHub.classList.remove('hidden'); this.el.hudGame.classList.add('hidden'); }
  showGameHud() { this.el.hudGame.classList.remove('hidden'); this.el.hudHub.classList.add('hidden'); }
  hideAllHud() {
    this.el.hudHub.classList.add('hidden');
    this.el.hudGame.classList.add('hidden');
  }

  setHubHint(text) {
    this.el.hubHint.textContent = text;
    this.el.hubHint.classList.toggle('hidden', !text);
  }

  updateCoins(v, animate = false) {
    this.el.coins.textContent = v;
    if (animate) {
      this.el.coins.parentElement.style.transform = 'scale(1.25)';
      setTimeout(() => { this.el.coins.parentElement.style.transform = ''; }, 180);
    }
  }

  setSoundIcon(on) { this.el.btnSound.textContent = on ? '🔊' : '🔇'; }

  // ---- ミニゲームHUD ----
  showOrder(face, text) {
    this.el.orderFace.textContent = face;
    this.el.orderText.textContent = text;
    this.el.orderBubble.classList.remove('hidden');
    // ポップインをやり直す
    this.el.orderBubble.style.animation = 'none';
    void this.el.orderBubble.offsetWidth;
    this.el.orderBubble.style.animation = '';
  }
  hideOrder() { this.el.orderBubble.classList.add('hidden'); }

  setProgress(html) { this.el.progress.innerHTML = html; }

  showMessage(text, dur = 1200) {
    this.el.message.textContent = text;
    this.el.message.classList.remove('hidden');
    this.el.message.style.animation = 'none';
    void this.el.message.offsetWidth;
    this.el.message.style.animation = '';
    if (this.msgTimer) clearTimeout(this.msgTimer);
    if (dur > 0) this.msgTimer = setTimeout(() => this.el.message.classList.add('hidden'), dur);
  }
  hideMessage() { this.el.message.classList.add('hidden'); }

  showGauge(zoneStart = 0.55, zoneWidth = 0.25) {
    this.el.gauge.classList.remove('hidden');
    this.el.gaugeZone.style.left = `${zoneStart * 100}%`;
    this.el.gaugeZone.style.width = `${zoneWidth * 100}%`;
  }
  setGauge(v) { this.el.gaugeFill.style.width = `${Math.round(v * 100)}%`; }
  hideGauge() { this.el.gauge.classList.add('hidden'); }

  // アクションボタン群 [{icon,label,id,wide,onTap,onHold,onRelease}]
  setActions(list) {
    this.el.actions.innerHTML = '';
    this.actionBtns = {};
    for (const a of list) {
      const btn = document.createElement('button');
      btn.className = 'action-btn' + (a.wide ? ' wide' : '');
      btn.innerHTML = `<span class="ab-icon">${a.icon}</span><span class="ab-label">${a.label}</span>`;
      if (a.onTap) {
        btn.addEventListener('pointerdown', (e) => { e.stopPropagation(); a.onTap(a.id, btn); });
      }
      if (a.onHold) {
        btn.addEventListener('pointerdown', (e) => { e.stopPropagation(); a.onHold(true); });
        const end = () => a.onHold(false);
        btn.addEventListener('pointerup', end);
        btn.addEventListener('pointercancel', end);
        btn.addEventListener('pointerleave', end);
      }
      this.el.actions.appendChild(btn);
      this.actionBtns[a.id] = btn;
    }
  }
  clearActions() { this.el.actions.innerHTML = ''; this.actionBtns = {}; }
  selectAction(id) {
    Object.values(this.actionBtns || {}).forEach((b) => b.classList.remove('selected'));
    if (id && this.actionBtns[id]) this.actionBtns[id].classList.add('selected');
  }

  // ---- リザルト ----
  showResult({ stars, coins, gameKey, newStamp, onRetry, onHome }) {
    const info = GAME_INFO[gameKey];
    this.el.result.classList.remove('hidden');
    this.el.resultTitle.textContent = stars >= 3 ? '🌟 だいせいこう!' : stars >= 2 ? '🎉 せいこう!' : '😊 よくがんばったね!';
    this.el.resultBody.innerHTML = `ごほうび <b>🪙 ${coins} まい</b> ゲット!`;
    this.el.resultStamp.classList.toggle('hidden', !newStamp);
    if (newStamp) this.el.resultStampIcon.textContent = info.icon;
    const starEls = this.el.resultStars.querySelectorAll('.rstar');
    starEls.forEach((s) => s.classList.remove('on'));
    for (let i = 0; i < stars; i++) {
      setTimeout(() => {
        starEls[i].classList.add('on');
        this.app.audio.sparkle();
      }, 350 + i * 380);
    }
    this.el.resultRetry.onclick = () => { this.app.audio.tap(); this.hideResult(); onRetry(); };
    this.el.resultHome.onclick = () => { this.app.audio.tap(); this.hideResult(); onHome(); };
  }
  hideResult() { this.el.result.classList.add('hidden'); }

  // ---- パネル(スタンプ/ぼうし) ----
  showPanel(tab = 'stamps') {
    this.el.panelOverlay.classList.remove('hidden');
    document.querySelectorAll('.panel-tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === tab));
    this.renderPanel(tab);
  }
  hidePanel() { this.el.panelOverlay.classList.add('hidden'); }

  renderPanel(tab) {
    const st = this.app.state;
    const body = this.el.panelBody;
    body.innerHTML = '';
    if (tab === 'stamps') {
      const grid = document.createElement('div');
      grid.className = 'stamp-grid';
      for (const [key, info] of Object.entries(GAME_INFO)) {
        const stars = st.stamps[key] || 0;
        const cell = document.createElement('div');
        cell.className = 'stamp-cell' + (stars > 0 ? ' got' : '');
        cell.innerHTML = `<div class="sc-icon">${info.icon}</div>
          <div class="sc-name">${info.name}</div>
          <div class="sc-stars">${stars > 0 ? '★'.repeat(stars) : '−'}</div>`;
        grid.appendChild(cell);
      }
      body.appendChild(grid);
      const done = Object.values(st.stamps).filter((v) => v > 0).length;
      const total = Object.keys(GAME_INFO).length;
      const note = document.createElement('div');
      note.className = 'stamp-complete';
      note.textContent = done >= total
        ? '👑 ぜんぶのおしごとマスター! すごい!!'
        : `あと ${total - done} こで コンプリート!`;
      body.appendChild(note);
    } else {
      const grid = document.createElement('div');
      grid.className = 'hat-grid';
      for (const hat of HATS) {
        const owned = st.hats.includes(hat.id);
        const cell = document.createElement('div');
        cell.className = 'hat-cell' + (owned ? '' : ' locked') + (st.equippedHat === hat.id ? ' equipped' : '');
        cell.innerHTML = `<div class="sc-icon">${owned ? hat.emoji : '❓'}</div>
          <div class="sc-name">${owned ? hat.name : '???'}</div>`;
        if (owned) {
          cell.addEventListener('click', () => {
            this.app.equipHat(hat.id);
            this.renderPanel('hats');
          });
        }
        grid.appendChild(cell);
      }
      body.appendChild(grid);
      const note = document.createElement('div');
      note.className = 'stamp-complete';
      note.textContent = 'タウンのガチャで ぼうしを あつめよう!';
      body.appendChild(note);
    }
  }

  // ---- ガチャ ----
  showGacha() {
    this.el.gachaOverlay.classList.remove('hidden');
    this.el.gachaCapsule.classList.add('hidden');
    this.el.gachaPrize.classList.add('hidden');
    this.el.gachaDome.classList.remove('hidden');
    this.updateGachaMsg();
  }
  hideGacha() { this.el.gachaOverlay.classList.add('hidden'); }
  updateGachaMsg(text) {
    this.el.gachaMsg.textContent = text || `コイン 20まい で 1かい まわせるよ (いま 🪙${this.app.state.coins})`;
    this.el.gachaSpin.disabled = this.app.state.coins < 20;
  }

  // ---- トースト ----
  toast(text, dur = 1800) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = text;
    this.el.toastArea.appendChild(t);
    setTimeout(() => t.classList.add('out'), dur);
    setTimeout(() => t.remove(), dur + 500);
  }

  // ---- フェード ----
  async fade(fn) {
    this.el.fader.classList.add('on');
    await new Promise((r) => setTimeout(r, 380));
    await fn();
    await new Promise((r) => setTimeout(r, 60));
    this.el.fader.classList.remove('on');
  }
}
