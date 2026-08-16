'use client';

import React, { useState, useEffect } from 'react';
import HealthLogForm from '@/components/HealthLogForm';
import AIConsultation from '@/components/AIConsultation';
import DoctorExportModal from '@/components/DoctorExportModal';
import ProfileEditModal from '@/components/ProfileEditModal';
import HealthLogManager from '@/components/HealthLogManager';
import HealthAnalytics from '@/components/HealthAnalytics';
import AuthModal from '@/components/AuthModal';
import { useAuth } from '@/context/AuthContext';
import { fetchCurrentWeather, WeatherData } from '@/lib/weather';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { CloudSun, Bell, LogOut, Loader2, UserPen, LayoutDashboard, History, BarChart3 } from 'lucide-react';
import { registerPushNotification } from '@/lib/pushHelper';

export default function Home() {
  const { user, userProfile, loading: authLoading, logout } = useAuth();

  const [healthLogs, setHealthLogs] = useState<any[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'log' | 'history' | 'analytics'>('log');

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
    if (user) loadHealthLogs();

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const data = await fetchCurrentWeather(
            position.coords.latitude,
            position.coords.longitude
          );
          setWeather(data);
        },
        () => fetchCurrentWeather(21.0285, 105.8542).then(setWeather)
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

  if (!user || !userProfile) return <AuthModal />;

  return (
    <main className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Header App & Cụm Công Cụ */}
        <header className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-indigo-900">
              Sổ Tay Sức Khỏe
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-slate-500">
                <span className="font-semibold text-slate-800">{userProfile.fullName}</span> ({userProfile.weight}kg - {userProfile.height}cm - Nhóm máu {userProfile.bloodType})
              </p>
              <button
                onClick={() => setIsProfileModalOpen(true)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
              >
                <UserPen className="w-3.5 h-3.5" /> Sửa
              </button>
            </div>
          </div>

          {/* Cụm công cụ góc phải: Nhắc nhở + Thời tiết + Logout */}
          <div className="flex items-center gap-2">
            {/* Nút Bật Nhắc Nhở PWA */}
            <button
              type="button"
              onClick={registerPushNotification}
              title="Bật Nhắc Nhở Tự Động PWA"
              className="p-2.5 text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition rounded-xl flex items-center justify-center"
            >
              <Bell className="w-5 h-5" />
            </button>

            {/* Weather Widget */}
            {weather && (
              <div className="flex items-center gap-2 bg-indigo-50/60 border border-indigo-100 px-3 py-2 rounded-xl text-xs text-indigo-900">
                <CloudSun className="w-5 h-5 text-indigo-600" />
                <div>
                  <p className="font-bold">{weather.temperature}°C</p>
                  <p className="text-[10px] text-indigo-700">{weather.condition}</p>
                </div>
              </div>
            )}

            {/* Nút Logout */}
            <button
              onClick={logout}
              title="Đăng xuất"
              className="p-2.5 text-slate-400 hover:text-red-600 transition rounded-xl border border-slate-100 hover:bg-slate-50"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Tab Điều Hướng Feature B */}
        <div className="flex bg-slate-200/60 p-1 rounded-xl gap-1 text-xs font-bold">
          <button
            onClick={() => setActiveTab('log')}
            className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === 'log' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" /> Nhập Liệu
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === 'history' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            <History className="w-3.5 h-3.5" /> Nhật Ký
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === 'analytics' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" /> Xu Hướng
          </button>
        </div>

        {/* Nội dung Tab */}
        {activeTab === 'log' && (
          <HealthLogForm userId={user.uid} onSaveSuccess={loadHealthLogs} />
        )}

        {activeTab === 'history' && (
          <HealthLogManager logs={healthLogs} onRefresh={loadHealthLogs} />
        )}

        {activeTab === 'analytics' && (
          <HealthAnalytics logs={healthLogs} />
        )}

        {/* Tư Vấn AI & Xuất Dữ Liệu Bác Sĩ */}
        <AIConsultation userProfile={userProfile} healthLogs={healthLogs} />
        <DoctorExportModal userProfile={userProfile} healthLogs={healthLogs} />

        {/* Modal Chỉnh Sửa Profile */}
        <ProfileEditModal
          userProfile={userProfile}
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
        />

      </div>
    </main>
  );
}
