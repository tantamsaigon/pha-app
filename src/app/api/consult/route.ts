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

    // Sắp xếp nhật ký theo thứ tự thời gian tăng dần để đảm bảo tính chuẩn xác
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
QUY TẮC BẮT BUỘC VỀ THỜI GIAN & NGUYÊN NHÂN (TEMPORAL CAUSALITY):
1. BẮT BUỘC kiểm tra mốc thời gian của từng sự kiện (Ngày + Giờ).
2. TIỀN ĐỀ QUAN TRỌNG: Mọi sự kiện (ăn uống, thuốc, hoạt động) XẢY RA SAU mốc thời gian xuất hiện triệu chứng Tuyệt Đối KHÔNG ĐƯỢC coi là nguyên nhân gây ra triệu chứng đó. (Ví dụ: Ăn đu đủ lúc 07:12 KHÔNG THỂ là nguyên nhân gây tăng nhịp tim lúc 06:32 trước đó).
3. Chỉ phân tích các nguyên nhân từ những thực phẩm, thuốc hoặc hoạt động đã diễn ra TRƯỚC thời điểm xuất hiện triệu chứng.

==================================================
QUY TẮC BẮT BUỘC VỀ NỘI DUNG TƯ VẤN VÀ Y TẾ:
- Tuyệt đối KHÔNG đưa ra các thông tin sai lệch, không chính xác, hoặc gây hiểu lầm.
- Được phép đưa ra các chẩn đoán y tế sơ bộ để bệnh nhân hiểu rõ tình trạng sức khỏe.
- Cung cấp các biện pháp SƠ CẤP CỨU khẩn cấp, phương tiện và biện pháp chăm sóc sức khỏe ban đầu trong lúc chờ gặp bác sĩ/đến bệnh viện.
- Đề xuất loại thuốc, liều lượng và cách sử dụng chính xác, an toàn, phù hợp với tình trạng thể trạng.
- Đề xuất các xét nghiệm, kiểm tra, cận lâm sàng, phương pháp điều trị, phục hồi chức năng và cơ sở y tế (bệnh viện/phòng khám) phù hợp.
- Đề xuất biện pháp phòng ngừa, hỗ trợ tâm lý, tinh thần, xã hội, tài chính/bảo hiểm và tư vấn pháp lý y tế nếu cần.
- Đề xuất THỰC ĐƠN BỮA KẾ TIẾP: Ưu tiên tối đa sử dụng các loại thực phẩm ĐÃ CÓ trong nhật ký database của người dùng. Nếu không đủ, mới đề xuất thêm các món ăn bình dân, giá rẻ, dễ mua ở địa phương.

==================================================
YÊU CẦU ĐỊNH DẠNG PHẢN HỒI (Trả về JSON HỢP LỆ duy nhất):
{
  "causeAnalysis": "Phân tích nguyên nhân sinh học chính xác theo thứ tự thời gian...",
  "firstAidAndCare": "Hướng dẫn sơ cấp cứu khẩn cấp & xử lý nhanh trong lúc chờ đến bệnh viện...",
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
