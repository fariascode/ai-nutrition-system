import { useEffect, useState } from 'react'
import { History } from 'lucide-react'
import { getPatients } from '@/features/patients/services/patients.service'
import PatientTimeline from '../components/PatientTimeline'
import ConsultationModal from '@/features/consultations/components/ConsultationModal'
import type { Patient } from '@/types/patient'
import { storageError } from '@/lib/localStorage'

export default function HistoryPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [patientId, setPatientId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [consultOpen, setConsultOpen] = useState(false)
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    getPatients().then(list => {
      if (cancelled) return
      setPatients(list)
      setPatientId(previous => list.some(patient => patient.id === previous) ? previous : list[0]?.id ?? '')
    }).catch(err => { if (!cancelled) setError(storageError(err)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [revision])
  const patient = patients.find(item => item.id === patientId)
  return <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
    <header className="space-y-2">
      <History className="h-6 w-6 text-accent" />
      <h1 className="text-2xl sm:text-3xl font-extrabold">Historial del paciente</h1>
      <p className="text-sm text-muted">Una línea del tiempo para consultar la atención médica y el seguimiento nutricional.</p>
    </header>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    {loading ? <p role="status" className="text-sm text-muted">Cargando pacientes...</p> : !patients.length ? <p className="text-sm text-muted">Registra un paciente para empezar su historial.</p> : <>
      <label className="block text-xs font-bold">Paciente
        <select className="input-wellness mt-1 w-full sm:max-w-md px-3 py-2.5" value={patientId} onChange={e => setPatientId(e.target.value)}>
          {patients.map(item => <option key={item.id} value={item.id}>{item.full_name}</option>)}
        </select>
      </label>
      {patient && <PatientTimeline key={`${patient.id}:${revision}`} patient={patient} onOpenConsultations={() => setConsultOpen(true)} />}
    </>}
    <ConsultationModal open={consultOpen} patientId={patientId || null} onClose={() => setConsultOpen(false)} onSaved={() => setRevision(value => value + 1)} />
  </div>
}
