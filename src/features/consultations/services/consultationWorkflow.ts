import type { Consultation, ClinicalActor } from '@/types/consultation'
import type { Patient } from '@/types/patient'
import { saveConsultation } from './consultations.service'
import { syncConsultationAppointments } from '@/features/appointments/services/appointments.service'
import { getPatientById, updatePatient } from '@/features/patients/services/patients.service'
import { withLocalRollback } from '@/lib/localStorage'
import { isDemo } from '@/lib/mockData'

type ConsultationInput = Omit<Consultation, 'id' | 'created_at' | 'updated_at' | 'revisions'> & { id?: string }

export async function saveConsultationWorkflow(input: ConsultationInput, patient: Patient, syncMetrics: boolean, actor: ClinicalActor) {
  return withLocalRollback(async () => {
    const saved = await saveConsultation(input, actor)
    await syncConsultationAppointments(saved, patient)
    // Esta etapa solo sincroniza datos locales. La integración remota queda pendiente.
    if (saved.status === 'closed' && syncMetrics && isDemo) {
      const vitals = saved.vitals
      const latest = await getPatientById(patient.id)
      if (!latest) throw new Error('El paciente ya no está disponible.')
      await updatePatient(patient.id, {
        ...(vitals.weight_kg ? {
          weight_kg: vitals.weight_kg,
          weight_history: [
            ...(latest.weight_history ?? []).filter(record => record.notes !== `Consulta médica: ${saved.id}`),
            { date: saved.date, weight_kg: vitals.weight_kg, notes: `Consulta médica: ${saved.id}` },
          ],
        } : {}),
        ...(vitals.height_cm ? { height_cm: vitals.height_cm } : {}),
        biomarkers: {
          ...latest.biomarkers,
          ...(vitals.systolic_bp ? { systolic_bp: vitals.systolic_bp } : {}),
          ...(vitals.diastolic_bp ? { diastolic_bp: vitals.diastolic_bp } : {}),
          ...(vitals.glucose && saved.glucose_context === 'fasting' ? { fasting_glucose: vitals.glucose } : {}),
        },
      })
    }
    return saved
  })
}
