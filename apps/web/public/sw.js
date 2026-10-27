/* Service worker de Videollamada Animal — solo avisos push (no guarda nada
   en caché: la plataforma necesita estar siempre al día). */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let datos = {};
  try {
    datos = event.data ? event.data.json() : {};
  } catch (_) {}
  const titulo = datos.titulo || "Videollamada Animal";
  event.waitUntil(
    (async () => {
      const ventanas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // Si el panel está abierto y a la vista, ya muestra su propia ventana
      // emergente con sonido: un aviso del sistema encima sería duplicado.
      const visible = ventanas.some((v) => v.visibilityState === "visible");
      if (visible) {
        ventanas.forEach((v) => v.postMessage({ tipo: "push", etiqueta: datos.etiqueta }));
        return;
      }
      await self.registration.showNotification(titulo, {
        body: datos.cuerpo || "",
        icon: "/icons/icon-192.png",
        badge: "/icons/badge-96.png",
        tag: datos.etiqueta || "aviso",
        renotify: true,
        requireInteraction: true,
        vibrate: [400, 150, 400, 150, 400],
        data: { url: datos.url || "/panel-veterinario" },
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destino = new URL((event.notification.data && event.notification.data.url) || "/panel-veterinario", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const ventanas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const v of ventanas) {
        if ("focus" in v) {
          await v.focus();
          if ("navigate" in v && v.url !== destino) {
            try { await v.navigate(destino); } catch (_) {}
          }
          return;
        }
      }
      await self.clients.openWindow(destino);
    })(),
  );
});
