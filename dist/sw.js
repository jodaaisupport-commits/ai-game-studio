// Minimaler Offline-Cache: App-Shell + Build-Assets (Cache-first),
// Navigationen (Network-first mit Cache-Fallback).
const CACHE = 'ai-studio-v1'
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.add('/')).then(() => self.skipWaiting()).catch(() => {}))
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
  })))
})
