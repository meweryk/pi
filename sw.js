//const CACHE_NAME = 'my-pwa-cache-v2'; // Увеличена версия
const API_CACHE = 'api-cache-v1';
const CACHE_NAME = 'my-pwa-cache-${{ github.run_id }}'; // Уникальное имя для каждого деплоя
const urlsToCache = [
  '/ksiva/',
  '/ksiva/index.html',
  '/ksiva/css/style.css',
  '/ksiva/css/cub3d.css',
  '/ksiva/js/app.js',
  '/ksiva/js/main.js',
  '/ksiva/pictures/icon_192x192.png',
  '/ksiva/pictures/icon_512x512.png',
  '/ksiva/pictures/declaration_of_intent.png',
  '/ksiva/pictures/declaration_of_intent_scancopy.png',
  '/ksiva/pictures/avtor.png',
  '/ksiva/pictures/fon-bardo.jpg',
  '/ksiva/pictures/fon-craft.jpg',
  '/ksiva/pictures/foto_main.webp',
  '/ksiva/pictures/logoshapka.png',
  '/ksiva/pictures/obgruntuvannya.png',
  '/ksiva/pictures/pamyatka.png',
  '/ksiva/pictures/pravochin.png'
];

// Установка: предзагрузка базовых файлов
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .catch(err => console.error('Cache addAll error:', err))
  );
  self.skipWaiting(); // Активировать сразу
});

// Активация: очистка старых кешей
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME, API_CACHE];
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
  self.clients.claim(); // Перехват управления
});

// Перехват запросов
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // 1. API-запросы — кэшируем отдельно
  if (request.url.includes('/api/')) {
    event.respondWith(
      caches.open(API_CACHE).then(cache =>
        cache.match(request).then(response =>
          response || fetch(request).then(networkResponse => {
            cache.put(request, networkResponse.clone());
            return networkResponse;
          })
        )
      )
    );
    return;
  }

  // 2. Навигационные запросы (HTML страницы)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => caches.match('/ksiva/index.html'))
    );
    return;
  }

  // 3. Остальные запросы: изображения, css, js и т.п.
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      return cachedResponse || fetch(request).then(networkResponse => {
        // Сохраняем "на лету" всё, что не в API и не HTML
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(request, networkResponse.clone());
          return networkResponse;
        });
      });
    }).catch(err => {
      console.error('Fetch failed:', err);
    })
  );
});