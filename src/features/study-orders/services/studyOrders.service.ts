import { isDemo } from '@/lib/mockData'
import { readLocalJson } from '@/lib/localStorage'
import { getPatientById } from '@/features/patients/services/patients.service'
import { getConsultationsByPatient } from '@/features/consultations/services/consultations.service'
import type { ClinicalActor } from '@/types/consultation'
import type { StudyOrder, StudyOrderInput } from '@/types/studyOrder'

export const STUDY_ORDERS_KEY = 'nutriai_study_orders_v1'
function requireLocal() {
  if (!isDemo) throw new Error('Las órdenes de estudios están disponibles por ahora en modo demo local.')
}
function readAll(): StudyOrder[] { requireLocal(); return readLocalJson(STUDY_ORDERS_KEY, []) }
export function validStudyDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
}

export function getStudyOrders(doctorId: string): StudyOrder[] {
  return readAll().filter(order => order.doctor_id === doctorId).sort((a, b) => b.requested_date.localeCompare(a.requested_date) || b.created_at.localeCompare(a.created_at))
}

export async function studyOrderContext(patientId: string, consultationId: string, doctorId: string) {
  requireLocal()
  const patient = await getPatientById(patientId)
  if (!patient || patient.doctor_id !== doctorId) throw new Error('El paciente no está disponible para este profesional.')
  const consultation = (await getConsultationsByPatient(patientId)).find(item => item.id === consultationId)
  if (!consultation) throw new Error('La orden debe vincularse a una consulta guardada de este paciente.')
  return { patient, consultation }
}

export async function createStudyOrder(input: StudyOrderInput, actor: ClinicalActor): Promise<StudyOrder> {
  const { patient, consultation } = await studyOrderContext(input.patient_id, input.consultation_id, actor.id)
  if (consultation.status === 'voided') throw new Error('No puedes solicitar estudios desde una consulta anulada.')
  if (!validStudyDate(input.requested_date) || input.requested_date < consultation.date) throw new Error('La fecha de solicitud debe ser válida y no anterior a la consulta.')
  if (!input.reason.trim()) throw new Error('Captura el motivo de la solicitud.')
  const professional = Object.fromEntries(Object.entries(input.professional).map(([key, value]) => [key, value.trim()])) as unknown as StudyOrder['professional']
  if (!professional.name) throw new Error('Captura el nombre del profesional solicitante.')
  if (!input.studies.length) throw new Error('Agrega al menos un estudio.')
  const ids = new Set<string>()
  const names = new Set<string>()
  const studies = input.studies.map(study => {
    const name = study.name.trim()
    const normalized = `${study.kind}:${name.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '')}`
    if (!study.id.trim() || ids.has(study.id) || !['laboratory', 'imaging', 'other'].includes(study.kind) || !name || names.has(normalized)) throw new Error('Revisa los estudios: no puede haber filas vacías ni estudios repetidos.')
    ids.add(study.id); names.add(normalized)
    return { ...study, name, preparation: study.preparation.trim() }
  })
  const now = new Date().toISOString()
  const order: StudyOrder = {
    id: `study-${crypto.randomUUID()}`, patient_id: patient.id, consultation_id: consultation.id, doctor_id: actor.id,
    patient: { full_name: patient.full_name, birth_date: patient.birth_date }, professional,
    requested_date: input.requested_date, reason: input.reason.trim(), studies, status: 'requested',
    created_at: now, updated_at: now, events: [{ at: now, actor: { ...actor }, action: 'requested', notes: 'Solicitud registrada' }],
  }
  const all = readAll()
  all.push(order)
  localStorage.setItem(STUDY_ORDERS_KEY, JSON.stringify(all))
  return order
}
