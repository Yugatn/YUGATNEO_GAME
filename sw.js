const CACHE = 'yugatneo-chess-v3';
const SHELL = ['./', './index.html', './manifest.json', './icon.svg'];
const ENGINE = 'https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js';
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(SHELL);
    try { const response = await fetch(ENGINE, {mode:'cors'}); if (response.ok) await cache.put(ENGINE, response); } catch (_) {}
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin === self.location.origin) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response.ok) (await caches.open(CACHE)).put(request, response.clone());
        return response;
      } catch (_) { return caches.match('./index.html'); }
    })());
  } else if (request.url === ENGINE) {
    event.respondWith((async () => {
      const cached = await caches.match(ENGINE);
      if (cached) return cached;
      return fetch(request);
    })());
  }
});