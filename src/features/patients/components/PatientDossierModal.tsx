import { useState, type FormEvent } from 'react'
import {
  Activity, Flame, Droplets, Scale, AlertTriangle, CheckCircle2,
  Sparkles, Plus, TrendingDown, TrendingUp, HeartPulse, Pill,
  Phone, Mail, Calendar, Pencil, Ruler, Microscope, ClipboardList, Stethoscope,
} from 'lucide-react'
import Modal from '@/components/ui/Modal'
import {
  calculateAge, calculateBMI, calculateBMR, calculateTDEE,
  ACTIVITY_LABELS, evaluatePatientAlerts,
} from '@/lib/clinicalEngine'
import type { Patient, WeightRecord } from '@/types/patient'

interface Props {
  open: boolean
  patient: Patient | null
  onClose: () => void
  onEdit: (patient: Patient) => void
  onGeneratePlan: (patient: Patient) => void
  onAddCheckin: (patientId: string, record: WeightRecord) => Promise<void>
  onOpenLabScanner?: (patient: Patient) => void
  onOpenMedicalRecord?: (patient: Patient) => void
  onOpenConsultation?: (patient: Patient) => void
}

export default function PatientDossierModal({
  open,
  patient,
  onClose,
  onEdit,
  onGeneratePlan,
  onAddCheckin,
  onOpenLabScanner,
  onOpenMedicalRecord,
  onOpenConsultation,
}: Props) {
  const [showCheckin, setShowCheckin] = useState(false)
  const [weight, setWeight]       = useState('')
  const [bodyFat, setBodyFat]     = useState('')
  const [muscle, setMuscle]       = useState('')
  const [waist, setWaist]         = useState('')
  const [notes, setNotes]         = useState('')
  const [saving, setSaving]       = useState(false)

  if (!patient) return null

  const age  = calculateAge(patient.birth_date)
  const bmi  = calculateBMI(patient.weight_kg, patient.height_cm)
  const bmr  = calculateBMR(patient.weight_kg, patient.height_cm, age, patient.gender)
  const tdee = calculateTDEE(bmr, patient.activity_level ?? 'moderate')
  const waterRecommended = (patient.weight_kg * 0.035).toFixed(1)
  const alerts = evaluatePatientAlerts(patient)

  const history = patient.weight_history && patient.weight_history.length > 0
    ? patient.weight_history
    : [{ date: patient.created_at.split('T')[0], weight_kg: patient.weight_kg, notes: 'Registro inicial' }]

  const firstWeight = history[0]?.weight_kg ?? patient.weight_kg
  const weightDelta = Number((patient.weight_kg - firstWeight).toFixed(1))

  async function handleCheckinSubmit(e: FormEvent) {
    e.preventDefault()
    if (!patient || !weight) return
    setSaving(true)
    try {
      await onAddCheckin(patient.id, {
        date: new Date().toISOString().split('T')[0],
        weight_kg: parseFloat(weight),
        body_fat_pct: bodyFat ? parseFloat(bodyFat) : undefined,
        muscle_mass_kg: muscle ? parseFloat(muscle) : undefined,
        waist_cm: waist ? parseFloat(waist) : undefined,
        notes: notes || 'Control periódico en consulta',
      })
      setShowCheckin(false)
      setWeight('')
      setBodyFat('')
      setMuscle('')
      setWaist('')
      setNotes('')
    } finally {
      setSaving(false)
    }
  }

  // SVG Chart helper
  const weights = history.map(h => h.weight_kg)
  const minW = Math.min(...weights) - 1.5
  const maxW = Math.max(...weights) + 1.5
  const chartW = 520
  const chartH = 120
  const points = history.map((h, i) => {
    const x = history.length === 1 ? chartW / 2 : (i / (history.length - 1)) * (chartW - 60) + 30
    const y = chartH - 25 - ((h.weight_kg - minW) / Math.max(1, maxW - minW)) * (chartH - 50)
    return { x, y, ...h }
  })
  const polyline = points.map(p => `${p.x},${p.y}`).join(' ')

  return (
    <Modal
      open={open}
      title="Expediente Clínico 360° en Tiempo Real"
      subtitle={`ID Paciente: ${patient.id} • Última actualización: ${new Date(patient.updated_at).toLocaleDateString('es-MX')}`}
      size="4xl"
      onClose={onClose}
    >
      <div className="space-y-6">
        {/* Cabecera del Paciente */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white shadow-md">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-xl font-bold border border-white/20 shrink-0">
              {patient.full_name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-bold">{patient.full_name}</h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 font-medium">
                  {age} años • {patient.gender === 'male' ? 'Masculino' : patient.gender === 'female' ? 'Femenino' : 'Otro'}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-white/90">
                  {ACTIVITY_LABELS[patient.activity_level ?? 'moderate'].label}
                </span>
              </div>
              <p className="text-emerald-100 text-sm mt-1 font-medium">🎯 {patient.goal}</p>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-emerald-200/90">
                {patient.phone && (
                  <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {patient.phone}</span>
                )}
                {patient.email && (
                  <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {patient.email}</span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Nacimiento: {patient.birth_date}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onOpenConsultation && (
              <button
                type="button"
                onClick={() => onOpenConsultation(patient)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold border border-white/20 transition"
              >
                <Stethoscope className="w-3.5 h-3.5 text-emerald-300" /> Consulta Médica
              </button>
            )}
            {onOpenMedicalRecord && (
              <button
                type="button"
                onClick={() => onOpenMedicalRecord(patient)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold border border-white/20 transition"
              >
                <ClipboardList className="w-3.5 h-3.5 text-emerald-300" /> Expediente Médico
              </button>
            )}
            {onOpenLabScanner && (
              <button
                onClick={() => onOpenLabScanner(patient)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold border border-white/20 transition"
              >
                <Microscope className="w-3.5 h-3.5 text-emerald-300" /> Laboratorio IA
              </button>
            )}
            <button
              onClick={() => onEdit(patient)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium border border-white/15 transition"
            >
              <Pencil className="w-3.5 h-3.5" /> Editar Ficha
            </button>
            <button
              onClick={() => onGeneratePlan(patient)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-emerald-950 text-xs font-bold shadow-sm transition"
            >
              <Sparkles className="w-4 h-4" /> Generar Plan IA
            </button>
          </div>
        </div>

        {/* Tarjetas Biométricas en Tiempo Real */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-2xs">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>IMC / Estado OMS</span>
              <Scale className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900">{bmi.value}</span>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${bmi.color}`}>
                {bmi.category}
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5">
              Peso ideal: <strong className="text-gray-600">{bmi.idealMinKg} – {bmi.idealMaxKg} kg</strong>
            </p>
          </div>

          <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-2xs">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Gasto Energético (GET)</span>
              <Flame className="w-4 h-4 text-orange-500" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-gray-900">{tdee}</span>
              <span className="text-xs text-gray-500 font-medium">kcal/día</span>
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5">
              Basal (Mifflin-St Jeor): <strong className="text-gray-600">{bmr} kcal</strong>
            </p>
          </div>

          <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-2xs">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Composición Corporal</span>
              <Ruler className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900">
                {patient.body_fat_pct ? `${patient.body_fat_pct}%` : `${patient.weight_kg} kg`}
              </span>
              <span className="text-xs text-gray-500">
                {patient.body_fat_pct ? 'Grasa' : `${patient.height_cm} cm`}
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5">
              Músculo: <strong className="text-gray-600">{patient.muscle_mass_kg ? `${patient.muscle_mass_kg} kg` : 'N/A'}</strong> • Cintura: <strong className="text-gray-600">{patient.waist_cm ? `${patient.waist_cm} cm` : 'N/A'}</strong>
            </p>
          </div>

          <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-2xs">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Hidratación Requerida</span>
              <Droplets className="w-4 h-4 text-sky-500" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-gray-900">{waterRecommended}</span>
              <span className="text-xs text-gray-500 font-medium">Litros / día</span>
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5">
              Cálculo clínico: <strong className="text-gray-600">35 ml × {patient.weight_kg} kg</strong>
            </p>
          </div>
        </div>

        {/* Alertas Clínicas e Inteligencia Médica */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <HeartPulse className="w-4 h-4 text-emerald-600" />
              Diagnóstico Automatizado y Alertas Clínicas en Tiempo Real
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {alerts.map((a, i) => (
              <div
                key={i}
                className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                  a.type === 'danger'
                    ? 'bg-red-50/90 border-red-200 text-red-900'
                    : a.type === 'warning'
                    ? 'bg-amber-50/90 border-amber-200 text-amber-900'
                    : 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
                }`}
              >
                {a.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${a.type === 'danger' ? 'text-red-600' : 'text-amber-600'}`} />
                )}
                <div>
                  <p className="font-semibold">{a.title}</p>
                  <p className="opacity-85 mt-0.5 leading-relaxed">{a.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Curva de Evolución Ponderal + Registro en Vivo */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                Curva de Evolución Antropométrica ({history.length} controles)
              </h4>
              <p className="text-xs text-gray-500 mt-0.5">
                Seguimiento longitudinal de peso, porcentaje graso y masa muscular
              </p>
            </div>

            <div className="flex items-center gap-2">
              {weightDelta !== 0 && (
                <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                  weightDelta < 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                }`}>
                  {weightDelta < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                  {weightDelta > 0 ? `+${weightDelta}` : weightDelta} kg desde inicio
                </span>
              )}
              <button
                onClick={() => {
                  setShowCheckin(!showCheckin)
                  setWeight(String(patient.weight_kg))
                  setBodyFat(patient.body_fat_pct ? String(patient.body_fat_pct) : '')
                  setMuscle(patient.muscle_mass_kg ? String(patient.muscle_mass_kg) : '')
                  setWaist(patient.waist_cm ? String(patient.waist_cm) : '')
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition"
              >
                <Plus className="w-3.5 h-3.5" /> Registrar Chequeo Hoy
              </button>
            </div>
          </div>

          {showCheckin && (
            <form onSubmit={handleCheckinSubmit} className="mb-5 p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-3">
              <p className="text-xs font-bold text-emerald-900">Nuevo Control Antropométrico en Tiempo Real</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">Peso Hoy (kg) *</label>
                  <input
                    type="number" step="0.1" required value={weight}
                    onChange={e => setWeight(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">% Grasa Corporal</label>
                  <input
                    type="number" step="0.1" value={bodyFat}
                    onChange={e => setBodyFat(e.target.value)}
                    placeholder="Ej. 24.5"
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">Masa Muscular (kg)</label>
                  <input
                    type="number" step="0.1" value={muscle}
                    onChange={e => setMuscle(e.target.value)}
                    placeholder="Ej. 28.0"
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">Cintura (cm)</label>
                  <input
                    type="number" step="0.1" value={waist}
                    onChange={e => setWaist(e.target.value)}
                    placeholder="Ej. 75"
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text" value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Observación rápida del chequeo (ej. excelente adherencia, bajó 1.2kg de grasa)..."
                  className="flex-1 px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs"
                />
                <button
                  type="button" onClick={() => setShowCheckin(false)}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-200 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit" disabled={saving}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg"
                >
                  {saving ? 'Guardando...' : 'Guardar Control'}
                </button>
              </div>
            </form>
          )}

          {/* SVG Line Chart */}
          <div className="w-full overflow-x-auto">
            <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-32 bg-slate-50/60 rounded-xl border border-gray-100">
              <defs>
                <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {points.length > 1 && (
                <>
                  <polygon
                    points={`${points[0].x},${chartH - 20} ${polyline} ${points[points.length - 1].x},${chartH - 20}`}
                    fill="url(#weightGrad)"
                  />
                  <polyline
                    fill="none"
                    stroke="#059669"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={polyline}
                  />
                </>
              )}
              {points.map((p, idx) => (
                <g key={idx}>
                  <circle cx={p.x} cy={p.y} r="4.5" className="fill-emerald-600 stroke-white stroke-2" />
                  <text x={p.x} y={p.y - 9} textAnchor="middle" className="text-[10px] fill-gray-800 font-bold">
                    {p.weight_kg}kg
                  </text>
                  <text x={p.x} y={chartH - 6} textAnchor="middle" className="text-[9px] fill-gray-400">
                    {p.date.slice(5)}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Laboratorio / Biomarcadores y Antecedentes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <HeartPulse className="w-4 h-4 text-rose-500" />
                Química Sanguínea, HOMA-IR y Hormonal
              </h4>
              {onOpenLabScanner && (
                <button
                  type="button"
                  onClick={() => onOpenLabScanner(patient)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold transition"
                >
                  <Microscope className="w-3.5 h-3.5" /> Escanear Estudio IA
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-gray-50 flex flex-col justify-between">
                <span className="text-[11px] text-gray-500">Glucosa ayuno</span>
                <span className={`font-bold mt-0.5 ${(patient.biomarkers?.fasting_glucose ?? 0) >= 100 ? 'text-amber-600' : 'text-gray-900'}`}>
                  {patient.biomarkers?.fasting_glucose ? `${patient.biomarkers.fasting_glucose} mg/dL` : 'Sin reg.'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-gray-50 flex flex-col justify-between">
                <span className="text-[11px] text-gray-500">HOMA-IR / Insulina</span>
                <span className="font-bold text-gray-900 mt-0.5">
                  {patient.biomarkers?.fasting_glucose && patient.biomarkers?.fasting_insulin
                    ? `${((patient.biomarkers.fasting_glucose * patient.biomarkers.fasting_insulin) / 405).toFixed(1)} (${patient.biomarkers.fasting_insulin}µU)`
                    : patient.biomarkers?.hba1c ? `HbA1c ${patient.biomarkers.hba1c}%` : 'Sin reg.'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-gray-50 flex flex-col justify-between">
                <span className="text-[11px] text-gray-500">Presión Art.</span>
                <span className={`font-bold mt-0.5 ${(patient.biomarkers?.systolic_bp ?? 0) >= 130 ? 'text-amber-600' : 'text-gray-900'}`}>
                  {patient.biomarkers?.systolic_bp
                    ? `${patient.biomarkers.systolic_bp}/${patient.biomarkers.diastolic_bp ?? 80}`
                    : 'Sin reg.'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-gray-50 flex flex-col justify-between">
                <span className="text-[11px] text-gray-500">Triglicéridos</span>
                <span className={`font-bold mt-0.5 ${(patient.biomarkers?.triglycerides ?? 0) >= 150 ? 'text-amber-600' : 'text-gray-900'}`}>
                  {patient.biomarkers?.triglycerides ? `${patient.biomarkers.triglycerides} mg/dL` : 'Sin reg.'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-gray-50 flex flex-col justify-between">
                <span className="text-[11px] text-gray-500">TSH Tiroides</span>
                <span className={`font-bold mt-0.5 ${(patient.biomarkers?.tsh ?? 0) > 4.0 ? 'text-amber-600' : 'text-gray-900'}`}>
                  {patient.biomarkers?.tsh ? `${patient.biomarkers.tsh} mUI/L` : 'Sin reg.'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-gray-50 flex flex-col justify-between">
                <span className="text-[11px] text-gray-500">Vitamina D 25-OH</span>
                <span className={`font-bold mt-0.5 ${(patient.biomarkers?.vitamin_d ?? 35) < 30 ? 'text-amber-600' : 'text-gray-900'}`}>
                  {patient.biomarkers?.vitamin_d ? `${patient.biomarkers.vitamin_d} ng/mL` : 'Sin reg.'}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-gray-200 bg-white space-y-2.5 text-xs">
            <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Pill className="w-4 h-4 text-violet-600" />
              Historia Clínica y Farmacología
            </h4>
            <div>
              <span className="text-gray-400 font-medium">Alergias / Intolerancias: </span>
              <span className="font-semibold text-red-600">{patient.allergies || 'Ninguna reportada'}</span>
            </div>
            <div>
              <span className="text-gray-400 font-medium">Patologías: </span>
              <span className="font-medium text-gray-800">{patient.conditions || 'Aparentemente sano'}</span>
            </div>
            <div>
              <span className="text-gray-400 font-medium">Fármacos / Suplementos: </span>
              <span className="font-medium text-gray-800">{patient.medications || 'Ninguno'}</span>
            </div>
            {patient.notes && (
              <div className="pt-1 border-t border-gray-100 text-gray-600 italic">
                "{patient.notes}"
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}

