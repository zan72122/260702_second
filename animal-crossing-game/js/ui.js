// ============================================================
// UI（タイトル / HUD / ジョイスティック / 会話 / パネル各種）
// ============================================================

import { state, addBells, removeItemAt, saveGame } from './state.js';
import { FISH, BUGS, FOSSILS, SHOP_GOODS, flowerById } from './items.js';
import { sfx, speak, stopSpeak, setMuted } from './audio.js';
import { VILLAGERS } from './characters.js';
import { friendshipLevel } from './villagers.js';

const $ = (id) => document.getElementById(id);

// ---------------- 実績 ----------------
export const ACHIEVEMENTS = [
  { id: 'first_fish', name: 'はじめての つり', desc: 'さかなを 1ぴき つる', reward: 300, cond: (s) => s.stats.fishCaught >= 1 },
  { id: 'fish10', name: 'つりめいじん', desc: 'さかなを 10ぴき つる', reward: 1000, cond: (s) => s.stats.fishCaught >= 10 },
  { id: 'first_bug', name: 'はじめての むしとり', desc: 'むしを 1ぴき つかまえる', reward: 300, cond: (s) => s.stats.bugsCaught >= 1 },
  { id: 'bug10', name: 'むしはかせ', desc: 'むしを 10ぴき つかまえる', reward: 1000, cond: (s) => s.stats.bugsCaught >= 10 },
  { id: 'fossil3', name: 'はっくつ たんけんたい', desc: 'かせきを 3つ ほりだす', reward: 800, cond: (s) => s.stats.fossilsDug >= 3 },
  { id: 'shake10', name: 'ゆらゆら きこり', desc: '木を 10かい ゆらす', reward: 500, cond: (s) => s.stats.treesShaken >= 10 },
  { id: 'water10', name: 'はなの おせわがかり', desc: 'はなに 10かい みずをやる', reward: 500, cond: (s) => s.stats.flowersWatered >= 10 },
  { id: 'balloon3', name: 'バルーン ハンター', desc: 'ふうせんを 3つ わる', reward: 800, cond: (s) => s.stats.balloonsPopped >= 3 },
  { id: 'talk20', name: 'おしゃべりずき', desc: 'じゅうみんと 20かい はなす', reward: 600, cond: (s) => s.stats.talks >= 20 },
  {
    id: 'zukan15', name: 'ずかん コレクター', desc: 'ずかんを 15しゅるい うめる', reward: 1500,
    cond: (s) => Object.keys(s.museum.fish).length + Object.keys(s.museum.bug).length + Object.keys(s.museum.fossil).length >= 15,
  },
  {
    id: 'friend5', name: 'しんゆう', desc: 'だれかと なかよし MAX になる', reward: 3000,
    cond: (s) => Object.values(s.friendship).some((p) => friendshipLevel(p) >= 5),
  },
  { id: 'rich', name: 'ベル リッチ', desc: '10000ベル かせぐ', reward: 2000, cond: (s) => s.stats.bellsEarned >= 10000 },
];

export function createUI(hooks) {
  const ui = {};
  let modalCount = 0;
  ui.isModalOpen = () => modalCount > 0;

  // ============ タイトル ============
  {
    let shirt = '#e8554d';
    $('shirt-pick').addEventListener('click', (e) => {
      const btn = e.target.closest('.shirt-btn');
      if (!btn) return;
      document.querySelectorAll('.shirt-btn').forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
      shirt = btn.dataset.color;
      sfx.tap();
    });
    $('start-btn').addEventListener('click', () => {
      const name = $('player-name').value.trim() || 'たびびと';
      $('title-screen').classList.add('fade-out');
      setTimeout(() => { $('title-screen').hidden = true; }, 850);
      hooks.onStart(name, shirt);
    });
  }
  ui.markContinue = (playerName) => {
    $('continue-note').hidden = false;
    $('player-name').value = playerName;
  };

  // ============ HUD ============
  ui.show = () => { $('hud').hidden = false; };
  ui.updateBells = () => { $('bells-num').textContent = state.bells.toLocaleString('ja-JP'); };
  ui.updateClock = (date, time, weatherIcon) => {
    $('clock-date').textContent = date;
    $('clock-time').textContent = time;
    $('weather-icon').textContent = weatherIcon;
  };
  ui.setQuest = (text) => {
    $('quest-chip').hidden = !text;
    $('quest-text').textContent = text || '';
  };

  // ============ ジョイスティック ============
  const joy = { x: 0, y: 0 };
  ui.joy = joy;
  {
    const zone = $('joystick');
    const base = $('joy-base');
    const stick = $('joy-stick');
    let pid = null;
    let cx = 0, cy = 0;
    const R = 46;
    function setStick(dx, dy) {
      const d = Math.hypot(dx, dy);
      const cl = d > R ? R / d : 1;
      stick.style.transform = `translate(calc(-50% + ${dx * cl}px), calc(-50% + ${dy * cl}px))`;
      joy.x = (dx * cl) / R;
      joy.y = (dy * cl) / R;
    }
    zone.addEventListener('pointerdown', (e) => {
      if (pid !== null) return;
      pid = e.pointerId;
      zone.setPointerCapture(pid);
      const rect = base.getBoundingClientRect();
      cx = rect.left + rect.width / 2;
      cy = rect.top + rect.height / 2;
      setStick(e.clientX - cx, e.clientY - cy);
    });
    zone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== pid) return;
      setStick(e.clientX - cx, e.clientY - cy);
    });
    const end = (e) => {
      if (e.pointerId !== pid) return;
      pid = null;
      joy.x = 0; joy.y = 0;
      stick.style.transform = 'translate(-50%, -50%)';
    };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);

    // キーボード（PC でのおためし用）
    const keys = {};
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      keys[e.key] = true;
      updateKeyJoy();
      if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
        if (!$('dialog').hidden) { advanceDialog(); }
        else if (!$('action-btn').hidden) hooks.onAction();
      }
    });
    window.addEventListener('keyup', (e) => { keys[e.key] = false; updateKeyJoy(); });
    function updateKeyJoy() {
      let x = 0, y = 0;
      if (keys.ArrowLeft || keys.a) x -= 1;
      if (keys.ArrowRight || keys.d) x += 1;
      if (keys.ArrowUp || keys.w) y -= 1;
      if (keys.ArrowDown || keys.s) y += 1;
      if (x || y || pid === null) { joy.x = x; joy.y = y; }
    }
  }

  // ============ アクションボタン ============
  {
    $('action-btn').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      hooks.onAction();
    });
  }
  ui.setAction = (label) => {
    const btn = $('action-btn');
    if (!label) { btn.hidden = true; return; }
    if (btn.hidden || $('action-label').textContent !== label) {
      $('action-label').textContent = label;
      btn.hidden = false;
    }
  };

  // ============ どうぐホイール ============
  const TOOL_ICONS = { hand: '✋', rod: '🎣', net: '🦋', shovel: '⛏️', can: '🚿' };
  function refreshToolWheel() {
    document.querySelectorAll('.tool-item').forEach((el) => {
      const t = el.dataset.tool;
      el.classList.toggle('selected', state.player.tool === t);
      el.style.display = state.tools[t] ? '' : 'none';
    });
    $('tool-btn').textContent = TOOL_ICONS[state.player.tool];
  }
  {
    $('tool-btn').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      sfx.tap();
      const w = $('tool-wheel');
      w.hidden = !w.hidden;
      refreshToolWheel();
    });
    $('tool-wheel').addEventListener('click', (e) => {
      const el = e.target.closest('.tool-item');
      if (!el) return;
      sfx.select();
      hooks.onToolChange(el.dataset.tool);
      refreshToolWheel();
      $('tool-wheel').hidden = true;
    });
  }
  ui.refreshToolWheel = refreshToolWheel;

  // ============ サウンドボタン ============
  {
    const btn = $('btn-sound');
    const sync = () => btn.classList.toggle('off', state.muted);
    btn.addEventListener('click', () => {
      setMuted(!state.muted);
      sync();
      sfx.tap();
    });
    sync();
    ui.syncSound = sync;
  }

  // ============ トースト ============
  ui.toast = (msg, dur = 2400) => {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    $('toast-wrap').appendChild(el);
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 450);
    }, dur);
  };

  // ============ 会話ウィンドウ ============
  let dlg = null; // { lines, i, typing, timer, pitch, choices, onChoice, onDone }
  function typeLine(text) {
    const el = $('dialog-text');
    el.textContent = '';
    dlg.typing = true;
    $('dialog-next').style.visibility = 'hidden';
    let i = 0;
    clearInterval(dlg.timer);
    speak(text, dlg.pitch);
    dlg.timer = setInterval(() => {
      i++;
      el.textContent = text.slice(0, i);
      if (i >= text.length) {
        clearInterval(dlg.timer);
        dlg.typing = false;
        finishLine();
      }
    }, 34);
  }
  function finishLine() {
    const isLast = dlg.i >= dlg.lines.length - 1;
    if (isLast && dlg.choices) {
      const box = $('dialog-choices');
      box.innerHTML = '';
      for (const c of dlg.choices) {
        const b = document.createElement('button');
        b.textContent = c.label;
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          sfx.select();
          closeDialog();
          c.onPick && c.onPick();
        });
        box.appendChild(b);
      }
      box.hidden = false;
      $('dialog-next').style.visibility = 'hidden';
    } else {
      $('dialog-next').style.visibility = 'visible';
    }
  }
  function advanceDialog() {
    if (!dlg) return;
    if (dlg.typing) {
      // ぜんぶ表示
      clearInterval(dlg.timer);
      stopSpeak();
      $('dialog-text').textContent = dlg.lines[dlg.i];
      dlg.typing = false;
      finishLine();
      return;
    }
    if (dlg.i >= dlg.lines.length - 1) {
      if (dlg.choices) return; // 選択待ち
      closeDialog();
      return;
    }
    dlg.i++;
    sfx.tap();
    typeLine(dlg.lines[dlg.i]);
  }
  function closeDialog() {
    if (!dlg) return;
    const done = dlg.onDone;
    clearInterval(dlg.timer);
    stopSpeak();
    dlg = null;
    $('dialog').hidden = true;
    modalCount--;
    done && done();
  }
  ui.dialog = ({ name, color = '#e8554d', pitch = 1, lines, choices = null, onDone = null }) => {
    if (dlg) closeDialog();
    modalCount++;
    dlg = { lines, i: 0, typing: false, timer: 0, pitch, choices, onDone };
    $('dialog-name').textContent = name;
    $('dialog-name').style.background = color;
    $('dialog-choices').hidden = true;
    $('dialog').hidden = false;
    typeLine(lines[0]);
  };
  $('dialog').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    advanceDialog();
  });

  // ============ キャッチカード ============
  let catchTimer = 0;
  ui.catchCard = ({ icon, title, name, flavor, onDone = null }) => {
    modalCount++;
    $('catch-icon').textContent = icon;
    $('catch-title').textContent = title;
    $('catch-name').textContent = name;
    $('catch-flavor').textContent = flavor || '';
    $('catch-card').hidden = false;
    const close = () => {
      clearTimeout(catchTimer);
      $('catch-card').hidden = true;
      $('catch-card').removeEventListener('pointerdown', close);
      modalCount--;
      onDone && onDone();
    };
    $('catch-card').addEventListener('pointerdown', close);
    catchTimer = setTimeout(close, 3200);
  };

  // ============ パネル基盤 ============
  let panelCloseCb = null;
  function openPanel(title, tabs, onTab, onClose = null) {
    if ($('panel').hidden) modalCount++; // 再描画時に二重カウントしない
    panelCloseCb = onClose;
    $('panel-title').textContent = title;
    $('panel-foot').textContent = '';
    const tabBox = $('panel-tabs');
    tabBox.innerHTML = '';
    if (tabs && tabs.length > 1) {
      tabs.forEach((t, i) => {
        const b = document.createElement('button');
        b.textContent = t;
        if (i === 0) b.classList.add('active');
        b.addEventListener('click', () => {
          sfx.tap();
          tabBox.querySelectorAll('button').forEach((x) => x.classList.remove('active'));
          b.classList.add('active');
          onTab(i);
        });
        tabBox.appendChild(b);
      });
    }
    $('panel').hidden = false;
    onTab(0);
  }
  function closePanel() {
    if ($('panel').hidden) return;
    $('panel').hidden = true;
    modalCount--;
    const cb = panelCloseCb;
    panelCloseCb = null;
    cb && cb();
    saveGame();
  }
  $('panel-close').addEventListener('click', () => { sfx.cancel(); closePanel(); });
  ui.closePanel = closePanel;

  // ============ ポケット ============
  // mode: 'normal' | 'sell' | 'gift'
  ui.openPockets = (mode = 'normal', onGift = null) => {
    let selected = -1;
    const body = $('panel-body');
    function render() {
      body.innerHTML = '';
      const grid = document.createElement('div');
      grid.className = 'grid-items';
      state.inventory.forEach((it, i) => {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        if (i === selected) cell.style.outline = '3px solid var(--ui-orange)';
        cell.innerHTML = `<div class="cell-icon">${it.icon}</div><div class="cell-name">${it.name}</div>` +
          (mode === 'sell' ? `<div class="cell-sub">${it.price} ベル</div>` : '');
        cell.addEventListener('click', () => {
          if (mode === 'sell') {
            sfx.coin();
            addBells(it.price);
            removeItemAt(i);
            ui.updateBells();
            ui.toast(`${it.name} を ${it.price}ベルで うった！`);
            render();
          } else if (mode === 'gift') {
            if (it.kind !== 'fruit') { ui.toast('フルーツだけ プレゼントできるよ'); return; }
            removeItemAt(i);
            closePanel();
            onGift && onGift(it);
          } else {
            selected = selected === i ? -1 : i;
            sfx.tap();
            render();
          }
        });
        grid.appendChild(cell);
      });
      for (let i = state.inventory.length; i < state.maxInv; i++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell empty-slot';
        grid.appendChild(cell);
      }
      body.appendChild(grid);

      // フッター
      const foot = $('panel-foot');
      foot.innerHTML = '';
      if (mode === 'sell') {
        foot.textContent = 'うりたいものを タップしてね';
      } else if (mode === 'gift') {
        foot.textContent = 'プレゼントする フルーツを えらんでね';
      } else if (selected >= 0) {
        const it = state.inventory[selected];
        const acts = [];
        if (it.kind === 'fruit') acts.push(['たべる 🍴', () => {
          removeItemAt(selected);
          selected = -1;
          sfx.pickup();
          ui.toast('おいしい！ しばらく はやあるきできる！');
          hooks.onEatFruit && hooks.onEatFruit();
          render();
        }]);
        if (it.kind === 'seed') acts.push(['うえる 🌱', () => {
          removeItemAt(selected);
          selected = -1;
          closePanel();
          hooks.onPlantSeed && hooks.onPlantSeed();
        }]);
        acts.push(['すてる 🗑', () => {
          removeItemAt(selected);
          selected = -1;
          sfx.cancel();
          render();
        }]);
        for (const [label, fn] of acts) {
          const b = document.createElement('button');
          b.className = 'shop-buy';
          b.style.margin = '0 6px';
          b.textContent = label;
          b.addEventListener('click', fn);
          foot.appendChild(b);
        }
      } else {
        foot.textContent = `もちもの ${state.inventory.length} / ${state.maxInv}`;
      }
    }
    openPanel(mode === 'gift' ? 'プレゼントをえらぶ' : 'ポケット', null, render);
  };

  // ============ ずかん ============
  ui.openZukan = () => {
    const cats = [
      { key: 'fish', label: 'さかな', all: FISH },
      { key: 'bug', label: 'むし', all: BUGS },
      { key: 'fossil', label: 'かせき', all: FOSSILS },
    ];
    openPanel('いきもの ずかん', cats.map((c) => c.label), (tab) => {
      const cat = cats[tab];
      const body = $('panel-body');
      body.innerHTML = '';
      const book = state.museum[cat.key];
      const known = cat.all.filter((d) => book[d.id]).length;
      const pct = Math.round((known / cat.all.length) * 100);
      body.innerHTML = `
        <div class="zukan-caption">${known} / ${cat.all.length} しゅるい はっけん！</div>
        <div class="zukan-progress"><div class="bar" style="width:${pct}%"></div></div>`;
      const grid = document.createElement('div');
      grid.className = 'grid-items';
      for (const d of cat.all) {
        const got = book[d.id];
        const cell = document.createElement('div');
        cell.className = 'grid-cell' + (got ? '' : ' unknown');
        cell.innerHTML = got
          ? `<div class="cell-icon">${d.icon}</div><div class="cell-name">${d.name}</div><div class="cell-sub">${d.price}ベル</div>` +
            (got > 1 ? `<div class="cell-badge">×${got}</div>` : '')
          : `<div class="cell-icon">${d.icon}</div><div class="cell-name">？？？</div>`;
        if (got) cell.addEventListener('click', () => { sfx.tap(); ui.toast(d.flavor); });
        grid.appendChild(cell);
      }
      body.appendChild(grid);
      $('panel-foot').textContent = 'つかまえた いきものを タップすると まめちしき！';
    });
  };

  // ============ おみせ ============
  ui.openShop = () => {
    openPanel('まめだぬき ストア', ['かう', 'うる'], (tab) => {
      const body = $('panel-body');
      if (tab === 1) {
        // うるモード（ポケットの中身を表示）
        let renderSell;
        renderSell = () => {
          body.innerHTML = '';
          if (!state.inventory.length) {
            body.innerHTML = '<div class="zukan-caption">うれるものが ないみたい…</div>';
            return;
          }
          const grid = document.createElement('div');
          grid.className = 'grid-items';
          state.inventory.forEach((it, i) => {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.innerHTML = `<div class="cell-icon">${it.icon}</div><div class="cell-name">${it.name}</div><div class="cell-sub">${it.price} ベル</div>`;
            cell.addEventListener('click', () => {
              sfx.coin();
              addBells(it.price);
              removeItemAt(i);
              ui.updateBells();
              ui.toast(`${it.name} を ${it.price}ベルで うった！`);
              renderSell();
            });
            grid.appendChild(cell);
          });
          body.appendChild(grid);
        };
        renderSell();
        $('panel-foot').textContent = 'タップで すぐ かいとってもらえるよ';
      } else {
        body.innerHTML = '';
        for (const g of SHOP_GOODS) {
          const owned = g.kind === 'tool' && state.tools[g.id];
          const row = document.createElement('div');
          row.className = 'shop-row' + (owned ? ' soldout' : '');
          row.innerHTML = `
            <div class="shop-icon">${g.icon}</div>
            <div class="shop-info">
              <div class="shop-name">${g.name}</div>
              <div class="shop-desc">${g.desc}</div>
            </div>`;
          const btn = document.createElement('button');
          btn.className = 'shop-buy';
          btn.textContent = owned ? 'もってる' : `${g.price} ベル`;
          btn.disabled = owned || state.bells < g.price;
          btn.addEventListener('click', () => {
            if (state.bells < g.price) return;
            addBells(-g.price);
            sfx.buy();
            ui.updateBells();
            if (g.kind === 'tool') {
              state.tools[g.id] = true;
              ui.toast(`${g.name} を てにいれた！`);
              refreshToolWheel();
            } else if (g.kind === 'shirt') {
              state.player.shirt = g.color;
              hooks.onShirt && hooks.onShirt(g.color);
              ui.toast(`${g.name} に きがえた！`);
            } else if (g.kind === 'seed') {
              if (!hooks.canAddItem()) { ui.toast('ポケットが いっぱいだ…'); addBells(g.price); ui.updateBells(); return; }
              hooks.addItem({ kind: 'seed', id: g.id, name: g.name, price: 60, icon: g.icon });
              ui.toast(`${g.name} を かった！ポケットから うえられるよ`);
            }
            ui.openShop(); // 再描画
          });
          row.appendChild(btn);
          body.appendChild(row);
        }
        $('panel-foot').textContent = `おさいふ: ${state.bells.toLocaleString('ja-JP')} ベル`;
      }
    });
  };

  // ============ しまマップ ============
  ui.openMap = () => {
    openPanel('しまの ちず', null, () => {
      const body = $('panel-body');
      body.innerHTML = '<canvas id="map-canvas"></canvas>';
      const cv = $('map-canvas');
      const W = 480, H = 420;
      cv.width = W; cv.height = H;
      const g = cv.getContext('2d');
      const world = hooks.world;
      // x: -60..60 → 0..W / z: -50..55 → 0..H
      const X0 = -62, X1 = 62, Z0 = -50, Z1 = 56;
      const px = (x) => ((x - X0) / (X1 - X0)) * W;
      const pz = (z) => ((z - Z0) / (Z1 - Z0)) * H;
      const step = 2.2;
      for (let z = Z0; z < Z1; z += step) {
        for (let x = X0; x < X1; x += step) {
          const m = world.islandMask(x, z);
          let c;
          if (m > 1.0) c = '#75b9e6';
          else if (m > 0.78) c = '#eedb9c';
          else if (Math.abs(x - world.riverX(z)) < 3.4) c = '#8fd2e8';
          else if (z < -14) c = '#5ca86a';
          else if (Math.hypot(x + 6, z - 8) < 8.5) c = '#d8c396';
          else c = '#6cbb52';
          g.fillStyle = c;
          g.fillRect(px(x), pz(z), Math.ceil((step / (X1 - X0)) * W) + 1, Math.ceil((step / (Z1 - Z0)) * H) + 1);
        }
      }
      // 建物マーク
      g.font = '20px sans-serif';
      g.textAlign = 'center';
      for (const b of world.buildings) {
        const icon = { shop: '🏪', museum: '🏛️', home: '🏠', board: '📌', house: '🛖' }[b.kind] || '🏠';
        g.fillText(icon, px(b.x), pz(b.z));
      }
      // 住民
      for (const v of hooks.villagers.list) {
        const p = v.rig.group.position;
        g.fillText('🐾', px(p.x), pz(p.z));
      }
      // プレイヤー
      const pp = hooks.playerPos();
      g.fillStyle = '#e8554d';
      g.beginPath();
      g.arc(px(pp.x), pz(pp.z), 7, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#fff';
      g.lineWidth = 3;
      g.stroke();
      $('panel-foot').textContent = '🔴 が いまの ばしょ';
    });
  };

  // ============ けいじばん（きょうのこと・実績） ============
  ui.openBoard = () => {
    openPanel('しまの けいじばん', ['きょうのこと', 'やること'], (tab) => {
      const body = $('panel-body');
      if (tab === 0) {
        const w = hooks.world.weather === 'rain' ? '🌧 あめ' : '☀️ はれ';
        const s = state.stats;
        body.innerHTML = `
          <div class="shop-row"><div class="shop-icon">📅</div><div class="shop-info">
            <div class="shop-name">きょうの てんき: ${w}</div>
            <div class="shop-desc">どこかの いわを たたくと ベルが でるよ。ほしマークの じめんも さがしてみて！</div></div></div>
          <div class="shop-row"><div class="shop-icon">🎣</div><div class="shop-info">
            <div class="shop-name">つった さかな: ${s.fishCaught}</div></div></div>
          <div class="shop-row"><div class="shop-icon">🦋</div><div class="shop-info">
            <div class="shop-name">つかまえた むし: ${s.bugsCaught}</div></div></div>
          <div class="shop-row"><div class="shop-icon">⛏️</div><div class="shop-info">
            <div class="shop-name">ほりだした かせき: ${s.fossilsDug}</div></div></div>
          <div class="shop-row"><div class="shop-icon">🔔</div><div class="shop-info">
            <div class="shop-name">かせいだ ベル: ${s.bellsEarned.toLocaleString('ja-JP')}</div></div></div>
          <div class="shop-row"><div class="shop-icon">💬</div><div class="shop-info">
            <div class="shop-name">おしゃべりした かいすう: ${s.talks}</div></div></div>`;
      } else {
        body.innerHTML = '';
        for (const a of ACHIEVEMENTS) {
          const done = state.quests.done[a.id];
          const can = !done && a.cond(state);
          const row = document.createElement('div');
          row.className = 'shop-row' + (done ? ' soldout' : '');
          row.innerHTML = `
            <div class="shop-icon">${done ? '✅' : can ? '🎁' : '⭐'}</div>
            <div class="shop-info">
              <div class="shop-name">${a.name}</div>
              <div class="shop-desc">${a.desc} (${a.reward}ベル)</div>
            </div>`;
          const btn = document.createElement('button');
          btn.className = 'shop-buy';
          btn.textContent = done ? 'たっせい！' : can ? 'うけとる' : 'まだまだ';
          btn.disabled = !can;
          if (can) {
            btn.addEventListener('click', () => {
              state.quests.done[a.id] = true;
              addBells(a.reward);
              sfx.fanfare();
              ui.updateBells();
              ui.toast(`「${a.name}」たっせい！ ${a.reward}ベル ゲット！`);
              ui.openBoard();
            });
          }
          row.appendChild(btn);
          body.appendChild(row);
        }
        $('panel-foot').textContent = 'たっせいすると ベルが もらえるよ！';
      }
    });
  };

  // メニューボタン
  $('btn-pocket').addEventListener('click', () => { sfx.tap(); ui.openPockets(); });
  $('btn-zukan').addEventListener('click', () => { sfx.tap(); ui.openZukan(); });
  $('btn-map').addEventListener('click', () => { sfx.tap(); ui.openMap(); });

  // 次にめざす実績をクエストチップに
  ui.refreshQuestChip = () => {
    const next = ACHIEVEMENTS.find((a) => !state.quests.done[a.id] && !a.cond(state));
    const claim = ACHIEVEMENTS.find((a) => !state.quests.done[a.id] && a.cond(state));
    if (claim) ui.setQuest(`🎁 けいじばんで「${claim.name}」の ごほうびを うけとろう！`);
    else if (next) ui.setQuest(`⭐ ${next.desc}`);
    else ui.setQuest('');
  };

  ui.flash = () => {
    const f = $('flash');
    f.classList.add('on');
    setTimeout(() => f.classList.remove('on'), 80);
  };

  return ui;
}
