/* やわらかラボ — boot & main loop */
(function () {
  'use strict';
  const U = YL.U;

  const bg = document.getElementById('bg');
  const play = document.getElementById('play');
  const fx = document.getElementById('fx');
  const stage = document.getElementById('stage');
  const ctxBg = bg.getContext('2d');
  const ctxPlay = play.getContext('2d');
  const ctxFx = fx.getContext('2d');

  const sim = new YL.Sim();
  window.__sim = sim; // debug/testing handle
  let W = 0, H = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    for (const [c, ctx] of [[bg, ctxBg], [play, ctxPlay], [fx, ctxFx]]) {
      c.width = W * dpr; c.height = H * dpr;
      c.style.width = W + 'px'; c.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    const m = Math.min(W, H) * 0.035 + 14;
    sim.setBounds({ x: m, y: m, w: W - m * 2, h: H - m * 2 });
    if (YL.Render.field) YL.Render.resize(W, H); else YL.Render.init(W, H);
    YL.Render.drawBackground(ctxBg, W, H);
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 250));
  resize();

  YL.Input.init(stage);

  // ---- UI wiring -----------------------------------------------------------
  function pickMaterial(id) {
    const mat = YL.MATERIALS.find(m => m.id === id) || YL.MATERIALS[0];
    sim.setMaterial(mat);
    YL.Sound.setMaterial(mat.soundId || mat.id);
    YL.Sound.event('switch');
    YL.Tools.setTool('hand', 0);
    if (YL.UI.setTool) YL.UI.setTool('hand');
    YL.FX.emit('ring', { x: W / 2, y: H / 2, col: mat.ui.accent });
  }

  YL.UI.init({
    onMaterial: pickMaterial,
    onTool: (id, sub) => { YL.Tools.setTool(id, sub); YL.Sound.event('tool'); },
    onReset: () => {
      pickMaterial(sim.mat ? sim.mat.id : YL.MATERIALS[0].id);
      YL.Sound.event('spawn');
    },
    onSound: (b) => YL.Sound.setEnabled(b),
  });

  // first pointer anywhere unlocks audio (iOS)
  window.addEventListener('pointerdown', () => YL.Sound.init(), { once: false });

  pickMaterial('nendo');

  // ---- loop ---------------------------------------------------------------
  let last = performance.now();
  let running = true;
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) last = performance.now();
  });

  function frame(now) {
    requestAnimationFrame(frame);
    if (!running) return;
    let dt = (now - last) / 1000;
    last = now;
    dt = U.clamp(dt, 0.001, 1 / 20);
    const t = now / 1000;
    const fingers = YL.Input.fingers.values();
    const fingerArr = [...fingers];

    YL.Tools.update(sim, fingerArr, dt);

    // foam pops under a poking finger (awa)
    if (sim.mat && sim.mat.special && sim.mat.special.popAir) {
      for (const f of fingerArr) {
        if (!f.down || f.mode !== 'hand') continue;
        if (f.justDown || Math.random() < 0.12) sim.popAt(f.x, f.y, 34);
      }
    }

    sim.step(dt, fingerArr);

    // touch sparkles while dragging on the body
    for (const f of fingerArr) {
      if (f.down && f.mode === 'hand' && Math.random() < 0.25 &&
          U.len(f.x - f.px, f.y - f.py) > 2) {
        YL.FX.emit('sparkle', { x: f.x, y: f.y, n: 1 });
      }
    }

    // drain sim events -> sound + fx
    for (const ev of sim.events) {
      YL.Sound.event(ev.t, { v: ev.v });
      switch (ev.t) {
        case 'tear': YL.FX.emit('sparkle', { x: ev.x, y: ev.y, n: 4 }); break;
        case 'pop': YL.FX.emit('pop', { x: ev.x, y: ev.y, n: 6 }); break;
        case 'cut': YL.FX.emit('cutflash', { x: ev.x, y: ev.y }); break;
        case 'crack': YL.FX.emit('crumb', { x: ev.x, y: ev.y, n: 3 }); break;
        case 'spawn': YL.FX.emit('ring', { x: ev.x, y: ev.y }); break;
        case 'drop': YL.FX.emit('sparkle', { x: ev.x, y: ev.y, n: 6 }); break;
      }
    }
    sim.events.length = 0;

    // ambient FX from material state
    if (sim.mat && sim.particles.length) {
      const p = U.pick(sim.particles);
      if (p.temp > 0.25 && Math.random() < p.temp * 0.35) {
        YL.FX.emit('steam', { x: p.x, y: p.y - 10 });
      } else if (p.temp < -0.25 && Math.random() < -p.temp * 0.25) {
        YL.FX.emit('frost', { x: p.x, y: p.y });
      }
      if ((sim.mat.texture === 'dust') && sim.stats.press > 0.55 && Math.random() < 0.12) {
        YL.FX.emit('flour', { x: p.x, y: p.y });
      }
    }

    ctxPlay.clearRect(0, 0, W, H);
    YL.Render.drawBody(ctxPlay, sim, t, fingerArr);

    ctxFx.clearRect(0, 0, W, H);
    YL.Tools.drawGhost(ctxFx, fingerArr, sim);
    YL.FX.update(dt);
    YL.FX.draw(ctxFx);

    YL.Sound.frame(sim.stats, dt);
    YL.Input.endFrame();
  }
  requestAnimationFrame(frame);
})();
