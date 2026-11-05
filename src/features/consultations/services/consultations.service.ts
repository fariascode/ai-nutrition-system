import type { Consultation, VitalSigns, GlucoseContext, ClinicalActor, ConsultationRevision } from '@/types/consultation'
import { readLocalJson } from '@/lib/localStorage'
import { normalizeDiagnoses } from './consultationDetails'

const STORAGE_KEY = 'nutriai_consultations_v1'

function readAll(): Consultation[] {
  return readLocalJson<Consultation[]>(STORAGE_KEY, [])
}

function writeAll(list: Consultation[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

export async function getConsultationsByPatient(patientId: string): Promise<Consultation[]> {
  return readAll()
    .filter(c => c.patient_id === patientId)
    .sort((a, b) => `${b.date}${b.created_at}`.localeCompare(`${a.date}${a.created_at}`))
}

export async function getConsultationByAppointment(appointmentId: string): Promise<Consultation | null> {
  return readAll().find(c => c.appointment_id === appointmentId && c.status !== 'voided') ?? null
}

export async function saveConsultation(
  input: Omit<Consultation, 'id' | 'created_at' | 'updated_at' | 'revisions'> & { id?: string },
  actor: ClinicalActor = { id: 'local', label: 'Usuario local' },
  reason?: string,
): Promise<Consultation> {
  if (!input.chief_complaint.trim()) throw new Error('El motivo de consulta es obligatorio.')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || Number.isNaN(new Date(input.date).getTime())) throw new Error('Selecciona una fecha válida para la consulta.')
  const diagnoses = normalizeDiagnoses(input.diagnoses)
  if (input.status === 'closed' && ((!input.assessment.trim() && !diagnoses.length) || !input.plan.trim())) throw new Error('Para cerrar captura evaluación o diagnósticos, y un plan.')
  if (Object.values(input.vitals).some(value => !Number.isFinite(value) || value <= 0) || (input.vitals.spo2 ?? 0) > 100) {
    throw new Error('Revisa los signos vitales: deben ser números positivos y la saturación no puede superar 100%.')
  }
  const list = readAll()
  const now = new Date().toISOString()
  const idx = input.id ? list.findIndex(c => c.id === input.id) : -1

  if (idx >= 0) {
    const previous = list[idx]
    if (previous.patient_id !== input.patient_id) throw new Error('La consulta pertenece a otro paciente.')
    if (previous.status === 'voided') throw new Error('Una consulta anulada conserva su historial y no puede modificarse.')
    const reopening = previous.status === 'closed' && input.status === 'draft'
    if (previous.status === 'closed' && !reopening && input.status !== 'voided') throw new Error('Reabre la consulta antes de modificarla.')
    if ((reopening || input.status === 'voided') && !reason?.trim()) throw new Error('Escribe el motivo de la reapertura o anulación.')
    const { revisions, ...snapshot } = previous
    const action: ConsultationRevision['action'] = input.status === 'voided' ? 'voided' : reopening ? 'reopened' : input.status === 'closed' ? 'closed' : 'updated'
    const updated: Consultation = { ...previous, ...input, diagnoses, id: previous.id, updated_at: now,
      revisions: [...(revisions ?? []), { at: now, actor, action, reason: reason?.trim(), previous: snapshot }],
    }
    list[idx] = updated
    writeAll(list)
    return updated
  }

  const created: Consultation = {
    ...input,
    diagnoses,
    id: `con-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    created_at: now,
    updated_at: now,
    revisions: [{ at: now, actor, action: input.status === 'closed' ? 'closed' : 'created' }],
  }
  list.push(created)
  writeAll(list)
  return created
}

export async function deleteConsultation(id: string, reason: string, actor?: ClinicalActor): Promise<void> {
  const existing = readAll().find(c => c.id === id)
  if (!existing) throw new Error('Consulta no encontrada.')
  await saveConsultation({ ...existing, status: 'voided' }, actor, reason)
}

/** Presión arterial media (PAM) = (sistólica + 2 × diastólica) / 3 */
export function meanArterialPressure(v: VitalSigns): number | null {
  if (!v.systolic_bp || !v.diastolic_bp) return null
  return Math.round((v.systolic_bp + 2 * v.diastolic_bp) / 3)
}

export interface VitalFlag {
  key: string
  label: string
  /** Texto explícito para no depender solo del color */
  text: string
  level: 'warning' | 'danger'
}

/**
 * Señala valores fuera de rangos de referencia generales para adulto.
 * Es una ayuda visual para el médico, no un diagnóstico.
 */
export function evaluateVitals(v: VitalSigns, glucoseContext: GlucoseContext = 'unknown'): VitalFlag[] {
  const flags: VitalFlag[] = []

  if (v.systolic_bp && v.diastolic_bp) {
    if (v.systolic_bp >= 180 || v.diastolic_bp >= 120) {
      flags.push({ key: 'bp', label: 'Presión arterial', text: `${v.systolic_bp}/${v.diastolic_bp} mmHg: muy elevada`, level: 'danger' })
    } else if (v.systolic_bp >= 140 || v.diastolic_bp >= 90) {
      flags.push({ key: 'bp', label: 'Presión arterial', text: `${v.systolic_bp}/${v.diastolic_bp} mmHg: elevada`, level: 'warning' })
    } else if (v.systolic_bp < 90 || v.diastolic_bp < 60) {
      flags.push({ key: 'bp', label: 'Presión arterial', text: `${v.systolic_bp}/${v.diastolic_bp} mmHg: baja`, level: 'warning' })
    }
  }
  if (v.heart_rate) {
    if (v.heart_rate > 100) flags.push({ key: 'hr', label: 'Frecuencia cardiaca', text: `${v.heart_rate} lpm: taquicardia`, level: 'warning' })
    else if (v.heart_rate < 60) flags.push({ key: 'hr', label: 'Frecuencia cardiaca', text: `${v.heart_rate} lpm: bradicardia`, level: 'warning' })
  }
  if (v.resp_rate && (v.resp_rate > 20 || v.resp_rate < 12)) {
    flags.push({ key: 'rr', label: 'Frecuencia respiratoria', text: `${v.resp_rate} rpm: fuera de rango (12–20)`, level: 'warning' })
  }
  if (v.temperature_c) {
    if (v.temperature_c >= 38) flags.push({ key: 'temp', label: 'Temperatura', text: `${v.temperature_c} °C: fiebre`, level: 'danger' })
    else if (v.temperature_c < 35.5) flags.push({ key: 'temp', label: 'Temperatura', text: `${v.temperature_c} °C: baja`, level: 'warning' })
  }
  if (v.spo2) {
    if (v.spo2 < 90) flags.push({ key: 'spo2', label: 'Saturación de oxígeno', text: `${v.spo2}%: hipoxemia`, level: 'danger' })
    else if (v.spo2 < 95) flags.push({ key: 'spo2', label: 'Saturación de oxígeno', text: `${v.spo2}%: por debajo de lo esperado`, level: 'warning' })
  }
  if (v.glucose) {
    if (v.glucose >= 200) flags.push({ key: 'glu', label: 'Glucosa capilar', text: `${v.glucose} mg/dL: muy elevada`, level: 'danger' })
    else if (glucoseContext === 'fasting' && v.glucose >= 126) flags.push({ key: 'glu', label: 'Glucosa capilar', text: `${v.glucose} mg/dL: elevada en ayuno registrado`, level: 'warning' })
    else if (v.glucose < 70) flags.push({ key: 'glu', label: 'Glucosa capilar', text: `${v.glucose} mg/dL: hipoglucemia`, level: 'danger' })
  }
  return flags
}

