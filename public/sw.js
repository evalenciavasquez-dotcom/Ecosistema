// Service worker mínimo: requerido para que la app sea instalable de forma
// confiable. Pasa todo a la red; sin caché offline por ahora (los datos viven
// en Postgres y siempre queremos la versión fresca).
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Passthrough: dejar que el navegador maneje la petición normalmente.
});
