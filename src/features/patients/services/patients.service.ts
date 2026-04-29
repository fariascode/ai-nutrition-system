import { supabase } from '@/lib/supabase'
import type { Patient, PatientInsert, PatientUpdate } from '@/types/patient'

export async function getPatients(): Promise<Patient[]> {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function createPatient(input: PatientInsert): Promise<Patient> {
  const { data, error } = await supabase
    .from('patients')
    .insert(input)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updatePatient(id: string, input: PatientUpdate): Promise<Patient> {
  const { data, error } = await supabase
    .from('patients')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deletePatient(id: string): Promise<void> {
  const { error } = await supabase.from('patients').delete().eq('id', id)
  if (error) throw error
}
