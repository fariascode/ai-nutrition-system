import { useCallback, useEffect, useState } from 'react'
import Modal from '@/components/ui/Modal'
import { storageError } from '@/lib/localStorage'
import { calendarDate } from '@/utils/calendarDate'
import { getProfessionalProfile } from '@/features/consultations/services/patientInstructions.service'
import { createStudyOrder, getStudyOrders, studyOrderContext } from '../services/studyOrders.service'
import { renderStudyOrder } from '../services/studyOrderDocument'
import { STUDY_KIND_LABELS } from '@/types/studyOrder'
import StudyOrderCard from './StudyOrderCard'
import type { StudyOrder, OrderedStudy } from '@/types/studyOrder'
import type { Patient } from '@/types/patient'
import type { Consultation, ClinicalActor } from '@/types/consultation'
import type { ProfessionalProfile } from '@/types/patientInstructions'

const field = 'input-wellness w-full p-2 text-sm'
const profileLabels: Record<keyof ProfessionalProfile, string> = { name: 'Nombre del profesional', registration: 'Cédula / registro', clinic: 'Consultorio', address: 'Dirección', phone: 'Teléfono', email: 'Correo' }
const catalog = ['Biometría hemática', 'Química sanguínea', 'Perfil de lípidos', 'Hemoglobina glucosilada', 'Examen general de orina', 'Radiografía', 'Ultrasonido']
const blankStudy = (): OrderedStudy => ({ id: crypto.randomUUID(), kind: 'laboratory', name: '', preparation: '' })

export default function StudyOrdersModal({ patient, consultation, actor, onClose, onSaved }: {
  patient: Patient; consultation: Consultation; actor: ClinicalActor; onClose: () => void; onSaved?: () => void
}) {
  const [orders, setOrders] = useState<StudyOrder[]>([])
  const [creating, setCreating] = useState(false)
  const [studies, setStudies] = useState<OrderedStudy[]>(() => [blankStudy()])
  const [reason, setReason] = useState('')
  const [date, setDate] = useState(calendarDate(new Date().toISOString()))
  const [professional, setProfessional] = useState<ProfessionalProfile>({ name: '', registration: '', clinic: '', address: '', phone: '', email: '' })
  const [preview, setPreview] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Record<string, boolean>>({})
  const trackingDirty = Object.values(editing).some(Boolean)
  const trackEditing = useCallback((id: string, value: boolean) => setEditing(previous => previous[id] === value ? previous : { ...previous, [id]: value }), [])

  useEffect(() => {
    try {
      setOrders(getStudyOrders(actor.id).filter(order => order.consultation_id === consultation.id && order.patient_id === patient.id))
      setProfessional(getProfessionalProfile(actor.id))
    } catch (err) { setError(storageError(err)) }
  }, [actor.id, consultation.id, patient.id])

  function close() {
    if (busy || ((creating || trackingDirty) && !confirm('¿Descartar los cambios sin guardar?'))) return
    onClose()
  }
  async function save() {
    if (busy) return
    setBusy(true); setError('')
    try {
      await createStudyOrder({ patient_id: patient.id, consultation_id: consultation.id, professional, requested_date: date, reason, studies }, actor)
      setOrders(getStudyOrders(actor.id).filter(order => order.consultation_id === consultation.id && order.patient_id === patient.id))
      setCreating(false); setReason(''); setStudies([blankStudy()]); onSaved?.()
    } catch (err) { setError(storageError(err)) }
    finally { setBusy(false) }
  }
  async function documentFor(order: StudyOrder, print = false) {
    setError('')
    // Abrir durante el gesto del usuario evita bloqueos de ventanas tras esperar contexto.
    const win = print ? window.open('', '_blank') : null
    if (print && !win) { setError('Permite ventanas emergentes para imprimir o guardar PDF.'); return }
    try {
      const current = getStudyOrders(actor.id).find(item => item.id === order.id)
      if (!current) throw new Error('La orden ya no está disponible. Vuelve a abrir los estudios.')
      const context = await studyOrderContext(current.patient_id, current.consultation_id, actor.id)
      const html = renderStudyOrder(current, context.consultation.status)
      if (win) { win.document.write(html); win.document.close(); win.focus(); win.print() }
      else setPreview(html)
    } catch (err) { win?.close(); setError(storageError(err)) }
  }

  return <Modal open title={`Órdenes de estudios — ${patient.full_name}`} subtitle={`Consulta del ${consultation.date} · ${consultation.chief_complaint}`} size="4xl" onClose={close}>
    <div className="space-y-4">
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {consultation.status !== 'closed' && <p className="text-sm text-warning">{consultation.status === 'voided' ? 'Consulta anulada: conserva sus órdenes como historial, sin vigencia.' : 'La consulta está en borrador. El documento se identificará como borrador hasta cerrar la consulta.'}</p>}
      {!creating && <>
        <button type="button" className="btn-secondary min-h-11 px-3 py-2 text-xs" onClick={() => { try { setOrders(getStudyOrders(actor.id).filter(order => order.consultation_id === consultation.id && order.patient_id === patient.id)); setError('') } catch (err) { setError(storageError(err)) } }}>Actualizar órdenes</button>
        <button type="button" disabled={consultation.status === 'voided' || trackingDirty} className="btn-forest px-4 py-2 min-h-11" onClick={() => { setPreview(''); setCreating(true) }}>Nueva orden de estudios</button>
        {!orders.length && <p className="text-sm text-muted">Esta consulta no tiene órdenes registradas.</p>}
        {orders.map(order => <StudyOrderCard key={order.id} order={order} actor={actor} onEditingChange={trackEditing} sourceVoided={consultation.status === 'voided'} onUpdated={updated => { setOrders(items => items.map(item => item.id === updated.id ? updated : item)); setPreview(''); onSaved?.() }}>
          <button type="button" className="btn-secondary min-h-11 px-3 py-2 text-xs" onClick={() => documentFor(order)}>Vista previa</button><button type="button" className="btn-secondary min-h-11 px-3 py-2 text-xs" onClick={() => documentFor(order, true)}>Imprimir / Guardar PDF</button>
        </StudyOrderCard>)}
      </>}
      {creating && <form onSubmit={e => { e.preventDefault(); save() }} className="space-y-4">
        <label className="block text-xs font-bold">Fecha de solicitud<input type="date" required min={consultation.date} value={date} onChange={e => setDate(e.target.value)} className={field} /></label>
        <label className="block text-xs font-bold">Motivo de la solicitud<textarea required value={reason} onChange={e => setReason(e.target.value)} className={field} rows={3} /></label>
        <p className="text-xs text-muted">Selecciona o escribe los estudios que consideres necesarios. El catálogo es una lista de nombres; no sugiere qué solicitar ni completa la preparación.</p>
        <datalist id="study-catalog">{catalog.map(name => <option key={name} value={name} />)}</datalist>
        {studies.map((study, index) => <fieldset key={study.id} className="border border-line rounded-xl p-3 space-y-2 min-w-0">
          <legend className="text-xs font-bold">Estudio {index + 1}</legend>
          <div className="grid sm:grid-cols-2 gap-2">
            <label className="text-xs font-bold">Tipo<select value={study.kind} className={field} onChange={e => setStudies(list => list.map(item => item.id === study.id ? { ...item, kind: e.target.value as OrderedStudy['kind'] } : item))}>{Object.entries(STUDY_KIND_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="text-xs font-bold">Nombre del estudio<input required list="study-catalog" value={study.name} className={field} onChange={e => setStudies(list => list.map(item => item.id === study.id ? { ...item, name: e.target.value } : item))} /></label>
          </div>
          <label className="block text-xs font-bold">Preparación indicada por el profesional (opcional)<textarea value={study.preparation} rows={2} className={field} onChange={e => setStudies(list => list.map(item => item.id === study.id ? { ...item, preparation: e.target.value } : item))} /></label>
          <button type="button" className="text-xs text-danger min-h-11" disabled={studies.length === 1} onClick={() => setStudies(list => list.filter(item => item.id !== study.id))}>Quitar estudio {index + 1}</button>
        </fieldset>)}
        <button type="button" className="btn-secondary min-h-11 px-3 py-2 text-xs" onClick={() => setStudies(list => [...list, blankStudy()])}>Agregar estudio</button>
        <fieldset className="grid sm:grid-cols-2 gap-3"><legend className="font-bold text-sm mb-2">Datos del profesional para esta orden</legend>{(Object.keys(profileLabels) as (keyof ProfessionalProfile)[]).map(key => <label key={key} className="text-xs font-bold">{profileLabels[key]}<input required={key === 'name'} value={professional[key]} className={field} onChange={e => setProfessional(p => ({ ...p, [key]: e.target.value }))} /></label>)}</fieldset>
        <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} className="btn-secondary min-h-11 px-4 py-2" onClick={() => { if (confirm('¿Descartar la solicitud sin guardar?')) setCreating(false) }}>Descartar solicitud</button><button type="submit" disabled={busy} className="btn-forest min-h-11 px-4 py-2">{busy ? 'Guardando…' : 'Guardar orden'}</button></div>
      </form>}
      {preview && <section className="space-y-2"><h3 className="text-sm font-bold">Vista previa de solicitud</h3><iframe title="Documento de orden de estudios" sandbox="" srcDoc={preview} className="w-full h-[32rem] rounded-xl border border-line bg-white" /></section>}
    </div>
  </Modal>
}
