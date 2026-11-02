import type { Consultation, VitalSigns, GlucoseContext } from '@/types/consultation'

const STORAGE_KEY = 'nutriai_consultations_v1'

function readAll(): Consultation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
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
  return readAll().find(c => c.appointment_id === appointmentId) ?? null
}

export async function saveConsultation(
  input: Omit<Consultation, 'id' | 'created_at' | 'updated_at'> & { id?: string },
): Promise<Consultation> {
  const list = readAll()
  const now = new Date().toISOString()
  const idx = input.id ? list.findIndex(c => c.id === input.id) : -1

  if (idx >= 0) {
    const updated: Consultation = { ...list[idx], ...input, id: list[idx].id, updated_at: now }
    list[idx] = updated
    writeAll(list)
    return updated
  }

  const created: Consultation = {
    ...input,
    id: `con-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    created_at: now,
    updated_at: now,
  }
  list.push(created)
  writeAll(list)
  return created
}

export async function deleteConsultation(id: string): Promise<void> {
  writeAll(readAll().filter(c => c.id !== id))
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

