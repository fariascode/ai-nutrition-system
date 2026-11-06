import { getMockPatients, getMockPlans, isDemo } from '@/lib/mockData'
import { getAppointments } from '@/features/appointments/services/appointments.service'
import { readLocalJson } from '@/lib/localStorage'
import type { Patient } from '@/types/patient'
import type { PlanWithPatient } from '@/types/plan'
import type { Appointment } from '@/types/appointment'
import type { Consultation } from '@/types/consultation'
import type { MedicalRecord } from '@/types/medicalRecord'
import type { ApprovedPatientInstructions, ProfessionalProfile } from '@/types/patientInstructions'

export interface BackupData {
  patients: Patient[]
  plans: PlanWithPatient[]
  appointments: Appointment[]
  consultations: Consultation[]
  medicalRecords: Record<string, MedicalRecord>
  professionalProfiles: Record<string, ProfessionalProfile>
  patientInstructions: Record<string, ApprovedPatientInstructions>
}

export interface LocalBackup {
  format: 'nutriai-local-backup'
  version: 1
  createdAt: string
  mode: 'demo-local'
  data: BackupData
}

export const BACKUP_STORES = {
  patients: 'nutriai_demo_patients_v2',
  plans: 'nutriai_demo_plans_v2',
  appointments: 'nutriai_demo_appointments_v1',
  consultations: 'nutriai_consultations_v1',
  medicalRecords: 'nutriai_medical_records_v1',
  professionalProfiles: 'nutriai_professional_profiles_v1',
  patientInstructions: 'nutriai_patient_instructions_v1',
} as const

export const BACKUP_LABELS: Record<keyof BackupData, string> = {
  patients: 'Pacientes', plans: 'Planes nutricionales', appointments: 'Citas y notas SOAP',
  consultations: 'Consultas y sus versiones', medicalRecords: 'Expedientes médicos',
  professionalProfiles: 'Perfiles profesionales', patientInstructions: 'Indicaciones aprobadas',
}

export function requireLocalDemo(): void {
  if (!isDemo) throw new Error('Estos respaldos corresponden al modo demo local. No incluyen ni restauran datos de Supabase.')
}

export async function createLocalBackup(): Promise<LocalBackup> {
  requireLocalDemo()
  // Incluye también los datos demo visibles cuando aún no se ha abierto cada módulo.
  getMockPatients()
  getMockPlans()
  await getAppointments()
  const data: BackupData = {
    patients: readLocalJson(BACKUP_STORES.patients, []),
    plans: readLocalJson(BACKUP_STORES.plans, []),
    appointments: readLocalJson(BACKUP_STORES.appointments, []),
    consultations: readLocalJson(BACKUP_STORES.consultations, []),
    medicalRecords: readLocalJson(BACKUP_STORES.medicalRecords, {}),
    professionalProfiles: readLocalJson(BACKUP_STORES.professionalProfiles, {}),
    patientInstructions: readLocalJson(BACKUP_STORES.patientInstructions, {}),
  }
  return { format: 'nutriai-local-backup', version: 1, createdAt: new Date().toISOString(), mode: 'demo-local', data }
}

export function backupCounts(backup: LocalBackup): [string, number][] {
  return (Object.keys(BACKUP_STORES) as (keyof BackupData)[]).map(key => [
    BACKUP_LABELS[key], Array.isArray(backup.data[key]) ? backup.data[key].length : Object.keys(backup.data[key]).length,
  ])
}

export function downloadLocalBackup(backup: LocalBackup, prefix = 'nutriai-respaldo'): string {
  const name = `${prefix}-${backup.createdAt.replace(/[:.]/g, '-')}.json`
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.append(link)
  try { link.click() } finally {
    link.remove()
    // Se conserva temporalmente la URL para que el navegador inicie la descarga.
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }
  return name
}
