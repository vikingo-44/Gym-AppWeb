const CACHE_NAME = 'nd-training-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  'https://gym-app-backend-e9bn.onrender.com'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Estrategia: Network First (priorizar red para datos actualizados)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});