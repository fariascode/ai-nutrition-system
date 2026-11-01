import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Pencil, Trash2, Users, Search, Sparkles, Activity,
  Flame, AlertTriangle, Eye, LayoutGrid, List,
} from 'lucide-react'
import { useAuth } from '@/features/auth/context/AuthContext'
import {
  getPatients, createPatient, updatePatient, deletePatient, addWeightCheckin,
} from '../services/patients.service'
import PatientModal from '../components/PatientModal'
import PatientDossierModal from '../components/PatientDossierModal'
import NewPlanModal from '@/features/plans/components/NewPlanModal'
import {
  calculateAge, calculateBMI, calculateBMR, calculateTDEE, evaluatePatientAlerts,
} from '@/lib/clinicalEngine'
import type { Patient, PatientInsert, PatientUpdate, WeightRecord } from '@/types/patient'

const genderLabel = { male: 'Masculino', female: 'Femenino', other: 'Otro' }

export default function PatientsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [patients, setPatients]       = useState<Patient[]>([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [filterAlert, setFilterAlert] = useState<'all' | 'alerts' | 'allergies'>('all')
  const [viewMode, setViewMode]       = useState<'cards' | 'table'>('cards')

  const [modalOpen, setModalOpen]         = useState(false)
  const [editing, setEditing]             = useState<Patient | null>(null)
  const [dossierPatient, setDossierPatient] = useState<Patient | null>(null)
  const [planPatientId, setPlanPatientId]   = useState<string | undefined>(undefined)
  const [newPlanOpen, setNewPlanOpen]       = useState(false)
  const [deleting, setDeleting]           = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try { setPatients(await getPatients()) }
    finally { setLoading(false) }
  }

  async function handleSave(data: PatientInsert | PatientUpdate) {
    if (editing) {
      const updated = await updatePatient(editing.id, data as PatientUpdate)
      setPatients(ps => ps.map(p => p.id === updated.id ? updated : p))
      if (dossierPatient?.id === updated.id) setDossierPatient(updated)
    } else {
      const created = await createPatient(data as PatientInsert)
      setPatients(ps => [created, ...ps])
    }
  }

  async function handleAddCheckin(patientId: string, record: WeightRecord) {
    const updated = await addWeightCheckin(patientId, record)
    setPatients(ps => ps.map(p => p.id === updated.id ? updated : p))
    setDossierPatient(updated)
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este expediente clínico? Esta acción no se puede deshacer.')) return
    setDeleting(id)
    try {
      await deletePatient(id)
      setPatients(ps => ps.filter(p => p.id !== id))
    } finally {
      setDeleting(null)
    }
  }

  function openCreate() { setEditing(null); setModalOpen(true) }
  function openEdit(p: Patient) { setEditing(p); setModalOpen(true) }
  function openPlanFor(p: Patient) {
    setDossierPatient(null)
    setPlanPatientId(p.id)
    setNewPlanOpen(true)
  }

  const filtered = patients.filter(p => {
    const q = search.toLowerCase()
    const matchText =
      p.full_name.toLowerCase().includes(q) ||
      p.goal.toLowerCase().includes(q) ||
      (p.conditions ?? '').toLowerCase().includes(q) ||
      (p.allergies ?? '').toLowerCase().includes(q)

    if (!matchText) return false
    if (filterAlert === 'allergies') return Boolean(p.allergies)
    if (filterAlert === 'alerts') {
      const alerts = evaluatePatientAlerts(p)
      return alerts.some(a => a.type === 'danger' || a.type === 'warning')
    }
    return true
  })

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expedientes Clínicos de Pacientes</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Biometría en tiempo real, cálculo metabólico Mifflin-St Jeor y seguimiento longitudinal
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo Paciente Clínico
        </button>
      </div>

      {/* Barra de búsqueda y filtros rápidos */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar paciente por nombre, patología, alergia u objetivo..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs font-medium">
            {[
              { id: 'all',       label: `Todos (${patients.length})` },
              { id: 'alerts',    label: 'Con Alertas Clínicas' },
              { id: 'allergies', label: 'Con Alergias' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilterAlert(f.id as typeof filterAlert)}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  filterAlert === f.id ? 'bg-white text-emerald-700 font-bold shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center border border-gray-200 rounded-xl p-1 bg-white">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg ${viewMode === 'cards' ? 'bg-emerald-50 text-emerald-600' : 'text-gray-400 hover:text-gray-700'}`}
              title="Vista Tarjetas 360°"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg ${viewMode === 'table' ? 'bg-emerald-50 text-emerald-600' : 'text-gray-400 hover:text-gray-700'}`}
              title="Vista Tabla"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-gray-200 text-center p-6">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-3">
            <Users className="w-6 h-6 text-emerald-600" />
          </div>
          <p className="font-bold text-gray-900">No se encontraron pacientes</p>
          <p className="text-xs text-gray-500 mt-1">Intenta con otro término o registra un nuevo expediente clínico</p>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(p => {
            const age  = calculateAge(p.birth_date)
            const bmi  = calculateBMI(p.weight_kg, p.height_cm)
            const bmr  = calculateBMR(p.weight_kg, p.height_cm, age, p.gender)
            const tdee = calculateTDEE(bmr, p.activity_level ?? 'moderate')
            const alerts = evaluatePatientAlerts(p).filter(a => a.type === 'danger' || a.type === 'warning')

            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-gray-200 hover:border-emerald-300 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
              >
                <div className="p-5 space-y-4">
                  {/* Encabezado de tarjeta */}
                  <div className="flex items-start justify-between gap-3">
                    <div
                      onClick={() => setDossierPatient(p)}
                      className="flex items-center gap-3 cursor-pointer group"
                    >
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                        {p.full_name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 group-hover:text-emerald-600 transition-colors text-base leading-tight">
                          {p.full_name}
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {age} años • {genderLabel[p.gender]}
                        </p>
                      </div>
                    </div>

                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${bmi.color}`}>
                      IMC {bmi.value}
                    </span>
                  </div>

                  {/* Objetivo */}
                  <div className="text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-slate-700 font-medium line-clamp-1">
                    🎯 {p.goal}
                  </div>

                  {/* Métricas rápidas */}
                  <div className="grid grid-cols-3 gap-2 text-center bg-gray-50/70 p-2.5 rounded-xl border border-gray-100">
                    <div>
                      <span className="text-[10px] text-gray-400 block">Peso / Talla</span>
                      <span className="text-xs font-bold text-gray-900">{p.weight_kg}kg</span>
                      <span className="text-[10px] text-gray-500 block">{p.height_cm} cm</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block">GET Diario</span>
                      <span className="text-xs font-bold text-emerald-700 flex items-center justify-center gap-0.5">
                        <Flame className="w-3 h-3 text-orange-500" /> {tdee}
                      </span>
                      <span className="text-[10px] text-gray-500 block">kcal/día</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block">Comp. Grasa</span>
                      <span className="text-xs font-bold text-gray-900">
                        {p.body_fat_pct ? `${p.body_fat_pct}%` : bmi.category}
                      </span>
                      <span className="text-[10px] text-gray-500 block">
                        {p.muscle_mass_kg ? `${p.muscle_mass_kg}kg músc.` : 'OMS'}
                      </span>
                    </div>
                  </div>

                  {/* Etiquetas de alertas / alergias */}
                  <div className="flex flex-wrap gap-1.5">
                    {p.allergies && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200">
                        <AlertTriangle className="w-3 h-3" /> Alergia: {p.allergies}
                      </span>
                    )}
                    {p.conditions && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 line-clamp-1">
                        <Activity className="w-3 h-3 shrink-0" /> {p.conditions}
                      </span>
                    )}
                    {!p.allergies && !p.conditions && alerts.length === 0 && (
                      <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-medium">
                        ✓ Sin alertas patológicas activas
                      </span>
                    )}
                  </div>
                </div>

                {/* Pie de tarjeta con acciones */}
                <div className="px-5 py-3 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setDossierPatient(p)}
                    className="flex items-center gap-1.5 text-xs font-bold text-gray-700 hover:text-emerald-700 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-emerald-600" />
                    Expediente 360°
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openPlanFor(p)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-2xs"
                      title="Generar Plan IA para este paciente"
                    >
                      <Sparkles className="w-3 h-3" /> Plan IA
                    </button>
                    <button
                      onClick={() => openEdit(p)}
                      className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      disabled={deleting === p.id}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto shadow-2xs">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/80 text-gray-600">
                <th className="text-left px-4 py-3 font-semibold">Paciente</th>
                <th className="text-left px-4 py-3 font-semibold">Antropometría</th>
                <th className="text-left px-4 py-3 font-semibold">IMC / Estado</th>
                <th className="text-left px-4 py-3 font-semibold">GET Estimado</th>
                <th className="text-left px-4 py-3 font-semibold">Clínica / Alergias</th>
                <th className="px-4 py-3 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(p => {
                const age  = calculateAge(p.birth_date)
                const bmi  = calculateBMI(p.weight_kg, p.height_cm)
                const bmr  = calculateBMR(p.weight_kg, p.height_cm, age, p.gender)
                const tdee = calculateTDEE(bmr, p.activity_level ?? 'moderate')
                return (
                  <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setDossierPatient(p)}
                        className="font-bold text-gray-900 hover:text-emerald-600 text-left block"
                      >
                        {p.full_name}
                      </button>
                      <span className="text-xs text-gray-400">{age} años • {genderLabel[p.gender]}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-medium">
                      {p.weight_kg} kg / {p.height_cm} cm
                      {p.body_fat_pct && <span className="block text-xs text-gray-400">{p.body_fat_pct}% grasa</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${bmi.color}`}>
                        {bmi.value} • {bmi.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-800">
                      {tdee} kcal/día
                      <span className="block text-[11px] text-gray-400 font-normal">TMB: {bmr} kcal</span>
                    </td>
                    <td className="px-4 py-3 max-w-[220px]">
                      <p className="truncate font-medium text-gray-800">{p.goal}</p>
                      {p.allergies && <span className="text-[11px] text-red-600 font-semibold">⚠️ {p.allergies}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setDossierPatient(p)}
                          className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg"
                        >
                          Ficha 360°
                        </button>
                        <button
                          onClick={() => openPlanFor(p)}
                          className="px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3" /> Plan IA
                        </button>
                        <button
                          onClick={() => openEdit(p)}
                          className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          disabled={deleting === p.id}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Expediente 360° */}
      <PatientDossierModal
        open={!!dossierPatient}
        patient={dossierPatient}
        onClose={() => setDossierPatient(null)}
        onEdit={p => { setDossierPatient(null); openEdit(p) }}
        onGeneratePlan={p => openPlanFor(p)}
        onAddCheckin={handleAddCheckin}
      />

      {/* Modal Crear / Editar Paciente */}
      <PatientModal
        open={modalOpen}
        patient={editing}
        doctorId={user!.id}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />

      {/* Modal Generar Plan IA directo desde Paciente */}
      <NewPlanModal
        open={newPlanOpen}
        doctorId={user!.id}
        initialPatientId={planPatientId}
        onClose={() => setNewPlanOpen(false)}
        onCreated={() => {
          setNewPlanOpen(false)
          navigate('/plans')
        }}
      />
    </div>
  )
}
