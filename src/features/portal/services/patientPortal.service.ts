import { getPatientById } from '@/features/patients/services/patients.service'
import { getPlanById, getPlans } from '@/features/plans/services/plans.service'
import { getApprovedPatientInstructions } from '@/features/consultations/services/patientInstructions.service'
import type { PlanWithPatient } from '@/types/plan'
import type { Patient } from '@/types/patient'
import { publishedPlanContent } from '@/features/plans/services/planPublication'
export { publishedPlanContent } from '@/features/plans/services/planPublication'

export function portalPatient(patient: Patient) {
  return { id: patient.id, full_name: patient.full_name, weight_history: (patient.weight_history ?? []).map(record => ({ date: record.date, weight_kg: record.weight_kg, waist_cm: record.waist_cm })) }
}

export async function getPatientPortalData(target: { planId?: string; patientId?: string }) {
  let plan: PlanWithPatient | null = null
  let patientId = target.patientId
  if (target.planId) {
    plan = await getPlanById(target.planId)
    if (!publishedPlanContent(plan)) return null
    patientId = plan?.patient_id
  }
  if (!patientId) return null
  const patient = await getPatientById(patientId)
  if (!patient) return null
  if (!target.planId) {
    plan = (await getPlans()).filter(item => item.patient_id === patient.id && item.doctor_id === patient.doctor_id && publishedPlanContent(item))
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0] ?? null
  }
  if (plan && plan.doctor_id !== patient.doctor_id) return null
  const instructions = await getApprovedPatientInstructions(patient.id, patient.doctor_id)
  if (!plan && !instructions.length) return null
  return {
    patient: portalPatient(patient),
    plan: plan ? { id: plan.id, updated_at: plan.updated_at, valid_from: plan.valid_from, valid_until: plan.valid_until } : null,
    content: publishedPlanContent(plan), instructions,
  }
}
