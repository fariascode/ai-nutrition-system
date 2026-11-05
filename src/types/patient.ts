export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'athlete'

export interface WeightRecord {
  date: string
  weight_kg: number
  body_fat_pct?: number
  muscle_mass_kg?: number
  waist_cm?: number
  notes?: string
}

export interface LabBiomarkers {
  fasting_glucose?: number    // mg/dL (normal: 70-99)
  fasting_insulin?: number    // uU/mL (normal: 2-10) -> para cálculo HOMA-IR
  hba1c?: number              // % (normal: < 5.7)
  systolic_bp?: number        // mmHg (normal: < 120)
  diastolic_bp?: number       // mmHg (normal: < 80)
  cholesterol_total?: number  // mg/dL (normal: < 200)
  ldl_cholesterol?: number    // mg/dL (normal: < 100)
  hdl_cholesterol?: number    // mg/dL (normal: > 45 H / > 55 M)
  triglycerides?: number      // mg/dL (normal: < 150)
  uric_acid?: number          // mg/dL (normal: 3.5-7.0)
  creatinine?: number         // mg/dL (normal: 0.6-1.2)
  tsh?: number                // mUI/L (normal: 0.5-4.0)
  vitamin_d?: number          // ng/mL (óptimo: 30-60)
  ferritin?: number           // ng/mL (óptimo: 40-200)
  last_lab_date?: string
}

export interface Patient {
  id: string
  created_at: string
  updated_at: string
  doctor_id: string
  full_name: string
  birth_date: string
  gender: 'male' | 'female' | 'other'
  weight_kg: number
  height_cm: number
  goal: string
  allergies: string | null
  conditions: string | null
  notes: string | null

  // Nuevos campos clínicos avanzados (opcionales para compatibilidad con Supabase)
  email?: string | null
  phone?: string | null
  activity_level?: ActivityLevel
  body_fat_pct?: number | null
  muscle_mass_kg?: number | null
  waist_cm?: number | null
  medications?: string | null
  dietary_preferences?: string | null
  sleep_hours?: number | null
  water_liters?: number | null
  biomarkers?: LabBiomarkers | null
  weight_history?: WeightRecord[]
}

export type PatientInsert = Omit<Patient, 'id' | 'created_at' | 'updated_at'>
export type PatientUpdate = Partial<Omit<PatientInsert, 'doctor_id'>>
