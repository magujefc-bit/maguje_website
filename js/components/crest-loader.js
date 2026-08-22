import { injectStyle } from '../utils/inject-style.js';

injectStyle('crest-loader-inline', ``);

const MIN_DISPLAY_MS = 500;

class CrestLoader {
  constructor(rootSelector = '#crest-loader') {
    this.root = document.querySelector(rootSelector);
    this._shownAt = null;
  }

  show() {
    if (!this.root) return;
    this.root.innerHTML = this._template();
    this.root.hidden = false;
    this._shownAt = performance.now();
  }

  async hide() {
    if (!this.root || this.root.hidden) return;
    const elapsed = performance.now() - (this._shownAt || 0);
    const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);
    if (remaining > 0) await new Promise(res => setTimeout(res, remaining));
    this.root.classList.add('crest-loader--exit');
    await new Promise(res => setTimeout(res, 400));
    this.root.hidden = true;
    this.root.innerHTML = '';
  }

  _template() {
    return `
      <div class="crest-loader__inner">
        <img src="/assets/maguje-crest.png" alt="Maguje FC" class="crest-loader__crest" width="88" height="88">
        <div class="crest-loader__bar" aria-hidden="true"><div class="crest-loader__bar-fill"></div></div>
        <span class="visually-hidden" role="status">Loading Maguje FC</span>
      </div>`;
  }
}

export const crestLoader = new CrestLoader('#crest-loader');
