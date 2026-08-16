'use client';

import React, { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Mic, PlusCircle, Loader2 } from 'lucide-react';

interface HealthLogFormProps {
  userId: string;
  onSaveSuccess?: () => void;
}

export default function HealthLogForm({ userId, onSaveSuccess }: HealthLogFormProps) {
  const [foodName, setFoodName] = useState('');
  const [foodAmount, setFoodAmount] = useState('');
  const [foodTime, setFoodTime] = useState(new Date().toTimeString().slice(0, 5));

  const [activityName, setActivityName] = useState('');
  const [activityStart, setActivityStart] = useState(new Date().toTimeString().slice(0, 5));
  const [activityEnd, setActivityEnd] = useState('');

  const [symptomDesc, setSymptomDesc] = useState('');
  const [symptomTime, setSymptomTime] = useState(new Date().toTimeString().slice(0, 5));

  const [loading, setLoading] = useState(false);

  // Kích hoạt Web Speech API cho nút Mic
  const startListening = (onResult: (text: string) => void) => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Trình duyệt của bạn không hỗ trợ tính năng Nhận diện giọng nói.');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'vi-VN';

    recognition.onstart = () => {
      console.log('Đang lắng nghe giọng nói...');
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Lỗi nhận diện giọng nói:', event.error);
    };

    recognition.start();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const today = new Date().toISOString().split('T')[0];

      // Quy tắc: Form nào điền dữ liệu thì mới lưu bản ghi đó vào Firestore
      if (foodName.trim()) {
        await addDoc(collection(db, 'health_logs'), {
          userId,
          date: today,
          type: 'FOOD',
          data: {
            foodName,
            amount: foodAmount || '1 phần',
            consumedAt: foodTime || new Date().toTimeString().slice(0, 5),
          },
          createdAt: serverTimestamp(),
        });
      }

      if (activityName.trim()) {
        await addDoc(collection(db, 'health_logs'), {
          userId,
          date: today,
          type: 'ACTIVITY',
          data: {
            activityName,
            startTime: activityStart || new Date().toTimeString().slice(0, 5),
            endTime: activityEnd || activityStart,
          },
          createdAt: serverTimestamp(),
        });
      }

      if (symptomDesc.trim()) {
        await addDoc(collection(db, 'health_logs'), {
          userId,
          date: today,
          type: 'SYMPTOM',
          data: {
            description: symptomDesc,
            onsetTime: symptomTime || new Date().toTimeString().slice(0, 5),
          },
          createdAt: serverTimestamp(),
        });
      }

      // Clear Form sau khi lưu thành công
      setFoodName('');
      setFoodAmount('');
      setActivityName('');
      setActivityEnd('');
      setSymptomDesc('');

      alert('Đã lưu nhật ký thành công!');

      // Callback tải lại dữ liệu ngoài page.tsx
      if (onSaveSuccess) {
        onSaveSuccess();
      }
    } catch (err) {
      console.error('Lỗi lưu nhật ký:', err);
      alert('Không thể lưu nhật ký. Vui lòng kiểm tra lại!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-5">
      <h2 className="text-lg font-bold text-slate-800 border-b pb-3">
        Nhật Ký Sức Khỏe Hằng Ngày
      </h2>

      <form onSubmit={handleSave} className="space-y-4">
        {/* 1. Thực phẩm / Thuốc */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold text-slate-700">Thực phẩm / Thuốc</label>
            <button
              type="button"
              onClick={() => startListening((text) => setFoodName(text))}
              className="text-blue-600 hover:text-blue-800 transition p-1"
              title="Nhập bằng giọng nói"
            >
              <Mic className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-12 gap-2">
            <input
              type="text"
              placeholder="Cơm, Thuốc cảm..."
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
              className="col-span-6 px-3 py-2 text-xs border rounded-lg focus:outline-indigo-500"
            />
            <input
              type="text"
              placeholder="Số lượng, VD: 1 phần, 2 viên..."
              value={foodAmount}
              onChange={(e) => setFoodAmount(e.target.value)}
              className="col-span-3 px-3 py-2 text-xs border rounded-lg focus:outline-indigo-500"
            />
            <input
              type="time"
              value={foodTime}
              onChange={(e) => setFoodTime(e.target.value)}
              className="col-span-3 px-2 py-2 text-xs border rounded-lg focus:outline-indigo-500"
            />
          </div>
        </div>

        {/* 2. Hoạt động Thể chất / Trí nào */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold text-slate-700">Hoạt động Thể chất / Trí não</label>
            <button
              type="button"
              onClick={() => startListening((text) => setActivityName(text))}
              className="text-blue-600 hover:text-blue-800 transition p-1"
              title="Nhập bằng giọng nói"
            >
              <Mic className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-12 gap-2">
            <input
              type="text"
              placeholder="Chạy bộ, Làm việc..."
              value={activityName}
              onChange={(e) => setActivityName(e.target.value)}
              className="col-span-6 px-3 py-2 text-xs border rounded-lg focus:outline-indigo-500"
            />
            <input
              type="time"
              value={activityStart}
              onChange={(e) => setActivityStart(e.target.value)}
              className="col-span-3 px-2 py-2 text-xs border rounded-lg focus:outline-indigo-500"
            />
            <input
              type="time"
              value={activityEnd}
              onChange={(e) => setActivityEnd(e.target.value)}
              className="col-span-3 px-2 py-2 text-xs border rounded-lg focus:outline-indigo-500"
            />
          </div>
        </div>

        {/* 3. Triệu chứng cơ thể */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold text-slate-700">Triệu chứng cơ thể</label>
            <button
              type="button"
              onClick={() => startListening((text) => setSymptomDesc(text))}
              className="text-blue-600 hover:text-blue-800 transition p-1"
              title="Nhập bằng giọng nói"
            >
              <Mic className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-12 gap-2">
            <input
              type="text"
              placeholder="Đau đầu, Chóng mặt..."
              value={symptomDesc}
              onChange={(e) => setSymptomDesc(e.target.value)}
              className="col-span-9 px-3 py-2 text-xs border rounded-lg focus:outline-indigo-500"
            />
            <input
              type="time"
              value={symptomTime}
              onChange={(e) => setSymptomTime(e.target.value)}
              className="col-span-3 px-2 py-2 text-xs border rounded-lg focus:outline-indigo-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg transition flex items-center justify-center gap-2 mt-4 text-xs"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
          {loading ? 'Đang Lưu...' : 'Lưu Nhật Ký'}
        </button>
      </form>
    </div>
  );
}