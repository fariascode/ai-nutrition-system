import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, CheckCircle, Clock, ShieldCheck, Sparkles, Plus,
  AlertTriangle, Activity, Flame, Calculator, ArrowRight,
  HeartPulse, Microscope, Droplets, Utensils, Smartphone,
} from 'lucide-react'
import { useAuth } from '@/features/auth/context/AuthContext'
import { getPatients, addWeightCheckin, updatePatient } from '@/features/patients/services/patients.service'
import { getPlans } from '@/features/plans/services/plans.service'
import {
  calculateAge, calculateBMI, calculateBMR, calculateTDEE,
  evaluatePatientAlerts, PROTOCOL_INFO,
} from '@/lib/clinicalEngine'
import PatientDossierModal from '@/features/patients/components/PatientDossierModal'
import PatientModal from '@/features/patients/components/PatientModal'
import LabScannerModal from '@/features/patients/components/LabScannerModal'
import MedicalRecordModal from '@/features/medical-record/components/MedicalRecordModal'
import ConsultationModal from '@/features/consultations/components/ConsultationModal'
import NewPlanModal from '@/features/plans/components/NewPlanModal'
import PlanDetailModal from '@/features/plans/components/PlanDetailModal'
import type { Patient, PatientUpdate, WeightRecord, ActivityLevel, LabBiomarkers } from '@/types/patient'
import type { PlanWithPatient } from '@/types/plan'

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [patients, setPatients] = useState<Patient[]>([])
  const [plans, setPlans]       = useState<PlanWithPatient[]>([])
  const [loading, setLoading]   = useState(true)

  // Modales conectados al Centro de Mando
  const [selectedPatient, setSelectedPatient]   = useState<Patient | null>(null)
  const [editingPatient, setEditingPatient]     = useState<Patient | null>(null)
  const [labPatient, setLabPatient]             = useState<Patient | null>(null)
  const [recordPatient, setRecordPatient]       = useState<Patient | null>(null)
  const [consultPatientId, setConsultPatientId] = useState<string | null>(null)
  const [newPlanPatientId, setNewPlanPatientId] = useState<string | undefined>(undefined)
  const [newPlanOpen, setNewPlanOpen]           = useState(false)
  const [selectedPlan, setSelectedPlan]         = useState<PlanWithPatient | null>(null)

  // Calculadora rápida de bolsillo (Mifflin-St Jeor)
  const [calcWeight, setCalcWeight]     = useState('72')
  const [calcHeight, setCalcHeight]     = useState('168')
  const [calcAge, setCalcAge]           = useState('32')
  const [calcGender, setCalcGender]     = useState<'female' | 'male'>('female')
  const [calcActivity, setCalcActivity] = useState<ActivityLevel>('moderate')

  async function loadAll() {
    setLoading(true)
    try {
      const [pts, pls] = await Promise.all([getPatients(), getPlans()])
      setPatients(pts)
      setPlans(pls)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  const publishedCount = plans.filter(p => p.status === 'published').length
  const draftCount     = plans.filter(p => p.status === 'draft').length


  // Métricas nutricionales reales consolidadas del plan activo principal (o promedio de planes activos)
  const featuredPlan = plans.find(p => p.status === 'published' && p.macros) ?? plans[0]
  const activeMacros = featuredPlan?.macros ?? {
    calories: 1750,
    protein_g: 131,
    carbs_g: 153,
    fat_g: 68,
    fiber_g: 28,
    water_liters: 2.5,
  }
  const totalMacroGrams = Math.max(1, activeMacros.protein_g + activeMacros.carbs_g + activeMacros.fat_g)
  const proteinPct = Math.round((activeMacros.protein_g / totalMacroGrams) * 100)
  const carbsPct   = Math.round((activeMacros.carbs_g / totalMacroGrams) * 100)
  const fatPct     = Math.max(10, 100 - proteinPct - carbsPct)

  // Pacientes con alertas clínicas activas
  const patientsWithAlerts = patients.map(p => ({
    patient: p,
    alerts: evaluatePatientAlerts(p).filter(a => a.type === 'danger' || a.type === 'warning'),
    bmi: calculateBMI(p.weight_kg, p.height_cm),
  })).filter(item => item.alerts.length > 0)

  // Cálculos de la calculadora rápida
  const cw = parseFloat(calcWeight) || 70
  const ch = parseFloat(calcHeight) || 168
  const ca = parseInt(calcAge) || 30
  const quickBmi  = calculateBMI(cw, ch)
  const quickBmr  = calculateBMR(cw, ch, ca, calcGender)
  const quickTdee = calculateTDEE(quickBmr, calcActivity)

  async function handleAddCheckin(patientId: string, record: WeightRecord) {
    const updated = await addWeightCheckin(patientId, record)
    setPatients(ps => ps.map(p => p.id === updated.id ? updated : p))
    setSelectedPatient(updated)
  }

  async function handleSavePatient(data: PatientUpdate) {
    if (!editingPatient) return
    const updated = await updatePatient(editingPatient.id, data)
    setPatients(ps => ps.map(p => p.id === updated.id ? updated : p))
    setEditingPatient(null)
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
    if (selectedPatient?.id === updated.id) setSelectedPatient(updated)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* FILA BENTO 1: Hero Clínico + Resumen Nutricional y Macronutrientes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Tarjeta Bento Hero (7 columnas) */}
        <div className="lg:col-span-7 rounded-[24px] bg-[#245C47] text-white p-6 sm:p-8 shadow-[0_18px_40px_-12px_rgba(36,92,71,0.32)] flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-lime-solid/15 blur-2xl pointer-events-none" />

          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface/10 border border-white/15 text-[#C8ED8F] text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-lime-solid animate-pulse" />
              Centro de Mando Clínico • {user?.email}
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-extrabold tracking-tight leading-tight">
              NutriAI Clinical Intelligence
            </h1>
            <p className="text-[#DCE7E1] text-xs sm:text-sm max-w-xl leading-relaxed">
              Consultas, seguimiento de mediciones y borradores nutricionales en un solo lugar, con revisión profesional antes de compartir indicaciones.
            </p>
          </div>

          <div className="relative z-10 flex flex-wrap items-center gap-3 pt-6">
            <button
              type="button"
              onClick={() => { setNewPlanPatientId(undefined); setNewPlanOpen(true) }}
              className="btn-lime px-5 py-2.5 text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-accent" />
              Generar Plan Clínico IA
            </button>
            <button
              type="button"
              onClick={() => navigate('/patients')}
              className="px-4 py-2.5 rounded-[14px] bg-surface/12 hover:bg-surface/20 text-white text-xs sm:text-sm font-bold border border-white/15 transition flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#C8ED8F]" />
              Expedientes 360°
            </button>
            <button
              type="button"
              onClick={() => navigate('/appointments')}
              className="px-4 py-2.5 rounded-[14px] bg-surface/8 hover:bg-surface/15 text-[#DCE7E1] text-xs sm:text-sm font-semibold border border-white/10 transition cursor-pointer"
            >
              Agenda y Notas SOAP
            </button>
          </div>
        </div>

        {/* Tarjeta Bento de Balance Energético, Macronutrientes e Hidratación (5 columnas) */}
        <div className="lg:col-span-5 bento-card p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted block">
                Monitor de Prescripción Activa
              </span>
              <h2 className="text-base font-extrabold text-content mt-0.5 truncate">
                {featuredPlan ? featuredPlan.patients.full_name : 'Balance Nutricional de Referencia'}
              </h2>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-lime-tint border border-[#C8ED8F] text-content text-xs font-extrabold shrink-0">
              <Flame className="w-3.5 h-3.5 text-accent" />
              {activeMacros.calories} kcal/día
            </span>
          </div>

          {/* Barra compuesta de distribución de macronutrientes */}
          <div className="space-y-2">
            <div className="w-full h-3 rounded-full bg-subtle overflow-hidden flex gap-0.5 p-0.5">
              <div
                style={{ width: `${proteinPct}%` }}
                className="h-full bg-[#245C47] rounded-l-full transition-all duration-500"
                title={`Proteínas: ${activeMacros.protein_g}g`}
              />
              <div
                style={{ width: `${carbsPct}%` }}
                className="h-full bg-lime-solid transition-all duration-500"
                title={`Carbohidratos: ${activeMacros.carbs_g}g`}
              />
              <div
                style={{ width: `${fatPct}%` }}
                className="h-full bg-[#76847B] rounded-r-full transition-all duration-500"
                title={`Grasas: ${activeMacros.fat_g}g`}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="p-2.5 rounded-2xl bg-canvas border border-line">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#245C47]" />
                  <span className="text-[11px] font-semibold text-muted">Proteína</span>
                </div>
                <p className="text-base font-extrabold text-content mt-0.5">{activeMacros.protein_g}g</p>
                <span className="text-[10px] font-bold text-accent">{proteinPct}% del total</span>
              </div>

              <div className="p-2.5 rounded-2xl bg-canvas border border-line">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#9CD649]" />
                  <span className="text-[11px] font-semibold text-muted">Carbos</span>
                </div>
                <p className="text-base font-extrabold text-content mt-0.5">{activeMacros.carbs_g}g</p>
                <span className="text-[10px] font-bold text-accent">{carbsPct}% • {activeMacros.fiber_g}g fibra</span>
              </div>

              <div className="p-2.5 rounded-2xl bg-canvas border border-line">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#76847B]" />
                  <span className="text-[11px] font-semibold text-muted">Grasas</span>
                </div>
                <p className="text-base font-extrabold text-content mt-0.5">{activeMacros.fat_g}g</p>
                <span className="text-[10px] font-bold text-muted">{fatPct}% saludables</span>
              </div>
            </div>
          </div>

          {/* Meta de Hidratación y acceso al Portal Móvil */}
          <div className="flex items-center justify-between pt-2 border-t border-line text-xs">
            <div className="flex items-center gap-2 text-content font-semibold">
              <div className="w-7 h-7 rounded-xl bg-accent-soft text-accent flex items-center justify-center">
                <Droplets className="w-3.5 h-3.5" />
              </div>
              <span>Hidratación pautada: <strong>{activeMacros.water_liters} L / día</strong></span>
            </div>
            {featuredPlan && (
              <button
                type="button"
                onClick={() => navigate(`/portal/${featuredPlan.id}`)}
                className="inline-flex items-center gap-1 text-xs font-extrabold text-accent hover:underline cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5" /> App Paciente →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* FILA BENTO 2: KPIs Clínicos con Números Grandes y Jerarquía Clara */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bento-card p-5 animate-pulse h-32" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            onClick={() => navigate('/patients')}
            className="bento-card-interactive p-5 cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-accent-soft text-accent flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-accent bg-accent-soft px-2.5 py-0.5 rounded-full">
                Activos 360°
              </span>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-content tracking-tight">{patients.length}</p>
              <p className="text-xs text-muted mt-0.5 font-semibold">Expedientes clínicos</p>
            </div>
          </div>

          <div
            onClick={() => navigate('/plans')}
            className="bento-card-interactive p-5 cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-lime-tint text-accent flex items-center justify-center">
                <CheckCircle className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-extrabold text-content bg-lime-solid px-2.5 py-0.5 rounded-full">
                Vigentes
              </span>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-content tracking-tight">{publishedCount}</p>
              <p className="text-xs text-muted mt-0.5 font-semibold">Planes nutricionales activos</p>
            </div>
          </div>

          <div
            onClick={() => navigate('/plans')}
            className="bento-card-interactive p-5 cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-warning-soft text-warning flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-warning bg-warning-soft/80 px-2.5 py-0.5 rounded-full">
                En revisión
              </span>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-content tracking-tight">{draftCount}</p>
              <p className="text-xs text-muted mt-0.5 font-semibold">Borradores médicos</p>
            </div>
          </div>

          <div className="bento-card p-5 flex flex-col justify-between bg-gradient-to-br from-surface to-canvas">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-[#245C47] text-[#C8ED8F] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-extrabold text-accent bg-lime-tint border border-[#C8ED8F] px-2.5 py-0.5 rounded-full">
                Registro de planes
              </span>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-accent tracking-tight">{plans.length}</p>
              <p className="text-xs text-muted mt-0.5 font-semibold">Planes registrados</p>
            </div>
          </div>
        </div>
      )}

      {/* FILA BENTO 3: Radar Clínico de Pacientes (8 col) + Calculadora Metabólica (4 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Columna Izquierda (8/12): Radar Clínico de Pacientes en Tiempo Real */}
        <div className="lg:col-span-8 bento-card p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-accent-soft text-accent flex items-center justify-center">
                  <HeartPulse className="w-4 h-4" />
                </div>
                <h2 className="font-extrabold text-content text-base sm:text-lg tracking-tight">
                  Radar Biométrico de Pacientes
                </h2>
                {patientsWithAlerts.length > 0 && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-warning-soft text-warning">
                    {patientsWithAlerts.length} con alertas IA
                  </span>
                )}
              </div>
              <p className="text-xs text-muted mt-1">
                Selecciona cualquier paciente para abrir su Expediente 360°, curva de peso o escáner de laboratorio
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/patients')}
              className="text-xs font-extrabold text-accent hover:underline flex items-center gap-1 cursor-pointer"
            >
              Ver todos ({patients.length}) <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {patients.slice(0, 4).map(p => {
              const age    = calculateAge(p.birth_date)
              const bmi    = calculateBMI(p.weight_kg, p.height_cm)
              const bmr    = calculateBMR(p.weight_kg, p.height_cm, age, p.gender)
              const tdee   = calculateTDEE(bmr, p.activity_level ?? 'moderate')
              const alerts = evaluatePatientAlerts(p).filter(a => a.type === 'danger' || a.type === 'warning')
              const waterGoal = (p.weight_kg * 0.035).toFixed(1)

              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPatient(p)}
                  className="p-4 rounded-[18px] border border-line hover:border-[#245C47]/40 bg-canvas/70 hover:bg-surface transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3.5"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-[#245C47] text-[#C8ED8F] font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                      {p.full_name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-extrabold text-content text-sm">{p.full_name}</h3>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${bmi.color}`}>
                          IMC {bmi.value} ({bmi.category})
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted font-semibold">
                        <span>⚖️ {p.weight_kg} kg ({p.height_cm} cm)</span>
                        <span className="text-accent">🔥 GET: {tdee} kcal</span>
                        <span>💧 {waterGoal} L/día</span>
                      </div>

                      <p className="text-xs text-content/80 font-medium line-clamp-1">
                        🎯 {p.goal}
                      </p>

                      {alerts.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {alerts.slice(0, 2).map((a, idx) => (
                            <span
                              key={idx}
                              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                                a.type === 'danger'
                                  ? 'bg-danger-soft text-danger border border-danger-line'
                                  : 'bg-warning-soft text-warning border border-warning-line'
                              }`}
                            >
                              <AlertTriangle className="w-3 h-3" />
                              {a.title}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation()
                        setLabPatient(p)
                      }}
                      className="px-3 py-1.5 rounded-xl bg-canvas hover:bg-accent-soft border border-line text-content text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                      title="Escanear Laboratorio con IA"
                    >
                      <Microscope className="w-3.5 h-3.5 text-accent" /> Lab IA
                    </button>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation()
                        setNewPlanPatientId(p.id)
                        setNewPlanOpen(true)
                      }}
                      className="btn-forest px-3.5 py-1.5 text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#C8ED8F]" /> Plan IA
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Columna Derecha (4/12): Calculadora Metabólica Instantánea */}
        <div className="lg:col-span-4 bento-card p-5 sm:p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-lime-tint border border-[#C8ED8F] text-accent flex items-center justify-center">
                <Calculator className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-extrabold text-content text-base tracking-tight">
                  Calculadora Clínica IA
                </h2>
                <p className="text-[11px] text-muted font-medium">
                  Estimación inmediata Mifflin-St Jeor
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-bold text-muted block mb-1">Peso (kg)</label>
                <input
                  type="number"
                  value={calcWeight}
                  onChange={e => setCalcWeight(e.target.value)}
                  className="input-wellness w-full px-3 py-2 font-extrabold text-content"
                />
              </div>
              <div>
                <label className="font-bold text-muted block mb-1">Talla (cm)</label>
                <input
                  type="number"
                  value={calcHeight}
                  onChange={e => setCalcHeight(e.target.value)}
                  className="input-wellness w-full px-3 py-2 font-extrabold text-content"
                />
              </div>
              <div>
                <label className="font-bold text-muted block mb-1">Edad (años)</label>
                <input
                  type="number"
                  value={calcAge}
                  onChange={e => setCalcAge(e.target.value)}
                  className="input-wellness w-full px-3 py-2 font-extrabold text-content"
                />
              </div>
              <div>
                <label className="font-bold text-muted block mb-1">Sexo biológico</label>
                <select
                  value={calcGender}
                  onChange={e => setCalcGender(e.target.value as 'female' | 'male')}
                  className="input-wellness w-full px-2.5 py-2 font-bold text-content"
                >
                  <option value="female">Femenino</option>
                  <option value="male">Masculino</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="font-bold text-muted block mb-1">Factor de Actividad Física</label>
                <select
                  value={calcActivity}
                  onChange={e => setCalcActivity(e.target.value as ActivityLevel)}
                  className="input-wellness w-full px-3 py-2 font-bold text-content"
                >
                  <option value="sedentary">Sedentario (×1.2)</option>
                  <option value="light">Ligero 1-3 días (×1.375)</option>
                  <option value="moderate">Moderado 3-5 días (×1.55)</option>
                  <option value="active">Intenso 6-7 días (×1.725)</option>
                  <option value="athlete">Atleta Alto Rendimiento (×1.9)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tarjeta de Resultados Metabólicos en Verde Carbón + Lima */}
          <div className="p-4 rounded-[20px] bg-[#1D2924] text-white space-y-2.5 text-xs border border-[#245C47]">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-[#B8C4BC]">IMC Calculado:</span>
              <span className="font-extrabold text-[#C8ED8F]">{quickBmi.value} ({quickBmi.category})</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#B8C4BC]">Rango OMS Saludable:</span>
              <span className="font-bold text-white">{quickBmi.idealMinKg} – {quickBmi.idealMaxKg} kg</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#B8C4BC]">Tasa Metabólica Basal:</span>
              <span className="font-bold text-white">{quickBmr} kcal/día</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#B8C4BC]">Gasto Total (GET):</span>
              <span className="font-extrabold text-[#C8ED8F] text-sm">{quickTdee} kcal/día</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <span className="text-[#B8C4BC]">Meta Déficit (-20%):</span>
              <span className="font-extrabold px-2 py-0.5 rounded-md bg-[#245C47] text-[#C8ED8F]">
                {Math.round(quickTdee * 0.8)} kcal/día
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* FILA BENTO 4: Prescripciones Recientes y Recomendaciones Clínicas IA */}
      <div className="bento-card p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-lime-tint border border-[#C8ED8F] text-accent flex items-center justify-center">
              <Utensils className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-extrabold text-content text-base tracking-tight">
                Prescripciones Nutricionales y Planes con IA
              </h2>
              <p className="text-xs text-muted">
                Menús validados por equivalentes SMAE, lista de súper inteligente y portal móvil del paciente
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/plans')}
            className="text-xs font-extrabold text-accent hover:underline flex items-center gap-1 cursor-pointer"
          >
            Explorar planes ({plans.length}) <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plans.slice(0, 2).map(plan => (
            <div
              key={plan.id}
              onClick={() => setSelectedPlan(plan)}
              className="p-4 sm:p-5 rounded-[20px] border border-line hover:border-[#245C47]/40 transition-all cursor-pointer flex flex-col justify-between gap-3 bg-canvas/60 hover:bg-surface"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-extrabold text-content text-sm sm:text-base">
                    {plan.patients.full_name}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-lime-tint text-content border border-[#C8ED8F]">
                    <Sparkles className="w-3 h-3 text-accent" />
                    {plan.status === 'published' ? 'Publicado' : plan.status === 'archived' ? 'Archivado' : 'Borrador'}
                  </span>
                </div>
                <p className="text-xs font-semibold text-accent">
                  {plan.protocol ? PROTOCOL_INFO[plan.protocol].name : 'Plan Nutricional Personalizado'}
                </p>
                {plan.macros && (
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted font-semibold pt-1">
                    <span className="px-2 py-0.5 rounded-lg bg-surface border border-line text-content font-bold">
                      🔥 {plan.macros.calories} kcal
                    </span>
                    <span>P: {plan.macros.protein_g}g</span>
                    <span>• C: {plan.macros.carbs_g}g</span>
                    <span>• G: {plan.macros.fat_g}g</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-line text-xs">
                <span className="text-muted font-medium flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-accent" />
                  Incluye Lista de Súper y Equivalentes SMAE
                </span>
                <span className="font-extrabold text-accent shrink-0">Abrir →</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modales conectados al Dashboard */}
      <PatientDossierModal
        open={!!selectedPatient}
        patient={selectedPatient}
        onClose={() => setSelectedPatient(null)}
        onEdit={p => { setSelectedPatient(null); setEditingPatient(p) }}
        onGeneratePlan={p => {
          setSelectedPatient(null)
          setNewPlanPatientId(p.id)
          setNewPlanOpen(true)
        }}
        onAddCheckin={handleAddCheckin}
        onOpenLabScanner={p => { setSelectedPatient(null); setLabPatient(p) }}
        onOpenMedicalRecord={p => { setSelectedPatient(null); setRecordPatient(p) }}
        onOpenConsultation={p => { setSelectedPatient(null); setConsultPatientId(p.id) }}
      />

      <ConsultationModal
        open={!!consultPatientId}
        patientId={consultPatientId}
        onClose={() => setConsultPatientId(null)}
        onSaved={loadAll}
      />

      <MedicalRecordModal
        open={!!recordPatient}
        patient={recordPatient}
        onClose={() => setRecordPatient(null)}
        onSyncPatient={async (patientId, data) => {
          const updated = await updatePatient(patientId, data)
          setPatients(ps => ps.map(p => p.id === updated.id ? updated : p))
        }}
      />

      <LabScannerModal
        open={!!labPatient}
        patient={labPatient}
        onClose={() => setLabPatient(null)}
        onSaveBiomarkers={handleSaveBiomarkers}
        onGeneratePlanAfterSave={patientId => {
          setLabPatient(null)
          setNewPlanPatientId(patientId)
          setNewPlanOpen(true)
        }}
      />

      <PatientModal
        open={!!editingPatient}
        patient={editingPatient}
        doctorId={user!.id}
        onClose={() => setEditingPatient(null)}
        onSave={handleSavePatient}
      />

      <NewPlanModal
        open={newPlanOpen}
        doctorId={user!.id}
        initialPatientId={newPlanPatientId}
        onClose={() => setNewPlanOpen(false)}
        onCreated={() => {
          setNewPlanOpen(false)
          loadAll()
        }}
      />

      <PlanDetailModal
        open={!!selectedPlan}
        plan={selectedPlan}
        onClose={() => setSelectedPlan(null)}
        onUpdated={updated => {
          setPlans(ps => ps.map(p => p.id === updated.id ? { ...p, ...updated } : p))
          setSelectedPlan(prev => prev ? { ...prev, ...updated } : null)
        }}
      />
    </div>
  )
}
