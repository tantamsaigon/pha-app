'use client';

import React, { useState } from 'react';
import { FileText, Download, Loader2, X, Stethoscope, Volume2, Square } from 'lucide-react';
import { playGTTSQueue, stopTTS } from '@/lib/ttsHelper';

type Timeframe = '1_week' | '1_month' | '3_months' | '6_months' | '1_year' | 'all';

export default function DoctorExportModal({ userProfile, healthLogs }: { userProfile: any, healthLogs: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [timeframe, setTimeframe] = useState<Timeframe>('1_month');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Hàm xử lý Bật/Tắt đọc gTTS
  const handleToggleRead = () => {
    if (isPlaying) {
      stopTTS();
      setIsPlaying(false);
    } else {
      if (!report) return;

      setIsPlaying(true);

      // Ghép nội dung báo cáo từ đối tượng `report` chính xác
      const fullReportText = `
        Báo cáo y khoa tổng hợp cho bác sĩ. 
        Mục 1: Sinh hiệu và chỉ số tổng quan. BMI: ${report.vitalsSummary?.bmi || 'Không có'}. Huyết áp: ${report.vitalsSummary?.bloodPressure || 'Không có'}. Nhịp tim: ${report.vitalsSummary?.heartRate || 'Không có'}. Xét nghiệm: ${report.vitalsSummary?.labResults || 'Không có'}.
        Mục 2: Tổng hợp diễn biến nhật ký. Dinh dưỡng và thuốc: ${report.logAnalysis?.nutritionSummary || 'Không có'}. Hoạt động: ${report.logAnalysis?.activitySummary || 'Không có'}. Diễn biến triệu chứng: ${report.logAnalysis?.symptomTrends || 'Không có'}.
        Mục 3: Đề xuất chuyên môn cho bác sĩ. Nghi ngờ hoặc cần kiểm tra: ${report.doctorRecommendations?.suspectedIssues || 'Không có'}. Chỉ định đề xuất: ${report.doctorRecommendations?.suggestedTests || 'Không có'}. Định hướng điều trị: ${report.doctorRecommendations?.treatmentOrientation || 'Không có'}.
      `;

      playGTTSQueue(fullReportText, () => {
        setIsPlaying(false);
      });
    }
  };

  // Hàm đóng Modal an toàn (dừng luôn tiếng đọc)
  const handleCloseModal = () => {
    stopTTS();
    setIsPlaying(false);
    setIsOpen(false);
  };

  const timeframeLabels: Record<Timeframe, string> = {
    '1_week': '1 Tuần',
    '1_month': '1 Tháng',
    '3_months': '3 Tháng',
    '6_months': '6 Tháng',
    '1_year': '1 Năm',
    'all': 'Toàn Bộ'
  };

  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/doctor-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userProfile,
          healthLogs,
          timeframe: timeframeLabels[timeframe]
        }),
      });
      const data = await res.json();
      if (data.success) {
        setReport(data.report);
      } else {
        alert('Không thể tạo báo cáo: ' + data.error);
      }
    } catch (err) {
      alert('Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2 mt-3"
      >
        <Stethoscope className="w-5 h-5" /> Xuất Dữ Liệu Cho Bác Sĩ
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 space-y-6 relative max-h-[90vh] overflow-y-auto">
            {/* Nút đóng góc trên bên phải */}
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-lg transition"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="border-b pb-3">
              <h2 className="text-xl font-bold text-teal-900 flex items-center gap-2">
                <FileText className="w-6 h-6 text-teal-700" /> Báo Cáo Y Khoa Tổng Hợp
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Tạo báo cáo chi tiết hỗ trợ bác sĩ trong quá trình chẩn đoán và điều trị.
              </p>
            </div>

            {/* Chọn thời gian */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Chọn khoảng thời gian xuất dữ liệu:</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {(Object.keys(timeframeLabels) as Timeframe[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => setTimeframe(key)}
                    className={`py-2 text-xs font-semibold rounded-lg border transition ${
                      timeframe === key
                        ? 'bg-teal-700 text-white border-teal-700'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {timeframeLabels[key]}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerateReport}
              disabled={loading}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 rounded-lg transition flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
              {loading ? 'Đang Tổng Hợp Dữ Liệu...' : `Tạo Báo Cáo (${timeframeLabels[timeframe]})`}
            </button>

            {/* Hiển thị Báo Cáo khi tạo xong */}
            {report && (
              <div className="border border-teal-100 bg-teal-50/30 rounded-xl p-4 space-y-4 text-sm text-gray-800">
                <div className="flex justify-between items-center border-b border-teal-200 pb-2">
                  <span className="font-bold text-teal-900">Báo Cáo Y Khoa Cho Bác Sĩ</span>
                  
                  {/* Nhóm nút công cụ Header Báo Cáo */}
                  <div className="flex items-center gap-2">
                    {/* NÚT gTTS ĐỌC BÁO CÁO */}
                    <button
                      type="button"
                      onClick={handleToggleRead}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        isPlaying
                          ? 'bg-amber-500 hover:bg-amber-600 text-white animate-pulse'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {isPlaying ? (
                        <>
                          <Square className="w-3.5 h-3.5 fill-current" /> Tạm Dừng Đọc
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5" /> Đọc Báo Cáo
                        </>
                      )}
                    </button>

                    {/* NÚT IN / LƯU PDF */}
                    <button
                      onClick={() => window.print()}
                      className="flex items-center gap-1 text-xs bg-teal-700 text-white px-3 py-1.5 rounded-lg hover:bg-teal-800 font-semibold transition"
                    >
                      <Download className="w-3.5 h-3.5" /> In / Lưu PDF
                    </button>
                  </div>
                </div>

                {/* 1. Sinh hiệu & Tóm tắt chỉ số */}
                <div>
                  <h4 className="font-bold text-teal-800">1. Sinh Hiệu & Chỉ Số Tổng Quan:</h4>
                  <p>• BMI: {report.vitalsSummary?.bmi}</p>
                  <p>• Huyết áp: {report.vitalsSummary?.bloodPressure}</p>
                  <p>• Nhịp tim: {report.vitalsSummary?.heartRate}</p>
                  <p>• Xét nghiệm: {report.vitalsSummary?.labResults}</p>
                </div>

                {/* 2. Tổng hợp Nhật ký */}
                <div>
                  <h4 className="font-bold text-teal-800">2. Tổng Hợp Diễn Biến Nhật Ký:</h4>
                  <p>• Dinh dưỡng/Thuốc: {report.logAnalysis?.nutritionSummary}</p>
                  <p>• Hoạt động: {report.logAnalysis?.activitySummary}</p>
                  <p>• Diễn biến triệu chứng: {report.logAnalysis?.symptomTrends}</p>
                </div>

                {/* 3. Khuyến nghị cho Bác sĩ */}
                <div className="bg-white p-3 rounded-lg border border-teal-200">
                  <h4 className="font-bold text-red-700">3. Đề Xuất Chuyên Môn Cho Bác Sĩ:</h4>
                  <p className="mt-1"><strong>Nghi ngờ / Cần kiểm tra:</strong> {report.doctorRecommendations?.suspectedIssues}</p>
                  <p className="mt-1"><strong>Chỉ định đề xuất:</strong> {report.doctorRecommendations?.suggestedTests}</p>
                  <p className="mt-1"><strong>Định hướng điều trị:</strong> {report.doctorRecommendations?.treatmentOrientation}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}