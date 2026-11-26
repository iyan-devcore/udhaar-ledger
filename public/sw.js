/*
 * Service worker: caches the app shell so the app opens instantly.
 *
 * - Static build files (/_next/static, icons) are cached forever: their names
 *   change with every build, so they never go stale.
 * - Pages are always fetched from the server (network first) because they show
 *   live balances. If the phone is offline, a small offline page is shown.
 * - Nothing is ever cached for /api, /pay, /login, or any non-GET request.
 *   Adding entries offline is out of scope for v1.
 *
 * Bump VERSION to clear old caches after changing this file.
 */
const VERSION = "v1";
const STATIC_CACHE = `udhar-static-${VERSION}`;
const SHELL_CACHE = `udhar-shell-${VERSION}`;
const PRECACHE = ["/offline", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== STATIC_CACHE && k !== SHELL_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/pay/")) return;

  // Immutable build assets: cache first.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  // Page navigations: network first, offline page as a fallback.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(async () => (await caches.match("/offline")) || new Response("Offline", { status: 503 })),
    );
  }
});
