import { supabase } from '@/lib/supabase'
import { preparePlanUpdate } from './planPublication'
import type { NutritionPlan, PlanInsert, PlanUpdate, PlanWithPatient, ClinicalProtocol, MacroTargets } from '@/types/plan'
import type { Patient } from '@/types/patient'
import {
  isDemo,
  getMockPlans,
  createMockPlan,
  updateMockPlan,
  generateMockAiPlan,
} from '@/lib/mockData'
import { calculateClinicalMacros, calculateEfficacyScore, recommendProtocol } from '@/lib/clinicalEngine'

export async function getPlans(): Promise<PlanWithPatient[]> {
  if (isDemo) {
    return getMockPlans()
  }

  const { data, error } = await supabase
    .from('nutrition_plans')
    .select('*, patients(full_name)')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as PlanWithPatient[]
}

export async function getPlanById(id: string): Promise<PlanWithPatient | null> {
  if (isDemo) {
    return getMockPlans().find(p => p.id === id) ?? null
  }

  const { data, error } = await supabase
    .from('nutrition_plans')
    .select('*, patients(full_name)')
    .eq('id', id)
    .single()

  if (error) return null
  return data as PlanWithPatient
}

export async function createPlan(input: PlanInsert): Promise<NutritionPlan> {
  if (isDemo) {
    return createMockPlan(input)
  }

  const { data, error } = await supabase
    .from('nutrition_plans')
    .insert(input)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updatePlan(id: string, input: PlanUpdate): Promise<NutritionPlan> {
  const current = await getPlanById(id)
  if (!current) throw new Error('Plan no encontrado.')
  const changes = preparePlanUpdate(current, input)
  if (isDemo) {
    return updateMockPlan(id, changes)
  }

  const { data, error } = await supabase
    .from('nutrition_plans')
    .update(changes)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export interface GeneratePlanOptions {
  protocol?: ClinicalProtocol
  mealsPerDay?: number
  macros?: MacroTargets
}

export async function generateAndSavePlan(
  patient: Patient,
  doctorId: string,
  doctorNotes: string,
  options?: GeneratePlanOptions,
): Promise<NutritionPlan> {
  const protocol = options?.protocol ?? recommendProtocol(patient)
  const mealsPerDay = options?.mealsPerDay ?? 4
  const macros = options?.macros ?? calculateClinicalMacros(patient, protocol)
  const efficacy = calculateEfficacyScore(patient, protocol, macros)

  if (isDemo) {
    // Simula el procesamiento clínico y validación metabólica de la IA
    await new Promise(resolve => setTimeout(resolve, 1400))
    const mockContent = generateMockAiPlan(patient, doctorNotes, {
      protocol,
      mealsPerDay,
      macros,
    })

    return createPlan({
      patient_id:              patient.id,
      doctor_id:               doctorId,
      status:                  'draft',
      ai_generated_content:    mockContent,
      edited_content:          null,
      doctor_notes:            doctorNotes || null,
      calories_target:         macros.calories,
      protocol,
      meals_per_day:           mealsPerDay,
      macros,
      clinical_efficacy_score: efficacy.score,
      valid_from:              new Date().toISOString(),
      valid_until:             null,
    })
  }

  const { data, error } = await supabase.functions.invoke('generate-nutrition-plan', {
    body: {
      patient,
      doctorNotes,
      protocol,
      mealsPerDay,
      macros,
    },
  })

  if (error) throw error
  if (data?.error) throw new Error(data.error)

  return createPlan({
    patient_id:              patient.id,
    doctor_id:               doctorId,
    status:                  'draft',
    ai_generated_content:    data.plan,
    edited_content:          null,
    doctor_notes:            doctorNotes || null,
    calories_target:         macros.calories,
    protocol,
    meals_per_day:           mealsPerDay,
    macros,
    clinical_efficacy_score: efficacy.score,
    valid_from:              new Date().toISOString(),
    valid_until:             null,
  })
}
