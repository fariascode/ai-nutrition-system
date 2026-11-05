import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import type { Patient } from '@/types/patient'
import type { InstructionsSource, ProfessionalProfile } from '@/types/patientInstructions'
import { getProfessionalProfile, renderPatientInstructions, saveProfessionalProfile } from '../services/patientInstructions.service'
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
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" className="btn-secondary px-4 py-2 text-sm" onClick={onClose}>Volver a la consulta</button>
        <button type="button" disabled={source.status === 'voided'} className="btn-forest px-4 py-2 text-sm disabled:opacity-50" onClick={print}>Imprimir / Guardar PDF</button>
      </div>
    </div>
  </Modal>
}
