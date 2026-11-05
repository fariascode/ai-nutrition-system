import { Plus, Trash2 } from 'lucide-react'
import type { ConsultationMedication } from '@/types/consultation'
import { MEDICATION_FIELDS } from '../services/consultationDetails'

interface Props {
  items: ConsultationMedication[]
  onChange: (items: ConsultationMedication[]) => void
  disabled?: boolean
}

export function TreatmentSummary({ items = [] }: { items?: ConsultationMedication[] }) {
  if (!items.length) return null
  return <div className="space-y-2 text-xs text-content">
    {items.map(item => <div key={item.id} className="space-y-1 break-words">
      <p className="font-bold">{item.name}</p>
      {MEDICATION_FIELDS.filter(field => field.key !== 'name').map(field => <p key={field.key} className="whitespace-pre-wrap">
        <strong>{field.label}:</strong> {item[field.key] || 'Sin registro'}
      </p>)}
    </div>)}
  </div>
}

export default function TreatmentEditor({ items, onChange, disabled }: Props) {
  function patch(id: string, changes: Partial<ConsultationMedication>) {
    onChange(items.map(item => item.id === id ? { ...item, ...changes } : item))
  }
  return <section className="space-y-3" aria-label="Tratamiento de la consulta">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h4 className="text-sm font-extrabold text-content">Tratamiento farmacológico</h4>
      <button type="button" disabled={disabled} className="btn-secondary flex items-center gap-1.5 px-3 py-2 text-xs"
        onClick={() => onChange([...items, { id: crypto.randomUUID(), name: '', presentation: '', dose: '', route: '', frequency: '', duration: '', instructions: '' }])}>
        <Plus className="h-4 w-4" /> Agregar medicamento
      </button>
    </div>
    <p className="text-xs text-muted">Captura el tratamiento indicado por el médico. Puedes completar los detalles después de guardar un borrador; al cerrar se requieren todos los campos salvo las instrucciones adicionales.</p>
    {!items.length && <p className="text-xs text-muted">Sin medicamentos registrados para esta consulta. Puedes documentar medidas generales en el plan.</p>}
    {items.map((item, index) => <fieldset key={item.id} disabled={disabled} className="min-w-0 rounded-2xl border border-line bg-canvas p-3 space-y-3">
      <legend className="px-1 text-xs font-bold">Medicamento {index + 1}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {MEDICATION_FIELDS.map(field => <label key={field.key} className={`space-y-1 text-xs font-bold ${field.key === 'instructions' ? 'sm:col-span-2' : ''}`}>
          {field.label}{field.key === 'instructions' && ' (opcional)'}
          {field.key === 'instructions'
            ? <textarea rows={2} className="input-wellness w-full px-3 py-2 text-xs sm:text-sm" value={item[field.key]} onChange={e => patch(item.id, { [field.key]: e.target.value })} />
            : <input className="input-wellness w-full px-3 py-2 text-xs sm:text-sm" value={item[field.key]} onChange={e => patch(item.id, { [field.key]: e.target.value })} />}
        </label>)}
      </div>
      <button type="button" disabled={disabled} onClick={() => onChange(items.filter(row => row.id !== item.id))}
        className="flex items-center gap-1.5 px-2 py-2 text-xs text-danger" aria-label={`Quitar medicamento ${index + 1}`}>
        <Trash2 className="h-4 w-4" /> Quitar medicamento
      </button>
    </fieldset>)}
  </section>
}
