//const CACHE_NAME = 'my-pwa-cache-v2'; // Увеличена версия
const API_CACHE = 'api-cache-v1';
const CACHE_NAME = 'my-pwa-cache-${{ github.run_id }}'; // Уникальное имя для каждого деплоя
const urlsToCache = [
'/ksiva/',
'/ksiva/index.html',
'/ksiva/css/style.css',
'/ksiva/css/cub3d.css',
'/ksiva/js/app.js',
'/ksiva/js/main.js', // Добавлена недостающая запятая
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