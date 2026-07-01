// もようがえ用カタログパネル(タブ・検索・ページング・サムネイル)
import { CATALOG, ALL_TABS, RARITY_ICONS } from '../items/catalog.js';
import { PALETTES } from '../items/style.js';
import { thumbnailFor } from '../items/thumbnails.js';
import { formatNum } from '../core/utils.js';
import { audio } from '../core/audio.js';
import { $ } from './ui.js';

const PER_PAGE = 18;

export class CatalogUI {
  constructor({ onSelect, getOwned }) {
    this.onSelect = onSelect;
    this.getOwned = getOwned;
    this.tab = ALL_TABS[0];
    this.page = 0;
    this.search = '';
    this.colorFilter = '';
    this.ownedOnly = false;
    this.selectedId = null;
    this._buildTabs();
    this._buildFilters();
  }

  _buildTabs() {
    const box = $('#catalog-tabs');
    box.innerHTML = '';
    for (const tab of ALL_TABS) {
      const b = document.createElement('button');
      b.className = 'cat-tab';
      b.textContent = tab;
      b.addEventListener('click', () => {
        audio.se('click');
        this.tab = tab;
        this.page = 0;
        this.render();
      });
      box.appendChild(b);
    }
  }

  _buildFilters() {
    const colorSel = $('#catalog-color-filter');
    for (const [id, pal] of Object.entries(PALETTES)) {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = pal.name;
      colorSel.appendChild(opt);
    }
    colorSel.addEventListener('change', () => { this.colorFilter = colorSel.value; this.page = 0; this.render(); });
    $('#catalog-search').addEventListener('input', (e) => { this.search = e.target.value.trim(); this.page = 0; this.render(); });
    $('#catalog-owned-only').addEventListener('change', (e) => { this.ownedOnly = e.target.checked; this.page = 0; this.render(); });
  }

  filtered() {
    return CATALOG.filter((i) => {
      if (i.tab !== this.tab) return false;
      if (this.colorFilter && i.palette !== this.colorFilter) return false;
      if (this.search && !i.name.includes(this.search)) return false;
      if (this.ownedOnly && this.getOwned(i.id) <= 0) return false;
      return true;
    });
  }

  render() {
    // タブのアクティブ表示
    const tabs = $('#catalog-tabs').children;
    for (const t of tabs) t.classList.toggle('active', t.textContent === this.tab);

    const list = this.filtered();
    const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
    this.page = Math.min(this.page, pages - 1);
    const items = list.slice(this.page * PER_PAGE, (this.page + 1) * PER_PAGE);

    const grid = $('#catalog-grid');
    grid.innerHTML = '';
    for (const item of items) {
      const tile = document.createElement('div');
      tile.className = 'item-tile' + (item.id === this.selectedId ? ' selected' : '');
      const owned = this.getOwned(item.id);
      tile.innerHTML = `
        <div class="thumb-placeholder">${item.icon}</div>
        <div class="item-name">${item.name}</div>
        <div class="item-price">${owned > 0 ? '' : '🪙' + formatNum(item.price)}</div>
        ${owned > 0 ? `<div class="item-owned">×${owned}</div>` : ''}
        ${item.rarity > 0 ? `<div class="item-rarity">${RARITY_ICONS[item.rarity]}</div>` : ''}
      `;
      tile.addEventListener('click', () => {
        audio.se('click');
        this.selectedId = item.id;
        this.onSelect(item);
        this.render();
      });
      grid.appendChild(tile);
    }

    // サムネイルを少しずつ生成(カクつき防止)
    let idx = 0;
    const tiles = [...grid.children];
    const genNext = () => {
      if (idx >= items.length || tiles[idx]?.parentElement !== grid) return;
      const item = items[idx];
      const tile = tiles[idx];
      idx++;
      try {
        const url = thumbnailFor(item);
        const ph = tile.querySelector('.thumb-placeholder');
        if (ph) {
          const img = document.createElement('img');
          img.src = url;
          ph.replaceWith(img);
        }
      } catch (e) { console.warn('thumbnail failed', e); }
      setTimeout(genNext, 16);
    };
    setTimeout(genNext, 30);

    // ページャー
    const pager = $('#catalog-pager');
    pager.innerHTML = '';
    const prev = document.createElement('button');
    prev.className = 'pager-btn'; prev.textContent = '◀';
    prev.disabled = this.page === 0;
    prev.addEventListener('click', () => { audio.se('click'); this.page--; this.render(); });
    const label = document.createElement('span');
    label.textContent = `${this.page + 1} / ${pages} (${formatNum(list.length)}こ)`;
    const next = document.createElement('button');
    next.className = 'pager-btn'; next.textContent = '▶';
    next.disabled = this.page >= pages - 1;
    next.addEventListener('click', () => { audio.se('click'); this.page++; this.render(); });
    pager.append(prev, label, next);
  }

  clearSelection() {
    this.selectedId = null;
    this.render();
  }
}
