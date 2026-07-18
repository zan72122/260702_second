// まいにち光ラボ — アプリ本体 (シーンマネージャー)
import { Tracer } from './engine/ray.js';
import { SkyRenderer } from './engine/sky.js';
import { Effects } from './engine/particles2d.js';
import { Sfx } from './engine/audio.js';
import { PointerInput } from './engine/input.js';
import { clamp } from './engine/utils.js';
import { makeSpectrum } from './engine/spectrum.js';
import { drawRays, drawScreenGlow } from './engine/render2d.js';
import { marchRay } from './engine/march.js';
import { SCENES } from './scenes/index.js';

const $ = (s) => document.querySelector(s);

class App {
  constructor() {
    this.tracer = new Tracer();
    this.fx = new Effects();
    this.sfx = new Sfx();
    this.scene = null;
    this.ctx = null;
    this.stars = JSON.parse(localStorage.getItem('eol_stars') || '{}');
    this.debug = location.search.includes('debug');
    this.frameMs = 16;

    this.backC = $('#back');
    this.skyC = $('#sky');
    this.overC = $('#over');
    this.backG = this.backC.getContext('2d');
    this.overG = this.overC.getContext('2d');
    this.sky = new SkyRenderer(this.skyC);

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
  }

  _resize() {
    const stage = $('#stage');
    const w = stage.clientWidth, h = stage.clientHeight;
    if (w === 0 || h === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.dpr = dpr;
    this.pxPerUnit = Math.min(w, h) / 100;
    this.u = 1 / this.pxPerUnit;
    this.W = w * this.u; this.H = h * this.u;
    for (const c of [this.backC, this.overC]) {
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    }
    // 空シェーダは半解像度で十分キレイ&軽い
    this.sky.resize(Math.round(w * dpr * 0.5), Math.round(h * dpr * 0.5));
    if (this.ctx) {
      this.ctx.W = this.W; this.ctx.H = this.H;
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
    this.tracer.clear();
    this.fx.clear();
    this.sfx.stopLoops();
    this.skyC.style.display = sc.sky ? 'block' : 'none';

    const app = this;
    this.ctx = {
      app, tracer: this.tracer, fx: this.fx, sfx: this.sfx,
      spectrum: makeSpectrum(sc.spectrumN || 14),
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
      drawRays(g, segs, opts) { drawRays(g, segs, opts); },
      drawScreenGlow(g, el, opts) { drawScreenGlow(g, el, opts); },
      march(x, y, dx, dy, nFn, opts) { return marchRay(x, y, dx, dy, nFn, opts); },
    };

    $('#sceneTitle').textContent = sc.emoji + ' ' + sc.name;
    $('#hint').innerHTML = sc.goal || '';
    $('#toolbar').innerHTML = '';
    $('#progressBar').style.width = '0%';
    this.fx.gravity = 430;
    sc.init(this.ctx);
    this.tracer.clear();
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
      localStorage.setItem('eol_stars', JSON.stringify(this.stars));
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

    const ctx = this.ctx, sc = this.scene;
    ctx.t += dt;
    this.pointer.tick(dt);

    sc.update?.(ctx, dt);
    this.fx.update(dt, null);

    // 空シェーダ
    if (sc.sky) this.sky.render(sc.sky(ctx), ctx.t);

    // 背景 (キャッシュ)
    if (ctx._backDirty) {
      ctx._backDirty = false;
      const g = this.backG;
      g.setTransform(this.dpr * this.pxPerUnit, 0, 0, this.dpr * this.pxPerUnit, 0, 0);
      g.clearRect(0, 0, this.W, this.H);
      sc.drawBack?.(ctx, g);
    }

    // 前景 (レイ・光学要素・UI)
    const g = this.overG;
    g.setTransform(this.dpr * this.pxPerUnit, 0, 0, this.dpr * this.pxPerUnit, 0, 0);
    g.clearRect(0, 0, this.W, this.H);
    sc.drawFront?.(ctx, g);
    this.fx.draw(g);
    if (this.debug) {
      g.fillStyle = '#0f0';
      g.font = '3px monospace';
      g.fillText(`${this.frameMs.toFixed(1)}ms`, 2, this.H - 2);
    }

    ctx._shownProgress += (ctx._progress - ctx._shownProgress) * Math.min(1, dt * 6);
    $('#progressBar').style.width = (ctx._shownProgress * 100).toFixed(1) + '%';
    $('#progressBar').classList.toggle('done', ctx._cleared);
  }
}

addEventListener('DOMContentLoaded', () => new App());
