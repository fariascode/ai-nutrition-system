import type { NutritionPlan, PlanUpdate } from '@/types/plan'

export function publishedPlanContent(plan: NutritionPlan | null): string | null {
  if (!plan || plan.status !== 'published') return null
  const content = plan.edited_content ?? plan.ai_generated_content
  return content.trim() ? content : null
}

export function preparePlanUpdate(current: NutritionPlan, input: PlanUpdate): PlanUpdate {
  const next = { ...current, ...input }
  if (input.status === 'published' && !(next.edited_content ?? next.ai_generated_content).trim()) throw new Error('La prescripción no puede estar vacía al publicarla.')
  const publicFields: (keyof PlanUpdate)[] = ['edited_content', 'ai_generated_content', 'calories_target', 'macros', 'protocol', 'meals_per_day', 'valid_from', 'valid_until']
  const changed = publicFields.some(key => key in input && JSON.stringify(input[key]) !== JSON.stringify(current[key]))
  return current.status === 'published' && changed && input.status === undefined ? { ...input, status: 'draft' } : input
}
