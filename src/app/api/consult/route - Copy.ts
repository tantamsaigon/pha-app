import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';

export async function POST(req: Request) {
  try {
    const { userProfile, healthLogs } = await req.json();

    if (!userProfile?.uid) {
      return NextResponse.json({ error: 'Xác thực người dùng không hợp lệ.' }, { status: 401 });
    }

    // --- BẢO VỆ CHI PHÍ: RATE LIMITING (Tối đa 10 lần tư vấn/ngày/user) ---
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const consultationsRef = collection(db, 'ai_consultations');
    const q = query(
      consultationsRef,
      where('userId', '==', userProfile.uid),
      where('timestamp', '>=', Timestamp.fromDate(startOfDay))
    );
    const dailyConsultations = await getDocs(q);

    if (dailyConsultations.size >= 10) {
      return NextResponse.json(
        { error: 'Bạn đã đạt giới hạn 10 lượt tư vấn AI trong ngày. Vui lòng quay lại vào ngày mai!' },
        { status: 429 }
      );
    }
    // -----------------------------------------------------------------------

    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterApiKey) {
      return NextResponse.json(
        { error: 'OpenRouter API Key chưa được cấu hình.' },
        { status: 500 }
      );
    }

    const now = new Date();
    const thoi_gian_hien_tai = now.toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      dateStyle: "full",
      timeStyle: "medium"
    });

    const systemPrompt = `
Bạn là Trợ lý AI Phân tích Sức khỏe Cá nhân (Sổ Tay Sức Khỏe).
Thời gian hiện tại hệ thống: ${thoi_gian_hien_tai}
Nhiệm vụ của bạn là phân tích nguyên nhân triệu chứng dựa trên nhật ký thực phẩm/thuốc và hoạt động của người dùng.

DƯỚI ĐÂY LÀ QUY TẮC SUY LUẬN SINH HỌC (BIOLOGICAL-TIME REASONING):
1. Tiêu hóa thực phẩm: Phân tích thời gian tiêu hóa thực phẩm nạp vào, khả năng gây dị ứng, đầy hơi, tăng/giảm đường huyết.
2. Dược động học: Phân tích thời gian phát tán/bán thải của thuốc và tương tác giữa thuốc với thực phẩm.
3. Hoạt động: Phân tích mức độ tiêu hao năng lượng, phản ứng cơ bắp/trí não và tác động đến triệu chứng.

YÊU CẦU ĐỊNH DẠNG PHẢN HỒI (JSON hợp lệ):
{
  "causeAnalysis": "Phân tích nguyên nhân sinh học chi tiết...",
  "medicalRecommendation": "Lời khuyên theo dõi sức khỏe...",
  "nextMealMenu": [
    "Rau củ: ...",
    "Thịt/Cá: ...",
    "Cơm/Tinh bột: ...",
    "Canh: ..."
  ],
  "suggestedActivities": "Đề xuất hoạt động tiếp theo..."
}
`;

    const userPrompt = `
- Thông tin người dùng:
  + Cân nặng: ${userProfile?.weight || 'Chưa rõ'} kg
  + Chiều cao: ${userProfile?.height || 'Chưa rõ'} cm
  + Nhóm máu: ${userProfile?.bloodType || 'Chưa rõ'}
  
- Nhật ký sức khỏe gần đây:
${JSON.stringify(healthLogs, null, 2)}
`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'PHA Health Assistant',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Lỗi khi gọi OpenRouter API' }, { status: 500 });
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    const parsedAdvice = JSON.parse(content);

    return NextResponse.json({ success: true, advice: parsedAdvice });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi xử lý hệ thống' }, { status: 500 });
  }
}
