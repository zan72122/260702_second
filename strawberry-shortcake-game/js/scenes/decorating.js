/* ================================================================
   scenes/decorating.js — mockup 06: デコレーションしよう
   Drag sweets from the tray onto the cake. Free-form creativity!
   ================================================================ */

import * as art from "../art.js";
import * as ui from "../ui.js";
import { sfx, vibrate } from "../audio.js";
import { burst, floatHearts } from "../fx.js";
import { go } from "../main.js";
import { run, finishStep, addScore, RECIPES } from "../state.js";

const ITEMS = [
  { kind: "strawberry", nm: "いちご", icon: () => `<svg viewBox="0 0 60 64" width="44" height="44">${art.strawberry({ size: 60 }).replace(/<\/?svg[^>]*>/g, "")}</svg>` },
  { kind: "cream", nm: "クリーム", icon: () => art.creamSwirl({ size: 44 }) },
  { kind: "choco", nm: "チョコプレート", fs: 8.5, icon: () => art.chocoPlate({ size: 44 }) },
  { kind: "mint", nm: "ミント", icon: () => art.mintLeaf({ size: 40 }) },
  { kind: "star", nm: "カラースター", icon: () => art.colorStars({ size: 44 }) },
];

const STAR_COLORS = [
  ["#f9b17c", "#f2934f"],
  ["#8fd0f2", "#5eb2e0"],
  ["#f9a8c5", "#f07daa"],
];

/* cake placement bounds per recipe (in cake viewBox 320x268 coords) */
const BOUNDS = {
  shortcake: { x0: 62, x1: 258, y0: 116, y1: 212 },
  cupcake: { x0: 98, x1: 222, y0: 86, y1: 166 },
  pancake: { x0: 62, x1: 258, y0: 138, y1: 212 },
};

/* cake rendering box in stage coords */
const CAKE = { left: 30, top: 336, size: 330 };
const VB = { w: 320, h: 268 };

export default function decoratingScene(scene) {
  const recipe = RECIPES[run.recipe];
  const target = { ...recipe.decoTarget };
  const totalCount = Object.values(target).reduce((a, b) => a + b, 0);
  let remaining = { ...target };
  let placedTotal = 0;
  let starColorIdx = 0;

  scene.appendChild(ui.kitchenBg());
  scene.appendChild(ui.laceTrims());
  scene.appendChild(ui.hud());

  scene.appendChild(
    ui.cloudTitle(
      [
        { text: "デコレーション", cls: "pink", size: 38 },
        { text: "しよう", cls: "brown", size: 38 },
      ],
      { top: 40, height: 146 }
    )
  );

  const girl = ui.el(
    `<div style="position:absolute;left:-20px;top:196px;z-index:6;pointer-events:none">${art.chefGirl({
      pose: "pipe", eyes: "wink", size: 190,
    })}</div>`
  );
  scene.appendChild(girl);
  const bubble = ui.speech("じょうずに<br>できるかな?", { x: 178, y: 216, w: 150 });
  scene.appendChild(bubble);

  const bun = ui.el(`<div class="bob" style="position:absolute;left:236px;top:296px;z-index:6;pointer-events:none" data-mascot>${art.bunny({ size: 74 })}</div>`);
  const chk = ui.el(`<div class="bob2" style="position:absolute;left:312px;top:300px;z-index:6;pointer-events:none" data-mascot>${art.chick({ size: 72 })}</div>`);
  scene.appendChild(bun);
  scene.appendChild(chk);

  /* あと◯こ heart counter */
  const heartCounter = ui.el(
    `<div style="position:absolute;left:10px;top:396px;z-index:11;width:96px;height:96px;pointer-events:none">
      <svg viewBox="0 0 100 100" width="96" height="96">${art.heart(50, 48, 44, "#f06292", "#fff")}</svg>
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;font-weight:900;text-shadow:0 1px 3px rgba(200,40,100,.75)">
        <span style="font-size:12px">あと</span>
        <span id="dc-left" style="font-size:28px;line-height:1">${totalCount}</span>
        <span style="font-size:11px">のせてね</span>
      </div>
    </div>`
  );
  scene.appendChild(heartCounter);

  /* できあがりイメージ reference card */
  const refDeco = [
    { kind: "strawberry", x: 130, y: 116 }, { kind: "strawberry", x: 160, y: 108 }, { kind: "strawberry", x: 190, y: 116 },
    { kind: "cream", x: 100, y: 138 }, { kind: "cream", x: 220, y: 138 },
    { kind: "mint", x: 160, y: 128 },
  ];
  scene.appendChild(
    ui.el(`<div style="position:absolute;right:8px;top:392px;z-index:11;width:92px;background:#fffdfb;border-radius:14px;border:2.5px solid #f8bbd0;box-shadow:0 4px 8px rgba(216,84,138,.3);padding:6px 4px;pointer-events:none">
      <div style="font-size:11px;font-weight:900;color:#7b4a2d;text-align:center">できあがり<br>イメージ</div>
      ${art.cakeSvg({ size: 84, frosted: true, decorations: refDeco, recipe: run.recipe })}
    </div>`)
  );

  /* the cake */
  const cakeWrap = ui.el(
    `<div id="dc-cake" style="position:absolute;left:${CAKE.left}px;top:${CAKE.top}px;z-index:8">${art.cakeSvg({
      size: CAKE.size, frosted: true, decorations: run.decorations, recipe: run.recipe,
    })}</div>`
  );
  scene.appendChild(cakeWrap);

  function renderCake() {
    cakeWrap.innerHTML = art.cakeSvg({ size: CAKE.size, frosted: true, decorations: run.decorations, recipe: run.recipe });
  }

  /* tray */
  const tray = ui.el(`<div class="deco-tray" style="position:absolute;left:0;right:0;bottom:88px;z-index:12"></div>`);
  const slotEls = {};
  ITEMS.forEach((it) => {
    const slot = ui.el(
      `<div class="deco-slot" data-kind="${it.kind}">
        <span class="cnt">${remaining[it.kind]}</span>
        ${it.icon()}
        <span class="nm"${it.fs ? ` style="font-size:${it.fs}px"` : ""}>${it.nm}</span>
      </div>`
    );
    slotEls[it.kind] = slot;
    tray.appendChild(slot);
  });
  scene.appendChild(tray);

  const doneBtn = ui.candyBtn("できあがり!", { fontSize: 30 });
  doneBtn.style.cssText += "position:absolute;left:50%;bottom:14px;transform:translateX(-50%);min-width:280px;z-index:12;display:none";
  doneBtn.addEventListener("pointerdown", () => {
    sfx.fanfare();
    setTimeout(() => go("result"), 500);
  });
  scene.appendChild(doneBtn);

  const hintBtn = ui.candyBtn("のせよう", { fontSize: 30 });
  hintBtn.style.cssText += "position:absolute;left:50%;bottom:14px;transform:translateX(-50%);min-width:280px;z-index:12;pointer-events:none;opacity:.9";
  hintBtn.classList.add("pulse");
  scene.appendChild(hintBtn);

  /* ---------------- drag & drop ---------------- */
  let drag = null; // {kind, ghostEl}

  function stagePoint(ev) {
    const sr = document.getElementById("stage").getBoundingClientRect();
    const scale = sr.width / 390;
    return { x: (ev.clientX - sr.left) / scale, y: (ev.clientY - sr.top) / scale };
  }

  function toVB(p) {
    return {
      x: ((p.x - CAKE.left) / CAKE.size) * VB.w,
      y: ((p.y - CAKE.top) / ((CAKE.size * VB.h) / VB.w)) * VB.h,
    };
  }

  function inBounds(v) {
    const b = BOUNDS[run.recipe];
    return v.x >= b.x0 && v.x <= b.x1 && v.y >= b.y0 && v.y <= b.y1;
  }

  function ghostFor(kind) {
    const it = ITEMS.find((i) => i.kind === kind);
    const gEl = ui.el(`<div style="position:absolute;z-index:30;pointer-events:none;transform:translate(-50%,-50%) scale(1.2);filter:drop-shadow(0 4px 6px rgba(180,60,110,.4))">${it.icon()}</div>`);
    return gEl;
  }

  tray.addEventListener("pointerdown", (ev) => {
    const slot = ev.target.closest(".deco-slot");
    if (!slot) return;
    const kind = slot.dataset.kind;
    if (remaining[kind] <= 0) return;
    sfx.tap();
    drag = { kind, ghostEl: ghostFor(kind) };
    const p = stagePoint(ev);
    drag.ghostEl.style.left = `${p.x}px`;
    drag.ghostEl.style.top = `${p.y}px`;
    scene.appendChild(drag.ghostEl);
    slot.classList.add("sel");
  });

  scene.addEventListener("pointermove", (ev) => {
    if (!drag) return;
    const p = stagePoint(ev);
    drag.ghostEl.style.left = `${p.x}px`;
    drag.ghostEl.style.top = `${p.y}px`;
    const v = toVB(p);
    drag.ghostEl.style.opacity = inBounds(v) ? "1" : ".55";
  });

  scene.addEventListener("pointerup", (ev) => {
    if (!drag) return;
    const { kind, ghostEl } = drag;
    const p = stagePoint(ev);
    const v = toVB(p);
    ghostEl.remove();
    slotEls[kind].classList.remove("sel");
    drag = null;
    if (inBounds(v)) place(kind, v, p);
    else sfx.pop();
  });

  function place(kind, v, p) {
    const deco = { kind, x: Math.round(v.x), y: Math.round(v.y) };
    if (kind === "star") {
      const [c, e] = STAR_COLORS[starColorIdx++ % STAR_COLORS.length];
      deco.color = c;
      deco.edge = e;
    }
    run.decorations.push(deco);
    remaining[kind]--;
    placedTotal++;
    slotEls[kind].querySelector(".cnt").textContent = remaining[kind];
    if (remaining[kind] === 0) slotEls[kind].classList.add("empty");
    renderCake();
    sfx.plop();
    vibrate(12);
    burst(p.x, p.y, { count: 8, kind: kind === "star" ? "stars" : "hearts", power: 2.6 });
    if (kind === "cream") sfx.swish();
    const left = totalCount - placedTotal;
    heartCounter.querySelector("#dc-left").textContent = left;
    if (placedTotal === Math.floor(totalCount / 2)) { ui.toast("かわいくなってきた♪", 195, 320); ui.cheerMascots(scene); }
    if (left === 0) allPlaced();
  }

  /* tap a placed deco to take it back */
  cakeWrap.addEventListener("pointerdown", (ev) => {
    if (drag) return;
    const p = stagePoint(ev);
    const v = toVB(p);
    let best = -1, bestD = 24 * 24;
    run.decorations.forEach((d, i) => {
      const dd = (d.x - v.x) ** 2 + (d.y - v.y) ** 2;
      if (dd < bestD) { bestD = dd; best = i; }
    });
    if (best >= 0) {
      const [d] = run.decorations.splice(best, 1);
      remaining[d.kind]++;
      placedTotal--;
      slotEls[d.kind].querySelector(".cnt").textContent = remaining[d.kind];
      slotEls[d.kind].classList.remove("empty");
      heartCounter.querySelector("#dc-left").textContent = totalCount - placedTotal;
      renderCake();
      sfx.pop();
      doneBtn.style.display = "none";
      hintBtn.style.display = "flex";
    }
  });

  function allPlaced() {
    addScore({ stars: 10, hearts: 8 });
    finishStep("decorating", { stars: 10, hearts: 8, perfect: true });
    sfx.perfect();
    burst(195, 420, { count: 26, kind: "mix", power: 4.5 });
    floatHearts(195, 400, 6);
    bubble.innerHTML = `わぁ!<br>すてき!<div class="mini-heart">♥</div><div class="tail"></div>`;
    ui.cheerMascots(scene);
    hintBtn.style.display = "none";
    doneBtn.style.display = "flex";
    doneBtn.classList.add("pop-in", "pulse");
  }
}
