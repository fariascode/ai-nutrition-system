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
}

export type PatientInsert = Omit<Patient, 'id' | 'created_at' | 'updated_at'>
export type PatientUpdate = Partial<Omit<PatientInsert, 'doctor_id'>>
