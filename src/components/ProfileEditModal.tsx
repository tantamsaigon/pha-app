'use client';

import React, { useState } from 'react';
import { UserProfile } from '@/types';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { User, X, Scale, Ruler, Heart, Loader2 } from 'lucide-react';

interface ProfileEditModalProps {
  userProfile: UserProfile;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileEditModal({ userProfile, isOpen, onClose }: ProfileEditModalProps) {
  const [fullName, setFullName] = useState(userProfile.fullName || '');
  const [birthYear, setBirthYear] = useState(userProfile.birthYear || 1990);
  const [weight, setWeight] = useState(userProfile.weight || 60);
  const [height, setHeight] = useState(userProfile.height || 165);
  const [bloodType, setBloodType] = useState(userProfile.bloodType || 'A');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // Tính BMI realtime
  const heightInMeters = height / 100;
  const bmi = heightInMeters > 0 ? (weight / (heightInMeters * heightInMeters)).toFixed(1) : '0';

  const getBMICategory = (bmiValue: number) => {
    if (bmiValue < 18.5) return { text: 'Thiếu cân', color: 'text-amber-600' };
    if (bmiValue < 23) return { text: 'Bình thường', color: 'text-emerald-600' };
    if (bmiValue < 25) return { text: 'Thừa cân', color: 'text-amber-600' };
    return { text: 'Béo phì', color: 'text-red-600' };
  };

  const bmiInfo = getBMICategory(parseFloat(bmi));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userRef = doc(db, 'users', userProfile.uid);
      await updateDoc(userRef, {
        fullName,
        birthYear: Number(birthYear),
        weight: Number(weight),
        height: Number(height),
        bloodType,
      });
      onClose();
    } catch (error) {
      console.error('Lỗi cập nhật Profile:', error);
      alert('Không thể cập nhật thông tin cá nhân. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl relative border border-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <User className="w-6 h-6 text-indigo-600" />
          <h2 className="text-xl font-bold text-slate-800">Cập Nhật Hồ Sơ Cá Nhân</h2>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Họ và tên</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Năm sinh</label>
              <input
                type="number"
                required
                value={birthYear}
                onChange={(e) => setBirthYear(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Nhóm máu</label>
              <select
                value={bloodType}
                onChange={(e) => setBloodType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                {['A', 'B', 'AB', 'O', 'Chưa rõ'].map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <Scale className="w-3.5 h-3.5 text-slate-400" /> Cân nặng (kg)
              </label>
              <input
                type="number"
                step="0.1"
                required
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <Ruler className="w-3.5 h-3.5 text-slate-400" /> Chiều cao (cm)
              </label>
              <input
                type="number"
                required
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
          </div>

          {/* Khung chỉ số BMI realtime */}
          <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-indigo-600" />
              <span className="text-xs font-medium text-slate-700">Chỉ số BMI hiện tại:</span>
            </div>
            <div className="text-right">
              <span className="text-base font-extrabold text-indigo-900">{bmi}</span>
              <span className={`text-xs ml-2 font-semibold ${bmiInfo.color}`}>({bmiInfo.text})</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition flex items-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Lưu Thay Đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
