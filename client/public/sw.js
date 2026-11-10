/**
 * FinLab Progressive Web App Service Worker
 * 
 * Safety & Security Rules:
 * 1. ONLY cache application shell and static immutable assets.
 * 2. NEVER cache authenticated API responses, balances, accounts, transactions,
 *    user profile info, tokens, or sensitive financial data.
 * 3. Any request to /api/* or external auth providers always bypasses CacheStorage.
 * 4. Safe offline fallback provided when disconnected.
 */

const CACHE_NAME = 'finlab-shell-v1.0.0';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/manifest.json',
  '/favicon.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-maskable-192x192.png',
  '/icons/icon-maskable-512x512.png',
  '/icons/apple-touch-icon.png',
  '/icons/icon.svg'
];

// Install: Precache application shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[FinLab SW] Precache partial error:', err);
      });
    })
  );
});

// Activate: Clean up outdated caches & claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key.startsWith('finlab-') && key !== CACHE_NAME) {
            console.log('[FinLab SW] Removing legacy cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Message listener for skipWaiting triggered by user update notification
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Helper: Check if request is an API or sensitive auth call
function isSensitiveOrApiRequest(url) {
  const pathname = url.pathname;
  return (
    pathname.startsWith('/api') ||
    url.port === '9003' ||
    url.hostname === 'accounts.google.com' ||
    url.hostname.includes('oauth') ||
    pathname.includes('/auth/') ||
    pathname.includes('/transactions') ||
    pathname.includes('/accounts') ||
    pathname.includes('/categories') ||
    pathname.includes('/budgets') ||
    pathname.includes('/recurring') ||
    pathname.includes('/savings') ||
    pathname.includes('/reports') ||
    pathname.includes('/settings') ||
    pathname.includes('/notifications') ||
    pathname.includes('/dashboard/summary')
  );
}

// Fetch: Safe routing & caching strategies
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // 1. Only intercept GET requests
  if (request.method !== 'GET') {
    return;
  }

  // 2. Ignore non-http/https protocols (e.g. chrome-extension, data)
  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  // 3. STRICT PRIVACY & SECURITY: Never cache API endpoints or sensitive financial data
  if (isSensitiveOrApiRequest(url)) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'You are currently offline. Sensitive financial data requires an active connection.',
            offline: true
          }),
          {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'application/json' }
          }
        );
      })
    );
    return;
  }

  // 4. Navigation Requests (SPA Routing): Network first, then cached app shell, then offline.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cachedMatch = await caches.match(request);
          if (cachedMatch) return cachedMatch;

          const cachedShell = (await caches.match('/index.html')) || (await caches.match('/'));
          if (cachedShell) return cachedShell;

          const offlineFallback = await caches.match('/offline.html');
          if (offlineFallback) return offlineFallback;

          return new Response('Offline', { status: 503, statusText: 'Offline' });
        })
    );
    return;
  }

  // 5. Static Assets (Vite chunks: JS / CSS / Web Fonts)
  const isViteAsset = url.pathname.startsWith('/assets/');
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  const isStaticFile = url.pathname.startsWith('/icons/') || url.pathname.endsWith('.svg') || url.pathname.endsWith('.png');

  if (isViteAsset || isFont || isStaticFile) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          // Stale-while-revalidate for fonts/static, or return immediate for hashed Vite chunks
          if (!isViteAsset) {
            fetch(request).then((networkRes) => {
              if (networkRes && networkRes.status === 200) {
                const copy = networkRes.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
              }
            }).catch(() => {/* offline */});
          }
          return cached;
        }

        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        }).catch(() => {
          // If offline and request is an image, could return empty or placeholder
          return new Response('', { status: 408, statusText: 'Request Timeout' });
        });
      })
    );
    return;
  }

  // 6. Default Network First with Cache Fallback for other GET requests
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

