const CACHE_VERSION = 'v1';
const STATIC_CACHE = `tpv-haido-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `tpv-haido-dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `tpv-haido-images-${CACHE_VERSION}`;
const FONT_CACHE = `tpv-haido-fonts-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.svg',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/icon-128x128.png',
];

const CACHE_LIMITS = {
  images: 100,
  dynamic: 50,
};

self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Pre-caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return (
              name.startsWith('tpv-haido-') &&
              name !== STATIC_CACHE &&
              name !== DYNAMIC_CACHE &&
              name !== IMAGE_CACHE &&
              name !== FONT_CACHE
            );
          })
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, DYNAMIC_CACHE));
    return;
  }

  const ext = url.pathname.split('.').pop()?.toLowerCase();

  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico'].includes(ext || '')) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE, CACHE_LIMITS.images));
    return;
  }

  if (['woff', 'woff2', 'ttf', 'otf', 'eot'].includes(ext || '')) {
    event.respondWith(cacheFirst(request, FONT_CACHE));
    return;
  }

  if (['js', 'css'].includes(ext || '')) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  if (request.destination === 'document' || url.pathname === '/') {
    event.respondWith(networkFirst(request, DYNAMIC_CACHE));
    return;
  }

  event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
});

async function cacheFirst(request, cacheName, limit) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());

      if (limit) {
        limitCacheSize(cacheName, limit);
      }
    }
    return response;
  } catch (error) {
    console.log('[SW] Cache-first failed:', request.url);
    return new Response('', { status: 408 });
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[SW] Network-first falling back to cache:', request.url);
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    if (request.destination === 'document') {
      const fallback = await caches.match('/');
      if (fallback) return fallback;
    }

    return new Response('Offline', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cached = await caches.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        caches.open(cacheName).then((cache) => {
          cache.put(request, response.clone());
        });
      }
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}

async function limitCacheSize(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  if (keys.length > maxItems) {
    const deleteCount = keys.length - maxItems;
    for (let i = 0; i < deleteCount; i++) {
      await cache.delete(keys[i]);
    }
    console.log(`[SW] Trimmed ${deleteCount} items from ${cacheName}`);
  }
}

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data?.type === 'GET_CACHE_STATUS') {
    Promise.all([
      caches.open(STATIC_CACHE).then((c) => c.keys()),
      caches.open(DYNAMIC_CACHE).then((c) => c.keys()),
      caches.open(IMAGE_CACHE).then((c) => c.keys()),
    ]).then(([staticKeys, dynamicKeys, imageKeys]) => {
      event.ports[0]?.postMessage({
        static: staticKeys.length,
        dynamic: dynamicKeys.length,
        images: imageKeys.length,
        version: CACHE_VERSION,
      });
    });
  }

  if (event.data?.type === 'CLEAR_CACHES') {
    caches.keys().then((names) => {
      Promise.all(names.map((name) => caches.delete(name))).then(() => {
        event.ports[0]?.postMessage({ cleared: true });
      });
    });
  }
});

self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  if (event.tag === 'sync-orders') {
    event.waitUntil(Promise.resolve());
  }
});
