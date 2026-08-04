/* mallik.abdur — service worker
   Caches the static shell so the site's own pages/styles load instantly
   and remain available offline. Firebase/Cloudinary network requests are
   always passed straight through to stay live and up to date. */

const CACHE_NAME = "mallik-abdur-shell-v1";
const SHELL_FILES = [
  "index.html",
  "collection.html",
  "about.html",
  "auth.html",
  "admin.html",
  "main.css",
  "main.js",
  "manifest.json",
  "logo.png",
  "bg.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_FILES))
      .catch(() => {}) // don't block install if an optional asset is missing
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
  const url = new URL(event.request.url);

  // Only handle same-origin GET requests for the static shell.
  // Everything else (Firebase, Firestore, Cloudinary, Google Fonts) goes to the network untouched.
  if (event.request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
