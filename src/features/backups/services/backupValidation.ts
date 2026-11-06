import type { LocalBackup } from './localBackup'

export const MAX_BACKUP_BYTES = 20 * 1024 * 1024
type Check = (value: unknown, path: string) => void
type Row = Record<string, unknown>

function invalid(path: string): never {
  throw new Error(`Respaldo inválido: revisa ${path}. No se modificaron los datos locales.`)
}
const text: Check = (v, p) => { if (typeof v !== 'string') invalid(p) }
const number: Check = (v, p) => { if (typeof v !== 'number' || !Number.isFinite(v)) invalid(p) }
const id: Check = (v, p) => { text(v, p); if (!(v as string).trim()) invalid(p) }
const optional = (check: Check): Check => (v, p) => { if (v !== undefined) check(v, p) }
const nullable = (check: Check): Check => (v, p) => { if (v !== null) check(v, p) }
const choice = (...values: unknown[]): Check => (v, p) => { if (!values.includes(v)) invalid(p) }
const date: Check = (v, p) => {
  text(v, p)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v as string) || !Number.isFinite(Date.parse(v as string)) || new Date(v as string).toISOString().slice(0, 10) !== v) invalid(p)
}
const timestamp: Check = (v, p) => { text(v, p); if (!/^\d{4}-\d{2}-\d{2}T/.test(v as string) || !Number.isFinite(Date.parse(v as string))) invalid(p) }
const time: Check = (v, p) => { if (typeof v !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) invalid(p) }
const optionalText = optional(text)
const optionalNumber = optional(number)
const optionalNullableText = optional(nullable(text))

function row(value: unknown, path: string): Row {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid(path)
  return value as Row
}
function object(fields: Record<string, Check>): Check {
  return (v, p) => {
    const value = row(v, p)
    for (const key of Object.keys(value)) if (!Object.hasOwn(fields, key)) invalid(`${p}.${key} (campo no compatible)`)
    for (const [key, check] of Object.entries(fields)) check(value[key], `${p}.${key}`)
  }
}
function list(check: Check, uniqueIds = false): Check {
  return (v, p) => {
    if (!Array.isArray(v)) invalid(p)
    const ids = new Set()
    v.forEach((item, i) => {
      check(item, `${p}[${i}]`)
      if (uniqueIds) {
        const value = row(item, p)
        if (ids.has(value.id)) invalid(`${p} (identificadores duplicados)`)
        ids.add(value.id)
      }
    })
  }
}
function dictionary(check: Check, identityField?: string): Check {
  return (v, p) => {
    for (const [key, value] of Object.entries(row(v, p))) {
      id(key, p)
      check(value, `${p}.${key}`)
      if (identityField && row(value, p)[identityField] !== key) invalid(`${p}.${key} (identidad distinta)`)
    }
  }
}
const stringFields = (keys: string[], check = text) => Object.fromEntries(keys.map(key => [key, check]))
const numericFields = (keys: string[], check = optionalNumber) => Object.fromEntries(keys.map(key => [key, check]))
const actor = object({ id, label: text })
const profile = object(stringFields(['name', 'registration', 'clinic', 'address', 'phone', 'email']))
const diagnoses = list(object({ id, name: text, role: choice('primary', 'secondary'), certainty: choice('suspected', 'confirmed'), notes: text }), true)
const medications = list(object({ id, ...stringFields(['name', 'presentation', 'dose', 'route', 'frequency', 'duration', 'instructions']) }), true)
const instructionsFields = {
  date, status: choice('draft', 'closed', 'voided'), diagnoses: optional(diagnoses), medications: optional(medications),
  plan: text, follow_up_date: optionalNullableText, follow_up_notes: optionalText,
}
const consultationFields = {
  ...instructionsFields, id, patient_id: id, appointment_id: optional(nullable(id)), created_at: timestamp, updated_at: timestamp,
  chief_complaint: text, present_illness: text, assessment: text,
  glucose_context: optional(choice('unknown', 'fasting', 'random', 'postprandial')),
  vitals: object(numericFields(['systolic_bp', 'diastolic_bp', 'heart_rate', 'resp_rate', 'temperature_c', 'spo2', 'weight_kg', 'height_cm', 'glucose'])),
  exam: object(stringFields(['general', 'head_neck', 'cardiopulmonary', 'abdomen', 'extremities', 'skin', 'other'], optionalText)),
  follow_up_schedule: optional(object({ time, duration_min: number, modality: choice('in_person', 'video_call') })),
}
const consultations = list(object({
  ...consultationFields,
  revisions: optional(list(object({
    at: timestamp, actor, action: choice('created', 'updated', 'closed', 'reopened', 'voided'),
    reason: optionalText, previous: optional(object(consultationFields)),
  }))),
}), true)
const patients = list(object({
  id, doctor_id: id, created_at: timestamp, updated_at: timestamp, full_name: text, birth_date: date,
  gender: choice('male', 'female', 'other'), weight_kg: number, height_cm: number, goal: text,
  allergies: nullable(text), conditions: nullable(text), notes: nullable(text),
  ...stringFields(['email', 'phone', 'medications', 'dietary_preferences'], optionalNullableText),
  activity_level: optional(choice('sedentary', 'light', 'moderate', 'active', 'athlete')),
  ...numericFields(['body_fat_pct', 'muscle_mass_kg', 'waist_cm', 'sleep_hours', 'water_liters'], optional(nullable(number))),
  biomarkers: optional(nullable(object({
    ...numericFields(['fasting_glucose', 'fasting_insulin', 'hba1c', 'systolic_bp', 'diastolic_bp', 'cholesterol_total', 'ldl_cholesterol', 'hdl_cholesterol', 'triglycerides', 'uric_acid', 'creatinine', 'tsh', 'vitamin_d', 'ferritin']),
    last_lab_date: optional(date),
  }))),
  weight_history: optional(list(object({ date, weight_kg: number, ...numericFields(['body_fat_pct', 'muscle_mass_kg', 'waist_cm']), notes: optionalText }))),
}), true)
const plans = list(object({
  id, doctor_id: id, patient_id: id, created_at: timestamp, updated_at: timestamp, status: choice('draft', 'published', 'archived'),
  ai_generated_content: text, edited_content: nullable(text), doctor_notes: nullable(text), calories_target: nullable(number),
  valid_from: nullable(timestamp), valid_until: nullable(timestamp),
  protocol: optional(choice('caloric_deficit', 'recomposition', 'muscle_gain', 'glycemic_control', 'dash_cardio', 'mediterranean', 'ketogenic', 'balanced')),
  meals_per_day: optionalNumber, clinical_efficacy_score: optionalNumber,
  macros: optional(nullable(object(numericFields(['calories', 'protein_g', 'carbs_g', 'fat_g', 'protein_pct', 'carbs_pct', 'fat_pct', 'fiber_g', 'water_liters'], number)))),
  patients: object({ full_name: text }),
}), true)
const appointments = list(object({
  id, doctor_id: id, patient_id: id, created_at: timestamp, patient_name: text, patient_phone: optionalNullableText,
  date, time, duration_min: number, type: choice('first_visit', 'follow_up', 'body_comp', 'lab_review'),
  modality: choice('in_person', 'video_call'), status: choice('scheduled', 'confirmed', 'completed', 'cancelled'),
  reason: text, prep_instructions: optionalNullableText, source_consultation_id: optional(id),
  soap_note: optional(nullable(object({
    ...stringFields(['subjective', 'objective', 'analysis', 'plan']), updated_at: timestamp,
    ...numericFields(['recorded_weight_kg', 'recorded_body_fat_pct', 'recorded_muscle_kg', 'recorded_waist_cm']),
  }))),
}), true)
const medicalRecord = object({
  patient_id: id, updated_at: timestamp,
  personal: list(object({ id, condition: text, since: optionalText, status: choice('active', 'resolved'), notes: optionalText }), true),
  family: list(object({ id, relative: text, condition: text, notes: optionalText }), true),
  surgeries: list(object({ id, procedure: text, year: optionalText, notes: optionalText }), true),
  hospitalizations: list(object({ id, reason: text, year: optionalText, notes: optionalText }), true),
  allergies: list(object({ id, substance: text, reaction: optionalText, severity: choice('unknown', 'mild', 'moderate', 'severe') }), true),
  medications: list(object({ id, name: text, dose: optionalText, frequency: optionalText, since: optionalText, status: choice('active', 'suspended') }), true),
  habits: object({ smoking: choice('unknown', 'never', 'former', 'current'), alcohol: choice('unknown', 'none', 'occasional', 'frequent'), ...numericFields(['exercise_per_week', 'sleep_hours', 'water_liters']), diet_notes: optionalText, other: optionalText }),
  review_status: optional(object(stringFields(['personal', 'family', 'surgeries', 'hospitalizations', 'allergies', 'medications'], optional(choice('unknown', 'none', 'recorded'))))),
})
const studyOrders = list(object({
  id, patient_id: id, consultation_id: id, doctor_id: id, patient: object({ full_name: text, birth_date: date }), professional: profile,
  requested_date: date, reason: text, status: choice('requested', 'received', 'reviewed', 'cancelled'),
  studies: list(object({ id, kind: choice('laboratory', 'imaging', 'other'), name: text, preparation: text }), true),
  results: optional(object({ study_date: date, received_date: date, facility: text, text })),
  review: optional(object({ date, notes: text })), cancellation_reason: optionalText,
  created_at: timestamp, updated_at: timestamp,
  events: list(object({ at: timestamp, actor, action: choice('requested', 'received', 'reviewed', 'cancelled'), notes: text })),
}), true)
const originalDataFields = { patients, plans, appointments, consultations,
    medicalRecords: dictionary(medicalRecord, 'patient_id'), professionalProfiles: dictionary(profile),
    patientInstructions: dictionary(object({
      consultation_id: id, patient_id: id, patient: object({ full_name: text, birth_date: date }),
      approved_at: timestamp, actor, fingerprint: text, source: object({ ...instructionsFields, id: optional(id) }), professional: profile,
    }), 'consultation_id'),
}
const metadata = { format: choice('nutriai-local-backup'), createdAt: timestamp, mode: choice('demo-local') }
const oldBackupSchema = object({ ...metadata, version: choice(1), data: object(originalDataFields) })
const backupSchema = object({ ...metadata, version: choice(2), data: object({ ...originalDataFields, studyOrders }) })

/** No escribe en almacenamiento; devuelve una copia aislada del archivo validado. */
export function parseLocalBackup(contents: string): LocalBackup {
  if (new TextEncoder().encode(contents).length > MAX_BACKUP_BYTES) throw new Error('El archivo supera el límite de 20 MB.')
  let parsed: unknown
  try {
    parsed = JSON.parse(contents, (key, value) => {
      if (['__proto__', 'prototype', 'constructor'].includes(key)) throw new Error()
      return value
    })
  } catch { throw new Error('El archivo no contiene un JSON de respaldo válido. No se modificaron los datos locales.') }
  if (parsed && typeof parsed === 'object' && (parsed as Row).version === 1) {
    oldBackupSchema(parsed, 'archivo')
    const legacy = parsed as { data: object }
    parsed = { ...legacy, version: 2, data: { ...legacy.data, studyOrders: [] } }
  }
  backupSchema(parsed, 'archivo')
  const backup = parsed as LocalBackup
  for (const order of backup.data.studyOrders) {
    const path = `órdenes de estudios (${order.id})`
    if (!order.reason.trim() || !order.professional.name.trim() || !order.studies.length || order.studies.some(study => !study.name.trim()) || order.events[0]?.action !== 'requested' || order.events.at(-1)?.action !== order.status) invalid(path)
    const allowed: Record<string, string[]> = { requested: ['received', 'cancelled'], received: ['reviewed', 'cancelled'], reviewed: ['cancelled'], cancelled: [] }
    for (let index = 0; index < order.events.length; index++) {
      const event = order.events[index]
      if (event.actor.id !== order.doctor_id || (index > 0 && !allowed[order.events[index - 1].action].includes(event.action))) invalid(path)
    }
    if (Boolean(order.results) !== order.events.some(event => event.action === 'received') || Boolean(order.review) !== order.events.some(event => event.action === 'reviewed')) invalid(path)
    if (order.results && (!order.results.text.trim() || order.results.study_date < order.requested_date || order.results.received_date < order.results.study_date)) invalid(path)
    if (order.review && (!order.review.notes.trim() || !order.results || order.review.date < order.results.received_date)) invalid(path)
    if (order.status === 'cancelled' && !order.cancellation_reason?.trim()) invalid(path)
  }
  return backup
}

export function backupWarnings(backup: LocalBackup): string[] {
  const { data } = backup
  const patients = new Set(data.patients.map(p => p.id))
  const consultations = new Map(data.consultations.map(c => [c.id, c]))
  const appointments = new Map(data.appointments.map(a => [a.id, a]))
  const warnings: string[] = []
  const labels = { plans: 'planes', appointments: 'citas', consultations: 'consultas', medicalRecords: 'expedientes', patientInstructions: 'indicaciones', studyOrders: 'órdenes de estudios' }
  for (const name of ['plans', 'appointments', 'consultations', 'medicalRecords', 'patientInstructions', 'studyOrders'] as const) {
    const items = Object.values(data[name])
    const missing = items.filter(item => !patients.has(item.patient_id)).length
    if (missing) warnings.push(`${missing} registros de ${labels[name]} no tienen su paciente en el archivo; se conservarán como registros sin ficha asociada.`)
  }
  if (data.consultations.some(c => c.appointment_id && !appointments.has(c.appointment_id))) warnings.push('Algunas consultas remiten a citas que ya no están en la agenda del archivo.')
  if (data.appointments.some(a => a.source_consultation_id && !consultations.has(a.source_consultation_id))) warnings.push('Algunas citas remiten a consultas que no están en el archivo.')
  if (Object.values(data.patientInstructions).some(i => !consultations.has(i.consultation_id))) warnings.push('Algunas indicaciones no tienen su consulta original y no se mostrarán en el portal.')
  if (data.studyOrders.some(order => !consultations.has(order.consultation_id))) warnings.push('Algunas órdenes remiten a consultas que no están en el archivo.')
  return warnings
}
