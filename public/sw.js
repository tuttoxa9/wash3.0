const CACHE_NAME = 'detail-lab-v2.1';
const RUNTIME_CACHE = 'detail-lab-runtime-v2.1';

const urlsToCache = [
  '/',
  '/manifest.json',
  '/icons/icon.svg',
  '/icons/icon-192x192.svg',
  '/icons/icon-512x512.svg'
];

// Установка Service Worker
self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching static resources');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[SW] Installation complete');
        // Принудительно активируем новый SW
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('[SW] Cache add failed:', err);
      })
  );
});

// Активация Service Worker
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  event.waitUntil(
    Promise.all([
      // Очищаем старые кеши
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Принимаем контроль над всеми клиентами
      self.clients.claim()
    ]).then(() => {
      console.log('[SW] Activation complete');
    })
  );
});

// Перехват запросов с стратегией Network First для HTML и Cache First для статических ресурсов
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Игнорируем запросы к Firebase и внешним API
  if (url.origin !== location.origin) {
    return;
  }

  // Для HTML документов используем Network First стратегию
  if (request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Кешируем успешные ответы
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Если сеть недоступна, возвращаем из кеша
          return caches.match(request).then(response => {
            return response || caches.match('/');
          });
        })
    );
    return;
  }

  // Для статических ресурсов используем Cache First стратегию
  if (request.destination === 'script' ||
      request.destination === 'style' ||
      request.destination === 'image' ||
      request.url.includes('/assets/')) {
    event.respondWith(
      caches.match(request).then(response => {
        if (response) {
          return response;
        }

        return fetch(request).then(fetchResponse => {
          // Кешируем только успешные ответы
          if (fetchResponse.status === 200) {
            const responseClone = fetchResponse.clone();
            caches.open(RUNTIME_CACHE).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return fetchResponse;
        });
      })
    );
    return;
  }

  // Для остальных запросов используем стандартную сетевую стратегию
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request);
    })
  );
});

// Обработка сообщений от главного потока
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      })
    );
  }
});
