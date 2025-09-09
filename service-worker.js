// This is a minimal service worker to make the app installable.
self.addEventListener('fetch', (event) => {
  // This event listener is required for the PWA install prompt to appear.
  // We are not adding any caching logic here, but it could be added in the future.
});
 