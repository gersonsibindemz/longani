// service-worker.js

const CACHE_NAME = 'longani-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
  // Note: We are not caching external resources like fonts, images from postimg,
  // or scripts from esm.sh. The browser's standard HTTP cache will handle those.
  // This service worker focuses on making the core application shell available offline.
];

// Install event: open a cache and add the core app shell files to it.
self.addEventListener('install', (event) => {
  // Perform install steps.
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('Service Worker: Caching failed', err);
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

// Fetch event: serve app shell from cache, otherwise fetch from network.
self.addEventListener('fetch', (event) => {
  // This is a "Cache first, falling back to network" strategy.
  // It's ideal for the static app shell.
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // If the request is in the cache, return the cached response.
        if (response) {
          return response;
        }
        // If the request is not in the cache, fetch it from the network.
        return fetch(event.request);
      })
  );
});
