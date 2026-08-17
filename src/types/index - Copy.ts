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

// --- Bổ sung Interface cho Năng Lượng & Macros 6 giờ ---
export interface MacroNutrients {
  carbsGrams: number;    // Tinh bột (g)
  proteinGrams: number;  // Đạm (g)
  fatGrams: number;      // Chất béo (g)
}

export interface EnergyBalance {
  timeWindow: string;            // Ví dụ: "6 giờ gần nhất (12:00 - 18:00)"
  caloriesConsumed: number;      // Calo nạp vào (kcal)
  macrosConsumed: MacroNutrients;// Phân rã dinh dưỡng
  foodBreakdown: string[];       // Nguồn thực phẩm nạp vào
  caloriesBurned: number;        // Calo tiêu hao (kcal)
  netCalories: number;           // Thừa/Thiếu (Consumed - Burned)
  energyStatus: 'SURPLUS' | 'DEFICIT' | 'BALANCED'; // Trạng thái năng lượng
  healthWarning: string;         // Cảnh báo nguy cơ (ví dụ: Tích mỡ/Béo phì, Suy dinh dưỡng/Teo cơ...)
}

export interface AIConsultationAdvice {
  causeAnalysis: string;
  firstAidAndCare?: string;
  energyBalance6h?: EnergyBalance; // Trường mới
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
