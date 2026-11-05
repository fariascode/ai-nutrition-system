export type ConsultationStatus = 'draft' | 'closed' | 'voided'
export interface ClinicalActor { id: string; label: string }
export interface ConsultationRevision {
  at: string
  actor: ClinicalActor
  action: 'created' | 'updated' | 'closed' | 'reopened' | 'voided'
  reason?: string
  previous?: Omit<Consultation, 'revisions'>
}
export type GlucoseContext = 'unknown' | 'fasting' | 'random' | 'postprandial'

export interface ConsultationDiagnosis {
  id: string
  name: string
  role: 'primary' | 'secondary'
  certainty: 'suspected' | 'confirmed'
  notes: string
}

export interface ConsultationMedication {
  id: string
  name: string
  presentation: string
  dose: string
  route: string
  frequency: string
  duration: string
  instructions: string
}

export interface VitalSigns {
  systolic_bp?: number     // mmHg
  diastolic_bp?: number    // mmHg
  heart_rate?: number      // lpm
  resp_rate?: number       // rpm
  temperature_c?: number   // °C
  spo2?: number            // %
  weight_kg?: number
  height_cm?: number
  glucose?: number         // mg/dL (capilar)
}

export interface PhysicalExam {
  general: string
  head_neck: string
  cardiopulmonary: string
  abdomen: string
  extremities: string
  skin: string
  other: string
}

export interface Consultation {
  id: string
  patient_id: string
  appointment_id?: string | null
  date: string                // YYYY-MM-DD
  status: ConsultationStatus
  chief_complaint: string     // motivo de consulta
  present_illness: string     // padecimiento actual
  vitals: VitalSigns
  glucose_context?: GlucoseContext
  exam: PhysicalExam
  assessment: string          // evaluación / impresión diagnóstica
  diagnoses?: ConsultationDiagnosis[]
  plan: string                // plan y tratamiento
  medications?: ConsultationMedication[]
  follow_up_date?: string | null
  follow_up_notes?: string
  follow_up_schedule?: { time: string; duration_min: number; modality: 'in_person' | 'video_call' }
  created_at: string
  updated_at: string
  revisions?: ConsultationRevision[]
}

export const EMPTY_EXAM: PhysicalExam = {
  general: '', head_neck: '', cardiopulmonary: '', abdomen: '', extremities: '', skin: '', other: '',
}

