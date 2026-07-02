/* ================================================================
   scenes/baking.js — mockup 05: オーブンでやこう!
   Stop the sweeping needle inside the golden きつね色 zone,
   then watch the sponge rise with a fast-forward timer.
   ================================================================ */

import * as art from "../art.js";
import * as ui from "../ui.js";
import { sfx, vibrate } from "../audio.js";
import { burst } from "../fx.js";
import { go } from "../main.js";
import { finishStep, addScore } from "../state.js";

export default function bakingScene(scene) {
  scene.appendChild(ui.kitchenBg());
  scene.appendChild(ui.laceTrims());
  scene.appendChild(ui.hud());

  scene.appendChild(
    ui.cloudTitle(
      [
        { text: "オーブンで", cls: "pink", size: 40 },
        { text: "やこう!", cls: "brown", size: 40 },
      ],
      { top: 40, height: 146 }
    )
  );

  /* timer panel */
  const timerPanel = ui.el(
    `<div class="gauge-panel" style="position:absolute;left:50%;top:196px;transform:translateX(-50%);width:250px;text-align:center;z-index:11">
      <div style="font-weight:900;color:#7b4a2d;font-size:15px">やきあがりまで</div>
      <div id="bk-time" style="font-weight:900;color:#e91e63;font-size:38px;letter-spacing:.06em">15:00</div>
      <div style="background:#ffe3ee;border-radius:999px;height:14px;margin-top:2px;overflow:hidden;position:relative">
        <div id="bk-bar" style="background:linear-gradient(90deg,#f78ab4,#e8508c);height:100%;width:0%"></div>
      </div>
    </div>`
  );
  scene.appendChild(timerPanel);

  const girl = ui.el(
    `<div style="position:absolute;left:-20px;top:360px;z-index:8;pointer-events:none">${art.chefGirl({
      pose: "mitt", eyes: "wink", size: 196,
    })}</div>`
  );
  scene.appendChild(girl);

  const ovenWrap = ui.el(
    `<div style="position:absolute;right:-8px;top:330px;z-index:7;pointer-events:none">${art.ovenSvg({ size: 270 })}</div>`
  );
  scene.appendChild(ovenWrap);

  const bubble = ui.speech("きつねいろの<br>ところで とめてね!", { x: 46, y: 292, w: 190 });
  scene.appendChild(bubble);

  /* ------- timing gauge ------- */
  const gauge = ui.el(
    `<div class="gauge-panel" style="position:absolute;left:50%;top:604px;transform:translateX(-50%);width:330px;z-index:11">
      <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:900;color:#b06a86;padding:0 6px 4px">
        <span>まだまだ</span><span style="color:#d98916">きつねいろ♪</span><span>こげちゃう!</span>
      </div>
      <div style="position:relative;height:30px;border-radius:999px;overflow:hidden;background:linear-gradient(90deg,#fdeec4 0%,#fbe09a 45%,#f7c757 62%,#eda838 78%,#8a5a3b 92%,#5b3a21 100%)">
        <div style="position:absolute;left:62%;width:17%;top:0;bottom:0;border:3px solid #fff;border-radius:10px;box-shadow:0 0 8px rgba(255,255,255,.9)"></div>
        <div id="bk-needle" style="position:absolute;left:0;top:-2px;width:10px;height:34px;background:#e91e63;border:2px solid #fff;border-radius:5px;box-shadow:0 2px 6px rgba(200,30,90,.5)"></div>
      </div>
    </div>`
  );
  scene.appendChild(gauge);

  const btn = ui.candyBtn("やいてみる", { fontSize: 34 });
  btn.style.cssText += "position:absolute;left:50%;top:688px;transform:translateX(-50%);min-width:290px;z-index:12";
  btn.classList.add("pulse");
  scene.appendChild(btn);

  /* needle sweep */
  let t0 = performance.now();
  let raf = 0;
  let stopped = false;
  let pos = 0;
  const needle = gauge.querySelector("#bk-needle");
  function sweep(now) {
    if (stopped) return;
    const t = (now - t0) / 1000;
    pos = (Math.sin(t * 2.4 - Math.PI / 2) + 1) / 2; // 0..1 sweeping
    needle.style.left = `calc(${(pos * 100).toFixed(2)}% - 5px)`;
    raf = requestAnimationFrame(sweep);
  }
  raf = requestAnimationFrame(sweep);

  let tries = 0;
  btn.addEventListener("pointerdown", () => {
    if (stopped) return;
    tries++;
    sfx.tap();
    vibrate(20);
    // zone: golden 0.62-0.79 (perfect), ok 0.45-0.62, else miss
    if (pos >= 0.62 && pos <= 0.79) {
      stopped = true;
      cancelAnimationFrame(raf);
      startBake("perfect");
    } else if (pos >= 0.45 && pos < 0.62) {
      stopped = true;
      cancelAnimationFrame(raf);
      startBake("good");
    } else {
      sfx.no();
      ui.toast(pos > 0.79 ? "こげちゃうよ〜!" : "まだはやいよ〜!", 195, 560, "#8a5a3b");
      if (tries >= 3) {  // kid-friendly: 3rd press always bakes
        stopped = true;
        cancelAnimationFrame(raf);
        startBake("good");
      }
    }
  });

  /* ------- bake animation ------- */
  function startBake(quality) {
    btn.style.display = "none";
    gauge.style.display = "none";
    bubble.innerHTML = `やけるまで<br>まっててね♪<div class="mini-heart">♥</div><div class="tail"></div>`;
    const timeEl = timerPanel.querySelector("#bk-time");
    const barEl = timerPanel.querySelector("#bk-bar");
    const total = 4200; // ms of pretend 15:00
    const start = performance.now();
    let lastTickSec = -1;

    function frame(now) {
      const p = Math.min(1, (now - start) / total);
      const remain = Math.ceil((1 - p) * 15 * 60);
      const mm = String(Math.floor(remain / 60)).padStart(2, "0");
      const ss = String(remain % 60).padStart(2, "0");
      timeEl.textContent = `${mm}:${ss}`;
      barEl.style.width = `${(p * 100).toFixed(1)}%`;
      const sec = Math.floor(p * 8);
      if (sec !== lastTickSec) { lastTickSec = sec; sfx.timerTick(); }
      const browning = quality === "perfect" ? p * 0.6 : p * 0.5;
      ovenWrap.innerHTML = art.ovenSvg({ size: 270, glow: Math.sin(p * Math.PI) * 0.9, riseT: p, browning });
      if (p < 1) requestAnimationFrame(frame);
      else baked(quality);
    }
    requestAnimationFrame(frame);
  }

  function baked(quality) {
    sfx.ding();
    vibrate(60);
    bubble.innerHTML = `いい<br>におい〜!<div class="mini-heart">♥</div><div class="tail"></div>`;
    burst(260, 420, { count: 20, kind: "stars", power: 4 });
    /* steam puffs */
    for (let i = 0; i < 3; i++) {
      const puff = ui.el(
        `<div style="position:absolute;left:${230 + i * 30}px;top:400px;width:26px;height:26px;border-radius:50%;background:rgba(255,255,255,.85);z-index:9;animation:steamUp 1.6s ease ${i * 0.3}s forwards;opacity:0"></div>`
      );
      scene.appendChild(puff);
    }
    if (!document.getElementById("steam-kf")) {
      document.head.appendChild(
        ui.el(`<style id="steam-kf">@keyframes steamUp{0%{opacity:0;transform:translateY(0) scale(.6)}30%{opacity:.9}100%{opacity:0;transform:translateY(-90px) scale(1.6)}}</style>`)
      );
    }

    const stars = quality === "perfect" ? 10 : 7;
    addScore({ stars, hearts: 6 });
    finishStep("baking", { stars, hearts: 6, perfect: quality === "perfect" });
    ui.toast(quality === "perfect" ? "きつねいろ ぴったり!" : "ふっくら やけた!", 195, 320);
    if (quality === "perfect") sfx.perfect();

    const nextBtn = ui.candyBtn("つぎへ", { fontSize: 34 });
    nextBtn.style.cssText += "position:absolute;left:50%;top:688px;transform:translateX(-50%);min-width:280px;z-index:12";
    nextBtn.classList.add("pop-in", "pulse");
    nextBtn.addEventListener("pointerdown", () => { sfx.tap(); go("whipping"); });
    scene.appendChild(nextBtn);
  }

  return { unmount() { cancelAnimationFrame(raf); stopped = true; } };
}
