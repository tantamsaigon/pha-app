'use client';

import React, { useState, useEffect } from 'react';
import { Volume2, Square, Sparkles, Loader2, History, AlertTriangle, ArrowLeft, Flame, Zap, Activity, CheckCircle2, Utensils, BicepsFlexed } from 'lucide-react';
import { playGTTSQueue, stopTTS } from '@/lib/ttsHelper';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';

interface MacroDetail {
  grams: number;
  foods: string[];
}

interface MacroNutrientsDetailed {
  carbs: MacroDetail;
  protein: MacroDetail;
  fat: MacroDetail;
}

interface EnergyBalance {
  timeWindow: string;
  caloriesConsumed: number;
  macrosConsumed: MacroNutrientsDetailed;
  caloriesBurned: number;
  activityBreakdown: string[];
  netCalories: number;
  energyStatus: 'SURPLUS' | 'DEFICIT' | 'BALANCED';
  healthWarning: string;
}

interface Advice {
  isSymptomResolved?: boolean;
  causeAnalysis: string;
  medicalRecommendation: string;
  firstAid?: string;
  energyBalance6h?: EnergyBalance;
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
        
        const formattedAdvice: Advice = {
          isSymptomResolved: data.isSymptomResolved || false,
          causeAnalysis: data.causeAnalysis || data.summary || '',
          medicalRecommendation: data.medicalRecommendation || data.advice || '',
          firstAid: data.firstAid || data.firstAidAndCare || '',
          energyBalance6h: data.energyBalance6h || undefined,
          nextMealMenu: Array.isArray(data.nextMealMenu) ? data.nextMealMenu : [],
          suggestedActivities: data.suggestedActivities || '',
        };

        setAdvice(formattedAdvice);
        setSelectedHistory(null);
        setActiveTab('current');

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

  const handleToggleSpeakAI = (dataToRead: Advice | null) => {
    if (isSpeaking) {
      stopTTS();
      setIsSpeaking(false);
    } else {
      if (!dataToRead) return;

      setIsSpeaking(true);

      // 1. Phân tích nguyên nhân / Trạng thái sức khỏe
      const causeText = dataToRead.causeAnalysis ? `${dataToRead.causeAnalysis}. ` : '';

      // 2. Hướng dẫn sơ cứu (nếu triệu chứng chưa hết)
      const firstAidText = (!dataToRead.isSymptomResolved && dataToRead.firstAid) 
        ? `Hướng dẫn sơ cứu: ${dataToRead.firstAid}. ` 
        : '';

      // 3. Thông tin Cân bằng Năng lượng & Dinh dưỡng (MỚI BỔ SUNG)
      let energyText = '';
      if (dataToRead.energyBalance6h) {
        const eb = dataToRead.energyBalance6h;
        energyText += `Phân tích năng lượng trong ${eb.timeWindow || '6 giờ qua'}: `;
        energyText += `Năng lượng nạp vào là ${eb.caloriesConsumed} kcal, tiêu hao ${eb.caloriesBurned} kcal. `;

        if (eb.macrosConsumed) {
          const { carbs, protein, fat } = eb.macrosConsumed;
          energyText += `Phân rã dinh dưỡng: `;
          if (carbs) {
            energyText += `Tinh bột ${carbs.grams} gam${carbs.foods?.length ? `, gồm các món ${carbs.foods.join(', ')}` : ''}. `;
          }
          if (protein) {
            energyText += `Đạm ${protein.grams} gam${protein.foods?.length ? `, gồm các món ${protein.foods.join(', ')}` : ''}. `;
          }
          if (fat) {
            energyText += `Chất béo ${fat.grams} gam${fat.foods?.length ? `, gồm các món ${fat.foods.join(', ')}` : ''}. `;
          }
        }

        if (eb.activityBreakdown && eb.activityBreakdown.length > 0) {
          energyText += `Các hoạt động tiêu hao gồm có: ${eb.activityBreakdown.join(', ')}. `;
        }

        if (eb.healthWarning) {
          energyText += `Khuyên nghị năng lượng: ${eb.healthWarning}. `;
        }
      }

      // 4. Lời khuyên y tế
      const medicalText = dataToRead.medicalRecommendation 
        ? `Lời khuyên y tế: ${dataToRead.medicalRecommendation}. ` 
        : '';

      // 5. Thực đơn tiếp theo
      const menuText = dataToRead.nextMealMenu?.length > 0 
        ? `Thực đơn gợi ý cho bữa tiếp theo gồm: ${dataToRead.nextMealMenu.join(', ')}. ` 
        : '';

      // 6. Hoạt động gợi ý
      const activityText = dataToRead.suggestedActivities 
        ? `Hoạt động gợi ý: ${dataToRead.suggestedActivities}.` 
        : '';

      // Ghép toàn bộ nội dung thành văn bản đọc hoàn chỉnh
      const fullTextToRead = `
        Kết quả phân tích sức khỏe AI. 
        ${causeText}
        ${firstAidText}
        ${energyText}
        ${medicalText}
        ${menuText}
        ${activityText}
      `.trim();

      playGTTSQueue(fullTextToRead, () => setIsSpeaking(false));
    }
  };

  const renderAdviceContent = (data: Advice, isHistoryView = false) => {
    const eb = data.energyBalance6h;

    return (
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
          >
            {isSpeaking ? <Square className="w-5 h-5 fill-current" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>

        {/* 🔍 Phân Tích Nguyên Nhân HOẶC Lời Chúc Mừng */}
        {data.causeAnalysis && (
          <div className={`p-3 rounded-xl border ${data.isSymptomResolved ? 'bg-emerald-50/80 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}>
            <h4 className={`font-bold flex items-center gap-1.5 ${data.isSymptomResolved ? 'text-emerald-800' : 'text-indigo-700'}`}>
              {data.isSymptomResolved ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : '🔍 Phân Tích Nguyên Nhân:'}
              {data.isSymptomResolved ? 'Trạng Thái Sức Khỏe Hiện Tại:' : ''}
            </h4>
            <p className="text-sm mt-1 leading-relaxed text-gray-700">{data.causeAnalysis}</p>
          </div>
        )}

        {/* ⚠️ Hướng Dẫn Sơ Cứu (Chỉ hiện khi chưa hết triệu chứng) */}
        {!data.isSymptomResolved && data.firstAid && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="font-semibold text-red-700 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              Hướng Dẫn Sơ Cứu Ban Đầu:
            </h4>
            <p className="text-sm text-red-800 mt-1 whitespace-pre-line">{data.firstAid}</p>
          </div>
        )}

        {/* ⚡ Cân Bằng Năng Lượng & Dinh Dưỡng 6 Giờ */}
        {eb && (
          <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl space-y-3">
            <div className="flex justify-between items-center border-b border-amber-200 pb-2">
              <h4 className="font-bold text-amber-900 flex items-center gap-1.5 text-sm">
                <Zap className="w-4 h-4 text-amber-600 fill-amber-500" />
                Năng Lượng & Dinh Dưỡng (6 Giờ Qua)
              </h4>
              <span className="text-[11px] font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                {eb.timeWindow || '6h gần nhất'}
              </span>
            </div>

            {/* Tổng Calo Nạp / Đốt */}
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-white p-2 rounded-lg border border-amber-100 shadow-sm">
                <span className="text-xs text-gray-500 block">Nạp vào (Thực phẩm)</span>
                <span className="text-base font-extrabold text-blue-600 flex items-center justify-center gap-0.5">
                  <Activity className="w-4 h-4 text-blue-500" />
                  +{eb.caloriesConsumed} kcal
                </span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-amber-100 shadow-sm">
                <span className="text-xs text-gray-500 block">Tiêu hao (Vận động)</span>
                <span className="text-base font-extrabold text-amber-700 flex items-center justify-center gap-0.5">
                  <Flame className="w-4 h-4 text-orange-500" />
                  -{eb.caloriesBurned} kcal
                </span>
              </div>
            </div>

            {/* Chi tiết Phân rã 3 nhóm chất + Tên Thực Phẩm (MỚI) */}
            {eb.macrosConsumed && (
              <div className="bg-white p-2.5 rounded-lg border border-amber-100 text-xs space-y-2">
                <div className="font-semibold text-gray-700 flex items-center gap-1">
                  <Utensils className="w-3.5 h-3.5 text-amber-600" /> Phân rã dinh dưỡng & Thực phẩm đã nạp:
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {/* Tinh bột */}
                  <div className="bg-orange-50/80 p-2 rounded border border-orange-100">
                    <span className="font-bold text-orange-900">Tinh bột: {eb.macrosConsumed.carbs?.grams || 0}g</span>
                    {eb.macrosConsumed.carbs?.foods?.length > 0 && (
                      <p className="text-[11px] text-orange-700 mt-0.5">
                        Món liên quan: {eb.macrosConsumed.carbs.foods.join(', ')}
                      </p>
                    )}
                  </div>
                  {/* Đạm */}
                  <div className="bg-emerald-50/80 p-2 rounded border border-emerald-100">
                    <span className="font-bold text-emerald-900">Đạm: {eb.macrosConsumed.protein?.grams || 0}g</span>
                    {eb.macrosConsumed.protein?.foods?.length > 0 && (
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        Món liên quan: {eb.macrosConsumed.protein.foods.join(', ')}
                      </p>
                    )}
                  </div>
                  {/* Chất béo */}
                  <div className="bg-purple-50/80 p-2 rounded border border-purple-100">
                    <span className="font-bold text-purple-900">Chất béo: {eb.macrosConsumed.fat?.grams || 0}g</span>
                    {eb.macrosConsumed.fat?.foods?.length > 0 && (
                      <p className="text-[11px] text-purple-700 mt-0.5">
                        Món liên quan: {eb.macrosConsumed.fat.foods.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Chi tiết Hoạt động & Năng lượng Tiêu hao (MỚI) */}
            {eb.activityBreakdown && eb.activityBreakdown.length > 0 && (
              <div className="bg-white p-2.5 rounded-lg border border-amber-100 text-xs space-y-1">
                <div className="font-semibold text-gray-700 flex items-center gap-1">
                  <BicepsFlexed className="w-3.5 h-3.5 text-blue-600" /> Hoạt động tiêu hao năng lượng:
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-gray-600 pl-1">
                  {eb.activityBreakdown.map((act, idx) => (
                    <li key={idx} className="leading-tight">{act}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Khuyên nghị AI */}
            {eb.healthWarning && (
              <p className="text-xs text-amber-900 bg-amber-100/80 p-2 rounded-lg leading-relaxed font-medium">
                💡 <b>Khuyên nghị AI:</b> {eb.healthWarning}
              </p>
            )}
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
            <h4 className="font-semibold text-orange-700">🥗 Thực Đơn Bữa Tiếp Theo (Tối Ưu Calo):</h4>
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
  };

  return (
    <div className="max-w-lg mx-auto mt-6 bg-white shadow-md rounded-xl p-4 space-y-4">
      <div className="flex justify-between items-center bg-gray-100 p-1 rounded-lg text-sm font-semibold">
        <button
          onClick={() => { setActiveTab('current'); setSelectedHistory(null); }}
          className={`flex-1 py-1.5 rounded-md transition ${activeTab === 'current' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500'}`}
        >
          Tư Vấn Mới
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-1.5 rounded-md transition flex items-center justify-center gap-1 ${activeTab === 'history' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500'}`}
        >
          <History className="w-4 h-4" /> Lịch Sử ({historyList.length})
        </button>
      </div>

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

      {activeTab === 'history' && (
        <div>
          {selectedHistory ? (
            <div>
              <button onClick={() => setSelectedHistory(null)} className="text-sm font-semibold text-indigo-600 hover:underline flex items-center gap-1 mb-2">
                <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
              </button>
              {renderAdviceContent(selectedHistory.advice, true)}
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {historyList.map((item, idx) => (
                <div key={item.id || idx} onClick={() => setSelectedHistory(item)} className="p-3 bg-gray-50 border rounded-lg hover:border-indigo-400 cursor-pointer transition">
                  <div className="flex justify-between items-center text-xs font-bold text-indigo-900">
                    <span>Lần tư vấn #{historyList.length - idx}</span>
                    <span className="text-gray-400 font-normal">
                      {item.createdAt?.seconds ? new Date(item.createdAt.seconds * 1000).toLocaleString('vi-VN') : 'Gần đây'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2 mt-1">
                    {item.advice?.causeAnalysis || 'Xem chi tiết...'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
