// Bump CACHE_NAME on every shape change to force old caches to be purged.
const CACHE_NAME = 'vita-v3';
const STATIC_ASSETS = [
  '/manifest.json',
];

// Install: cache a tiny set of fully-static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  let url;
  try { url = new URL(request.url); } catch { return; }

  // Same-origin only — never intercept third-party requests.
  if (url.origin !== self.location.origin) return;

  // Never intercept Next.js build output, server actions, API routes, RSC payloads,
  // or HMR/Turbopack assets. These must always go straight to the network so a
  // redeploy with new chunk hashes can't be served stale from the cache.
  if (
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/api/') ||
    url.search.includes('_rsc=') ||
    url.search.includes('__nextjs_')
  ) {
    return;
  }

  // Navigation: network-only, no caching. We don't want to serve a stale HTML
  // doc that still references chunk hashes from a previous deploy.
  if (request.mode === 'navigate') {
    return;
  }

  // Other same-origin GETs (icons, manifest, public images): cache-first.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => cached);
    })
  );
});

// Push: show notification
self.addEventListener('push', (event) => {
  let data = { title: 'Vita', body: 'You have a new message.' };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (_) {
    // ignore parse errors
  }

  const { title, body, ...options } = data;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      ...options,
    })
  );
});

// Notification click: focus existing window or open /today
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url && 'focus' in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow('/today');
        }
      })
  );
});
