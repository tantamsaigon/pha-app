// lib/pushHelper.ts

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerPushNotification() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    alert('Trình duyệt không hỗ trợ Push Notification.');
    return;
  }

  // Xin quyền thông báo từ người dùng
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    alert('Bạn cần cho phép cấp quyền thông báo.');
    return;
  }

  // Đăng ký Service Worker
  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) return;

  // Đăng ký Push Subscription
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  // Gửi subscription token về Server lưu trữ
  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription),
  });

  alert('Đã kích hoạt thông báo tự động theo khung giờ thành công!');
}
