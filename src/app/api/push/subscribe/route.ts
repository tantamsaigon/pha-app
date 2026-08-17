import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, updateDoc } from 'firebase/firestore';

export async function POST(req: Request) {
  try {
    const { subscription, userId } = await req.json();

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { success: false, error: 'Dữ liệu subscription không hợp lệ' },
        { status: 400 }
      );
    }

    // Kiểm tra xem subscription endpoint này đã tồn tại trong Firestore chưa
    const q = query(
      collection(db, 'push_subscriptions'),
      where('endpoint', '==', subscription.endpoint)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      // Nếu chưa có thì thêm mới vào Firestore
      await addDoc(collection(db, 'push_subscriptions'), {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        userId: userId || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else {
      // Nếu đã có thì cập nhật lại userId và ngày cập nhật
      snapshot.forEach(async (docSnap) => {
        await updateDoc(docSnap.ref, {
          userId: userId || null,
          updatedAt: new Date().toISOString(),
        });
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Lỗi khi lưu push subscription vào Firestore:', error);
    return NextResponse.json(
      { success: false, error: 'Không thể lưu thông tin đăng ký thông báo' },
      { status: 500 }
    );
  }
}
