/* ================================================================
   scenes/title.js — mockup 01: title screen
   ================================================================ */

import * as art from "../art.js";
import * as ui from "../ui.js";
import { sfx, vibrate } from "../audio.js";
import { burst } from "../fx.js";
import { go } from "../main.js";
import { newRun, unlockedRecipes, RECIPES, save } from "../state.js";

export default function titleScene(scene) {
  scene.appendChild(ui.kitchenBg());
  scene.appendChild(ui.laceTrims());
  scene.appendChild(ui.hud());

  scene.appendChild(
    ui.cloudTitle(
      [
        { text: "いちご", cls: "pink", size: 52 },
        { text: "ショートケーキを", cls: "brown", size: 33 },
        { text: "つくろう!", cls: "pink", size: 44 },
      ],
      { top: 54, height: 200 }
    )
  );

  /* chibi girl with whisk */
  const girl = ui.el(
    `<div class="bob" style="position:absolute;left:-14px;top:296px;z-index:6;pointer-events:none">${art.chefGirl({
      pose: "whisk",
      eyes: "wink",
      size: 228,
    })}</div>`
  );
  scene.appendChild(girl);

  /* showcase cake on stand */
  const cakeDeco = [
    { kind: "strawberry", x: 118, y: 118 }, { kind: "strawberry", x: 160, y: 108 },
    { kind: "strawberry", x: 202, y: 118 }, { kind: "strawberry", x: 139, y: 132 },
    { kind: "strawberry", x: 181, y: 132 },
    { kind: "cream", x: 92, y: 140 }, { kind: "cream", x: 228, y: 140 },
    { kind: "cream", x: 122, y: 148 }, { kind: "cream", x: 198, y: 148 },
    { kind: "mint", x: 160, y: 130 },
  ];
  const cake = ui.el(
    `<div class="pulse" style="position:absolute;left:150px;top:400px;z-index:5;pointer-events:none">${art.cakeSvg({
      size: 250,
      frosted: true,
      decorations: cakeDeco,
    })}</div>`
  );
  scene.appendChild(cake);

  scene.appendChild(ui.speech("じぶんで<br>つくれたよ!", { x: 196, y: 320, w: 140 }));

  /* recipe chips (unlocked extras) */
  const unlocked = unlockedRecipes();
  let chosen = "shortcake";
  if (unlocked.length > 1) {
    const chips = ui.el(`<div style="position:absolute;left:0;right:0;top:606px;display:flex;justify-content:center;gap:8px;z-index:12"></div>`);
    unlocked.forEach((r) => {
      const c = ui.el(
        `<button class="candy-btn small${r.id === chosen ? "" : " ghost"}" style="font-size:14px;padding:8px 14px">${r.short}</button>`
      );
      c.addEventListener("pointerdown", () => {
        chosen = r.id;
        sfx.pick();
        chips.querySelectorAll(".candy-btn").forEach((b) => b.classList.add("ghost"));
        c.classList.remove("ghost");
      });
      chips.appendChild(c);
    });
    scene.appendChild(chips);
  }

  /* start button */
  const start = ui.candyBtn("スタート", { fontSize: 40 });
  start.style.cssText += "position:absolute;left:50%;top:648px;transform:translateX(-50%);min-width:300px;z-index:12";
  start.addEventListener("pointerdown", () => {
    sfx.perfect();
    vibrate(20);
    burst(195, 680, { count: 18, kind: "hearts", power: 4 });
    newRun(chosen);
    setTimeout(() => go("ingredients"), 420);
  });
  scene.appendChild(start);

  scene.appendChild(ui.mascotPair({ bunnyX: 4, bunnyY: 596, chickX: 292, chickY: 620 }));
  scene.appendChild(ui.bottomNav());
}
