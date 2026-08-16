import { db } from './firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

export const seedMockData = async (userId: string) => {
  const logsCollection = collection(db, 'health_logs');
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    // Sample Food Log
    await addDoc(logsCollection, {
      userId,
      date: dateStr,
      type: 'FOOD',
      data: { foodName: i % 2 === 0 ? 'Phở Bò' : 'Cơm Tấm', amount: '1 tô', consumedAt: '08:00' },
      createdAt: Timestamp.fromDate(d)
    });

    // Sample Activity Log
    await addDoc(logsCollection, {
      userId,
      date: dateStr,
      type: 'ACTIVITY',
      data: { activityName: 'Chạy bộ', startTime: '17:30', endTime: '18:15' },
      createdAt: Timestamp.fromDate(d)
    });

    // Sample Symptom Log (Ghi nhận vào một số ngày)
    if (i === 1 || i === 0) {
      await addDoc(logsCollection, {
        userId,
        date: dateStr,
        type: 'SYMPTOM',
        data: {
          description: 'Đau đầu nhẹ, đầy bụng',
          onsetTime: '20:00',
          vitals: { heartRate: 78, bloodPressure: '120/80' }
        },
        createdAt: Timestamp.fromDate(d)
      });
    }
  }
  console.log('Mock data seeded successfully!');
};
