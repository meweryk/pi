//const CACHE_NAME = 'my-pwa-cache-v2'; // Увеличена версия
const API_CACHE = 'api-cache-v3';
const CACHE_NAME = 'my-pwa-cache-${{ github.run_id }}';
const urlsToCache = [
  '/pi/',
  '/pi/index.html',
  '/pi/css/style.css',
  '/pi/css/cub3d.css',
  '/pi/js/app.js',
  '/pi/js/main.js',
  '/pi/pictures/icon_192x192.png',
  '/pi/pictures/icon_512x512.png',
  '/pi/pictures/declaration_of_intent.png',
  '/pi/pictures/declaration_of_intent_scancopy.png',
  '/pi/pictures/avtor.png',
  '/pi/pictures/fon-bardo.jpg',
  '/pi/pictures/fon-craft.jpg',
  '/pi/pictures/foto_main.webp',
  '/pi/pictures/logoshapka.png',
  '/pi/pictures/obgruntuvannya.png',
  '/pi/pictures/pamyatka.png',
  '/pi/pictures/pravochin.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .catch(err => console.error('Cache addAll error:', err))
  );
});

self.addEventListener('fetch', (event) => {
  // 1. Обработка API запросов
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      caches.open(API_CACHE).then(cache => {
        return cache.match(event.request).then(cachedResponse => {
          // Пытаемся получить свежие данные из сети
          const fetchPromise = fetch(event.request).then(networkResponse => {
            // Обновляем кеш новыми данными
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          }).catch(() => {
            // Если сеть недоступна - возвращаем кешированный ответ
            return cachedResponse || new Response(JSON.stringify({ error: "Network unavailable" }), {
              headers: { 'Content-Type': 'application/json' }
            });
          });
          
          // Возвращаем кеш сразу если есть, параллельно обновляя его
          return cachedResponse ? cachedResponse : fetchPromise;
        });
      })
    );
    return;
  }

  // 2. Обработка навигационных запросов (ГЛАВНОЕ ИСПРАВЛЕНИЕ)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      // Каскадный поиск подходящего документа
      caches.match(event.request)
        .then(cached => cached || caches.match('/pi/index.html'))
        .then(response => response || fetch(event.request))
    );
    return;
  }

  // 3. Обработка статических ресурсов (CSS, JS, изображения)
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // Если есть в кеше - возвращаем
      if (cachedResponse) return cachedResponse;
      
      // Если нет в кеше - идем в сеть
      return fetch(event.request).then(networkResponse => {
        // Клонируем ответ для кеширования
        const responseToCache = networkResponse.clone();
        
        // Сохраняем в кеш для будущих запросов
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        
        return networkResponse;
      }).catch(() => {
        // Fallback для изображений
        if (event.request.destination === 'image') {
          return caches.match('/pi/pictures/icon_512x512.png');
        }
        
        // Fallback для CSS
        if (event.request.destination === 'style') {
          return new Response('body { background: #f0f0f0; }', { 
            headers: { 'Content-Type': 'text/css' } 
          });
        }
        
        // Общий fallback
        return new Response('Offline content unavailable', { 
          status: 503,
          statusText: 'Service Unavailable' 
        });
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME, API_CACHE];
  event.waitUntil(
    caches.keys().then(cacheNames => {
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
