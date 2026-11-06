// 離線支援：有網路時拿最新版（超過 3 秒就先顯示存好的版本），沒網路時用存好的版本
const CACHE = 'jp-app-v1';
const IMAGES = 'jp-app-images-v1';
const CORE = ['./', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== IMAGES).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function freshFirst(request, key) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(key, { ignoreSearch: true });
  const network = fetch(request).then(res => {
    if (res.ok) cache.put(key, res.clone());
    return res;
  });
  if (!cached) return network;
  network.catch(() => {});
  const timeout = new Promise(resolve => setTimeout(() => resolve(cached), 3000));
  return Promise.race([network.catch(() => cached), timeout]);
}

// 單字卡圖片：看過一次就存起來，之後離線也看得到
async function imageCacheFirst(request) {
  const cache = await caches.open(IMAGES);
  const cached = await cache.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  cache.put(request, res.clone());
  return res;
}

self.addEventListener('fetch', e => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (request.mode === 'navigate') {
    e.respondWith(freshFirst(request, './'));
  } else if (url.origin === location.origin) {
    e.respondWith(freshFirst(request, request));
  } else if (request.destination === 'image') {
    e.respondWith(imageCacheFirst(request));
  }
});
