export type PlanStatus = 'draft' | 'published' | 'archived'

export interface NutritionPlan {
  id: string
  created_at: string
  updated_at: string
  patient_id: string
  doctor_id: string
  status: PlanStatus
  ai_generated_content: string
  edited_content: string | null
  doctor_notes: string | null
  calories_target: number | null
  valid_from: string | null
  valid_until: string | null
}

export type PlanInsert = Omit<NutritionPlan, 'id' | 'created_at' | 'updated_at'>
export type PlanUpdate = Partial<Omit<PlanInsert, 'doctor_id' | 'patient_id'>>

export interface PlanWithPatient extends NutritionPlan {
  patients: { full_name: string }
}
