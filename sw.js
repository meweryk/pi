const CACHE_NAME = 'pi-cache-v5';
const FALLBACK_HTML = '/pi/index.html';
const FALLBACK_IMAGE = '/pi/pictures/icon_512x512.png';

// Список внешних хостов для кэширования
const EXTERNAL_HOSTS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdn.jsdelivr.net',
  'stackpath.bootstrapcdn.com',
  'zakon.rada.gov.ua'
];

// Кэшируемые ресурсы
const urlsToCache = [
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
  
  // Примеры внешних ресурсов
  'https://fonts.googleapis.com/css?family=Rock+Salt',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Кэширование ресурсов');
        return cache.addAll(urlsToCache);
      })
      .catch(err => console.error('[SW] Ошибка:', err))
  );
});

self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);
  
  // Проверка на внешний ресурс
  const isExternal = EXTERNAL_HOSTS.some(host => 
    requestUrl.hostname.includes(host)
  );
  
  // Обработка навигации
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(FALLBACK_HTML))
    );
    return;
  }
  
  // Обработка внешних ресурсов
  if (isExternal) {
    event.respondWith(handleExternalRequest(event));
    return;
  }

  // Обработка локальных ресурсов
  event.respondWith(handleLocalRequest(event));
});

function handleLocalRequest(event) {
  return caches.match(event.request)
    .then(cachedResponse => {
      // 1. Возвращаем кэшированный ресурс если есть
      if (cachedResponse) return cachedResponse;
      
      // 2. Пробуем загрузить из сети
      return fetch(event.request)
        .then(networkResponse => {
          // Кэшируем только успешные ответы
          if (networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(error => {
          console.error('[SW] Ошибка сети:', error);
          
          // 3. Fallback-стратегии
          if (event.request.destination === 'image') {
            return caches.match(FALLBACK_IMAGE);
          }
          
          if (event.request.headers.get('accept').includes('text/html')) {
            return caches.match(FALLBACK_HTML);
          }
          
          return new Response('Offline content', { status: 503 });
        });
    });
}

function handleExternalRequest(event) {
  return caches.match(event.request)
    .then(cachedResponse => {
      // 1. Возвращаем кэшированную версию если есть
      if (cachedResponse) {
        console.log(`[SW] Внешний ресурс из кэша: ${event.request.url}`);
        return cachedResponse;
      }
      
      // 2. Загружаем из сети
      return fetch(event.request, {
        mode: 'cors',
        credentials: 'omit'
      })
        .then(networkResponse => {
          // Кэшируем только успешные ответы
          if (networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(error => {
          console.error('[SW] Ошибка внешнего ресурса:', error);
          
          // 3. Fallback для изображений
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

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Удаляем старый кэш:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});
