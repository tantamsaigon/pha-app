const CACHE_NAME = 'pha-health-cache-v1';
const URLS_TO_CACHE = ['/', '/manifest.json', '/favicon.ico'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE))
  );
});

self.addEventListener('push', function (event) {
  if (!event.data) return;

  const data = event.data.json();
  const title = data.title || 'Tư Vấn Sức Khỏe AI';
  const options = {
    body: data.body,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    data: { url: data.url || '/?tab=log' }, // Deep-link tab target
    vibrate: [100, 50, 100],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  
  // Lấy đường dẫn target tuyệt đối
  const targetUrl = new URL(event.notification.data.url || '/', self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Tìm cửa sổ/tab đang mở cùng Origin
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus().then((focusedClient) => {
            if (focusedClient && 'navigate' in focusedClient) {
              return focusedClient.navigate(targetUrl);
            }
          });
        }
      }
      // Nếu chưa có tab nào mở thì mở mới
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});