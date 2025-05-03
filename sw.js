const CACHE_NAME = 'my-pwa-cache-v2'; // Увеличена версия
const API_CACHE = 'api-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/style.css',
  '/css/cub3d.css',
  '/js/app.js',
  '/js/main.js', // Добавлена недостающая запятая
  '/pictures/icon-192x192.png',
  '/pictures/icon-512x512.png',
  '/pictures/declaration_of_intent.png',
  '/pictures/declaration_of_intent_scancopy.png',
  '/pictures/avtor.png',
  '/pictures/fon-bardo.jpg',
  '/pictures/fon-craft.jpg',
  '/pictures/foto_main.webp',
  '/pictures/logoshapka.png',
  '/pictures/obgruntuvannya.png',
  '/pictures/pamyatka.png',
  '/pictures/pravochin.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
    .then((cache) => cache.addAll(urlsToCache))
    .catch(err => console.error('Cache addAll error:', err))
  );
});

self.addEventListener('fetch', (event) => {
  // Обработка API запросов
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      caches.open(API_CACHE)
      .then(cache => {
        return cache.match(event.request)
        .then(response => response || fetch(event.request)
          .then(networkResponse => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          })
        )
      })
    );
    return;
  }

  // Обработка навигационных запросов
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html')
      .then(response => response || fetch(event.request))
    );
    return;
  }

  // Обработка остальных запросов
  event.respondWith(
    caches.match(event.request)
    .then(response => response || fetch(event.request))
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME,
    API_CACHE];
  event.waitUntil(
    caches.keys()
    .then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});