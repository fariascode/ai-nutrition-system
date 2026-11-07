import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/context/AuthContext'
import { getPatients } from '@/features/patients/services/patients.service'
import { isDemo } from '@/lib/mockData'
import { storageError } from '@/lib/localStorage'
import ConsultationModal from '@/features/consultations/components/ConsultationModal'
import StudyOrdersModal from '../components/StudyOrdersModal'
import StudyOrderCard from '../components/StudyOrderCard'
import { getStudyOrders, studyOrderContext, STUDY_ORDERS_KEY } from '../services/studyOrders.service'
import type { StudyOrder, StudyOrderStatus } from '@/types/studyOrder'
import { STUDY_STATUS_LABELS } from '@/types/studyOrder'
import type { Patient } from '@/types/patient'
import type { Consultation } from '@/types/consultation'

export default function StudyOrdersPage() {
  const { user } = useAuth()
  const [search] = useSearchParams()
  const [patients, setPatients] = useState<Patient[]>([])
  const [orders, setOrders] = useState<StudyOrder[]>([])
  const [patientId, setPatientId] = useState(search.get('patient') ?? 'all')
  const [status, setStatus] = useState<'all' | StudyOrderStatus>('all')
  const [revision, setRevision] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [consultOpen, setConsultOpen] = useState(false)
  const [context, setContext] = useState<{ patient: Patient; consultation: Consultation } | null>(null)
  const actor = { id: user?.id ?? 'local', label: user?.email ?? 'Usuario local' }
  useEffect(() => {
    if (!isDemo || !user) { setLoading(false); return }
    let active = true
    setLoading(true); setError('')
    getPatients().then(list => {
      if (!active) return
      setPatients(list.filter(patient => patient.doctor_id === user.id))
      setOrders(getStudyOrders(user.id))
    }).catch(err => { if (active) setError(storageError(err)) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [user, revision])
  useEffect(() => {
    const refresh = () => setRevision(value => value + 1)
    const storage = (event: StorageEvent) => { if (!event.key || [STUDY_ORDERS_KEY, 'nutriai_consultations_v1', 'nutriai_demo_patients_v2'].includes(event.key)) refresh() }
    window.addEventListener('focus', refresh); window.addEventListener('storage', storage)
    return () => { window.removeEventListener('focus', refresh); window.removeEventListener('storage', storage) }
  }, [])
  const visible = orders.filter(order => (patientId === 'all' || order.patient_id === patientId) && (status === 'all' || order.status === status))
  async function openOrder(order: StudyOrder) {
    try { setContext(await studyOrderContext(order.patient_id, order.consultation_id, actor.id)); setError('') }
    catch (err) { setError(storageError(err)) }
  }
  return <div className="max-w-6xl mx-auto p-4 sm:p-8 space-y-5">
    <header><h1 className="text-2xl font-extrabold">Órdenes y seguimiento de estudios</h1><p className="text-sm text-muted mt-2">Solicitudes vinculadas a consultas, recepción de resultados y revisión profesional. Información local de este navegador.</p></header>
    {!isDemo ? <p className="text-sm text-muted">Disponible por ahora en modo demo local.</p> : <>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="text-xs font-bold">Paciente<select className="input-wellness w-full p-2 min-h-11" value={patientId} onChange={e => setPatientId(e.target.value)}><option value="all">Todos los pacientes</option>{patients.map(patient => <option key={patient.id} value={patient.id}>{patient.full_name}</option>)}</select></label>
        <label className="text-xs font-bold">Estado<select className="input-wellness w-full p-2 min-h-11" value={status} onChange={e => setStatus(e.target.value as typeof status)}><option value="all">Todos los estados</option>{Object.entries(STUDY_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>
      <div className="flex flex-wrap gap-2"><button type="button" className="btn-secondary min-h-11 px-4 py-2" disabled={loading} onClick={() => setRevision(value => value + 1)}>Actualizar lista</button><button type="button" className="btn-forest min-h-11 px-4 py-2 disabled:opacity-50" disabled={!patients.some(p => p.id === patientId)} onClick={() => setConsultOpen(true)}>Abrir consultas para solicitar estudios</button></div>
      {patientId === 'all' && <p className="text-xs text-muted">Selecciona un paciente para crear una orden desde una consulta guardada.</p>}
      {loading ? <p role="status" className="text-sm text-muted">Cargando estudios…</p> : !visible.length ? <p className="text-sm text-muted">No hay órdenes para estos filtros.</p> : <div className="space-y-3">{visible.map(order => <StudyOrderCard key={order.id} order={order} actor={actor} onUpdated={updated => setOrders(items => items.map(item => item.id === updated.id ? updated : item))}><button type="button" className="btn-secondary min-h-11 px-3 py-2 text-xs" onClick={() => openOrder(order)}>Solicitud y documento</button></StudyOrderCard>)}</div>}
      <ConsultationModal open={consultOpen} patientId={patientId === 'all' ? null : patientId} onClose={() => { setConsultOpen(false); setRevision(value => value + 1) }} onSaved={() => setRevision(value => value + 1)} />
      {context && <StudyOrdersModal key={context.consultation.id} {...context} actor={actor} onClose={() => { setContext(null); setRevision(value => value + 1) }} onSaved={() => setRevision(value => value + 1)} />}
    </>}
  </div>
}
