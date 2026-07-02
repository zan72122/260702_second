/* ================================================================
   fx.js — canvas particle engine: ambient sparkles, bursts,
   confetti rain, floating hearts. Runs on #fx-canvas (390x844).
   ================================================================ */

const W = 390, H = 844;
let canvas, g;
let parts = [];
let ambientOn = true;
let running = false;

export function initFx() {
  canvas = document.getElementById("fx-canvas");
  canvas.width = W * 2;
  canvas.height = H * 2;
  g = canvas.getContext("2d");
  g.scale(2, 2);
  running = true;
  requestAnimationFrame(loop);
}

/* ---- particle shapes ---- */

function drawStar(x, y, r, rot, color) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.46;
    g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  g.closePath();
  g.fillStyle = color;
  g.fill();
  g.restore();
}

function drawHeart(x, y, s, rot, color) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.beginPath();
  g.moveTo(0, s * 0.9);
  g.bezierCurveTo(-s * 1.24, -s * 0.1, -s * 0.62, -s, 0, -s * 0.36);
  g.bezierCurveTo(s * 0.62, -s, s * 1.24, -s * 0.1, 0, s * 0.9);
  g.fillStyle = color;
  g.fill();
  g.restore();
}

function drawTwinkle(x, y, s, rot, color) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.beginPath();
  g.moveTo(0, -s);
  g.quadraticCurveTo(s * 0.16, -s * 0.16, s, 0);
  g.quadraticCurveTo(s * 0.16, s * 0.16, 0, s);
  g.quadraticCurveTo(-s * 0.16, s * 0.16, -s, 0);
  g.quadraticCurveTo(-s * 0.16, -s * 0.16, 0, -s);
  g.closePath();
  g.fillStyle = color;
  g.fill();
  g.restore();
}

function drawRect(x, y, s, rot, color) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.fillStyle = color;
  g.fillRect(-s / 2, -s * 0.35, s, s * 0.7);
  g.restore();
}

const SHAPES = { star: drawStar, heart: drawHeart, twinkle: drawTwinkle, rect: drawRect };

/* ---- spawners ---- */

const PASTEL = ["#ffd54f", "#f8a8c6", "#8fd0f2", "#fff", "#f0629b", "#c5e8b0"];

function spawnAmbient() {
  if (parts.filter((p) => p.kind === "amb").length > 14) return;
  parts.push({
    kind: "amb",
    shape: Math.random() < 0.72 ? "twinkle" : "heart",
    x: 10 + Math.random() * (W - 20),
    y: 10 + Math.random() * (H - 20),
    vx: 0, vy: 0,
    s: 0, maxS: 3 + Math.random() * 6,
    rot: Math.random() * Math.PI,
    vr: 0.008,
    life: 0, maxLife: 90 + Math.random() * 60,
    color: Math.random() < 0.6 ? "rgba(255,255,255,.95)" : "rgba(255,214,235,.95)",
    grav: 0,
  });
}

export function burst(x, y, { count = 12, kind = "mix", power = 3 } = {}) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = (0.5 + Math.random()) * power;
    const shape = kind === "hearts" ? "heart" : kind === "stars" ? "star" : Math.random() < 0.5 ? "star" : "heart";
    parts.push({
      kind: "burst",
      shape,
      x, y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - 1.4,
      s: 4 + Math.random() * 5, maxS: 0,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.24,
      life: 0, maxLife: 42 + Math.random() * 26,
      color: PASTEL[(Math.random() * PASTEL.length) | 0],
      grav: 0.1,
    });
  }
}

export function confetti({ count = 70 } = {}) {
  for (let i = 0; i < count; i++) {
    parts.push({
      kind: "conf",
      shape: Math.random() < 0.5 ? "rect" : Math.random() < 0.5 ? "heart" : "star",
      x: Math.random() * W,
      y: -20 - Math.random() * 300,
      vx: (Math.random() - 0.5) * 1.2,
      vy: 1.6 + Math.random() * 2.2,
      s: 5 + Math.random() * 6, maxS: 0,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      life: 0, maxLife: 320,
      color: PASTEL[(Math.random() * PASTEL.length) | 0],
      grav: 0.012,
      sway: Math.random() * Math.PI * 2,
    });
  }
}

export function floatHearts(x, y, count = 3) {
  for (let i = 0; i < count; i++) {
    parts.push({
      kind: "float",
      shape: "heart",
      x: x + (Math.random() - 0.5) * 30,
      y,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -0.9 - Math.random() * 0.8,
      s: 6 + Math.random() * 6, maxS: 0,
      rot: 0, vr: 0,
      life: 0, maxLife: 70,
      color: ["#f8a8c6", "#f0629b", "#ffc7dd"][(Math.random() * 3) | 0],
      grav: 0,
    });
  }
}

export function setAmbient(on) { ambientOn = on; }

/* ---- loop ---- */

let frame = 0;
function loop() {
  if (!running) return;
  frame++;
  g.clearRect(0, 0, W, H);
  if (ambientOn && frame % 9 === 0) spawnAmbient();

  parts = parts.filter((p) => p.life <= p.maxLife && p.y < H + 40);
  for (const p of parts) {
    p.life++;
    p.x += p.vx;
    p.y += p.vy;
    p.vy += p.grav;
    p.rot += p.vr;
    if (p.sway !== undefined) { p.sway += 0.05; p.x += Math.sin(p.sway) * 0.7; }

    let size = p.s, alpha = 1;
    if (p.kind === "amb") {
      const t = p.life / p.maxLife;
      size = p.maxS * Math.sin(Math.PI * t);
      alpha = 1;
    } else {
      const t = p.life / p.maxLife;
      alpha = t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
    }
    if (size <= 0.3) continue;
    g.globalAlpha = alpha;
    SHAPES[p.shape](p.x, p.y, size, p.rot, p.color);
  }
  g.globalAlpha = 1;
  requestAnimationFrame(loop);
}
