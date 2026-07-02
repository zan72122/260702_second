/* ================================================================
   scenes/cutting.js — mockup 07: いちごをきろう
   A sweeping cut-line moves over the strawberry — tap トントン
   when it's inside the dashed target to slice. 8 berries!
   ================================================================ */

import * as art from "../art.js";
import * as ui from "../ui.js";
import { sfx, vibrate } from "../audio.js";
import { burst } from "../fx.js";
import { go } from "../main.js";
import { finishStep, addScore } from "../state.js";

const BERRIES = 8;

export default function cuttingScene(scene) {
  scene.appendChild(ui.kitchenBg());
  scene.appendChild(ui.laceTrims());
  scene.appendChild(ui.hud());

  scene.appendChild(
    ui.cloudTitle(
      [
        { text: "いちごを", cls: "pink", size: 44 },
        { text: "きろう", cls: "pink", size: 44 },
      ],
      { top: 42, height: 146 }
    )
  );

  const girl = ui.el(
    `<div style="position:absolute;left:-18px;top:206px;z-index:6;pointer-events:none">${art.chefGirl({
      pose: "knife", eyes: "open", size: 196,
    })}</div>`
  );
  scene.appendChild(girl);
  const bubble = ui.speech("きれいに<br>あらって<br>きってね♪", { x: 216, y: 218, w: 140 });
  scene.appendChild(bubble);

  /* washing colander prop (top right) */
  scene.appendChild(
    ui.el(`<div style="position:absolute;right:2px;top:346px;z-index:6;pointer-events:none">
      <svg viewBox="0 0 140 110" width="132" height="104">
        <path d="M20 40 Q70 20 120 40 L112 76 Q70 92 28 76Z" fill="#f8a8c6" stroke="#e0619a" stroke-width="3"/>
        <ellipse cx="70" cy="40" rx="50" ry="14" fill="#fbc6da"/>
        <g transform="translate(40 26) scale(.42)">${art.strawberry({ size: 60 }).replace(/<\/?svg[^>]*>/g, "")}</g>
        <g transform="translate(64 22) scale(.46)">${art.strawberry({ size: 60 }).replace(/<\/?svg[^>]*>/g, "")}</g>
        <g transform="translate(88 26) scale(.4)">${art.strawberry({ size: 60 }).replace(/<\/?svg[^>]*>/g, "")}</g>
        <path d="M96 2 Q104 14 98 26 M108 0 Q116 14 110 28" stroke="#9fd8f5" stroke-width="5" fill="none" stroke-linecap="round"/>
        ${art.sparkle(30, 16, 6, "#fff")}${art.sparkle(112, 44, 5, "#fff")}
      </svg>
    </div>`)
  );

  /* board + berry + sweeping line */
  scene.appendChild(
    ui.el(`<div style="position:absolute;left:50%;top:470px;transform:translateX(-50%);z-index:7;pointer-events:none">${art.boardSvg({ size: 356 })}</div>`)
  );

  const berryWrap = ui.el(`<div style="position:absolute;left:50%;top:452px;transform:translateX(-50%);z-index:9;pointer-events:none">${art.strawberry({ size: 96 })}</div>`);
  scene.appendChild(berryWrap);

  /* target zone + sweeping cut line (over berry area) */
  const zone = ui.el(
    `<div style="position:absolute;left:50%;top:440px;transform:translateX(-50%);width:260px;height:130px;z-index:10;pointer-events:none">
      <div id="ct-target" style="position:absolute;left:104px;width:52px;top:0;bottom:0;border:4px dashed #e8508c;border-radius:16px;box-shadow:0 0 10px rgba(232,80,140,.35)"></div>
      <div id="ct-line" style="position:absolute;left:0;top:-8px;bottom:-8px;width:8px;border-radius:4px;background:linear-gradient(180deg,#fff,#ffd0e2,#fff);box-shadow:0 0 8px rgba(255,255,255,.95), 0 0 4px rgba(232,80,140,.7)"></div>
    </div>`
  );
  scene.appendChild(zone);

  /* knife that chops on tap */
  const knife = ui.el(
    `<div style="position:absolute;left:248px;top:352px;z-index:11;pointer-events:none;transition:transform .09s ease;transform-origin:20% 10%;rotate:-34deg">${art.knifeSvg({ size: 124 })}</div>`
  );
  scene.appendChild(knife);

  /* sliced results row */
  const doneRow = ui.el(`<div style="position:absolute;left:0;right:0;top:596px;display:flex;justify-content:center;gap:4px;z-index:9"></div>`);
  scene.appendChild(doneRow);

  const counter = ui.el(
    `<div class="gauge-panel" style="position:absolute;left:50%;top:392px;transform:translateX(-50%);z-index:11;padding:8px 18px">
      <span style="font-weight:900;color:#7b4a2d;font-size:16px">いちご <span id="ct-count" style="color:#e91e63;font-size:20px">0</span> / ${BERRIES}</span>
    </div>`
  );
  scene.appendChild(counter);

  const btn = ui.candyBtn("トントン 🔪", { fontSize: 34 });
  btn.style.cssText += "position:absolute;left:50%;top:668px;transform:translateX(-50%);min-width:290px;z-index:12";
  scene.appendChild(btn);

  /* ------- mechanic ------- */
  let cut = 0, perfects = 0, finished = false;
  let raf = 0, t0 = performance.now();
  let speed = 1.35; // sweeps per second-ish
  const line = zone.querySelector("#ct-line");
  let pos = 0;

  function sweep(now) {
    if (finished) return;
    const t = ((now - t0) / 1000) * speed;
    pos = (Math.sin(t * Math.PI - Math.PI / 2) + 1) / 2; // 0..1 smooth back-and-forth
    line.style.left = `calc(${(pos * 100).toFixed(2)}% - 4px)`;
    raf = requestAnimationFrame(sweep);
  }
  raf = requestAnimationFrame(sweep);

  function chopAnim() {
    knife.style.transform = "translate(-70px, 60px) rotate(-38deg)";
    setTimeout(() => (knife.style.transform = ""), 110);
  }

  btn.addEventListener("pointerdown", () => {
    if (finished) return;
    chopAnim();
    sfx.chop();
    vibrate(18);
    // target center 0.4..0.6 → perfect band 0.44..0.56
    if (pos >= 0.4 && pos <= 0.6) {
      const perfect = pos >= 0.44 && pos <= 0.56;
      if (perfect) perfects++;
      cut++;
      scene.querySelector("#ct-count").textContent = cut;
      sfx.pop();
      burst(195, 500, { count: 10, kind: "hearts", power: 3 });
      ui.toast(perfect ? "ぴったり!" : "トントン♪", 195, 420, perfect ? undefined : "#e8508c");
      /* slice fan-out */
      berryWrap.innerHTML = "";
      for (let i = 0; i < 3; i++) {
        const s = ui.el(
          `<div style="position:absolute;left:${-30 + i * 26}px;top:${8 + (i % 2) * 6}px;transform:rotate(${-16 + i * 16}deg)">${art.strawberrySliceSvg({ size: 56 })}</div>`
        );
        berryWrap.appendChild(s);
      }
      doneRow.appendChild(ui.el(`<div class="pop-in">${art.strawberrySliceSvg({ size: 34 })}</div>`));
      speed = 1.35 + cut * 0.12; // ramp up!
      if (cut >= BERRIES) { finish(); return; }
      /* next berry slides in */
      setTimeout(() => {
        berryWrap.innerHTML = art.strawberry({ size: 96 });
        berryWrap.classList.remove("pop-in");
        void berryWrap.offsetWidth;
        berryWrap.classList.add("pop-in");
        t0 = performance.now();
      }, 340);
    } else {
      sfx.no();
      berryWrap.classList.remove("shake");
      void berryWrap.offsetWidth;
      berryWrap.classList.add("shake");
      ui.toast("あわてないで♪", 195, 420, "#8a5a3b");
    }
  });

  function finish() {
    finished = true;
    cancelAnimationFrame(raf);
    zone.style.display = "none";
    btn.style.display = "none";
    const stars = Math.min(10, 4 + Math.round((perfects / BERRIES) * 6));
    addScore({ stars, hearts: 6 });
    finishStep("cutting", { stars, hearts: 6, perfect: perfects === BERRIES });
    sfx.perfect();
    burst(195, 480, { count: 24, kind: "stars", power: 4.2 });
    bubble.innerHTML = `じょうずに<br>きれたね!<div class="mini-heart">♥</div><div class="tail"></div>`;
    ui.toast(perfects === BERRIES ? "ぜんぶ ぴったり!" : "きりおわった!", 195, 380);

    const nextBtn = ui.candyBtn("つぎへ", { fontSize: 34 });
    nextBtn.style.cssText += "position:absolute;left:50%;top:668px;transform:translateX(-50%);min-width:280px;z-index:12";
    nextBtn.classList.add("pop-in", "pulse");
    nextBtn.addEventListener("pointerdown", () => { sfx.tap(); go("decorating"); });
    scene.appendChild(nextBtn);
  }

  scene.appendChild(ui.mascotPair({ bunnyX: 2, bunnyY: 716, chickX: 296, chickY: 722 }));

  return { unmount() { finished = true; cancelAnimationFrame(raf); } };
}
