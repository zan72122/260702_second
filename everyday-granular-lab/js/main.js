// まいにち粒つぶラボ — アプリ本体 (シーンマネージャー)
import { GrainSim } from './engine/grains.js';
import { GrainRenderer } from './engine/grainRenderer.js';
import { Effects } from './engine/particles2d.js';
import { Sfx } from './engine/audio.js';
import { PointerInput, TiltInput } from './engine/input.js';
import { clamp } from './engine/utils.js';
import { SCENES } from './scenes/index.js';

const $ = (s) => document.querySelector(s);

class App {
  constructor() {
    this.sim = new GrainSim(4500);
    this.fx = new Effects();
    this.sfx = new Sfx();
    this.tilt = new TiltInput();
    this.scene = null;
    this.ctx = null;
    this.stars = JSON.parse(localStorage.getItem('egl_stars') || '{}');
    this.debug = location.search.includes('debug');
    this.frameMs = 16;
    this._recycle = 0;

    this.backC = $('#back');
    this.grainC = $('#grain');
    this.overC = $('#over');
    this.backG = this.backC.getContext('2d');
    this.overG = this.overC.getContext('2d');
    this.renderer = new GrainRenderer(this.grainC);

    this.pointer = new PointerInput($('#stage'), (cx, cy) => {
      const r = $('#stage').getBoundingClientRect();
      return [(cx - r.left) * this.u, (cy - r.top) * this.u];
    });
    this.pointer.onDown = (p) => { this.sfx.unlock(); this.scene?.onDown?.(this.ctx, p); };
    this.pointer.onMove = (p) => this.scene?.onMove?.(this.ctx, p);
    this.pointer.onUp = (p) => this.scene?.onUp?.(this.ctx, p);

    this._buildHome();
    this._bindUI();
    window.addEventListener('resize', () => this._resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this._resize(), 250));
    this._resize();
    this.last = performance.now();
    if (this.debug) window.__app = this;
    requestAnimationFrame((t) => this._loop(t));
  }

  _buildHome() {
    const cards = $('#cards');
    cards.innerHTML = '';
    for (const sc of SCENES) {
      const el = document.createElement('button');
      el.className = 'card';
      el.innerHTML = `
        <span class="card-emoji">${sc.emoji}</span>
        <span class="card-name">${sc.name}</span>
        <span class="card-desc">${sc.desc}</span>
        <span class="card-star">${this.stars[sc.id] ? '⭐' : '☆'}</span>`;
      el.addEventListener('click', () => { this.sfx.unlock(); this.sfx.pop(1.4); this.enter(sc); });
      cards.appendChild(el);
    }
  }

  _bindUI() {
    $('#btnBack').addEventListener('click', () => { this.sfx.pop(0.8); this.exit(); });
    $('#btnReset').addEventListener('click', () => { this.sfx.pop(1.1); if (this.scene) this.enter(this.scene); });
    $('#btnSound').addEventListener('click', () => {
      this.sfx.unlock();
      this.sfx.setMuted(!this.sfx.muted);
      $('#btnSound').textContent = this.sfx.muted ? '🔇' : '🔊';
    });
    $('#btnSound').textContent = this.sfx.muted ? '🔇' : '🔊';
    $('#btnTilt').addEventListener('click', async () => {
      if (this.tilt.enabled) {
        this.tilt.disable();
        $('#btnTilt').classList.remove('on');
        this.toast('傾きセンサー OFF');
      } else {
        const ok = await this.tilt.enable();
        if (ok) {
          $('#btnTilt').classList.add('on');
          this.toast('端末を傾けてみよう!');
        } else this.toast('傾きセンサーが使えませんでした');
      }
    });
  }

  _resize() {
    const stage = $('#stage');
    const w = stage.clientWidth, h = stage.clientHeight;
    if (w === 0 || h === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.dpr = dpr;
    this.pxPerUnit = Math.min(w, h) / 100;
    this.u = 1 / this.pxPerUnit;
    const oldW = this.W, oldH = this.H;
    this.W = w * this.u; this.H = h * this.u;
    for (const c of [this.backC, this.overC]) {
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    }
    this.renderer.resize(Math.round(w * dpr), Math.round(h * dpr));
    if (this.ctx) {
      this.ctx.W = this.W; this.ctx.H = this.H;
      if (oldW && oldH && (oldW !== this.W || oldH !== this.H)) {
        const kx = this.W / oldW, ky = this.H / oldH;
        const s = this.sim;
        for (let i = 0; i < s.n; i++) {
          s.x[i] *= kx; s.y[i] *= ky; s.px[i] = s.x[i]; s.py[i] = s.y[i];
          s.vx[i] = 0; s.vy[i] = 0; s.rest[i] = 0;
        }
        for (const so of s.solids) { so.x *= kx; so.y *= ky; so.px = so.x; so.py = so.y; }
      }
      this.sim.setBounds(this.W, this.H, this.sim.bounds);
      this.sim.colliders.length = 0;
      this.scene.layout(this.ctx);
      this.ctx.backDirty();
    }
  }

  enter(sc) {
    this.scene = sc;
    this.ctx = null;
    $('#home').hidden = true;
    $('#play').hidden = false;
    this._resize();
    this.sim.clear();
    this.fx.clear();
    this.sfx.stopLoops();
    this.sim.setBounds(this.W, this.H, {});
    Object.assign(this.sim, {
      gravityX: 0, gravityY: 430, substeps: 2, iterations: 3,
      contactDamp: 7, fricFloor: 0.08, sleepV: 8, sleepTime: 0.35, onKill: null,
    });
    this.sim.max = Math.min(4500, sc.maxParticles || 3000);

    const app = this;
    this.ctx = {
      app, sim: this.sim, fx: this.fx, sfx: this.sfx, tilt: this.tilt,
      W: this.W, H: this.H, t: 0, data: {},
      pointers: this.pointer.pointers,
      get primary() { return app.pointer.primary; },
      _backDirty: true, _progress: 0, _shownProgress: 0, _cleared: false,
      backDirty() { this._backDirty = true; },
      progress(v) {
        this._progress = clamp(v, 0, 1);
        if (this._progress >= 1 && !this._cleared) {
          this._cleared = true;
          app.celebrate();
        }
      },
      toast(msg, ms) { app.toast(msg, ms); },
      celebrate(msg) { app.celebrate(msg); },
      setHint(t) { $('#hint').innerHTML = t; },
      setTools(list) { app._setTools(list); },
      setToolActive(id) {
        document.querySelectorAll('#toolbar .tool').forEach((b) => {
          b.classList.toggle('on', b.dataset.id === id);
        });
      },
      vibrate(ms = 20) { try { navigator.vibrate?.(ms); } catch (e) {} },
      addCup(cx, yTop, yBottom, innerW, wallR = 1.6, opts = {}) {
        const s = app.sim;
        const hw = innerW / 2 + wallR;
        const L = { kind: 'capsule', ax: cx - hw + (opts.flareL || 0) * -1, ay: yTop, bx: cx - hw, by: yBottom, r: wallR };
        const R = { kind: 'capsule', ax: cx + hw + (opts.flareR || 0), ay: yTop, bx: cx + hw, by: yBottom, r: wallR };
        const B = { kind: 'capsule', ax: cx - hw, ay: yBottom, bx: cx + hw, by: yBottom, r: wallR };
        s.colliders.push(L, R, B);
        return { L, R, B };
      },
      // 敷き詰め (素材の粒径に合わせる)
      fill(x0, y0, x1, y1, matId) {
        const s = app.sim;
        const m = s.mats[matId];
        const sp = m.r * 2 * 1.02;
        let row = 0;
        for (let y = y1 - m.r; y > y0; y -= sp * 0.87, row++) {
          for (let x = x0 + m.r + (row % 2) * sp * 0.5; x < x1 - m.r * 0.5; x += sp) {
            s.emit(x, y, 0, 0, matId, 0.15);
          }
        }
      },
      pour(x, y, vx, vy, matId, n = 1) {
        const s = app.sim;
        for (let k = 0; k < n; k++) {
          if (s.n >= s.max - 1) {
            let tries = 0, i = app._recycle;
            while (tries < 60) {
              i = (i + 1) % s.n;
              if (s.rest[i] > 3 || s.age[i] > 30) break;
              tries++;
            }
            app._recycle = i;
            s.kill(i % s.n);
          }
          s.emit(x, y, vx + (Math.random() - 0.5) * 8, vy + (Math.random() - 0.5) * 8, matId);
        }
      },
    };

    $('#sceneTitle').textContent = sc.emoji + ' ' + sc.name;
    $('#hint').innerHTML = sc.goal || '';
    $('#toolbar').innerHTML = '';
    $('#progressBar').style.width = '0%';
    this.fx.gravity = 430;
    sc.init(this.ctx);
    this.sim.finalizeMaterials();
    this.sim.colliders.length = 0;
    sc.layout(this.ctx);
    this.ctx.backDirty();
  }

  exit() {
    this.scene = null;
    this.ctx = null;
    this.sfx.stopLoops();
    $('#play').hidden = true;
    $('#home').hidden = false;
    this._buildHome();
  }

  celebrate(msg) {
    const sc = this.scene;
    if (!sc) return;
    if (!this.stars[sc.id]) {
      this.stars[sc.id] = true;
      localStorage.setItem('egl_stars', JSON.stringify(this.stars));
    }
    this.sfx.fanfare();
    this.fx.burstConfetti(this.W / 2, this.H * 0.35, 90);
    this.toast(msg || `🎉 クリア! ${sc.clearMsg || 'よくできました!'}`, 3200);
    this.ctx?.vibrate(60);
  }

  toast(msg, ms = 2000) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => t.classList.remove('show'), ms);
  }

  _setTools(list) {
    const bar = $('#toolbar');
    bar.innerHTML = '';
    for (const tl of list) {
      const b = document.createElement('button');
      b.className = 'tool' + (tl.active ? ' on' : '');
      b.dataset.id = tl.id;
      b.innerHTML = `<span>${tl.icon}</span>${tl.label}`;
      b.addEventListener('click', () => {
        this.sfx.unlock(); this.sfx.pop(1.2);
        this.scene?.onTool?.(this.ctx, tl.id);
      });
      bar.appendChild(b);
    }
  }

  _loop(now) {
    requestAnimationFrame((t) => this._loop(t));
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (dt <= 0) return;
    dt = Math.min(dt, 1 / 30);
    this.frameMs = this.frameMs * 0.95 + (dt * 1000) * 0.05;
    if (!this.scene || !this.ctx) return;

    const ctx = this.ctx, sim = this.sim, sc = this.scene;
    ctx.t += dt;
    this.pointer.tick(dt);

    const gBase = sc.gravity ?? 430;
    if (this.tilt.enabled && sc.tilt !== false) {
      sim.gravityX = this.tilt.gx * gBase;
      sim.gravityY = this.tilt.gy * gBase;
    } else {
      sim.gravityX = 0; sim.gravityY = gBase;
    }
    this.fx.gravity = gBase;

    sc.update?.(ctx, dt);
    // 性能に応じて反復回数を調整
    sim.iterations = this.frameMs > 26 ? 2 : 3;
    sim.step(dt);
    this.fx.update(dt, null);

    // パラパラ音 (衝突エネルギー連動)
    const rk = sc.rattle ?? 1;
    this.sfx.setRattle(clamp(sim.collisionEnergy / 55, 0, 1) * rk, sc.rattlePitch ?? 1);

    // 画面外の粒を回収
    const m = 25;
    for (let i = sim.n - 1; i >= 0; i--) {
      if (sim.y[i] > this.H + m || sim.x[i] < -m || sim.x[i] > this.W + m || sim.y[i] < -this.H) sim.kill(i);
    }

    if (ctx._backDirty) {
      ctx._backDirty = false;
      const g = this.backG;
      g.setTransform(this.dpr * this.pxPerUnit, 0, 0, this.dpr * this.pxPerUnit, 0, 0);
      g.clearRect(0, 0, this.W, this.H);
      sc.drawBack?.(ctx, g);
    }

    this.renderer.render(sim, this.W, this.H);

    const g = this.overG;
    g.setTransform(this.dpr * this.pxPerUnit, 0, 0, this.dpr * this.pxPerUnit, 0, 0);
    g.clearRect(0, 0, this.W, this.H);
    sc.drawFront?.(ctx, g);
    this.fx.draw(g);
    if (this.debug) {
      g.fillStyle = '#0f0';
      g.font = '3px monospace';
      let asleep = 0;
      for (let i = 0; i < sim.n; i++) if (sim.rest[i] > sim.sleepTime) asleep++;
      g.fillText(`${this.frameMs.toFixed(1)}ms n=${sim.n} zzz=${asleep}`, 2, this.H - 2);
    }

    ctx._shownProgress += (ctx._progress - ctx._shownProgress) * Math.min(1, dt * 6);
    $('#progressBar').style.width = (ctx._shownProgress * 100).toFixed(1) + '%';
    $('#progressBar').classList.toggle('done', ctx._cleared);
  }
}

addEventListener('DOMContentLoaded', () => new App());
