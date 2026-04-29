import { useEffect, useState } from 'react'
import { Plus, FileText } from 'lucide-react'
import { useAuth } from '@/features/auth/context/AuthContext'
import { getPlans } from '../services/plans.service'
import NewPlanModal from '../components/NewPlanModal'
import PlanDetailModal from '../components/PlanDetailModal'
import type { NutritionPlan, PlanWithPatient, PlanStatus } from '@/types/plan'

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

export default function PlansPage() {
  const { user } = useAuth()
  const [plans, setPlans]           = useState<PlanWithPatient[]>([])
  const [loading, setLoading]       = useState(true)
  const [newOpen, setNewOpen]       = useState(false)
  const [selected, setSelected]     = useState<PlanWithPatient | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try { setPlans(await getPlans()) }
    finally { setLoading(false) }
  }

  function handleCreated(plan: NutritionPlan) {
    setPlans(ps => [{ ...plan, patients: { full_name: '...' } } as PlanWithPatient, ...ps])
    load()
  }

  function handleUpdated(updated: NutritionPlan) {
    setPlans(ps => ps.map(p => p.id === updated.id ? { ...p, ...updated } : p))
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Planes nutricionales</h1>
          <p className="text-sm text-gray-500 mt-0.5">{plans.length} planes</p>
        </div>
        <button onClick={() => setNewOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          Nuevo plan
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-gray-200 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
            <FileText className="w-6 h-6 text-gray-400" />
          </div>
          <p className="font-medium text-gray-900">Sin planes aún</p>
          <p className="text-sm text-gray-500 mt-1">Genera el primer plan nutricional con IA</p>
          <button onClick={() => setNewOpen(true)}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Nuevo plan
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Paciente</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Creado</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Última edición</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {plans.map(plan => (
                <tr key={plan.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{plan.patients.full_name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[plan.status]}`}>
                      {statusLabel[plan.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(plan.created_at).toLocaleDateString('es-MX')}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(plan.updated_at).toLocaleDateString('es-MX')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setSelected(plan)}
                      className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                      Ver / Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <NewPlanModal
        open={newOpen}
        doctorId={user!.id}
        onClose={() => setNewOpen(false)}
        onCreated={handleCreated}
      />

      <PlanDetailModal
        open={!!selected}
        plan={selected}
        onClose={() => setSelected(null)}
        onUpdated={handleUpdated}
      />
    </div>
  )
}
