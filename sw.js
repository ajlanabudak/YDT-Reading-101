// YDT Okuma — offline destek için cache-first service worker (düzeltilmiş)
const CACHE_NAME = "ydt-okuma-v3";
const ASSETS = [
  "./",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // addAll yerine tek tek ekle: biri başarısız olursa diğerleri yine de önbelleğe alınsın
      Promise.allSettled(ASSETS.map((url) => cache.add(url)))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => {
          // ağ da başarısız oldu ve önbellekte de yoktu.
          // Sayfa isteğiyse en azından ana sayfayı dene, o da yoksa gerçek bir Response döndür
          // (undefined dönmek Chrome'da ERR_FAILED'a yol açar).
          if (event.request.mode === "navigate") {
            return caches.match("./").then((fallback) =>
              fallback || new Response(
                "Çevrimdışısın ve bu sayfa henüz önbelleğe alınmadı.",
                { status: 503, statusText: "Offline", headers: { "Content-Type": "text/plain; charset=utf-8" } }
              )
            );
          }
          return new Response("", { status: 504, statusText: "Offline" });
        });
    })
  );
});
