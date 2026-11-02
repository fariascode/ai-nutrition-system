import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Pencil, Trash2, Users, Search, Sparkles, Activity,
  Flame, AlertTriangle, Eye, LayoutGrid, List, Microscope,
} from 'lucide-react'
import { useAuth } from '@/features/auth/context/AuthContext'
import {
  getPatients, createPatient, updatePatient, deletePatient, addWeightCheckin,
} from '../services/patients.service'
import PatientModal from '../components/PatientModal'
import PatientDossierModal from '../components/PatientDossierModal'
import LabScannerModal from '../components/LabScannerModal'
import MedicalRecordModal from '@/features/medical-record/components/MedicalRecordModal'
import ConsultationModal from '@/features/consultations/components/ConsultationModal'
import NewPlanModal from '@/features/plans/components/NewPlanModal'
import {
  calculateAge, calculateBMI, calculateBMR, calculateTDEE, evaluatePatientAlerts,
} from '@/lib/clinicalEngine'
import type { Patient, PatientInsert, PatientUpdate, WeightRecord, LabBiomarkers } from '@/types/patient'

const genderLabel = { male: 'Masculino', female: 'Femenino', other: 'Otro' }

export default function PatientsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [patients, setPatients]       = useState<Patient[]>([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [filterAlert, setFilterAlert] = useState<'all' | 'alerts' | 'allergies'>('all')
  const [viewMode, setViewMode]       = useState<'cards' | 'table'>('cards')

  const [modalOpen, setModalOpen]           = useState(false)
  const [editing, setEditing]               = useState<Patient | null>(null)
  const [dossierPatient, setDossierPatient] = useState<Patient | null>(null)
  const [labPatient, setLabPatient]         = useState<Patient | null>(null)
  const [recordPatient, setRecordPatient]   = useState<Patient | null>(null)
  const [consultPatientId, setConsultPatientId] = useState<string | null>(null)
  const [planPatientId, setPlanPatientId]   = useState<string | undefined>(undefined)
  const [newPlanOpen, setNewPlanOpen]       = useState(false)
  const [deleting, setDeleting]             = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try { setPatients(await getPatients()) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

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

  async function handleSaveBiomarkers(
    patientId: string,
    biomarkers: LabBiomarkers,
    updatedConditions?: string,
    updatedMedications?: string,
  ) {
    const updated = await updatePatient(patientId, {
      biomarkers,
      ...(updatedConditions ? { conditions: updatedConditions } : {}),
      ...(updatedMedications ? { medications: updatedMedications } : {}),
    })
    setPatients(ps => ps.map(p => p.id === updated.id ? updated : p))
    if (dossierPatient?.id === updated.id) setDossierPatient(updated)
  }

  async function handleSyncClinicalText(
    patientId: string,
    data: { allergies: string | null; medications: string | null; conditions: string | null },
  ) {
    const updated = await updatePatient(patientId, data)
    setPatients(ps => ps.map(p => p.id === updated.id ? updated : p))
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EBF3EE] text-[#245C47] text-[11px] font-bold mb-1.5">
            <Users className="w-3.5 h-3.5" />
            Expedientes Longitudinales 360°
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1D2924] tracking-tight">
            Pacientes y Biometría Clínica
          </h1>
          <p className="text-xs sm:text-sm text-[#76847B] mt-0.5">
            Seguimiento antropométrico en tiempo real, cálculo metabólico Mifflin-St Jeor y análisis de laboratorio con IA
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="btn-forest flex items-center justify-center gap-2 px-5 py-2.5 text-xs sm:text-sm cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 text-[#C8ED8F]" />
          Nuevo Paciente Clínico
        </button>
      </div>

      {/* Barra de búsqueda y filtros rápidos en Bento Card */}
      <div className="bento-card p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#76847B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar paciente por nombre, patología, alergia u objetivo..."
            className="input-wellness w-full pl-10 pr-4 py-2 text-xs sm:text-sm font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-[#F7F8F4] border border-[#E7ECE6] p-1 rounded-xl text-xs font-semibold">
            {[
              { id: 'all',       label: `Todos (${patients.length})` },
              { id: 'alerts',    label: 'Con Alertas Clínicas' },
              { id: 'allergies', label: 'Con Alergias' },
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterAlert(f.id as typeof filterAlert)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  filterAlert === f.id
                    ? 'bg-[#245C47] text-white font-bold shadow-2xs'
                    : 'text-[#76847B] hover:text-[#1D2924]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center border border-[#E7ECE6] rounded-xl p-1 bg-[#F7F8F4]">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'cards' ? 'bg-white text-[#245C47] shadow-2xs' : 'text-[#76847B] hover:text-[#1D2924]'
              }`}
              title="Vista Tarjetas Bento 360°"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-[#245C47] shadow-2xs' : 'text-[#76847B] hover:text-[#1D2924]'
              }`}
              title="Vista Tabla"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bento-card p-6 h-64 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bento-card flex flex-col items-center justify-center h-64 text-center p-6">
          <div className="w-12 h-12 bg-[#EBF3EE] rounded-2xl flex items-center justify-center mb-3">
            <Users className="w-6 h-6 text-[#245C47]" />
          </div>
          <p className="font-extrabold text-[#1D2924]">No se encontraron pacientes</p>
          <p className="text-xs text-[#76847B] mt-1">
            Intenta con otro término o registra un nuevo expediente clínico
          </p>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(p => {
            const age    = calculateAge(p.birth_date)
            const bmi    = calculateBMI(p.weight_kg, p.height_cm)
            const bmr    = calculateBMR(p.weight_kg, p.height_cm, age, p.gender)
            const tdee   = calculateTDEE(bmr, p.activity_level ?? 'moderate')
            const alerts = evaluatePatientAlerts(p).filter(a => a.type === 'danger' || a.type === 'warning')

            return (
              <div
                key={p.id}
                className="bento-card-interactive flex flex-col justify-between overflow-hidden"
              >
                <div className="p-5 sm:p-6 space-y-4">
                  {/* Encabezado de tarjeta */}
                  <div className="flex items-start justify-between gap-3">
                    <div
                      onClick={() => setDossierPatient(p)}
                      className="flex items-center gap-3.5 cursor-pointer group"
                    >
                      <div className="w-11 h-11 rounded-2xl bg-[#245C47] text-[#C8ED8F] flex items-center justify-center font-extrabold text-sm shrink-0 shadow-xs">
                        {p.full_name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-[#1D2924] group-hover:text-[#245C47] transition-colors text-base leading-tight">
                          {p.full_name}
                        </h3>
                        <p className="text-xs text-[#76847B] font-medium mt-0.5">
                          {age} años • {genderLabel[p.gender]}
                        </p>
                      </div>
                    </div>

                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${bmi.color}`}>
                      IMC {bmi.value}
                    </span>
                  </div>

                  {/* Objetivo */}
                  <div className="text-xs bg-[#F7F8F4] p-3 rounded-2xl border border-[#E7ECE6] text-[#1D2924] font-semibold line-clamp-1">
                    🎯 {p.goal}
                  </div>

                  {/* Métricas rápidas Bento */}
                  <div className="grid grid-cols-3 gap-2 text-center bg-[#F7F8F4]/70 p-3 rounded-2xl border border-[#E7ECE6]">
                    <div>
                      <span className="text-[10px] font-semibold text-[#76847B] block">Peso / Talla</span>
                      <span className="text-sm font-extrabold text-[#1D2924]">{p.weight_kg} kg</span>
                      <span className="text-[10px] text-[#76847B] block">{p.height_cm} cm</span>
                    </div>
                    <div className="border-x border-[#E7ECE6]">
                      <span className="text-[10px] font-semibold text-[#76847B] block">GET Diario</span>
                      <span className="text-sm font-extrabold text-[#245C47] flex items-center justify-center gap-0.5">
                        <Flame className="w-3.5 h-3.5 text-[#245C47]" /> {tdee}
                      </span>
                      <span className="text-[10px] text-[#76847B] block">kcal/día</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-[#76847B] block">Comp. Grasa</span>
                      <span className="text-sm font-extrabold text-[#1D2924]">
                        {p.body_fat_pct ? `${p.body_fat_pct}%` : bmi.category}
                      </span>
                      <span className="text-[10px] text-[#76847B] block">
                        {p.muscle_mass_kg ? `${p.muscle_mass_kg}kg músc.` : 'OMS'}
                      </span>
                    </div>
                  </div>

                  {/* Etiquetas de alertas / alergias */}
                  <div className="flex flex-wrap gap-1.5">
                    {p.allergies && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-red-50 text-red-700 border border-red-200">
                        <AlertTriangle className="w-3 h-3" /> Alergia: {p.allergies}
                      </span>
                    )}
                    {p.conditions && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 line-clamp-1">
                        <Activity className="w-3 h-3 shrink-0" /> {p.conditions}
                      </span>
                    )}
                    {!p.allergies && !p.conditions && alerts.length === 0 && (
                      <span className="text-[11px] text-[#245C47] bg-[#F2FAE4] border border-[#C8ED8F] px-2.5 py-0.5 rounded-lg font-bold">
                        ✓ Biometría estable sin alertas
                      </span>
                    )}
                  </div>
                </div>

                {/* Pie de tarjeta con acciones */}
                <div className="px-5 py-3.5 bg-[#F7F8F4]/90 border-t border-[#E7ECE6] flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setDossierPatient(p)}
                    className="flex items-center gap-1.5 text-xs font-extrabold text-[#1D2924] hover:text-[#245C47] transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#245C47]" />
                    Expediente 360°
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setLabPatient(p)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-[#EBF3EE] border border-[#E7ECE6] text-[#1D2924] text-xs font-bold transition-colors cursor-pointer"
                      title="Analizar Laboratorio con IA"
                    >
                      <Microscope className="w-3.5 h-3.5 text-[#245C47]" /> Lab IA
                    </button>
                    <button
                      type="button"
                      onClick={() => openPlanFor(p)}
                      className="btn-forest flex items-center gap-1 px-3 py-1.5 text-xs cursor-pointer"
                      title="Generar Plan IA para este paciente"
                    >
                      <Sparkles className="w-3 h-3 text-[#C8ED8F]" /> Plan IA
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(p)}
                      className="p-1.5 text-[#76847B] hover:text-[#245C47] hover:bg-white rounded-xl transition-colors cursor-pointer"
                      title="Editar"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id)}
                      disabled={deleting === p.id}
                      className="p-1.5 text-[#76847B] hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
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
        <div className="bento-card overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-[#E7ECE6] bg-[#F7F8F4] text-[#76847B]">
                <th className="text-left px-5 py-3.5 font-bold">Paciente</th>
                <th className="text-left px-5 py-3.5 font-bold">Antropometría</th>
                <th className="text-left px-5 py-3.5 font-bold">IMC / Estado</th>
                <th className="text-left px-5 py-3.5 font-bold">GET Estimado</th>
                <th className="text-left px-5 py-3.5 font-bold">Clínica / Alergias</th>
                <th className="px-5 py-3.5 text-right font-bold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7ECE6]">
              {filtered.map(p => {
                const age  = calculateAge(p.birth_date)
                const bmi  = calculateBMI(p.weight_kg, p.height_cm)
                const bmr  = calculateBMR(p.weight_kg, p.height_cm, age, p.gender)
                const tdee = calculateTDEE(bmr, p.activity_level ?? 'moderate')
                return (
                  <tr key={p.id} className="hover:bg-[#F7F8F4]/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <button
                        type="button"
                        onClick={() => setDossierPatient(p)}
                        className="font-extrabold text-[#1D2924] hover:text-[#245C47] text-left block cursor-pointer"
                      >
                        {p.full_name}
                      </button>
                      <span className="text-xs text-[#76847B]">{age} años • {genderLabel[p.gender]}</span>
                    </td>
                    <td className="px-5 py-3.5 text-[#1D2924] font-semibold">
                      {p.weight_kg} kg / {p.height_cm} cm
                      {p.body_fat_pct && <span className="block text-xs text-[#76847B]">{p.body_fat_pct}% grasa</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${bmi.color}`}>
                        {bmi.value} • {bmi.category}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-bold text-[#245C47]">
                      {tdee} kcal/día
                      <span className="block text-[11px] text-[#76847B] font-normal">TMB: {bmr} kcal</span>
                    </td>
                    <td className="px-5 py-3.5 max-w-[220px]">
                      <p className="truncate font-semibold text-[#1D2924]">{p.goal}</p>
                      {p.allergies && <span className="text-[11px] text-red-700 font-bold">⚠️ {p.allergies}</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDossierPatient(p)}
                          className="px-3 py-1.5 text-xs font-bold text-[#245C47] bg-[#EBF3EE] hover:bg-[#C8ED8F]/50 rounded-xl cursor-pointer"
                        >
                          Ficha 360°
                        </button>
                        <button
                          type="button"
                          onClick={() => openPlanFor(p)}
                          className="btn-forest px-3 py-1.5 text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3 text-[#C8ED8F]" /> Plan IA
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(p)}
                          className="p-1.5 text-[#76847B] hover:text-[#245C47] hover:bg-[#F7F8F4] rounded-xl cursor-pointer"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id)}
                          disabled={deleting === p.id}
                          className="p-1.5 text-[#76847B] hover:text-red-600 hover:bg-red-50 rounded-xl cursor-pointer"
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
        onOpenLabScanner={p => { setDossierPatient(null); setLabPatient(p) }}
        onOpenMedicalRecord={p => { setDossierPatient(null); setRecordPatient(p) }}
        onOpenConsultation={p => { setDossierPatient(null); setConsultPatientId(p.id) }}
      />

      {/* Modal Consulta Médica */}
      <ConsultationModal
        open={!!consultPatientId}
        patientId={consultPatientId}
        onClose={() => setConsultPatientId(null)}
        onSaved={load}
      />

      {/* Modal Expediente Médico Integral */}
      <MedicalRecordModal
        open={!!recordPatient}
        patient={recordPatient}
        onClose={() => setRecordPatient(null)}
        onSyncPatient={handleSyncClinicalText}
      />

      {/* Modal Escáner de Laboratorio Clínico con IA */}
      <LabScannerModal
        open={!!labPatient}
        patient={labPatient}
        onClose={() => setLabPatient(null)}
        onSaveBiomarkers={handleSaveBiomarkers}
        onGeneratePlanAfterSave={patientId => {
          setLabPatient(null)
          setPlanPatientId(patientId)
          setNewPlanOpen(true)
        }}
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
