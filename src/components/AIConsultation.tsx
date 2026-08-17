'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { Bot, Sparkles, AlertTriangle, HelpCircle, Volume2, History, X, Loader2, Utensils, Activity, Stethoscope } from 'lucide-react';

interface AIConsultationProps {
  userProfile: any;
  healthLogs: any[];
}

export default function AIConsultation({ userProfile, healthLogs }: AIConsultationProps) {
  const [loading, setLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any | null>(null);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Helper hàm ép kiểu hiển thị văn bản an toàn chống lỗi React #31
  const renderText = (value: any): string => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  // Helper hàm render danh sách an toàn
  const renderList = (value: any) => {
    if (!value) return null;
    if (Array.isArray(value)) {
      return (
        <ul className="list-disc pl-4 space-y-1 mt-1">
          {value.map((item, idx) => (
            <li key={idx}>{renderText(item)}</li>
          ))}
        </ul>
      );
    }
    return <p className="mt-0.5 text-slate-600 whitespace-pre-line">{renderText(value)}</p>;
  };

  // Tải danh sách lịch sử tư vấn từ Firestore
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
      console.error('Lỗi khi tải lịch sử tư vấn:', err);
    }
  };

  useEffect(() => {
    loadConsultationHistory();
  }, [userProfile]);

  // Đọc lời khuyên bằng Voice
  const handleSpeak = (text: string) => {
    if (!('speechSynthesis' in window)) {
      alert('Trình duyệt không hỗ trợ đọc giọng nói.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // Gọi API phân tích AI
  const handleConsult = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userProfile, healthLogs }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setAiResult(data);

      if (userProfile?.uid) {
        await addDoc(collection(db, 'ai_consultations'), {
          userId: userProfile.uid,
          result: data,
          createdAt: serverTimestamp(),
        });
        loadConsultationHistory();
      }
    } catch (err: any) {
      alert('Không thể kết nối với AI. Vui lòng thử lại sau!');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 border-b pb-3">
        <Bot className="w-5 h-5 text-indigo-600" />
        <h2 className="text-lg font-bold text-slate-800">Tư Vấn Sức Khỏe AI</h2>
      </div>

      {/* Khung nội dung */}
      <div className="space-y-4">
        {aiResult ? (
          <div className="space-y-4 bg-indigo-50/40 p-4 rounded-xl border border-indigo-100 text-xs text-slate-700">
            <div className="flex justify-between items-center border-b border-indigo-100 pb-2">
              <span className="font-bold text-indigo-900 text-sm">Kết Quả Phân Tích</span>
              <button
                onClick={() =>
                  handleSpeak(
                    `${renderText(aiResult.summary || aiResult.causeAnalysis)}. ${renderText(
                      aiResult.advice || aiResult.medicalRecommendation
                    )}`
                  )
                }
                className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md transition ${
                  isSpeaking ? 'bg-amber-100 text-amber-700' : 'bg-white text-indigo-700 hover:bg-indigo-100'
                }`}
              >
                <Volume2 className="w-3.5 h-3.5" />
                {isSpeaking ? 'Đang đọc...' : 'Đọc lời khuyên'}
              </button>
            </div>

            {/* Phân tích nguyên nhân / Tóm tắt */}
            {(aiResult.summary || aiResult.causeAnalysis) && (
              <div>
                <p className="font-bold text-slate-800">Tóm tắt / Nguyên nhân:</p>
                {renderList(aiResult.summary || aiResult.causeAnalysis)}
              </div>
            )}

            {/* Lời khuyên Y Tế / Khuyến Nghị */}
            {(aiResult.advice || aiResult.medicalRecommendation) && (
              <div>
                <p className="font-bold text-slate-800">Lời khuyên chuyên môn:</p>
                {renderList(aiResult.advice || aiResult.medicalRecommendation)}
              </div>
            )}

            {/* Sơ cứu / Chăm sóc */}
            {(aiResult.firstAid || aiResult.firstAidAndCare) && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Sơ cứu & Chăm sóc:
                </div>
                {renderList(aiResult.firstAid || aiResult.firstAidAndCare)}
              </div>
            )}

            {/* Thói quen ăn uống tiếp theo */}
            {aiResult.nextMealMenu && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800">
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <Utensils className="w-4 h-4 text-emerald-600" />
                  Gợi ý thực đơn tiếp theo:
                </div>
                {renderList(aiResult.nextMealMenu)}
              </div>
            )}

            {/* Vận động / Hoạt động */}
            {aiResult.suggestedActivities && (
              <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-lg text-purple-800">
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <Activity className="w-4 h-4 text-purple-600" />
                  Vận động & Khuyên dùng:
                </div>
                {renderList(aiResult.suggestedActivities)}
              </div>
            )}

            {/* Câu hỏi theo dõi */}
            {aiResult.followUpQuestions && (
              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-900">
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <HelpCircle className="w-4 h-4 text-blue-600" />
                  Gợi ý theo dõi thêm:
                </div>
                {renderList(aiResult.followUpQuestions)}
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic text-center py-2">
            Nhấn "Tư Vấn Sức Khỏe AI" để phân tích toàn bộ nhật ký sức khỏe của bạn.
          </p>
        )}

        {/* Nút bấm bên dưới */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleConsult}
            disabled={loading}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 text-xs disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? 'Đang Phân Tích...' : 'Tư Vấn Sức Khỏe AI'}
          </button>

          <button
            type="button"
            onClick={() => setShowHistoryModal(true)}
            title="Xem lại kết quả tư vấn cũ"
            className="p-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition flex items-center justify-center relative"
          >
            <History className="w-5 h-5" />
            {historyList.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {historyList.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Modal Lịch Sử Kết Quả Cũ */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-5 shadow-xl space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                <History className="w-4 h-4 text-indigo-600" />
                Lịch Sử Phân Tích Sức Khỏe
              </h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 pr-1">
              {historyList.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">
                  Chưa có lịch sử tư vấn nào được lưu.
                </p>
              ) : (
                historyList.map((item, index) => {
                  const res = item.result || {};
                  const summaryText =
                    renderText(res.summary) ||
                    renderText(res.causeAnalysis) ||
                    renderText(res.advice) ||
                    'Không có tóm tắt';

                  return (
                    <div
                      key={item.id || index}
                      onClick={() => {
                        setAiResult(res);
                        setShowHistoryModal(false);
                      }}
                      className="p-3 border border-slate-200 rounded-xl hover:border-indigo-400 hover:bg-indigo-50/30 cursor-pointer transition text-xs space-y-1"
                    >
                      <div className="flex justify-between items-center font-bold text-slate-700">
                        <span>Mẫu phân tích #{historyList.length - index}</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          {item.createdAt?.seconds
                            ? new Date(item.createdAt.seconds * 1000).toLocaleString('vi-VN')
                            : 'Vừa xong'}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-slate-600">{summaryText}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}