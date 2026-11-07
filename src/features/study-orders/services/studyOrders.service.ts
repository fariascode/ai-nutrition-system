import { isDemo } from '@/lib/mockData'
import { readLocalJson } from '@/lib/localStorage'
import { calendarDate } from '@/utils/calendarDate'
import { getPatientById } from '@/features/patients/services/patients.service'
import { getConsultationsByPatient } from '@/features/consultations/services/consultations.service'
import type { ClinicalActor } from '@/types/consultation'
import type { StudyOrder, StudyOrderInput, StudyResults } from '@/types/studyOrder'

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

export type StudyOrderChange =
  | { action: 'received'; results: StudyResults }
  | { action: 'reviewed'; date: string; notes: string }
  | { action: 'cancelled'; reason: string }

export async function updateStudyOrder(id: string, expectedEvents: number, change: StudyOrderChange, actor: ClinicalActor): Promise<StudyOrder> {
  if (!['received', 'reviewed', 'cancelled'].includes(change.action)) throw new Error('La acción de seguimiento no es válida.')
  const original = getStudyOrders(actor.id).find(order => order.id === id)
  if (!original) throw new Error('La orden no está disponible para este profesional.')
  const { consultation } = await studyOrderContext(original.patient_id, original.consultation_id, actor.id)
  // Releer después de cargar el contexto evita sobrescribir una actualización más reciente.
  const all = readAll()
  const index = all.findIndex(order => order.id === id && order.doctor_id === actor.id)
  const order = all[index]
  if (!order || order.events.length !== expectedEvents) throw new Error('La orden cambió en otra pantalla. Actualiza la lista y revisa la versión actual antes de continuar.')
  if (order.status === 'cancelled') throw new Error('Una orden cancelada conserva su historial y no admite cambios.')
  if (consultation.status === 'voided' && change.action !== 'cancelled') throw new Error('La consulta está anulada. Puedes cancelar la orden conservando su historial.')
  const updated = { ...order }
  const today = calendarDate(new Date().toISOString())
  let notes: string
  if (change.action === 'received') {
    if (order.status !== 'requested') throw new Error('Solo una orden solicitada admite la recepción de resultados. Los resultados guardados se conservan sin sobrescribir.')
    const result = { ...change.results, text: change.results.text.trim(), facility: change.results.facility.trim() }
    if (!result.text) throw new Error('Captura los resultados o el resumen del informe recibido.')
    if (!validStudyDate(result.study_date) || !validStudyDate(result.received_date) || result.study_date < order.requested_date || result.received_date < result.study_date || result.received_date > today) throw new Error('Revisa las fechas: el estudio no puede ser anterior a la solicitud ni posterior a su recepción, y la recepción no puede estar en el futuro.')
    updated.results = result
    notes = `Resultados recibidos el ${result.received_date}${result.facility ? ` · ${result.facility}` : ''}`
  } else if (change.action === 'reviewed') {
    if (order.status !== 'received' || !order.results) throw new Error('Registra la recepción de resultados antes de revisarlos.')
    if (!validStudyDate(change.date) || change.date < order.results.received_date || change.date > today || !change.notes.trim()) throw new Error('Captura una fecha de revisión entre la recepción y hoy, y una nota de revisión profesional.')
    updated.review = { date: change.date, notes: change.notes.trim() }
    notes = updated.review.notes
  } else {
    if (!change.reason.trim()) throw new Error('Escribe el motivo de cancelación.')
    updated.cancellation_reason = change.reason.trim()
    notes = updated.cancellation_reason
  }
  const now = new Date().toISOString()
  updated.status = change.action
  updated.updated_at = now
  updated.events = [...order.events, { at: now, actor: { ...actor }, action: change.action, notes }]
  all[index] = updated
  localStorage.setItem(STUDY_ORDERS_KEY, JSON.stringify(all))
  return updated
}
