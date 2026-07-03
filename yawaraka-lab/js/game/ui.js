/* やわらかラボ — DOM UI: material tray (bottom) + tool tray (right) + sub-tray.
 * No text labels anywhere (aria-label only). Builds into #ui.
 * YL.UI.init({onMaterial(id), onTool(id,sub), onReset(), onSound(b)})
 * YL.UI.setTool(id) — highlight-only sync, does NOT fire onTool. */
(function () {
  'use strict';
  window.YL = window.YL || {};

  // ---- fallbacks (used only if materials.js/tools.js haven't loaded yet) --
  const FALLBACK_MATERIALS = [
    { id: 'nendo', emoji: '🟤', ui: { base: '#c96e48', accent: '#e6a878' } },
    { id: 'slime', emoji: '🫧', ui: { base: '#7ee787', accent: '#a5f3b8' } },
    { id: 'mochi', emoji: '🍡', ui: { base: '#faf5f5', accent: '#fadce4' } },
    { id: 'pan', emoji: '🍞', ui: { base: '#f0e1be', accent: '#f5edd8' } },
    { id: 'purin', emoji: '🍮', ui: { base: '#ffe082', accent: '#ffedb0' } },
    { id: 'cream', emoji: '🍦', ui: { base: '#fffcf8', accent: '#fff1f2' } },
    { id: 'choco', emoji: '🍫', ui: { base: '#78482d', accent: '#965f3c' } },
    { id: 'cookie', emoji: '🍪', ui: { base: '#deb478', accent: '#e8c89a' } },
    { id: 'jelly', emoji: '🍧', ui: { base: '#ff5a6e', accent: '#ff9a80' } },
    { id: 'mallow', emoji: '☁️', ui: { base: '#fffafa', accent: '#ffe1e8' } },
    { id: 'sand', emoji: '🏖️', ui: { base: '#e1cda5', accent: '#ebd9b8' } },
    { id: 'awa', emoji: '🛁', ui: { base: '#e1f0ff', accent: '#f0f8ff' } },
  ];
  const FALLBACK_TOOLS = [
    { id: 'hand' },
    { id: 'cutter', subs: 4 },
    { id: 'heat' },
    { id: 'cold' },
    { id: 'color', subs: 6 },
    { id: 'topping', subs: 4 },
  ];
  const FALLBACK_COLORS = [
    [255, 150, 190], [255, 224, 110], [125, 200, 255],
    [150, 232, 190], [196, 160, 255], [255, 176, 110],
  ];

  const SUB_ICON = {
    cutter: ['shape-star', 'shape-heart', 'shape-flower', 'shape-circle'],
    topping: ['top-star', 'top-heart', 'top-flower', 'top-eye'],
  };

  function materialsList() { return (window.YL && YL.MATERIALS) || FALLBACK_MATERIALS; }
  function toolsList() { return (window.YL && YL.Tools && YL.Tools.list) || FALLBACK_TOOLS; }
  function colorsList() { return (window.YL && YL.Tools && YL.Tools.COLORS) || FALLBACK_COLORS; }

  function tap() { if (YL.Sound && YL.Sound.event) YL.Sound.event('uiTap'); }

  function el(tag, cls, attrs) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (attrs) {
      for (const k in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
      }
    }
    return e;
  }

  function rgbCss(c) { return `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`; }

  // ---- module state ---------------------------------------------------------
  const cb = { onMaterial() {}, onTool() {}, onReset() {}, onSound() {} };
  const els = { toolBtns: {} };
  const toolSub = { cutter: 0, color: 0, topping: 0 };
  let activeTool = 'hand';
  let soundOn = true;

  function init(callbacks) {
    callbacks = callbacks || {};
    cb.onMaterial = callbacks.onMaterial || cb.onMaterial;
    cb.onTool = callbacks.onTool || cb.onTool;
    cb.onReset = callbacks.onReset || cb.onReset;
    cb.onSound = callbacks.onSound || cb.onSound;

    const root = document.getElementById('ui');
    if (!root) return;
    root.innerHTML = ''; // static rebuild, no user data involved

    buildMaterialTray(root);
    buildToolTray(root);

    // default visual selection only — main.js drives the actual first pick
    selectMaterialBtn('nendo');
    highlightTool('hand');

    window.addEventListener('resize', () => {
      if (els.subtray && els.subtray.classList.contains('yl-subtray-visible')) {
        positionSubtray(activeTool);
      }
    });
  }

  // ---- material tray (bottom, horizontal scroll) -----------------------------
  function buildMaterialTray(root) {
    const wrap = el('div', 'yl-materials yl-hint', { 'aria-label': 'material tray' });
    const inner = el('div', 'yl-materials-inner');

    materialsList().forEach((m) => {
      const btn = el('button', 'yl-btn yl-mat-btn', { type: 'button', 'aria-label': m.name || m.id, 'data-id': m.id });
      const icon = YL.Icons.make(m.id, { base: m.ui.base, accent: m.ui.accent });
      icon.setAttribute('class', 'yl-icon');
      btn.appendChild(icon);
      if (m.emoji) {
        const badge = el('span', 'yl-emoji-badge');
        badge.textContent = m.emoji;
        btn.appendChild(badge);
      }
      btn.addEventListener('click', () => {
        tap();
        selectMaterialBtn(m.id);
        cb.onMaterial(m.id);
      });
      inner.appendChild(btn);
      els['mat-' + m.id] = btn;
    });

    wrap.appendChild(inner);
    root.appendChild(wrap);
    els.materialsWrap = wrap;

    // subtle "you can scroll me" wiggle for the first 6s, gone on first touch
    const removeHint = () => wrap.classList.remove('yl-hint');
    inner.addEventListener('scroll', removeHint, { passive: true, once: true });
    inner.addEventListener('touchstart', removeHint, { passive: true, once: true });
    inner.addEventListener('pointerdown', removeHint, { once: true });
    setTimeout(removeHint, 6000);
  }

  function selectMaterialBtn(id) {
    materialsList().forEach((m) => {
      const b = els['mat-' + m.id];
      if (!b) return;
      b.classList.toggle('yl-selected', m.id === id);
    });
  }

  // ---- tool tray (right edge, vertical) --------------------------------------
  function buildToolTray(root) {
    const wrap = el('div', 'yl-tools', { 'aria-label': 'tool tray' });

    toolsList().forEach((t) => {
      const btn = el('button', 'yl-btn yl-tool-btn', { type: 'button', 'aria-label': t.id, 'data-id': t.id });
      btn.appendChild(YL.Icons.make(t.id));
      btn.addEventListener('click', () => {
        tap();
        handleToolClick(t);
      });
      wrap.appendChild(btn);
      els.toolBtns[t.id] = btn;
    });

    wrap.appendChild(el('div', 'yl-divider'));

    const resetBtn = el('button', 'yl-btn yl-reset-btn', { type: 'button', 'aria-label': 'reset' });
    resetBtn.appendChild(YL.Icons.make('reset'));
    resetBtn.addEventListener('click', () => { tap(); cb.onReset(); });
    wrap.appendChild(resetBtn);
    els.resetBtn = resetBtn;

    const soundBtn = el('button', 'yl-btn yl-sound-btn', { type: 'button', 'aria-label': 'sound' });
    soundBtn.appendChild(YL.Icons.make('soundOn'));
    soundBtn.addEventListener('click', () => {
      tap();
      soundOn = !soundOn;
      soundBtn.innerHTML = '';
      soundBtn.appendChild(YL.Icons.make(soundOn ? 'soundOn' : 'soundOff'));
      cb.onSound(soundOn);
    });
    wrap.appendChild(soundBtn);
    els.soundBtn = soundBtn;

    const subtray = el('div', 'yl-subtray', { 'aria-hidden': 'true' });
    wrap.appendChild(subtray);
    els.subtray = subtray;

    root.appendChild(wrap);
    els.toolsWrap = wrap;
  }

  function handleToolClick(t) {
    const id = t.id;
    const sub = (id === activeTool && Object.prototype.hasOwnProperty.call(toolSub, id)) ? toolSub[id] : 0;
    activeTool = id;
    if (Object.prototype.hasOwnProperty.call(toolSub, id)) toolSub[id] = sub;
    highlightTool(id);
    if (t.subs) showSubtray(id, t.subs, sub); else hideSubtray();
    cb.onTool(id, sub);
  }

  function highlightTool(id) {
    activeTool = id;
    for (const k in els.toolBtns) {
      if (!Object.prototype.hasOwnProperty.call(els.toolBtns, k)) continue;
      els.toolBtns[k].classList.toggle('yl-selected', k === id);
    }
  }

  function showSubtray(toolId, count, activeSub) {
    const subtray = els.subtray;
    if (!subtray) return;
    subtray.innerHTML = '';
    subtray.setAttribute('aria-hidden', 'false');
    const iconNames = SUB_ICON[toolId];
    const colors = toolId === 'color' ? colorsList() : null;

    for (let i = 0; i < count; i++) {
      const btn = el('button', 'yl-btn yl-sub-btn', { type: 'button', 'aria-label': toolId + '-' + i, 'data-i': String(i) });
      btn.style.animationDelay = (i * 0.05) + 's';
      let iconKind, iconOpts = {};
      if (colors) { iconKind = 'color-dot'; iconOpts.col = rgbCss(colors[i] || colors[0]); }
      else { iconKind = (iconNames && iconNames[i]) || 'shape-circle'; }
      btn.appendChild(YL.Icons.make(iconKind, iconOpts));
      if (i === activeSub) btn.classList.add('yl-selected');
      btn.addEventListener('click', () => {
        tap();
        toolSub[toolId] = i;
        Array.prototype.forEach.call(subtray.children, (c) => c.classList.remove('yl-selected'));
        btn.classList.add('yl-selected');
        cb.onTool(toolId, i);
      });
      subtray.appendChild(btn);
    }
    subtray.classList.add('yl-subtray-visible');
    positionSubtray(toolId);
  }

  function positionSubtray(toolId) {
    const btn = els.toolBtns[toolId];
    const subtray = els.subtray;
    if (!btn || !subtray) return;
    subtray.style.top = (btn.offsetTop + btn.offsetHeight / 2) + 'px';
  }

  function hideSubtray() {
    const subtray = els.subtray;
    if (!subtray) return;
    subtray.classList.remove('yl-subtray-visible');
    subtray.setAttribute('aria-hidden', 'true');
  }

  // ---- public: sync selection highlight WITHOUT firing callbacks ------------
  function setTool(id) {
    const t = toolsList().find((x) => x.id === id) || null;
    highlightTool(id);
    if (t && t.subs) {
      const sub = Object.prototype.hasOwnProperty.call(toolSub, id) ? toolSub[id] : 0;
      showSubtray(id, t.subs, sub);
    } else {
      hideSubtray();
    }
  }

  YL.UI = { init, setTool };
})();
