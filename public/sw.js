// Bump this version whenever caching behaviour changes; old caches are deleted on activate.
const CACHE_NAME = 'cricket-live-cache-v7';
const ASSETS = [
  '/cricket-scoreboard/',
  '/cricket-scoreboard/index.html',
  '/cricket-scoreboard/404.html',
  '/cricket-scoreboard/cricket-favicon.svg',
  '/cricket-scoreboard/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' })))
    )
  );
  // Take over from an older worker immediately instead of waiting for all tabs to close.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// Network-first: always try to get the latest deploy, fall back to cache when offline.
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
    return;
  }
  // Pages (HTML) revalidate with the server so a new deploy is never hidden by the
  // browser's HTTP cache; hashed assets can use the normal HTTP cache.
  const fresh = request.mode === 'navigate' ? fetch(request, { cache: 'no-cache' }) : fetch(request);
  event.respondWith(
    fresh
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
