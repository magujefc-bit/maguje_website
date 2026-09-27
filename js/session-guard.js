import {
  resolveAccountType,
  getCachedAccountType,
  touchActivity,
  getIdleLimit,
  logout,
  IDLE_KEY,
} from './auth.js';
import { supabase } from './supabase-client.js';

const ACTIVITY_EVENTS = ['click', 'keydown', 'scroll', 'touchstart'];
const CHECK_INTERVAL_MS = 30 * 1000;   // regular local tick while the tab is running
const TOUCH_THROTTLE_MS = 60 * 1000;   // don't write activity more than once a minute

let lastTouch = 0;

function throttledTouch() {
  const now = Date.now();
  if (now - lastTouch < TOUCH_THROTTLE_MS) return;
  lastTouch = now;
  touchActivity();
}

// Idle-expiry always sends everyone to the public home, whatever page
// they were on — an admin mid-dashboard or a supporter on a gated
// results page both just land on "/", logged out.
async function forceLogout() {
  await logout({ redirect: true });
}

// Fast, local-only check for the regular 30s tick while the tab is
// open and actually running. This alone can't catch a tab that was
// closed, backgrounded, or asleep for longer than its timers could
// run — that's what checkIdleAuthoritative() below is for.
async function checkIdleLocal() {
  const accountType = getCachedAccountType();
  if (!accountType) return;

  const last = Number(localStorage.getItem(IDLE_KEY) || Date.now());
  const limit = getIdleLimit(accountType);

  if (Date.now() - last > limit) {
    await forceLogout();
  }
}

// Authoritative check against the server's own record of last activity
// (user_activity table) rather than this device's localStorage. Run at
// app boot and whenever the page becomes visible again — that's the
// only moment code can run after the device/tab was asleep or
// backgrounded, so it's exactly when a missed expiry needs catching up.
async function checkIdleAuthoritative() {
  const accountType = getCachedAccountType();
  if (!accountType) return;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  const { data, error } = await supabase
    .from('user_activity')
    .select('last_active_at')
    .eq('id', session.user.id)
    .maybeSingle();

  if (error) {
    // Network hiccup — don't force a logout on our own failure to
    // check; the local tick will catch it on the next pass anyway.
    return;
  }

  const lastActive = data?.last_active_at
    ? new Date(data.last_active_at).getTime()
    : Date.now();
  const limit = getIdleLimit(accountType);

  if (Date.now() - lastActive > limit) {
    await forceLogout();
    return;
  }

  // Still within the window and the page is actually being looked at
  // again — refresh the clock (local + server) from here.
  touchActivity();
}

/**
 * Call once at app boot (from main.js). Works identically on the
 * public site and in the dashboard, since there's one shared session
 * either way.
 */
export async function initSessionGuard() {
  await resolveAccountType();

  // Authoritative check first — catches a tab reopened after days
  // away, or a fresh load after the device was asleep.
  await checkIdleAuthoritative();

  ACTIVITY_EVENTS.forEach((evt) =>
    document.addEventListener(evt, throttledTouch, { passive: true }),
  );
  document.addEventListener('route:after', throttledTouch);

  setInterval(checkIdleLocal, CHECK_INTERVAL_MS);

  // The moment the tab/device comes back from being backgrounded or
  // asleep is exactly when timers may have been suspended and missed
  // an expiry — re-check the instant it's visible again.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkIdleAuthoritative();
    }
  });
  window.addEventListener('focus', checkIdleAuthoritative);
}