// Service Worker for Write Frankly (PWA)
const CACHE_NAME = 'frankly-cache-v1';

const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-192.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
];

// Install: Precache shell & offline fallback
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn('[SW] Precache partial error (non-fatal):', err);
      });
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate: Claim clients & purge old cache generations
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch: Smart routing with strict API & Auth bypass
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests and http/https schemes
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // 1. CRITICAL BYPASS: All Next.js server API routes (/api/*)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // 2. CRITICAL BYPASS: Firebase Auth, Firestore, Google APIs, and telemetry
  const bypassHosts = [
    'identitytoolkit.googleapis.com',
    'securetoken.googleapis.com',
    'firestore.googleapis.com',
    'firebase.googleapis.com',
    'firebaseinstallations.googleapis.com',
    'accounts.google.com',
    'apis.google.com',
    'alkalimakersuite-pa.clients6.google.com',
    'lh3.googleusercontent.com', // User profile avatars
  ];

  if (bypassHosts.some((host) => url.hostname.includes(host))) {
    return;
  }

  // 3. Navigation Requests (Page navigations)
  // Strategy: Network-first with cache fallback, then offline.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // If valid response, update the '/' cached shell
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put('/', responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // Offline fallback
          const cache = await caches.open(CACHE_NAME);
          const cachedRoot = await cache.match('/');
          if (cachedRoot) {
            return cachedRoot;
          }
          const cachedOffline = await cache.match('/offline.html');
          if (cachedOffline) {
            return cachedOffline;
          }
          return new Response('Offline - Write Frankly', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' },
          });
        })
    );
    return;
  }

  // 4. Static Assets & Next.js Bundles (_next/static, fonts, icons, images)
  // Strategy: Stale-While-Revalidate
  const isStaticAsset =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/_next/image') ||
    /\.(png|jpg|jpeg|svg|gif|ico|webp|woff|woff2|ttf|css|js)$/i.test(url.pathname);

  if (isStaticAsset) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request);

        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Default: Network with cache fallback
  event.respondWith(
    fetch(request).catch(async () => {
      const cache = await caches.open(CACHE_NAME);
      return cache.match(request);
    })
  );
});
