import { useEffect, useState, type FormEvent } from 'react'
import {
  Plus, Stethoscope, HeartPulse, ClipboardCheck, Lock, Unlock, Trash2,
  AlertTriangle, ChevronLeft, CheckCircle2, Printer, Pencil,
} from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { saveConsultationWorkflow } from '../services/consultationWorkflow'
import { storageError } from '@/lib/localStorage'
import { useAuth } from '@/features/auth/context/AuthContext'
import { isDemo } from '@/lib/mockData'
import MedicalRecordSummary from '@/features/medical-record/components/MedicalRecordSummary'
import { getMedicalRecord } from '@/features/medical-record/services/medicalRecord.service'
import type { MedicalRecord } from '@/types/medicalRecord'
import { getPatientById } from '@/features/patients/services/patients.service'
import {
  getConsultationsByPatient, saveConsultation, deleteConsultation,
  meanArterialPressure, evaluateVitals,
} from '../services/consultations.service'
import { calculateBMI } from '@/lib/clinicalEngine'
import { EMPTY_EXAM } from '@/types/consultation'
import type { Consultation, PhysicalExam, VitalSigns, GlucoseContext } from '@/types/consultation'
import type { Appointment } from '@/types/appointment'
import type { Patient } from '@/types/patient'

interface Props {
  open: boolean
  patientId: string | null
  appointment?: Appointment | null
  onClose: () => void
  /** Se invoca tras guardar para que la página refresque pacientes/citas. */
  onSaved?: () => void
}

type View = 'list' | 'form'

const inputClass = 'input-wellness w-full px-3 py-2 text-xs sm:text-sm font-medium disabled:opacity-70'
const labelClass = 'block text-[11px] font-bold text-[#76847B] mb-1'
const sectionTitle = 'text-sm font-extrabold text-[#1D2924] flex items-center gap-2'

const EXAM_FIELDS: { key: keyof PhysicalExam; label: string; placeholder: string }[] = [
  { key: 'general',         label: 'Aspecto general',          placeholder: 'Estado de alerta, hidratación, constitución, marcha...' },
  { key: 'head_neck',       label: 'Cabeza y cuello',          placeholder: 'Mucosas, tiroides, adenopatías...' },
  { key: 'cardiopulmonary', label: 'Cardiopulmonar',           placeholder: 'Ruidos cardiacos, campos pulmonares...' },
  { key: 'abdomen',         label: 'Abdomen',                  placeholder: 'Dolor a la palpación, visceromegalias, peristalsis...' },
  { key: 'extremities',     label: 'Extremidades',             placeholder: 'Edema, pulsos, fuerza, movilidad...' },
  { key: 'skin',            label: 'Piel y anexos',            placeholder: 'Coloración, acantosis, lesiones...' },
  { key: 'other',           label: 'Otros hallazgos',          placeholder: 'Neurológico, osteomuscular, etc.' },
]

const todayStr = () => new Date().toISOString().split('T')[0]
const GLUCOSE_CONTEXT_LABELS: Record<GlucoseContext, string> = {
  unknown: 'No especificado', fasting: 'Ayuno confirmado', random: 'Casual / sin ayuno', postprandial: 'Posprandial',
}

interface Draft {
  id?: string
  date: string
  status: Consultation['status']
  chief_complaint: string
  present_illness: string
  vitals: Record<keyof VitalSigns, string>
  glucose_context: GlucoseContext
  exam: PhysicalExam
  assessment: string
  plan: string
  follow_up_date: string
  follow_up_notes: string
  schedule_follow_up: boolean
  follow_up_time: string
}

const VITAL_KEYS: (keyof VitalSigns)[] = [
  'systolic_bp', 'diastolic_bp', 'heart_rate', 'resp_rate', 'temperature_c', 'spo2', 'weight_kg', 'height_cm', 'glucose',
]

function blankDraft(patient: Patient | null, appointment?: Appointment | null): Draft {
  const vitals = Object.fromEntries(VITAL_KEYS.map(k => [k, ''])) as Draft['vitals']
  if (patient) {
    vitals.weight_kg = String(patient.weight_kg)
    vitals.height_cm = String(patient.height_cm)
  }
  return {
    date: appointment?.date ?? todayStr(),
    status: 'draft',
    chief_complaint: appointment?.reason ?? '',
    present_illness: '',
    vitals,
    glucose_context: 'unknown',
    exam: { ...EMPTY_EXAM },
    assessment: '',
    plan: '',
    follow_up_date: '',
    follow_up_notes: '',
    schedule_follow_up: false,
    follow_up_time: '',
  }
}

function draftFromConsultation(c: Consultation): Draft {
  const vitals = Object.fromEntries(
    VITAL_KEYS.map(k => [k, c.vitals[k] !== undefined ? String(c.vitals[k]) : '']),
  ) as Draft['vitals']
  return {
    id: c.id,
    date: c.date,
    status: c.status,
    chief_complaint: c.chief_complaint,
    present_illness: c.present_illness,
    vitals,
    glucose_context: c.glucose_context ?? 'unknown',
    exam: { ...EMPTY_EXAM, ...c.exam },
    assessment: c.assessment,
    plan: c.plan,
    follow_up_date: c.follow_up_date ?? '',
    follow_up_notes: c.follow_up_notes ?? '',
    schedule_follow_up: Boolean(c.follow_up_schedule),
    follow_up_time: c.follow_up_schedule?.time ?? '',
  }
}

function parseVitals(raw: Draft['vitals']): VitalSigns {
  const out: VitalSigns = {}
  for (const k of VITAL_KEYS) {
    const n = parseFloat(raw[k])
    if (!Number.isNaN(n)) out[k] = n
  }
  return out
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export default function ConsultationModal({ open, patientId, appointment, onClose, onSaved }: Props) {
  const { user } = useAuth()
  const actor = { id: user?.id ?? 'local', label: user?.email ?? 'Usuario local' }
  const [dirty, setDirty] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [patient, setPatient]             = useState<Patient | null>(null)
  const [medicalRecord, setMedicalRecord] = useState<MedicalRecord | null>(null)
  const [loading, setLoading] = useState(false)
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [view, setView]                   = useState<View>('list')
  const [draft, setDraft]                 = useState<Draft | null>(null)
  const [syncMetrics, setSyncMetrics]     = useState(true)
  const [saving, setSaving]               = useState(false)
  const [error, setError]                 = useState<string | null>(null)

  async function reload(pid: string) {
    setConsultations(await getConsultationsByPatient(pid))
  }

  useEffect(() => {
    if (!open || !patientId) return
    setError(null)
    setSyncMetrics(isDemo)
    setDirty(false)
    setNotice(null)
    setLoading(true)
    setPatient(null)
    setMedicalRecord(null)
    setDraft(null)
    let cancelled = false
    getPatientById(patientId).then(async pat => {
      if (!pat) throw new Error('No se encontró al paciente.')
      const record = await getMedicalRecord(pat)
      const list = await getConsultationsByPatient(patientId)
      if (cancelled) return
      setPatient(pat)
      setMedicalRecord(record)
      setConsultations(list)
      // Si se abre desde una cita, ir directo al formulario (retomando la consulta de esa cita si ya existe)
      if (appointment) {
        const existing = list.find(c => c.appointment_id === appointment.id && c.status !== 'voided')
        setDraft(existing ? draftFromConsultation(existing) : blankDraft(pat, appointment))
        setView('form')
      } else {
        setView('list')
        setDraft(null)
      }
    }).catch(() => {
      if (!cancelled) setError('No se pudo cargar la consulta y el expediente. Cierra e intenta de nuevo.')
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [open, patientId, appointment])

  if (!open || !patientId) return null

  const locked = draft?.status !== 'draft'
  const vitalsNum = draft ? parseVitals(draft.vitals) : {}
  const flags = evaluateVitals(vitalsNum, draft?.glucose_context)
  const map = meanArterialPressure(vitalsNum)
  const bmi = vitalsNum.weight_kg && vitalsNum.height_cm
    ? calculateBMI(vitalsNum.weight_kg, vitalsNum.height_cm)
    : null

  function patchDraft(patch: Partial<Draft>) {
    if (draft) { setDraft({ ...draft, ...patch }); setDirty(true) }
  }
  const setVital = (k: keyof VitalSigns, v: string) => patchDraft({ vitals: { ...draft!.vitals, [k]: v } })
  const setExam = (k: keyof PhysicalExam, v: string) => patchDraft({ exam: { ...draft!.exam, [k]: v } })

  function startNew() {
    setDirty(false)
    setDraft(blankDraft(patient))
    setError(null)
    setView('form')
  }

  async function persist(status: Consultation['status']) {
    if (!draft || !patient || saving || locked) return
    if (!draft.chief_complaint.trim()) {
      setError('El motivo de consulta es obligatorio.')
      return
    }
    if (status === 'closed' && (!draft.assessment.trim() || !draft.plan.trim())) {
      setError('Para cerrar la consulta captura la evaluación y el plan de seguimiento.')
      return
    }
    if (draft.schedule_follow_up && (!draft.follow_up_date || !draft.follow_up_time || draft.follow_up_date < draft.date)) {
      setError('Para agendar el seguimiento elige fecha y hora; la fecha no puede ser anterior a la consulta.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const vitals = parseVitals(draft.vitals)
      const saved = await saveConsultationWorkflow({
        id: draft.id,
        patient_id: patient.id,
        appointment_id: appointment?.id ?? consultations.find(c => c.id === draft.id)?.appointment_id ?? null,
        date: draft.date,
        status,
        chief_complaint: draft.chief_complaint.trim(),
        present_illness: draft.present_illness.trim(),
        vitals,
        glucose_context: draft.glucose_context,
        exam: draft.exam,
        assessment: draft.assessment.trim(),
        plan: draft.plan.trim(),
        follow_up_date: draft.follow_up_date || null,
        follow_up_notes: draft.follow_up_notes.trim(),
        follow_up_schedule: draft.schedule_follow_up ? { time: draft.follow_up_time, duration_min: 30, modality: 'in_person' } : undefined,
      }, patient, syncMetrics, actor)
      setDraft(draftFromConsultation(saved))
      setDirty(false)
      setNotice(status === 'closed' ? 'Consulta cerrada y agenda actualizada.' : 'Borrador guardado.')
      await reload(patient.id)
      onSaved?.()
      if (appointment) {
        onClose()
      } else {
        setView('list')
        setDraft(null)
      }
    } catch (err) {
      setError(storageError(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!patient || saving) return
    const reason = prompt('Motivo de anulación. La consulta y sus versiones se conservarán:')
    if (!reason?.trim()) return
    setSaving(true)
    try {
      await deleteConsultation(id, reason, actor)
      await reload(patient.id)
      onSaved?.()
      setNotice('Consulta anulada; su historial se conserva. Revisa en la agenda las citas que debas cancelar.')
    } catch (err) { setError(storageError(err)) }
    finally { setSaving(false) }
  }

  async function reopen() {
    if (!draft?.id || saving) return
    const existing = consultations.find(item => item.id === draft.id)
    if (!existing || existing.status !== 'closed') return
    const reason = prompt('¿Por qué necesitas reabrir esta consulta?')
    if (!reason?.trim()) return
    setSaving(true)
    try {
      const saved = await saveConsultation({ ...existing, status: 'draft' }, actor, reason)
      setDraft(draftFromConsultation(saved))
      await reload(patientId!)
      setDirty(false)
      setNotice('Reapertura registrada. La versión anterior se conserva.')
    } catch (err) { setError(storageError(err)) }
    finally { setSaving(false) }
  }

  function close() {
    if (saving) return
    if (dirty && !confirm('Hay cambios sin guardar. ¿Quieres descartarlos y cerrar?')) return
    onClose()
  }

  function handlePrint(d: Draft) {
    if (!patient) return
    const v = parseVitals(d.vitals)
    const rows = [
      ['Presión arterial', v.systolic_bp && v.diastolic_bp ? `${v.systolic_bp}/${v.diastolic_bp} mmHg` : ''],
      ['Frecuencia cardiaca', v.heart_rate ? `${v.heart_rate} lpm` : ''],
      ['Frecuencia respiratoria', v.resp_rate ? `${v.resp_rate} rpm` : ''],
      ['Temperatura', v.temperature_c ? `${v.temperature_c} °C` : ''],
      ['SpO₂', v.spo2 ? `${v.spo2} %` : ''],
      ['Peso / Talla', v.weight_kg ? `${v.weight_kg} kg / ${v.height_cm ?? '—'} cm` : ''],
      ['Glucosa capilar', v.glucose ? `${v.glucose} mg/dL (${GLUCOSE_CONTEXT_LABELS[d.glucose_context]})` : ''],
    ].filter(([, val]) => val)
    const examRows = EXAM_FIELDS.filter(f => d.exam[f.key].trim())

    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<html><head><title>Consulta — ${escapeHtml(patient.full_name)}</title>
      <style>
        body{font-family:system-ui,sans-serif;padding:36px;color:#1D2924;max-width:820px;margin:0 auto;line-height:1.55}
        h1{color:#245C47;margin:0 0 4px;font-size:20px} h2{font-size:13px;text-transform:uppercase;color:#245C47;margin:18px 0 6px;border-bottom:1px solid #E7ECE6;padding-bottom:3px}
        p{margin:0;font-size:13px;white-space:pre-wrap} table{border-collapse:collapse;font-size:13px} td{padding:3px 14px 3px 0}
        .meta{color:#76847B;font-size:12px;margin-bottom:10px}
      </style></head><body>
      <h1>Nota de consulta médica</h1>
      <div class="meta">Paciente: <b>${escapeHtml(patient.full_name)}</b> · Fecha: <b>${escapeHtml(d.date)}</b></div>
      <h2>Motivo de consulta</h2><p>${escapeHtml(d.chief_complaint)}</p>
      ${d.present_illness.trim() ? `<h2>Padecimiento actual</h2><p>${escapeHtml(d.present_illness)}</p>` : ''}
      ${rows.length ? `<h2>Signos vitales</h2><table>${rows.map(([k, val]) => `<tr><td>${k}</td><td><b>${escapeHtml(String(val))}</b></td></tr>`).join('')}</table>` : ''}
      ${examRows.length ? `<h2>Exploración física</h2>${examRows.map(f => `<p><b>${f.label}:</b> ${escapeHtml(d.exam[f.key])}</p>`).join('')}` : ''}
      ${d.assessment.trim() ? `<h2>Evaluación</h2><p>${escapeHtml(d.assessment)}</p>` : ''}
      ${d.plan.trim() ? `<h2>Plan y tratamiento</h2><p>${escapeHtml(d.plan)}</p>` : ''}
      ${d.follow_up_date || d.follow_up_notes.trim() ? `<h2>Seguimiento</h2><p>${d.follow_up_date ? `Próxima cita: ${escapeHtml(d.follow_up_date)}. ` : ''}${escapeHtml(d.follow_up_notes)}</p>` : ''}
      </body></html>`)
    win.document.close()
    win.print()
  }

  const title = view === 'form'
    ? `Consulta médica — ${patient?.full_name ?? ''}`
    : `Consultas médicas — ${patient?.full_name ?? ''}`

  return (
    <Modal
      open={open}
      title={title}
      subtitle={view === 'form'
        ? 'Motivo, padecimiento actual, signos vitales, exploración, evaluación y seguimiento'
        : `${consultations.length} consulta(s) registrada(s) en el expediente`}
      size="4xl"
      onClose={close}
    >
      {notice && <p role="status" className="text-sm text-[#245C47]">{notice}</p>}
      {loading && <p role="status">Cargando paciente y expediente...</p>}
      {error && !draft && <p role="alert" className="text-red-800 text-sm">{error}</p>}
      {!loading && medicalRecord && <MedicalRecordSummary record={medicalRecord} />}
      {!loading && patient && view === 'list' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button type="button" onClick={startNew} className="btn-forest flex items-center gap-1.5 px-4 py-2 text-xs cursor-pointer">
              <Plus className="w-4 h-4 text-[#C8ED8F]" /> Nueva consulta
            </button>
          </div>

          {consultations.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-[#EBF3EE] text-[#245C47] flex items-center justify-center mx-auto">
                <Stethoscope className="w-6 h-6" />
              </div>
              <p className="font-extrabold text-[#1D2924]">Sin consultas registradas</p>
              <p className="text-xs text-[#76847B]">Registra la primera consulta médica de este paciente.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {consultations.map(c => {
                const cFlags = evaluateVitals(c.vitals, c.glucose_context)
                return (
                  <div key={c.id} className="p-4 rounded-2xl border border-[#E7ECE6] bg-[#F7F8F4]/70 space-y-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-extrabold text-[#1D2924]">{c.date}</span>
                          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                            c.status === 'closed'
                              ? 'bg-[#F2FAE4] border-[#C8ED8F] text-[#1D2924]'
                              : 'bg-amber-50 border-amber-200 text-amber-800'
                          }`}>
                            {c.status === 'voided' ? 'Anulada' : c.status === 'closed' ? <><Lock className="w-3 h-3" /> Cerrada</> : <><Pencil className="w-3 h-3" /> Borrador</>}
                          </span>
                          {cFlags.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800">
                              <AlertTriangle className="w-3 h-3" /> {cFlags.length} signo(s) fuera de rango
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-extrabold text-[#1D2924] mt-1">{c.chief_complaint}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => { setDirty(false); setDraft(draftFromConsultation(c)); setError(null); setView('form') }}
                          className="btn-secondary px-3 py-1.5 text-xs cursor-pointer"
                        >
                          {c.status === 'draft' ? 'Continuar' : 'Ver'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(c.id)}
                          aria-label="Anular consulta"
                          disabled={saving || c.status === 'voided'}
                          className="p-1.5 text-[#76847B] hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {c.assessment && (
                      <p className="text-xs text-[#76847B] line-clamp-2">
                        <strong className="text-[#1D2924]">Evaluación:</strong> {c.assessment}
                      </p>
                    )}
                    {c.follow_up_date && (
                      <p className="text-[11px] font-bold text-[#245C47]">Seguimiento: {c.follow_up_date}</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {view === 'form' && draft && (
        <form
          onSubmit={(e: FormEvent) => { e.preventDefault(); persist('draft') }}
          className="space-y-5"
        >
          {!appointment && (
            <button
              type="button"
              disabled={saving}
              onClick={() => { if (dirty && !confirm('¿Descartar los cambios sin guardar?')) return; setDirty(false); setView('list'); setDraft(null) }}
              className="flex items-center gap-1 text-xs font-bold text-[#245C47] hover:underline cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> Volver al historial
            </button>
          )}

          {locked && (
            <div role="status" className="p-3 rounded-2xl bg-[#F2FAE4] border border-[#C8ED8F] text-xs text-[#1D2924] flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 font-semibold">
                <Lock className="w-4 h-4 text-[#245C47]" /> {draft.status === 'voided' ? 'Consulta anulada: historial conservado.' : 'Consulta cerrada: solo lectura.'}
              </span>
              {draft.status === 'closed' && <button
                type="button"
                disabled={saving}
                onClick={reopen}
                className="flex items-center gap-1 font-bold text-[#245C47] hover:underline cursor-pointer"
              >
                <Unlock className="w-3.5 h-3.5" /> Reabrir como borrador
              </button>}
            </div>
          )}

          <fieldset disabled={locked || saving} className="space-y-5 min-w-0">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className={labelClass} htmlFor="c-date">Fecha</label>
                <input id="c-date" type="date" value={draft.date} onChange={e => patchDraft({ date: e.target.value })} className={inputClass} />
              </div>
              <div className="sm:col-span-3">
                <label className={labelClass} htmlFor="c-reason">Motivo de consulta *</label>
                <input
                  id="c-reason" type="text" required value={draft.chief_complaint}
                  onChange={e => patchDraft({ chief_complaint: e.target.value })}
                  placeholder="Ej. Control de hipertensión, dolor abdominal de 3 días..."
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass} htmlFor="c-illness">Padecimiento actual</label>
              <textarea
                id="c-illness" rows={3} value={draft.present_illness}
                onChange={e => patchDraft({ present_illness: e.target.value })}
                placeholder="Inicio, evolución, síntomas asociados, factores que agravan o alivian, tratamientos previos..."
                className={inputClass}
              />
            </div>

            {/* Signos vitales */}
            <div className="space-y-2.5">
              <h4 className={sectionTitle}><HeartPulse className="w-4 h-4 text-rose-500" /> Signos vitales</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {([
                  ['systolic_bp', 'PA sistólica (mmHg)', '1'],
                  ['diastolic_bp', 'PA diastólica (mmHg)', '1'],
                  ['heart_rate', 'Frec. cardiaca (lpm)', '1'],
                  ['resp_rate', 'Frec. respiratoria (rpm)', '1'],
                  ['temperature_c', 'Temperatura (°C)', '0.1'],
                  ['spo2', 'SpO₂ (%)', '1'],
                  ['weight_kg', 'Peso (kg)', '0.1'],
                  ['height_cm', 'Talla (cm)', '0.1'],
                  ['glucose', 'Glucosa capilar (mg/dL)', '1'],
                ] as [keyof VitalSigns, string, string][]).map(([k, label, step]) => (
                  <div key={k}>
                    <label className={labelClass} htmlFor={`v-${k}`}>{label}</label>
                    <input
                      id={`v-${k}`} type="number" step={step} min={0} value={draft.vitals[k]}
                      onChange={e => setVital(k, e.target.value)} className={inputClass}
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className={labelClass} htmlFor="c-glucose-context">Condición de la medición de glucosa</label>
                <select id="c-glucose-context" value={draft.glucose_context}
                  onChange={e => patchDraft({ glucose_context: e.target.value as GlucoseContext })} className={inputClass}>
                  {Object.entries(GLUCOSE_CONTEXT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <p className="text-[11px] text-[#76847B] mt-1">La glucosa se conserva en esta consulta. Solo se actualiza el campo de ayuno si seleccionas ayuno confirmado.</p>
              </div>
              {(map || bmi) && (
                <div className="flex flex-wrap gap-2 text-[11px] font-bold">
                  {map && <span className="px-2.5 py-1 rounded-full bg-[#EBF3EE] text-[#245C47]">PAM: {map} mmHg</span>}
                  {bmi && <span className="px-2.5 py-1 rounded-full bg-[#EBF3EE] text-[#245C47]">IMC: {bmi.value} ({bmi.category})</span>}
                </div>
              )}

              {flags.length > 0 && (
                <div role="alert" className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                  <p className="font-extrabold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> Signos fuera de rango de referencia
                  </p>
                  <ul className="list-disc pl-5 space-y-0.5">
                    {flags.map(f => (
                      <li key={f.key} className={f.level === 'danger' ? 'font-bold' : ''}>
                        {f.label}: {f.text}{f.level === 'danger' ? ' (atención prioritaria)' : ''}
                      </li>
                    ))}
                  </ul>
                  <p className="text-[10px] opacity-80">Referencia general para adultos; la valoración final es del médico.</p>
                </div>
              )}
            </div>

            {/* Exploración física */}
            <div className="space-y-2.5">
              <h4 className={sectionTitle}><Stethoscope className="w-4 h-4 text-[#245C47]" /> Exploración física</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {EXAM_FIELDS.map(f => (
                  <div key={f.key} className={f.key === 'other' ? 'md:col-span-2' : ''}>
                    <label className={labelClass} htmlFor={`e-${f.key}`}>{f.label}</label>
                    <textarea
                      id={`e-${f.key}`} rows={2} value={draft.exam[f.key]}
                      onChange={e => setExam(f.key, e.target.value)}
                      placeholder={f.placeholder} className={inputClass}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Evaluación y plan */}
            <div className="space-y-3">
              <h4 className={sectionTitle}><ClipboardCheck className="w-4 h-4 text-[#245C47]" /> Evaluación y plan</h4>
              <div>
                <label className={labelClass} htmlFor="c-assess">Evaluación / impresión diagnóstica {`(requerido para cerrar)`}</label>
                <textarea
                  id="c-assess" rows={3} value={draft.assessment}
                  onChange={e => patchDraft({ assessment: e.target.value })}
                  placeholder="Interpretación clínica de los hallazgos e impresión diagnóstica..."
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="c-plan">Plan y tratamiento {`(requerido para cerrar)`}</label>
                <textarea
                  id="c-plan" rows={3} value={draft.plan}
                  onChange={e => patchDraft({ plan: e.target.value })}
                  placeholder="Conducta, indicaciones, estudios a solicitar, medidas generales..."
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={labelClass} htmlFor="c-fu-date">Fecha de seguimiento</label>
                  <input id="c-fu-date" type="date" value={draft.follow_up_date} onChange={e => patchDraft({ follow_up_date: e.target.value })} className={inputClass} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass} htmlFor="c-fu-notes">Plan de seguimiento</label>
                  <input
                    id="c-fu-notes" type="text" value={draft.follow_up_notes}
                    onChange={e => patchDraft({ follow_up_notes: e.target.value })}
                    placeholder="Ej. Traer laboratorios, registrar PA en casa 2 veces al día..."
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2 text-xs">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={draft.schedule_follow_up} onChange={e => patchDraft({ schedule_follow_up: e.target.checked })} />
                Agendar seguimiento presencial de 30 minutos al cerrar
              </label>
              {draft.schedule_follow_up && <div>
                <label className={labelClass} htmlFor="c-fu-time">Hora del seguimiento</label>
                <input id="c-fu-time" type="time" value={draft.follow_up_time} onChange={e => patchDraft({ follow_up_time: e.target.value })} className={inputClass} />
              </div>}
              <p className="text-[#76847B]">Sin esta opción, la fecha queda como indicación y no reserva un horario. Para cancelar una cita ya creada, usa la agenda.</p>
            </div>
          </fieldset>

          {!locked && (
            <label className="flex items-start gap-2 text-xs text-[#1D2924] cursor-pointer">
              <input type="checkbox" disabled={!isDemo || saving} checked={syncMetrics} onChange={e => setSyncMetrics(e.target.checked)} className="mt-0.5" />
              <span>
                {isDemo ? 'Al cerrar, sincronizar mediciones con la ficha local (glucosa solo con ayuno confirmado).' : 'La sincronización de mediciones con el servidor queda pendiente.'}
              </span>
            </label>
          )}

          {error && (
            <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold">
              {error}
            </div>
          )}

          {draft.id && <details className="text-xs space-y-2">
            <summary className="font-bold cursor-pointer">Historial de cambios</summary>
            {consultations.find(item => item.id === draft.id)?.revisions?.map((revision, index) => (
              <details key={index} className="p-2 border rounded-xl">
                <summary>{new Date(revision.at).toLocaleString('es-MX')} · {revision.actor.label} · {{ created: 'Creación', updated: 'Edición', closed: 'Cierre', reopened: 'Reapertura', voided: 'Anulación' }[revision.action]}{revision.reason ? ` · ${revision.reason}` : ''}</summary>
                {revision.previous && <div className="space-y-1 mt-2 whitespace-pre-wrap">
                  <p><strong>Fecha anterior:</strong> {revision.previous.date}</p>
                  <p><strong>Motivo:</strong> {revision.previous.chief_complaint}</p>
                  <p><strong>Padecimiento:</strong> {revision.previous.present_illness || 'Sin registro'}</p>
                  {Object.entries(revision.previous.vitals).map(([key, value]) => <p key={key}>
                    <strong>{{ systolic_bp: 'PA sistólica (mmHg)', diastolic_bp: 'PA diastólica (mmHg)', heart_rate: 'Frecuencia cardiaca (lpm)', resp_rate: 'Frecuencia respiratoria (rpm)', temperature_c: 'Temperatura (°C)', spo2: 'Saturación (%)', weight_kg: 'Peso (kg)', height_cm: 'Talla (cm)', glucose: 'Glucosa (mg/dL)' }[key as keyof VitalSigns]}:</strong> {value}
                  </p>)}
                  <p><strong>Condición de glucosa:</strong> {GLUCOSE_CONTEXT_LABELS[revision.previous.glucose_context ?? 'unknown']}</p>
                  {EXAM_FIELDS.map(field => revision.previous?.exam[field.key] && <p key={field.key}><strong>{field.label}:</strong> {revision.previous.exam[field.key]}</p>)}
                  <p><strong>Evaluación:</strong> {revision.previous.assessment || 'Sin registro'}</p>
                  <p><strong>Plan:</strong> {revision.previous.plan || 'Sin registro'}</p>
                  <p><strong>Seguimiento:</strong> {revision.previous.follow_up_date} {revision.previous.follow_up_notes}</p>
                </div>}
              </details>
            ))}
          </details>}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#E7ECE6]">
            <button type="button" onClick={() => handlePrint(draft)} className="btn-secondary flex items-center gap-1.5 px-3 py-2 text-xs cursor-pointer">
              <Printer className="w-3.5 h-3.5" /> Imprimir
            </button>
            {!locked && (
              <div className="flex flex-wrap items-center gap-2">
                <button type="submit" disabled={saving} className="btn-secondary px-4 py-2 text-xs disabled:opacity-60 cursor-pointer">
                  {saving ? 'Guardando...' : 'Guardar borrador'}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => persist('closed')}
                  className="btn-forest flex items-center gap-1.5 px-5 py-2 text-xs disabled:opacity-60 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#C8ED8F]" /> Cerrar consulta
                </button>
              </div>
            )}
          </div>
        </form>
      )}
    </Modal>
  )
}

