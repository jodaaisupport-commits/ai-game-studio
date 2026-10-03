// Offline-Cache v2: Precache-Liste aus precache.json (Build) + Runtime-Cache
// für gleich-originige GETs. Navigationen: Network-first mit Cache-Fallback.
const CACHE = 'ai-studio-v2'
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE)
    try {
      const r = await fetch('precache.json', { cache: 'no-store' })
      if (r.ok) {
        const { files } = await r.json()
        await c.addAll(files.filter(f => f !== '/sw.js' && f !== '/precache.json'))
      } else {
        await c.add('/').catch(() => {})
      }
    } catch { await c.add('/').catch(() => {}) }
    await self.skipWaiting()
  })())
})
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()))
})
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET' || url.origin !== location.origin) return
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then(r => { caches.open(CACHE).then(c => c.put('/', r.clone())).catch(() => {}); return r }).catch(() => caches.match('/')))
    return
  }
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => {
    if (r.ok) caches.open(CACHE).then(c => c.put(e.request, r.clone())).catch(() => {})
    return r
  }).catch(() => caches.match(e.request.url.endsWith('.js') ? '/' : undefined))))
})
