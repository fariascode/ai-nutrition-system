import { useEffect, useState, type FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText, Activity, ClipboardCheck } from 'lucide-react'
import { ThemeToggle } from '@/context/ThemeContext'
import { getPatientPortalData, portalPatient } from '../services/patientPortal.service'
import { addWeightCheckin } from '@/features/patients/services/patients.service'
import { DiagnosisSummary } from '@/features/consultations/components/DiagnosisEditor'
import { TreatmentSummary } from '@/features/consultations/components/TreatmentEditor'
import { storageError } from '@/lib/localStorage'
import { calendarDate } from '@/utils/calendarDate'

type PortalData = NonNullable<Awaited<ReturnType<typeof getPatientPortalData>>>
type PortalTab = 'plan' | 'instructions' | 'progress'

export default function PatientPortalPage() {
  const { planId, patientId } = useParams<{ planId: string; patientId: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<PortalTab>('plan')
  const [weight, setWeight] = useState('')
  const [waist, setWaist] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let cancelled = false
    let request = 0
    setLoading(true)
    setData(null)
    setNotice('')
    setTab('plan')
    async function load() {
      const currentRequest = ++request
      setLoading(true)
      try {
        const next = await getPatientPortalData({ planId, patientId })
        if (cancelled || currentRequest !== request) return
        setData(next)
        setError('')
      } catch (err) {
        if (!cancelled && currentRequest === request) { setData(null); setError(storageError(err)) }
      } finally { if (!cancelled && currentRequest === request) setLoading(false) }
    }
    load()
    const refresh = () => { void load() }
    const storageRefresh = (event: StorageEvent) => {
      if (event.key === null || ['nutriai_consultations_v1', 'nutriai_patient_instructions_v1', 'nutriai_demo_plans_v2', 'nutriai_demo_patients_v2'].includes(event.key)) refresh()
    }
    window.addEventListener('focus', refresh)
    window.addEventListener('storage', storageRefresh)
    return () => { cancelled = true; window.removeEventListener('focus', refresh); window.removeEventListener('storage', storageRefresh) }
  }, [planId, patientId])

  async function reportWeight(event: FormEvent) {
    event.preventDefault()
    if (!data || saving) return
    const nextWeight = Number(weight)
    const nextWaist = waist.trim() ? Number(waist) : undefined
    if (!weight.trim() || !Number.isFinite(nextWeight) || nextWeight <= 0 || (nextWaist !== undefined && (!Number.isFinite(nextWaist) || nextWaist <= 0))) {
      setError('Captura mediciones positivas y válidas.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const date = new Date()
      const localDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      const updated = await addWeightCheckin(data.patient.id, { date: localDate, weight_kg: nextWeight, waist_cm: nextWaist, notes: notes.trim() ? `Reporte del paciente: ${notes.trim()}` : 'Reporte del paciente' })
      setData({ ...data, patient: portalPatient(updated) })
      setNotice('Medición guardada en el seguimiento del paciente.')
      setWeight(''); setWaist(''); setNotes('')
    } catch (err) { setError(storageError(err)) }
    finally { setSaving(false) }
  }

  if (loading) return <div role="status" className="min-h-screen grid place-items-center bg-canvas text-content">Cargando contenido aprobado...</div>
  if (!data) return <div className="min-h-screen bg-canvas text-content grid place-items-center p-6">
    <div className="max-w-md space-y-3 text-center"><h1 className="text-xl font-bold">Contenido no disponible</h1>
      <p className="text-sm text-muted">El plan debe estar publicado o las indicaciones aprobadas por el profesional. Verifica el enlace con el consultorio.</p>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <button className="btn-secondary px-4 py-2" onClick={() => navigate('/login')}>Ir al acceso del consultorio</button>
    </div>
  </div>

  return <div className="min-h-screen bg-canvas text-content pb-28">
    <header className="liquid-glass sticky top-0 z-30 flex items-center justify-between gap-2 px-4 py-3 border-b border-line">
      <button className="flex items-center gap-1 text-xs text-accent font-bold" onClick={() => navigate('/dashboard')}><ArrowLeft className="h-4 w-4" /> Consultorio</button>
      <span className="text-xs font-bold">Portal del paciente</span><ThemeToggle compact />
    </header>
    <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4">
      <section className="rounded-3xl bg-[#245C47] text-white p-5 space-y-2">
        <h1 className="text-xl font-extrabold break-words">{data.patient.full_name}</h1>
        <p className="text-sm text-[#DCE7E1]">Tu prescripción publicada y las indicaciones que aprobó tu profesional.</p>
      </section>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {notice && <p role="status" className="text-sm text-accent">{notice}</p>}
      {tab === 'plan' && <section className="bento-card p-5 space-y-3">
        <h2 className="font-extrabold text-lg">Plan nutricional publicado</h2>
        {data.plan && data.content !== null ? <>
          <p className="text-xs text-muted">Actualizado: {calendarDate(data.plan.updated_at)}{data.plan.valid_from ? ` · Desde ${calendarDate(data.plan.valid_from)}` : ''}{data.plan.valid_until ? ` · Hasta ${calendarDate(data.plan.valid_until)}` : ''}</p>
          <div className="whitespace-pre-wrap break-words text-sm leading-relaxed" data-testid="published-prescription">{data.content}</div>
        </> : <p className="text-sm text-muted">No hay un plan nutricional publicado. Consulta tus indicaciones en la pestaña correspondiente.</p>}
      </section>}
      {tab === 'instructions' && <section className="space-y-4">
        <h2 className="text-lg font-extrabold">Indicaciones aprobadas</h2>
        {!data.instructions.length && <p className="bento-card p-5 text-sm text-muted">Tu profesional todavía no ha aprobado indicaciones de consulta para este portal.</p>}
        {data.instructions.map(approval => <article key={approval.consultation_id} className="bento-card p-5 space-y-3">
          <h3 className="text-sm font-extrabold">Consulta del {approval.source.date}</h3>
          <p className="text-xs text-muted">{approval.professional.name}{approval.professional.registration ? ` · Registro: ${approval.professional.registration}` : ''} · Aprobadas el {calendarDate(approval.approved_at)}</p>
          <DiagnosisSummary items={approval.source.diagnoses} />
          <TreatmentSummary items={approval.source.medications} />
          {approval.source.plan && <div><h4 className="text-sm font-bold">Indicaciones generales</h4><p className="whitespace-pre-wrap break-words text-sm">{approval.source.plan}</p></div>}
          {approval.source.follow_up_date && <p className="text-sm">Fecha indicada de seguimiento: {approval.source.follow_up_date}</p>}
          {approval.source.follow_up_notes && <p className="whitespace-pre-wrap text-sm">{approval.source.follow_up_notes}</p>}
        </article>)}
      </section>}
      {tab === 'progress' && <section className="space-y-4">
        <form className="bento-card p-5 space-y-3" onSubmit={reportWeight}>
          <h2 className="font-extrabold text-lg">Registrar mediciones</h2>
          <fieldset disabled={saving} className="grid gap-3 sm:grid-cols-2 min-w-0">
            <label className="text-xs font-bold">Peso (kg)<input type="number" min="0.1" step="0.1" required className="input-wellness w-full px-3 py-2 mt-1" value={weight} onChange={e => setWeight(e.target.value)} /></label>
            <label className="text-xs font-bold">Cintura (cm, opcional)<input type="number" min="0.1" step="0.1" className="input-wellness w-full px-3 py-2 mt-1" value={waist} onChange={e => setWaist(e.target.value)} /></label>
            <label className="text-xs font-bold sm:col-span-2">Observaciones (opcional)<textarea className="input-wellness w-full px-3 py-2 mt-1" value={notes} onChange={e => setNotes(e.target.value)} /></label>
          </fieldset>
          <button disabled={saving} className="btn-forest px-4 py-2 w-full disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar medición'}</button>
        </form>
        <div className="bento-card p-5 space-y-3"><h3 className="font-bold">Tus controles registrados</h3>
          {!(data.patient.weight_history ?? []).length && <p className="text-sm text-muted">Aún no hay controles registrados.</p>}
          {[...(data.patient.weight_history ?? [])].sort((a, b) => b.date.localeCompare(a.date)).map((record, index) => <div key={index} className="text-sm border-b border-line pb-2"><p>{record.date} · {record.weight_kg} kg{record.waist_cm ? ` · Cintura ${record.waist_cm} cm` : ''}</p></div>)}
        </div>
      </section>}
    </main>
    <nav aria-label="Navegación del portal del paciente" className="fixed bottom-0 inset-x-0 z-40 px-3 pb-safe">
      <div className="liquid-glass-nav max-w-2xl mx-auto rounded-2xl flex justify-around gap-1 p-2">
        {([{ id: 'plan', label: 'Mi plan', icon: FileText }, { id: 'instructions', label: 'Indicaciones', icon: ClipboardCheck }, { id: 'progress', label: 'Progreso', icon: Activity }] as const).map(item => <button key={item.id} type="button" aria-pressed={tab === item.id} onClick={() => setTab(item.id)} className={`min-w-0 flex-1 flex flex-col items-center gap-1 px-2 py-2 rounded-xl text-xs font-bold ${tab === item.id ? 'bg-[#245C47] text-white' : 'text-muted'}`}><item.icon className="h-4 w-4" />{item.label}</button>)}
      </div>
    </nav>
  </div>
}
