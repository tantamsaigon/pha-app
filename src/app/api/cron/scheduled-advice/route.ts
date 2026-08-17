import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { db } from '@/lib/firebase';
import { collection, getDocs, deleteDoc } from 'firebase/firestore';

function initWebPush() {
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
  const privateKey = process.env.VAPID_PRIVATE_KEY || '';

  if (publicKey && privateKey) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    return true;
  }
  return false;
}

const TIME_CONFIGS: Record<string, { title: string; promptType: string }> = {
  '0745': { title: '⏰ Sáng Mới: Nhắc Nhở Sức Khỏe', promptType: 'water_medication' },
  '0945': { title: '🥗 Gợi Ý Thực Đơn Bữa Trưa', promptType: 'lunch_menu' },
  '1145': { title: '💧 Nhắc Nước & Vận Động Trưa', promptType: 'water_medication' },
  '1445': { title: '🍵 Nhắc Uống Nước & Hoạt Động Chiều', promptType: 'water_medication' },
  '1645': { title: '🍲 Gợi Ý Thực Đơn Bữa Tối', promptType: 'dinner_menu' },
  '1915': { title: '🌙 Nhắc Thuốc & Nghỉ Ngơi Tối', promptType: 'night_rest' },
};

export async function GET(req: Request) {
  // 1. Kiểm tra xác thực Bảo mật
  const authHeader = req.headers.get('authorization');
  if (
    process.env.NODE_ENV === 'production' &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new Response('Unauthorized', { status: 401 });
  }

  // 2. Khởi tạo WebPush
  if (!initWebPush()) {
    return NextResponse.json(
      { error: 'Chưa cấu hình biến môi trường VAPID Keys' },
      { status: 500 }
    );
  }

  // 3. Lấy tham số khung giờ
  const { searchParams } = new URL(req.url);
  const timeKey = searchParams.get('time') || '0745';
  const config = TIME_CONFIGS[timeKey];

  if (!config) {
    return NextResponse.json({ error: 'Khung giờ không hợp lệ' }, { status: 400 });
  }

  // 4. Chuẩn bị nội dung tư vấn
  const weatherText = 'Nắng nhẹ, 29°C';
  let adviceMessage = '';

  if (config.promptType === 'lunch_menu') {
    adviceMessage = `Thời tiết ${weatherText}. Thực đơn trưa gợi ý: Rau luộc, Cá thu kho, Cơm trắng, Canh bí thịt băm. Vận động nhẹ sau ăn 15p.`;
  } else if (config.promptType === 'dinner_menu') {
    adviceMessage = `Thời tiết ${weatherText}. Bữa tối nên ăn nhẹ nhàng: Salad, Thăn heo áp chảo, Cơm gạo lứt, Canh rau ngót.`;
  } else if (config.promptType === 'night_rest') {
    adviceMessage = `Đã đến giờ uống thuốc buổi tối. Hãy thả lỏng, ngâm chân nước ấm và chuẩn bị nghỉ ngơi.`;
  } else {
    adviceMessage = `Thời tiết ${weatherText}. Hãy uống 250ml nước lọc, uống thuốc theo đơn và đứng dậy vươn vai 5 phút nhé!`;
  }

  const payload = JSON.stringify({
    title: config.title,
    body: adviceMessage,
    url: '/?tab=log',
  });

  // 5. Lấy toàn bộ Push Subscriptions từ Firestore Database
  const querySnapshot = await getDocs(collection(db, 'push_subscriptions'));
  const subscriptions: any[] = [];
  
  querySnapshot.forEach((docSnap) => {
    subscriptions.push({ id: docSnap.id, ref: docSnap.ref, ...docSnap.data() });
  });

  if (subscriptions.length === 0) {
    return NextResponse.json({ success: true, message: 'Chưa có thiết bị nào đăng ký nhận tin' });
  }

  // 6. Gửi Push Notification tới từng thiết bị
  let successCount = 0;
  const pushPromises = subscriptions.map(async (sub) => {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: sub.keys,
        },
        payload
      );
      successCount++;
    } catch (err: any) {
      console.error(`Lỗi gửi Push cho endpoint (${sub.endpoint}):`, err);
      // Nếu token không còn hợp lệ (410 Gone / 404 Not Found), dọn dẹp xóa khỏi Firestore
      if (err.statusCode === 410 || err.statusCode === 404) {
        await deleteDoc(sub.ref);
      }
    }
  });

  await Promise.all(pushPromises);

  return NextResponse.json({
    success: true,
    timeKey,
    totalDevices: subscriptions.length,
    sentSuccessCount: successCount,
  });
}
