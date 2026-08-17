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

export async function registerPushNotification(userId?: string) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    alert('Trình duyệt hoặc thiết bị này không hỗ trợ Web Push Notification.');
    return;
  }

  // Xin quyền thông báo từ người dùng
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    alert('Bạn chưa cấp quyền nhận thông báo. Hãy kiểm tra lại Cài đặt trên iPhone.');
    return;
  }

  try {
    // Đăng ký Service Worker
    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      alert('Thiếu cấu hình NEXT_PUBLIC_VAPID_PUBLIC_KEY.');
      return;
    }

    // Đăng ký Push Subscription với PushManager
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    // Gửi thông tin subscription về API Backend
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription, userId: userId || null }),
    });

    if (res.ok) {
      alert('Đã bật thành công thông báo nhắc nhở tự động!');
    } else {
      alert('Lỗi khi lưu thông tin đăng ký thông báo.');
    }
  } catch (error) {
    console.error('Lỗi kích hoạt Push Notification:', error);
    alert('Không thể kích hoạt thông báo. Hãy đảm bảo bạn đã Thêm ứng dụng vào Màn hình chính (A2HS).');
  }
}
