/* Community Connect service worker.
 *
 * Deliberately minimal and conservative:
 * - GET navigations: network-first, fall back to the cached page, then to
 *   /offline. The app is server-rendered, so content is always freshest
 *   online — offline we just need a friendly shell, not stale data.
 * - Static assets (/_next/static, /icons): cache-first (they're fingerprinted
 *   or immutable).
 * - Everything else — POSTs (Server Actions), RSC payloads, APIs — is NOT
 *   intercepted. Forms already show proper errors when the network fails.
 */

const VERSION = "v2";
const CACHE = `cc-static-${VERSION}`;
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        cache.addAll([OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png"])
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Never touch non-GET requests (Server Actions are POSTs).
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Page navigations: network-first, cache fallback, offline page last.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached || caches.match(OFFLINE_URL))
        )
    );
    return;
  }

  // Fingerprinted static assets: cache-first.
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/")
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      })
    );
  }
});


/* ---- Web push (FCM) ------------------------------------------------
 * Plain handlers — no Firebase SDK needed inside the SW. FCM delivers a
 * standard web-push JSON payload: { notification: {title, body}, data: {link} }.
 * ------------------------------------------------------------------ */
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { notification: { title: "Community Connect", body: "" } };
  }
  const n = payload.notification || {};
  const link = (payload.data && payload.data.link) || "/";
  event.waitUntil(
    self.registration.showNotification(n.title || "Community Connect", {
      body: n.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: n.tag || "cc",
      data: { link },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(link).catch(() => {});
          return client.focus();
        }
      }
      return self.clients.openWindow(link);
    })
  );
});
