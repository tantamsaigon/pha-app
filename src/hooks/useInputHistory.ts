import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LogType } from '@/types';

export function useInputHistory(userId: string | undefined, logType: LogType) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [amountSuggestions, setAmountSuggestions] = useState<string[]>([]);
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
        const nameSet = new Set<string>();
        const amountSet = new Set<string>();

        snapshot.forEach((doc) => {
          const data = doc.data()?.data;
          if (!data) return;

          if (logType === 'FOOD') {
            if (data.foodName) nameSet.add(data.foodName.trim());
            if (data.amount) amountSet.add(data.amount.trim());
          } else if (logType === 'ACTIVITY' && data.activityName) {
            nameSet.add(data.activityName.trim());
          } else if (logType === 'SYMPTOM' && data.description) {
            nameSet.add(data.description.trim());
          }
        });

        setSuggestions(Array.from(nameSet).sort((a, b) => a.localeCompare(b, 'vi')));
        setAmountSuggestions(Array.from(amountSet).sort((a, b) => a.localeCompare(b, 'vi')));
      } catch (error) {
        console.error(`Lỗi khi lấy lịch sử ${logType}:`, error);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [userId, logType]);

  return { suggestions, amountSuggestions, loadingHistory };
}
