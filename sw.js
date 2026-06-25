const CACHE_NAME = 'cardvark-v8';
const ASSETS = [
  '/',
  '/index.html',
  '/install.html',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      ))
      // Take control of already-open pages immediately so the update applies
      // without requiring every tab/PWA window to be closed first.
      .then(() => self.clients.claim())
  );
});

// Network-first for GET requests: always serve fresh content when online, fall
// back to cache only when offline. A cache-first strategy used to mask deploys
// (e.g. a fixed model ID) by serving a stale index.html indefinitely. Non-GET
// requests (the Claude API proxy POST) are left to the network untouched.
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  event.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req))
  );
});
