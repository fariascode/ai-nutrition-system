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
  hba1c?: number              // % (normal: < 5.7)
  systolic_bp?: number        // mmHg (normal: < 120)
  diastolic_bp?: number       // mmHg (normal: < 80)
  cholesterol_total?: number  // mg/dL (normal: < 200)
  triglycerides?: number      // mg/dL (normal: < 150)
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
