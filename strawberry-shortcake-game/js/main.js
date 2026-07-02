/* ================================================================
   main.js — boot, stage scaling, scene router
   ================================================================ */

import { initFx } from "./fx.js";
import { armAudio } from "./audio.js";
import titleScene from "./scenes/title.js";
import ingredientsScene from "./scenes/ingredients.js";
import mixingScene from "./scenes/mixing.js";
import bakingScene from "./scenes/baking.js";
import whippingScene from "./scenes/whipping.js";
import cuttingScene from "./scenes/cutting.js";
import decoratingScene from "./scenes/decorating.js";
import resultScene from "./scenes/result.js";

const SCENES = {
  title: titleScene,
  ingredients: ingredientsScene,
  mixing: mixingScene,
  baking: bakingScene,
  whipping: whippingScene,
  cutting: cuttingScene,
  decorating: decoratingScene,
  result: resultScene,
};

let current = null;

export function go(name, params = {}) {
  const root = document.getElementById("scene-root");
  if (current && current.unmount) current.unmount();
  root.innerHTML = "";
  document.getElementById("toast-root").innerHTML = "";
  document.getElementById("modal-root").innerHTML = "";
  const sceneEl = document.createElement("div");
  sceneEl.className = "scene scene-fade-in";
  root.appendChild(sceneEl);
  current = SCENES[name](sceneEl, params) || {};
}

/* scale the 390x844 stage to the window */
function fitStage() {
  const stage = document.getElementById("stage");
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const s = Math.min(vw / 390, vh / 844);
  stage.style.transform = `scale(${s})`;
  stage.style.borderRadius = s >= vw / 390 - 0.001 && s >= vh / 844 - 0.001 ? "0" : "18px";
}

window.addEventListener("resize", fitStage);
window.addEventListener("orientationchange", fitStage);

fitStage();
initFx();
armAudio();
go("title");
