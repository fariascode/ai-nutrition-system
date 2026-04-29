export type PlanStatus = 'draft' | 'published' | 'archived'

export interface NutritionPlan {
  id: string
  created_at: string
  patient_id: string
  doctor_id: string
  status: PlanStatus
  ai_generated_content: string
  doctor_notes: string | null
  edited_content: string | null
  calories_target: number | null
  valid_from: string | null
  valid_until: string | null
}

export type PlanInsert = Omit<NutritionPlan, 'id' | 'created_at'>
export type PlanUpdate = Partial<PlanInsert>
