// The online build has no server, so once these files are stored it plays offline.
// `vite.config.ts` fills in the version and the list of files for each build.
const VERSION = "__VERSION__";
const FILES = __FILES__;
const CACHE = `mythoveya-${VERSION}`;
const home = () => new URL("index.html", self.registration.scope).href;

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(FILES))
      .then(() => self.skipWaiting()),
  );
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("mythoveya-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  // Pages ask the network first so an update arrives as soon as there is one.
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).catch(() => caches.match(home())));
    return;
  }
  // Every other file has its content hash in its name, so a stored copy stays right.
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request)));
});
