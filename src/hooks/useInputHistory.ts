import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LogType } from '@/types';

export function useInputHistory(userId: string | undefined, logType: LogType) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  useEffect(() => {
    if (!userId) return;

    const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
        const q = query(
          collection(db, 'health_logs'),
          where('userId', '==', userId),
          where('type', '==', logType)
        );

        const snapshot = await getDocs(q);
        const uniqueSet = new Set<string>();

        snapshot.forEach((doc) => {
          const data = doc.data()?.data;
          if (!data) return;

          // Lấy đúng trường dữ liệu tương ứng với từng LogType
          if (logType === 'FOOD' && data.foodName) {
            uniqueSet.add(data.foodName.trim());
          } else if (logType === 'ACTIVITY' && data.activityName) {
            uniqueSet.add(data.activityName.trim());
          } else if (logType === 'SYMPTOM' && data.description) {
            uniqueSet.add(data.description.trim());
          }
        });

        // Chuyển Set thành mảng và sắp xếp theo bảng chữ cái
        setSuggestions(Array.from(uniqueSet).sort((a, b) => a.localeCompare(b, 'vi')));
      } catch (error) {
        console.error(`Lỗi khi lấy lịch sử ${logType}:`, error);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [userId, logType]);

  return { suggestions, loadingHistory };
}
