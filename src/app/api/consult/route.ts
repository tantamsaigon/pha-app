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

    // Sắp xếp nhật ký theo thứ tự thời gian tăng dần
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
QUY TẮC PHÂN TÍCH NĂNG LƯỢNG VÀ DINH DƯỠNG TRONG 6 GIỜ GẦN NHẤT (6-HOUR DIGESTIVE & ENERGY WINDOW):
1. Lọc tất cả các nhật ký (Ăn uống, Thuốc, Hoạt động) diễn ra trong khoảng cửa sổ 6 GIỜ GẦN NHẤT tính tới thời điểm hiện tại (${thoi_gian_hien_tai}).
2. TÍNH TOÁN NĂNG LƯỢNG NẠP VÀO (Calories Consumed):
   - Tính tổng Calo ước tính từ thực phẩm/thuốc đã nạp vào trong 6h.
   - Bắt buộc phân rã chi tiết thành 3 nhóm Macronutrients: Tinh bột (Carbs - gram), Đạm (Protein - gram), Chất béo (Fat - gram) kèm danh sách món đã ăn.
3. TÍNH TOÁN NĂNG LƯỢNG TIÊU HAO (Calories Burned):
   - Tính tổng Calo tiêu hao từ các hoạt động thể chất/trí não diễn ra trong 6h đó (dựa trên thể trạng chiều cao/cân nặng của người dùng).
4. DỰ BÁO XU HƯỚNG NĂNG LƯỢNG & CẢNH BÁO NGHĨA VỤ NGHẮN HẠN:
   - Xác định netCalories = caloriesConsumed - caloriesBurned.
   - Trạng thái energyStatus: "SURPLUS" (Thừa năng lượng), "DEFICIT" (Thiếu năng lượng), hoặc "BALANCED" (Cân bằng).
   - Đưa ra khuyến cáo cảnh báo xu hướng (Ví dụ: Thừa calo liên tục nguy cơ béo phì/tích mỡ; Thiếu calo nghiêm trọng gây hạ đường huyết, suy dinh dưỡng, còi xương, teo cơ...).
   - Khuyên rõ nên bổ sung hay hạn chế nhóm chất nào (Tinh bột/Đạm/Béo) trong bữa ăn tiếp theo.

==================================================
QUY TẮC BẮT BUỘC VỀ THỜI GIAN & NGUYÊN NHÂN (TEMPORAL CAUSALITY):
1. BẮT BUỘC kiểm tra mốc thời gian của từng sự kiện (Ngày + Giờ).
2. TIỀN ĐỀ QUAN TRỌNG: Mọi sự kiện (ăn uống, thuốc, hoạt động) XẢY RA SAU mốc thời gian xuất hiện triệu chứng Tuyệt Đối KHÔNG ĐƯỢC coi là nguyên nhân gây ra triệu chứng đó.
3. Chỉ phân tích các nguyên nhân từ những thực phẩm, thuốc hoặc hoạt động đã diễn ra TRƯỚC thời điểm xuất hiện triệu chứng.

==================================================
QUY TẮC VỀ TƯ VẤN Y TẾ & BỮA ĂN KẾ TIẾP:
- Chẩn đoán sơ bộ, hướng dẫn sơ cứu khẩn cấp (nếu có triệu chứng).
- Đề xuất THỰC ĐƠN BỮA KẾ TIẾP: Điều chỉnh trực tiếp dựa trên kết quả cân bằng năng lượng 6h (Ví dụ: Nếu 6h qua thừa tinh bột thì bữa tiếp giảm tinh bột, tăng xơ/đạm). Ưu tiên thực phẩm sẵn có trong nhật ký hoặc món bình dân dễ mua.

==================================================
YÊU CẦU ĐỊNH DẠNG PHẢN HỒI (Trả về JSON HỢP LỆ duy nhất):
{
  "causeAnalysis": "Phân tích nguyên nhân sinh học chính xác theo thứ tự thời gian...",
  "firstAidAndCare": "Hướng dẫn sơ cấp cứu khẩn cấp & xử lý nhanh trong lúc chờ đến bệnh viện...",
  "energyBalance6h": {
    "timeWindow": "6 giờ gần nhất (HH:mm - HH:mm)",
    "caloriesConsumed": 650,
    "macrosConsumed": {
      "carbsGrams": 85,
      "proteinGrams": 30,
      "fatGrams": 15
    },
    "foodBreakdown": ["Phở bò (1 tô) - ~500kcal", "Cà phê sữa - ~150kcal"],
    "caloriesBurned": 180,
    "netCalories": 470,
    "energyStatus": "SURPLUS",
    "healthWarning": "Năng lượng dư thừa 470 kcal trong 6h qua. Nếu kéo dài dễ dẫn đến dư thừa mỡ thừa và béo phì. Cần giảm bớt tinh bột ở bữa tới."
  },
  "medicalRecommendation": "Chẩn đoán sơ bộ, đề xuất thuốc/liều dùng, xét nghiệm, và cơ sở y tế khuyến nghị...",
  "nextMealMenu": [
    "Rau củ: ...",
    "Thịt/Cá: ...",
    "Cơm/Tinh bột: ...",
    "Canh/Khác: ..."
  ],
  "suggestedActivities": "Đề xuất hoạt động, nghỉ ngơi, hỗ trợ tâm lý & phòng ngừa...",
  "followUpQuestions": "Các câu hỏi cần hỏi thêm về tiền sử/triệu chứng để làm rõ..."
}
`;

    const userPrompt = `
- Thông tin người dùng:
  + Cân nặng: ${userProfile?.weight || 'Chưa rõ'} kg
  + Chiều cao: ${userProfile?.height || 'Chưa rõ'} cm
  + Nhóm máu: ${userProfile?.bloodType || 'Chưa rõ'}
  + Vị trí: ${userProfile?.location || 'Việt Nam'}
  
- Nhật ký sức khỏe gần đây (Đã được sắp xếp theo đúng trình tự thời gian):
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
    const content = data.choices[0]?.message?.content;
    const parsedAdvice = JSON.parse(content);

    return NextResponse.json({ success: true, advice: parsedAdvice });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi xử lý hệ thống' }, { status: 500 });
  }
}
