'use client';

import React, { useState } from 'react';
import { Volume2, Square, Sparkles, Loader2, AlertCircle, HelpCircle } from 'lucide-react';
import { playGTTSQueue, stopTTS } from '@/lib/ttsHelper';

interface Advice {
  causeAnalysis: string;
  firstAidAndCare?: string;
  medicalRecommendation: string;
  nextMealMenu: string[];
  suggestedActivities: string;
  followUpQuestions?: string;
}

export default function AIConsultation({ userProfile, healthLogs }: { userProfile: any, healthLogs: any[] }) {
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState<Advice | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

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
      if (result.success) {
        setAdvice(result.advice);
      } else {
        alert('Có lỗi xảy ra: ' + result.error);
      }
    } catch (err) {
      alert('Không thể kết nối với máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  // Hàm xử lý đọc gTTS tiếng Việt
  const handleToggleSpeakAI = () => {
    if (isSpeaking) {
      stopTTS();
      setIsSpeaking(false);
    } else {
      if (!advice) return;

      setIsSpeaking(true);

      // Chuyển mảng thực đơn thành chuỗi đọc liền mạch
      const menuText = advice.nextMealMenu ? advice.nextMealMenu.join(', ') : 'Không có';

      // Ghép nội dung theo đúng cấu trúc của `advice` nâng cấp
      const fullTextToRead = `
        Kết quả phân tích AI. 
        Phân tích nguyên nhân: ${advice.causeAnalysis || ''}. 
        ${advice.firstAidAndCare ? `Sơ cấp cứu và xử lý khẩn cấp: ${advice.firstAidAndCare}.` : ''}
        Lời khuyên y tế và chẩn đoán: ${advice.medicalRecommendation || ''}. 
        Thực đơn bữa tiếp theo gồm: ${menuText}. 
        Hoạt động gợi ý: ${advice.suggestedActivities || ''}.
        ${advice.followUpQuestions ? `Câu hỏi cần làm rõ thêm: ${advice.followUpQuestions}.` : ''}
      `;

      // Gọi gTTS đọc tiếng Việt
      playGTTSQueue(fullTextToRead, () => {
        setIsSpeaking(false);
      });
    }
  };

  return (
    <div className="max-w-lg mx-auto mt-6 bg-white shadow-md rounded-xl p-4 space-y-4">
      <button
        onClick={handleGetConsultation}
        disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
        {loading ? 'AI Đang Phân Tích...' : 'Tư Vấn Sức Khỏe AI'}
      </button>

      {advice && (
        <div className="mt-4 border-t pt-4 space-y-4 text-gray-800">
          <div className="flex justify-between items-center border-b pb-2">
            <h3 className="text-lg font-bold text-indigo-900">Kết Quả Phân Tích AI</h3>
            <button
              type="button"
              onClick={handleToggleSpeakAI}
              className={`p-2 rounded-full transition-all ${
                isSpeaking
                  ? 'bg-amber-500 text-white animate-pulse'
                  : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
              }`}
              title={isSpeaking ? "Tạm dừng đọc" : "Đọc kết quả phân tích"}
            >
              {isSpeaking ? (
                <Square className="w-5 h-5 fill-current" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Nguyên nhân */}
          <div>
            <h4 className="font-semibold text-indigo-700">🔍 Phân Tích Nguyên Nhân:</h4>
            <p className="text-sm text-gray-600 mt-1">{advice.causeAnalysis}</p>
          </div>

          {/* Sơ cấp cứu khẩn cấp (Nếu có) */}
          {advice.firstAidAndCare && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <h4 className="font-semibold text-red-700 flex items-center gap-1">
                <AlertCircle className="w-4 h-4 text-red-600" /> Sơ Cấp Cứu & Xử Lý Ban Đầu:
              </h4>
              <p className="text-sm text-red-800 mt-1 whitespace-pre-line">{advice.firstAidAndCare}</p>
            </div>
          )}

          {/* Lời khuyên y tế / Chẩn đoán */}
          <div>
            <h4 className="font-semibold text-emerald-700">🩺 Lời Khuyên Y Tế & Chẩn Đoán:</h4>
            <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{advice.medicalRecommendation}</p>
          </div>

          {/* Thực đơn */}
          <div>
            <h4 className="font-semibold text-orange-700">🥗 Thực Đơn Bữa Tiếp Theo (Ưu tiên sẵn có):</h4>
            <ul className="list-disc list-inside text-sm text-gray-600 mt-1 space-y-1">
              {advice.nextMealMenu?.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          {/* Hoạt động */}
          <div>
            <h4 className="font-semibold text-blue-700">🏃 Hoạt Động & Phòng Ngừa:</h4>
            <p className="text-sm text-gray-600 mt-1">{advice.suggestedActivities}</p>
          </div>

          {/* Câu hỏi cần hỏi thêm (Nếu có) */}
          {advice.followUpQuestions && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <h4 className="font-semibold text-purple-700 flex items-center gap-1">
                <HelpCircle className="w-4 h-4 text-purple-600" /> Câu Hỏi AI Cần Bạn Làm Rõ:
              </h4>
              <p className="text-sm text-purple-900 mt-1 italic">{advice.followUpQuestions}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}