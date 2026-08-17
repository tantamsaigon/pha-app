'use client';

import React, { useState, useEffect } from 'react';
import { Volume2, Square, Sparkles, Loader2, History, AlertTriangle, ArrowLeft } from 'lucide-react';
import { playGTTSQueue, stopTTS } from '@/lib/ttsHelper';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';

interface Advice {
  causeAnalysis: string;
  medicalRecommendation: string;
  firstAid?: string;
  nextMealMenu: string[];
  suggestedActivities: string;
}

export default function AIConsultation({ userProfile, healthLogs }: { userProfile: any; healthLogs: any[] }) {
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState<Advice | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [selectedHistory, setSelectedHistory] = useState<any | null>(null);

  // Tải lịch sử tư vấn từ Firebase
  const loadConsultationHistory = async () => {
    if (!userProfile?.uid) return;
    try {
      const q = query(
        collection(db, 'ai_consultations'),
        where('userId', '==', userProfile.uid)
      );
      const querySnapshot = await getDocs(q);
      const list: any[] = [];
      querySnapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setHistoryList(list);
    } catch (err) {
      console.error('Lỗi khi tải lịch sử:', err);
    }
  };

  useEffect(() => {
    loadConsultationHistory();
  }, [userProfile]);

  // Gọi API lấy tư vấn AI
  const handleGetConsultation = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userProfile, healthLogs }),
      });
      const result = await res.json();

      if (result.success || result.advice) {
        const data = result.advice || result;
        
        // Chuẩn hóa dữ liệu trả về
        const formattedAdvice: Advice = {
          causeAnalysis: data.causeAnalysis || data.summary || '',
          medicalRecommendation: data.medicalRecommendation || data.advice || '',
          firstAid: data.firstAid || data.firstAidAndCare || '',
          nextMealMenu: Array.isArray(data.nextMealMenu) ? data.nextMealMenu : [],
          suggestedActivities: data.suggestedActivities || '',
        };

        setAdvice(formattedAdvice);
        setSelectedHistory(null);
        setActiveTab('current');

        // Lưu vào Firebase
        if (userProfile?.uid) {
          await addDoc(collection(db, 'ai_consultations'), {
            userId: userProfile.uid,
            advice: formattedAdvice,
            createdAt: serverTimestamp(),
          });
          loadConsultationHistory();
        }
      } else {
        alert('Có lỗi xảy ra: ' + (result.error || 'Không nhận được dữ liệu hợp lệ'));
      }
    } catch (err) {
      alert('Không thể kết nối với máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  // Hàm xử lý đọc gTTS tiếng Việt
  const handleToggleSpeakAI = (dataToRead: Advice | null) => {
    if (isSpeaking) {
      stopTTS();
      setIsSpeaking(false);
    } else {
      if (!dataToRead) return;

      setIsSpeaking(true);

      const menuText = dataToRead.nextMealMenu && dataToRead.nextMealMenu.length > 0 
        ? dataToRead.nextMealMenu.join(', ') 
        : 'Không có';

      const firstAidText = dataToRead.firstAid ? `Hướng dẫn sơ cứu: ${dataToRead.firstAid}.` : '';

      const fullTextToRead = `
        Kết quả phân tích AI. 
        Phân tích nguyên nhân: ${dataToRead.causeAnalysis || ''}. 
        ${firstAidText}
        Lời khuyên y tế: ${dataToRead.medicalRecommendation || ''}. 
        Thực đơn bữa tiếp theo gồm: ${menuText}. 
        Hoạt động gợi ý: ${dataToRead.suggestedActivities || ''}.
      `;

      playGTTSQueue(fullTextToRead, () => {
        setIsSpeaking(false);
      });
    }
  };

  // Render một khối kết quả tư vấn
  const renderAdviceContent = (data: Advice, isHistoryView = false) => (
    <div className="mt-4 border-t pt-4 space-y-4 text-gray-800">
      <div className="flex justify-between items-center border-b pb-2">
        <h3 className="text-lg font-bold text-indigo-900">
          {isHistoryView ? 'Chi Tiết Tư Vấn Lịch Sử' : 'Kết Quả Phân Tích AI'}
        </h3>
        <button
          type="button"
          onClick={() => handleToggleSpeakAI(data)}
          className={`p-2 rounded-full transition-all ${
            isSpeaking
              ? 'bg-amber-500 text-white animate-pulse'
              : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
          }`}
          title={isSpeaking ? 'Tạm dừng đọc' : 'Đọc kết quả phân tích'}
        >
          {isSpeaking ? (
            <Square className="w-5 h-5 fill-current" />
          ) : (
            <Volume2 className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* 🔍 Phân Tích Nguyên Nhân */}
      {data.causeAnalysis && (
        <div>
          <h4 className="font-semibold text-indigo-700">🔍 Phân Tích Nguyên Nhân:</h4>
          <p className="text-sm text-gray-600 mt-1">{data.causeAnalysis}</p>
        </div>
      )}

      {/* ⚠️ Hướng Dẫn Sơ Cứu (Mới bổ sung) */}
      {data.firstAid && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="font-semibold text-red-700 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            Hướng Dẫn Sơ Cứu Ban Đầu:
          </h4>
          <p className="text-sm text-red-800 mt-1 whitespace-pre-line">{data.firstAid}</p>
        </div>
      )}

      {/* 🩺 Lời Khuyên Y Tế */}
      {data.medicalRecommendation && (
        <div>
          <h4 className="font-semibold text-emerald-700">🩺 Lời Khuyên Y Tế:</h4>
          <p className="text-sm text-gray-600 mt-1">{data.medicalRecommendation}</p>
        </div>
      )}

      {/* 🥗 Thực Đơn Bữa Tiếp Theo */}
      {data.nextMealMenu && data.nextMealMenu.length > 0 && (
        <div>
          <h4 className="font-semibold text-orange-700">🥗 Thực Đơn Bữa Tiếp Theo:</h4>
          <ul className="list-disc list-inside text-sm text-gray-600 mt-1 space-y-1">
            {data.nextMealMenu.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 🏃 Hoạt Động Gợi Ý */}
      {data.suggestedActivities && (
        <div>
          <h4 className="font-semibold text-blue-700">🏃 Hoạt Động Gợi Ý:</h4>
          <p className="text-sm text-gray-600 mt-1">{data.suggestedActivities}</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-lg mx-auto mt-6 bg-white shadow-md rounded-xl p-4 space-y-4">
      {/* Switcher Chuyển Tab */}
      <div className="flex justify-between items-center bg-gray-100 p-1 rounded-lg text-sm font-semibold">
        <button
          onClick={() => {
            setActiveTab('current');
            setSelectedHistory(null);
          }}
          className={`flex-1 py-1.5 rounded-md transition ${
            activeTab === 'current' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Tư Vấn Mới
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-1.5 rounded-md transition flex items-center justify-center gap-1 ${
            activeTab === 'history' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <History className="w-4 h-4" />
          Lịch Sử ({historyList.length})
        </button>
      </div>

      {/* TAB 1: TƯ VẤN MỚI */}
      {activeTab === 'current' && (
        <>
          <button
            onClick={handleGetConsultation}
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {loading ? 'AI Đang Phân Tích...' : 'Tư Vấn Sức Khỏe AI'}
          </button>

          {advice && renderAdviceContent(advice)}
        </>
      )}

      {/* TAB 2: LỊCH SỬ TƯ VẤN */}
      {activeTab === 'history' && (
        <div>
          {selectedHistory ? (
            <div>
              <button
                onClick={() => setSelectedHistory(null)}
                className="text-sm font-semibold text-indigo-600 hover:underline flex items-center gap-1 mb-2"
              >
                <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
              </button>
              {renderAdviceContent(selectedHistory.advice, true)}
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {historyList.length === 0 ? (
                <p className="text-center text-sm text-gray-500 py-6">Chưa có lịch sử tư vấn nào.</p>
              ) : (
                historyList.map((item, idx) => {
                  const itemAdvice: Advice = item.advice || {};
                  const timeStr = item.createdAt?.seconds
                    ? new Date(item.createdAt.seconds * 1000).toLocaleString('vi-VN')
                    : 'Gần đây';

                  return (
                    <div
                      key={item.id || idx}
                      onClick={() => setSelectedHistory(item)}
                      className="p-3 bg-gray-50 border rounded-lg hover:border-indigo-400 cursor-pointer transition space-y-1"
                    >
                      <div className="flex justify-between items-center text-xs font-bold text-indigo-900">
                        <span>Lần tư vấn #{historyList.length - idx}</span>
                        <span className="text-gray-400 font-normal">{timeStr}</span>
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {itemAdvice.causeAnalysis || itemAdvice.medicalRecommendation || 'Xem chi tiết...'}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}