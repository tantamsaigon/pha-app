export interface UserProfile {
  uid: string;
  username?: string;
  fullName: string;
  birthYear: number;
  weight: number; // kg
  height: number; // cm
  bloodType: string;
  location?: string;
  createdAt?: any;
}

export type LogType = 'FOOD' | 'ACTIVITY' | 'SYMPTOM';

export interface FoodData {
  foodName: string;
  amount: string;
  consumedAt: string; // HH:mm
}

export interface ActivityData {
  activityName: string;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
}

export interface Vitals {
  weight?: number;
  height?: number;
  heartRate?: number;
  bloodPressure?: string;
  labResults?: string;
}

export interface SymptomData {
  description: string;
  onsetTime: string; // HH:mm
  vitals?: Vitals;
}

export interface HealthLog {
  id?: string;
  userId: string;
  date: string; // YYYY-MM-DD
  type: LogType;
  data: FoodData | ActivityData | SymptomData;
  createdAt?: any;
}

// --- Cấu trúc chi tiết Thực phẩm theo nhóm chất ---
export interface MacroDetail {
  grams: number;
  foods: string[]; // Danh sách thực phẩm chứa nhóm chất này
}

export interface MacroNutrientsDetailed {
  carbs: MacroDetail;   // Tinh bột
  protein: MacroDetail; // Đạm
  fat: MacroDetail;     // Chất béo
}

export interface ActivityBurnDetail {
  activityName: string;
  durationOrTime?: string;
  caloriesBurned: number;
}

export interface EnergyBalance {
  timeWindow: string;                    // Ví dụ: "6 giờ gần nhất (13:48 - 19:48)"
  caloriesConsumed: number;              // Calo nạp vào (kcal)
  macrosConsumed: MacroNutrientsDetailed;// Phân rã chi tiết 3 nhóm chất + món ăn
  caloriesBurned: number;                // Calo tiêu hao (kcal)
  activityBreakdown: string[];           // Danh sách hoạt động & calo tiêu hao chi tiết
  netCalories: number;                   // Thừa/Thiếu
  energyStatus: 'SURPLUS' | 'DEFICIT' | 'BALANCED';
  healthWarning: string;                 // Khuyên nghị điều chỉnh
}

export interface AIConsultationAdvice {
  isSymptomResolved?: boolean;           // Đánh giá triệu chứng đã hết chưa
  causeAnalysis: string;                 // Phân tích hoặc Lời chúc mừng + đánh giá nguy cơ
  firstAidAndCare?: string;              // Hướng dẫn sơ cứu (nếu còn triệu chứng)
  energyBalance6h?: EnergyBalance; 
  medicalRecommendation: string;
  nextMealMenu: string[];
  suggestedActivities: string;
  followUpQuestions?: string;
}

export interface AIConsultationRecord {
  id?: string;
  userId: string;
  timestamp: any;
  mode: 'MANUAL' | 'SCHEDULED' | 'DOCTOR_EXPORT';
  symptomReferenceId?: string | null;
  adviceContent: AIConsultationAdvice;
}
