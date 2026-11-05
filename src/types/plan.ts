export type PlanStatus = 'draft' | 'published' | 'archived'

export type ClinicalProtocol =
  | 'caloric_deficit'
  | 'recomposition'
  | 'muscle_gain'
  | 'glycemic_control'
  | 'dash_cardio'
  | 'mediterranean'
  | 'ketogenic'
  | 'balanced'

export interface MacroTargets {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  protein_pct: number
  carbs_pct: number
  fat_pct: number
  fiber_g: number
  water_liters: number
}

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

  // Campos clínicos de alta precisión (opcionales)
  protocol?: ClinicalProtocol
  meals_per_day?: number
  macros?: MacroTargets | null
  /** Campo heredado: no se genera ni se muestra como una medición de eficacia. */
  clinical_efficacy_score?: number
}

export type PlanInsert = Omit<NutritionPlan, 'id' | 'created_at' | 'updated_at'>
export type PlanUpdate = Partial<Omit<PlanInsert, 'doctor_id' | 'patient_id'>>

export interface PlanWithPatient extends NutritionPlan {
  patients: { full_name: string }
}
