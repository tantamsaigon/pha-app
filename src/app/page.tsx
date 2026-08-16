'use client';

import React, { useState, useEffect } from 'react';
import HealthLogForm from '@/components/HealthLogForm';
import AIConsultation from '@/components/AIConsultation';
import DoctorExportModal from '@/components/DoctorExportModal';
import AuthModal from '@/components/AuthModal';
import { useAuth } from '@/context/AuthContext';
import { fetchCurrentWeather, WeatherData } from '@/lib/weather';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { CloudSun, Bell, LogOut, Loader2 } from 'lucide-react';
import { registerPushNotification } from '@/lib/pushHelper';

export default function Home() {
  const { user, userProfile, loading: authLoading, logout } = useAuth();

  const [healthLogs, setHealthLogs] = useState<any[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);

  // Tải dữ liệu nhật ký từ Firestore của User hiện tại
  const loadHealthLogs = async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'health_logs'),
        where('userId', '==', user.uid)
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
    if (user) {
      loadHealthLogs();
    }

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
  }, [user]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!user || !userProfile) {
    return <AuthModal />;
  }

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
              Bệnh nhân: <span className="font-semibold text-slate-800">{userProfile.fullName}</span> ({userProfile.weight}kg - {userProfile.height}cm - Nhóm máu {userProfile.bloodType})
            </p>
          </div>

          <div className="flex items-center gap-2">
            {weather && (
              <div className="flex items-center gap-2 bg-indigo-50/60 border border-indigo-100 px-3 py-2 rounded-xl text-xs text-indigo-900">
                <CloudSun className="w-5 h-5 text-indigo-600" />
                <div>
                  <p className="font-bold">{weather.temperature}°C</p>
                  <p className="text-[10px] text-indigo-700">{weather.condition}</p>
                </div>
              </div>
            )}

            <button
              onClick={logout}
              title="Đăng xuất"
              className="p-2 text-slate-400 hover:text-red-600 transition rounded-lg border border-slate-100 hover:bg-slate-50"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Nút Bật Nhắc Nhở Tự Động PWA */}
        <button
          type="button"
          onClick={registerPushNotification}
          className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
        >
          <Bell className="w-5 h-5" />
          <span>Bật Nhắc Nhở Tự Động Theo Khung Giờ (PWA)</span>
        </button>

        {/* Form Nhập Liệu Thật */}
        <HealthLogForm userId={userProfile.uid} onSaveSuccess={loadHealthLogs} />

        {/* Tư Vấn AI */}
        <AIConsultation userProfile={userProfile} healthLogs={healthLogs} />

        {/* Báo Cáo Bác Sĩ */}
        <DoctorExportModal userProfile={userProfile} healthLogs={healthLogs} />

      </div>
    </main>
  );
}