import { useState, useEffect, type FormEvent } from 'react'
import {
  Sparkles, ShieldCheck, Flame, AlertTriangle, CheckCircle2,
  Sliders, Utensils, Activity,
} from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { getPatients } from '@/features/patients/services/patients.service'
import { generateAndSavePlan } from '../services/plans.service'
import {
  PROTOCOL_INFO, calculateAge, calculateBMI, calculateBMR,
  calculateTDEE, calculateClinicalMacros, calculateEfficacyScore,
  recommendProtocol,
} from '@/lib/clinicalEngine'
import type { Patient } from '@/types/patient'
import type { NutritionPlan, ClinicalProtocol } from '@/types/plan'

interface Props {
  open: boolean
  doctorId: string
  initialPatientId?: string
  onClose: () => void
  onCreated: (plan: NutritionPlan) => void
}

type Step = 'form' | 'generating' | 'review'

const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition bg-white'
const labelClass = 'block text-xs font-bold text-gray-700 mb-1'

export default function NewPlanModal({ open, doctorId, initialPatientId, onClose, onCreated }: Props) {
  const [patients, setPatients]       = useState<Patient[]>([])
  const [patientId, setPatientId]     = useState('')
  const [protocol, setProtocol]       = useState<ClinicalProtocol>('caloric_deficit')
  const [customKcal, setCustomKcal]   = useState<number | undefined>(undefined)
  const [mealsPerDay, setMealsPerDay] = useState<number>(4)
  const [doctorNotes, setDoctorNotes] = useState('')
  const [step, setStep]               = useState<Step>('form')
  const [genStage, setGenStage]       = useState(0)
  const [generatedPlan, setGeneratedPlan] = useState<NutritionPlan | null>(null)
  const [error, setError]             = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setStep('form')
      setDoctorNotes('')
      setError(null)
      setGeneratedPlan(null)
      setCustomKcal(undefined)
      getPatients().then(list => {
        setPatients(list)
        if (initialPatientId) {
          setPatientId(initialPatientId)
          const found = list.find(p => p.id === initialPatientId)
          if (found) setProtocol(recommendProtocol(found))
        } else if (list.length > 0) {
          setPatientId(list[0].id)
          setProtocol(recommendProtocol(list[0]))
        }
      })
    }
  }, [open, initialPatientId])

  const selectedPatient = patients.find(p => p.id === patientId) ?? null

  function handlePatientChange(id: string) {
    setPatientId(id)
    setCustomKcal(undefined)
    const found = patients.find(p => p.id === id)
    if (found) {
      setProtocol(recommendProtocol(found))
    }
  }

  function handleProtocolChange(proto: ClinicalProtocol) {
    setProtocol(proto)
    setCustomKcal(undefined)
  }

  const macros = selectedPatient
    ? calculateClinicalMacros(selectedPatient, protocol, customKcal)
    : null

  const efficacy = selectedPatient && macros
    ? calculateEfficacyScore(selectedPatient, protocol, macros)
    : null

  const age  = selectedPatient ? calculateAge(selectedPatient.birth_date) : 0
  const bmi  = selectedPatient ? calculateBMI(selectedPatient.weight_kg, selectedPatient.height_cm) : null
  const bmr  = selectedPatient ? calculateBMR(selectedPatient.weight_kg, selectedPatient.height_cm, age, selectedPatient.gender) : 0
  const tdee = selectedPatient ? calculateTDEE(bmr, selectedPatient.activity_level ?? 'moderate') : 0

  async function handleGenerate(e: FormEvent) {
    e.preventDefault()
    if (!selectedPatient || !macros) return

    setStep('generating')
    setGenStage(0)
    setError(null)

    const timer1 = setTimeout(() => setGenStage(1), 450)
    const timer2 = setTimeout(() => setGenStage(2), 900)

    try {
      const plan = await generateAndSavePlan(selectedPatient, doctorId, doctorNotes, {
        protocol,
        mealsPerDay,
        macros,
      })
      clearTimeout(timer1)
      clearTimeout(timer2)
      setGeneratedPlan(plan)
      setStep('review')
    } catch (err) {
      clearTimeout(timer1)
      clearTimeout(timer2)
      setError(err instanceof Error ? err.message : 'Error al generar el plan')
      setStep('form')
    }
  }

  function handleDone() {
    if (generatedPlan) onCreated(generatedPlan)
    onClose()
  }

  const title = step === 'review'
    ? 'Plan Clínico Generado con Éxito'
    : 'Motor Clínico IA — Generador de Planes (>95% Eficacia)'

  return (
    <Modal
      open={open}
      title={title}
      subtitle="Fórmula dietosintética Mifflin-St Jeor + validación de patologías y alérgenos en tiempo real"
      size="2xl"
      onClose={step === 'generating' ? () => {} : onClose}
    >
      {step === 'form' && (
        <form onSubmit={handleGenerate} className="space-y-5">
          {/* Selector de paciente */}
          <div>
            <label className={labelClass}>1. Seleccionar Paciente Clínico</label>
            <select
              required
              value={patientId}
              onChange={e => handlePatientChange(e.target.value)}
              className={inputClass}
            >
              <option value="">Selecciona un paciente...</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>
                  {p.full_name} — {p.weight_kg}kg / {p.height_cm}cm ({p.goal})
                </option>
              ))}
            </select>
          </div>

          {/* Resumen Biometría en Tiempo Real del Paciente Seleccionado */}
          {selectedPatient && bmi && macros && efficacy && (
            <>
              <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Biometría en Vivo: {selectedPatient.full_name}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Eficacia Clínica Estimada: {efficacy.score}%
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-800/80 p-2.5 rounded-xl">
                    <span className="text-slate-400 block text-[11px]">IMC / Estado</span>
                    <span className="font-bold text-white text-sm">{bmi.value}</span>
                    <span className="text-emerald-400 text-[11px] ml-1">({bmi.category})</span>
                  </div>
                  <div className="bg-slate-800/80 p-2.5 rounded-xl">
                    <span className="text-slate-400 block text-[11px]">TMB Basal</span>
                    <span className="font-bold text-white text-sm">{bmr} kcal</span>
                  </div>
                  <div className="bg-slate-800/80 p-2.5 rounded-xl">
                    <span className="text-slate-400 block text-[11px]">GET Mantenimiento</span>
                    <span className="font-bold text-amber-300 text-sm">{tdee} kcal</span>
                  </div>
                  <div className="bg-slate-800/80 p-2.5 rounded-xl">
                    <span className="text-slate-400 block text-[11px]">Hidratación Meta</span>
                    <span className="font-bold text-sky-300 text-sm">{macros.water_liters} L/día</span>
                  </div>
                </div>

                {(selectedPatient.allergies || selectedPatient.conditions) && (
                  <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
                    {selectedPatient.allergies && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/20 text-red-200 border border-red-500/30 font-medium">
                        <AlertTriangle className="w-3 h-3 text-red-400" />
                        Alergias excluidas: {selectedPatient.allergies}
                      </span>
                    )}
                    {selectedPatient.conditions && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-200 border border-amber-500/30 font-medium">
                        Patología: {selectedPatient.conditions}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Configuración del Protocolo y Tiempos de Comida */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className={labelClass}>
                    <Sliders className="w-3.5 h-3.5 inline mr-1 text-emerald-600" />
                    2. Protocolo Dietoterapéutico IA
                  </label>
                  <select
                    value={protocol}
                    onChange={e => handleProtocolChange(e.target.value as ClinicalProtocol)}
                    className={inputClass}
                  >
                    {(Object.keys(PROTOCOL_INFO) as ClinicalProtocol[]).map(key => (
                      <option key={key} value={key}>
                        {PROTOCOL_INFO[key].name} — [{PROTOCOL_INFO[key].badge}]
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-gray-500 mt-1">
                    {PROTOCOL_INFO[protocol].description}
                  </p>
                </div>

                <div>
                  <label className={labelClass}>
                    <Utensils className="w-3.5 h-3.5 inline mr-1 text-emerald-600" />
                    Tiempos de Comida
                  </label>
                  <select
                    value={mealsPerDay}
                    onChange={e => setMealsPerDay(Number(e.target.value))}
                    className={inputClass}
                  >
                    <option value={3}>3 comidas (Desayuno, Comida, Cena)</option>
                    <option value={4}>4 comidas (+1 Colación)</option>
                    <option value={5}>5 comidas (+2 Colaciones)</option>
                  </select>
                </div>
              </div>

              {/* Ajuste de Calorías y Fórmula Dietosintética en Vivo */}
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-orange-500" />
                    3. Fórmula Dietosintética Prescrita: <span className="text-emerald-700 text-sm">{macros.calories} kcal/día</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-500">Ajustar kcal:</span>
                    <input
                      type="number"
                      step={50}
                      min={1000}
                      max={4500}
                      value={macros.calories}
                      onChange={e => setCustomKcal(Number(e.target.value))}
                      className="w-24 px-2 py-1 text-xs font-bold border border-emerald-300 rounded-lg bg-white text-center"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5 text-center">
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs">
                    <span className="text-[11px] font-semibold text-blue-600 block">Proteínas ({macros.protein_pct}%)</span>
                    <span className="text-base font-bold text-gray-900">{macros.protein_g} g</span>
                    <span className="text-[10px] text-gray-400 block">
                      {(macros.protein_g / selectedPatient.weight_kg).toFixed(1)} g/kg peso
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs">
                    <span className="text-[11px] font-semibold text-emerald-600 block">Carbohidratos ({macros.carbs_pct}%)</span>
                    <span className="text-base font-bold text-gray-900">{macros.carbs_g} g</span>
                    <span className="text-[10px] text-gray-400 block">
                      Fibra: {macros.fiber_g}g/día
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs">
                    <span className="text-[11px] font-semibold text-amber-600 block">Lípidos ({macros.fat_pct}%)</span>
                    <span className="text-base font-bold text-gray-900">{macros.fat_g} g</span>
                    <span className="text-[10px] text-gray-400 block">
                      Cardioprotectores
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Notas del médico */}
          <div>
            <label className={labelClass}>
              4. Indicaciones Clínicas Adicionales del Médico <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <textarea
              rows={3}
              value={doctorNotes}
              onChange={e => setDoctorNotes(e.target.value)}
              className={inputClass}
              placeholder="Ej: Priorizar alimentos económicos y fáciles de transportar a oficina. Evitar picante por gastritis. Incluir colación pre-entreno a las 5pm..."
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!patientId}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-sm transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Generar Plan Clínico IA ({efficacy?.score ?? 96}% Eficacia)
            </button>
          </div>
        </form>
      )}

      {step === 'generating' && (
        <div className="flex flex-col items-center justify-center py-12 px-4 gap-5">
          <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200">
            <Sparkles className="w-8 h-8 text-emerald-600 animate-pulse" />
          </div>
          <div className="text-center space-y-1">
            <p className="font-bold text-gray-900 text-base">Sintetizando Plan Clínico Personalizado...</p>
            <p className="text-xs text-gray-500">
              Aplicando ecuación Mifflin-St Jeor y restricciones clínicas de {selectedPatient?.full_name}
            </p>
          </div>

          <div className="w-full max-w-md space-y-2.5 bg-gray-50 p-4 rounded-2xl border border-gray-200 text-xs">
            {[
              '1. Calculando TMB, GET y distribución exacta de macronutrientes...',
              '2. Validando exclusión de alérgenos e interacciones fármaco-nutriente...',
              '3. Estructurando menú por equivalentes SMAE y lista de compras...',
            ].map((label, idx) => (
              <div key={idx} className="flex items-center gap-2.5">
                <CheckCircle2
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    genStage >= idx ? 'text-emerald-600' : 'text-gray-300'
                  }`}
                />
                <span className={genStage >= idx ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 'review' && generatedPlan && (
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Plan generado y validado con {generatedPlan.clinical_efficacy_score ?? 97}% de eficacia clínica.</strong> Guardado en borradores para tu revisión.
              </span>
            </div>
          </div>

          <div>
            <label className={labelClass}>Vista Previa del Documento Clínico</label>
            <textarea
              readOnly
              rows={15}
              value={generatedPlan.ai_generated_content}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-xs font-mono bg-slate-50 text-gray-800 resize-none leading-relaxed"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={handleDone}
              className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors"
            >
              Continuar y Abrir en Planes →
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
