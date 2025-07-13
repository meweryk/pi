const API_CACHE = 'api-cache-v3';
const CACHE_NAME = 'my-pwa-cache-${{ github.run_id }}';
const EXTERNAL_CACHE = 'external-resources-cache-v1';
const EXTERNAL_HOSTS = [
  'https://sites.google.com/',
  'https://zakon.rada.gov.ua/'
  // Добавьте другие домены здесь
];

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
  const requestUrl = event.request.url;
  
  // 1. Проверка на внешний ресурс
  const isExternalResource = EXTERNAL_HOSTS.some(host => requestUrl.startsWith(host));
  
  // 2. Обработка внешних ресурсов
  if (isExternalResource) {
    event.respondWith(
      caches.open(EXTERNAL_CACHE).then(cache => {
        return cache.match(event.request).then(cachedResponse => {
          // Возвращаем кешированную версию, если есть
          if (cachedResponse) return cachedResponse;
          
          // Загружаем из сети с режимом 'cors'
          return fetch(event.request, { mode: 'cors' })
            .then(networkResponse => {
              // Кешируем только успешные ответы
              if (networkResponse && networkResponse.status === 200) {
                cache.put(event.request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => {
              // Fallback для внешних изображений
              if (event.request.destination === 'image') {
                return caches.match('/pi/pictures/icon_512x512.png');
              }
              return new Response('External resource unavailable', {
                status: 503,
                statusText: 'Service Unavailable'
              });
            });
        });
      })
    );
    return;
  }

  // 3. Обработка API запросов
  if (requestUrl.includes('/api/')) {
    event.respondWith(
      caches.open(API_CACHE).then(cache => {
        return cache.match(event.request).then(cachedResponse => {
          const fetchAndCache = fetch(event.request)
            .then(networkResponse => {
              // Кешируем только успешные ответы
              if (networkResponse.status === 200) {
                cache.put(event.request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => cachedResponse); // Возвращаем кеш при ошибке сети
          
          return cachedResponse || fetchAndCache;
        });
      })
    );
    return;
  }

  // 4. Обработка навигационных запросов
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match(event.request)
        .then(cached => cached || fetch(event.request)
        .catch(() => caches.match('/pi/index.html')) // Fallback для SPA
    );
    return;
  }

  // 5. Обработка статических ресурсов
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // Возвращаем кеш если есть
      if (cachedResponse) return cachedResponse;
      
      // Для всех GET-запросов кешируем ресурсы
      return fetch(event.request).then(networkResponse => {
        // Проверяем, можно ли кешировать
        if (!networkResponse || networkResponse.status !== 200 || 
            networkResponse.type !== 'basic' || event.request.method !== 'GET') {
          return networkResponse;
        }
        
        // Клонируем ответ для кеширования
        const responseToCache = networkResponse.clone();
        
        // Определяем, в какой кеш сохранять
        const cacheType = requestUrl.includes('/api/') ? API_CACHE : CACHE_NAME;
        
        caches.open(cacheType).then(cache => {
          cache.put(event.request, responseToCache);
        });
        
        return networkResponse;
      }).catch(error => {
        // Fallback для изображений
        if (event.request.destination === 'image') {
          return caches.match('/pi/pictures/icon_512x512.png');
        }
        
        // Fallback для CSS
        if (event.request.destination === 'style') {
          return new Response('', { headers: { 'Content-Type': 'text/css' } });
        }
        
        // Fallback для JS
        if (event.request.destination === 'script') {
          return new Response('// Offline mode', 
            { headers: { 'Content-Type': 'application/javascript' } });
        }
        
        return new Response('Offline content unavailable', { 
          status: 503,
          statusText: 'Service Unavailable' 
        });
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME, API_CACHE, EXTERNAL_CACHE];
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
