// 芯匣 Service Worker：缓存优先 + 运行时缓存，支持离线使用
const CACHE_NAME = 'chipbox-cache-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(event.request);
    const network = fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && event.request.url.startsWith(self.location.origin)) {
          cache.put(event.request, response.clone());
        }
        return response;
      })
      .catch(() => cached);
    return cached || network;
  })());
});
