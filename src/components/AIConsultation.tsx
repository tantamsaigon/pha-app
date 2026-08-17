'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, orderBy, serverTimestamp } from 'firebase/firestore';
import { Bot, Sparkles, AlertTriangle, HelpCircle, Volume2, History, X, Loader2 } from 'lucide-react';

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

  // Tải danh sách các lần tư vấn cũ từ Firestore
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

      // Sắp xếp mới nhất lên đầu
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setHistoryList(list);
    } catch (err) {
      console.error('Lỗi khi tải lịch sử tư vấn:', err);
    }
  };

  useEffect(() => {
    loadConsultationHistory();
  }, [userProfile]);

  // Hàm đọc lời khuyên AI bằng Text-to-Speech
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

  // Hàm gọi AI Tư Vấn
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

      // Lưu kết quả tư vấn vào Firestore
      if (userProfile?.uid) {
        await addDoc(collection(db, 'ai_consultations'), {
          userId: userProfile.uid,
          result: data,
          createdAt: serverTimestamp(),
        });
        loadConsultationHistory(); // Cập nhật lại danh sách lịch sử
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
      {/* Header & Nút Thao Tác */}
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-800">Tư Vấn Sức Khỏe AI</h2>
        </div>

        <div className="flex items-center gap-2">
          {/* NÚT XEM LỊCH SỬ TƯ VẤN CŨ */}
          <button
            onClick={() => setShowHistoryModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
          >
            <History className="w-3.5 h-3.5" />
            Lịch sử ({historyList.length})
          </button>

          <button
            onClick={handleConsult}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {loading ? 'Đang phân tích...' : 'Phân Tích Ngay'}
          </button>
        </div>
      </div>

      {/* Kết quả tư vấn mới nhất / Hiện tại */}
      {aiResult ? (
        <div className="space-y-4 bg-indigo-50/40 p-4 rounded-xl border border-indigo-100 text-xs text-slate-700">
          <div className="flex justify-between items-center border-b border-indigo-100 pb-2">
            <span className="font-bold text-indigo-900 text-sm">Kết Quả Phân Tích</span>
            <button
              onClick={() => handleSpeak(`${aiResult.summary}. ${aiResult.advice}`)}
              className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md transition ${
                isSpeaking ? 'bg-amber-100 text-amber-700' : 'bg-white text-indigo-700 hover:bg-indigo-100'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              {isSpeaking ? 'Đang đọc...' : 'Đọc lời khuyên'}
            </button>
          </div>

          <div>
            <p className="font-bold text-slate-800">Tóm tắt tình trạng:</p>
            <p className="mt-0.5 text-slate-600">{aiResult.summary}</p>
          </div>

          <div>
            <p className="font-bold text-slate-800">Lời khuyên từ AI:</p>
            <p className="mt-0.5 text-slate-600 whitespace-pre-line">{aiResult.advice}</p>
          </div>

          {aiResult.firstAid && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
              <div className="flex items-center gap-1.5 font-bold mb-1">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Sơ cứu / Xử lý nhanh:
              </div>
              <p>{aiResult.firstAid}</p>
            </div>
          )}

          {aiResult.followUpQuestions && (
            <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-900">
              <div className="flex items-center gap-1.5 font-bold mb-1">
                <HelpCircle className="w-4 h-4 text-blue-600" />
                Gợi ý câu hỏi kiểm tra lại:
              </div>
              <p>{aiResult.followUpQuestions}</p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-slate-500 italic text-center py-4">
          Nhấn "Phân Tích Ngay" để AI tổng hợp nhật ký và đưa ra lời khuyên sức khỏe.
        </p>
      )}

      {/* MODAL LỊCH SỬ TƯ VẤN CỦ */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-5 shadow-xl space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
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
                historyList.map((item, index) => (
                  <div
                    key={item.id || index}
                    onClick={() => {
                      setAiResult(item.result);
                      setShowHistoryModal(false);
                    }}
                    className="p-3 border rounded-xl hover:border-indigo-400 hover:bg-indigo-50/30 cursor-pointer transition text-xs space-y-1"
                  >
                    <div className="flex justify-between items-center font-bold text-slate-700">
                      <span>Mẫu phân tích #{historyList.length - index}</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        {item.createdAt?.seconds
                          ? new Date(item.createdAt.seconds * 1000).toLocaleString('vi-VN')
                          : 'Vừa xong'}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-slate-600">
                      {item.result?.summary || 'Không có tóm tắt'}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}