import { useState, useEffect, type FormEvent } from 'react'
import Modal from '@/components/ui/Modal'
import type { Patient, PatientInsert, PatientUpdate } from '@/types/patient'

interface Props {
  open: boolean
  patient: Patient | null
  doctorId: string
  onClose: () => void
  onSave: (data: PatientInsert | PatientUpdate) => Promise<void>
}

type FormGender = 'male' | 'female' | 'other'

const empty = {
  full_name: '', birth_date: '', gender: 'male' as FormGender,
  weight_kg: '', height_cm: '', goal: '',
  allergies: '', conditions: '', notes: '',
}

const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition'
const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

export default function PatientModal({ open, patient, doctorId, onClose, onSave }: Props) {
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (patient) {
      setForm({
        full_name:   patient.full_name,
        birth_date:  patient.birth_date,
        gender:      patient.gender as FormGender,
        weight_kg:   String(patient.weight_kg),
        height_cm:   String(patient.height_cm),
        goal:        patient.goal,
        allergies:   patient.allergies ?? '',
        conditions:  patient.conditions ?? '',
        notes:       patient.notes ?? '',
      })
    } else {
      setForm(empty)
    }
    setError(null)
  }, [patient, open])

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = {
        full_name:  form.full_name,
        birth_date: form.birth_date,
        gender:     form.gender,
        weight_kg:  parseFloat(form.weight_kg),
        height_cm:  parseFloat(form.height_cm),
        goal:       form.goal,
        allergies:  form.allergies || null,
        conditions: form.conditions || null,
        notes:      form.notes || null,
        ...(patient ? {} : { doctor_id: doctorId }),
      }
      await onSave(payload)
      onClose()
    } catch {
      setError('Ocurrió un error al guardar. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} title={patient ? 'Editar paciente' : 'Nuevo paciente'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">

        <div>
          <label className={labelClass}>Nombre completo</label>
          <input className={inputClass} required value={form.full_name}
            onChange={e => set('full_name', e.target.value)} placeholder="María García López" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Fecha de nacimiento</label>
            <input type="date" className={inputClass} required value={form.birth_date}
              onChange={e => set('birth_date', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Género</label>
            <select className={inputClass} value={form.gender}
              onChange={e => setForm(f => ({ ...f, gender: e.target.value as FormGender }))}>
              <option value="male">Masculino</option>
              <option value="female">Femenino</option>
              <option value="other">Otro</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Peso (kg)</label>
            <input type="number" step="0.1" min="1" className={inputClass} required
              value={form.weight_kg} onChange={e => set('weight_kg', e.target.value)}
              placeholder="70.5" />
          </div>
          <div>
            <label className={labelClass}>Talla (cm)</label>
            <input type="number" step="0.1" min="1" className={inputClass} required
              value={form.height_cm} onChange={e => set('height_cm', e.target.value)}
              placeholder="165" />
          </div>
        </div>

        <div>
          <label className={labelClass}>Objetivo</label>
          <input className={inputClass} required value={form.goal}
            onChange={e => set('goal', e.target.value)}
            placeholder="Bajar de peso, ganar músculo, mejorar hábitos..." />
        </div>

        <div>
          <label className={labelClass}>Alergias <span className="text-gray-400 font-normal">(opcional)</span></label>
          <textarea rows={2} className={inputClass} value={form.allergies}
            onChange={e => set('allergies', e.target.value)}
            placeholder="Lactosa, gluten, mariscos..." />
        </div>

        <div>
          <label className={labelClass}>Condiciones médicas <span className="text-gray-400 font-normal">(opcional)</span></label>
          <textarea rows={2} className={inputClass} value={form.conditions}
            onChange={e => set('conditions', e.target.value)}
            placeholder="Diabetes tipo 2, hipertensión..." />
        </div>

        <div>
          <label className={labelClass}>Notas adicionales <span className="text-gray-400 font-normal">(opcional)</span></label>
          <textarea rows={2} className={inputClass} value={form.notes}
            onChange={e => set('notes', e.target.value)} />
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
          <button type="submit" disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 rounded-lg transition-colors">
            {saving ? 'Guardando...' : patient ? 'Guardar cambios' : 'Crear paciente'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
