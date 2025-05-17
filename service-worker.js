// Имя кэша
const CACHE_NAME = 'dressline-cache-v1';

// Файлы для предварительного кэширования
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './offline.html'
];

// Установка Service Worker и предварительное кэширование
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  // Активация сразу после установки
  self.skipWaiting();
});

// Активация Service Worker
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // Удаляем старые кэши
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Захватываем управление всеми клиентами
  self.clients.claim();
});

// Стратегия кэширования: Network First, затем Cache
self.addEventListener('fetch', event => {
  // Пропускаем запросы к другим доменам
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Обрабатываем только GET-запросы
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Если получили ответ, клонируем его и кэшируем
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
        }
        return response;
      })
      .catch(() => {
        // При ошибке сети ищем в кэше
        return caches.match(event.request)
          .then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            
            // Если запрос на страницу и нет в кэше, возвращаем offline.html
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('./offline.html');
            }
            
            // Для других ресурсов возвращаем ошибку
            return new Response('Network error', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});
