import { injectStyle } from '../utils/inject-style.js';

injectStyle('controls', `
  .tabs { display: flex; gap: var(--sp-md); border-bottom: 1px solid var(--color-line); overflow-x: auto; }
  .tab { font-size: var(--fs-sm); font-weight: 600; white-space: nowrap; padding-block: var(--sp-xs); border-bottom: 2px solid transparent; color: rgba(16,36,26,0.6); }
  .tab--active { color: var(--color-ridge-green); border-bottom-color: var(--color-ridge-green); }
  .dropdown { position: relative; display: inline-block; }
  .dropdown__trigger { display: flex; align-items: center; gap: var(--sp-2xs); border: 1px solid var(--color-line); border-radius: var(--radius-sm); padding: var(--sp-2xs) var(--sp-sm); font-size: var(--fs-sm); font-weight: 600; background: var(--color-summit-white); }
  .dropdown__trigger::after { content: '▾'; font-size: 0.7em; color: rgba(16,36,26,0.5); }
  .dropdown__menu { position: absolute; top: calc(100% + 4px); left: 0; min-width: 100%; background: var(--color-summit-white); border: 1px solid var(--color-line); border-radius: var(--radius-sm); box-shadow: 0 4px 16px rgba(11,31,20,0.12); z-index: var(--z-nav); opacity: 0; visibility: hidden; transform: translateY(-4px); transition: opacity var(--dur-fast) var(--ease-standard), transform var(--dur-fast) var(--ease-standard); }
  .dropdown__menu--open { opacity: 1; visibility: visible; transform: translateY(0); }
  .dropdown__item { display: block; width: 100%; text-align: left; padding: var(--sp-2xs) var(--sp-sm); font-size: var(--fs-sm); white-space: nowrap; }
  .dropdown__item:hover { background: rgba(31,107,58,0.06); }
  .dropdown__item--active { color: var(--color-ridge-green); font-weight: 700; }
  .filter-bar { display: flex; flex-wrap: wrap; gap: var(--sp-2xs); }
  .filter-chip { font-size: var(--fs-xs); font-weight: 600; padding: var(--sp-3xs) var(--sp-sm); border-radius: 999px; border: 1px solid var(--color-line); color: var(--color-ink); transition: background var(--dur-fast) var(--ease-standard), border-color var(--dur-fast) var(--ease-standard); }
  .filter-chip--active { background: var(--color-ridge-green); border-color: var(--color-ridge-green); color: var(--color-summit-white); }
  .search-box { position: relative; }
  .search-box__input { width: 100%; padding: var(--sp-xs) var(--sp-sm) var(--sp-xs) var(--sp-lg); border: 1px solid var(--color-line); border-radius: var(--radius-md); font-size: var(--fs-md); background: var(--color-summit-white); }
  .search-box__input:focus { border-color: var(--color-ridge-green); }
  .search-box__icon { position: absolute; left: var(--sp-xs); top: 50%; transform: translateY(-50%); width: 16px; height: 16px; border: 2px solid rgba(16,36,26,0.4); border-radius: 50%; }
  .search-box__icon::after { content: ''; position: absolute; width: 7px; height: 2px; background: rgba(16,36,26,0.4); bottom: -5px; right: -6px; transform: rotate(45deg); }
  .modal-backdrop { position: fixed; inset: 0; background: rgba(11,31,20,0.6); z-index: var(--z-modal); display: flex; align-items: center; justify-content: center; padding: var(--sp-md); opacity: 0; transition: opacity var(--dur-base) var(--ease-standard); }
  .modal-backdrop--open { opacity: 1; }
  .modal { background: var(--color-summit-white); border-radius: var(--radius-lg); max-width: 480px; width: 100%; max-height: 85vh; overflow-y: auto; padding: var(--sp-lg); transform: scale(0.95); transition: transform var(--dur-base) var(--ease-standard); position: relative; }
  .modal-backdrop--open .modal { transform: scale(1); }
  .modal__close { position: absolute; top: var(--sp-sm); right: var(--sp-sm); width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: var(--fs-md); color: var(--color-ink); }
  .modal__close:hover { background: var(--color-line); }
  .share-bar { display: flex; align-items: center; gap: var(--sp-2xs); }
  .share-btn { width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--color-line); display: flex; align-items: center; justify-content: center; font-size: var(--fs-xs); font-weight: 700; transition: border-color var(--dur-fast) var(--ease-standard); }
  .share-btn:hover { border-color: var(--color-ridge-green); color: var(--color-ridge-green); }
  .toast-container { position: fixed; bottom: var(--sp-md); left: 50%; transform: translateX(-50%); z-index: var(--z-toast); display: flex; flex-direction: column; gap: var(--sp-2xs); width: min(360px, 90vw); }
  .toast { background: var(--color-pitch-shadow); color: var(--color-summit-white); border-radius: var(--radius-md); padding: var(--sp-sm) var(--sp-md); font-size: var(--fs-sm); box-shadow: 0 4px 16px rgba(11,31,20,0.25); opacity: 0; transform: translateY(8px); transition: opacity var(--dur-base) var(--ease-standard), transform var(--dur-base) var(--ease-standard); }
  .toast--visible { opacity: 1; transform: translateY(0); }
  .countdown { display: flex; gap: var(--sp-sm); }
  .countdown__unit { display: flex; flex-direction: column; align-items: center; }
  .countdown__value { font-family: var(--font-mono); font-size: var(--fs-lg); font-weight: 700; color: var(--color-ridge-green); }
  .countdown__label { font-size: var(--fs-xs); color: rgba(16,36,26,0.5); text-transform: uppercase; }
  .live-indicator { display: inline-flex; align-items: center; gap: 5px; font-family: var(--font-mono); font-size: var(--fs-xs); font-weight: 700; text-transform: uppercase; color: var(--color-live); }
  .live-indicator__dot { width: 6px; height: 6px; border-radius: 50%; background: var(--color-live); animation: live-pulse 1.2s ease-in-out infinite; }
  @keyframes live-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
  @media (prefers-reduced-motion: reduce) { .live-indicator__dot { animation: none; } }
`);

export function tabs(items) {
  return `<div class="tabs" role="tablist">${items.map(t => `<button type="button" class="tab ${t.active ? 'tab--active' : ''}" role="tab" data-tab-id="${t.id}" aria-selected="${!!t.active}">${t.label}</button>`).join('')}</div>`;
}

export function dropdown(triggerLabel, items, { id = 'dropdown' } = {}) {
  return `
    <div class="dropdown" data-dropdown="${id}">
      <button type="button" class="dropdown__trigger" data-dropdown-trigger aria-expanded="false">${triggerLabel}</button>
      <div class="dropdown__menu" data-dropdown-menu role="menu">${items.map(i => `<button type="button" class="dropdown__item ${i.active ? 'dropdown__item--active' : ''}" data-value="${i.value}" role="menuitem">${i.label}</button>`).join('')}</div>
    </div>`;
}

export function bindDropdown(container, id, onSelect) {
  const root = container.querySelector(`[data-dropdown="${id}"]`);
  if (!root) return;
  const trigger = root.querySelector('[data-dropdown-trigger]');
  const menu = root.querySelector('[data-dropdown-menu]');
  const close = () => { menu.classList.remove('dropdown__menu--open'); trigger.setAttribute('aria-expanded', 'false'); document.removeEventListener('click', outsideClick); };
  const outsideClick = (e) => { if (!root.contains(e.target)) close(); };
  trigger.addEventListener('click', () => {
    const isOpen = menu.classList.toggle('dropdown__menu--open');
    trigger.setAttribute('aria-expanded', String(isOpen));
    if (isOpen) document.addEventListener('click', outsideClick);
  });
  root.querySelectorAll('.dropdown__item').forEach(item => item.addEventListener('click', () => { onSelect(item.dataset.value); close(); }));
}

export function filterBar(items) {
  return `<div class="filter-bar" role="group">${items.map(i => `<button type="button" class="filter-chip ${i.active ? 'filter-chip--active' : ''}" data-value="${i.value}">${i.label}</button>`).join('')}</div>`;
}

export function bindFilterBar(container, onSelect) {
  container.querySelectorAll('.filter-chip').forEach(chip => chip.addEventListener('click', () => onSelect(chip.dataset.value)));
}

export function searchBox({ placeholder = 'Search Maguje FC…', value = '' } = {}) {
  return `<div class="search-box"><span class="search-box__icon" aria-hidden="true"></span><input type="search" class="search-box__input" placeholder="${placeholder}" value="${value}" data-search-input></div>`;
}

export function bindSearchBox(container, onQuery, { debounceMs = 300 } = {}) {
  const input = container.querySelector('[data-search-input]');
  if (!input) return;
  let timer;
  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => onQuery(input.value.trim()), debounceMs); });
}

let modalRoot = null;
function ensureModalRoot() { if (modalRoot) return modalRoot; modalRoot = document.createElement('div'); document.body.appendChild(modalRoot); return modalRoot; }

export function openModal(contentHtml) {
  const root = ensureModalRoot();
  root.innerHTML = `<div class="modal-backdrop" data-modal-backdrop><div class="modal" role="dialog" aria-modal="true"><button type="button" class="modal__close" data-modal-close aria-label="Close">×</button>${contentHtml}</div></div>`;
  const backdrop = root.querySelector('[data-modal-backdrop]');
  requestAnimationFrame(() => backdrop.classList.add('modal-backdrop--open'));
  const close = () => closeModal();
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  root.querySelector('[data-modal-close]').addEventListener('click', close);
  document.addEventListener('keydown', escHandler);
  function escHandler(e) { if (e.key === 'Escape') close(); }
  function closeModal() { backdrop.classList.remove('modal-backdrop--open'); document.removeEventListener('keydown', escHandler); setTimeout(() => { root.innerHTML = ''; }, 250); }
}

export function shareBar(url, title) {
  return `
    <div class="share-bar">
      <button type="button" class="share-btn" data-copy-link="${url}" aria-label="Copy link">🔗</button>
      <a class="share-btn" href="https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}" data-external target="_blank" rel="noopener noreferrer" aria-label="Share on WhatsApp">W</a>
      <a class="share-btn" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}" data-external target="_blank" rel="noopener noreferrer" aria-label="Share on Facebook">F</a>
    </div>`;
}

export function bindShareBar(container) {
  container.querySelectorAll('[data-copy-link]').forEach(btn => {
    btn.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(btn.dataset.copyLink); showToast('Link copied'); }
      catch { showToast('Could not copy link'); }
    });
  });
}

let toastContainer = null;
function ensureToastContainer() { if (toastContainer) return toastContainer; toastContainer = document.createElement('div'); toastContainer.className = 'toast-container'; document.body.appendChild(toastContainer); return toastContainer; }

export function showToast(message, { duration = 3000 } = {}) {
  const container = ensureToastContainer();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast--visible'));
  setTimeout(() => { toast.classList.remove('toast--visible'); setTimeout(() => toast.remove(), 250); }, duration);
}

export function countdown(targetIso, { id = 'countdown' } = {}) {
  return `<div class="countdown" data-countdown="${id}" data-target="${targetIso}"></div>`;
}

export function startCountdown(container, id) {
  const el = container.querySelector(`[data-countdown="${id}"]`);
  if (!el) return () => {};
  const target = new Date(el.dataset.target).getTime();
  function tick() {
    const diff = Math.max(0, target - Date.now());
    const d = Math.floor(diff / 86400000); const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000); const s = Math.floor((diff % 60000) / 1000);
    el.innerHTML = [{v:d,l:'Days'},{v:h,l:'Hrs'},{v:m,l:'Min'},{v:s,l:'Sec'}].map(u => `<div class="countdown__unit"><span class="countdown__value">${u.v}</span><span class="countdown__label">${u.l}</span></div>`).join('');
  }
  tick();
  const intervalId = setInterval(tick, 1000);
  return () => clearInterval(intervalId);
}

export function liveIndicator(label = 'Live') { return `<span class="live-indicator"><span class="live-indicator__dot"></span>${label}</span>`; }
