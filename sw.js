//const CACHE_NAME = 'my-pwa-cache-v2'; // Увеличена версия
const API_CACHE = 'api-cache-v3';
const CACHE_NAME = 'my-pwa-cache-${{ github.run_id }}'; // Уникальное имя для каждого деплоя
const urlsToCache = [
'/pi/',
'/pi/index.html',
'/pi/css/style.css',
'/pi/css/cub3d.css',
'/pi/js/app.js',
'/pi/js/main.js', // Добавлена недостающая запятая
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
