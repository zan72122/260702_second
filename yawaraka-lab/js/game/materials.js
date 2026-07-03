/* やわらかラボ — material definitions (12 soft materials).
 * Each entry is a full parameter set consumed by YL.Sim (physics) and
 * YL.Render (look). Values are hand-tuned so a 4-year-old feels twelve
 * clearly different hand-feels. thermal(p,mat,dt) hooks are called per
 * particle per frame — kept cheap and everything is clamped. */
(function () {
  'use strict';
  window.YL = window.YL || {};

  YL.MATERIALS = [

    // 1. ねんど — plastic clay: squish holds forever, no bounce.
    {
      id: 'nendo', emoji: '🟤', name: 'ねんど',
      ui: { base: '#c96e48', accent: '#e6a878' },
      palette: [[201, 110, 72], [230, 150, 90], [225, 190, 150]],
      spacing: 15, pr: 9.5, lumpR: 88,
      stiff: 0.55, damp: 0.30,
      plastic: { yield: 0.12, rate: 0.50 },
      breakStrain: 2.0,
      rebond: { dist: 1.15, rate: 0.40 },
      memory: 0.0, spread: 0.0, restH: 0.70, hRecover: 0.50,
      mixRate: 0.08, frictionHeat: 0.0,
      gloss: 0.10, texture: 'smooth', outline: '#8a4a2e',
      soundId: 'nendo', feel: 'むにゅ',
    },

    // 2. スライム — low stiffness, near-unbreakable strings, slowly puddles.
    {
      id: 'slime', emoji: '🫧', name: 'スライム',
      ui: { base: '#7ee787', accent: '#a5f3b8' },
      palette: [[126, 231, 135], [130, 240, 220]],
      spacing: 15, pr: 9.5, lumpR: 90,
      stiff: 0.18, damp: 0.06,
      plastic: { yield: 0.20, rate: 0.50 },
      breakStrain: 3.2,
      rebond: { dist: 1.20, rate: 0.60 },
      memory: 0.0, spread: 0.50, restH: 0.55, hRecover: 0.50,
      mixRate: 0.10, frictionHeat: 0.0,
      gloss: 1.0, texture: 'smooth', outline: '#3f7d4f',
      alpha: 0.95,
      soundId: 'slime', feel: 'ねばねば',
    },

    // 3. もち — huge stretch, slow elastic snap-back, flour dusting.
    {
      id: 'mochi', emoji: '🍡', name: 'もち',
      ui: { base: '#faf5f5', accent: '#fadce4' },
      palette: [[250, 245, 245], [250, 220, 228]],
      spacing: 15, pr: 9.5, lumpR: 86,
      stiff: 0.40, damp: 0.15,
      plastic: { yield: 0.25, rate: 0.08 },
      breakStrain: 3.0,
      rebond: { dist: 1.15, rate: 0.40 },
      memory: 0.50, spread: 0.0, restH: 0.75, hRecover: 0.40,
      mixRate: 0.05, frictionHeat: 0.0,
      gloss: 0.15, texture: 'dust', outline: '#c99aa8',
      soundId: 'mochi', feel: 'びよーん',
    },

    // 4. パンきじ — slow-recovering dents; rises & browns when warm.
    {
      id: 'pan', emoji: '🍞', name: 'パンきじ',
      ui: { base: '#f0e1be', accent: '#f5edd8' },
      palette: [[240, 225, 190], [235, 215, 170]],
      spacing: 15, pr: 10, lumpR: 88,
      stiff: 0.50, damp: 0.20,
      plastic: { yield: 0.20, rate: 0.25 },
      breakStrain: 2.2,
      rebond: { dist: 1.15, rate: 0.45 },
      memory: 0.25, spread: 0.05, restH: 0.75, hRecover: 0.12,
      mixRate: 0.05, frictionHeat: 0.0,
      gloss: 0.10, texture: 'smooth', outline: '#b89b62',
      soundId: 'pan', feel: 'ふわ',
      special: { rises: true },
      thermal: function (p, mat, dt) {
        if (p.temp > 0.1) p.air = Math.min(0.9, p.air + dt * 0.35 * p.temp);
        if (p.temp > 0.5) {
          p.bake = Math.min(1, p.bake + dt * 0.18);
          p.col[0] += (210 - p.col[0]) * dt * 0.6;
          p.col[1] += (150 - p.col[1]) * dt * 0.6;
          p.col[2] += (70 - p.col[2]) * dt * 0.6;
        }
        return { stiffMul: 1 + p.bake };
      },
    },

    // 5. プリン — the jiggle king: super wobbly, clean shiny tears.
    {
      id: 'purin', emoji: '🍮', name: 'プリン',
      ui: { base: '#ffe082', accent: '#ffedb0' },
      palette: [[255, 224, 130], [250, 205, 100], [210, 150, 70]],
      spacing: 15, pr: 10, lumpR: 88,
      stiff: 0.85, damp: 0.03,
      plastic: { yield: 0.30, rate: 0.10 },
      breakStrain: 1.7,
      rebond: { dist: 1.10, rate: 0.40 },
      memory: 0.85, spread: 0.0, restH: 0.85, hRecover: 0.50,
      mixRate: 0.04, frictionHeat: 0.0,
      gloss: 0.85, texture: 'smooth', outline: '#c8964a',
      alpha: 1,
      soundId: 'purin', feel: 'ぷるんぷるん',
    },

    // 6. ホイップ — soft, pipes out, slowly slumps.
    {
      id: 'cream', emoji: '🍦', name: 'ホイップ',
      ui: { base: '#fffcf8', accent: '#fff1f2' },
      palette: [[255, 252, 248], [255, 248, 235], [255, 238, 240]],
      spacing: 15, pr: 9.5, lumpR: 85,
      stiff: 0.25, damp: 0.25,
      plastic: { yield: 0.20, rate: 0.40 },
      breakStrain: 2.0,
      rebond: { dist: 1.15, rate: 0.50 },
      memory: 0.05, spread: 0.12, restH: 0.90, hRecover: 0.30,
      mixRate: 0.06, frictionHeat: 0.0,
      gloss: 0.30, texture: 'fluff', outline: '#e0c9b8',
      soundId: 'cream', feel: 'ふわふわ',
      special: { pipe: true },
    },

    // 7. チョコ — rub to melt (frictionHeat); cold snaps with cracks.
    {
      id: 'choco', emoji: '🍫', name: 'チョコ',
      ui: { base: '#78482d', accent: '#965f3c' },
      palette: [[120, 72, 45], [92, 55, 34], [150, 95, 60]],
      spacing: 15, pr: 9.5, lumpR: 86,
      stiff: 0.55, damp: 0.20,
      plastic: { yield: 0.20, rate: 0.25 },
      breakStrain: 1.9,
      rebond: { dist: 1.15, rate: 0.50 },
      memory: 0.05, spread: 0.0, restH: 0.72, hRecover: 0.50,
      mixRate: 0.06, frictionHeat: 0.50,
      gloss: 0.75, texture: 'smooth', outline: '#4a2b18',
      soundId: 'choco', feel: 'とろ〜',
      thermal: function (p, mat, dt) {
        if (p.temp > 0.15) {
          var t = Math.min(1, (p.temp - 0.15) / 0.85);
          return { stiffMul: 1 - 0.75 * t, plasticMul: 1 + 2 * t };
        }
        if (p.temp < -0.15) {
          var c = Math.min(1, (-p.temp - 0.15) / 0.85);
          return { stiffMul: 1 + 1.6 * c, breakMul: 1 - 0.55 * c, plasticMul: 1 - 0.9 * c };
        }
        return null;
      },
    },

    // 8. クッキーきじ — crumbles into chunks, press to stick back, bakes crisp.
    {
      id: 'cookie', emoji: '🍪', name: 'クッキーきじ',
      ui: { base: '#deb478', accent: '#e8c89a' },
      palette: [[222, 180, 120], [205, 160, 100], [110, 70, 40]],
      spacing: 15, pr: 9.5, lumpR: 86,
      stiff: 0.50, damp: 0.25,
      plastic: { yield: 0.15, rate: 0.45 },
      breakStrain: 1.35,
      rebond: { dist: 1.10, rate: 0.60 },
      memory: 0.0, spread: 0.02, restH: 0.68, hRecover: 0.40,
      mixRate: 0.05, frictionHeat: 0.0,
      gloss: 0.10, texture: 'crumb', outline: '#9a6b3c',
      soundId: 'cookie', feel: 'ぽろぽろ',
      special: { crumbly: true },
      thermal: function (p, mat, dt) {
        if (p.temp > 0.4) {
          p.bake = Math.min(1, p.bake + dt * 0.15);
          p.col[0] += (180 - p.col[0]) * dt * 0.5;
          p.col[1] += (120 - p.col[1]) * dt * 0.5;
          p.col[2] += (60 - p.col[2]) * dt * 0.5;
        }
        if (p.bake > 0.05) return { stiffMul: 1 + p.bake * 2, breakMul: 1 - p.bake * 0.5 };
        return null;
      },
    },

    // 9. ゼリー — translucent purin: clean easy tears, fruit-tone shine.
    {
      id: 'jelly', emoji: '🍧', name: 'ゼリー',
      ui: { base: '#ff5a6e', accent: '#ff9a80' },
      palette: [[255, 90, 110], [255, 160, 70], [180, 110, 220]],
      spacing: 15, pr: 10, lumpR: 88,
      stiff: 0.80, damp: 0.04,
      plastic: { yield: 0.30, rate: 0.10 },
      breakStrain: 1.55,
      rebond: { dist: 1.10, rate: 0.40 },
      memory: 0.80, spread: 0.0, restH: 0.80, hRecover: 0.50,
      mixRate: 0.03, frictionHeat: 0.0,
      gloss: 0.90, texture: 'smooth', outline: '#b43c5a',
      alpha: 0.86,
      soundId: 'jelly', feel: 'ぷるん',
    },

    // 10. マシュマロ — springy pillow, tall & fluffy, toasts golden.
    {
      id: 'mallow', emoji: '☁️', name: 'マシュマロ',
      ui: { base: '#fffafa', accent: '#ffe1e8' },
      palette: [[255, 250, 250], [255, 225, 232]],
      spacing: 15, pr: 10, lumpR: 86,
      stiff: 0.45, damp: 0.18,
      plastic: { yield: 0.25, rate: 0.15 },
      breakStrain: 2.2,
      rebond: { dist: 1.15, rate: 0.45 },
      memory: 0.60, spread: 0.0, restH: 0.95, hRecover: 0.40,
      mixRate: 0.05, frictionHeat: 0.0,
      gloss: 0.10, texture: 'fluff', outline: '#e0b8c0',
      soundId: 'mallow', feel: 'もふっ',
      thermal: function (p, mat, dt) {
        if (p.temp > 0.3) {
          p.bake = Math.min(1, p.bake + dt * 0.12);
          p.col[0] += (200 - p.col[0]) * dt * 0.4;
          p.col[1] += (140 - p.col[1]) * dt * 0.4;
          p.col[2] += (80 - p.col[2]) * dt * 0.4;
          p.air = Math.min(0.5, p.air + dt * 0.10);
        }
        return null;
      },
    },

    // 11. すなねんど — falls apart when pulled, packs solid when pressed.
    {
      id: 'sand', emoji: '🏖️', name: 'すなねんど',
      ui: { base: '#e1cda5', accent: '#ebd9b8' },
      palette: [[225, 205, 165], [215, 195, 150], [205, 182, 138]],
      spacing: 14, pr: 9, lumpR: 88,
      stiff: 0.70, damp: 0.40,
      plastic: { yield: 0.05, rate: 0.80 },
      breakStrain: 1.18,
      rebond: { dist: 1.05, rate: 0.90 },
      memory: 0.0, spread: 0.15, restH: 0.60, hRecover: 0.50,
      mixRate: 0.02, frictionHeat: 0.0,
      gloss: 0.0, texture: 'grain', outline: '#a89060',
      soundId: 'sand', feel: 'さらさら',
      special: { crumbly: true },
    },

    // 12. あわ — fizzy foam: pops on poke, bubbles slowly regrow.
    {
      id: 'awa', emoji: '🛁', name: 'あわ',
      ui: { base: '#e1f0ff', accent: '#f0f8ff' },
      palette: [[250, 252, 255], [225, 240, 255], [235, 245, 255]],
      spacing: 15, pr: 9.5, lumpR: 88,
      stiff: 0.20, damp: 0.10,
      plastic: { yield: 0.25, rate: 0.30 },
      breakStrain: 2.0,
      rebond: { dist: 1.20, rate: 0.70 },
      memory: 0.05, spread: 0.05, restH: 0.95, hRecover: 0.50,
      mixRate: 0.04, frictionHeat: 0.0,
      gloss: 0.40, texture: 'bubbly', outline: '#a8c0d8',
      alpha: 0.95,
      soundId: 'awa', feel: 'しゅわしゅわ',
      special: { popAir: true },
      thermal: function (p, mat, dt) {
        p.air = Math.min(0.6, p.air + dt * 0.08);
        return null;
      },
    },

  ];
})();
