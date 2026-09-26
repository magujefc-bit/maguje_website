import {
  resolveAccountType,
  getCachedAccountType,
  touchActivity,
  getIdleLimit,
  logout,
  IDLE_KEY,
} from './auth.js';

const ACTIVITY_EVENTS = ['click', 'keydown', 'scroll', 'touchstart'];
const CHECK_INTERVAL_MS = 30 * 1000;   // how often we check for expiry
const TOUCH_THROTTLE_MS = 60 * 1000;   // don't write activity more than once a minute

let lastTouch = 0;

function throttledTouch() {
  const now = Date.now();
  if (now - lastTouch < TOUCH_THROTTLE_MS) return;
  lastTouch = now;
  touchActivity();
}

async function checkIdle() {
  const accountType = getCachedAccountType();
  if (!accountType) return; // not logged in — nothing to expire

  const last = Number(localStorage.getItem(IDLE_KEY) || Date.now());
  const limit = getIdleLimit(accountType);

  if (Date.now() - last > limit) {
    // Admin: hard redirect, since Logout only lives in one nav slot now
    // and a stale dashboard tab shouldn't sit there looking alive.
    // Supporter: quiet — just drop to logged-out state in place.
    await logout({ redirect: accountType === 'admin' });
  }
}

/**
 * Call once at app boot (from main.js). Resolves the current session's
 * account type, starts activity tracking, and begins the idle-expiry
 * check. Works identically on public pages and in the dashboard, since
 * there's one shared session either way.
 */
export async function initSessionGuard() {
  await resolveAccountType();
  throttledTouch();

  ACTIVITY_EVENTS.forEach((evt) =>
    document.addEventListener(evt, throttledTouch, { passive: true }),
  );
  document.addEventListener('route:after', throttledTouch);

  setInterval(checkIdle, CHECK_INTERVAL_MS);
}

