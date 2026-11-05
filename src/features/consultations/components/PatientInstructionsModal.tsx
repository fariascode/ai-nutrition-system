import { useEffect, useState } from 'react'
import Modal from '@/components/ui/Modal'
import type { Patient } from '@/types/patient'
import type { InstructionsSource, ProfessionalProfile } from '@/types/patientInstructions'
import { getProfessionalProfile, renderPatientInstructions, saveProfessionalProfile, approvePatientInstructions, getApprovedPatientInstructions, revokePatientInstructions } from '../services/patientInstructions.service'
import { storageError } from '@/lib/localStorage'

interface Props {
  source: InstructionsSource
  patient: Patient
  actorId: string
  defaults: Partial<ProfessionalProfile>
  onClose: () => void
}

export default function PatientInstructionsModal({ source, patient, actorId, defaults, onClose }: Props) {
  const [error, setError] = useState('')
  const [approved, setApproved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [profile, setProfile] = useState<ProfessionalProfile>(() => {
    try { return getProfessionalProfile(actorId, defaults) }
    catch { return { name: '', registration: '', clinic: '', address: '', phone: '', email: '', ...defaults } }
  })
  const fields: { key: keyof ProfessionalProfile; label: string }[] = [
    { key: 'name', label: 'Nombre del profesional' }, { key: 'registration', label: 'Cédula / registro profesional' },
    { key: 'clinic', label: 'Consultorio' }, { key: 'address', label: 'Dirección del consultorio' },
    { key: 'phone', label: 'Teléfono del consultorio' }, { key: 'email', label: 'Correo profesional' },
  ]
  const html = renderPatientInstructions(source, patient, profile)
  useEffect(() => {
    let cancelled = false
    const refresh = () => {
      getApprovedPatientInstructions(patient.id, actorId).then(items => { if (!cancelled) setApproved(items.some(item => item.consultation_id === source.id)) })
        .catch(err => { if (!cancelled) setError(storageError(err)) })
    }
    const changed = (event: StorageEvent) => { if (event.key === null || ['nutriai_consultations_v1', 'nutriai_patient_instructions_v1'].includes(event.key)) refresh() }
    refresh()
    window.addEventListener('focus', refresh)
    window.addEventListener('storage', changed)
    return () => { cancelled = true; window.removeEventListener('focus', refresh); window.removeEventListener('storage', changed) }
  }, [source.id, patient.id, actorId])

  async function approve() {
    if (!source.id || source.status !== 'closed' || busy) return
    setBusy(true)
    setError('')
    try {
      const normalized = saveProfessionalProfile(actorId, profile)
      await approvePatientInstructions(source.id, patient, normalized, { id: actorId, label: normalized.name }, source)
      setApproved(true)
      setNotice('Indicaciones aprobadas para el portal del paciente.')
    } catch (err) { setError(storageError(err)) }
    finally { setBusy(false) }
  }

  async function copyPortalLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/portal/patient/${patient.id}`)
      setNotice('Enlace del portal copiado. En demostración, los datos se conservan en este navegador.')
    } catch { setError('No se pudo copiar el enlace. Revisa el permiso del portapapeles.') }
  }

  function print() {
    setError('')
    if (source.status === 'voided') { setError('Esta consulta está anulada.'); return }
    if (!profile.name.trim()) { setError('Captura el nombre del profesional antes de imprimir.'); return }
    // Se abre dentro del gesto del usuario para evitar el bloqueo de ventanas emergentes.
    const win = window.open('', '_blank')
    if (!win) { setError('Permite las ventanas emergentes para imprimir o guardar como PDF.'); return }
    try {
      saveProfessionalProfile(actorId, profile)
      win.addEventListener('load', () => { win.focus(); win.print() }, { once: true })
      win.document.write(html)
      win.document.close()
    } catch (err) { win.close(); setError(storageError(err)) }
  }

  return <Modal open title={`Indicaciones para ${patient.full_name}`} subtitle="Revisa el contenido y los datos del profesional antes de imprimir o guardar como PDF." size="4xl" onClose={onClose}>
    <div className="space-y-4">
      {source.status !== 'closed' && <p role="status" className="p-3 rounded-xl bg-warning-soft text-warning text-sm">{source.status === 'voided' ? 'Consulta anulada.' : 'Esta vista es un borrador. Cierra la consulta para finalizar las indicaciones.'}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map(field => <label key={field.key} className="text-xs font-bold space-y-1">{field.label}{field.key !== 'name' && ' (opcional)'}
          <input className="input-wellness w-full px-3 py-2 text-sm" value={profile[field.key]} onChange={e => setProfile({ ...profile, [field.key]: e.target.value })} />
        </label>)}
      </div>
      <iframe title="Vista previa de las indicaciones" sandbox="" srcDoc={html} className="w-full h-[55vh] rounded-xl border border-line bg-white" />
      <p className="text-xs text-muted">Aprobar comparte la versión guardada de esta consulta cerrada. Una reapertura o edición requiere nueva aprobación.</p>
      {notice && <p role="status" className="text-sm text-accent">{notice}</p>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" className="btn-secondary px-4 py-2 text-sm" onClick={onClose}>Volver a la consulta</button>
        {approved && <><button type="button" className="btn-secondary px-4 py-2 text-sm" onClick={copyPortalLink}>Copiar enlace del portal</button><button type="button" className="btn-secondary px-4 py-2 text-sm" onClick={() => { try { if (source.id) revokePatientInstructions(source.id); setApproved(false); setNotice('Indicaciones retiradas del portal.') } catch (err) { setError(storageError(err)) } }}>Retirar del portal</button></>}
        <button type="button" disabled={busy || !source.id || source.status !== 'closed'} className="btn-forest px-4 py-2 text-sm disabled:opacity-50" onClick={approve}>{busy ? 'Aprobando...' : approved ? 'Actualizar aprobación' : 'Aprobar para el paciente'}</button>
        <button type="button" disabled={source.status === 'voided'} className="btn-forest px-4 py-2 text-sm disabled:opacity-50" onClick={print}>Imprimir / Guardar PDF</button>
      </div>
    </div>
  </Modal>
}
