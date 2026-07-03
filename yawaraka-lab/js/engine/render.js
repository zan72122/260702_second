/* やわらかラボ — material renderer.
 * Density-field iso-contour goo body + per-particle color blending, pseudo-3D
 * height shading, per-material textures, gloss, cartoon outline, cracks,
 * stickers (incl. googly eyes that watch your finger). */
(function () {
  'use strict';
  const U = YL.U;

  const Render = {
    field: null,
    _off: null, _offCtx: null,

    init(w, h) {
      this.field = new YL.Field(9);
      this.resize(w, h);
    },

    resize(w, h) {
      this.w = w; this.h = h;
      this.field.resize(w, h);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this._off = this._off || document.createElement('canvas');
      this._off.width = w * dpr; this._off.height = h * dpr;
      this._offCtx = this._off.getContext('2d');
      this._offCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this._dpr = dpr;
    },

    drawR(p, time, idx) {
      const breath = 1 + 0.012 * Math.sin((time || 0) * 1.7 + (idx || 0) * 1.3);
      return p.r * (1.55 - 0.62 * p.h) * (1 + 0.45 * p.air) * breath;
    },

    drawBackground(ctx, w, h) {
      // warm craft-table + soft silicone mat
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#ffeed6'); g.addColorStop(1, '#ffe3c4');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      const m = Math.min(w, h) * 0.035;
      const rr = 26;
      ctx.save();
      ctx.beginPath();
      const x = m, y = m, mw = w - m * 2, mh = h - m * 2;
      ctx.moveTo(x + rr, y);
      ctx.arcTo(x + mw, y, x + mw, y + mh, rr);
      ctx.arcTo(x + mw, y + mh, x, y + mh, rr);
      ctx.arcTo(x, y + mh, x, y, rr);
      ctx.arcTo(x, y, x + mw, y, rr);
      ctx.closePath();
      ctx.fillStyle = '#fffcf2';
      ctx.shadowColor = 'rgba(180,120,70,0.25)';
      ctx.shadowBlur = 18; ctx.shadowOffsetY = 4;
      ctx.fill();
      ctx.restore();
      // subtle polka dots on the mat
      ctx.save();
      ctx.globalAlpha = 0.05;
      ctx.fillStyle = '#c9885a';
      for (let i = 0; i < 60; i++) {
        const px = m + ((i * 97.3) % (w - m * 2)), py = m + ((i * 61.7) % (h - m * 2));
        ctx.beginPath(); ctx.arc(px, py, 3.2, 0, 7); ctx.fill();
      }
      ctx.restore();
    },

    drawBody(ctx, sim, time, fingers) {
      const mat = sim.mat, P = sim.particles;
      if (!mat || !P.length) return;
      const f = this.field;
      f.clear();
      for (let i = 0; i < P.length; i++) f.splat(P[i].x, P[i].y, this.drawR(P[i], time, i), 1);
      const loops = f.contours();
      if (!loops.length) return;
      const path = new Path2D();
      for (const lp of loops) YL.Field.loopPath(path, lp);

      const alpha = mat.alpha !== undefined ? mat.alpha : 1;
      const tctx = alpha < 1 ? this._offCtx : ctx;
      if (alpha < 1) tctx.clearRect(0, 0, this.w, this.h);

      // soft drop shadow (lifts the blob off the table)
      ctx.save();
      ctx.translate(3, 6);
      ctx.fillStyle = 'rgba(150,95,50,0.16)';
      ctx.fill(path);
      ctx.translate(2, 3);
      ctx.fillStyle = 'rgba(150,95,50,0.10)';
      ctx.fill(path);
      ctx.restore();

      tctx.save();
      // base fill = average color, then per-particle color circles inside clip
      let ar = 0, ag = 0, ab = 0;
      for (const p of P) { ar += p.col[0]; ag += p.col[1]; ab += p.col[2]; }
      const n = P.length;
      tctx.fillStyle = U.rgb([ar / n, ag / n, ab / n]);
      tctx.fill(path);
      tctx.clip(path);

      for (let i = 0; i < n; i++) {
        const p = P[i];
        const dr = this.drawR(p, time, i);
        tctx.fillStyle = U.rgb(p.col, 0.38);
        tctx.beginPath(); tctx.arc(p.x, p.y, dr * 1.75, 0, 7); tctx.fill();
      }
      // pseudo-3D: tall spots are lighter on top (wide + soft so no honeycomb)
      for (let i = 0; i < n; i++) {
        const p = P[i];
        if (p.h < 0.3) continue;
        const dr = this.drawR(p, time, i);
        tctx.fillStyle = U.rgb(U.shade(p.col, 0.30), 0.07 + 0.11 * p.h);
        tctx.beginPath(); tctx.arc(p.x, p.y - dr * 0.16, dr * 1.15, 0, 7); tctx.fill();
      }
      // temperature tint feedback (hot=amber glow / cold=icy blue)
      for (const p of P) {
        if (p.temp > 0.12) {
          tctx.fillStyle = `rgba(255,150,60,${0.16 * Math.min(1, p.temp)})`;
          tctx.beginPath(); tctx.arc(p.x, p.y, p.r * 1.7, 0, 7); tctx.fill();
        } else if (p.temp < -0.12) {
          tctx.fillStyle = `rgba(140,190,255,${0.20 * Math.min(1, -p.temp)})`;
          tctx.beginPath(); tctx.arc(p.x, p.y, p.r * 1.7, 0, 7); tctx.fill();
        }
      }
      this._texture(tctx, sim, time);
      // inner edge shading (soft rounded look)
      tctx.strokeStyle = U.rgb(U.hexToRgb(mat.outline), 0.16);
      tctx.lineWidth = 12;
      tctx.stroke(path);
      // gloss sheen
      if (mat.gloss > 0.05) {
        // broad overlapping sheen (dots would read as polka-dot texture)
        tctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < n; i++) {
          const p = P[i];
          if (p.h < 0.4) continue;
          const dr = this.drawR(p, time, i);
          const a = mat.gloss * 0.05 * p.h;
          tctx.fillStyle = `rgba(255,255,255,${a})`;
          tctx.beginPath();
          tctx.ellipse(p.x - dr * 0.30, p.y - dr * 0.38, dr * 1.05, dr * 0.72, -0.5, 0, 7);
          tctx.fill();
        }
        // one crisp wandering catchlight per blob region: brightest few spots
        tctx.fillStyle = `rgba(255,255,255,${0.30 * mat.gloss})`;
        for (let i = 0; i < n; i += 7) {
          const p = P[i];
          if (p.h < 0.62) continue;
          const dr = this.drawR(p, time, i);
          tctx.beginPath();
          tctx.ellipse(p.x - dr * 0.3, p.y - dr * 0.42, dr * 0.30, dr * 0.16, -0.55, 0, 7);
          tctx.fill();
        }
        tctx.globalCompositeOperation = 'source-over';
      }
      tctx.restore();

      // cartoon outline
      tctx.save();
      tctx.strokeStyle = mat.outline;
      tctx.globalAlpha = 0.75;
      tctx.lineWidth = 2.4;
      tctx.stroke(path);
      tctx.restore();

      if (alpha < 1) {
        ctx.save(); ctx.globalAlpha = alpha;
        ctx.drawImage(this._off, 0, 0, this.w, this.h);
        ctx.restore();
      }

      // cracks (hardened chocolate / baked cookie)
      if (sim.cracks.length) {
        ctx.save();
        ctx.lineCap = 'round';
        for (const c of sim.cracks) {
          const a = U.clamp(1.4 - c.age, 0, 1) * 0.55;
          if (a <= 0) continue;
          ctx.strokeStyle = `rgba(60,35,20,${a})`;
          ctx.lineWidth = 1.8;
          ctx.beginPath(); ctx.moveTo(c.x0, c.y0); ctx.lineTo(c.x1, c.y1); ctx.stroke();
        }
        ctx.restore();
      }

      this._stickers(ctx, sim, time, fingers);
    },

    _texture(ctx, sim, time) {
      const mat = sim.mat, P = sim.particles;
      switch (mat.texture) {
        case 'grain': // kinetic sand: speckles
          ctx.fillStyle = 'rgba(120,90,55,0.22)';
          for (let i = 0; i < P.length; i++) {
            const p = P[i];
            const ox = Math.sin(i * 12.9) * 6, oy = Math.cos(i * 7.7) * 6;
            ctx.fillRect(p.x + ox, p.y + oy, 1.6, 1.6);
            ctx.fillRect(p.x - oy, p.y + ox, 1.4, 1.4);
          }
          break;
        case 'dust': // mochi/bread flour dusting
          ctx.fillStyle = 'rgba(255,255,255,0.10)';
          for (let i = 0; i < P.length; i += 2) {
            const p = P[i];
            ctx.beginPath();
            ctx.arc(p.x + Math.sin(i * 5.1) * 5, p.y + Math.cos(i * 3.3) * 5, 4.5, 0, 7);
            ctx.fill();
          }
          break;
        case 'crumb': // cookie dough: darker crumbs / choc chips
          for (let i = 0; i < P.length; i += 3) {
            const p = P[i];
            ctx.fillStyle = i % 6 ? 'rgba(120,70,30,0.35)' : 'rgba(70,40,20,0.5)';
            ctx.beginPath();
            ctx.arc(p.x + Math.sin(i * 9.4) * 5, p.y + Math.cos(i * 6.1) * 5, 2.4, 0, 7);
            ctx.fill();
          }
          break;
        case 'bubbly': // foam: bubble rims
          ctx.strokeStyle = 'rgba(255,255,255,0.5)';
          ctx.lineWidth = 1.2;
          for (let i = 0; i < P.length; i++) {
            const p = P[i];
            const r = 3 + (i % 5) + p.air * 4;
            ctx.beginPath();
            ctx.arc(p.x + Math.sin(i * 4.2 + time) * 2, p.y + Math.cos(i * 5.6 + time * 0.7) * 2, r, 0, 7);
            ctx.stroke();
          }
          break;
        case 'fluff': // cream/marshmallow: soft white blotches
          ctx.fillStyle = 'rgba(255,255,255,0.14)';
          for (let i = 0; i < P.length; i += 2) {
            const p = P[i];
            ctx.beginPath();
            ctx.arc(p.x + Math.sin(i * 3.7 + time * 0.5) * 3, p.y + Math.cos(i * 2.9) * 3, 7, 0, 7);
            ctx.fill();
          }
          break;
      }
    },

    _stickers(ctx, sim, time, fingers) {
      for (const st of sim.stickers) {
        const p = st.p;
        if (!p) continue;
        const x = p.x + st.dx, y = p.y + st.dy;
        const speed = U.len(p.x - p.px, p.y - p.py);
        ctx.save();
        ctx.translate(x, y);
        if (st.type === 'eye') {
          // blink cycle + look toward the nearest finger
          const blink = (Math.sin(time * 0.9 + st.seed * 9) > 0.985) ? 0.12 : 1;
          const squash = U.clamp(1 - speed * 0.03, 0.55, 1);
          let lx = 0, ly = 0, best = 1e9;
          if (fingers) for (const f of fingers) {
            if (!f.down) continue;
            const d = U.dist(f.x, f.y, x, y);
            if (d < best) { best = d; lx = (f.x - x) / (d + 1); ly = (f.y - y) / (d + 1); }
          }
          ctx.scale(1, blink * squash);
          ctx.fillStyle = '#fff';
          ctx.strokeStyle = 'rgba(60,50,45,0.75)';
          ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.arc(0, 0, st.s, 0, 7); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#3a3230';
          ctx.beginPath(); ctx.arc(lx * st.s * 0.38, ly * st.s * 0.38, st.s * 0.45, 0, 7); ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.beginPath(); ctx.arc(lx * st.s * 0.38 - st.s * 0.14, ly * st.s * 0.38 - st.s * 0.16, st.s * 0.14, 0, 7); ctx.fill();
        } else {
          ctx.rotate(st.rot + Math.sin(time * 2 + st.seed * 7) * 0.08);
          const s = st.s;
          if (st.type === 'star') {
            ctx.fillStyle = '#ffd34d'; ctx.strokeStyle = 'rgba(200,140,0,0.6)';
            this._starPath(ctx, s); ctx.fill(); ctx.lineWidth = 1.4; ctx.stroke();
          } else if (st.type === 'heart') {
            ctx.fillStyle = '#ff7fa5'; ctx.strokeStyle = 'rgba(200,60,110,0.6)';
            this._heartPath(ctx, s); ctx.fill(); ctx.lineWidth = 1.4; ctx.stroke();
          } else { // flower
            ctx.fillStyle = '#c9a0ff';
            for (let k = 0; k < 5; k++) {
              const a = (k / 5) * Math.PI * 2;
              ctx.beginPath(); ctx.arc(Math.cos(a) * s * 0.55, Math.sin(a) * s * 0.55, s * 0.42, 0, 7); ctx.fill();
            }
            ctx.fillStyle = '#ffe066';
            ctx.beginPath(); ctx.arc(0, 0, s * 0.34, 0, 7); ctx.fill();
          }
        }
        ctx.restore();
      }
    },

    _starPath(ctx, s) {
      ctx.beginPath();
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
        const r = k % 2 ? s * 0.45 : s;
        ctx[k ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
    },

    _heartPath(ctx, s) {
      ctx.beginPath();
      ctx.moveTo(0, s * 0.75);
      ctx.bezierCurveTo(-s * 1.35, -s * 0.15, -s * 0.55, -s * 1.05, 0, -s * 0.35);
      ctx.bezierCurveTo(s * 0.55, -s * 1.05, s * 1.35, -s * 0.15, 0, s * 0.75);
      ctx.closePath();
    },
  };

  YL.Render = Render;
})();
