export interface UserProfile {
  uid: string;
  username: string;
  fullName: string;
  birthYear: number;
  weight: number; // kg
  height: number; // cm
  bloodType: string;
  location: string;
  createdAt: Date;
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
  createdAt?: Date;
}
