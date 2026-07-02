// HUD とパネルUI
import { FLOWERS, DECOR, DRESS_COLORS, HAIR_COLORS, TIARAS, BUTTERFLIES, levelProgress, LEVELS } from '../game/state.js';
import { formatNum } from '../core/utils.js';

const $ = (id) => document.getElementById(id);

export class HUD {
  constructor(state, audio) {
    this.state = state;
    this.audio = audio;
    this.onBuySeed = null;
    this.onStartDecor = null;   // (type) => {}
    this.onDressChanged = null;
    this.messageQueue = [];
    this.messageShowing = false;

    state.on('currency', () => this.refreshStats());
    state.on('inventory', () => this.refreshStats());

    $('panel-close').addEventListener('click', () => { this.audio.tap(); this.closePanel(); });
    $('panel-overlay').addEventListener('click', (e) => {
      if (e.target === $('panel-overlay')) this.closePanel();
    });
    $('fairy-bubble').addEventListener('click', () => this.advanceMessage());

    // メニューボタン
    $('btn-bag').addEventListener('click', () => { this.audio.tap(); this.openBag(); });
    $('btn-shop').addEventListener('click', () => { this.audio.tap(); this.openShop(); });
    $('btn-dress').addEventListener('click', () => { this.audio.tap(); this.openDress(); });
    $('btn-album').addEventListener('click', () => { this.audio.tap(); this.openAlbum(); });
    $('btn-decor').addEventListener('click', () => { this.audio.tap(); this.openDecorList(); });
    $('btn-sound').addEventListener('click', () => {
      this.audio.setEnabled(!this.audio.enabled);
      $('btn-sound').textContent = this.audio.enabled ? '🔊' : '🔇';
      this.audio.tap();
    });
  }

  show() { $('hud').classList.remove('hidden'); }

  refreshStats() {
    const d = this.state.data;
    $('stat-sparkle').textContent = formatNum(d.sparkles);
    $('stat-petal').textContent = formatNum(d.petals);
    $('stat-level').textContent = this.state.level;
    $('level-fill').style.width = `${Math.floor(levelProgress(d.xp) * 100)}%`;
  }

  setClock(label) { $('stat-clock').textContent = label; }

  setQuest(title, progress, count, done) {
    $('quest-title').textContent = done ? `${title} ✓` : title;
    $('quest-progress').innerHTML = done
      ? '<span class="quest-done">かんりょう! ルミにほうこくしよう</span>'
      : `${progress} / ${count}`;
  }

  clearQuest() {
    $('quest-title').textContent = 'ぜんぶクリア! すごい!';
    $('quest-progress').textContent = 'じゆうに ガーデンづくりを たのしんでね';
  }

  toast(msg) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    $('toast-area').appendChild(el);
    setTimeout(() => el.remove(), 2800);
  }

  // ---------- ようせいのメッセージ ----------
  fairySay(lines, onDone) {
    const arr = Array.isArray(lines) ? lines : [lines];
    this.messageQueue.push({ lines: arr, i: 0, onDone });
    if (!this.messageShowing) this.nextMessage();
  }

  nextMessage() {
    const m = this.messageQueue[0];
    if (!m) { this.messageShowing = false; $('fairy-bubble').classList.add('hidden'); return; }
    this.messageShowing = true;
    $('fairy-bubble').classList.remove('hidden');
    $('fairy-text').textContent = m.lines[m.i];
  }

  advanceMessage() {
    this.audio.tap();
    const m = this.messageQueue[0];
    if (!m) return;
    m.i++;
    if (m.i >= m.lines.length) {
      this.messageQueue.shift();
      m.onDone?.();
      this.nextMessage();
    } else {
      $('fairy-text').textContent = m.lines[m.i];
    }
  }

  // ---------- パネル ----------
  openPanel(title, tabs = null) {
    $('panel-overlay').classList.remove('hidden');
    $('panel-title').textContent = title;
    $('panel-tabs').innerHTML = '';
    $('panel-content').innerHTML = '';
    if (tabs) {
      tabs.forEach((t, i) => {
        const b = document.createElement('button');
        b.className = 'tab-btn' + (i === 0 ? ' active' : '');
        b.textContent = t.label;
        b.addEventListener('click', () => {
          this.audio.tap();
          [...$('panel-tabs').children].forEach((c) => c.classList.remove('active'));
          b.classList.add('active');
          t.render();
        });
        $('panel-tabs').appendChild(b);
      });
      tabs[0].render();
    }
  }

  closePanel() { $('panel-overlay').classList.add('hidden'); }

  get panelOpen() { return !$('panel-overlay').classList.contains('hidden'); }

  // ---------- バッグ ----------
  openBag() {
    this.openPanel('バッグ 🎒');
    const grid = document.createElement('div');
    grid.className = 'item-grid';
    const seeds = this.state.data.seeds;
    const entries = Object.entries(seeds).filter(([, n]) => n > 0);
    if (!entries.length) {
      $('panel-content').innerHTML = '<p style="text-align:center;color:#c47ba5;font-weight:bold;padding:24px 0;">たねが ないよ。ショップで かってみよう!</p>';
      return;
    }
    entries.forEach(([type, n]) => {
      const def = FLOWERS[type];
      if (!def) return;
      grid.appendChild(card({
        icon: def.icon, name: def.name,
        desc: def.desc,
        count: `たね × ${n}`,
        note: `そだつまで やく${def.growTime}びょう`,
      }));
    });
    $('panel-content').appendChild(grid);
  }

  // ---------- ショップ ----------
  openShop() {
    const renderSeeds = () => {
      const c = $('panel-content');
      c.innerHTML = '';
      const grid = document.createElement('div');
      grid.className = 'item-grid';
      Object.entries(FLOWERS).forEach(([type, def]) => {
        const locked = this.state.level < def.unlockLevel;
        const el = card({
          icon: def.icon, name: def.name, desc: def.desc,
          note: locked ? `Lv.${def.unlockLevel} でかいきん` : `しゅうかく ✨${def.sparkle}`,
          locked,
        });
        if (!locked) {
          const btn = document.createElement('button');
          btn.className = 'card-btn';
          btn.textContent = `✨${def.seedCost} でかう`;
          btn.disabled = this.state.data.sparkles < def.seedCost;
          btn.addEventListener('click', () => {
            if (this.state.data.sparkles < def.seedCost) { this.audio.error(); return; }
            this.state.addSparkles(-def.seedCost);
            this.state.addSeed(type);
            this.state.stat('seedsBought');
            this.state.save();
            this.audio.buy();
            this.toast(`${def.name}のたねを かった!`);
            renderSeeds();
          });
          el.appendChild(btn);
        }
        grid.appendChild(el);
      });
      c.appendChild(grid);
    };

    const renderDecor = () => {
      const c = $('panel-content');
      c.innerHTML = '';
      const grid = document.createElement('div');
      grid.className = 'item-grid';
      Object.entries(DECOR).forEach(([type, def]) => {
        const locked = this.state.level < def.unlockLevel;
        const el = card({
          icon: def.icon, name: def.name, desc: def.desc,
          note: locked ? `Lv.${def.unlockLevel} でかいきん` : '',
          locked,
        });
        if (!locked) {
          const btn = document.createElement('button');
          btn.className = 'card-btn purple';
          btn.textContent = `✨${def.cost} でおく`;
          btn.disabled = this.state.data.sparkles < def.cost;
          btn.addEventListener('click', () => {
            if (this.state.data.sparkles < def.cost) { this.audio.error(); return; }
            this.audio.buy();
            this.closePanel();
            this.onStartDecor?.(type, def.cost);
          });
          el.appendChild(btn);
        }
        grid.appendChild(el);
      });
      c.appendChild(grid);
    };

    this.openPanel('ショップ 🛍️', [
      { label: '🌷 たね', render: renderSeeds },
      { label: '🪄 かざり', render: renderDecor },
    ]);
  }

  // ---------- もようがえ(かざり直接) ----------
  openDecorList() { this.openShop(); const tabs = $('panel-tabs').children; tabs[1]?.click(); }

  // ---------- ドレスアップ ----------
  openDress() {
    const d = this.state.data;
    const render = () => {
      const c = $('panel-content');
      c.innerHTML = '';

      const section = (label) => {
        const s = document.createElement('div');
        s.className = 'section-label';
        s.textContent = label;
        c.appendChild(s);
        const row = document.createElement('div');
        row.className = 'swatch-row';
        c.appendChild(row);
        return row;
      };

      const makeSwatch = (row, { colorCss, emoji, active, locked, price, onTap, name }) => {
        const sw = document.createElement('div');
        sw.className = 'swatch' + (active ? ' active' : '') + (locked ? ' locked' : '');
        if (colorCss) sw.style.background = colorCss;
        if (emoji) sw.textContent = emoji;
        sw.title = name;
        sw.addEventListener('click', () => onTap(sw));
        row.appendChild(sw);
        if (price) {
          const tag = document.createElement('div');
          tag.style.cssText = 'font-size:10px;font-weight:bold;color:#b04585;text-align:center;';
          tag.textContent = price;
        }
        return sw;
      };

      const buyOrWear = (kind, key, def, refresh) => {
        const owned = d.owned[kind].includes(key);
        const locked = this.state.level < def.unlockLevel;
        if (locked) { this.audio.error(); this.toast(`Lv.${def.unlockLevel} でかいきんされるよ`); return; }
        if (owned) {
          d.dress[kind] = key;
          this.state.stat('dressChanged');
          this.state.save();
          this.audio.dress();
          this.onDressChanged?.();
          refresh();
        } else if (d.sparkles >= def.cost) {
          this.state.addSparkles(-def.cost);
          d.owned[kind].push(key);
          d.dress[kind] = key;
          this.state.stat('dressChanged');
          this.state.save();
          this.audio.buy();
          this.toast(`${def.name} をかった!`);
          this.onDressChanged?.();
          refresh();
        } else {
          this.audio.error();
          this.toast(`✨が たりないよ (✨${def.cost})`);
        }
      };

      const rowD = section('👗 ドレス');
      Object.entries(DRESS_COLORS).forEach(([key, def]) => {
        const owned = d.owned.dress.includes(key);
        const locked = this.state.level < def.unlockLevel;
        makeSwatch(rowD, {
          colorCss: def.rainbow
            ? 'conic-gradient(#ff6b8a,#ffb347,#ffe066,#7de8a2,#66c7ff,#b388ff,#ff6b8a)'
            : `#${def.color.toString(16).padStart(6, '0')}`,
          emoji: owned ? '' : (locked ? '🔒' : `✨`),
          active: d.dress.dress === key,
          locked,
          name: def.name,
          onTap: () => buyOrWear('dress', key, def, render),
        });
      });

      const rowH = section('💇 かみのいろ');
      Object.entries(HAIR_COLORS).forEach(([key, def]) => {
        const owned = d.owned.hair.includes(key);
        const locked = this.state.level < def.unlockLevel;
        makeSwatch(rowH, {
          colorCss: `#${def.color.toString(16).padStart(6, '0')}`,
          emoji: owned ? '' : (locked ? '🔒' : '✨'),
          active: d.dress.hair === key,
          locked,
          name: def.name,
          onTap: () => buyOrWear('hair', key, def, render),
        });
      });

      const rowT = section('👑 ティアラ');
      Object.entries(TIARAS).forEach(([key, def]) => {
        const owned = d.owned.tiara.includes(key);
        const locked = this.state.level < def.unlockLevel;
        makeSwatch(rowT, {
          colorCss: '#fff2f8',
          emoji: locked ? '🔒' : def.icon,
          active: d.dress.tiara === key,
          locked,
          name: def.name,
          onTap: () => buyOrWear('tiara', key, def, render),
        });
      });

      const note = document.createElement('p');
      note.style.cssText = 'font-size:11.5px;color:#c47ba5;font-weight:bold;padding:6px 2px;';
      note.textContent = 'もっていないものは タップすると ✨でかえるよ (ドレス✨120〜 / かみ✨80〜 / ティアラ✨200〜)';
      c.appendChild(note);
    };
    this.openPanel('きせかえ 👗');
    render();
  }

  // ---------- ずかん ----------
  openAlbum() {
    const renderButterflies = () => {
      const c = $('panel-content');
      c.innerHTML = '';
      const grid = document.createElement('div');
      grid.className = 'item-grid';
      Object.entries(BUTTERFLIES).forEach(([key, def]) => {
        const n = this.state.data.album[key] || 0;
        const el = card({
          icon: def.icon, name: n ? def.name : '???',
          desc: n ? '★'.repeat(def.rarity) : 'まだみつけてない',
          count: n ? `つかまえた × ${n}` : '',
        });
        if (!n) el.classList.add('album-card', 'unknown');
        grid.appendChild(el);
      });
      c.appendChild(grid);
    };

    const renderStats = () => {
      const c = $('panel-content');
      const s = this.state.data.stats;
      const rows = [
        ['🌱 うえたたね', s.planted],
        ['💧 みずやり', s.watered],
        ['🌸 さかせた花', s.bloomed],
        ['✋ しゅうかく', s.harvested],
        ['🦋 ちょうちょ', s.butterflies],
        ['🪄 おいたかざり', s.decorPlaced],
        ['👗 きがえたかいすう', s.dressChanged],
        ['📷 とったしゃしん', s.photos],
      ];
      c.innerHTML = `<div style="padding:6px 4px;">${rows.map(([k, v]) =>
        `<div style="display:flex;justify-content:space-between;padding:9px 8px;border-bottom:1.5px dashed #ffd3e8;font-weight:900;color:#9c4079;"><span>${k}</span><span style="color:#7c5cd6;">${v || 0}</span></div>`,
      ).join('')}
      <div style="padding:12px 8px;font-weight:900;color:#b04585;">ガーデンレベル ${this.state.level} / ${LEVELS.length}</div></div>`;
    };

    this.openPanel('ずかん 📖', [
      { label: '🦋 ちょうちょ', render: renderButterflies },
      { label: '📊 きろく', render: renderStats },
    ]);
  }

  // ---------- たねえらび(花だんタップ時) ----------
  openSeedPicker(onPick) {
    this.openPanel('たねを えらぼう 🌱');
    const c = $('panel-content');
    const grid = document.createElement('div');
    grid.className = 'item-grid';
    const seeds = Object.entries(this.state.data.seeds).filter(([, n]) => n > 0);
    if (!seeds.length) {
      c.innerHTML = '<p style="text-align:center;color:#c47ba5;font-weight:bold;padding:24px 0;">たねが ないよ!<br>ショップで かってきてね 🛍️</p>';
      return;
    }
    seeds.forEach(([type, n]) => {
      const def = FLOWERS[type];
      if (!def) return;
      const el = card({ icon: def.icon, name: def.name, desc: def.desc, count: `のこり × ${n}` });
      const btn = document.createElement('button');
      btn.className = 'card-btn pink';
      btn.textContent = 'うえる';
      btn.addEventListener('click', () => {
        this.closePanel();
        onPick(type);
      });
      el.appendChild(btn);
      grid.appendChild(el);
    });
    c.appendChild(grid);
  }
}

function card({ icon, name, desc, count, note, locked }) {
  const el = document.createElement('div');
  el.className = 'item-card' + (locked ? ' locked' : '');
  el.innerHTML = `
    <div class="item-icon">${icon}</div>
    <div class="item-name">${name}</div>
    ${desc ? `<div class="item-desc">${desc}</div>` : ''}
    ${count ? `<div class="item-count">${count}</div>` : ''}
    ${note ? `<div class="item-desc">${note}</div>` : ''}
  `;
  return el;
}
