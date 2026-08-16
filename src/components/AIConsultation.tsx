'use client';

import React, { useState, useEffect } from 'react';
import { Volume2, Square, Sparkles, Loader2, History, Calendar } from 'lucide-react';
import { playGTTSQueue, stopTTS } from '@/lib/ttsHelper';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, orderBy, serverTimestamp } from 'firebase/firestore';

interface Advice {
  causeAnalysis: string;
  medicalRecommendation: string;
  nextMealMenu: string[];
  suggestedActivities: string;
}

export default function AIConsultation({ userProfile, healthLogs }: { userProfile: any, healthLogs: any[] }) {
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState<Advice | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Tải lịch sử tư vấn AI từ Firestore
  const loadConsultationHistory = async () => {
    if (!userProfile?.uid) return;
    try {
      const q = query(
        collection(db, 'ai_consultations'),
        where('userId', '==', userProfile.uid)
      );
      const snap = await getDocs(q);
      const records: any[] = [];
      snap.forEach((doc) => records.push({ id: doc.id, ...doc.data() }));
      setHistory(records);
    } catch (error) {
      console.error('Lỗi khi tải lịch sử tư vấn:', error);
    }
  };

  useEffect(() => {
    loadConsultationHistory();
  }, [userProfile]);

  const handleGetConsultation = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userProfile, healthLogs }),
      });
      const result = await res.json();
      if (result.success) {
        setAdvice(result.advice);

        // Lưu kết quả tư vấn vào Firestore collection `ai_consultations`
        await addDoc(collection(db, 'ai_consultations'), {
          userId: userProfile.uid,
          timestamp: serverTimestamp(),
          mode: 'MANUAL',
          adviceContent: result.advice,
        });

        loadConsultationHistory();
      } else {
        alert('Có lỗi xảy ra: ' + result.error);
      }
    } catch (err) {
      alert('Không thể kết nối với máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSpeakAI = () => {
    if (isSpeaking) {
      stopTTS();
      setIsSpeaking(false);
    } else {
      if (!advice) return;
      setIsSpeaking(true);
      const menuText = advice.nextMealMenu ? advice.nextMealMenu.join(', ') : 'Không có';
      const fullTextToRead = `
        Kết quả phân tích AI. 
        Phân tích nguyên nhân: ${advice.causeAnalysis || ''}. 
        Lời khuyên y tế: ${advice.medicalRecommendation || ''}. 
        Thực đơn bữa tiếp theo gồm: ${menuText}. 
        Hoạt động gợi ý: ${advice.suggestedActivities || ''}.
      `;
      playGTTSQueue(fullTextToRead, () => setIsSpeaking(false));
    }
  };

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
      <div className="flex gap-2">
        <button
          onClick={handleGetConsultation}
          disabled={loading}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow-sm text-sm disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          {loading ? 'AI Đang Phân Tích...' : 'Tư Vấn Sức Khỏe AI'}
        </button>

        <button
          onClick={() => setShowHistory(!showHistory)}
          className="p-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
          title="Lịch sử tư vấn"
        >
          <History className="w-5 h-5" />
        </button>
      </div>

      {/* Hiển thị Lịch Sử Tư Vấn cũ */}
      {showHistory && (
        <div className="border border-indigo-100 bg-indigo-50/30 p-4 rounded-xl space-y-3">
          <h4 className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
            <History className="w-4 h-4 text-indigo-600" />
            Lịch Sử Lời Khuyên AI Trước Đây ({history.length})
          </h4>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {history.map((rec) => (
              <div
                key={rec.id}
                onClick={() => {
                  setAdvice(rec.adviceContent);
                  setShowHistory(false);
                }}
                className="p-3 bg-white rounded-lg border border-slate-100 hover:border-indigo-300 cursor-pointer transition text-xs space-y-1"
              >
                <div className="flex items-center justify-between text-slate-400 font-medium">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {rec.timestamp?.toDate ? rec.timestamp.toDate().toLocaleString('vi-VN') : 'Vừa xong'}
                  </span>
                  <span className="text-indigo-600 font-semibold">Xem chi tiết &rarr;</span>
                </div>
                <p className="text-slate-700 line-clamp-2 font-medium">{rec.adviceContent?.causeAnalysis}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {advice && (
        <div className="border-t pt-4 space-y-4 text-slate-800">
          <div className="flex justify-between items-center border-b pb-2">
            <h3 className="text-base font-bold text-indigo-900">Kết Quả Phân Tích AI</h3>
            <button
              type="button"
              onClick={handleToggleSpeakAI}
              className={`p-2 rounded-xl transition ${
                isSpeaking
                  ? 'bg-amber-500 text-white animate-pulse'
                  : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
              }`}
            >
              {isSpeaking ? <Square className="w-4 h-4 fill-current" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <h4 className="font-bold text-indigo-700">🔍 Phân Tích Nguyên Nhân:</h4>
              <p className="text-slate-600 mt-1 leading-relaxed">{advice.causeAnalysis}</p>
            </div>
            <div>
              <h4 className="font-bold text-emerald-700">🩺 Lời Khuyên Y Tế:</h4>
              <p className="text-slate-600 mt-1 leading-relaxed">{advice.medicalRecommendation}</p>
            </div>
            <div>
              <h4 className="font-bold text-orange-700">🥗 Thực Đơn Bữa Tiếp Theo:</h4>
              <ul className="list-disc list-inside text-slate-600 mt-1 space-y-1">
                {advice.nextMealMenu?.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-blue-700">🏃 Hoạt Động Gợi Ý:</h4>
              <p className="text-slate-600 mt-1 leading-relaxed">{advice.suggestedActivities}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
