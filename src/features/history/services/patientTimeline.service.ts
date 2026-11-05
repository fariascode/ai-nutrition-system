import type { Consultation } from '@/types/consultation'
import type { Patient, WeightRecord, LabBiomarkers } from '@/types/patient'
import type { PlanWithPatient } from '@/types/plan'
import { getConsultationsByPatient } from '@/features/consultations/services/consultations.service'
import { getPlans } from '@/features/plans/services/plans.service'
import { getAppointments } from '@/features/appointments/services/appointments.service'
import type { Appointment } from '@/types/appointment'
import { getPatientById } from '@/features/patients/services/patients.service'
import { calendarDate } from '@/utils/calendarDate'

type TimelineBase = { id: string; date: string; title: string }
export type PatientTimelineEvent = TimelineBase & (
  | { kind: 'consultation'; data: Consultation }
  | { kind: 'measurement'; data: WeightRecord }
  | { kind: 'plan'; data: PlanWithPatient }
  | { kind: 'laboratory'; data: LabBiomarkers }
  | { kind: 'soap'; data: Appointment }
)

export function buildPatientTimeline(patient: Patient, consultations: Consultation[], plans: PlanWithPatient[], appointments: Appointment[] = []): PatientTimelineEvent[] {
  const ownConsultations = consultations.filter(item => item.patient_id === patient.id)
  const events: PatientTimelineEvent[] = ownConsultations.map(data => ({ id: `consultation:${data.id}`, date: data.date, kind: 'consultation', title: data.chief_complaint, data }))
  for (const [index, data] of (patient.weight_history ?? []).entries()) {
    const linked = data.body_fat_pct === undefined && data.muscle_mass_kg === undefined && data.waist_cm === undefined && ownConsultations.some(consultation => data.notes === `Consulta médica: ${consultation.id}` && consultation.date === data.date && consultation.vitals.weight_kg === data.weight_kg && consultation.status === 'closed')
    if (!linked) events.push({ id: `measurement:${patient.id}:${index}`, date: data.date, kind: 'measurement', title: 'Control corporal', data })
  }
  for (const data of appointments.filter(item => item.patient_id === patient.id && item.soap_note)) {
    events.push({ id: `soap:${data.id}`, date: data.date, kind: 'soap', title: data.reason || 'Nota de consulta SOAP', data })
  }
  for (const data of plans.filter(item => item.patient_id === patient.id)) {
    events.push({ id: `plan:${data.id}`, date: data.created_at, kind: 'plan', title: 'Plan nutricional', data })
  }
  const bio = patient.biomarkers
  if (bio && Object.entries(bio).some(([key, value]) => key !== 'last_lab_date' && typeof value === 'number')) {
    events.push({ id: `laboratory:${patient.id}`, date: bio.last_lab_date ?? patient.updated_at, kind: 'laboratory', title: 'Últimos resultados registrados', data: bio })
  }
  return events.map(event => ({ ...event, date: calendarDate(event.date) })).sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id))
}

export async function getPatientTimeline(patient: Patient): Promise<PatientTimelineEvent[]> {
  const [current, consultations, plans, appointments] = await Promise.all([getPatientById(patient.id), getConsultationsByPatient(patient.id), getPlans(), getAppointments()])
  if (!current) throw new Error('El paciente ya no está disponible.')
  return buildPatientTimeline(current, consultations, plans, appointments)
}
