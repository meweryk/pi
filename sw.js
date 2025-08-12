const API_CACHE = 'api-cache-v4';
const CACHE_NAME = 'my-pwa-cache-v1'; // Фиксированная версия
const EXTERNAL_CACHE = 'external-resources-cache-v1';
const FALLBACK_IMAGE = '/pi/pictures/icon_512x512.png';
const FALLBACK_HTML = '/pi/index.html';

const EXTERNAL_HOSTS = [
  'sites.google.com',
  'cdn.example.org',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'stackpath.bootstrapcdn.com',
  'zakon.rada.gov.ua' // Только домен без протокола и путей
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
  '/pi/pictures/pravochin.png',
  'https://fonts.googleapis.com/css?family=Rock+Salt'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Кэширование основных ресурсов');
        return cache.addAll(urlsToCache);
      })
      .catch(err => console.error('[SW] Ошибка установки:', err))
  );
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  const requestHost = requestUrl.hostname;
  
  // 1. Проверка на внешний ресурс
  const isExternalResource = EXTERNAL_HOSTS.some(host => 
    requestHost === host || requestHost.endsWith('.' + host)
  );
  
  // 2. Обработка API запросов
  if (requestUrl.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(event));
    return;
  }
  
  // 3. Обработка внешних ресурсов
  if (isExternalResource) {
    event.respondWith(handleExternalRequest(event));
    return;
  }

  // 4. Обработка всех остальных запросов
  event.respondWith(handleMainRequest(event));
});

// Обработка основных запросов
function handleMainRequest(event) {
  // Для навигационных запросов - особый подход
  if (event.request.mode === 'navigate') {
    return caches.match(FALLBACK_HTML)
      .then(cachedHtml => {
        return fetch(event.request)
          .then(networkRes => {
            // Обновляем кэш при успешном ответе
            const clone = networkRes.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(event.request, clone));
            return networkRes;
          })
          .catch(() => cachedHtml || caches.match(FALLBACK_HTML));
    });
  }

  return caches.match(event.request)
    .then(cachedResponse => {
      // 1. Возвращаем кэшированный ресурс если есть
      if (cachedResponse) {
        console.log(`[SW] Используем кэш: ${event.request.url}`);
        return cachedResponse;
      }
      
      // 2. Пробуем загрузить из сети
      return fetch(event.request.clone())
        .then(networkResponse => {
          // Кэшируем только успешные ответы
          if (networkResponse.status === 200 && event.request.method === 'GET') {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                console.log(`[SW] Кэшируем: ${event.request.url}`);
                cache.put(event.request, clone);
              });
          }
          return networkResponse;
        })
        .catch(error => {
          console.error('[SW] Ошибка сети:', error);
          
          // 3. Fallback-стратегии
          // HTML-документы
          if (event.request.destination === 'document' || 
              event.request.headers.get('accept').includes('text/html')) {
            return caches.match(FALLBACK_HTML);
          }
          
          // Изображения
          if (event.request.destination === 'image') {
            return caches.match(FALLBACK_IMAGE);
          }
          
          // Стили
          if (event.request.destination === 'style') {
            return new Response('/* offline fallback */', {
              headers: {'Content-Type': 'text/css'}
            });
          }
          
          // Скрипты
          if (event.request.destination === 'script') {
            return new Response('// offline fallback', {
              headers: {'Content-Type': 'application/javascript'}
            });
          }
          
          return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
    });
}

// Обработка внешних запросов
function handleExternalRequest(event) {
  return caches.open(EXTERNAL_CACHE)
    .then(cache => cache.match(event.request))
    .then(cachedResponse => {
      if (cachedResponse) {
        console.log(`[SW] Внешний ресурс из кэша: ${event.request.url}`);
        return cachedResponse;
      }
      
      return fetch(event.request.clone())
        .then(networkResponse => {
          // Кэшируем только если ответ успешен
          if (networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(EXTERNAL_CACHE)
              .then(cache => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(error => {
          console.error('[SW] Ошибка загрузки внешнего ресурса:', error);
          
          // Fallback для изображений
          if (event.request.destination === 'image') {
            return caches.match(FALLBACK_IMAGE);
          }
          
          return new Response('External resource unavailable', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
    });
}

// Обработка API запросов
function handleApiRequest(event) {
  return caches.open(API_CACHE)
    .then(cache => cache.match(event.request))
    .then(cachedResponse => {
      // Пытаемся получить свежие данные
      return fetch(event.request.clone())
        .then(networkResponse => {
          // Кэшируем только успешные ответы
          if (networkResponse.status === 200) {
            const clone = networkResponse.clone();
            cache.put(event.request, clone);
          }
          return networkResponse;
        })
        .catch(() => {
          // Возвращаем кэш если сеть недоступна
          if (cachedResponse) return cachedResponse;
          return new Response('API offline', { status: 503 });
        });
    });
}

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME, API_CACHE, EXTERNAL_CACHE];
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('[SW] Удаляем старый кэш:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Немедленный контроль страниц
  );
});
