// sw.js — kept deliberately conservative. This is a content-driven SPA
// (fixtures, news, live scores), so a network-first strategy is used
// everywhere: always try the network first, cache the result for
// offline fallback only, and never let stale cached data outrank a
// fresh response. Supabase requests are never intercepted at all —
// live data always goes straight to the network.

const CACHE_NAME = 'maguje-fc-v1';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/maguje-crest.png',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
      ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle simple GETs on our own origin. Supabase API/storage
  // calls, POSTs, and cross-origin requests always go straight through
  // untouched — this service worker never touches live app data.
  if (request.method !== 'GET' || request.url.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => cached || caches.match('/index.html')),
      ),
  );
});
