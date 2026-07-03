/* やわらかラボ — multi-touch input. Pointer events -> fingers map. */
(function () {
  'use strict';

  const Input = {
    fingers: new Map(), // id -> {id,x,y,px,py,down,justDown,justUp,mode}
    _el: null,

    init(el) {
      this._el = el;
      const pos = (e) => {
        const r = el.getBoundingClientRect();
        return [e.clientX - r.left, e.clientY - r.top];
      };
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        el.setPointerCapture && el.setPointerCapture(e.pointerId);
        const [x, y] = pos(e);
        this.fingers.set(e.pointerId, {
          id: e.pointerId, x, y, px: x, py: y,
          down: true, justDown: true, justUp: false, mode: 'hand',
          downX: x, downY: y, downT: performance.now(),
        });
      }, { passive: false });
      el.addEventListener('pointermove', (e) => {
        const f = this.fingers.get(e.pointerId);
        if (!f || !f.down) return;
        e.preventDefault();
        const [x, y] = pos(e);
        f.x = x; f.y = y;
      }, { passive: false });
      const up = (e) => {
        const f = this.fingers.get(e.pointerId);
        if (!f) return;
        f.down = false; f.justUp = true;
      };
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('pointerleave', up);
      // block iOS gestures / double-tap zoom on the stage
      el.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
      document.addEventListener('gesturestart', (e) => e.preventDefault());
    },

    // call once per frame AFTER consumers read the state
    endFrame() {
      for (const [id, f] of this.fingers) {
        f.justDown = false;
        if (f.justUp) { this.fingers.delete(id); continue; }
        f.px = f.x; f.py = f.y;
      }
    },
  };

  YL.Input = Input;
})();
