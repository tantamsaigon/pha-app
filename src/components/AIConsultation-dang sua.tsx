'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { 
  Bot, Sparkles, AlertTriangle, HelpCircle, Volume2, History, 
  Loader2, Utensils, Activity, Calendar, ArrowLeft, RefreshCw, FileText 
} from 'lucide-react';

interface AIConsultationProps {
  userProfile: any;
  healthLogs: any[];
}

export default function AIConsultation({ userProfile, healthLogs }: AIConsultationProps) {
  const [loading, setLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any | null>(null);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'current' | 'history'>('current');
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any | null>(null);

  // Trích xuất chuỗi thuần từ bất kỳ kiểu dữ liệu nào (String, Array, Object)
  const extractCleanText = (val: any): string => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (Array.isArray(val)) {
      return val.map(item => extractCleanText(item)).filter(Boolean).join('. ');
    }
    if (typeof val === 'object') {
      return Object.values(val).map(v => extractCleanText(v)).filter(Boolean).join('. ');
    }
    return String(val);
  };

  // Hàm chuẩn hóa dữ liệu trả về từ AI để luôn lấy đúng các mục dù AI dùng key nào
  const parseConsultationData = (data: any) => {
    if (!data) return {};

    // Tìm trường dữ liệu trong object chính hoặc object con lồng nhau
    const findField = (...keys: string[]) => {
      for (const key of keys) {
        if (data[key] !== undefined && data[key] !== null) return data[key];
      }
      return null;
    };

    return {
      summary: findField('summary', 'causeAnalysis', 'cause_analysis', 'tomTat', 'nguyenNhan'),
      advice: findField('advice', 'medicalRecommendation', 'medical_recommendation', 'loiKhuyen', 'phanTich'),
      firstAid: findField('firstAid', 'firstAidAndCare', 'first_aid', 'soCuu'),
      nextMealMenu: findField('nextMealMenu', 'next_meal_menu', 'thucDon', 'dinhDuong'),
      suggestedActivities: findField('suggestedActivities', 'suggested_activities', 'vanDong', 'hoatDong'),
      followUpQuestions: findField('followUpQuestions', 'follow_up_questions', 'cauHoi', 'theoDoi'),
      raw: data
    };
  };

  // Helper render danh sách/văn bản
  const renderContentBlock = (value: any) => {
    if (!value) return null;
    if (Array.isArray(value)) {
      return (
        <ul className="list-disc pl-4 space-y-1 mt-1 text-slate-700">
          {value.map((item, idx) => (
            <li key={idx}>{extractCleanText(item)}</li>
          ))}
        </ul>
      );
    }
    const text = extractCleanText(value);
    if (!text) return null;
    return <p className="mt-1 text-slate-700 whitespace-pre-line leading-relaxed">{text}</p>;
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
      setSelectedHistoryItem(null);
      setActiveSubTab('current');

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

  // Render toàn bộ các khối phân tích y tế
  const renderConsultationDetail = (rawData: any, titleSuffix?: string) => {
    if (!rawData) return null;
    const parsed = parseConsultationData(rawData);

    // Chuẩn bị văn bản để phát âm thanh
    const fullSpeechText = [
      parsed.summary && `Tóm tắt: ${extractCleanText(parsed.summary)}`,
      parsed.advice && `Lời khuyên: ${extractCleanText(parsed.advice)}`,
      parsed.firstAid && `Sơ cứu: ${extractCleanText(parsed.firstAid)}`
    ].filter(Boolean).join('. ');

    return (
      <div className="space-y-3.5 text-xs">
        {/* Header Chi Tiết */}
        <div className="flex justify-between items-center bg-indigo-50/80 p-3 rounded-xl border border-indigo-100">
          <span className="font-bold text-indigo-900 text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            {titleSuffix ? `Bản Phân Tích (${titleSuffix})` : 'Kết Quả Phân Tích AI Mới Nhất'}
          </span>
          {fullSpeechText && (
            <button
              onClick={() => handleSpeak(fullSpeechText)}
              className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition ${
                isSpeaking 
                  ? 'bg-amber-100 text-amber-700 border border-amber-300' 
                  : 'bg-white text-indigo-700 hover:bg-indigo-100 border border-indigo-200 shadow-xs'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              {isSpeaking ? 'Đang đọc...' : 'Đọc kết quả'}
            </button>
          )}
        </div>

        {/* 1. Tóm Tắt & Phân Tích Nguyên Nhân */}
        {parsed.summary && (
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
              <FileText className="w-4 h-4 text-slate-600" />
              Phân Tích & Nguyên Nhân
            </div>
            {renderContentBlock(parsed.summary)}
          </div>
        )}

        {/* 2. Lời Khuyên Chuyên Môn / Y Tế */}
        {parsed.advice && (
          <div className="p-3.5 bg-indigo-50/50 border border-indigo-200/80 rounded-xl space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-indigo-900 text-xs">
              <Bot className="w-4 h-4 text-indigo-600" />
              Lời Khuyên & Khuyến Nghị Chuyên Môn
            </div>
            {renderContentBlock(parsed.advice)}
          </div>
        )}

        {/* 3. Sơ Cứu & Khẩn Cấp */}
        {parsed.firstAid && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-900 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Hướng Dẫn Sơ Cứu & Chăm Sóc Khẩn Cấp
            </div>
            {renderContentBlock(parsed.firstAid)}
          </div>
        )}

        {/* 4. Gợi Ý Thực Đơn Dinh Dưỡng */}
        {parsed.nextMealMenu && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-emerald-900 text-xs">
              <Utensils className="w-4 h-4 text-emerald-600" />
              Gợi Ý Thực Đơn Bữa Ăn Tiếp Theo
            </div>
            {renderContentBlock(parsed.nextMealMenu)}
          </div>
        )}

        {/* 5. Vận Động & Hoạt Động */}
        {parsed.suggestedActivities && (
          <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-purple-900 text-xs">
              <Activity className="w-4 h-4 text-purple-600" />
              Hoạt Động & Bài Tập Phù Hợp
            </div>
            {renderContentBlock(parsed.suggestedActivities)}
          </div>
        )}

        {/* 6. Gợi Ý Theo Dõi Thêm */}
        {parsed.followUpQuestions && (
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-blue-900 text-xs">
              <HelpCircle className="w-4 h-4 text-blue-600" />
              Câu Hỏi / Triệu Chứng Cần Theo Dõi Thêm
            </div>
            {renderContentBlock(parsed.followUpQuestions)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-5">
      {/* Header & Sub Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-800">Tư Vấn Sức Khỏe AI</h2>
        </div>

        {/* Sub-Tab Navigation Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl gap-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setActiveSubTab('current');
              setSelectedHistoryItem(null);
            }}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              activeSubTab === 'current' ? 'bg-white text-indigo-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            Kết Quả Hiện Tại
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('history')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 relative ${
              activeSubTab === 'history' ? 'bg-white text-indigo-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5 text-slate-500" />
            Lịch Sử
            {historyList.length > 0 && (
              <span className="bg-indigo-600 text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold ml-0.5">
                {historyList.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Action Button: Phân Tích Mới */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleConsult}
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 text-xs shadow-sm disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? 'Đang Phân Tích Dữ Liệu Sức Khỏe...' : 'Chạy Phân Tích AI Ngay'}
        </button>
      </div>

      {/* Nội dung Tab 1: Kết Quả Hiện Tại */}
      {activeSubTab === 'current' && (
        <div>
          {aiResult ? (
            renderConsultationDetail(aiResult)
          ) : (
            <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl space-y-2">
              <Bot className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500 font-medium">
                Chưa có kết quả tư vấn nào cho phiên làm việc này.
              </p>
              <p className="text-[11px] text-slate-400">
                Nhấn nút <span className="font-bold text-indigo-600">"Chạy Phân Tích AI Ngay"</span> phía trên để AI xem xét nhật ký gần đây của bạn.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Nội dung Tab 2: Lịch Sử Tư Vấn */}
      {activeSubTab === 'history' && (
        <div className="space-y-4">
          {selectedHistoryItem ? (
            /* Chi tiết 1 bản ghi lịch sử được chọn xem */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setSelectedHistoryItem(null)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 py-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Quay lại danh sách lịch sử
                </button>
                <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {selectedHistoryItem.createdAt?.seconds
                    ? new Date(selectedHistoryItem.createdAt.seconds * 1000).toLocaleString('vi-VN')
                    : 'Gần đây'}
                </span>
              </div>
              {renderConsultationDetail(
                selectedHistoryItem.result,
                selectedHistoryItem.createdAt?.seconds
                  ? new Date(selectedHistoryItem.createdAt.seconds * 1000).toLocaleDateString('vi-VN')
                  : ''
              )}
            </div>
          ) : (
            /* Danh sách lịch sử */
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              <div className="flex justify-between items-center text-xs text-slate-500 pb-1">
                <span>Tổng số bản ghi: <strong>{historyList.length}</strong></span>
                <button 
                  onClick={loadConsultationHistory}
                  className="text-slate-400 hover:text-indigo-600 flex items-center gap-1 text-[11px]"
                >
                  <RefreshCw className="w-3 h-3" /> Làm mới
                </button>
              </div>

              {historyList.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                  <p className="text-xs text-slate-500">Chưa có lịch sử tư vấn nào được lưu.</p>
                </div>
              ) : (
                historyList.map((item, index) => {
                  const parsed = parseConsultationData(item.result);
                  const previewText = 
                    extractCleanText(parsed.summary) || 
                    extractCleanText(parsed.advice) || 
                    'Bản ghi tư vấn y tế';

                  return (
                    <div
                      key={item.id || index}
                      onClick={() => setSelectedHistoryItem(item)}
                      className="p-3 bg-slate-50/70 border border-slate-200 rounded-xl hover:border-indigo-400 hover:bg-indigo-50/30 cursor-pointer transition text-xs space-y-1.5"
                    >
                      <div className="flex justify-between items-center font-bold text-slate-700">
                        <span className="flex items-center gap-1.5 text-indigo-950">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                          Lần tư vấn #{historyList.length - index}
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          {item.createdAt?.seconds
                            ? new Date(item.createdAt.seconds * 1000).toLocaleString('vi-VN')
                            : 'Mới xong'}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-slate-600 leading-relaxed pl-5">
                        {previewText}
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