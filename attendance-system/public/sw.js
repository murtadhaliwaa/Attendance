/* Service worker — يُمكّن تثبيت الموقع كتطبيق على الموبايل */
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

/* لا نعترض طلبات fetch — الاعتراض بدون تخزين مؤقت يسبب Failed to fetch
   أثناء التطوير وعند انقطاع الشبكة. المتصفح يتولى التحميل مباشرة. */
