/* ================================================================
   scenes/result.js — mockup 04: できあがり!
   Confetti, fanfare, counting rewards, grade, next recipe.
   ================================================================ */

import * as art from "../art.js";
import * as ui from "../ui.js";
import { sfx, vibrate } from "../audio.js";
import { confetti, burst } from "../fx.js";
import { go } from "../main.js";
import {
  run, save, newRun, RECIPES, unlockedRecipes,
  gradeForScore, recordClear,
} from "../state.js";

const MAX_STARS = 60, MAX_HEARTS = 38;

export default function resultScene(scene) {
  const recipe = RECIPES[run.recipe];
  const score = Math.round((run.stars / MAX_STARS) * 70 + (run.hearts / MAX_HEARTS) * 30);
  const grade = gradeForScore(score);
  const prevUnlocked = unlockedRecipes().length;
  recordClear(run.recipe, score, grade);
  const nowUnlocked = unlockedRecipes();
  const newRecipe = nowUnlocked.length > prevUnlocked ? nowUnlocked[nowUnlocked.length - 1] : null;

  scene.appendChild(ui.kitchenBg());
  scene.appendChild(ui.laceTrims());
  scene.appendChild(ui.hud());

  scene.appendChild(
    ui.cloudTitle(
      [
        { text: "できあがり!", cls: "pink", size: 46 },
        { text: `<span style="background:linear-gradient(180deg,#f97ab0,#e0397a);color:#fff;-webkit-text-stroke:0;padding:3px 18px;border-radius:8px;font-size:19px;box-shadow:0 3px 6px rgba(216,60,122,.4)">${recipe.name}</span>`, cls: "brown", size: 19 },
      ],
      { top: 40, height: 150 }
    )
  );

  /* cheering girl */
  const girl = ui.el(
    `<div class="bob" style="position:absolute;left:-26px;top:236px;z-index:6;pointer-events:none">${art.chefGirl({
      pose: "cheer", eyes: "wink", size: 216,
    })}</div>`
  );
  scene.appendChild(girl);
  scene.appendChild(ui.speech("じぶんで<br>つくれた!", { x: 216, y: 232, w: 130 }));

  /* the player's decorated cake! */
  const cake = ui.el(
    `<div class="pop-in" style="position:absolute;left:96px;top:388px;z-index:7;pointer-events:none">${art.cakeSvg({
      size: 290, frosted: true, decorations: run.decorations, recipe: run.recipe,
    })}</div>`
  );
  scene.appendChild(cake);

  /* grade stamp */
  const gradeColor = { SS: "#f5b731", S: "#ec4f8a", A: "#5eb2e0", B: "#8fce7f" }[grade];
  const stamp = ui.el(
    `<div style="position:absolute;right:16px;top:392px;z-index:9;width:86px;height:86px;transform:rotate(10deg)" class="pop-in">
      <svg viewBox="0 0 100 100" width="86" height="86">
        <circle cx="50" cy="50" r="46" fill="#fffdfb" stroke="${gradeColor}" stroke-width="5"/>
        <circle cx="50" cy="50" r="38" fill="none" stroke="${gradeColor}" stroke-width="2" stroke-dasharray="6 5"/>
        <text x="50" y="62" text-anchor="middle" font-size="34" font-weight="900" fill="${gradeColor}">${grade}</text>
        <text x="50" y="80" text-anchor="middle" font-size="12" font-weight="900" fill="#b06a86">ランク</text>
      </svg>
    </div>`
  );
  scene.appendChild(stamp);

  /* reward panel with counting */
  const panel = ui.el(
    `<div class="candy-btn" style="position:absolute;left:50%;top:636px;transform:translateX(-50%);min-width:320px;font-size:24px;z-index:12;pointer-events:none;padding:14px 24px">
      <div style="display:flex;flex-direction:column;align-items:center;gap:2px">
        <span style="font-size:22px">ごほうびゲット!</span>
        <span style="display:flex;align-items:center;gap:8px;font-size:26px">
          ${art.glossyStar(30)} <span id="rw-star">×0</span>
          <span style="width:10px"></span>
          ${art.glossyHeart(30)} <span id="rw-heart">×0</span>
        </span>
      </div>
    </div>`
  );
  scene.appendChild(panel);

  /* count up animation */
  const starEl = panel.querySelector("#rw-star");
  const heartEl = panel.querySelector("#rw-heart");
  let shown = { s: 0, h: 0 };
  const counter = setInterval(() => {
    let moved = false;
    if (shown.s < run.stars) { shown.s++; starEl.textContent = `×${shown.s}`; moved = true; }
    if (shown.h < run.hearts) { shown.h++; heartEl.textContent = `×${shown.h}`; moved = true; }
    if (moved) sfx.timerTick();
    else clearInterval(counter);
  }, 60);

  /* celebration */
  sfx.fanfare();
  vibrate(80);
  confetti({ count: 80 });
  setTimeout(() => confetti({ count: 40 }), 900);
  setTimeout(() => burst(195, 300, { count: 20, kind: "stars", power: 5 }), 300);

  if (newRecipe) {
    setTimeout(() => {
      ui.toast(`あたらしいレシピ「${newRecipe.short}」!`, 195, 200);
      sfx.sparkle();
    }, 1400);
  }

  /* buttons */
  const again = ui.candyBtn("もういちど", { fontSize: 32 });
  again.style.cssText += "position:absolute;left:50%;top:724px;transform:translateX(-50%);min-width:300px;z-index:12";
  again.addEventListener("pointerdown", () => {
    sfx.tap();
    newRun(run.recipe);
    go("ingredients");
  });
  scene.appendChild(again);

  const nextR = ui.el(
    `<button class="candy-btn ghost small" style="position:absolute;left:50%;top:792px;transform:translateX(-50%);min-width:220px;font-size:20px;z-index:12">つぎのレシピ ➤</button>`
  );
  nextR.addEventListener("pointerdown", () => {
    sfx.pick();
    const list = unlockedRecipes();
    const idx = list.findIndex((r) => r.id === run.recipe);
    const nxt = list[(idx + 1) % list.length];
    newRun(nxt.id);
    ui.toast(`${nxt.name}!`, 195, 380);
    setTimeout(() => go("ingredients"), 600);
  });
  scene.appendChild(nextR);

  scene.appendChild(ui.mascotPair({ bunnyX: 2, bunnyY: 596, chickX: 296, chickY: 690 }));

  return { unmount() { clearInterval(counter); } };
}
