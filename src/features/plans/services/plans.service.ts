import { supabase } from '@/lib/supabase'
import type { NutritionPlan, PlanInsert, PlanUpdate, PlanWithPatient } from '@/types/plan'
import type { Patient } from '@/types/patient'

export async function getPlans(): Promise<PlanWithPatient[]> {
  const { data, error } = await supabase
    .from('nutrition_plans')
    .select('*, patients(full_name)')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as PlanWithPatient[]
}

export async function createPlan(input: PlanInsert): Promise<NutritionPlan> {
  const { data, error } = await supabase
    .from('nutrition_plans')
    .insert(input)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updatePlan(id: string, input: PlanUpdate): Promise<NutritionPlan> {
  const { data, error } = await supabase
    .from('nutrition_plans')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function generateAndSavePlan(
  patient: Patient,
  doctorId: string,
  doctorNotes: string,
): Promise<NutritionPlan> {
  const { data, error } = await supabase.functions.invoke('generate-nutrition-plan', {
    body: { patient, doctorNotes },
  })

  if (error) throw error
  if (data?.error) throw new Error(data.error)

  return createPlan({
    patient_id:           patient.id,
    doctor_id:            doctorId,
    status:               'draft',
    ai_generated_content: data.plan,
    edited_content:       null,
    doctor_notes:         doctorNotes || null,
    calories_target:      null,
    valid_from:           null,
    valid_until:          null,
  })
}
