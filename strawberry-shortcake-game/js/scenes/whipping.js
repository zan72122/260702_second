/* ================================================================
   scenes/whipping.js — mockup 02: クリームをあわだてよう♪
   Mash まぜる (or rub the bowl) to whip:
   シャバシャバ → とろとろ → ふわふわ!  Stop right in the
   fluffy zone — overwhip and it wobbles back!
   ================================================================ */

import * as art from "../art.js";
import * as ui from "../ui.js";
import { sfx, vibrate } from "../audio.js";
import { burst, floatHearts } from "../fx.js";
import { go } from "../main.js";
import { finishStep, addScore } from "../state.js";

export default function whippingScene(scene) {
  scene.appendChild(ui.kitchenBg());
  scene.appendChild(ui.laceTrims());
  scene.appendChild(ui.hud());

  scene.appendChild(
    ui.cloudTitle(
      [
        { text: "クリームを", cls: "pink", size: 42 },
        { text: "あわだてよう♪", cls: "brown", size: 34 },
      ],
      { top: 42, height: 148 }
    )
  );

  const girl = ui.el(
    `<div style="position:absolute;left:6px;top:196px;z-index:6;pointer-events:none">${art.chefGirl({
      pose: "whisk", eyes: "wink", size: 200,
    })}</div>`
  );
  scene.appendChild(girl);

  const bubble = ui.speech("ふわ<br>ふわ!", { x: 258, y: 300, w: 100 });
  scene.appendChild(bubble);

  const bun = ui.el(`<div class="bob" style="position:absolute;left:-4px;top:430px;z-index:10;pointer-events:none" data-mascot>${art.bunny({ size: 88 })}</div>`);
  const chk = ui.el(`<div class="bob2" style="position:absolute;left:300px;top:430px;z-index:10;pointer-events:none" data-mascot>${art.chick({ size: 84 })}</div>`);
  scene.appendChild(bun);
  scene.appendChild(chk);

  const bowlWrap = ui.el(
    `<div style="position:absolute;left:50%;top:396px;transform:translateX(-50%);z-index:8;pointer-events:none">${art.bowlSvg({
      size: 310, content: "cream", phase: 0,
    })}</div>`
  );
  scene.appendChild(bowlWrap);

  const whisk = ui.el(
    `<div id="wh-whisk" style="position:absolute;left:186px;top:330px;z-index:9;pointer-events:none;transform-origin:50% 20%">${art.whiskSvg({ size: 150 })}</div>`
  );
  scene.appendChild(whisk);

  /* 3-stage gauge like the mockup: bowls at シャバシャバ/とろとろ/ふわふわ! */
  const stageIcons = [0, 0.5, 1].map((p) =>
    `<div style="width:52px;height:44px">${art.bowlSvg({ size: 52, content: "cream", phase: p })}</div>`
  );
  const gauge = ui.el(
    `<div class="gauge-panel" style="position:absolute;left:50%;top:614px;transform:translateX(-50%);width:344px;z-index:11">
      <div style="display:flex;justify-content:space-between;align-items:flex-end;padding:0 8px">
        ${stageIcons[0]}${stageIcons[1]}${stageIcons[2]}
      </div>
      <div style="position:relative;height:20px;border-radius:999px;background:#ffe3ee;overflow:visible;margin:2px 6px 0">
        <div id="wh-fill" style="position:absolute;left:0;top:0;bottom:0;width:0%;border-radius:999px;background:linear-gradient(90deg,#f8a8c6,#e8508c 70%,#ffb648)"></div>
        <div style="position:absolute;left:84%;top:-8px">${`<svg viewBox="0 0 30 30" width="30" height="30">${art.star(15, 16, 12, "#ffd54f", "#f5b731")}</svg>`}</div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:900;color:#7b4a2d;padding:2px 4px 6px">
        <span>シャバシャバ</span><span>とろとろ</span><span style="color:#e91e63">ふわふわ!</span>
      </div>
    </div>`
  );
  scene.appendChild(gauge);

  const btn = ui.candyBtn("まぜる", { fontSize: 36 });
  btn.style.cssText += "position:absolute;left:50%;top:706px;transform:translateX(-50%);min-width:270px;z-index:12";
  scene.appendChild(btn);

  /* ------- mechanic ------- */
  let energy = 0;          // 0..110
  let finished = false;
  let stopMode = false;    // once in fluffy zone, button becomes とめる!
  let overwhips = 0;
  let taps = 0;
  const fill = gauge.querySelector("#wh-fill");

  function labelFor(e) {
    return e < 40 ? "シャバシャバ…" : e < 80 ? "とろとろ♪" : "ふわふわ!";
  }

  function render() {
    const p = Math.max(0, Math.min(1, energy / 100));
    fill.style.width = `${(p * 100).toFixed(1)}%`;
    bowlWrap.innerHTML = art.bowlSvg({ size: 310, content: "cream", phase: p });
    bubble.innerHTML = `${labelFor(energy).replace("!", "<br>!").replace("…", "<br>…").replace("♪", "<br>♪")}<div class="mini-heart">♥</div><div class="tail"></div>`;
    if (energy >= 84 && !stopMode && !finished) {
      stopMode = true;
      btn.innerHTML = `<span class="heart-deco l">♡</span>とめる!<span class="heart-deco r">♡</span>`;
      btn.style.filter = "hue-rotate(-30deg) saturate(1.3)";
      sfx.sparkle();
      ui.toast("いまだ! とめて!", 195, 560);
    }
  }

  let wobbleTimer = null;
  function whip() {
    if (finished) return;
    taps++;
    if (stopMode) { stop(); return; }
    energy += 7 + Math.random() * 3;
    sfx.swish();
    vibrate(8);
    // whisk shake animation
    whisk.style.transform = `translate(${(Math.random() - 0.5) * 26}px, ${(Math.random() - 0.5) * 10}px) rotate(${(Math.random() - 0.5) * 30}deg)`;
    clearTimeout(wobbleTimer);
    wobbleTimer = setTimeout(() => (whisk.style.transform = ""), 120);
    const p = Math.min(1, energy / 100);
    burst(195, 470, { count: 2 + p * 4, kind: "mix", power: 2 + p * 2 });
    if (energy > 40 && energy - 8 <= 40) { ui.toast("とろとろ してきた♪", 195, 400); ui.cheerMascots(scene); }
    render();
  }

  function stop() {
    if (finished) return;
    if (energy >= 84 && energy <= 100) {
      finished = true;
      const perfect = energy >= 88 && energy <= 97;
      const stars = perfect ? 10 : 8;
      addScore({ stars, hearts: 6 });
      finishStep("whipping", { stars, hearts: 6, perfect });
      sfx.perfect();
      vibrate(40);
      burst(195, 460, { count: 26, kind: "stars", power: 4.4 });
      floatHearts(195, 440, 6);
      ui.toast(perfect ? "ふわふわ ぴったり!" : "ふわふわ!", 195, 380);
      ui.cheerMascots(scene);
      bubble.innerHTML = `ふわふわに<br>できた!<div class="mini-heart">♥</div><div class="tail"></div>`;
      btn.style.display = "none";
      const nextBtn = ui.candyBtn("つぎへ", { fontSize: 34 });
      nextBtn.style.cssText += "position:absolute;left:50%;top:706px;transform:translateX(-50%);min-width:280px;z-index:12";
      nextBtn.classList.add("pop-in", "pulse");
      nextBtn.addEventListener("pointerdown", () => { sfx.tap(); go("cutting"); });
      scene.appendChild(nextBtn);
    }
  }

  /* decay + overwhip watchdog */
  const tick = setInterval(() => {
    if (finished) return;
    if (!stopMode) {
      energy = Math.max(0, energy - 1.1);
    } else {
      energy += 1.6;         // keeps rising — stop before it overwhips!
      if (energy > 104) {
        overwhips++;
        energy = 70;
        stopMode = false;
        btn.innerHTML = `<span class="heart-deco l">♡</span>まぜる<span class="heart-deco r">♡</span>`;
        btn.style.filter = "";
        sfx.no();
        ui.toast("まぜすぎ〜! もどっちゃった", 195, 420, "#8a5a3b");
      }
    }
    render();
  }, 120);

  btn.addEventListener("pointerdown", whip);
  /* also allow rubbing the bowl */
  let lastX = null;
  scene.addEventListener("pointermove", (ev) => {
    if (finished || stopMode) return;
    if (ev.buttons !== 1 && ev.pointerType === "mouse") return;
    const sr = document.getElementById("stage").getBoundingClientRect();
    const scale = sr.width / 390;
    const x = (ev.clientX - sr.left) / scale;
    const y = (ev.clientY - sr.top) / scale;
    if (y > 400 && y < 620) {
      if (lastX !== null && Math.abs(x - lastX) > 26) whip();
      lastX = x;
    }
  });

  render();
  return { unmount() { clearInterval(tick); clearTimeout(wobbleTimer); } };
}
