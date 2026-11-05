import type { Consultation } from './consultation'

export interface ProfessionalProfile {
  name: string
  registration: string
  clinic: string
  address: string
  phone: string
  email: string
}

export type InstructionsSource = Pick<Consultation, 'date' | 'status' | 'diagnoses' | 'medications' | 'plan' | 'follow_up_date' | 'follow_up_notes'> & { id?: string }
