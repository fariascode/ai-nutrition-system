import type { Patient, PatientUpdate } from '@/types/patient'
import type { MedicalRecord } from '@/types/medicalRecord'

const STORAGE_KEY = 'nutriai_medical_records_v1'

function readAll(): Record<string, MedicalRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function splitList(text?: string | null): string[] {
  return (text ?? '')
    .split(/[,;•\n]/)
    .map(s => s.trim())
    .filter(Boolean)
}

/**
 * Construye un expediente inicial a partir de los datos que ya existen en la ficha del paciente
 * (alergias, patologías, medicamentos, sueño e hidratación) para no empezar en blanco.
 */
function seedFromPatient(patient: Patient): MedicalRecord {
  return {
    patient_id: patient.id,
    personal: splitList(patient.conditions).map(condition => ({
      id: newId('per'),
      condition,
      status: 'active' as const,
    })),
    family: [],
    surgeries: [],
    hospitalizations: [],
    allergies: splitList(patient.allergies).map(substance => ({
      id: newId('alg'),
      substance,
      severity: 'moderate' as const,
    })),
    medications: splitList(patient.medications).map(name => ({
      id: newId('med'),
      name,
      status: 'active' as const,
    })),
    habits: {
      smoking: 'never',
      alcohol: 'none',
      sleep_hours: patient.sleep_hours ?? undefined,
      water_liters: patient.water_liters ?? undefined,
    },
    updated_at: '',
  }
}

export async function getMedicalRecord(patient: Patient): Promise<MedicalRecord> {
  return readAll()[patient.id] ?? seedFromPatient(patient)
}

export async function saveMedicalRecord(record: MedicalRecord): Promise<MedicalRecord> {
  const all = readAll()
  const saved: MedicalRecord = { ...record, updated_at: new Date().toISOString() }
  all[record.patient_id] = saved
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  return saved
}

export function hasMedicalRecord(patientId: string): boolean {
  return Boolean(readAll()[patientId])
}

/** Conserva detalles del expediente cuando cambia la ficha o el laboratorio. */
export function syncMedicalRecordFromPatient(patient: Patient, changes: PatientUpdate): void {
  const all = readAll()
  const record = all[patient.id]
  if (!record) return
  const key = (value: string) => value.trim().toLocaleLowerCase('es-MX')
  const next = { ...record, habits: { ...record.habits } }
  if (changes.allergies !== undefined && changes.allergies !== patient.allergies) {
    next.allergies = splitList(changes.allergies).map(substance =>
      record.allergies.find(item => key(item.substance) === key(substance)) ??
      { id: newId('alg'), substance, severity: 'moderate' as const },
    )
  }
  if (changes.conditions !== undefined && changes.conditions !== patient.conditions) {
    const names = splitList(changes.conditions)
    next.personal = [
      ...record.personal.map(item => ({ ...item, status: names.some(name => key(name) === key(item.condition)) ? 'active' as const : 'resolved' as const })),
      ...names.filter(name => !record.personal.some(item => key(item.condition) === key(name)))
        .map(condition => ({ id: newId('per'), condition, status: 'active' as const })),
    ]
  }
  if (changes.medications !== undefined && changes.medications !== patient.medications) {
    const names = splitList(changes.medications)
    next.medications = [
      ...record.medications.map(item => ({ ...item, status: names.some(name => key(name) === key(item.name)) ? 'active' as const : 'suspended' as const })),
      ...names.filter(name => !record.medications.some(item => key(item.name) === key(name)))
        .map(name => ({ id: newId('med'), name, status: 'active' as const })),
    ]
  }
  if (changes.sleep_hours !== undefined) next.habits.sleep_hours = changes.sleep_hours ?? undefined
  if (changes.water_liters !== undefined) next.habits.water_liters = changes.water_liters ?? undefined
  if (JSON.stringify(next) === JSON.stringify(record)) return
  all[patient.id] = { ...next, updated_at: new Date().toISOString() }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

