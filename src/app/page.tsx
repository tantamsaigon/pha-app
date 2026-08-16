'use client';

import React, { useState, useEffect } from 'react';
import HealthLogForm from '@/components/HealthLogForm';
import AIConsultation from '@/components/AIConsultation';
import DoctorExportModal from '@/components/DoctorExportModal';
import { seedMockData } from '@/lib/mockData';
import { fetchCurrentWeather, WeatherData } from '@/lib/weather';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Database, CloudSun, RefreshCw } from 'lucide-react';

export default function Home() {
  const testUserId = 'user_demo_123';

  const [userProfile] = useState({
    uid: testUserId,
    fullName: 'Nguyễn Văn A',
    birthYear: 1990,
    weight: 68,
    height: 172,
    bloodType: 'O',
  });

  const [healthLogs, setHealthLogs] = useState<any[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [seeding, setSeeding] = useState(false);

  // Tải dữ liệu nhật ký từ Firestore
  const loadHealthLogs = async () => {
    try {
      const q = query(
        collection(db, 'health_logs'),
        where('userId', '==', testUserId)
      );
      const querySnapshot = await getDocs(q);
      const logs: any[] = [];
      querySnapshot.forEach((doc) => {
        logs.push({ id: doc.id, ...doc.data() });
      });
      setHealthLogs(logs);
    } catch (error) {
      console.error('Lỗi khi tải nhật ký:', error);
    }
  };

  useEffect(() => {
    loadHealthLogs();

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const data = await fetchCurrentWeather(
            position.coords.latitude,
            position.coords.longitude
          );
          setWeather(data);
        },
        () => {
          fetchCurrentWeather(21.0285, 105.8542).then(setWeather);
        }
      );
    }
  }, []);

  const handleSeedData = async () => {
    setSeeding(true);
    try {
      await seedMockData(testUserId);
      await loadHealthLogs();
      alert('Đã tạo thành công dữ liệu mẫu 7 ngày!');
    } catch (err) {
      console.error(err);
      alert('Có lỗi khi tạo dữ liệu mẫu.');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Header App */}
        <header className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-indigo-900">
              PHA - Sổ Tay Sức Khỏe AI
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Bệnh nhân: <span className="font-semibold">{userProfile.fullName}</span> ({userProfile.weight}kg - {userProfile.height}cm)
            </p>
          </div>

          {weather && (
            <div className="flex items-center gap-2 bg-indigo-50/60 border border-indigo-100 px-3 py-2 rounded-xl text-xs text-indigo-900">
              <CloudSun className="w-5 h-5 text-indigo-600" />
              <div>
                <p className="font-bold">{weather.temperature}°C</p>
                <p className="text-[10px] text-indigo-700">{weather.condition}</p>
              </div>
            </div>
          )}
        </header>

        {/* Nút Tạo Mock Data */}
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center justify-between">
          <div className="text-xs text-amber-800 space-y-1">
            <p className="font-bold flex items-center gap-1">
              <Database className="w-4 h-4" /> Dữ Liệu Thử Nghiệm (Local Test)
            </p>
            <p>Nạp dữ liệu ăn uống, hoạt động & triệu chứng 7 ngày gần nhất để AI phân tích.</p>
          </div>
          <button
            onClick={handleSeedData}
            disabled={seeding}
            className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold px-3 py-2 rounded-lg transition flex items-center gap-1 whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${seeding ? 'animate-spin' : ''}`} />
            {seeding ? 'Đang tạo...' : 'Nạp Mock Data'}
          </button>
        </div>

        {/* Phase 1: Form Nhập Liệu */}
        <HealthLogForm userId={testUserId} onSaveSuccess={loadHealthLogs} />

        {/* Phase 2: Tư Vấn AI */}
        <AIConsultation userProfile={userProfile} healthLogs={healthLogs} />

        {/* Phase 3: Báo Cáo Bác Sĩ */}
        <DoctorExportModal userProfile={userProfile} healthLogs={healthLogs} />

      </div>
    </main>
  );
}