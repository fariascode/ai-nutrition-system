import { useEffect, useState, type ReactNode } from 'react'
import { calendarDate } from '@/utils/calendarDate'
import { storageError } from '@/lib/localStorage'
import { updateStudyOrder } from '../services/studyOrders.service'
import type { StudyOrderChange } from '../services/studyOrders.service'
import type { StudyOrder } from '@/types/studyOrder'
import type { ClinicalActor } from '@/types/consultation'
import { STUDY_KIND_LABELS, STUDY_STATUS_LABELS } from '@/types/studyOrder'

const field = 'input-wellness w-full p-2 text-sm'
export default function StudyOrderCard({ order, actor, onUpdated, children, sourceVoided = false, onEditingChange }: {
  order: StudyOrder; actor: ClinicalActor; onUpdated: (order: StudyOrder) => void; children?: ReactNode; sourceVoided?: boolean; onEditingChange?: (id: string, editing: boolean) => void
}) {
  const [action, setAction] = useState<StudyOrderChange['action'] | null>(null)
  const [studyDate, setStudyDate] = useState(calendarDate(new Date().toISOString()))
  const [date, setDate] = useState(calendarDate(new Date().toISOString()))
  const [facility, setFacility] = useState('')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    onEditingChange?.(order.id, action !== null)
    const beforeUnload = (event: BeforeUnloadEvent) => { if (action) { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('beforeunload', beforeUnload)
    return () => { onEditingChange?.(order.id, false); window.removeEventListener('beforeunload', beforeUnload) }
  }, [action, order.id, onEditingChange])

  async function save() {
    if (!action || busy) return
    const change: StudyOrderChange = action === 'received' ? { action, results: { study_date: studyDate, received_date: date, facility, text } } : action === 'reviewed' ? { action, date, notes: text } : { action, reason: text }
    setBusy(true); setError('')
    try {
      const updated = await updateStudyOrder(order.id, order.events.length, change, actor)
      setAction(null); setText(''); onUpdated(updated)
    } catch (err) { setError(storageError(err)) }
    finally { setBusy(false) }
  }

  return <article className="bento-card p-4 space-y-3 min-w-0 break-words">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div><h3 className="font-bold text-sm">{order.patient.full_name}</h3><p className="text-xs text-muted">Solicitud: {order.requested_date}</p></div>
      <span className="rounded-lg px-2 py-1 text-xs font-bold bg-subtle border border-line">{STUDY_STATUS_LABELS[order.status]}</span>
    </div>
    {sourceVoided && <p className="text-xs text-danger">La consulta está anulada; esta orden no tiene vigencia.</p>}
    <ul className="space-y-1 text-sm">{order.studies.map(study => <li key={study.id}><strong>{study.name}</strong> <span className="text-xs text-muted">· {STUDY_KIND_LABELS[study.kind]}</span>{study.preparation && <p className="whitespace-pre-wrap text-xs text-muted">Preparación: {study.preparation}</p>}</li>)}</ul>
    <p className="text-sm whitespace-pre-wrap">Motivo: {order.reason}</p>
    {order.results && <details className="text-sm"><summary className="cursor-pointer font-bold min-h-11 py-2">Resultados recibidos</summary><p className="text-xs text-muted">Estudio: {order.results.study_date} · Recepción: {order.results.received_date}{order.results.facility ? ` · ${order.results.facility}` : ''}</p><p className="whitespace-pre-wrap mt-2">{order.results.text}</p></details>}
    {order.review && <div className="text-sm"><p className="font-bold">Revisión profesional: {order.review.date}</p><p className="whitespace-pre-wrap">{order.review.notes}</p></div>}
    {order.cancellation_reason && <p className="text-sm text-danger whitespace-pre-wrap">Cancelación: {order.cancellation_reason}</p>}
    <div className="flex flex-wrap gap-2">
      {children}
      {!sourceVoided && order.status === 'requested' && <button type="button" disabled={busy} onClick={() => { setAction('received'); setText(''); setError('') }} className="btn-secondary min-h-11 px-3 py-2 text-xs">Registrar recepción</button>}
      {!sourceVoided && order.status === 'received' && <button type="button" disabled={busy} onClick={() => { setAction('reviewed'); setText(''); setError('') }} className="btn-secondary min-h-11 px-3 py-2 text-xs">Registrar revisión</button>}
      {order.status !== 'cancelled' && <button type="button" disabled={busy} onClick={() => { setAction('cancelled'); setText(''); setError('') }} className="min-h-11 px-3 py-2 text-xs text-danger">Cancelar orden</button>}
    </div>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    {action && <form onSubmit={e => { e.preventDefault(); save() }} className="border-t border-line pt-3 space-y-3">
      <h4 className="text-sm font-bold">{action === 'received' ? 'Recepción de resultados' : action === 'reviewed' ? 'Revisión de resultados' : 'Cancelar y conservar historial'}</h4>
      {action !== 'cancelled' && <label className="block text-xs font-bold">{action === 'received' ? 'Fecha de recepción' : 'Fecha de revisión'}<input type="date" required value={date} max={calendarDate(new Date().toISOString())} min={action === 'received' ? order.requested_date : order.results?.received_date} className={field} onChange={e => setDate(e.target.value)} /></label>}
      {action === 'received' && <>
        <label className="block text-xs font-bold">Fecha del estudio<input type="date" required value={studyDate} min={order.requested_date} max={date} className={field} onChange={e => setStudyDate(e.target.value)} /></label>
        <label className="block text-xs font-bold">Laboratorio o centro (opcional)<input value={facility} className={field} onChange={e => setFacility(e.target.value)} /></label>
        <p className="text-xs text-muted">Transcribe el informe o su resumen, con sus unidades y contexto. Esta captura no extrae archivos ni modifica automáticamente los biomarcadores o diagnósticos del paciente. Los resultados recibidos se conservarán sin sobrescribir.</p>
      </>}
      <label className="block text-xs font-bold">{action === 'received' ? 'Resultados o resumen del informe' : action === 'reviewed' ? 'Nota de revisión profesional' : 'Motivo de cancelación'}<textarea required rows={4} value={text} className={field} onChange={e => setText(e.target.value)} /></label>
      <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} className="btn-secondary min-h-11 px-3 py-2" onClick={() => { if (text.trim() && !confirm('¿Descartar el texto sin guardar?')) return; setAction(null); setError('') }}>Volver sin guardar</button><button type="submit" disabled={busy} className="btn-forest min-h-11 px-3 py-2">{busy ? 'Guardando…' : action === 'received' ? 'Guardar recepción' : action === 'reviewed' ? 'Guardar revisión' : 'Confirmar cancelación'}</button></div>
    </form>}
    <details className="text-xs text-muted"><summary className="cursor-pointer min-h-11 py-2 font-bold">Historial de la orden</summary><ol className="space-y-2">{order.events.map((event, index) => <li key={`${event.at}:${index}`}><time>{new Date(event.at).toLocaleString('es-MX')}</time> · {STUDY_STATUS_LABELS[event.action]} · {event.actor.label}<p className="whitespace-pre-wrap">{event.notes}</p></li>)}</ol></details>
  </article>
}
