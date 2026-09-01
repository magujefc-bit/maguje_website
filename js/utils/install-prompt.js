import { supabase } from '../supabase-client.js';

// The browser's captured beforeinstallprompt event — not supported at
// all on iOS Safari, which is why every consumer of this module treats
// "prompt unavailable" as a normal case, not an error.
let deferredPrompt = null;
const availabilityListeners = [];

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  availabilityListeners.forEach((fn) => fn(true));
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  localStorage.setItem('maguje_pwa_installed', 'true');
  availabilityListeners.forEach((fn) => fn(false));
  logInstall();
});

export function isInstallAvailable() {
  return !!deferredPrompt;
}

export function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

export function isAlreadyInstalled() {
  return isStandalone() || localStorage.getItem('maguje_pwa_installed') === 'true';
}

export function onInstallAvailabilityChange(fn) {
  availabilityListeners.push(fn);
}

export async function triggerInstallPrompt() {
  if (!deferredPrompt) return false;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  return outcome === 'accepted';
}

// #25 — log real appinstalled events, guarded against duplicate
// logging with a stable per-device UUID kept in localStorage. The
// unique constraint on pwa_installs.device_id is a second line of
// defense server-side, in case localStorage ever gets cleared and
// the same device re-fires appinstalled.
async function logInstall() {
  let deviceId = localStorage.getItem('maguje_pwa_device_id');
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem('maguje_pwa_device_id', deviceId);
  }

  if (localStorage.getItem('maguje_pwa_install_logged') === deviceId) return;

  try {
    await supabase
      .from('pwa_installs')
      .upsert({ device_id: deviceId }, { onConflict: 'device_id', ignoreDuplicates: true });
    localStorage.setItem('maguje_pwa_install_logged', deviceId);
  } catch (err) {
    console.error('[install-prompt] failed to log install:', err);
  }
}
