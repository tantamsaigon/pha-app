'use client';

import React, { useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { UserPlus, LogIn, Loader2 } from 'lucide-react';

export default function AuthModal() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [birthYear, setBirthYear] = useState('1995');
  const [weight, setWeight] = useState('65');
  const [height, setHeight] = useState('170');
  const [bloodType, setBloodType] = useState('O');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        // 1. Tạo tài khoản Auth
        const res = await createUserWithEmailAndPassword(auth, email, password);
        const user = res.user;

        // 2. Tạo thông tin profile thực tế trong Firestore collection 'users'
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          fullName,
          birthYear: Number(birthYear),
          weight: Number(weight),
          height: Number(height),
          bloodType,
          createdAt: serverTimestamp(),
        });
      } else {
        // Đăng nhập
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Đã có lỗi xảy ra. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-md border border-slate-200 max-w-md w-full space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-extrabold text-indigo-900">PHA - Sổ Tay Sức Khỏe AI</h1>
          <p className="text-xs text-slate-500 mt-1">
            {isSignUp ? 'Tạo tài khoản & hồ sơ sức khỏe cá nhân' : 'Đăng nhập để theo dõi sức khỏe'}
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 px-3 py-2 text-xs border rounded-lg focus:outline-indigo-500"
              placeholder="vudoan@gmail.com"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Mật khẩu</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1 px-3 py-2 text-xs border rounded-lg focus:outline-indigo-500"
              placeholder="••••••••"
            />
          </div>

          {isSignUp && (
            <>
              <div>
                <label className="text-xs font-semibold text-slate-700">Họ và Tên</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-xs border rounded-lg focus:outline-indigo-500"
                  placeholder="Nguyễn Văn A"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Năm sinh</label>
                  <input
                    type="number"
                    required
                    value={birthYear}
                    onChange={(e) => setBirthYear(e.target.value)}
                    className="w-full mt-1 px-3 py-2 text-xs border rounded-lg focus:outline-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Nhóm máu</label>
                  <select
                    value={bloodType}
                    onChange={(e) => setBloodType(e.target.value)}
                    className="w-full mt-1 px-3 py-2 text-xs border rounded-lg focus:outline-indigo-500 bg-white"
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="AB">AB</option>
                    <option value="O">O</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Cân nặng (kg)</label>
                  <input
                    type="number"
                    required
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full mt-1 px-3 py-2 text-xs border rounded-lg focus:outline-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Chiều cao (cm)</label>
                  <input
                    type="number"
                    required
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="w-full mt-1 px-3 py-2 text-xs border rounded-lg focus:outline-indigo-500"
                  />
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg transition flex items-center justify-center gap-2 text-xs"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isSignUp ? (
              <UserPlus className="w-4 h-4" />
            ) : (
              <LogIn className="w-4 h-4" />
            )}
            {loading ? 'Đang xử lý...' : isSignUp ? 'Đăng Ký Tài Khoản' : 'Đăng Nhập'}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-xs text-indigo-600 font-semibold hover:underline"
          >
            {isSignUp ? 'Đã có tài khoản? Đăng nhập ngay' : 'Chưa có tài khoản? Đăng ký tại đây'}
          </button>
        </div>
      </div>
    </div>
  );
}