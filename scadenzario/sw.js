/**
 * Service worker dello Scadenzario.
 * Mette in cache l'app (HTML/CSS/JS/icone) così, una volta aperta
 * almeno una volta, funziona anche offline o con connessione debole —
 * i dati delle pratiche restano comunque in localStorage, non qui.
 *
 * Per pubblicare un aggiornamento dell'app, incrementare CACHE_NAME:
 * forza i client a scaricare la nuova versione dei file.
 */
const CACHE_NAME = "scadenzario-v3";
const APP_SHELL = [
  "./index.html",
  "./manifest.webmanifest",
  "./css/app.css",
  "./js/auth-config.js",
  "./js/auth.js",
  "./js/calendar-config.js",
  "./js/date-utils.js",
  "./js/riti.js",
  "./js/store.js",
  "./js/google-auth.js",
  "./js/calendar.js",
  "./js/drive-sync.js",
  "./js/app.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-first per gli HTML (per vedere subito gli aggiornamenti quando
// c'è connessione), cache-first per il resto (CSS/JS/icone).
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  // Non intercettare le chiamate verso Google (Calendar API / Identity):
  // devono sempre passare dalla rete.
  if (event.request.url.includes("googleapis.com") || event.request.url.includes("accounts.google.com")) return;

  const isHTML = event.request.mode === "navigate" || event.request.destination === "document";

  if (isHTML) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return res;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return res;
      });
    })
  );
});
