const CACHE_NAME = "booktok-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-180.png",
  "./icons/icon-32.png",
  "https://api.fontshare.com/v2/css?f[]=satoshi@400,500,600,700&f[]=erode@400,500,600,700&display=swap",
];

// Install — cache core assets
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch((err) => {
        console.log("Cache addAll partial fail (fonts may be cross-origin):", err);
        // Cache what we can
        return Promise.allSettled(ASSETS.map((url) => cache.add(url)));
      });
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — cache-first for assets, network-first for fonts
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // For font requests, try network first then cache
  if (url.hostname === "api.fontshare.com" || url.hostname === "cdn.fontshare.com") {
    e.respondWith(
      fetch(e.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          return response;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // For everything else, cache-first
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((response) => {
        // Cache successful GET requests
        if (e.request.method === "GET" && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return response;
      });
    }).catch(() => {
      // Offline fallback for navigation
      if (e.request.mode === "navigate") {
        return caches.match("./index.html");
      }
    })
  );
});
