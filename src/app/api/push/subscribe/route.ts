// src/app/api/push/subscribe/route.ts
import { NextResponse } from 'next/server';
import { subscriptions } from '@/lib/subscriptions';

export async function POST(req: Request) {
  try {
    const subscription = await req.json();
    subscriptions.push(subscription);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Lỗi lưu subscription' }, { status: 500 });
  }
}
