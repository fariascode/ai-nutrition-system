import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calendar, Clock, Video, Building2, Plus, Stethoscope,
  MessageCircle, CheckCircle2, XCircle, Copy, Check,
  FileText, Trash2, ClipboardCheck,
} from 'lucide-react'
import { useAuth } from '@/features/auth/context/AuthContext'
import {
  getAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  buildWhatsAppReminder,
  APPOINTMENT_TYPE_LABELS,
  APPOINTMENT_STATUS_LABELS,
} from '../services/appointments.service'
import NewAppointmentModal from '../components/NewAppointmentModal'
import SoapConsultationModal from '../components/SoapConsultationModal'
import ConsultationModal from '@/features/consultations/components/ConsultationModal'
import NewPlanModal from '@/features/plans/components/NewPlanModal'
import type { Appointment, AppointmentInsert, SoapNote } from '@/types/appointment'

type FilterTab = 'all' | 'today' | 'upcoming' | 'completed'

export default function AppointmentsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading]           = useState(true)
  const [filter, setFilter]             = useState<FilterTab>('all')

  const [newModalOpen, setNewModalOpen]         = useState(false)
  const [activeSoapApt, setActiveSoapApt]       = useState<Appointment | null>(null)
  const [consultApt, setConsultApt]             = useState<Appointment | null>(null)
  const [copiedAptId, setCopiedAptId]           = useState<string | null>(null)

  // Integración directa con el Generador de Planes IA al concluir consulta SOAP
  const [planPatientId, setPlanPatientId]       = useState<string | undefined>(undefined)
  const [newPlanModalOpen, setNewPlanModalOpen] = useState(false)

  const todayStr = new Date().toISOString().split('T')[0]

  async function loadAppointments() {
    setLoading(true)
    try {
      const list = await getAppointments()
      list.sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`))
      setAppointments(list)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAppointments()
  }, [])

  async function handleCreateAppointment(data: AppointmentInsert) {
    const created = await createAppointment(data)
    setAppointments(prev => [created, ...prev])
  }

  async function handleSaveSoap(appointmentId: string, soap: SoapNote) {
    const updated = await updateAppointment(appointmentId, {
      status: 'completed',
      soap_note: soap,
    })
    setAppointments(prev => prev.map(a => (a.id === appointmentId ? updated : a)))
  }

  async function handleStatusChange(id: string, status: Appointment['status']) {
    const updated = await updateAppointment(id, { status })
    setAppointments(prev => prev.map(a => (a.id === id ? updated : a)))
  }

  async function handleDelete(id: string) {
    await deleteAppointment(id)
    setAppointments(prev => prev.filter(a => a.id !== id))
  }

  function handleCopyReminder(apt: Appointment) {
    const { message } = buildWhatsAppReminder(apt)
    navigator.clipboard.writeText(message)
    setCopiedAptId(apt.id)
    setTimeout(() => setCopiedAptId(null), 2500)
  }

  function handleSendWhatsApp(apt: Appointment) {
    const { whatsappUrl } = buildWhatsAppReminder(apt)
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
  }

  const todayCount     = appointments.filter(a => a.date === todayStr && a.status !== 'cancelled').length
  const confirmedCount = appointments.filter(a => a.status === 'confirmed' || a.status === 'scheduled').length
  const completedCount = appointments.filter(a => a.status === 'completed').length

  const filteredAppointments = appointments.filter(apt => {
    if (filter === 'today') return apt.date === todayStr
    if (filter === 'upcoming') return apt.status === 'scheduled' || apt.status === 'confirmed'
    if (filter === 'completed') return apt.status === 'completed'
    return true
  })

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-lime-tint border border-[#C8ED8F] text-content text-[11px] font-extrabold mb-1.5">
            <Stethoscope className="w-3.5 h-3.5 text-accent" />
            Agenda Clínica y Evolución SOAP con IA
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-content tracking-tight">
            Consultas, Notas SOAP y WhatsApp
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-0.5">
            Gestiona consultas presenciales o en línea, envía recordatorios automáticos y redacta notas SOAP con IA sincronizadas al Expediente 360°.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setNewModalOpen(true)}
          className="btn-forest flex items-center justify-center gap-2 px-5 py-2.5 text-xs sm:text-sm shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 text-[#C8ED8F]" />
          Agendar Nueva Consulta
        </button>
      </div>

      {/* KPIs de Agenda en Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bento-card p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-muted uppercase tracking-wider">Consultas para Hoy</p>
            <p className="text-3xl font-extrabold text-content mt-1 tracking-tight">{todayCount}</p>
            <p className="text-xs text-accent font-bold mt-0.5">
              Fecha: {todayStr}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-accent-soft text-accent flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="bento-card p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-muted uppercase tracking-wider">Programadas / Confirmadas</p>
            <p className="text-3xl font-extrabold text-accent mt-1 tracking-tight">{confirmedCount}</p>
            <p className="text-xs text-muted font-medium mt-0.5">
              Listas para recordatorio por WhatsApp
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-lime-tint border border-[#C8ED8F] text-accent flex items-center justify-center">
            <MessageCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bento-card p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-muted uppercase tracking-wider">Notas Clínicas SOAP Cerradas</p>
            <p className="text-3xl font-extrabold text-content mt-1 tracking-tight">{completedCount}</p>
            <p className="text-xs text-muted font-medium mt-0.5">
              Sincronizadas con curva de peso 360°
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#245C47] text-[#C8ED8F] flex items-center justify-center">
            <ClipboardCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Pestañas de Filtro */}
      <div className="bento-card p-2.5 flex flex-wrap items-center gap-2">
        {[
          { id: 'all',       label: `Todas (${appointments.length})` },
          { id: 'today',     label: `De Hoy (${todayCount})` },
          { id: 'upcoming',  label: `Próximas / Pendientes (${confirmedCount})` },
          { id: 'completed', label: `Concluidas con Nota SOAP (${completedCount})` },
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id as FilterTab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              filter === tab.id
                ? 'bg-[#245C47] text-white shadow-2xs'
                : 'bg-canvas text-muted hover:text-content'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Listado de Citas y Notas SOAP */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bento-card p-6 h-40 animate-pulse" />
          ))}
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="bento-card p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-accent-soft text-accent flex items-center justify-center mx-auto">
            <Calendar className="w-6 h-6" />
          </div>
          <p className="text-base font-extrabold text-content">No hay consultas en este filtro</p>
          <p className="text-xs text-muted max-w-md mx-auto">
            Programa una nueva consulta para generar recordatorios por WhatsApp y redactar notas evolutivas SOAP con IA.
          </p>
          <button
            type="button"
            onClick={() => setNewModalOpen(true)}
            className="btn-forest inline-flex items-center gap-1.5 px-4 py-2 text-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#C8ED8F]" /> Agendar Consulta
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAppointments.map(apt => {
            const typeMeta = APPOINTMENT_TYPE_LABELS[apt.type]
            const statusMeta = APPOINTMENT_STATUS_LABELS[apt.status]
            const isToday = apt.date === todayStr

            return (
              <div
                key={apt.id}
                className={`bento-card overflow-hidden ${
                  isToday ? 'ring-2 ring-[#245C47]/20 border-[#245C47]/40' : ''
                }`}
              >
                <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Columna izquierda: Horario, Paciente y Metadatos */}
                  <div className="space-y-2.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {isToday && (
                        <span className="px-2.5 py-0.5 rounded-full bg-lime-solid text-content text-[10px] font-extrabold uppercase tracking-wider">
                          HOY
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-content bg-canvas border border-line px-2.5 py-1 rounded-xl">
                        <Calendar className="w-3.5 h-3.5 text-accent" />
                        {apt.date}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-content bg-canvas border border-line px-2.5 py-1 rounded-xl">
                        <Clock className="w-3.5 h-3.5 text-accent" />
                        {apt.time} hrs ({apt.duration_min} min)
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${typeMeta.color}`}>
                        {typeMeta.label}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusMeta.color}`}>
                        {statusMeta.label}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-accent-soft text-accent">
                        {apt.modality === 'in_person' ? (
                          <>
                            <Building2 className="w-3 h-3" /> Consultorio
                          </>
                        ) : (
                          <>
                            <Video className="w-3 h-3" /> Videollamada
                          </>
                        )}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-baseline gap-2">
                      <h3 className="text-base sm:text-lg font-extrabold text-content">
                        {apt.patient_name}
                      </h3>
                      {apt.patient_phone && (
                        <span className="text-xs font-semibold text-muted">
                          • WhatsApp: {apt.patient_phone}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-content font-medium">
                      <strong className="text-accent">Motivo clínico:</strong> {apt.reason}
                    </p>

                    {apt.prep_instructions && (
                      <p className="text-[11px] text-muted bg-canvas px-3.5 py-2 rounded-xl border border-line">
                        <strong className="text-content">📋 Preparación enviada al paciente:</strong> {apt.prep_instructions}
                      </p>
                    )}
                  </div>

                  {/* Columna derecha: Botones de Acción */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleSendWhatsApp(apt)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-lime-tint hover:bg-lime-solid text-content border border-[#C8ED8F] text-xs font-extrabold transition cursor-pointer"
                      title="Abrir WhatsApp con el recordatorio prellenado"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-accent" />
                      WhatsApp
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyReminder(apt)}
                      className="btn-secondary flex items-center gap-1 px-3 py-2 text-xs cursor-pointer"
                      title="Copiar mensaje de recordatorio al portapapeles"
                    >
                      {copiedAptId === apt.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-accent" />
                          <span className="text-accent font-bold">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-muted" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>

                    {apt.status === 'scheduled' && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(apt.id, 'confirmed')}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl bg-accent-soft hover:bg-[#245C47] text-accent hover:text-white text-xs font-bold transition cursor-pointer"
                        title="Marcar cita como confirmada por el paciente"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Confirmar
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setConsultApt(apt)}
                      className="btn-secondary flex items-center gap-1.5 px-3 py-2 text-xs cursor-pointer"
                      title="Registrar consulta médica completa ligada a esta cita"
                    >
                      <Stethoscope className="w-3.5 h-3.5 text-accent" />
                      Consulta médica
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveSoapApt(apt)}
                      className="btn-forest flex items-center gap-1.5 px-4 py-2 text-xs cursor-pointer"
                    >
                      <Stethoscope className="w-3.5 h-3.5 text-[#C8ED8F]" />
                      {apt.soap_note ? 'Ver / Editar Nota SOAP' : 'Iniciar Consulta SOAP'}
                    </button>

                    {apt.status !== 'cancelled' && apt.status !== 'completed' && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(apt.id, 'cancelled')}
                        className="p-2 rounded-xl text-muted hover:text-warning hover:bg-warning-soft transition cursor-pointer"
                        title="Cancelar cita"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDelete(apt.id)}
                      className="p-2 rounded-xl text-muted hover:text-danger hover:bg-danger-soft transition cursor-pointer"
                      title="Eliminar registro"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Resumen de Nota Evolutiva SOAP si ya fue registrada */}
                {apt.soap_note && (
                  <div className="bg-canvas border-t border-line px-5 sm:px-6 py-4 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-content flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-accent" />
                        Resumen de Nota de Evolución Clínica (SOAP)
                      </span>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-accent">
                        {apt.soap_note.recorded_weight_kg && (
                          <span className="px-2.5 py-0.5 rounded-lg bg-surface border border-line">
                            Peso registrado: {apt.soap_note.recorded_weight_kg} kg
                          </span>
                        )}
                        {apt.soap_note.recorded_body_fat_pct && (
                          <span className="px-2.5 py-0.5 rounded-lg bg-surface border border-line">
                            Grasa: {apt.soap_note.recorded_body_fat_pct}%
                          </span>
                        )}
                        {apt.soap_note.recorded_waist_cm && (
                          <span className="px-2.5 py-0.5 rounded-lg bg-surface border border-line">
                            Cintura: {apt.soap_note.recorded_waist_cm} cm
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                      <div className="p-3 rounded-2xl bg-surface border border-line">
                        <span className="font-extrabold text-accent block mb-1">S — Subjetivo</span>
                        <p className="text-muted line-clamp-3 leading-relaxed">{apt.soap_note.subjective}</p>
                      </div>
                      <div className="p-3 rounded-2xl bg-surface border border-line">
                        <span className="font-extrabold text-accent block mb-1">O — Objetivo</span>
                        <p className="text-muted line-clamp-3 leading-relaxed">{apt.soap_note.objective}</p>
                      </div>
                      <div className="p-3 rounded-2xl bg-surface border border-line">
                        <span className="font-extrabold text-accent block mb-1">A — Análisis</span>
                        <p className="text-muted line-clamp-3 leading-relaxed">{apt.soap_note.analysis}</p>
                      </div>
                      <div className="p-3 rounded-2xl bg-surface border border-line">
                        <span className="font-extrabold text-accent block mb-1">P — Plan</span>
                        <p className="text-muted line-clamp-3 leading-relaxed">{apt.soap_note.plan}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal para Agendar Nueva Consulta */}
      <NewAppointmentModal
        open={newModalOpen}
        doctorId={user?.id || 'demo-doctor-uuid-1234'}
        onClose={() => setNewModalOpen(false)}
        onSave={handleCreateAppointment}
      />

      {/* Modal de Consulta Clínica y Nota SOAP con IA */}
      <SoapConsultationModal
        open={Boolean(activeSoapApt)}
        appointment={activeSoapApt}
        onClose={() => setActiveSoapApt(null)}
        onSaveSoap={handleSaveSoap}
        onOpenNewPlan={patientId => {
          setPlanPatientId(patientId)
          setNewPlanModalOpen(true)
        }}
      />

      {/* Consulta médica completa ligada a la cita */}
      <ConsultationModal
        open={Boolean(consultApt)}
        patientId={consultApt?.patient_id ?? null}
        appointment={consultApt}
        onClose={() => setConsultApt(null)}
        onSaved={loadAppointments}
      />

      {/* Modal de Generación de Plan Nutricional IA encadenado tras cerrar la Nota SOAP */}
      <NewPlanModal
        open={newPlanModalOpen}
        doctorId={user?.id || 'demo-doctor-uuid-1234'}
        initialPatientId={planPatientId}
        onClose={() => setNewPlanModalOpen(false)}
        onCreated={() => {
          setNewPlanModalOpen(false)
          navigate('/plans')
        }}
      />
    </div>
  )
}
