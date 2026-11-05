import { useId } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { ConsultationDiagnosis } from '@/types/consultation'
import { DIAGNOSIS_CERTAINTY } from '../services/consultationDetails'

interface Props {
  items: ConsultationDiagnosis[]
  onChange: (items: ConsultationDiagnosis[]) => void
  disabled?: boolean
}

export function DiagnosisSummary({ items = [] }: { items?: ConsultationDiagnosis[] }) {
  if (!items.length) return null
  return <ul className="space-y-1 text-xs text-content">
    {items.map(item => <li key={item.id} className="break-words">
      <strong>{item.role === 'primary' ? 'Principal' : 'Secundario'} · {DIAGNOSIS_CERTAINTY[item.certainty]}:</strong> {item.name}
      {item.notes && <p className="text-muted whitespace-pre-wrap">{item.notes}</p>}
    </li>)}
  </ul>
}

export default function DiagnosisEditor({ items, onChange, disabled }: Props) {
  const group = useId()
  const inputClass = 'input-wellness w-full px-3 py-2 text-xs sm:text-sm'
  function patch(id: string, changes: Partial<ConsultationDiagnosis>) {
    onChange(items.map(item => item.id === id ? { ...item, ...changes } : item))
  }
  return <section className="space-y-3" aria-label="Diagnósticos de la consulta">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h4 className="text-sm font-extrabold text-content">Diagnósticos de esta consulta</h4>
      <button type="button" disabled={disabled} className="btn-secondary flex items-center gap-1.5 px-3 py-2 text-xs"
        onClick={() => onChange([...items, { id: crypto.randomUUID(), name: '', role: items.length ? 'secondary' : 'primary', certainty: 'suspected', notes: '' }])}>
        <Plus className="h-4 w-4" /> Agregar diagnóstico
      </button>
    </div>
    <p className="text-xs text-muted">Captura los diagnósticos valorados por el médico. Marca uno como principal e indica su certeza.</p>
    {!items.length && <p className="text-xs text-muted">Sin diagnósticos estructurados. La evaluación previa permanece en su campo de texto.</p>}
    {items.map((item, index) => <fieldset key={item.id} disabled={disabled} className="min-w-0 rounded-2xl border border-line bg-canvas p-3 space-y-3">
      <legend className="px-1 text-xs font-bold">Diagnóstico {index + 1}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs font-bold">Nombre del diagnóstico
          <input className={inputClass} value={item.name} onChange={e => patch(item.id, { name: e.target.value })} />
        </label>
        <label className="space-y-1 text-xs font-bold">Certeza diagnóstica
          <select className={inputClass} value={item.certainty} onChange={e => patch(item.id, { certainty: e.target.value as ConsultationDiagnosis['certainty'] })}>
            {Object.entries(DIAGNOSIS_CERTAINTY).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>
      <label className="flex items-center gap-2 text-xs">
        <input type="radio" name={group} checked={item.role === 'primary'} onChange={() => onChange(items.map(row => ({ ...row, role: row.id === item.id ? 'primary' : 'secondary' })))} />
        Diagnóstico principal{item.role === 'secondary' && ' (actualmente secundario)'}
      </label>
      <label className="block space-y-1 text-xs font-bold">Observaciones del diagnóstico (opcional)
        <textarea rows={2} className={inputClass} value={item.notes} onChange={e => patch(item.id, { notes: e.target.value })} />
      </label>
      <button type="button" disabled={disabled} onClick={() => onChange(items.filter(row => row.id !== item.id))}
        className="flex items-center gap-1.5 px-2 py-2 text-xs text-danger" aria-label={`Quitar diagnóstico ${index + 1}`}>
        <Trash2 className="h-4 w-4" /> Quitar diagnóstico
      </button>
    </fieldset>)}
  </section>
}
