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

// Fetch event: Implements a robust strategy for both navigation and asset requests.
self.addEventListener('fetch', (event) => {
  // We only want to handle GET requests.
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
      return;
  }

  // For navigation requests, serve the main HTML file from the cache.
  // This is a "cache-first" strategy for the app shell, making it load fast and work offline.
  // It also prevents 404 errors for non-existent paths by always serving the main page.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then((response) => {
        // Return the cached index.html, or fetch from network if it's not in the cache for some reason.
        return response || fetch(event.request);
      })
    );
    return;
  }

  // For all other requests (assets like scripts, styles), use a "stale-while-revalidate" strategy.
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          // If the fetch is successful, update the cache with the new response.
          // We only cache successful responses to avoid caching errors.
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(err => {
            console.error('Service Worker: Network fetch failed for asset:', event.request.url, err);
            // This catch is for network errors. The browser will handle the failed asset request
            // if there was no cached response.
        });

        // Return the cached response immediately if available, otherwise wait for the network response.
        return cachedResponse || fetchPromise;
      });
    })
  );
});