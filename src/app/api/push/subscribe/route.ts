// app/api/push/subscribe/route.ts
import { NextResponse } from 'next/server';

// Lưu trữ tạm trong bộ nhớ (Trong sản phẩm thực tế, lưu `subscription` vào Cơ sở dữ liệu: MongoDB, PostgreSQL, v.v.)
export const subscriptions: any[] = [];

export async function POST(req: Request) {
  try {
    const subscription = await req.json();
    subscriptions.push(subscription);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Lỗi lưu subscription' }, { status: 500 });
  }
}
