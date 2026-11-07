import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { STUDY_STATUS_LABELS } from '@/types/studyOrder'
import type { Patient, LabBiomarkers } from '@/types/patient'
import { getPatientTimeline, type PatientTimelineEvent } from '../services/patientTimeline.service'
import { DiagnosisSummary } from '@/features/consultations/components/DiagnosisEditor'
import { TreatmentSummary } from '@/features/consultations/components/TreatmentEditor'
import { storageError } from '@/lib/localStorage'

const LABELS = { consultation: 'Consulta médica', measurement: 'Medición', plan: 'Nutrición', laboratory: 'Laboratorio', soap: 'Nota SOAP', study_order: 'Órdenes de estudios' }
const LAB_LABELS: Record<keyof LabBiomarkers, string> = {
  fasting_glucose: 'Glucosa en ayuno (mg/dL)', fasting_insulin: 'Insulina (µU/mL)', hba1c: 'HbA1c (%)',
  systolic_bp: 'Presión sistólica (mmHg)', diastolic_bp: 'Presión diastólica (mmHg)', cholesterol_total: 'Colesterol total (mg/dL)',
  ldl_cholesterol: 'LDL (mg/dL)', hdl_cholesterol: 'HDL (mg/dL)', triglycerides: 'Triglicéridos (mg/dL)',
  uric_acid: 'Ácido úrico (mg/dL)', creatinine: 'Creatinina (mg/dL)', tsh: 'TSH (mUI/L)',
  vitamin_d: 'Vitamina D (ng/mL)', ferritin: 'Ferritina (ng/mL)', last_lab_date: 'Fecha del estudio',
}
const CONSULTATION_STATUS = { draft: 'Borrador', closed: 'Cerrada', voided: 'Anulada' }

export default function PatientTimeline({ patient, onOpenConsultations }: { patient: Patient; onOpenConsultations?: () => void }) {
  const [events, setEvents] = useState<PatientTimelineEvent[]>([])
  const [filter, setFilter] = useState<'all' | PatientTimelineEvent['kind']>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    getPatientTimeline(patient).then(value => { if (!cancelled) setEvents(value) })
      .catch(err => { if (!cancelled) setError(storageError(err)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [patient, retry])
  const visible = events.filter(event => filter === 'all' || event.kind === filter)
  return <section aria-label={`Historial unificado de ${patient.full_name}`} className="space-y-4 min-w-0">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h3 className="text-base font-extrabold">Historial unificado</h3><p className="text-xs text-muted">Consultas, diagnósticos, tratamientos, mediciones y planes, del más reciente al más antiguo.</p></div>
      <div className="flex flex-wrap gap-2"><button type="button" className="btn-secondary px-3 py-2 text-xs" onClick={() => setRetry(value => value + 1)}>Actualizar historial</button>{onOpenConsultations && <button type="button" className="btn-secondary px-3 py-2 text-xs" onClick={onOpenConsultations}>Abrir consultas</button>}</div>
    </div>
    <label className="block text-xs font-bold">Filtrar eventos
      <select className="input-wellness mt-1 w-full px-3 py-2 sm:max-w-xs" value={filter} onChange={e => setFilter(e.target.value as typeof filter)}>
        <option value="all">Todos los eventos</option>
        {Object.entries(LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </label>
    {loading ? <p role="status" className="text-sm text-muted">Cargando historial...</p> : error ? <div role="alert" className="text-sm text-danger"><p>{error}</p><button className="btn-secondary px-3 py-2 mt-2" onClick={() => setRetry(value => value + 1)}>Reintentar</button></div> : !visible.length ? <p className="text-sm text-muted">No hay eventos registrados para este filtro.</p> :
      <ol className="space-y-3 border-l-2 border-accent-line pl-3 sm:pl-5">
        {visible.map(event => <li key={event.id} className="bento-card p-4 space-y-2 min-w-0 break-words">
          <div className="flex flex-wrap gap-2 text-xs"><time dateTime={event.date}>{event.date.slice(0, 10)}</time><strong className="text-accent">{LABELS[event.kind]}</strong></div>
          <h4 className="text-sm font-bold">{event.title}</h4>
          {event.kind === 'consultation' && <>
            <p className="text-xs text-muted">{CONSULTATION_STATUS[event.data.status]}</p>
            <DiagnosisSummary items={event.data.diagnoses} />
            <details className="text-xs space-y-2"><summary className="font-bold cursor-pointer">Ver evaluación, tratamiento e indicaciones</summary>
              {event.data.assessment && <p className="whitespace-pre-wrap mt-2">{event.data.assessment}</p>}
              <TreatmentSummary items={event.data.medications} />
              {event.data.plan && <p className="whitespace-pre-wrap">{event.data.plan}</p>}
              {event.data.vitals.weight_kg && <p>Peso: {event.data.vitals.weight_kg} kg</p>}
              {event.data.vitals.systolic_bp && <p>Presión: {event.data.vitals.systolic_bp}/{event.data.vitals.diastolic_bp ?? '—'} mmHg</p>}
              {event.data.vitals.glucose && <p>Glucosa capilar: {event.data.vitals.glucose} mg/dL · {{ unknown: 'No especificado', fasting: 'Ayuno confirmado', random: 'Casual', postprandial: 'Posprandial' }[event.data.glucose_context ?? 'unknown']}</p>}
              {event.data.follow_up_date && <p>Seguimiento: {event.data.follow_up_date} · {event.data.follow_up_notes}</p>}
            </details>
          </>}
          {event.kind === 'measurement' && <div className="text-xs"><p>Peso: {event.data.weight_kg} kg</p>{event.data.body_fat_pct !== undefined && <p>Grasa: {event.data.body_fat_pct}%</p>}{event.data.muscle_mass_kg !== undefined && <p>Masa muscular: {event.data.muscle_mass_kg} kg</p>}{event.data.waist_cm !== undefined && <p>Cintura: {event.data.waist_cm} cm</p>}<p>{event.data.notes}</p></div>}
          {event.kind === 'plan' && <>
            <p className="text-xs text-muted">{{ draft: 'Borrador', published: 'Publicado', archived: 'Archivado' }[event.data.status]}</p>
            <details className="text-xs"><summary className="font-bold cursor-pointer">Ver prescripción</summary><p className="whitespace-pre-wrap mt-2">{event.data.edited_content ?? event.data.ai_generated_content}</p></details>
          </>}
          {event.kind === 'study_order' && <div className="text-xs space-y-2">
            <p>{event.data.studies.map(study => study.name).join(' · ')}</p>
            <p className="text-muted">Estado actual de la orden: {STUDY_STATUS_LABELS[event.data.status]}</p>
            {event.phase === 'requested' && <p className="whitespace-pre-wrap">Motivo: {event.data.reason}</p>}
            {event.phase === 'received' && event.data.results && <details><summary className="cursor-pointer font-bold">Ver informe capturado</summary><p className="mt-2 text-muted">Estudio: {event.data.results.study_date} · Centro: {event.data.results.facility || 'Sin registrar'}</p><p className="whitespace-pre-wrap">{event.data.results.text}</p></details>}
            {event.phase === 'reviewed' && <p className="whitespace-pre-wrap">Revisión profesional: {event.data.review?.notes}</p>}
            {event.phase === 'cancelled' && <p className="whitespace-pre-wrap text-danger">Motivo: {event.data.cancellation_reason}</p>}
            <Link to={`/studies?patient=${encodeURIComponent(patient.id)}`} className="inline-flex items-center min-h-11 font-bold text-accent underline">Abrir órdenes de este paciente</Link>
          </div>}
          {event.kind === 'laboratory' && <details className="text-xs"><summary className="font-bold cursor-pointer">Ver valores registrados</summary>
            <p className="text-muted my-2">Esta ficha conserva el último conjunto de resultados; no incluye versiones anteriores de laboratorio.</p>
            {Object.entries(event.data).map(([key, value]) => <p key={key}>{LAB_LABELS[key as keyof LabBiomarkers]}: {value}</p>)}
          </details>}
          {event.kind === 'soap' && event.data.soap_note && <details className="text-xs"><summary className="font-bold cursor-pointer">Ver nota SOAP</summary>
            <p className="whitespace-pre-wrap mt-2"><strong>Subjetivo:</strong> {event.data.soap_note.subjective}</p>
            <p className="whitespace-pre-wrap"><strong>Objetivo:</strong> {event.data.soap_note.objective}</p>
            <p className="whitespace-pre-wrap"><strong>Análisis:</strong> {event.data.soap_note.analysis}</p>
            <p className="whitespace-pre-wrap"><strong>Plan:</strong> {event.data.soap_note.plan}</p>
          </details>}
        </li>)}
      </ol>}
  </section>
}
