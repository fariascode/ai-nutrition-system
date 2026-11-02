import { useState, useEffect, type FormEvent } from 'react'
import {
  Sparkles, CheckCircle2, Printer, Scale, Stethoscope, ArrowRight,
} from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { getPatientById, addWeightCheckin } from '@/features/patients/services/patients.service'
import { generateAiSoapNote, APPOINTMENT_TYPE_LABELS } from '../services/appointments.service'
import { calculateBMI } from '@/lib/clinicalEngine'
import type { Appointment, SoapNote } from '@/types/appointment'
import type { Patient } from '@/types/patient'

interface Props {
  open: boolean
  appointment: Appointment | null
  onClose: () => void
  onSaveSoap: (appointmentId: string, soap: SoapNote) => Promise<void>
  onOpenNewPlan?: (patientId: string) => void
}

const textareaClass = 'w-full px-3.5 py-2 border border-line rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-surface leading-relaxed'
const labelClass = 'block text-xs font-extrabold text-content mb-1'

export default function SoapConsultationModal({
  open,
  appointment,
  onClose,
  onSaveSoap,
  onOpenNewPlan,
}: Props) {
  const [patient, setPatient]     = useState<Patient | null>(null)
  const [weight, setWeight]       = useState('')
  const [bodyFat, setBodyFat]     = useState('')
  const [muscle, setMuscle]       = useState('')
  const [waist, setWaist]         = useState('')

  const [subjective, setSubjective] = useState('')
  const [objective, setObjective]   = useState('')
  const [analysis, setAnalysis]     = useState('')
  const [plan, setPlan]             = useState('')
  const [saving, setSaving]         = useState(false)

  useEffect(() => {
    if (open && appointment) {
      getPatientById(appointment.patient_id).then(pat => {
        setPatient(pat)
        const existing = appointment.soap_note
        const w = existing?.recorded_weight_kg ?? pat?.weight_kg ?? 70
        const bf = existing?.recorded_body_fat_pct ?? pat?.body_fat_pct
        const mu = existing?.recorded_muscle_kg ?? pat?.muscle_mass_kg
        const wa = existing?.recorded_waist_cm ?? pat?.waist_cm

        setWeight(String(w))
        setBodyFat(bf ? String(bf) : '')
        setMuscle(mu ? String(mu) : '')
        setWaist(wa ? String(wa) : '')

        setSubjective(existing?.subjective ?? '')
        setObjective(existing?.objective ?? '')
        setAnalysis(existing?.analysis ?? '')
        setPlan(existing?.plan ?? '')
      })
    }
  }, [open, appointment])

  if (!appointment) return null

  function handleAutoDraftWithAi() {
    if (!patient) return
    const drafted = generateAiSoapNote(patient, {
      weightKg: parseFloat(weight) || patient.weight_kg,
      bodyFatPct: bodyFat ? parseFloat(bodyFat) : undefined,
      muscleKg: muscle ? parseFloat(muscle) : undefined,
      waistCm: waist ? parseFloat(waist) : undefined,
      subjectiveText: subjective,
    })
    setSubjective(drafted.subjective)
    setObjective(drafted.objective)
    setAnalysis(drafted.analysis)
    setPlan(drafted.plan)
  }

  async function handleSave(e: FormEvent, andGeneratePlan = false) {
    e.preventDefault()
    if (!appointment) return
    setSaving(true)
    try {
      const wNum = parseFloat(weight) || patient?.weight_kg || 70
      const bfNum = bodyFat ? parseFloat(bodyFat) : undefined
      const muNum = muscle ? parseFloat(muscle) : undefined
      const waNum = waist ? parseFloat(waist) : undefined

      const soap: SoapNote = {
        subjective,
        objective,
        analysis,
        plan,
        recorded_weight_kg: wNum,
        recorded_body_fat_pct: bfNum,
        recorded_muscle_kg: muNum,
        recorded_waist_cm: waNum,
        updated_at: new Date().toISOString(),
      }

      // Sincronizar pesaje con el Expediente 360° del paciente
      if (patient) {
        await addWeightCheckin(patient.id, {
          date: appointment.date,
          weight_kg: wNum,
          body_fat_pct: bfNum,
          muscle_mass_kg: muNum,
          waist_cm: waNum,
          notes: `Consulta SOAP: ${appointment.reason}`,
        })
      }

      await onSaveSoap(appointment.id, soap)
      onClose()
      if (andGeneratePlan && onOpenNewPlan) {
        onOpenNewPlan(appointment.patient_id)
      }
    } finally {
      setSaving(false)
    }
  }

  function handlePrintSoap() {
    if (!appointment) return
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <html>
        <head>
          <title>Nota Clínica SOAP — ${appointment.patient_name}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #1e293b; max-width: 800px; margin: 0 auto; line-height: 1.6; }
            .box { border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px; margin-bottom: 14px; }
            h3 { margin: 0 0 6px; color: #065f46; font-size: 14px; text-transform: uppercase; }
            p { margin: 0; font-size: 13px; white-space: pre-wrap; }
          </style>
        </head>
        <body>
          <h1 style="margin:0; color:#065f46;">NutriAI — Nota de Evolución Clínica (SOAP)</h1>
          <p style="margin:4px 0 20px; color:#64748b; font-size:13px;">
            Paciente: <strong>${appointment.patient_name}</strong> • Fecha: <strong>${appointment.date} (${appointment.time} hrs)</strong> • Tipo: ${APPOINTMENT_TYPE_LABELS[appointment.type].label}
          </p>
          <div class="box"><h3>S — Subjetivo (Interrogatorio y Adherencia)</h3><p>${subjective}</p></div>
          <div class="box"><h3>O — Objetivo (Antropometría y Signos Vitales)</h3><p>${objective}</p></div>
          <div class="box"><h3>A — Análisis (Diagnóstico Nutricional)</h3><p>${analysis}</p></div>
          <div class="box"><h3>P — Plan (Tratamiento Dietoterapéutico)</h3><p>${plan}</p></div>
        </body>
      </html>
    `)
    win.document.close()
    win.print()
  }

  const bmi = patient && weight ? calculateBMI(parseFloat(weight) || patient.weight_kg, patient.height_cm) : null

  return (
    <Modal
      open={open}
      title={`🩺 Consulta Clínica y Nota SOAP — ${appointment.patient_name}`}
      subtitle={`${APPOINTMENT_TYPE_LABELS[appointment.type].label} • ${appointment.date} a las ${appointment.time} hrs`}
      size="4xl"
      onClose={onClose}
    >
      <form onSubmit={e => handleSave(e, false)} className="space-y-4">
        {/* Barra de Antropometría en Vivo durante la Consulta */}
        <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-extrabold text-emerald-400 flex items-center gap-1.5">
              <Scale className="w-4 h-4" />
              Medición Antropométrica en Consulta (Se sincroniza en vivo con el Expediente 360°)
            </span>
            {bmi && (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-surface/10 text-emerald-300">
                IMC en Consulta: {bmi.value} ({bmi.category})
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-[11px] text-muted mb-1">Peso Hoy (kg) *</label>
              <input
                type="number" step="0.1" required value={weight}
                onChange={e => setWeight(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 font-bold text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] text-muted mb-1">% Grasa Corporal</label>
              <input
                type="number" step="0.1" value={bodyFat}
                onChange={e => setBodyFat(e.target.value)}
                placeholder="Ej. 25.4"
                className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 font-bold text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] text-muted mb-1">Masa Muscular (kg)</label>
              <input
                type="number" step="0.1" value={muscle}
                onChange={e => setMuscle(e.target.value)}
                placeholder="Ej. 27.5"
                className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 font-bold text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] text-muted mb-1">Cintura (cm)</label>
              <input
                type="number" step="0.1" value={waist}
                onChange={e => setWaist(e.target.value)}
                placeholder="Ej. 76"
                className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 font-bold text-white"
              />
            </div>
          </div>
        </div>

        {/* Botón de Asistente IA para autocompletar el formato SOAP */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-accent-soft border border-accent-line">
          <div className="flex items-center gap-2 text-xs text-content">
            <Stethoscope className="w-4 h-4 text-accent shrink-0" />
            <span>
              <strong>Asistente Clínico IA:</strong> Redacta automáticamente la nota evolutiva SOAP cruzando el peso de hoy con su historial.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintSoap}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface border border-line text-muted text-xs font-semibold hover:bg-subtle"
            >
              <Printer className="w-3.5 h-3.5" /> Imprimir SOAP
            </button>
            <button
              type="button"
              onClick={handleAutoDraftWithAi}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-action hover:bg-action-hover text-white text-xs font-extrabold shadow-2xs transition"
            >
              <Sparkles className="w-3.5 h-3.5" /> Redactar Nota SOAP con IA
            </button>
          </div>
        </div>

        {/* Campos S - O - A - P */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div>
            <label className={labelClass}>
              <span className="inline-block w-5 h-5 rounded-md bg-info-soft text-info text-center mr-1.5">S</span>
              Subjetivo (Síntomas, Apetito, Adherencia y Sueño)
            </label>
            <textarea
              rows={4}
              required
              value={subjective}
              onChange={e => setSubjective(e.target.value)}
              placeholder="¿Cómo se sintió el paciente? ¿Tuvo hambre, ansiedad, inflamación o buena energía?"
              className={textareaClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              <span className="inline-block w-5 h-5 rounded-md bg-accent-soft text-accent text-center mr-1.5">O</span>
              Objetivo (Exploración Antropométrica y Bioquímica)
            </label>
            <textarea
              rows={4}
              required
              value={objective}
              onChange={e => setObjective(e.target.value)}
              placeholder="Datos antropométricos medidos hoy, signos vitales y laboratorios relevantes..."
              className={textareaClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              <span className="inline-block w-5 h-5 rounded-md bg-warning-soft text-warning text-center mr-1.5">A</span>
              Análisis (Diagnóstico Evolutivo y Metabólico)
            </label>
            <textarea
              rows={4}
              required
              value={analysis}
              onChange={e => setAnalysis(e.target.value)}
              placeholder="Interpretación clínica del progreso ponderal, composición corporal y adherencia..."
              className={textareaClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              <span className="inline-block w-5 h-5 rounded-md bg-purple-soft text-purple text-center mr-1.5">P</span>
              Plan (Ajuste Dietoterapéutico, Metas y Próxima Cita)
            </label>
            <textarea
              rows={4}
              required
              value={plan}
              onChange={e => setPlan(e.target.value)}
              placeholder="Meta calórica, ajustes de macronutrientes, suplementos y fecha de próximo control..."
              className={textareaClass}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-line">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-muted bg-subtle hover:bg-subtle rounded-xl"
          >
            Cerrar
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-accent bg-accent-soft hover:bg-accent-soft rounded-xl transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              {saving ? 'Guardando...' : 'Guardar Consulta SOAP'}
            </button>

            {onOpenNewPlan && (
              <button
                type="button"
                disabled={saving}
                onClick={e => handleSave(e, true)}
                className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-extrabold text-white bg-action hover:bg-action-hover rounded-xl shadow-sm transition"
              >
                <Sparkles className="w-4 h-4" />
                Concluir Consulta y Generar Plan IA
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  )
}

