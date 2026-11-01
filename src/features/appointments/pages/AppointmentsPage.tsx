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
  const [copiedAptId, setCopiedAptId]           = useState<string | null>(null)

  // Integración directa con el Generador de Planes IA al concluir consulta SOAP
  const [planPatientId, setPlanPatientId]       = useState<string | undefined>(undefined)
  const [newPlanModalOpen, setNewPlanModalOpen] = useState(false)

  const todayStr = new Date().toISOString().split('T')[0]

  async function loadAppointments() {
    setLoading(true)
    try {
      const list = await getAppointments()
      // Ordenar por fecha descendente y hora
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
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold mb-2">
            <Stethoscope className="w-3.5 h-3.5" />
            Módulo Clínico 4 • Agenda Médica y Evolución SOAP
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Agenda Clínica, Notas SOAP y Recordatorios WhatsApp
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Gestiona tus consultas presenciales o en línea, envía recordatorios automáticos y redacta notas SOAP con IA sincronizadas al Expediente 360°.
          </p>
        </div>

        <button
          onClick={() => setNewModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-extrabold rounded-xl shadow-xs transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          Agendar Nueva Consulta
        </button>
      </div>

      {/* KPIs de Agenda */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase">Consultas para Hoy</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{todayCount}</p>
            <p className="text-xs text-emerald-600 font-semibold mt-0.5">
              Fecha: {todayStr}
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase">Programadas / Confirmadas</p>
            <p className="text-2xl font-black text-blue-600 mt-1">{confirmedCount}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Listas para recordatorio por WhatsApp
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <MessageCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase">Notas Clínicas SOAP Cerradas</p>
            <p className="text-2xl font-black text-violet-600 mt-1">{completedCount}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Sincronizadas con curva de peso 360°
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center">
            <ClipboardCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Pestañas de Filtro */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-3">
        {[
          { id: 'all',       label: `Todas (${appointments.length})` },
          { id: 'today',     label: `De Hoy (${todayCount})` },
          { id: 'upcoming',  label: `Próximas / Pendientes (${confirmedCount})` },
          { id: 'completed', label: `Concluidas con Nota SOAP (${completedCount})` },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as FilterTab)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              filter === tab.id
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Listado de Citas y Notas SOAP */}
      {loading ? (
        <div className="p-12 text-center text-sm text-gray-500">Cargando agenda clínica...</div>
      ) : filteredAppointments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center space-y-3">
          <Calendar className="w-10 h-10 text-emerald-500 mx-auto" />
          <p className="text-base font-bold text-gray-900">No hay consultas en este filtro</p>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Programa una nueva consulta para generar recordatorios por WhatsApp y redactar notas evolutivas SOAP con IA.
          </p>
          <button
            onClick={() => setNewModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl"
          >
            <Plus className="w-4 h-4" /> Agendar Consulta
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
                className={`bg-white rounded-2xl border transition shadow-2xs overflow-hidden ${
                  isToday ? 'border-emerald-300 ring-1 ring-emerald-100' : 'border-gray-200'
                }`}
              >
                <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Columna izquierda: Horario, Paciente y Metadatos */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {isToday && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider">
                          HOY
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-xs font-extrabold text-gray-900 bg-gray-100 px-2.5 py-1 rounded-lg">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                        {apt.date}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-extrabold text-gray-900 bg-gray-100 px-2.5 py-1 rounded-lg">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" />
                        {apt.time} hrs ({apt.duration_min} min)
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${typeMeta.color}`}>
                        {typeMeta.label}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusMeta.color}`}>
                        {statusMeta.label}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                        {apt.modality === 'in_person' ? (
                          <>
                            <Building2 className="w-3 h-3 text-slate-600" /> Consultorio
                          </>
                        ) : (
                          <>
                            <Video className="w-3 h-3 text-blue-600" /> Videollamada
                          </>
                        )}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-baseline gap-2">
                      <h3 className="text-base sm:text-lg font-extrabold text-gray-900">
                        {apt.patient_name}
                      </h3>
                      {apt.patient_phone && (
                        <span className="text-xs font-semibold text-gray-400">
                          • Tel / WhatsApp: {apt.patient_phone}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-700 font-medium">
                      <strong className="text-gray-900">Motivo clínico:</strong> {apt.reason}
                    </p>

                    {apt.prep_instructions && (
                      <p className="text-[11px] text-gray-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                        <strong className="text-slate-700">📋 Preparación enviada al paciente:</strong> {apt.prep_instructions}
                      </p>
                    )}
                  </div>

                  {/* Columna derecha: Botones de Acción (WhatsApp, Estado y Consulta SOAP) */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {/* Botón de enviar por WhatsApp */}
                    <button
                      type="button"
                      onClick={() => handleSendWhatsApp(apt)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-50 hover:bg-green-100 text-green-800 border border-green-200 text-xs font-bold transition"
                      title="Abrir WhatsApp con el recordatorio prellenado"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-green-600" />
                      WhatsApp
                    </button>

                    {/* Botón de copiar texto de recordatorio */}
                    <button
                      type="button"
                      onClick={() => handleCopyReminder(apt)}
                      className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 text-xs font-semibold transition"
                      title="Copiar mensaje de recordatorio al portapapeles"
                    >
                      {copiedAptId === apt.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700 font-bold">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>

                    {/* Botones rápidos de confirmación */}
                    {apt.status === 'scheduled' && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(apt.id, 'confirmed')}
                        className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition"
                        title="Marcar cita como confirmada por el paciente"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Confirmar
                      </button>
                    )}

                    {/* Botón Principal: Iniciar / Editar Consulta SOAP */}
                    <button
                      type="button"
                      onClick={() => setActiveSoapApt(apt)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-2xs transition"
                    >
                      <Stethoscope className="w-3.5 h-3.5" />
                      {apt.soap_note ? 'Ver / Editar Nota SOAP' : 'Iniciar Consulta SOAP'}
                    </button>

                    {apt.status !== 'cancelled' && apt.status !== 'completed' && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(apt.id, 'cancelled')}
                        className="p-2 rounded-xl text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition"
                        title="Cancelar cita"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDelete(apt.id)}
                      className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                      title="Eliminar registro"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Resumen de Nota Evolutiva SOAP si ya fue registrada */}
                {apt.soap_note && (
                  <div className="bg-emerald-50/50 border-t border-emerald-100 px-4 sm:px-5 py-3.5 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-emerald-900 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-emerald-600" />
                        Resumen de Nota de Evolución Clínica (SOAP)
                      </span>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-emerald-800">
                        {apt.soap_note.recorded_weight_kg && (
                          <span className="px-2 py-0.5 rounded-md bg-white border border-emerald-200">
                            Peso registrado: {apt.soap_note.recorded_weight_kg} kg
                          </span>
                        )}
                        {apt.soap_note.recorded_body_fat_pct && (
                          <span className="px-2 py-0.5 rounded-md bg-white border border-emerald-200">
                            Grasa: {apt.soap_note.recorded_body_fat_pct}%
                          </span>
                        )}
                        {apt.soap_note.recorded_waist_cm && (
                          <span className="px-2 py-0.5 rounded-md bg-white border border-emerald-200">
                            Cintura: {apt.soap_note.recorded_waist_cm} cm
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                      <div className="p-2.5 rounded-xl bg-white border border-gray-200/80">
                        <span className="font-extrabold text-blue-800 block mb-0.5">S — Subjetivo</span>
                        <p className="text-gray-600 line-clamp-3">{apt.soap_note.subjective}</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white border border-gray-200/80">
                        <span className="font-extrabold text-emerald-800 block mb-0.5">O — Objetivo</span>
                        <p className="text-gray-600 line-clamp-3">{apt.soap_note.objective}</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white border border-gray-200/80">
                        <span className="font-extrabold text-amber-800 block mb-0.5">A — Análisis</span>
                        <p className="text-gray-600 line-clamp-3">{apt.soap_note.analysis}</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white border border-gray-200/80">
                        <span className="font-extrabold text-violet-800 block mb-0.5">P — Plan</span>
                        <p className="text-gray-600 line-clamp-3">{apt.soap_note.plan}</p>
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
        onOpenNewPlan={(patientId) => {
          setPlanPatientId(patientId)
          setNewPlanModalOpen(true)
        }}
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
