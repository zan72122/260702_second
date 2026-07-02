/* ================================================================
   ui.js — shared UI components: HUD, nav, cloud titles, speech
   bubbles, toasts, modals (settings / recipe book / stats / fun)
   ================================================================ */

import * as art from "./art.js";
import { sfx, setBgm, setSfx, vibrate } from "./audio.js";
import { save, persist, BOOK_PAGES, RECIPES } from "./state.js";
import { burst, floatHearts } from "./fx.js";

/* create element from html string */
export function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

/* ---------------- toast ---------------- */
export function toast(text, x = 195, y = 380, color) {
  const root = document.getElementById("toast-root");
  const t = el(`<div class="toast" style="left:${x}px;top:${y}px;${color ? `color:${color};` : ""}">${text}</div>`);
  root.appendChild(t);
  setTimeout(() => t.remove(), 1050);
}

/* ---------------- scene chrome ---------------- */

export function kitchenBg() {
  return el(`<div class="bg-kitchen">${art.kitchenBackdrop()}</div>`);
}

export function laceTrims() {
  const f = document.createDocumentFragment();
  f.appendChild(el(`<div class="lace top">${art.laceTrim()}</div>`));
  f.appendChild(el(`<div class="lace bottom">${art.laceTrim()}</div>`));
  return f;
}

/* cloud title: lines = [{text, cls:"pink"|"brown", size}] */
export function cloudTitle(lines, { top = 46, width = 330, height = 148, deco = true } = {}) {
  const spans = lines
    .map((l) => `<div class="${l.cls}" style="font-size:${l.size || 34}px">${l.text}</div>`)
    .join("");
  const d = deco
    ? `<div style="position:absolute;right:26px;top:16px;pointer-events:none">${miniStrawberry(34)}</div>
       <div style="position:absolute;right:14px;top:52px;pointer-events:none">${miniWhisk(40)}</div>
       <div style="position:absolute;left:22px;top:20px;pointer-events:none">${art.glossyHeart(22)}</div>
       <div style="position:absolute;left:30px;bottom:20px;pointer-events:none"><svg viewBox="0 0 20 20" width="18" height="18">${art.star(10, 11, 8, "#f7d94f", "#eec93a")}</svg></div>
       <div style="position:absolute;right:56px;bottom:14px;pointer-events:none"><svg viewBox="0 0 20 20" width="15" height="15">${art.star(10, 11, 8, "#8fd0f2", "#5eb2e0")}</svg></div>`
    : "";
  return el(`
    <div style="position:absolute;left:${(390 - width) / 2}px;top:${top}px;width:${width}px;height:${height}px;z-index:10">
      <div style="position:absolute;inset:0">${art.cloudPanel()}</div>
      <div class="candy-title" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 20px">
        ${spans}
      </div>
      ${d}
    </div>`);
}

export function miniStrawberry(size = 30) {
  return `<svg viewBox="0 0 60 64" width="${size}" height="${(size * 64) / 60}">${art
    .strawberry({ size: 60 })
    .replace(/<\/?svg[^>]*>/g, "")}</svg>`;
}

export function miniWhisk(size = 40) {
  return `<svg viewBox="0 0 80 200" width="${size * 0.4}" height="${size}" style="transform:rotate(24deg)">${art
    .whiskSvg({ size: 200 })
    .replace(/<\/?svg[^>]*>/g, "")}</svg>`;
}

/* HUD: cake badge left, gear right */
export function hud() {
  const h = el(`
    <div class="hud">
      <div class="badge-round">${art.cakeSliceBadge()}</div>
      <button class="gear-btn" aria-label="せってい">${art.gearIcon()}</button>
    </div>`);
  h.querySelector(".gear-btn").addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    sfx.tap();
    openSettings();
  });
  return h;
}

/* bottom nav: レシピ / せいせき / おたのしみ */
export function bottomNav() {
  const n = el(`
    <div class="bottom-nav">
      <button class="nav-item" data-k="recipe">
        <span class="disc">${art.bookIcon()}</span><span class="lbl">レシピ ♡</span>
      </button>
      <button class="nav-item" data-k="stats">
        <span class="disc">${art.glossyStar()}</span><span class="lbl">せいせき</span>
      </button>
      <button class="nav-item" data-k="fun">
        <span class="disc">${art.glossyHeart()}</span><span class="lbl">おたのしみ</span>
      </button>
    </div>`);
  n.addEventListener("pointerdown", (e) => {
    const b = e.target.closest(".nav-item");
    if (!b) return;
    sfx.pick();
    vibrate();
    const k = b.dataset.k;
    if (k === "recipe") openRecipeBook();
    else if (k === "stats") openStats();
    else openFun();
  });
  return n;
}

/* speech bubble */
export function speech(text, { x = 220, y = 330, w = 150, tailSide = "left" } = {}) {
  const s = el(`<div class="speech" style="left:${x}px;top:${y}px;width:${w}px">${text}<div class="mini-heart">♥</div><div class="tail" style="${tailSide === "right" ? "left:auto;right:30px" : ""}"></div></div>`);
  return s;
}

/* candy button */
export function candyBtn(label, { small = false, fontSize = 30, ghost = false } = {}) {
  return el(`<button class="candy-btn${small ? " small" : ""}${ghost ? " ghost" : ""}" style="font-size:${fontSize}px">
    <span class="heart-deco l">♡</span>${label}<span class="heart-deco r">♡</span>
  </button>`);
}

/* mascots pinned bottom corners */
export function mascotPair({ bunnyX = 6, bunnyY = 620, chickX = 288, chickY = 640 } = {}) {
  const f = document.createDocumentFragment();
  const b = el(`<div class="bob" style="position:absolute;left:${bunnyX}px;top:${bunnyY}px;z-index:8;pointer-events:none">${art.bunny({ size: 96 })}</div>`);
  const c = el(`<div class="bob2" style="position:absolute;left:${chickX}px;top:${chickY}px;z-index:8;pointer-events:none">${art.chick({ size: 92 })}</div>`);
  b.dataset.mascot = "bunny";
  c.dataset.mascot = "chick";
  f.appendChild(b);
  f.appendChild(c);
  return f;
}

export function cheerMascots(sceneEl) {
  sceneEl.querySelectorAll("[data-mascot]").forEach((m) => {
    m.classList.remove("cheer");
    void m.offsetWidth;
    m.classList.add("cheer");
  });
}

/* ---------------- modal machinery ---------------- */

function openModal(title, bodyEl, { onClose } = {}) {
  const root = document.getElementById("modal-root");
  root.innerHTML = "";
  const veil = el(`
    <div class="modal-veil">
      <div class="modal-card">
        <button class="modal-close">✕</button>
        <div class="modal-title">${title}</div>
        <div class="modal-body"></div>
      </div>
    </div>`);
  veil.querySelector(".modal-body").appendChild(bodyEl);
  const close = () => {
    sfx.pop();
    veil.remove();
    onClose && onClose();
  };
  veil.querySelector(".modal-close").addEventListener("pointerdown", close);
  veil.addEventListener("pointerdown", (e) => {
    if (e.target === veil) close();
  });
  root.appendChild(veil);
  return { close };
}

/* ---- settings ---- */
function toggleRow(label, value, onChange) {
  const r = el(`
    <div class="stat-row">
      <span>${label}</span>
      <button class="candy-btn small" style="font-size:16px;min-width:96px">${value ? "オン ♪" : "オフ"}</button>
    </div>`);
  const btn = r.querySelector("button");
  if (!value) btn.classList.add("ghost");
  btn.addEventListener("pointerdown", () => {
    value = !value;
    btn.textContent = value ? "オン ♪" : "オフ";
    btn.classList.toggle("ghost", !value);
    onChange(value);
    sfx.tap();
  });
  return r;
}

export function openSettings() {
  const body = document.createElement("div");
  body.appendChild(toggleRow("おんがく", save.bgm, (v) => setBgm(v)));
  body.appendChild(toggleRow("こうかおん", save.sfx, (v) => setSfx(v)));
  body.appendChild(
    el(`<div style="text-align:center;font-weight:900;color:#b06a86;font-size:13px;padding:6px 4px 0">
      いちごショートケーキをつくろう!<br>ちいさなパティシエさん だいかんげい ♡
    </div>`)
  );
  openModal("せってい", body);
}

/* ---- recipe book (gallery of the 8 original art pages) ---- */
export function openRecipeBook() {
  const body = document.createElement("div");
  const grid = el(`<div class="book-grid"></div>`);
  BOOK_PAGES.forEach((p, i) => {
    const locked = i >= save.pagesUnlocked;
    const pg = el(`
      <div class="book-page${locked ? " locked" : ""}">
        <img src="${p.img}" alt="${p.label}" draggable="false">
      </div>`);
    if (!locked) {
      pg.addEventListener("pointerdown", () => {
        sfx.sparkle();
        const view = el(`<div class="book-view"><img src="${p.img}" alt="${p.label}"></div>`);
        view.addEventListener("pointerdown", () => view.remove());
        body.closest(".modal-card").appendChild(view);
      });
    } else {
      pg.addEventListener("pointerdown", () => sfx.no());
    }
    grid.appendChild(pg);
  });
  body.appendChild(
    el(`<div style="text-align:center;font-weight:900;color:#b06a86;font-size:13px;padding:0 0 8px">
      ケーキづくりをすすめると ページがひらくよ ♡ (${save.pagesUnlocked}/${BOOK_PAGES.length})
    </div>`)
  );
  body.appendChild(grid);
  openModal("レシピえほん", body);
}

/* ---- stats ---- */
export function openStats() {
  const body = document.createElement("div");
  const rows = [
    ["つくったケーキ", `${save.clears} こ`],
    ["あつめた ★", `${save.totalStars}`],
    ["あつめた ♥", `${save.totalHearts}`],
    ["なでなで", `${save.petCount} かい`],
  ];
  rows.forEach(([k, v]) => body.appendChild(el(`<div class="stat-row"><span>${k}</span><span class="v">${v}</span></div>`)));
  Object.values(RECIPES).forEach((r) => {
    const g = save.bestGrade[r.id];
    body.appendChild(
      el(`<div class="stat-row"><span>${r.short}</span><span class="v">${g ? `${g} ランク` : "まだ"}</span></div>`)
    );
  });
  openModal("せいせき", body);
}

/* ---- fun: pat the mascots ---- */
export function openFun() {
  const body = document.createElement("div");
  body.appendChild(
    el(`<div style="text-align:center;font-weight:900;color:#b06a86;font-size:14px;padding-bottom:6px">
      うさちゃんと ひよちゃんを なでなでしてね ♡
    </div>`)
  );
  const zone = el(`<div style="display:flex;justify-content:center;gap:10px;align-items:flex-end;padding:10px 0"></div>`);
  const bun = el(`<div style="cursor:pointer">${art.bunny({ size: 120 })}</div>`);
  const chk = el(`<div style="cursor:pointer">${art.chick({ size: 112 })}</div>`);
  const counter = el(`<div style="text-align:center;font-weight:900;color:#e91e63;font-size:18px">なでなで ${save.petCount} かい</div>`);
  const pat = (elm, happyHtml, normalHtml) => (e) => {
    save.petCount++;
    persist();
    counter.textContent = `なでなで ${save.petCount} かい`;
    sfx.heart();
    vibrate();
    elm.innerHTML = happyHtml;
    elm.classList.remove("cheer");
    void elm.offsetWidth;
    elm.classList.add("cheer");
    const r = elm.getBoundingClientRect();
    floatHearts(195, 380, 4);
    setTimeout(() => (elm.innerHTML = normalHtml), 700);
  };
  bun.addEventListener("pointerdown", pat(bun, art.bunny({ size: 120, happy: true }), art.bunny({ size: 120 })));
  chk.addEventListener("pointerdown", pat(chk, art.chick({ size: 112, happy: true }), art.chick({ size: 112 })));
  zone.appendChild(bun);
  zone.appendChild(chk);
  body.appendChild(zone);
  body.appendChild(counter);
  openModal("おたのしみ", body);
}

/* heart progress track: n hearts, filled count */
export function heartTrack(n) {
  const t = el(`<div class="heart-track"></div>`);
  for (let i = 0; i < n; i++) {
    t.appendChild(el(`<span class="hp">${art.glossyHeart(30, "#ffd7e6", "#f8bbd0")}</span>`));
  }
  return {
    el: t,
    set(count) {
      [...t.children].forEach((h, i) => {
        const on = i < count;
        if (on && !h.classList.contains("on")) {
          h.innerHTML = art.glossyHeart(30);
          h.classList.add("on");
        } else if (!on && h.classList.contains("on")) {
          h.innerHTML = art.glossyHeart(30, "#ffd7e6", "#f8bbd0");
          h.classList.remove("on");
        }
      });
    },
  };
}
