const API_CACHE = 'api-cache-v3';
const CACHE_NAME = 'my-pwa-cache-${{ github.run_id }}';
const EXTERNAL_CACHE = 'external-resources-cache-v1';
const EXTERNAL_HOSTS = [
  'sites.google.com', // Используем только домен без протокола
  'cdn.example.org',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'stackpath.bootstrapcdn.com'
  'https://zakon.rada.gov.ua/'
  // Добавьте другие домены по необходимости
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
  const requestUrl = new URL(event.request.url);
  const requestHost = requestUrl.hostname;
  
  // 1. Проверка на внешний ресурс (исправленная логика)
  const isExternalResource = EXTERNAL_HOSTS.some(host => 
    requestHost === host || requestHost.endsWith('.' + host)
  );
  
  // 2. Обработка внешних ресурсов
  if (isExternalResource) {
    event.respondWith(
      handleExternalRequest(event)
    );
    return;
  }

  // 3. Обработка API запросов
  if (requestUrl.pathname.startsWith('/api/')) {
    event.respondWith(
      handleApiRequest(event)
    );
    return;
  }

  // 4. Обработка навигационных запросов
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match(event.request)
        .then(cached => cached || fetch(event.request)
        .catch(() => caches.match('/pi/index.html'))
    );
    return;
  }

  // 5. Обработка статических ресурсов
  event.respondWith(
    handleStaticRequest(event)
  );
});

// Функция обработки внешних запросов
function handleExternalRequest(event) {
  return caches.open(EXTERNAL_CACHE).then(cache => {
    return cache.match(event.request).then(cachedResponse => {
      // Возвращаем кешированную версию, если есть
      if (cachedResponse) return cachedResponse;
      
      // Пытаемся загрузить из сети
      return fetch(event.request.clone(), {
        mode: 'no-cors', // Используем no-cors для обхода CORS
        credentials: 'omit'
      }).then(networkResponse => {
        // Кешируем только непрозрачные (opaque) ответы
        if (networkResponse && networkResponse.type === 'opaque') {
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      }).catch(() => {
        // Fallback для изображений
        if (event.request.destination === 'image') {
          return caches.match('/pi/pictures/icon_512x512.png');
        }
        return new Response('External resource unavailable', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      });
    });
  });
}

// Функция обработки API запросов
function handleApiRequest(event) {
  return caches.open(API_CACHE).then(cache => {
    return cache.match(event.request).then(cachedResponse => {
      const fetchAndCache = fetch(event.request.clone())
        .then(networkResponse => {
          if (networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);
      
      return cachedResponse || fetchAndCache;
    });
  });
}

// Функция обработки статических запросов
function handleStaticRequest(event) {
  return caches.match(event.request).then(cachedResponse => {
    if (cachedResponse) return cachedResponse;
    
    return fetch(event.request.clone()).then(networkResponse => {
      if (networkResponse && 
          networkResponse.status === 200 && 
          networkResponse.type === 'basic' && 
          event.request.method === 'GET') {
        
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
      }
      return networkResponse;
    }).catch(error => {
      if (event.request.destination === 'image') {
        return caches.match('/pi/pictures/icon_512x512.png');
      }
      if (event.request.destination === 'style') {
        return new Response('', { headers: { 'Content-Type': 'text/css' } });
      }
      if (event.request.destination === 'script') {
        return new Response('// Offline mode', { 
          headers: { 'Content-Type': 'application/javascript' } 
        });
      }
      return new Response('Offline content unavailable', { 
        status: 503,
        statusText: 'Service Unavailable' 
      });
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
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
