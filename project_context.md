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

### Phase 4: Production & Deployment
- Deploy Frontend lên Vercel.
- Tối ưu PWA cho trải nghiệm ứng dụng trên di động (iOS, Android, PC, Mac).

-----------------------------CẬP NHẬT THÊM SAU KHI HOÀN THÀNH TỪ PHASE 1 ĐẾN PHASE 3--------------------------
# PROJECT CONTEXT: AI Personal Health Assistant (Sổ Tay Sức Khỏe AI) (PHA)

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

## 3. Cấu Trúc Thư Mục & Các File Đã Triển Khai (Project Directory Structure) (Done)

pha-app/
├── .env.local                       # Biến môi trường (Firebase Config & OpenRouter API Key)
├── package.json                     # Dependencies (Firebase, Lucide-React, Next-PWA, ...)
├── tsconfig.json                    # Cấu hình TypeScript & Path Aliases (@/*)
├
└── src/
    ├── app/
    │   ├── api/
    │   │   ├── consult/
    │   │   │   └── route.ts         # [Phase 2] Route Handler gọi OpenRouter (DeepSeek-V3) cho tư vấn AI
    │   │   └── doctor-export/
    │   │       └── route.ts         # [Phase 3] Route Handler tổng hợp báo cáo y khoa dành cho bác sĩ
    │   ├── favicon.ico
    │   ├── globals.css
    │   ├── layout.tsx               # Root Layout
    │   └── page.tsx                 # Trang chủ tích hợp Form, Consultation & Doctor Export
    ├── components/
    │   ├── HealthLogForm.tsx        # [Phase 1] Form nhập liệu linh hoạt (Food, Activity, Symptom + Voice Input)
    │   ├── AIConsultation.tsx       # [Phase 2] Component tư vấn AI & đọc âm thanh (Text-to-Speech)
    │   └── DoctorExportModal.tsx    # [Phase 3] Modal chọn mốc thời gian, tạo báo cáo & In/Lưu PDF cho Bác sĩ
    ├── lib/
    │   ├── firebase.ts              # [Phase 1] Khởi tạo Firebase App, Auth & Firestore
    │   ├── mockData.ts              # [Phase 1] Script khởi tạo dữ liệu mẫu 7 ngày
    │   └── weather.ts               # [Phase 3] Service kết nối Open-Meteo API lấy thông tin thời tiết
    └── types/
        └── index.ts                 # [Phase 1] Định nghĩa TypeScript Interfaces (UserProfile, HealthLog, Vitals...)