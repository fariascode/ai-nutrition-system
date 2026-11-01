import { useState, useEffect, type FormEvent } from 'react'
import { Calendar, Clock, Video, Building2 } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { getPatients } from '@/features/patients/services/patients.service'
import { APPOINTMENT_TYPE_LABELS } from '../services/appointments.service'
import type {
  AppointmentInsert,
  AppointmentType,
  AppointmentModality,
} from '@/types/appointment'
import type { Patient } from '@/types/patient'

interface Props {
  open: boolean
  doctorId: string
  initialPatientId?: string
  onClose: () => void
  onSave: (data: AppointmentInsert) => Promise<void>
}

const inputClass = 'w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white'
const labelClass = 'block text-xs font-bold text-gray-700 mb-1'

export default function NewAppointmentModal({
  open,
  doctorId,
  initialPatientId,
  onClose,
  onSave,
}: Props) {
  const [patients, setPatients]       = useState<Patient[]>([])
  const [patientId, setPatientId]     = useState('')
  const [date, setDate]               = useState(new Date().toISOString().split('T')[0])
  const [time, setTime]               = useState('11:00')
  const [duration, setDuration]       = useState(45)
  const [type, setType]               = useState<AppointmentType>('follow_up')
  const [modality, setModality]       = useState<AppointmentModality>('in_person')
  const [reason, setReason]           = useState('')
  const [prep, setPrep]               = useState(APPOINTMENT_TYPE_LABELS.follow_up.prep)
  const [saving, setSaving]           = useState(false)

  useEffect(() => {
    if (open) {
      getPatients().then(list => {
        setPatients(list)
        const targetId = initialPatientId || list[0]?.id || ''
        setPatientId(targetId)
        const found = list.find(p => p.id === targetId)
        if (found) {
          setReason(`Seguimiento nutricional: ${found.goal}`)
        }
      })
      setDate(new Date().toISOString().split('T')[0])
      setTime('11:00')
      setType('follow_up')
      setPrep(APPOINTMENT_TYPE_LABELS.follow_up.prep)
    }
  }, [open, initialPatientId])

  function handlePatientChange(id: string) {
    setPatientId(id)
    const found = patients.find(p => p.id === id)
    if (found) setReason(`Seguimiento nutricional: ${found.goal}`)
  }

  function handleTypeChange(newType: AppointmentType) {
    setType(newType)
    setPrep(APPOINTMENT_TYPE_LABELS[newType].prep)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const pat = patients.find(p => p.id === patientId)
    if (!pat) return

    setSaving(true)
    try {
      await onSave({
        patient_id: pat.id,
        doctor_id: doctorId,
        patient_name: pat.full_name,
        patient_phone: pat.phone,
        date,
        time,
        duration_min: duration,
        type,
        modality,
        status: 'scheduled',
        reason: reason || APPOINTMENT_TYPE_LABELS[type].label,
        prep_instructions: prep,
        soap_note: null,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      title="📅 Programar Nueva Consulta Clínica"
      subtitle="Agenda cita presencial o en línea con instrucciones automáticas para WhatsApp"
      size="xl"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>Paciente *</label>
          <select
            required
            value={patientId}
            onChange={e => handlePatientChange(e.target.value)}
            className={inputClass}
          >
            {patients.map(p => (
              <option key={p.id} value={p.id}>
                {p.full_name} {p.phone ? `(${p.phone})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>
              <Calendar className="w-3.5 h-3.5 inline mr-1 text-emerald-600" />
              Fecha de la Cita *
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={e => setDate(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              <Clock className="w-3.5 h-3.5 inline mr-1 text-emerald-600" />
              Horario *
            </label>
            <input
              type="time"
              required
              value={time}
              onChange={e => setTime(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Duración</label>
            <select
              value={duration}
              onChange={e => setDuration(Number(e.target.value))}
              className={inputClass}
            >
              <option value={30}>30 minutos</option>
              <option value={45}>45 minutos</option>
              <option value={60}>60 minutos</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Tipo de Consulta</label>
            <select
              value={type}
              onChange={e => handleTypeChange(e.target.value as AppointmentType)}
              className={inputClass}
            >
              {(Object.keys(APPOINTMENT_TYPE_LABELS) as AppointmentType[]).map(k => (
                <option key={k} value={k}>
                  {APPOINTMENT_TYPE_LABELS[k].label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Modalidad de Atención</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setModality('in_person')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                  modality === 'in_person'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                    : 'bg-white border-gray-200 text-gray-600'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" /> Consultorio
              </button>
              <button
                type="button"
                onClick={() => setModality('video_call')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                  modality === 'video_call'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                    : 'bg-white border-gray-200 text-gray-600'
                }`}
              >
                <Video className="w-3.5 h-3.5" /> Videollamada
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className={labelClass}>Motivo de la Consulta</label>
          <input
            type="text"
            required
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Ej. Control antropométrico mensual y revisión de glucosa..."
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>
            Indicaciones de preparación para el paciente (Se incluirán en el recordatorio de WhatsApp)
          </label>
          <textarea
            rows={2}
            value={prep}
            onChange={e => setPrep(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs"
          >
            {saving ? 'Agendando...' : 'Agendar Consulta'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

