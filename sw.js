// Optional offline support. Network-first so updates show up right away when you have signal;
// falls back to the cached copy if the network fails or takes longer than 3 seconds (gym basements).
const CACHE = 'gym-companion-v3';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './apple-touch-icon.png', './icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(ASSETS.map(a => c.add(a).catch(() => {})))));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const network = fetch(req).then(res => { if (res && res.ok) cache.put(req, res.clone()); return res; });
    try {
      return await Promise.race([network, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000))]);
    } catch (err) {
      const cached = await cache.match(req, { ignoreSearch: true }) || (req.mode === 'navigate' ? await cache.match('./index.html') : null);
      if (cached) { e.waitUntil(network.catch(() => {})); return cached; }
      try { return await network; } catch (e2) { return Response.error(); }
    }
  })());
});
