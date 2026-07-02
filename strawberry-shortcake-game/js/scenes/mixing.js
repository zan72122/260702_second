/* ================================================================
   scenes/mixing.js — mockup 03: スポンジをまぜよう
   1) tap the eggs to crack them  2) trace circles to mix batter
   ================================================================ */

import * as art from "../art.js";
import * as ui from "../ui.js";
import { sfx, vibrate } from "../audio.js";
import { burst, floatHearts } from "../fx.js";
import { go } from "../main.js";
import { run, finishStep, addScore } from "../state.js";

const EGGS = 3;
const ROTATIONS = 6; // full circles to finish

export default function mixingScene(scene) {
  scene.appendChild(ui.kitchenBg());
  scene.appendChild(ui.laceTrims());
  scene.appendChild(ui.hud());

  scene.appendChild(
    ui.cloudTitle(
      [
        { text: "スポンジを", cls: "pink", size: 42 },
        { text: "まぜよう", cls: "brown", size: 40 },
      ],
      { top: 44, height: 150 }
    )
  );

  const girl = ui.el(
    `<div style="position:absolute;left:-22px;top:200px;z-index:6;pointer-events:none">${art.chefGirl({
      pose: "wave", eyes: "open", size: 186,
    })}</div>`
  );
  scene.appendChild(girl);
  const bubble = ui.speech("たまごを<br>わって…", { x: 200, y: 218, w: 140 });
  scene.appendChild(bubble);

  /* flour bag + egg basket props */
  scene.appendChild(
    ui.el(`<div style="position:absolute;right:6px;top:430px;z-index:6;pointer-events:none">
      <svg viewBox="0 0 90 110" width="86" height="105">
        <path d="M14 34 L76 34 L82 96 Q45 108 8 96Z" fill="#e8cba4" stroke="#cfa87b" stroke-width="2.5"/>
        <path d="M14 34 L76 34 L74 22 Q45 14 16 22Z" fill="#d9b98c"/>
        <rect x="20" y="52" width="50" height="26" rx="12" fill="#fff8ec" stroke="#cfa87b" stroke-width="2"/>
        <text x="45" y="70" text-anchor="middle" font-size="14" font-weight="900" fill="#8a5a3b">こむぎこ</text>
        <path d="M35 88 q5 -8 10 0 q5 -8 10 0" stroke="#c9a06a" stroke-width="2" fill="none"/>
      </svg>
    </div>`)
  );

  /* ------- egg phase ------- */
  const eggRow = ui.el(`<div style="position:absolute;left:0;right:0;top:352px;display:flex;justify-content:center;gap:22px;z-index:11"></div>`);
  let cracked = 0;
  for (let i = 0; i < EGGS; i++) {
    const e = ui.el(`<div class="pop-in" style="cursor:pointer">${art.eggSvg({ size: 60 })}</div>`);
    e.addEventListener("pointerdown", () => {
      if (e.dataset.done) return;
      e.dataset.done = "1";
      cracked++;
      sfx.crack();
      vibrate(15);
      e.innerHTML = art.eggSvg({ size: 60, cracked: true });
      e.classList.add("cheer");
      setTimeout(() => sfx.plop(), 180);
      const sr = document.getElementById("stage").getBoundingClientRect();
      const r = e.getBoundingClientRect();
      const scale = sr.width / 390;
      burst((r.left + r.width / 2 - sr.left) / scale, (r.top - sr.top) / scale + 30, { count: 6, power: 2 });
      ui.toast("パカッ!", (r.left + r.width / 2 - sr.left) / scale, (r.top - sr.top) / scale - 16);
      if (cracked === EGGS) startMixPhase();
    });
    eggRow.appendChild(e);
  }
  scene.appendChild(eggRow);

  /* ------- bowl ------- */
  const bowlWrap = ui.el(
    `<div style="position:absolute;left:50%;top:430px;transform:translateX(-50%);z-index:9;touch-action:none">${art.bowlSvg({
      size: 320, content: "batter", phase: 0,
    })}</div>`
  );
  scene.appendChild(bowlWrap);

  /* dashed guide circle */
  const guide = ui.el(
    `<div class="hidden" style="position:absolute;left:50%;top:452px;transform:translateX(-50%);z-index:10;pointer-events:none">
      <svg viewBox="0 0 260 120" width="260" height="120">
        <ellipse cx="130" cy="56" rx="110" ry="42" fill="none" stroke="#e8508c" stroke-width="5" stroke-dasharray="16 12" opacity=".9"/>
        <path d="M28 40 l-10 14 l16 2z" fill="#e8508c"/>
      </svg>
    </div>`
  );
  scene.appendChild(guide);

  /* hearts progress */
  const track = ui.heartTrack(ROTATIONS);
  const trackWrap = ui.el(`<div style="position:absolute;left:50%;bottom:66px;transform:translateX(-50%);z-index:12"></div>`);
  trackWrap.appendChild(track.el);
  scene.appendChild(trackWrap);

  const hint = ui.candyBtn("くるくる<br>まぜる", { fontSize: 28 });
  hint.style.cssText += "position:absolute;left:50%;top:672px;transform:translateX(-50%);min-width:250px;z-index:12;pointer-events:none;opacity:.35";
  scene.appendChild(hint);

  /* ------- mixing mechanic ------- */
  let mixing = false;
  let lastAngle = null;
  let turned = 0;       // radians accumulated
  let rotationsDone = 0;
  let swirl = 0;
  let startTime = 0;
  let finished = false;

  const CX = 195, CY = 508; // stage coords of bowl center

  function stagePoint(ev) {
    const sr = document.getElementById("stage").getBoundingClientRect();
    const scale = sr.width / 390;
    return { x: (ev.clientX - sr.left) / scale, y: (ev.clientY - sr.top) / scale };
  }

  function startMixPhase() {
    bubble.innerHTML = `まぜまぜ♪<div class="mini-heart">♥</div><div class="tail"></div>`;
    guide.classList.remove("hidden");
    hint.style.opacity = "1";
    hint.classList.add("pulse");
    eggRow.style.transition = "opacity .5s";
    eggRow.style.opacity = "0";
    setTimeout(() => eggRow.remove(), 550);
    startTime = performance.now();
    sfx.ding();

    scene.addEventListener("pointerdown", onDown);
    scene.addEventListener("pointermove", onMove);
    scene.addEventListener("pointerup", onUp);
  }

  function onDown(ev) {
    const p = stagePoint(ev);
    if (Math.abs(p.x - CX) < 170 && Math.abs(p.y - CY) < 130) {
      mixing = true;
      lastAngle = Math.atan2(p.y - CY, p.x - CX);
    }
  }
  function onUp() { mixing = false; lastAngle = null; }

  let sfxCooldown = 0;
  function onMove(ev) {
    if (!mixing || finished) return;
    const p = stagePoint(ev);
    const a = Math.atan2(p.y - CY, p.x - CX);
    if (lastAngle !== null) {
      let d = a - lastAngle;
      if (d > Math.PI) d -= Math.PI * 2;
      if (d < -Math.PI) d += Math.PI * 2;
      if (Math.abs(d) < 1.2) {
        turned += Math.abs(d);
        swirl += d * 30;
        const phase = Math.min(1, turned / (ROTATIONS * Math.PI * 2));
        bowlWrap.innerHTML = art.bowlSvg({ size: 320, content: "batter", phase, swirlAngle: swirl % 360 });
        const now = performance.now();
        if (now > sfxCooldown) { sfx.stir(); sfxCooldown = now + 140; }
        const doneRot = Math.floor(turned / (Math.PI * 2));
        if (doneRot > rotationsDone) {
          rotationsDone = doneRot;
          track.set(rotationsDone);
          sfx.heart();
          vibrate();
          burst(p.x, p.y, { count: 7, kind: "hearts", power: 2.4 });
          if (rotationsDone === 2) ui.toast("いいちょうし♪", 195, 400);
          if (rotationsDone === 4) ui.toast("くるくる〜!", 195, 400);
          if (rotationsDone >= ROTATIONS) finish();
        }
      }
    }
    lastAngle = a;
  }

  function finish() {
    finished = true;
    const secs = (performance.now() - startTime) / 1000;
    const stars = secs < 14 ? 10 : secs < 22 ? 8 : 6;
    addScore({ stars, hearts: 6 });
    finishStep("mixing", { stars, hearts: 6, perfect: stars === 10 });
    guide.classList.add("hidden");
    hint.remove();
    bubble.innerHTML = `なめらか〜!<div class="mini-heart">♥</div><div class="tail"></div>`;
    sfx.perfect();
    burst(CX, CY - 40, { count: 22, kind: "stars", power: 4 });
    floatHearts(CX, CY - 30, 5);

    const nextBtn = ui.candyBtn("つぎへ", { fontSize: 34 });
    nextBtn.style.cssText += "position:absolute;left:50%;top:678px;transform:translateX(-50%);min-width:280px;z-index:12";
    nextBtn.classList.add("pop-in", "pulse");
    nextBtn.addEventListener("pointerdown", () => { sfx.tap(); go("baking"); });
    scene.appendChild(nextBtn);
  }

  return {
    unmount() {
      scene.removeEventListener("pointerdown", onDown);
      scene.removeEventListener("pointermove", onMove);
      scene.removeEventListener("pointerup", onUp);
    },
  };
}
