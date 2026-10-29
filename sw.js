/* Service worker de Control Financiero.
   Guarda el "esqueleto" de la app (el HTML, los iconos y las fuentes) para que
   abra al instante y funcione sin conexión. Los datos del usuario viven en
   localStorage, así que no pasan por aquí. */
const CACHE = 'cf-v2';
const CORE = [
  './',
  'index.html',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-180.png',
  'icons/icon-512-maskable.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const navegacion = req.mode === 'navigate';

  /* La página va "red primero": si hay conexión siempre se carga la versión
     más nueva que hayas subido, y solo sin conexión se tira de la copia. */
  if (navegacion) {
    e.respondWith(
      fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('index.html', copy)); }
        return res;
      }).catch(() => caches.match('index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        const cacheable = res.ok && (
          url.origin === location.origin ||
          url.hostname.includes('gstatic') ||
          url.hostname.includes('googleapis')
        );
        if (cacheable) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => {
        if (navegacion) return caches.match('index.html') || caches.match('./');
        return new Response('', { status: 504, statusText: 'offline' });
      });
    })
  );
});
