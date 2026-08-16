'use client';

import React from 'react';
import { HealthLog } from '@/types';
import { Activity, BarChart2 } from 'lucide-react';

export default function HealthAnalytics({ logs }: { logs: HealthLog[] }) {
  const symptomLogs = logs.filter((log) => log.type === 'SYMPTOM');

  // Thống kê tần suất triệu chứng
  const symptomCounts: { [key: string]: number } = {};
  symptomLogs.forEach((log) => {
    const desc = (log.data as any).description || 'Không rõ';
    symptomCounts[desc] = (symptomCounts[desc] || 0) + 1;
  });

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-3">
      <div className="flex items-center gap-2">
        <BarChart2 className="w-5 h-5 text-indigo-600" />
        <h3 className="text-sm font-bold text-slate-800">Phân Tích Xu Hướng Sức Khỏe</h3>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-slate-500">
          Tổng số lần ghi nhận triệu chứng: <strong className="text-slate-800">{symptomLogs.length} lần</strong>
        </p>

        {Object.keys(symptomCounts).length === 0 ? (
          <p className="text-xs text-slate-400 italic py-2">Chưa ghi nhận triệu chứng bất thường nào.</p>
        ) : (
          <div className="space-y-2 pt-1">
            {Object.entries(symptomCounts).map(([symptom, count]) => (
              <div key={symptom} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-700">{symptom}</span>
                  <span className="text-indigo-600">{count} lần</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all"
                    style={{ width: `${Math.min((count / symptomLogs.length) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
