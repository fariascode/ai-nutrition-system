import type { ClinicalActor } from './consultation'
import type { ProfessionalProfile } from './patientInstructions'

export type StudyKind = 'laboratory' | 'imaging' | 'other'
export type StudyOrderStatus = 'requested' | 'received' | 'reviewed' | 'cancelled'
export interface OrderedStudy { id: string; kind: StudyKind; name: string; preparation: string }
export interface StudyResults { study_date: string; received_date: string; facility: string; text: string }
export interface StudyOrderEvent {
  at: string
  actor: ClinicalActor
  action: StudyOrderStatus
  notes: string
}
export interface StudyOrder {
  id: string
  patient_id: string
  consultation_id: string
  doctor_id: string
  patient: { full_name: string; birth_date: string }
  professional: ProfessionalProfile
  requested_date: string
  reason: string
  studies: OrderedStudy[]
  status: StudyOrderStatus
  results?: StudyResults
  review?: { date: string; notes: string }
  cancellation_reason?: string
  created_at: string
  updated_at: string
  events: StudyOrderEvent[]
}
export type StudyOrderInput = Pick<StudyOrder, 'patient_id' | 'consultation_id' | 'professional' | 'requested_date' | 'reason' | 'studies'>

export const STUDY_KIND_LABELS: Record<StudyKind, string> = { laboratory: 'Laboratorio', imaging: 'Imagen', other: 'Otro estudio' }
export const STUDY_STATUS_LABELS: Record<StudyOrderStatus, string> = { requested: 'Solicitado', received: 'Recibido', reviewed: 'Revisado', cancelled: 'Cancelado' }
