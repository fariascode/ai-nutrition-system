import type { Consultation, ClinicalActor } from './consultation'

export interface ProfessionalProfile {
  name: string
  registration: string
  clinic: string
  address: string
  phone: string
  email: string
}

export type InstructionsSource = Pick<Consultation, 'date' | 'status' | 'diagnoses' | 'medications' | 'plan' | 'follow_up_date' | 'follow_up_notes'> & { id?: string }

export interface ApprovedPatientInstructions {
  consultation_id: string
  patient_id: string
  patient: { full_name: string; birth_date: string }
  approved_at: string
  actor: ClinicalActor
  fingerprint: string
  source: InstructionsSource
  professional: ProfessionalProfile
}
