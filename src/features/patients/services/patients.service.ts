import { supabase } from '@/lib/supabase'
import type { Patient, PatientInsert, PatientUpdate, WeightRecord } from '@/types/patient'
import {
  isDemo,
  getMockPatients,
  createMockPatient,
  updateMockPatient,
  deleteMockPatient,
  addMockWeightCheckin,
} from '@/lib/mockData'

export async function getPatients(): Promise<Patient[]> {
  if (isDemo) {
    return getMockPatients()
  }

  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function createPatient(input: PatientInsert): Promise<Patient> {
  if (isDemo) {
    return createMockPatient(input)
  }

  const { data, error } = await supabase
    .from('patients')
    .insert(input)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updatePatient(id: string, input: PatientUpdate): Promise<Patient> {
  if (isDemo) {
    return updateMockPatient(id, input)
  }

  const { data, error } = await supabase
    .from('patients')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function addWeightCheckin(id: string, record: WeightRecord): Promise<Patient> {
  if (isDemo) {
    return addMockWeightCheckin(id, record)
  }

  // En Supabase actualiza el peso actual del paciente
  return updatePatient(id, {
    weight_kg: record.weight_kg,
    body_fat_pct: record.body_fat_pct,
    muscle_mass_kg: record.muscle_mass_kg,
    waist_cm: record.waist_cm,
  })
}

export async function deletePatient(id: string): Promise<void> {
  if (isDemo) {
    deleteMockPatient(id)
    return
  }

  const { error } = await supabase.from('patients').delete().eq('id', id)
  if (error) throw error
}
