import {
  isAlreadyInstalled,
  isInstallAvailable,
  onInstallAvailabilityChange,
  triggerInstallPrompt,
} from '../utils/install-prompt.js';
import { injectStyle } from '../utils/inject-style.js';

injectStyle('install-banner', `
  .install-banner {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    gap: var(--sp-sm);
    padding: var(--sp-sm) var(--sp-md);
    background: var(--color-pitch-shadow);
    color: var(--color-summit-white);
    transform: translateY(100%);
    transition: transform var(--dur-base) var(--ease-standard);
    box-shadow: 0 -2px 12px rgba(0,0,0,0.2);
  }

  .install-banner--visible { transform: translateY(0); }

  .install-banner__icon { width: 36px; height: 36px; border-radius: 8px; flex-shrink: 0; }

  .install-banner__text { flex: 1; min-width: 0; font-size: var(--fs-sm); line-height: 1.3; }

  .install-banner__actions { display: flex; align-items: center; gap: var(--sp-2xs); flex-shrink: 0; }

  .install-banner__install-btn {
    background: var(--color-ridge-green);
    color: var(--color-summit-white);
    padding: var(--sp-2xs) var(--sp-sm);
    border-radius: var(--radius-sm);
    font-size: var(--fs-sm);
    font-weight: 600;
    white-space: nowrap;
  }

  .install-banner__dismiss-btn {
    background: transparent;
    color: rgba(247,249,246,0.6);
    font-size: 20px;
    line-height: 1;
    padding: 0 var(--sp-2xs);
  }

  @media (min-width: 640px) {
    .install-banner {
      left: auto;
      right: var(--sp-md);
      bottom: var(--sp-md);
      border-radius: var(--radius-md);
      max-width: 380px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .install-banner { transition: none; }
  }
`);

const DISMISS_COOLDOWN_MS = 10 * 24 * 60 * 60 * 1000; // 10 days
const SHOW_DELAY_MS = 3000; // brief delay before showing, not instant

export function initInstallBanner() {
  if (isAlreadyInstalled()) return;

  // Once per qualifying visit — sessionStorage clears itself when the
  // tab/browser session ends, so this naturally resets per visit.
  if (sessionStorage.getItem('maguje_install_banner_shown')) return;

  const dismissedAt = Number(localStorage.getItem('maguje_install_banner_dismissed_at') || 0);
  if (Date.now() - dismissedAt < DISMISS_COOLDOWN_MS) return;

  function tryShow() {
    if (!isInstallAvailable()) return;
    setTimeout(show, SHOW_DELAY_MS);
  }

  if (isInstallAvailable()) {
    tryShow();
  } else {
    // beforeinstallprompt can fire after initial load — stay ready
    // for it rather than only checking once at boot.
    onInstallAvailabilityChange((available) => {
      if (available) tryShow();
    });
  }
}

function show() {
  if (isAlreadyInstalled()) return;
  if (document.querySelector('.install-banner')) return;

  sessionStorage.setItem('maguje_install_banner_shown', 'true');

  const banner = document.createElement('div');
  banner.className = 'install-banner';
  banner.innerHTML = `
    <img src="/assets/icons/icon-192.png" alt="" class="install-banner__icon">
    <span class="install-banner__text">Install Maguje FC for quick access, even offline.</span>
    <div class="install-banner__actions">
      <button type="button" class="install-banner__install-btn" data-install>Install</button>
      <button type="button" class="install-banner__dismiss-btn" data-dismiss aria-label="Dismiss">×</button>
    </div>
  `;

  document.body.appendChild(banner);
  requestAnimationFrame(() => banner.classList.add('install-banner--visible'));

  banner.querySelector('[data-install]').addEventListener('click', async () => {
    await triggerInstallPrompt();
    hide(banner);
  });

  banner.querySelector('[data-dismiss]').addEventListener('click', () => {
    localStorage.setItem('maguje_install_banner_dismissed_at', String(Date.now()));
    hide(banner);
  });
}

function hide(banner) {
  banner.classList.remove('install-banner--visible');
  setTimeout(() => banner.remove(), 300);
}
