import { useEffect, useState } from 'react'
import {
  Plus, FileText, Sparkles, ShieldCheck, Flame, Search,
} from 'lucide-react'
import { useAuth } from '@/features/auth/context/AuthContext'
import { getPlans } from '../services/plans.service'
import NewPlanModal from '../components/NewPlanModal'
import PlanDetailModal from '../components/PlanDetailModal'
import { PROTOCOL_INFO } from '@/lib/clinicalEngine'
import type { NutritionPlan, PlanWithPatient, PlanStatus } from '@/types/plan'

const statusLabel: Record<PlanStatus, string> = {
  draft:     'Borrador',
  published: 'Publicado',
  archived:  'Archivado',
}

const statusColor: Record<PlanStatus, string> = {
  draft:     'bg-amber-100 text-amber-800 border-amber-200',
  published: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  archived:  'bg-gray-100 text-gray-600 border-gray-200',
}

export default function PlansPage() {
  const { user } = useAuth()
  const [plans, setPlans]             = useState<PlanWithPatient[]>([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | PlanStatus>('all')
  const [newOpen, setNewOpen]         = useState(false)
  const [selected, setSelected]       = useState<PlanWithPatient | null>(null)

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
    setSelected(prev => prev && prev.id === updated.id ? { ...prev, ...updated } : prev)
  }

  const filtered = plans.filter(plan => {
    if (statusFilter !== 'all' && plan.status !== statusFilter) return false
    const q = search.toLowerCase()
    return (
      plan.patients.full_name.toLowerCase().includes(q) ||
      (plan.doctor_notes ?? '').toLowerCase().includes(q) ||
      plan.ai_generated_content.toLowerCase().includes(q)
    )
  })

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Planes Nutricionales con IA</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Prescripciones dietoterapéuticas de alta precisión (&gt;95% eficacia clínica)
          </p>
        </div>
        <button
          onClick={() => setNewOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          Generar Plan Clínico IA
        </button>
      </div>

      {/* Filtros y Búsqueda */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar plan por paciente, alimento, protocolo o nota clínica..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs font-medium overflow-x-auto">
          {[
            { id: 'all',       label: `Todos (${plans.length})` },
            { id: 'published', label: `Publicados (${plans.filter(p => p.status === 'published').length})` },
            { id: 'draft',     label: `Borradores (${plans.filter(p => p.status === 'draft').length})` },
            { id: 'archived',  label: 'Archivados' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as typeof statusFilter)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                statusFilter === tab.id ? 'bg-white text-emerald-700 font-bold shadow-2xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-gray-200 text-center p-6">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-3">
            <FileText className="w-6 h-6 text-emerald-600" />
          </div>
          <p className="font-bold text-gray-900">No se encontraron planes nutricionales</p>
          <p className="text-xs text-gray-500 mt-1">Genera un nuevo plan personalizado con el motor clínico de IA</p>
          <button
            onClick={() => setNewOpen(true)}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" /> Nuevo Plan IA
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(plan => {
            const proto = plan.protocol ? PROTOCOL_INFO[plan.protocol] : null
            return (
              <div
                key={plan.id}
                onClick={() => setSelected(plan)}
                className="bg-white rounded-2xl border border-gray-200 hover:border-emerald-300 p-5 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                        {plan.patients.full_name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-base leading-tight">
                          {plan.patients.full_name}
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Creado el {new Date(plan.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {plan.clinical_efficacy_score && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <ShieldCheck className="w-3 h-3" /> {plan.clinical_efficacy_score}% IA
                        </span>
                      )}
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusColor[plan.status]}`}>
                        {statusLabel[plan.status]}
                      </span>
                    </div>
                  </div>

                  {/* Badges de protocolo y macros */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {proto && (
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold text-[11px]">
                        {proto.name}
                      </span>
                    )}
                    {(plan.calories_target || plan.macros?.calories) && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-50 text-orange-800 font-bold text-[11px]">
                        <Flame className="w-3 h-3 text-orange-500" />
                        {plan.macros?.calories ?? plan.calories_target} kcal
                      </span>
                    )}
                    {plan.macros && (
                      <span className="text-[11px] text-gray-500 font-medium">
                        P: <strong>{plan.macros.protein_g}g</strong> • C: <strong>{plan.macros.carbs_g}g</strong> • G: <strong>{plan.macros.fat_g}g</strong>
                      </span>
                    )}
                  </div>

                  {plan.doctor_notes && (
                    <p className="text-xs text-emerald-900 bg-emerald-50/70 border border-emerald-100 px-3 py-2 rounded-xl line-clamp-2">
                      <strong>Nota médica:</strong> {plan.doctor_notes}
                    </p>
                  )}

                  <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed font-mono bg-gray-50 p-2.5 rounded-xl">
                    {(plan.edited_content ?? plan.ai_generated_content).slice(0, 190)}...
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                  <span className="text-gray-400">
                    {plan.meals_per_day ? `${plan.meals_per_day} tiempos de comida` : 'Menú estructurado'}
                  </span>
                  <span className="font-bold text-emerald-600 hover:text-emerald-700">
                    Abrir Prescripción / Imprimir →
                  </span>
                </div>
              </div>
            )
          })}
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
