export type AppointmentType =
  | 'first_visit'
  | 'follow_up'
  | 'body_comp'
  | 'lab_review'

export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'completed'
  | 'cancelled'

export type AppointmentModality = 'in_person' | 'video_call'

export interface SoapNote {
  subjective: string
  objective: string
  analysis: string
  plan: string
  recorded_weight_kg?: number
  recorded_body_fat_pct?: number
  recorded_muscle_kg?: number
  recorded_waist_cm?: number
  updated_at: string
}

export interface Appointment {
  id: string
  created_at: string
  patient_id: string
  doctor_id: string
  patient_name: string
  patient_phone?: string | null
  date: string         // YYYY-MM-DD
  time: string         // HH:mm
  duration_min: number // 30 | 45 | 60
  type: AppointmentType
  modality: AppointmentModality
  status: AppointmentStatus
  reason: string
  prep_instructions?: string | null
  soap_note?: SoapNote | null
  source_consultation_id?: string
}

export type AppointmentInsert = Omit<Appointment, 'id' | 'created_at'>
export type AppointmentUpdate = Partial<Omit<AppointmentInsert, 'doctor_id'>>

