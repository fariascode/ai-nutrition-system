import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, FileText, Sparkles, Flame, Search, Smartphone,
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
  draft:     'bg-warning-soft text-warning border-warning-line',
  published: 'bg-lime-tint text-content border-[#C8ED8F]',
  archived:  'bg-canvas text-muted border-line',
}

export default function PlansPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [plans, setPlans]               = useState<PlanWithPatient[]>([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | PlanStatus>('all')
  const [newOpen, setNewOpen]           = useState(false)
  const [selected, setSelected]         = useState<PlanWithPatient | null>(null)

  async function load() {
    setLoading(true)
    try { setPlans(await getPlans()) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

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
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-lime-tint border border-[#C8ED8F] text-content text-[11px] font-extrabold mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            Borradores nutricionales para revisión profesional
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-content tracking-tight">
            Planes Nutricionales con IA
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-0.5">
            Prescripciones personalizadas con cálculo de equivalentes SMAE, lista de supermercado y app móvil para el paciente
          </p>
        </div>
        <button
          type="button"
          onClick={() => setNewOpen(true)}
          className="btn-forest flex items-center justify-center gap-2 px-5 py-2.5 text-xs sm:text-sm cursor-pointer shrink-0"
        >
          <Sparkles className="w-4 h-4 text-[#C8ED8F]" />
          Generar Plan Clínico IA
        </button>
      </div>

      {/* Filtros y Búsqueda */}
      <div className="bento-card p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar plan por paciente, alimento, protocolo o nota clínica..."
            className="input-wellness w-full pl-10 pr-4 py-2 text-xs sm:text-sm font-medium"
          />
        </div>

        <div className="flex items-center bg-canvas border border-line p-1 rounded-xl text-xs font-semibold overflow-x-auto">
          {[
            { id: 'all',       label: `Todos (${plans.length})` },
            { id: 'published', label: `Publicados (${plans.filter(p => p.status === 'published').length})` },
            { id: 'draft',     label: `Borradores (${plans.filter(p => p.status === 'draft').length})` },
            { id: 'archived',  label: 'Archivados' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id as typeof statusFilter)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-[#245C47] text-white font-bold shadow-2xs'
                  : 'text-muted hover:text-content'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bento-card p-6 h-60 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bento-card flex flex-col items-center justify-center h-64 text-center p-6">
          <div className="w-12 h-12 bg-accent-soft rounded-2xl flex items-center justify-center mb-3">
            <FileText className="w-6 h-6 text-accent" />
          </div>
          <p className="font-extrabold text-content">No se encontraron planes nutricionales</p>
          <p className="text-xs text-muted mt-1">
            Genera un nuevo plan personalizado con el motor clínico de IA
          </p>
          <button
            type="button"
            onClick={() => setNewOpen(true)}
            className="btn-forest mt-4 flex items-center gap-2 px-4 py-2 text-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#C8ED8F]" /> Nuevo Plan IA
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filtered.map(plan => {
            const proto = plan.protocol ? PROTOCOL_INFO[plan.protocol] : null
            return (
              <div
                key={plan.id}
                onClick={() => setSelected(plan)}
                className="bento-card-interactive p-5 sm:p-6 cursor-pointer flex flex-col justify-between gap-4"
              >
                <div className="space-y-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-[#245C47] text-[#C8ED8F] font-extrabold text-xs flex items-center justify-center shrink-0">
                        {plan.patients.full_name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-content text-base leading-tight">
                          {plan.patients.full_name}
                        </h3>
                        <p className="text-xs text-muted font-medium mt-0.5">
                          Creado el {new Date(plan.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">

                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusColor[plan.status]}`}>
                        {statusLabel[plan.status]}
                      </span>
                    </div>
                  </div>

                  {/* Badges de protocolo y macros */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {proto && (
                      <span className="px-2.5 py-1 rounded-xl bg-accent-soft text-accent font-bold text-[11px]">
                        {proto.name}
                      </span>
                    )}
                    {(plan.calories_target || plan.macros?.calories) && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-canvas border border-line text-content font-extrabold text-[11px]">
                        <Flame className="w-3.5 h-3.5 text-accent" />
                        {plan.macros?.calories ?? plan.calories_target} kcal
                      </span>
                    )}
                    {plan.macros && (
                      <span className="text-[11px] text-muted font-semibold">
                        P: <strong className="text-content">{plan.macros.protein_g}g</strong> • C: <strong className="text-content">{plan.macros.carbs_g}g</strong> • G: <strong className="text-content">{plan.macros.fat_g}g</strong>
                      </span>
                    )}
                  </div>

                  {plan.doctor_notes && (
                    <p className="text-xs text-content bg-lime-tint/80 border border-[#C8ED8F] px-3.5 py-2.5 rounded-2xl line-clamp-2">
                      <strong className="text-accent">Nota médica:</strong> {plan.doctor_notes}
                    </p>
                  )}

                  <p className="text-xs text-muted line-clamp-2 leading-relaxed bg-canvas border border-line p-3 rounded-2xl">
                    {(plan.edited_content ?? plan.ai_generated_content).slice(0, 190)}...
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-line text-xs">
                  <button
                    type="button"
                    disabled={plan.status !== 'published'}
                    onClick={e => {
                      e.stopPropagation()
                      navigate(`/portal/${plan.id}`)
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent-soft hover:bg-lime-solid/50 text-accent font-extrabold transition cursor-pointer"
                  >
                    <Smartphone className="w-3.5 h-3.5" /> App Paciente (PWA)
                  </button>
                  <span className="font-extrabold text-accent hover:underline">
                    Abrir Prescripción / Súper →
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
