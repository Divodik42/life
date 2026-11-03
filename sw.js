// Запуск всегда из кеша, без ожидания сети: приложение открывается мгновенно и при слабом интернете.
// В фоне файлы проверяются на обновления — новая версия появится при следующем открытии.
const CACHE = 'raspisanie-v2-15';
const FILES = [
  './', './index.html', './style.css', './data.js', './charts.js', './app.js', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
  './fonts/onest-cyrillic.woff2', './fonts/onest-latin.woff2', './fonts/literata-cyrillic.woff2', './fonts/literata-latin.woff2',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  const refresh = fetch(req, { cache: 'no-cache' }).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  });

  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => {
      if (hit) { e.waitUntil(refresh.catch(() => {})); return hit; }
      return refresh.catch(() => caches.match('./index.html'));
    })
  );
});
