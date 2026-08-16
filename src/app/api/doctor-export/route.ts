import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { userProfile, healthLogs, timeframe } = await req.json();

    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterApiKey) {
      return NextResponse.json(
        { error: 'OpenRouter API Key chưa được cấu hình.' },
        { status: 500 }
      );
    }

    const systemPrompt = `
Bạn là chuyên gia Y tế kiêm Trợ lý Y khoa Cao cấp.
Nhiệm vụ của bạn là tổng hợp nhật ký sức khỏe cá nhân của bệnh nhân trong khoảng thời gian: ${timeframe} để tạo một "BÁO CÁO Y KHOA DÀNH CHO BÁC SĨ TƯ VẤN/ĐIỀU TRỊ".

Báo cáo phải tuân thủ chuẩn y khoa chuyên sâu và trả về JSON hợp lệ theo cấu trúc sau (không kèm markdown bên ngoài):
{
  "vitalsSummary": {
    "bmi": "Chỉ số BMI tính từ chiều cao và cân nặng",
    "bloodPressure": "Tình trạng huyết áp trung bình/gần nhất",
    "heartRate": "Tình trạng nhịp tim trung bình/gần nhất",
    "labResults": "Tóm tắt các kết quả xét nghiệm đáng chú ý (nếu có)"
  },
  "logAnalysis": {
    "nutritionSummary": "Tổng quan chế độ nạp thực phẩm/thuốc và các nguy cơ tiềm ẩn",
    "activitySummary": "Tổng quan mức độ vận động thể chất/trí não",
    "symptomTrends": "Tần suất, diễn biến và chu kỳ xuất hiện triệu chứng"
  },
  "doctorRecommendations": {
    "suspectedIssues": "Các vấn đề y khoa nghi ngờ hoặc cần khám chuyên sâu",
    "suggestedTests": "Các chỉ định kiểm tra/xét nghiệm cận lâm sàng khuyến nghị bác sĩ nên xem xét",
    "treatmentOrientation": "Định hướng/phương án trị liệu và lưu ý đối với thể trạng riêng của bệnh nhân"
  }
}
`;

    const userPrompt = `
- Hồ sơ bệnh nhân:
  + Họ tên: ${userProfile?.fullName || 'N/A'}
  + Năm sinh: ${userProfile?.birthYear || 'N/A'}
  + Cân nặng: ${userProfile?.weight || 'N/A'} kg
  + Chiều cao: ${userProfile?.height || 'N/A'} cm
  + Nhóm máu: ${userProfile?.bloodType || 'N/A'}

- Toàn bộ dữ liệu nhật ký trong khoảng thời gian (${timeframe}):
${JSON.stringify(healthLogs, null, 2)}
`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'PHA Doctor Export',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Lỗi khi tạo báo cáo từ AI' }, { status: 500 });
    }

    const data = await response.json();
    const parsedReport = JSON.parse(data.choices[0]?.message?.content);

    return NextResponse.json({ success: true, report: parsedReport });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi xử lý hệ thống' }, { status: 500 });
  }
}
