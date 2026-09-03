// 形いろあつめ - Minimal Service Worker (offline-first app shell)
// v2: HTML navigations are now network-first so a redeployed index.html
// is always picked up immediately instead of being stuck behind a stale
// cached copy. Other static assets (icons, manifest) stay cache-first
// with a background refresh for speed + offline support.
const CACHE_NAME = 'katairo-atsume-cache-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // HTML page loads: always try the network first so updates deploy
  // immediately. Only fall back to the cached shell when offline.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            try { cache.put(event.request, copy); } catch (e) {}
          });
          return response;
        })
        .catch(() =>
          caches.match(event.request).then((cached) => cached || caches.match('./index.html'))
        )
    );
    return;
  }

  // Other static assets (icons, manifest, fonts, etc.): serve from cache
  // instantly if present, and refresh the cache in the background.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            try { cache.put(event.request, copy); } catch (e) {}
          });
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
