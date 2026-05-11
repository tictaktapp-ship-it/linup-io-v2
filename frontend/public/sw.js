// LINUP v2 — Push Notification Service Worker
// Phase 8: Notifications (Doc 8D)

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: 'LINUP', body: event.data.text(), url: '/app' };
  }

  const title = data.title ?? 'LINUP';
  const options = {
    body: data.body ?? '',
    icon: '/icon-192.png',
    badge: '/icon-72.png',
    data: { url: data.url ?? '/app' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/app';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});