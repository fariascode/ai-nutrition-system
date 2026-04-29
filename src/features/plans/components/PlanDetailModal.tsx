import { useState, useEffect } from 'react'
import { CheckCircle, Archive } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { updatePlan } from '../services/plans.service'
import type { NutritionPlan, PlanWithPatient, PlanStatus } from '@/types/plan'

interface Props {
  open: boolean
  plan: PlanWithPatient | null
  onClose: () => void
  onUpdated: (plan: NutritionPlan) => void
}

const labelClass = 'block text-sm font-medium text-gray-700 mb-1'
const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition'

const statusLabel: Record<PlanStatus, string> = {
  draft:     'Borrador',
  published: 'Publicado',
  archived:  'Archivado',
}

const statusColor: Record<PlanStatus, string> = {
  draft:     'bg-amber-100 text-amber-700',
  published: 'bg-emerald-100 text-emerald-700',
  archived:  'bg-gray-100 text-gray-600',
}

export default function PlanDetailModal({ open, plan, onClose, onUpdated }: Props) {
  const [content, setContent]     = useState('')
  const [doctorNotes, setDoctorNotes] = useState('')
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)

  useEffect(() => {
    if (plan) {
      setContent(plan.edited_content ?? plan.ai_generated_content)
      setDoctorNotes(plan.doctor_notes ?? '')
      setSaved(false)
    }
  }, [plan])

  async function handleSave(newStatus?: PlanStatus) {
    if (!plan) return
    setSaving(true)
    try {
      const updated = await updatePlan(plan.id, {
        edited_content: content !== plan.ai_generated_content ? content : null,
        doctor_notes:   doctorNotes || null,
        ...(newStatus ? { status: newStatus } : {}),
      })
      onUpdated(updated)
      setSaved(true)
      if (newStatus) onClose()
    } finally {
      setSaving(false)
    }
  }

  if (!plan) return null

  return (
    <Modal open={open} title={`Plan — ${plan.patients.full_name}`} onClose={onClose}>
      <div className="space-y-4">

        <div className="flex items-center gap-3">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[plan.status]}`}>
            {statusLabel[plan.status]}
          </span>
          <span className="text-xs text-gray-400">
            {new Date(plan.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>

        <div>
          <label className={labelClass}>Contenido del plan</label>
          <textarea
            rows={16}
            value={content}
            onChange={e => { setContent(e.target.value); setSaved(false) }}
            className={inputClass + ' resize-none'}
          />
          {content !== plan.ai_generated_content && (
            <p className="text-xs text-amber-600 mt-1">Editado por el doctor</p>
          )}
        </div>

        <div>
          <label className={labelClass}>
            Notas del doctor <span className="text-gray-400 font-normal">(internas)</span>
          </label>
          <textarea rows={3} value={doctorNotes}
            onChange={e => { setDoctorNotes(e.target.value); setSaved(false) }}
            className={inputClass}
            placeholder="Observaciones, seguimiento, ajustes pendientes..." />
        </div>

        {saved && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg px-4 py-3">
            Cambios guardados correctamente.
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <div className="flex gap-2">
            {plan.status !== 'archived' && (
              <button onClick={() => handleSave('archived')} disabled={saving}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <Archive className="w-4 h-4" /> Archivar
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleSave()} disabled={saving}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 rounded-lg transition-colors">
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
            {plan.status === 'draft' && (
              <button onClick={() => handleSave('published')} disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition-colors">
                <CheckCircle className="w-4 h-4" /> Publicar plan
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
