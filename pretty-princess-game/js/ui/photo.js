// ふうけいカメラ(フォトモード): ポーズ・フィルター・PNG保存
import { audio } from '../core/audio.js';
import { $, $$ } from './ui.js';

const FILTERS = {
  none: '',
  dream: 'saturate(1.25) brightness(1.1) contrast(0.94)',
  retro: 'sepia(0.45) saturate(0.85) contrast(1.02)',
  vivid: 'saturate(1.75) contrast(1.12)',
  mono: 'grayscale(1) contrast(1.06)',
};

export class PhotoUI {
  constructor({ canvas, onPose, onShoot }) {
    this.canvas = canvas;
    this.filter = 'none';
    this.pose = 'stand';

    for (const btn of $$('.pose-btn')) {
      btn.addEventListener('click', () => {
        audio.se('click');
        this.pose = btn.dataset.pose;
        this._markActive('.pose-btn', btn);
        onPose(this.pose);
      });
    }
    for (const btn of $$('.filter-btn')) {
      btn.addEventListener('click', () => {
        audio.se('click');
        this.filter = btn.dataset.filter;
        this._markActive('.filter-btn', btn);
        this.canvas.style.filter = FILTERS[this.filter];
      });
    }
    $('#btn-photo-shoot').addEventListener('click', () => this.shoot(onShoot));
  }

  _markActive(sel, active) {
    for (const b of $$(sel)) b.classList.toggle('active', b === active);
  }

  reset() {
    this.filter = 'none';
    this.pose = 'stand';
    this.canvas.style.filter = '';
    this._markActive('.pose-btn', $$('.pose-btn')[0]);
    this._markActive('.filter-btn', $$('.filter-btn')[0]);
  }

  shoot(onShoot) {
    audio.se('camera');
    // フラッシュ演出
    const flash = document.createElement('div');
    flash.className = 'flash';
    document.getElementById('app').appendChild(flash);
    setTimeout(() => flash.remove(), 500);

    // フィルターを焼きこんでPNG保存
    const src = this.canvas;
    const out = document.createElement('canvas');
    out.width = src.width;
    out.height = src.height;
    const ctx = out.getContext('2d');
    ctx.filter = FILTERS[this.filter] || 'none';
    ctx.drawImage(src, 0, 0);
    out.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `princess-photo-${Date.now()}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }, 'image/png');
    onShoot();
  }
}
