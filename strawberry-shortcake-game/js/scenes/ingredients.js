/* ================================================================
   scenes/ingredients.js — mockup 08: ざいりょうをえらぼう
   Tap the 6 correct ingredients, dodge the joke items.
   ================================================================ */

import * as art from "../art.js";
import * as ui from "../ui.js";
import { sfx, vibrate } from "../audio.js";
import { burst, floatHearts } from "../fx.js";
import { go } from "../main.js";
import { run, finishStep, addScore, RECIPES } from "../state.js";

const CORRECT = [
  { k: "strawberry", nm: "いちご" },
  { k: "egg", nm: "たまご" },
  { k: "flour", nm: "こむぎこ" },
  { k: "milk", nm: "ぎゅうにゅう" },
  { k: "sugar", nm: "さとう" },
  { k: "cream", nm: "なまクリーム" },
];
const JOKES = [
  { k: "wasabi", nm: "わさび" },
  { k: "fish", nm: "おさかな" },
  { k: "pepper", nm: "とうがらし" },
];

export default function ingredientsScene(scene) {
  scene.appendChild(ui.kitchenBg());
  scene.appendChild(ui.laceTrims());
  scene.appendChild(ui.hud());

  scene.appendChild(
    ui.cloudTitle(
      [
        { text: "ざいりょうを", cls: "pink", size: 38 },
        { text: "えらぼう", cls: "pink", size: 38 },
        { text: "<span style='font-size:17px;color:#e8508c'>❶ ･･･ ❷ ･･･ ❸</span>", cls: "brown", size: 17 },
      ],
      { top: 40, height: 168 }
    )
  );

  const girl = ui.el(
    `<div style="position:absolute;left:-24px;top:212px;z-index:6;pointer-events:none">${art.chefGirl({
      pose: "point",
      eyes: "wink",
      size: 190,
    })}</div>`
  );
  scene.appendChild(girl);
  const sp = ui.speech(`おいしい${RECIPES[run.recipe].short}に<br>なるように、ざいりょうを<br>えらんでね!`, { x: 146, y: 240, w: 232 });
  sp.style.fontSize = "14.5px";
  scene.appendChild(sp);

  const bun = ui.el(`<div class="bob" style="position:absolute;left:180px;top:352px;z-index:6;pointer-events:none" data-mascot>${art.bunny({ size: 78 })}</div>`);
  const chk = ui.el(`<div class="bob2" style="position:absolute;left:282px;top:346px;z-index:6;pointer-events:none" data-mascot>${art.chick({ size: 76 })}</div>`);
  scene.appendChild(bun);
  scene.appendChild(chk);

  /* 3x3 grid: 6 correct + 3 jokes shuffled */
  const items = [...CORRECT.map((c) => ({ ...c, good: true })), ...JOKES.map((j) => ({ ...j, good: false }))];
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }

  const grid = ui.el(`<div class="ing-grid" style="position:absolute;left:0;right:0;top:470px;z-index:10"></div>`);
  let got = 0, mistakes = 0, combo = 0;

  const counter = ui.el(
    `<div style="position:absolute;left:50%;top:428px;transform:translateX(-50%);z-index:10;white-space:nowrap;padding:8px 20px" class="gauge-panel">
      <span style="font-weight:900;color:#7b4a2d;font-size:15px;white-space:nowrap">あつめた ざいりょう <span id="ing-count" style="color:#e91e63;font-size:19px">0</span> / 6</span>
    </div>`
  );
  scene.appendChild(counter);

  items.forEach((it) => {
    const card = ui.el(
      `<div class="ing-card">
        ${art.ingIcon(it.k)}
        <span class="nm">${it.nm}</span>
      </div>`
    );
    card.addEventListener("pointerdown", (e) => {
      if (card.classList.contains("got")) return;
      const r = card.getBoundingClientRect();
      const sr = document.getElementById("stage").getBoundingClientRect();
      const scale = sr.width / 390;
      const cx = (r.left + r.width / 2 - sr.left) / scale;
      const cy = (r.top + r.height / 2 - sr.top) / scale;
      if (it.good) {
        card.classList.add("got");
        got++;
        combo++;
        sfx.pick();
        vibrate();
        burst(cx, cy, { count: 10, kind: "hearts", power: 2.6 });
        ui.toast(combo >= 3 ? `コンボ ×${combo}!` : "ゲット♪", cx, cy - 40);
        ui.cheerMascots(scene);
        scene.querySelector("#ing-count").textContent = got;
        if (got === CORRECT.length) setTimeout(done, 500);
      } else {
        mistakes++;
        combo = 0;
        card.classList.remove("shake");
        void card.offsetWidth;
        card.classList.add("shake");
        sfx.no();
        vibrate(40);
        ui.toast("それはいらないよ〜!", 195, cy - 50, "#8a5a3b");
      }
    });
    grid.appendChild(card);
  });
  scene.appendChild(grid);

  const nextBtn = ui.candyBtn("つぎへ", { fontSize: 34 });
  nextBtn.style.cssText += "position:absolute;left:50%;top:742px;transform:translateX(-50%);min-width:280px;z-index:12;display:none";
  nextBtn.addEventListener("pointerdown", () => {
    sfx.tap();
    go("mixing");
  });
  scene.appendChild(nextBtn);

  function done() {
    const stars = Math.max(4, 10 - mistakes * 2);
    const hearts = 6;
    addScore({ stars, hearts });
    finishStep("ingredients", { stars, hearts, perfect: mistakes === 0 });
    sfx.perfect();
    burst(195, 420, { count: 24, kind: "stars", power: 4 });
    ui.toast(mistakes === 0 ? "ぜんぶ ぴったり!" : "ぜんぶ あつめた!", 195, 400);
    floatHearts(195, 460, 5);
    nextBtn.style.display = "flex";
    nextBtn.classList.add("pop-in", "pulse");
  }
}
