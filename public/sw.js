// ═══════════════════════════════════════════════════════════════════════════
//  Service Worker — Dulce Encanto Admin PWA
//  Permite instalar el panel de administración como app en el móvil.
//
//  IMPORTANTE: NO cachea páginas HTML (siempre network-first sin fallback
//  a cache) para evitar servir versiones stale del admin durante el desarrollo.
//  Solo cachea estáticos (imágenes, CSS, JS, fuentes) para offline.
// ═══════════════════════════════════════════════════════════════════════════

const CACHE_NAME = 'dulce-encanto-admin-v2';
const STATIC_CACHE = `${CACHE_NAME}-static`;

// Solo precachear el favicon y manifest (NO páginas HTML)
const PRECACHE_URLS = [
  '/favicon.png',
  '/manifest.json',
  '/logo-dulce-encanto.png',
];

// Instalación: precachear recursos estáticos mínimos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Activación: limpiar caches antiguos y tomar control inmediatamente
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('dulce-encanto-') && name !== STATIC_CACHE)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: NUNCA interceptar páginas HTML o API — siempre ir a la red
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo manejar GET
  if (request.method !== 'GET') return;

  // NO interceptar: páginas HTML, API, ni navigaciones
  // Esto evita que el SW sirva versiones stale del admin
  if (request.mode === 'navigate' || request.destination === 'document') return;
  if (url.pathname.startsWith('/api/')) return;
  if (url.pathname.startsWith('/admin')) return;

  // Cache-first SOLO para estáticos (imágenes, CSS, JS, fuentes)
  if (['image', 'style', 'script', 'font'].includes(request.destination)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return (
          cached ||
          fetch(request).then((response) => {
            if (response.status === 200) {
              const responseClone = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, responseClone));
            }
            return response;
          })
        );
      })
    );
  }
});
