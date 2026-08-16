// app/api/cron/scheduled-advice/route.ts
import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { subscriptions } from '@/lib/subscriptions';

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

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
  
  // Cho phép bỏ qua kiểm tra auth khi chạy ở môi trường local (development) để dễ test thủ công
  if (
    process.env.NODE_ENV === 'production' &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new Response('Unauthorized', { status: 401 });
  }

  // 2. Lấy tham số khung giờ
  const { searchParams } = new URL(req.url);
  const timeKey = searchParams.get('time') || '0745';
  const config = TIME_CONFIGS[timeKey];

  if (!config) {
    return NextResponse.json({ error: 'Khung giờ không hợp lệ' }, { status: 400 });
  }

  // 3. Chuẩn bị nội dung tư vấn theo khung giờ
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
    url: '/',
  });

  // 4. Gửi Push Notification tới các thiết bị đã đăng ký
  const pushPromises = subscriptions.map((sub) =>
    webpush.sendNotification(sub, payload).catch((err) => console.error('Lỗi gửi Push:', err))
  );

  await Promise.all(pushPromises);

  return NextResponse.json({ success: true, timeKey, sentCount: subscriptions.length });
}
