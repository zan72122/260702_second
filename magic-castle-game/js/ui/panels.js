// パネル UI:ショップ / きせかえ / ずかん / おねがいリスト
import { OUTFITS, FISH, BUGS, FLOWERS, QUESTS, MISC_ITEMS, itemInfo, questById, npcById } from '../game/data.js';
import { state, addCoins, scheduleSave } from '../game/state.js';
import { audio } from '../core/audio.js';
import { ui } from './ui.js';

const $ = (id) => document.getElementById(id);

let onOutfitChange = null;
export function setOutfitChangeHandler(fn) { onOutfitChange = fn; }

let currentPanel = null;

export function closePanel() {
  $('panel-overlay').classList.add('hidden');
  currentPanel = null;
}

export function isPanelOpen() { return currentPanel !== null; }

function openPanel(title, tabs, renderTab) {
  currentPanel = title;
  $('panel-overlay').classList.remove('hidden');
  $('panel-title').textContent = title;
  const tabWrap = $('panel-tabs');
  tabWrap.innerHTML = '';
  const body = $('panel-body');
  let active = 0;
  const render = () => {
    [...tabWrap.children].forEach((el, i) => el.classList.toggle('active', i === active));
    body.innerHTML = '';
    renderTab(tabs[active], body);
  };
  tabs.forEach((tab, i) => {
    const b = document.createElement('button');
    b.className = 'panel-tab';
    b.textContent = tab.label;
    b.addEventListener('pointerdown', () => { active = i; audio.sfx('pop'); render(); });
    tabWrap.appendChild(b);
  });
  render();
}

// ---------- きせかえ ----------
export function openDressup() {
  const tabs = [
    { label: '👗 ドレス', cat: 'dress' },
    { label: '👑 かみかざり', cat: 'hat' },
    { label: '🪄 ステッキ', cat: 'wand' },
  ];
  openPanel('👗 きせかえ', tabs, (tab, body) => {
    const grid = document.createElement('div');
    grid.className = 'item-grid';
    for (const o of OUTFITS.filter((x) => x.cat === tab.cat)) {
      const owned = state.owned.includes(o.id);
      if (!owned) continue; // きせかえは持ち物だけ
      const card = document.createElement('div');
      card.className = 'item-card owned' + (state.equipped[o.cat] === o.id ? ' equipped' : '');
      card.innerHTML = `<div class="icon">${o.icon}</div><div class="name">${o.name}</div>`;
      card.addEventListener('pointerdown', () => {
        state.equipped[o.cat] = o.id;
        audio.sfx('sparkle');
        scheduleSave();
        if (onOutfitChange) onOutfitChange();
        openDressup(); // 再描画
      });
      grid.appendChild(card);
    }
    body.appendChild(grid);
    const note = document.createElement('p');
    note.style.cssText = 'font-size:12px;opacity:.75;margin-top:12px;text-align:center;';
    note.textContent = 'あたらしい おようふくは ショップで かえるよ!';
    body.appendChild(note);
  });
}

// ---------- ショップ ----------
export function openShop() {
  const tabs = [
    { label: '👗 おようふく', kind: 'outfit' },
    { label: '🌱 タネ', kind: 'seed' },
    { label: '💰 うる', kind: 'sell' },
  ];
  openPanel('🛍️ マジックブティック', tabs, (tab, body) => {
    const grid = document.createElement('div');
    grid.className = 'item-grid';

    if (tab.kind === 'outfit') {
      for (const o of OUTFITS.filter((x) => x.price > 0)) {
        const owned = state.owned.includes(o.id);
        const locked = (o.unlockLv ?? 1) > state.level;
        const card = document.createElement('div');
        card.className = 'item-card' + (owned ? ' owned' : '') + (locked ? ' locked' : '');
        card.innerHTML = `<div class="icon">${o.icon}</div><div class="name">${o.name}</div>` +
          (owned ? '<div class="price">かった!</div>'
            : locked ? `<div class="price">Lv.${o.unlockLv}で かいきん</div>`
            : `<div class="price">🪙${o.price}</div>`);
        if (!owned && !locked) {
          card.addEventListener('pointerdown', () => {
            if (state.coins < o.price) { audio.sfx('error'); ui.toast('🪙 コインが たりないよ…'); return; }
            addCoins(-o.price);
            state.owned.push(o.id);
            audio.sfx('fanfare');
            ui.toast(`${o.icon} ${o.name} を かった!`);
            scheduleSave();
            openShop();
          });
        }
        grid.appendChild(card);
      }
    }

    if (tab.kind === 'seed') {
      for (const f of FLOWERS) {
        const id = 'seed_' + f.id;
        const n = state.inventory[id] || 0;
        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `<div class="icon">🌱</div><div class="name">${f.name}のタネ</div><div class="price">🪙${f.seedPrice}</div>` +
          (n > 0 ? `<div class="count">${n}</div>` : '');
        card.addEventListener('pointerdown', () => {
          if (state.coins < f.seedPrice) { audio.sfx('error'); ui.toast('🪙 コインが たりないよ…'); return; }
          addCoins(-f.seedPrice);
          state.inventory[id] = (state.inventory[id] || 0) + 1;
          audio.sfx('coin');
          ui.toast(`🌱 ${f.name}のタネ を かった!`);
          scheduleSave();
          openShop();
        });
        grid.appendChild(card);
      }
    }

    if (tab.kind === 'sell') {
      const sellable = Object.entries(state.inventory).filter(([id, n]) => {
        if (n <= 0 || id.startsWith('seed_')) return false;
        const info = itemInfo(id);
        return info && (info.price ?? 0) > 0;
      });
      if (sellable.length === 0) {
        body.innerHTML = '<p style="text-align:center;opacity:.7;padding:24px 0;">うれるものが ないよ。<br>さかなや おはなを あつめよう!</p>';
        return;
      }
      for (const [id, n] of sellable) {
        const info = itemInfo(id);
        const price = Math.floor(info.price * 0.8);
        const card = document.createElement('div');
        card.className = 'item-card owned';
        card.innerHTML = `<div class="icon">${info.icon}</div><div class="name">${info.name}</div><div class="price">🪙${price}で うる</div><div class="count">${n}</div>`;
        card.addEventListener('pointerdown', () => {
          state.inventory[id]--;
          if (state.inventory[id] <= 0) delete state.inventory[id];
          addCoins(price);
          audio.sfx('coin');
          ui.toast(`${info.icon} ${info.name} を うった! +🪙${price}`);
          scheduleSave();
          openShop();
        });
        grid.appendChild(card);
      }
    }
    body.appendChild(grid);
  });
}

// ---------- ずかん ----------
export function openBook() {
  const tabs = [
    { label: '🐟 さかな', kind: 'fish', list: FISH },
    { label: '🦋 むし', kind: 'bugs', list: BUGS },
    { label: '🌷 おはな', kind: 'flowers', list: FLOWERS },
    { label: '🎒 もちもの', kind: 'inv' },
  ];
  openPanel('📖 ずかん', tabs, (tab, body) => {
    if (tab.kind === 'inv') {
      const entries = Object.entries(state.inventory).filter(([, n]) => n > 0);
      if (entries.length === 0) {
        body.innerHTML = '<p style="text-align:center;opacity:.7;padding:24px 0;">もちものは からっぽ。</p>';
        return;
      }
      for (const [id, n] of entries) {
        const info = itemInfo(id) || { name: id, icon: '❓' };
        const row = document.createElement('div');
        row.className = 'book-row';
        row.innerHTML = `<div class="icon">${info.icon}</div><div class="info"><div class="nm">${info.name}</div></div><div class="cnt">×${n}</div>`;
        body.appendChild(row);
      }
      return;
    }
    const col = state.collections[tab.kind] || {};
    let found = 0;
    for (const item of tab.list) {
      const n = col[item.id] || 0;
      if (n > 0) found++;
      const row = document.createElement('div');
      row.className = 'book-row' + (n > 0 ? '' : ' unknown');
      const stars = '⭐'.repeat(item.rarity || 1);
      row.innerHTML = n > 0
        ? `<div class="icon">${item.icon}</div><div class="info"><div class="nm">${item.name} <small>${stars}</small></div><div class="ds">${item.desc || ''}</div></div><div class="cnt">×${n}</div>`
        : `<div class="icon">❓</div><div class="info"><div class="nm">???</div><div class="ds">まだ みつけていない</div></div>`;
      body.appendChild(row);
    }
    const head = document.createElement('p');
    head.style.cssText = 'font-size:12px;color:var(--gold);text-align:center;margin:4px 0 10px;font-weight:bold;';
    head.textContent = `コンプリート ${found} / ${tab.list.length}`;
    body.prepend(head);
  });
}

// ---------- おねがいリスト ----------
export function openQuestLog() {
  const tabs = [
    { label: '⭐ うけている', kind: 'active' },
    { label: '✅ クリアした', kind: 'done' },
  ];
  openPanel('📜 おねがい', tabs, (tab, body) => {
    if (tab.kind === 'active') {
      if (state.activeQuests.length === 0) {
        body.innerHTML = '<p style="text-align:center;opacity:.7;padding:24px 0;">うけている おねがいは ないよ。<br>「❗」マークの 住人に はなしかけてみよう!</p>';
        return;
      }
      for (const aq of state.activeQuests) {
        const q = questById(aq.id);
        if (!q) continue;
        const npc = npcById(q.npc);
        const cur = q.type === 'item' || q.type === 'deliver'
          ? Math.min(q.count, state.inventory[q.item] || 0)
          : Math.min(q.count, aq.prog);
        const row = document.createElement('div');
        row.className = 'quest-row' + (cur >= q.count ? ' done' : '');
        row.innerHTML = `<div class="q-name">${npc.icon} ${q.name}</div>
          <div class="q-desc">${q.desc}</div>
          <div class="q-prog">${cur >= q.count ? '✅ ' + npc.name + 'に ほうこくしよう!' : `すすみぐあい: ${cur} / ${q.count}`}
          &nbsp;|&nbsp; ごほうび: 🪙${q.reward.coins} 💖${q.reward.happy}</div>`;
        body.appendChild(row);
      }
    } else {
      if (state.questsDone.length === 0) {
        body.innerHTML = '<p style="text-align:center;opacity:.7;padding:24px 0;">まだ クリアした おねがいは ないよ。</p>';
        return;
      }
      for (const id of state.questsDone) {
        const q = questById(id);
        if (!q) continue;
        const npc = npcById(q.npc);
        const row = document.createElement('div');
        row.className = 'quest-row done';
        row.innerHTML = `<div class="q-name">✅ ${npc.icon} ${q.name}</div>`;
        body.appendChild(row);
      }
    }
  });
}

// 閉じるボタン・背景タップ
$('panel-close').addEventListener('pointerdown', () => { audio.sfx('pop'); closePanel(); });
$('panel-overlay').addEventListener('pointerdown', (e) => {
  if (e.target === $('panel-overlay')) closePanel();
});
void MISC_ITEMS;
