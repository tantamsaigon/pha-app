import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { userProfile, healthLogs } = await req.json();

    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterApiKey) {
      return NextResponse.json(
        { error: 'OpenRouter API Key chưa được cấu hình.' },
        { status: 500 }
      );
    }

    // System Prompt thiết lập vai trò bác sĩ AI & quy tắc suy luận Biological Time
    const systemPrompt = `
Bạn là Trợ lý AI Phân tích Sức khỏe Cá nhân (PHA - Sổ Tay Sức Khỏe AI).
Nhiệm vụ của bạn là phân tích nguyên nhân triệu chứng dựa trên nhật ký thực phẩm/thuốc và hoạt động của người dùng.

DƯỚI ĐÂY LÀ QUY TẮC SUY LUẬN SINH HỌC (BIOLOGICAL-TIME REASONING):
1. Tiêu hóa thực phẩm: Phân tích thời gian tiêu hóa thực phẩm nạp vào, khả năng gây dị ứng, đầy hơi, tăng/giảm đường huyết.
2. Dược động học: Phân tích thời gian phát tán/bán thải của thuốc và tương tác giữa thuốc với thực phẩm.
3. Hoạt động: Phân tích mức độ tiêu hao năng lượng, phản ứng cơ bắp/trí não và tác động đến triệu chứng.

YÊU CẦU ĐỊNH DẠNG PHẢN HỒI (JSON hợp lệ):
Trả về nội dung dưới dạng một JSON object đúng cấu trúc sau (không thêm markdown ngoài khối json):
{
  "causeAnalysis": "Phân tích nguyên nhân sinh học chi tiết, liên kết giữa thực phẩm/thuốc/hoạt động và triệu chứng xuất hiện...",
  "medicalRecommendation": "Lời khuyên theo dõi sức khỏe hoặc hướng xử lý phù hợp...",
  "nextMealMenu": [
    "Rau củ: ...",
    "Thịt/Cá: ...",
    "Cơm/Tinh bột: ...",
    "Canh: ..."
  ],
  "suggestedActivities": "Đề xuất hoạt động thể chất/trí não tiếp theo..."
}
`;

    const userPrompt = `
- Thông tin người dùng:
  + Cân nặng: ${userProfile?.weight || 'Chưa rõ'} kg
  + Chiều cao: ${userProfile?.height || 'Chưa rõ'} cm
  + Nhóm máu: ${userProfile?.bloodType || 'Chưa rõ'}
  
- Nhật ký sức khỏe gần đây:
${JSON.stringify(healthLogs, null, 2)}

Hãy phân tích nguyên nhân và đưa ra tư vấn phù hợp.
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
      const errText = await response.text();
      console.error('OpenRouter API Error:', errText);
      return NextResponse.json({ error: 'Lỗi khi gọi OpenRouter API' }, { status: 500 });
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    const parsedAdvice = JSON.parse(content);

    return NextResponse.json({ success: true, advice: parsedAdvice });
  } catch (error: any) {
    console.error('Consultation Error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi xử lý hệ thống' }, { status: 500 });
  }
}
