var BASE = "/payout-delta";
const CACHE_NAME = 'payout-delta-v1';

const CORE_ASSETS = [
  BASE + '/',
  BASE + '/reverse-calculator/',
  BASE + '/split/',
  BASE + '/tax-clearance/',
  BASE + '/api/search-index.json',
  BASE + '/favicon.ico',
  BASE + '/api/fees.json',
  BASE + '/api/jurisdictions.json',
  BASE + '/api/rails.json',
  BASE + '/api/banksRegistry.json'
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // Handle URL fragment / query strip naturally in matching if needed, though match({ ignoreSearch: true }) handles query
  // Static assets (fonts, next/static, icons) -> Cache-First / Stale-While-Revalidate
  if (url.pathname.includes('/_next/static/') || url.pathname.endsWith('.svg') || url.pathname.endsWith('.woff2') || url.pathname.endsWith('.ico')) {
    event.respondWith(
      caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse.clone());
            });
          }
          return networkResponse;
        }).catch(() => {});
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Network-First falling back to Cache for navigation and HTML documents
  event.respondWith(
    fetch(event.request).then((networkResponse) => {
      if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
        const copy = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, copy);
        });
      }
      return networkResponse;
    }).catch(() => {
      return caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        if (event.request.mode === 'navigate') {
          return caches.match('/payout-delta/', { ignoreSearch: true });
        }
      });
    })
  );
});
