/* ================================================================
   state.js — run state + persistent save (localStorage)
   ================================================================ */

const SAVE_KEY = "strawberry-shortcake-save-v1";

export const RECIPES = {
  shortcake: {
    id: "shortcake",
    name: "いちごショートケーキ",
    short: "ショートケーキ",
    unlockAfter: 0,
    decoTarget: { strawberry: 5, cream: 8, choco: 3, mint: 5, star: 6 },
  },
  cupcake: {
    id: "cupcake",
    name: "いちごカップケーキ",
    short: "カップケーキ",
    unlockAfter: 1,
    decoTarget: { strawberry: 4, cream: 6, choco: 2, mint: 3, star: 5 },
  },
  pancake: {
    id: "pancake",
    name: "いちごパンケーキ",
    short: "パンケーキ",
    unlockAfter: 2,
    decoTarget: { strawberry: 6, cream: 5, choco: 2, mint: 4, star: 4 },
  },
};

export const STEP_ORDER = ["ingredients", "mixing", "baking", "whipping", "cutting", "decorating"];

/* recipe-book pages unlock as steps clear (page index → mockup art) */
export const BOOK_PAGES = [
  { img: "assets/recipe/01.jpg", label: "タイトル" },
  { img: "assets/recipe/08.jpg", label: "ざいりょう" },
  { img: "assets/recipe/03.jpg", label: "スポンジ" },
  { img: "assets/recipe/05.jpg", label: "オーブン" },
  { img: "assets/recipe/02.jpg", label: "クリーム" },
  { img: "assets/recipe/07.jpg", label: "いちご" },
  { img: "assets/recipe/06.jpg", label: "デコ" },
  { img: "assets/recipe/04.jpg", label: "できあがり" },
];

function defaultSave() {
  return {
    bgm: true,
    sfx: true,
    clears: 0,
    totalStars: 0,
    totalHearts: 0,
    bestGrade: {},      // recipeId -> "SS" | "S" | "A" | "B"
    bestScore: {},      // recipeId -> number
    pagesUnlocked: 1,   // recipe book pages
    petCount: 0,        // おたのしみ mascot pats
  };
}

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return { ...defaultSave(), ...JSON.parse(raw) };
  } catch (e) { /* private mode etc. */ }
  return defaultSave();
}

export const save = load();

export function persist() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* ok */ }
}

/* ---- per-run state ---- */
export const run = {
  recipe: "shortcake",
  stepIndex: 0,
  stars: 0,
  hearts: 0,
  combo: 0,
  maxCombo: 0,
  decorations: [],   // placed deco for the final cake
  stepResults: {},   // step -> {stars, hearts, perfect}
};

export function newRun(recipeId = "shortcake") {
  run.recipe = recipeId;
  run.stepIndex = 0;
  run.stars = 0;
  run.hearts = 0;
  run.combo = 0;
  run.maxCombo = 0;
  run.decorations = [];
  run.stepResults = {};
}

export function addScore({ stars = 0, hearts = 0 } = {}) {
  run.stars += stars;
  run.hearts += hearts;
}

export function finishStep(stepName, result) {
  run.stepResults[stepName] = result;
  const pageForStep = STEP_ORDER.indexOf(stepName) + 2; // +1 title page, +1 one-based
  if (pageForStep > save.pagesUnlocked) {
    save.pagesUnlocked = Math.min(pageForStep, BOOK_PAGES.length);
    persist();
  }
}

export function gradeForScore(score) {
  if (score >= 92) return "SS";
  if (score >= 75) return "S";
  if (score >= 55) return "A";
  return "B";
}

export function unlockedRecipes() {
  return Object.values(RECIPES).filter((r) => save.clears >= r.unlockAfter);
}

export function recordClear(recipeId, score, grade) {
  save.clears += 1;
  save.totalStars += run.stars;
  save.totalHearts += run.hearts;
  const order = ["B", "A", "S", "SS"];
  if (!save.bestGrade[recipeId] || order.indexOf(grade) > order.indexOf(save.bestGrade[recipeId])) {
    save.bestGrade[recipeId] = grade;
  }
  if (!save.bestScore[recipeId] || score > save.bestScore[recipeId]) {
    save.bestScore[recipeId] = score;
  }
  save.pagesUnlocked = BOOK_PAGES.length;
  persist();
}
