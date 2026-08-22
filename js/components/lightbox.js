import { injectStyle } from '../utils/inject-style.js';

injectStyle('lightbox', `
  .lightbox-backdrop { position: fixed; inset: 0; z-index: var(--z-modal); background: rgba(11,31,20,0.92); display: flex; align-items: center; justify-content: center; padding: var(--sp-md); opacity: 0; transition: opacity var(--dur-base) var(--ease-standard); }
  .lightbox-backdrop--open { opacity: 1; }
  .lightbox-image-wrap { max-width: min(90vw, 1000px); max-height: 80vh; display: flex; flex-direction: column; align-items: center; gap: var(--sp-sm); }
  .lightbox-image { max-width: 100%; max-height: 70vh; object-fit: contain; border-radius: var(--radius-md); }
  .lightbox-caption { color: var(--color-summit-white); font-size: var(--fs-sm); text-align: center; }
  .lightbox-close { position: absolute; top: var(--sp-md); right: var(--sp-md); width: 40px; height: 40px; border-radius: 50%; background: rgba(247,249,246,0.1); color: var(--color-summit-white); display: flex; align-items: center; justify-content: center; font-size: var(--fs-lg); }
  .lightbox-nav { position: absolute; top: 50%; transform: translateY(-50%); width: 44px; height: 44px; border-radius: 50%; background: rgba(247,249,246,0.1); color: var(--color-summit-white); display: flex; align-items: center; justify-content: center; font-size: var(--fs-lg); }
  .lightbox-nav--prev { left: var(--sp-md); } .lightbox-nav--next { right: var(--sp-md); }
  .lightbox-nav:hover, .lightbox-close:hover { background: rgba(247,249,246,0.2); }
`);

let lightboxRoot = null;
function ensureRoot() { if (lightboxRoot) return lightboxRoot; lightboxRoot = document.createElement('div'); document.body.appendChild(lightboxRoot); return lightboxRoot; }

export function openLightbox(items, startIndex = 0) {
  const root = ensureRoot();
  let index = startIndex;

  function render() {
    const item = items[index];
    root.innerHTML = `
      <div class="lightbox-backdrop" data-lightbox-backdrop>
        <button type="button" class="lightbox-close" data-lightbox-close aria-label="Close">×</button>
        ${items.length > 1 ? `<button type="button" class="lightbox-nav lightbox-nav--prev" data-lightbox-prev aria-label="Previous">‹</button>` : ''}
        <div class="lightbox-image-wrap">
          <img src="${item.fullUrl}" alt="${item.caption || ''}" class="lightbox-image">
          ${item.caption ? `<p class="lightbox-caption">${item.caption}</p>` : ''}
        </div>
        ${items.length > 1 ? `<button type="button" class="lightbox-nav lightbox-nav--next" data-lightbox-next aria-label="Next">›</button>` : ''}
      </div>`;
    const backdrop = root.querySelector('[data-lightbox-backdrop]');
    requestAnimationFrame(() => backdrop.classList.add('lightbox-backdrop--open'));
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
    root.querySelector('[data-lightbox-close]').addEventListener('click', close);
    root.querySelector('[data-lightbox-prev]')?.addEventListener('click', () => { index = (index - 1 + items.length) % items.length; render(); });
    root.querySelector('[data-lightbox-next]')?.addEventListener('click', () => { index = (index + 1) % items.length; render(); });
  }

  function keyHandler(e) {
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft' && items.length > 1) { index = (index - 1 + items.length) % items.length; render(); }
    if (e.key === 'ArrowRight' && items.length > 1) { index = (index + 1) % items.length; render(); }
  }

  function close() {
    const backdrop = root.querySelector('[data-lightbox-backdrop]');
    backdrop?.classList.remove('lightbox-backdrop--open');
    document.removeEventListener('keydown', keyHandler);
    setTimeout(() => { root.innerHTML = ''; }, 250);
  }

  document.addEventListener('keydown', keyHandler);
  render();
}
