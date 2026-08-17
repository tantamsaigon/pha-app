import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';

export async function POST(req: Request) {
  try {
    const { userProfile, healthLogs } = await req.json();

    if (!userProfile?.uid) {
      return NextResponse.json({ error: 'Xác thực người dùng không hợp lệ.' }, { status: 401 });
    }

    // Rate Limiting (Tối đa 10 lần/ngày)
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

    const sortedLogs = Array.isArray(healthLogs) 
      ? [...healthLogs].sort((a, b) => {
          const timeA = new Date(`${a.date || '1970-01-01'}T${a.data?.startTime || a.data?.consumedAt || a.data?.onsetTime || '00:00'}`).getTime();
          const timeB = new Date(`${b.date || '1970-01-01'}T${b.data?.startTime || b.data?.consumedAt || b.data?.onsetTime || '00:00'}`).getTime();
          return timeA - timeB;
        })
      : [];

    const systemPrompt = `
Bạn là Trợ lý AI Phân tích Sức khỏe Cá nhân Chuyên sâu (PHA Health Assistant).
Thời gian hiện tại hệ thống: ${thoi_gian_hien_tai}

==================================================
QUY TẮC BẮT BUỘC VỀ XỬ LÝ TRẠNG THÁI TRIỆU CHỨNG MỚI NHẤT:
1. Kiểm tra bản ghi 'SYMPTOM' mới nhất trong nhật ký:
   - NẾU người dùng nhập triệu chứng mới nhất là "Bình thường", "Khỏe", "Đã hết đau",... (trạng thái cơ thể đã hồi phục):
     + Đặt "isSymptomResolved": true.
     + KHÔNG nhắc lại hay xoáy sâu vào triệu chứng đau/khó chịu đã hết trong phần phân tích nguyên nhân nữa.
     + BẮT BUỘC đưa ra LỜI CHÚC MỪNG sức khỏe đã ổn định.
     + Đánh giá tổng quan nhật ký database quá khứ để tìm các nguy cơ tiềm ẩn khác (nếu có) hoặc tư vấn duy trì sức khỏe.
     + Bỏ qua/Để trống phần sơ cứu khẩn cấp ("firstAidAndCare": "").
   - NẾU vẫn đang có triệu chứng bất thường:
     + Đặt "isSymptomResolved": false.
     + Tiến hành phân tích nguyên nhân theo mốc thời gian và hướng dẫn sơ cứu ban đầu.

==================================================
QUY TẮC BẮT BUỘC VỀ TÍNH NĂNG LƯỢNG & MACROS TRONG 6 GIỜ GẦN NHẤT:
1. Lọc tất cả hoạt động, thực phẩm trong 6 GIỜ GẦN NHẤT.
2. NĂNG LƯỢNG NẠP VÀO & CHI TIẾT THỰC PHẨM THEO NHÓM CHẤT:
   - Tinh bột (carbs): Số gram + Liệt kê các món ăn chứa tinh bột đã tiêu thụ.
   - Đạm (protein): Số gram + Liệt kê các món ăn chứa đạm đã tiêu thụ.
   - Chất béo (fat): Số gram + Liệt kê các món ăn chứa chất béo đã tiêu thụ.
3. NĂNG LƯỢNG TIÊU HAO & CHI TIẾT THEO HOẠT ĐỘNG:
   - Liệt kê rõ từng hoạt động thể chất/trí não đã thực hiện trong 6h kèm lượng Calo ước tính tiêu hao (ví dụ: "Đi bộ 30 phút: ~120 kcal", "Dọn dẹp nhà: ~80 kcal").
4. Đưa ra khuyến cáo điều chỉnh năng lượng & gợi ý thực đơn bữa tiếp theo tối ưu Calo.

==================================================
YÊU CẦU ĐỊNH DẠNG PHẢN HỒI (Trả về JSON HỢP LỆ duy nhất):
{
  "isSymptomResolved": true,
  "causeAnalysis": "Chúc mừng bạn sức khỏe đã trở lại bình thường! Qua phân tích dữ liệu nhật ký gần đây...",
  "firstAidAndCare": "",
  "energyBalance6h": {
    "timeWindow": "6 giờ gần nhất (13:48 - 19:48)",
    "caloriesConsumed": 850,
    "macrosConsumed": {
      "carbs": { "grams": 120, "foods": ["Cơm trắng", "Rau xà lách"] },
      "protein": { "grams": 40, "foods": ["Cá saba kho", "Đầu cá hồi"] },
      "fat": { "grams": 20, "foods": ["Mỡ cá", "Món xào"] }
    },
    "caloriesBurned": 300,
    "activityBreakdown": [
      "Đi bộ nhẹ nhàng (30 phút): ~120 kcal",
      "Làm việc văn phòng (4 giờ): ~180 kcal"
    ],
    "netCalories": 550,
    "energyStatus": "SURPLUS",
    "healthWarning": "Năng lượng dư thừa 550 kcal trong 6h qua. Cần điều chỉnh lượng tinh bột và chất béo ở bữa kế tiếp."
  },
  "medicalRecommendation": "Hiện tại thể trạng tốt. Khuyên nên tiếp tục theo dõi...",
  "nextMealMenu": [
    "Rau củ: Rau luộc",
    "Thịt/Cá: Thịt nạc hấp",
    "Cơm/Tinh bột: Giảm nửa chén cơm",
    "Canh/Khác: Canh rau củ nhẹ"
  ],
  "suggestedActivities": "Duy trì đi bộ 20-30 phút sau bữa ăn."
}
`;

    const userPrompt = `
- Thông tin người dùng:
  + Cân nặng: ${userProfile?.weight || 'Chưa rõ'} kg
  + Chiều cao: ${userProfile?.height || 'Chưa rõ'} cm
  + Nhóm máu: ${userProfile?.bloodType || 'Chưa rõ'}
  
- Nhật ký sức khỏe gần đây (Sắp xếp theo thời gian):
${JSON.stringify(sortedLogs, null, 2)}
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
        temperature: 0.2,
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Lỗi khi gọi OpenRouter API' }, { status: 500 });
    }

    const data = await response.json();
    const parsedAdvice = JSON.parse(data.choices[0]?.message?.content);

    return NextResponse.json({ success: true, advice: parsedAdvice });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi xử lý hệ thống' }, { status: 500 });
  }
}
