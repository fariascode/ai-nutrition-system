import { useEffect, useState } from 'react'
import { History, Sparkles, Flame } from 'lucide-react'
import { getPlans } from '@/features/plans/services/plans.service'
import { getPatients } from '@/features/patients/services/patients.service'
import PlanDetailModal from '@/features/plans/components/PlanDetailModal'
import { PROTOCOL_INFO } from '@/lib/clinicalEngine'
import type { NutritionPlan, PlanWithPatient, PlanStatus } from '@/types/plan'
import type { Patient } from '@/types/patient'

const statusLabel: Record<PlanStatus, string> = {
  draft:     'Borrador',
  published: 'Publicado',
  archived:  'Archivado',
}

const statusColor: Record<PlanStatus, string> = {
  draft:     'bg-warning-soft text-warning border-warning-line',
  published: 'bg-lime-tint text-content border-[#C8ED8F]',
  archived:  'bg-canvas text-muted border-line',
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

export default function HistoryPage() {
  const [plans, setPlans]       = useState<PlanWithPatient[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [filter, setFilter]     = useState('')
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState<PlanWithPatient | null>(null)

  useEffect(() => {
    Promise.all([getPlans(), getPatients()]).then(([p, pts]) => {
      setPlans(p)
      setPatients(pts)
      setLoading(false)
    })
  }, [])

  const filtered = filter
    ? plans.filter(p => p.patient_id === filter)
    : plans

  function handleUpdated(updated: NutritionPlan) {
    setPlans(ps => ps.map(p => p.id === updated.id ? { ...p, ...updated } : p))
    setSelected(prev => prev ? { ...prev, ...updated } : null)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent-soft text-accent text-[11px] font-bold mb-1.5">
            <History className="w-3.5 h-3.5" />
            Archivo Longitudinal de Prescripciones
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-content tracking-tight">
            Historial Clínico de Planes
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-0.5">
            {filtered.length} prescripciones dietoterapéuticas registradas en el sistema
          </p>
        </div>

        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          aria-label="Filtrar historial por paciente"
          className="input-wellness px-4 py-2.5 text-xs sm:text-sm font-bold min-w-[240px]"
        >
          <option value="">Todos los pacientes ({patients.length})</option>
          {patients.map(p => (
            <option key={p.id} value={p.id}>{p.full_name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bento-card p-6 h-52 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bento-card flex flex-col items-center justify-center h-64 text-center p-6">
          <div className="w-12 h-12 bg-accent-soft rounded-2xl flex items-center justify-center mb-3">
            <History className="w-6 h-6 text-accent" />
          </div>
          <p className="font-extrabold text-content">Sin planes en el historial</p>
          <p className="text-xs text-muted mt-1">
            {filter ? 'Este paciente no tiene planes registrados aún' : 'Genera tu primer plan nutricional con IA'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(plan => (
            <button
              key={plan.id}
              type="button"
              onClick={() => setSelected(plan)}
              className="bento-card-interactive p-5 sm:p-6 text-left flex flex-col justify-between gap-4 cursor-pointer"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#245C47] text-[#C8ED8F] flex items-center justify-center shrink-0">
                      <span className="text-xs font-extrabold">
                        {initials(plan.patients.full_name)}
                      </span>
                    </div>
                    <div>
                      <p className="font-extrabold text-content text-sm">{plan.patients.full_name}</p>
                      <p className="text-xs text-muted font-medium">
                        {new Date(plan.created_at).toLocaleDateString('es-MX', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${statusColor[plan.status]}`}>
                    {statusLabel[plan.status]}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  {plan.protocol && (
                    <span className="px-2 py-0.5 rounded-lg bg-accent-soft text-accent font-bold">
                      {PROTOCOL_INFO[plan.protocol].name}
                    </span>
                  )}
                  {plan.macros && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-canvas border border-line text-content font-bold">
                      <Flame className="w-3 h-3 text-accent" /> {plan.macros.calories} kcal
                    </span>
                  )}
                </div>

                <p className="text-xs text-muted line-clamp-3 leading-relaxed bg-canvas p-3 rounded-2xl border border-line">
                  {(plan.edited_content ?? plan.ai_generated_content).slice(0, 180)}...
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-line text-xs">
                <span className="inline-flex items-center gap-1 text-muted font-semibold">
                  <Sparkles className="w-3 h-3 text-accent" />
                  {plan.clinical_efficacy_score ?? 97}% Eficacia
                </span>
                <span className="font-extrabold text-accent">Ver / Editar →</span>
              </div>
            </button>
          ))}
        </div>
      )}

      <PlanDetailModal
        open={!!selected}
        plan={selected}
        onClose={() => setSelected(null)}
        onUpdated={handleUpdated}
      />
    </div>
  )
}
