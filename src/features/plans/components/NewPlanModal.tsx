import { useState, useEffect, type FormEvent } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { getPatients } from '@/features/patients/services/patients.service'
import { generateAndSavePlan } from '../services/plans.service'
import type { Patient } from '@/types/patient'
import type { NutritionPlan } from '@/types/plan'

interface Props {
  open: boolean
  doctorId: string
  onClose: () => void
  onCreated: (plan: NutritionPlan) => void
}

type Step = 'form' | 'generating' | 'review'

const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition'
const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

export default function NewPlanModal({ open, doctorId, onClose, onCreated }: Props) {
  const [patients, setPatients]     = useState<Patient[]>([])
  const [patientId, setPatientId]   = useState('')
  const [doctorNotes, setDoctorNotes] = useState('')
  const [step, setStep]             = useState<Step>('form')
  const [generatedPlan, setGeneratedPlan] = useState<NutritionPlan | null>(null)
  const [error, setError]           = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setStep('form')
      setPatientId('')
      setDoctorNotes('')
      setError(null)
      setGeneratedPlan(null)
      getPatients().then(setPatients)
    }
  }, [open])

  async function handleGenerate(e: FormEvent) {
    e.preventDefault()
    const patient = patients.find(p => p.id === patientId)
    if (!patient) return

    setStep('generating')
    setError(null)

    try {
      const plan = await generateAndSavePlan(patient, doctorId, doctorNotes)
      setGeneratedPlan(plan)
      setStep('review')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar el plan')
      setStep('form')
    }
  }

  function handleDone() {
    if (generatedPlan) onCreated(generatedPlan)
    onClose()
  }

  const title = step === 'review' ? 'Plan generado' : 'Nuevo plan nutricional'

  return (
    <Modal open={open} title={title} onClose={step === 'generating' ? () => {} : onClose}>

      {step === 'form' && (
        <form onSubmit={handleGenerate} className="space-y-4">
          <div>
            <label className={labelClass}>Paciente</label>
            <select required value={patientId} onChange={e => setPatientId(e.target.value)}
              className={inputClass}>
              <option value="">Selecciona un paciente...</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.full_name}</option>
              ))}
            </select>
            {patients.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">No hay pacientes registrados. Crea uno primero.</p>
            )}
          </div>

          <div>
            <label className={labelClass}>
              Instrucciones para la IA <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <textarea rows={4} value={doctorNotes} onChange={e => setDoctorNotes(e.target.value)}
              className={inputClass}
              placeholder="Ej: Enfócate en comida mexicana tradicional. El paciente trabaja turnos nocturnos. Prioriza proteínas en el desayuno..." />
            <p className="text-xs text-gray-400 mt-1">
              Agrega contexto específico que la IA debe considerar al generar el plan.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={!patientId}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors">
              <Sparkles className="w-4 h-4" />
              Generar con IA
            </button>
          </div>
        </form>
      )}

      {step === 'generating' && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
          <p className="font-medium text-gray-900">Generando plan nutricional...</p>
          <p className="text-sm text-gray-500 text-center">
            La IA está analizando los datos del paciente.<br />Esto puede tomar unos segundos.
          </p>
        </div>
      )}

      {step === 'review' && generatedPlan && (
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg px-4 py-3">
            Plan generado y guardado como borrador. Puedes editarlo desde la lista de planes.
          </div>

          <div>
            <label className={labelClass}>Vista previa del plan</label>
            <textarea
              readOnly
              rows={14}
              value={generatedPlan.ai_generated_content}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-700 resize-none"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button onClick={handleDone}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors">
              Ver en la lista de planes
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
