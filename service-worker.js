// service-worker.js

const CACHE_NAME = 'longani-cache-v3'; // Updated cache name for version 0.9.0
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/index.tsx',
  '/App.tsx',
  '/services/geminiService.ts',
  '/components/Header.tsx',
  '/components/FileUpload.tsx',
  '/components/TranscriptDisplay.tsx',
  '/components/Loader.tsx',
  '/components/Icons.tsx',
  '/components/ProgressBar.tsx',
  '/utils/audioUtils.ts',
  '/components/ThemeSwitcher.tsx',
];

// Install event: open a cache and add the core app shell files to it.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('Service Worker: Caching failed during install', err);
      })
  );
});

// Activate event: clean up old caches.
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event: Implements a "Stale-While-Revalidate" strategy.
// This serves content from cache immediately for speed and offline reliability,
// then updates the cache with a fresh version from the network in the background.
self.addEventListener('fetch', (event) => {
  // We only want to handle GET requests.
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
      return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          // If the fetch is successful, update the cache with the new response.
          if (networkResponse && (networkResponse.status === 200 || networkResponse.status === 0)) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(err => {
            console.error('Service Worker: Network fetch failed.', err);
            // When network fails, we've already returned the cached response (if available).
            // If there was no cached response, the promise will reject, and the browser will show its offline error page.
            // This is acceptable as we can't fulfill a request for a resource we've never seen before while offline.
        });

        // Return the cached response immediately if available, otherwise wait for the network response.
        return cachedResponse || fetchPromise;
      });
    })
  );
});