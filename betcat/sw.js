/* betcat — service worker
   Necessário porque o Chrome no Android não suporta `new Notification()`:
   notificações em celular só funcionam via registration.showNotification(). */
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

/* tocar na notificação foca a aba do betcat (ou abre uma nova) */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(lista => {
      for (const c of lista) if ('focus' in c) return c.focus();
      return self.clients.openWindow('./');
    })
  );
});
