# PROJECT CONTEXT: AI Personal Health Assistant (Sổ Tay Sức Khỏe AI)(PHA)

## 1. Tổng Quan Dự Án (Overview)
Ứng dụng Web App đa nền tảng (iOS, Android, PC, Mac) đóng vai trò là Trợ lý AI Phân tích Sức khỏe Cá nhân.
- **Mục tiêu**: Theo dõi nhật ký nạp thực phẩm/thuốc, hoạt động thể chất/trí não và triệu chứng cơ thể để AI phân tích nguyên nhân, đề xuất tư vấn y tế, thực phẩm và hoạt động phù hợp. Làm dữ liệu bằng chứng chuẩn y khoa hỗ trợ bác sĩ khi khám và điều trị bệnh.
- **Phương thức nhập liệu**: Nhập văn bản hoặc giọng nói (Microphone).
- **Phương thức phản hồi**: Văn bản hiển thị trên màn hình và đọc bằng giọng nói (Text-to-Speech / Web Speech API).

---

## 2. Kiến Trúc Kỹ Thuật (Tech Stack & Infrastructure)
- **Frontend**: Next.js (React), TailwindCSS, PWA support (Cài đặt trên iOS, Android, PC, Mac như native app).
- **Backend & Auth**: Firebase Auth, Firebase Firestore Database, Firebase Cloud Messaging (Thông báo nhắc nhở).
- **AI Engine**: **OpenRouter API** - Model **DeepSeek-V3** (`deepseek/deepseek-chat`) cho logic suy luận sinh học (thời gian tồn tại thực phẩm/thuốc/hoạt động trong cơ thể, phân tích nguyên nhân triệu chứng, tổng hợp hồ sơ y khoa cho bác sĩ).
- **Speech-to-Text & Text-to-Speech**: Web Speech API (Native browser) / gTTS.
- **External API**: Open-Meteo API (Lấy thông tin thời tiết miễn phí theo vị trí người dùng).
- **Hosting / Deploy**: Vercel (Frontend + Serverless Functions) & GitHub Repositories.
- **Local Dev Server**: Zorin OS (Local Node.js environment).

---

## 3. Cấu Trúc Dữ Liệu (Database Schema - Firestore)

### Collection: `users`
- `uid`: String (Primary Key)
- `username`: String
- `fullName`: String
- `birthYear`: Number
- `weight`: Number (kg)
- `height`: Number (cm)
- `bloodType`: String
- `location`: String
- `createdAt`: Timestamp

### Collection: `health_logs`
- `id`: String
- `userId`: String
- `date`: String (YYYY-MM-DD)
- `type`: String Enum ['FOOD', 'ACTIVITY', 'SYMPTOM']
- `data`:
  - FOOD: `{ foodName: String, amount: String, consumedAt: String (HH:mm) }`
  - ACTIVITY: `{ activityName: String, startTime: String (HH:mm), endTime: String (HH:mm) }`
  - SYMPTOM: `{ description: String, onsetTime: String (HH:mm), vitals: { weight, height, heartRate, bloodPressure, labResults } }`
- `createdAt`: Timestamp

### Collection: `ai_consultations`
- `id`: String
- `userId`: String
- `timestamp`: Timestamp
- `mode`: String Enum ['MANUAL', 'SCHEDULED', 'DOCTOR_EXPORT']
- `symptomReferenceId`: String (Nullable)
- `adviceContent`:
  - `causeAnalysis`: String
  - `medicalRecommendation`: String
  - `nextMealMenu`: Array of Strings (Rau củ, Thịt/Cá, Cơm, Canh)
  - `suggestedActivities`: String

---

## 4. Luồng Hoạt Động & Quy Tắc Logic Cốt Lõi (Core Workflows & Rules)

### 4.1. Quy tắc nhập liệu Linh hoạt (Flexible Input Validation)
- Người dùng **KHÔNG** nhất thiết phải nhập cùng lúc tất cả 3 form (Thực phẩm, Hoạt động, Triệu chứng).
- **Quy tắc lưu DB**: Form nào không có dữ liệu nhập thì **KHÔNG** tạo record/ghi nhận vào database.
- **Quy tắc thời gian bắt buộc**: Nếu 1 đối tượng được nhập (ví dụ nhập tên món ăn, tên hoạt động, hoặc triệu chứng) thì **ô thời gian tương ứng của đối tượng đó BẮT BUỘC phải nhập** (mặc định lấy giờ hệ thống, nếu không có phút thì tự ghi nhận là 0 phút).

### 4.2. Xử lý Tư vấn AI (DeepSeek-V3 qua OpenRouter)
- **Cơ chế suy luận biological-time**: DeepSeek-V3 tự tính toán thời gian tiêu hóa thực phẩm, thời gian phát tán/bán thải của thuốc, thời gian cơ bắp/trí não phản ứng với hoạt động.
- **Tư vấn thủ công (Nút "Tư Vấn")**: Đọc triệu chứng mới nhất -> Phân tích nguyên nhân kết hợp với nhật ký quá khứ (1 ngày, 1 tuần, 1 tháng, 1 năm hoặc toàn bộ) -> Đưa ra lời khuyên y tế, thực đơn bữa kế tiếp và hoạt động tiếp theo.
- **Tư vấn tự động theo khung giờ (Scheduled Advice)**:
  - `07:45`: Nhắc uống nước/thuốc + Gợi ý hoạt động + Thời tiết.
  - `09:45`: Gợi ý thực đơn Bữa Trưa (Rau củ, Thịt/Cá, Cơm trắng, Canh) + Hoạt động + Thời tiết.
  - `11:45`: Nhắc uống nước/thuốc + Gợi ý hoạt động + Thời tiết.
  - `14:45`: Nhắc uống nước/thuốc + Gợi ý hoạt động + Thời tiết.
  - `16:45`: Gợi ý thực đơn Bữa Tối (Rau củ, Thịt/Cá, Cơm trắng, Canh) + Hoạt động + Thời tiết.
  - `19:15`: Nhắc uống thuốc + Gợi ý hoạt động nghỉ ngơi + Thời tiết.

### 4.3. Tính năng Xuất Dữ Liệu Cho Bác Sĩ ("Xuất Dữ Liệu Cho Bác Sĩ")
- **Chức năng**: Tóm tắt và xuất báo cáo tổng hợp hồ sơ sức khỏe phục vụ cho bác sĩ trong quá trình khám chữa bệnh.
- **Tùy chọn thời gian**: Người dùng chọn khoảng thời gian cần xuất: `1 tuần`, `1 tháng`, `3 tháng`, `6 tháng`, `1 năm`, hoặc `Toàn bộ`.
- **Nội dung Báo cáo AI tổng hợp**:
  1. **Bảng tổng quan chỉ số & sinh hiệu**: Chiều cao, cân nặng, BMI, huyết áp, nhịp tim, kết quả xét nghiệm.
  2. **Tổng hợp Nhật ký**: Thức ăn/thuốc nạp vào, chuỗi hoạt động thể chất/trí não, tần suất và diễn biến triệu chứng trong khoảng thời gian đã chọn.
  3. **Đề xuất y khoa dành cho Bác sĩ**:
     - Các vấn đề nghi ngờ hoặc cần kiểm tra chuyên sâu.
     - Các biện pháp/chỉ định kiểm tra xét nghiệm cận lâm sàng khuyến nghị.
     - Định hướng/phương án trị liệu và lưu ý đối với thể trạng riêng của bệnh nhân.

---

## 5. Giao Diện Người Dùng (UI/UX Principles)
- **Thiết kế tối giản (Minimalist)**:
  - Form nhập liệu linh hoạt với các ô chọn phân loại (Thực phẩm / Hoạt động / Triệu chứng) + icon Microphone cho từng ô.
  - Nút **"Tư Vấn"** nổi bật.
  - Nút **"Xuất Dữ Liệu Cho Bác Sĩ"** kèm bộ chọn khoảng thời gian (1 tuần -> Toàn bộ).
  - Khung hiển thị kết quả phân tích AI có nút **"Nghe Đọc"** (Loa) để phát âm thanh qua Web Speech API.
- **Lưu Session**: Đăng nhập 1 lần, duy trì phiên làm việc lâu dài trên thiết bị.

---

## 6. Lộ Trình Phát Triển (Development Phases)

### Phase 1: Môi trường Local & Core Data (Zorin OS Server)
- Khởi tạo project Next.js. (Done)
- Thiết lập Firestore DB Schema & Mock Data (Tài khoản test, dữ liệu mẫu 7 ngày). (Done)
- Xây dựng UI nhập liệu linh hoạt (Validation quy tắc đối tượng - thời gian bắt buộc, Text + Voice Input cơ bản). (Done)

### Phase 2: OpenRouter AI Integration & Logic Tư Vấn
- Tích hợp OpenRouter API kết nối model `deepseek/deepseek-chat`. (Done)
- Thiết lập Prompt Template phân tích nguyên nhân sinh học & nút "Tư Vấn". (Done)
- Tích hợp Web Speech API đọc kết quả (Text-to-Speech). (Done)

### Phase 3: Tính năng Bác Sĩ & Automation
- Xây dựng module **"Xuất Dữ Liệu Cho Bác Sĩ"** với Prompt định dạng báo cáo y khoa chuyên sâu.
- Tích hợp Open-Meteo API lấy thời tiết theo vị trí.
- Xây dựng Cron Job / Push Notification cho các mốc giờ tư vấn tự động trong ngày.

### Phase 4: Production & Deployment (Done)
- Deploy Frontend lên Vercel.
- Tối ưu PWA cho trải nghiệm ứng dụng trên di động (iOS, Android, PC, Mac).



## 7. Cấu Trúc Thư Mục & Các File Đã Triển Khai (Project Directory Structure)

pha-app/
├── .env.local                       # Biến môi trường (Firebase, OpenRouter, VAPID Keys, CRON_SECRET)
├── package.json                     # Dependencies (Firebase, web-push, Lucide-React, Next.js, ...)
├── tsconfig.json                    # Cấu hình TypeScript & Path Aliases (@/*)
├── vercel.json                      # [Phase 4] Cấu hình Vercel Cron Jobs theo mốc UTC cho 6 khung giờ
├
├── public/                          # Static assets & Service Worker
│   ├── sw.js                        # [Phase 4] Service Worker xử lý sự kiện Push & Click Notification
│   ├── icon-192x192.png
│   └── badge-72x72.png
├
└── src/
    ├── app/
    │   ├── api/
    │   │   ├── consult/
    │   │   │   └── route.ts         # [Phase 2] Route Handler gọi OpenRouter (DeepSeek-V3) cho tư vấn AI
    │   │   ├── doctor-export/
    │   │   │   └── route.ts         # [Phase 3] Route Handler tổng hợp báo cáo y khoa dành cho bác sĩ
    │   │   ├── push/
    │   │   │   └── subscribe/
    │   │   │       └── route.ts     # [Phase 4] Route Handler lưu Web Push Subscription từ Client
    │   │   └── cron/
    │   │       └── scheduled-advice/
    │   │           └── route.ts     # [Phase 4] Cron Job gửi thông báo đẩy tự động (Khởi tạo WebPush an toàn khi build)
    │   ├── favicon.ico
    │   ├── globals.css
    │   ├── layout.tsx               # Root Layout (Tích hợp AuthProvider toàn cục)
    │   └── page.tsx                 # Trang chủ quản lý trạng thái Đăng nhập, Form, Consultation & PWA
    ├── components/
    │   ├── AuthModal.tsx            # [Production] Form Đăng ký (nhập chỉ số thể trạng) & Đăng nhập (Firebase Auth)
    │   ├── HealthLogForm.tsx        # [Phase 1] Form nhập liệu linh hoạt (Food, Activity, Symptom + iOS Dictation UI)
    │   ├── AIConsultation.tsx       # [Phase 2] Component tư vấn AI & đọc âm thanh (gTTS / Web Speech API)
    │   └── DoctorExportModal.tsx    # [Phase 3] Modal chọn mốc thời gian, tạo báo cáo & In/Lưu PDF cho Bác sĩ
    │   ├── HealthAnalytics.tsx      # Component hiển thị biểu đồ & phân tích xu hướng triệu chứng
    │   ├── HealthLogManager.tsx     # Component danh sách nhật ký (Xóa, chỉnh sửa bản ghi)
    │   └── ProfileEditModal.tsx     # Component chỉnh sửa thông tin cá nhân (Cân nặng, chiều cao, nhóm máu...)

    
    ├── context/
    │   └── AuthContext.tsx          # [Production] Context quản lý phiên đăng nhập & Lắng nghe Realtime Profile
    ├── lib/
    │   ├── firebase.ts              # [Phase 1] Khởi tạo Firebase App, Firestore DB & Firebase Auth
    │   ├── weather.ts               # [Phase 3] Service kết nối Open-Meteo API lấy thông tin thời tiết
    │   ├── pushHelper.ts            # [Phase 4] Helper đăng ký Service Worker & kích hoạt Web Push trên Browser
    │   └── subscriptions.ts         # [Phase 4] Bộ lưu trữ danh sách Web Push Subscriptions
    └── types/
        └── index.ts                 # [Phase 1] Định nghĩa TypeScript Interfaces (UserProfile, HealthLog, Vitals...)

# B. CÁC VẤN ĐỀ CẦN NÂNG CẤP LÊN V01 (done)
Để nâng tầm ứng dụng từ một phiên bản chạy ổn định (MVP) lên một sản phẩm hoàn thiện, trải nghiệm cao cấp cho người dùng thực tế, mình gợi ý một số ý tưởng cải tiến theo từng nhóm trọng tâm:
1. Nâng Cấp Quản Lý Tài Khoản & Dữ Liệu Cá NhânTrang Chỉnh Sửa Profile: 
- Thêm màn hình cho phép người dùng cập nhật lại cân nặng, chiều cao, chỉ số huyết áp định kỳ. Khi cân nặng/chiều cao thay đổi, AI sẽ tính toán lại chỉ số BMI và đưa ra lời khuyên chính xác hơn.

- Lịch Sử & Nhật Ký Trực Quan:Hiện tại ứng dụng mới cho nhập nhật ký. Bạn có thể thêm một tab "Lịch sử nhật ký" hiển thị danh sách các món đã ăn, hoạt động đã làm theo ngày.
-Cho phép người dùng Xóa hoặc Sửa bản ghi nếu nhập sai.

2. Tối Ưu Trải Nghiệm AI & Báo CáoPhân Tích Xu Hướng Sức Khỏe (Analytics):
-Vẽ biểu đồ theo dõi biến động cân nặng, tần suất xuất hiện các triệu chứng (ví dụ: đau đầu bao nhiêu lần trong tháng) để người dùng có cái nhìn trực quan trước khi xuất file cho Bác sĩ.

-Lưu Lịch Sử Tư Vấn AI:Lưu các kết quả trả về từ ai_consultations vào Firestore để người dùng có thể xem lại những lời khuyên/thực đơn cũ mà AI đã gợi ý mà không cần bấm tư vấn lại.  

3. Tăng Tương Tác & Trải Nghiệm PWA trên Di ĐộngNhắc Nhở Thông Minh Có Tính Tương Tác:
- Khi Cron Job gửi thông báo PWA (ví dụ: "Đã đến giờ uống nước" hoặc "Gợi ý thực đơn tối"), bổ sung đường dẫn (deep link) khi người dùng chạm vào thông báo sẽ mở ngay đúng tab nhập liệu hoặc tab thực đơn.

- Chế Độ Offline Support (PWA Offline):Tận dụng Service Worker (sw.js) để khi mất mạng (offline), người dùng vẫn mở được app và lưu tạm nhật ký vào LocalStorage/IndexedDB, sau đó tự động đồng bộ (sync) lên Firestore khi có mạng trở lại.  

4. Bảo Mật & Tối Ưu Chi Phí BackendFirestore Security Rules:Đảm bảo đã siết chặt quy tắc bảo mật trên Firebase Console sao cho người dùng chỉ có thể read/write trên các document có userId == request.auth.uid.Rate Limit Cho AI API:Giới hạn số lần bấm nút "Tư Vấn Sức Khỏe AI" hoặc "Xuất Dữ Liệu Cho Bác Sĩ" (ví dụ: tối đa 5-10 lần/ngày/user) để tránh việc người dùng spam gây tăng chi phí OpenRouter API.  

# C. FIX LỖI CHO PHIÊN BẢN V02
 Hiện tại tư vấn của AInhư bên dưới :
 "🔍 Phân Tích Nguyên Nhân:
Triệu chứng đau bụng đi cầu xuất hiện lúc 12:15 có thể liên quan đến việc ăn uống trước đó. Cụ thể, các thực phẩm như rau xà lách, diếp cá luộc, rau muống xào, cá saba kho, đầu cá hồi và canh cá có thể gây kích ứng đường tiêu hóa, đặc biệt nếu không được chế biến kỹ hoặc có vấn đề về vệ sinh. Đau bụng đi cầu thường là phản ứng của cơ thể để loại bỏ chất độc hoặc thức ăn không phù hợp.

Hướng Dẫn Sơ Cứu Ban Đầu:
1. Nghỉ ngơi và uống nhiều nước để giúp cơ thể đào thải độc tố. 2. Tránh ăn thêm thức ăn cứng hoặc khó tiêu trong vài giờ tiếp theo. 3. Theo dõi triệu chứng, nếu đau bụng kéo dài hoặc có dấu hiệu mất nước, cần đến cơ sở y tế ngay.

🩺 Lời Khuyên Y Tế:
Chẩn đoán sơ bộ: Rối loạn tiêu hóa nhẹ do thức ăn. Đề xuất: 1. Uống thuốc hỗ trợ tiêu hóa như men vi sinh hoặc thuốc giảm đau bụng nếu cần. 2. Nếu triệu chứng không cải thiện trong 24 giờ, cần đến bệnh viện để kiểm tra chi tiết.

🥗 Thực Đơn Bữa Tiếp Theo:
Rau củ: Rau luộc (rau muống, rau cải)
Thịt/Cá: Cá hấp
Cơm/Tinh bột: Cơm trắng
Canh/Khác: Canh rau củ nhẹ
🏃 Hoạt Động Gợi Ý:
1. Nghỉ ngơi sau bữa ăn để hệ tiêu hóa hoạt động tốt hơn. 2. Tránh các hoạt động thể lực mạnh trong vài giờ sau khi ăn. 3. Theo dõi các triệu chứng và ghi chú lại để báo cáo với bác sĩ nếu cần."

TA BỔ SUNG THÊM PHẦN tính toán năng lượng calori để từ đó khuyến cáo xu hướng ngắn hạn trong vòng 6 tiếng ( vòng đời của thực phẩm khi ăn vào) vi dụ sáng lúc 6:00 ta ăn sáng thì tính toán xem các thục phẩm / thuốc đã nộp vào
trong vòng 6 giờ là tổng bao nhiêu năng lượng trong đó tinh bột bao nhiêu có từ loại thực phẩm nào đã ăn, đạm bao nhiêu, chất béo bao nhiêu?. rồi xem trong vong 6 giờ đó các hoạt động nào đã diễn ra và tốn bao nhiêu năng lượng,
ta sẽ tính dc số năng lượng còn lại là thừa hay thiếu để khuyên nghi là sẽ béo phì, hay gầy ốm , suy dinh dưỡng, còi xướng teo cơ....và huyến nghị nên bổ sung hay hạn chế các loại thức ăn nào , để đè xuất cho bữa ăn tiếp theo cho phù hợp.

























