import { useEffect, useState } from 'react'
import { History } from 'lucide-react'
import { getPlans } from '@/features/plans/services/plans.service'
import { getPatients } from '@/features/patients/services/patients.service'
import PlanDetailModal from '@/features/plans/components/PlanDetailModal'
import type { NutritionPlan, PlanWithPatient, PlanStatus } from '@/types/plan'
import type { Patient } from '@/types/patient'

const statusLabel: Record<PlanStatus, string> = {
  draft:     'Borrador',
  published: 'Publicado',
  archived:  'Archivado',
}

const statusColor: Record<PlanStatus, string> = {
  draft:     'bg-amber-100 text-amber-700',
  published: 'bg-emerald-100 text-emerald-700',
  archived:  'bg-gray-100 text-gray-500',
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
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Historial</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} planes</p>
        </div>

        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
        >
          <option value="">Todos los pacientes</option>
          {patients.map(p => (
            <option key={p.id} value={p.id}>{p.full_name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-gray-200 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
            <History className="w-6 h-6 text-gray-400" />
          </div>
          <p className="font-medium text-gray-900">Sin planes en el historial</p>
          <p className="text-sm text-gray-500 mt-1">
            {filter ? 'Este paciente no tiene planes aún' : 'Genera tu primer plan nutricional'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(plan => (
            <button
              key={plan.id}
              onClick={() => setSelected(plan)}
              className="bg-white rounded-xl border border-gray-200 p-5 text-left hover:border-emerald-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-emerald-700">
                      {initials(plan.patients.full_name)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{plan.patients.full_name}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(plan.created_at).toLocaleDateString('es-MX', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${statusColor[plan.status]}`}>
                  {statusLabel[plan.status]}
                </span>
              </div>

              <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed">
                {(plan.edited_content ?? plan.ai_generated_content).slice(0, 180)}...
              </p>

              <p className="text-xs text-emerald-600 font-medium mt-3">Ver / Editar →</p>
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
