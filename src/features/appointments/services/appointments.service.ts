import type {
  Appointment,
  AppointmentInsert,
  AppointmentUpdate,
  AppointmentType,
  AppointmentStatus,
  SoapNote,
} from '@/types/appointment'
import type { Patient } from '@/types/patient'
import type { Consultation } from '@/types/consultation'
import { calculateBMI, calculateAge, calculateBMR, calculateTDEE } from '@/lib/clinicalEngine'

const DEMO_APPOINTMENTS_KEY = 'nutriai_demo_appointments_v1'

export const APPOINTMENT_TYPE_LABELS: Record<AppointmentType, { label: string; color: string; prep: string }> = {
  first_visit: {
    label: 'Consulta Inicial 1ª Vez',
    color: 'bg-violet-50 text-violet-800 border-violet-200',
    prep: 'Acudir con ayuno ligero de 3 horas para bioimpedancia InBody y traer últimos estudios de laboratorio.',
  },
  follow_up: {
    label: 'Control y Seguimiento',
    color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    prep: 'Acudir con ropa ligera y 2 horas sin ingesta de alimentos sólidos para pesaje clínico.',
  },
  body_comp: {
    label: 'Antropometría / InBody',
    color: 'bg-blue-50 text-blue-800 border-blue-200',
    prep: 'No realizar ejercicio intenso 12h antes y mantener hidratación habitual.',
  },
  lab_review: {
    label: 'Interpretación de Laboratorio',
    color: 'bg-amber-50 text-amber-800 border-amber-200',
    prep: 'Enviar o traer resultados de Química Sanguínea, Perfil Lipídico e Insulina Basal.',
  },
}

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, { label: string; color: string }> = {
  scheduled: { label: 'Programada',  color: 'bg-amber-100 text-amber-800 border-amber-200' },
  confirmed: { label: 'Confirmada',  color: 'bg-blue-100 text-blue-800 border-blue-200' },
  completed: { label: 'Concluida (SOAP)', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  cancelled: { label: 'Cancelada',   color: 'bg-gray-100 text-gray-500 border-gray-200' },
}

function getInitialAppointments(): Appointment[] {
  const today = new Date().toISOString().split('T')[0]
  const tomorrowDate = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString().split('T')[0]
  const yesterdayDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString().split('T')[0]

  return [
    {
      id: 'apt-1',
      created_at: new Date().toISOString(),
      patient_id: 'pat-1',
      doctor_id: 'demo-doctor-uuid-1234',
      patient_name: 'Ana María Gómez',
      patient_phone: '+52 55 4123 8910',
      date: today,
      time: '10:30',
      duration_min: 45,
      type: 'follow_up',
      modality: 'in_person',
      status: 'confirmed',
      reason: 'Control mensual de pérdida de grasa visceral y revisión de curva glucémica',
      prep_instructions: APPOINTMENT_TYPE_LABELS.follow_up.prep,
      soap_note: {
        subjective: 'Paciente refiere excelente saciedad con el protocolo de bajo índice glucémico. Sin episodios de somnolencia postprandial. Entrenó funcional 4 días por semana.',
        objective: 'Peso: 68.5 kg (-1.6 kg respecto al mes previo) | % Grasa: 26.4% (-0.9%) | Masa Muscular: 27.2 kg (+0.2 kg) | Cintura: 76 cm (-2 cm). PA: 116/74 mmHg.',
        analysis: 'Evolución altamente favorable. Pérdida selectiva de tejido adiposo con preservación e incremento ligero de masa magra. Mejora clínica en sensibilidad a la insulina.',
        plan: 'Mantener protocolo de Control Glucémico a 1,680 kcal (126g P / 147g C / 65g G). Continuar Metformina XR 500mg en cena + Mio-Inositol 2g. Próximo control en 4 semanas.',
        recorded_weight_kg: 68.5,
        recorded_body_fat_pct: 26.4,
        recorded_muscle_kg: 27.2,
        recorded_waist_cm: 76,
        updated_at: new Date().toISOString(),
      },
    },
    {
      id: 'apt-2',
      created_at: new Date().toISOString(),
      patient_id: 'pat-2',
      doctor_id: 'demo-doctor-uuid-1234',
      patient_name: 'Carlos Eduardo Ramírez',
      patient_phone: '+52 33 1982 4411',
      date: today,
      time: '12:00',
      duration_min: 45,
      type: 'lab_review',
      modality: 'in_person',
      status: 'scheduled',
      reason: 'Revisión de perfil lipídico, presión arterial y ajuste de protocolo DASH',
      prep_instructions: APPOINTMENT_TYPE_LABELS.lab_review.prep,
      soap_note: null,
    },
    {
      id: 'apt-3',
      created_at: new Date().toISOString(),
      patient_id: 'pat-3',
      doctor_id: 'demo-doctor-uuid-1234',
      patient_name: 'Sofía Valenzuela',
      patient_phone: '+52 81 8344 0921',
      date: tomorrowDate,
      time: '16:30',
      duration_min: 30,
      type: 'body_comp',
      modality: 'video_call',
      status: 'confirmed',
      reason: 'Ajuste de carga de carbohidratos peri-entrenamiento para competencia CrossFit',
      prep_instructions: APPOINTMENT_TYPE_LABELS.body_comp.prep,
      soap_note: null,
    },
    {
      id: 'apt-4',
      created_at: new Date().toISOString(),
      patient_id: 'pat-1',
      doctor_id: 'demo-doctor-uuid-1234',
      patient_name: 'Ana María Gómez',
      patient_phone: '+52 55 4123 8910',
      date: yesterdayDate,
      time: '11:00',
      duration_min: 60,
      type: 'first_visit',
      modality: 'in_person',
      status: 'completed',
      reason: 'Valoración nutricional inicial e historia clínica completa',
      prep_instructions: APPOINTMENT_TYPE_LABELS.first_visit.prep,
      soap_note: {
        subjective: 'Acude por dificultad para bajar de peso y fatiga vespertina. Alergia conocida a mariscos y cacahuate.',
        objective: 'Peso: 70.1 kg | Talla: 165 cm | Cintura: 78 cm | Glucosa ayuno: 104 mg/dL.',
        analysis: 'Sobrepeso ligero con datos bioquímicos de resistencia a la insulina leve.',
        plan: 'Iniciar plan de bajo índice glucémico libre de mariscos y cacahuate, fraccionado en 4 tiempos.',
        recorded_weight_kg: 70.1,
        recorded_body_fat_pct: 27.3,
        recorded_muscle_kg: 27.0,
        recorded_waist_cm: 78,
        updated_at: new Date().toISOString(),
      },
    },
  ]
}

export async function getAppointments(): Promise<Appointment[]> {
  const stored = localStorage.getItem(DEMO_APPOINTMENTS_KEY)
  if (!stored) {
    const initial = getInitialAppointments()
    localStorage.setItem(DEMO_APPOINTMENTS_KEY, JSON.stringify(initial))
    return initial
  }
  return JSON.parse(stored)
}

export async function createAppointment(input: AppointmentInsert): Promise<Appointment> {
  const list = await getAppointments()
  const created: Appointment = {
    ...input,
    id: `apt-${crypto.randomUUID()}`,
    created_at: new Date().toISOString(),
  }
  list.unshift(created)
  localStorage.setItem(DEMO_APPOINTMENTS_KEY, JSON.stringify(list))
  return created
}

export async function updateAppointment(id: string, input: AppointmentUpdate): Promise<Appointment> {
  const list = await getAppointments()
  const idx = list.findIndex(a => a.id === id)
  if (idx === -1) throw new Error('Cita no encontrada')
  const updated: Appointment = {
    ...list[idx],
    ...input,
  }
  list[idx] = updated
  localStorage.setItem(DEMO_APPOINTMENTS_KEY, JSON.stringify(list))
  return updated
}

export async function deleteAppointment(id: string): Promise<void> {
  const list = (await getAppointments()).filter(a => a.id !== id)
  localStorage.setItem(DEMO_APPOINTMENTS_KEY, JSON.stringify(list))
}

/** Vincula el cierre y el seguimiento sin crear citas duplicadas al reintentar. */
export async function syncConsultationAppointments(consultation: Consultation, patient: Patient): Promise<void> {
  if (consultation.status !== 'closed') return
  const list = await getAppointments()
  const original = list.find(item => item.id === consultation.appointment_id)
  if (consultation.appointment_id && (!original || original.patient_id !== patient.id)) {
    throw new Error('La cita de origen no corresponde a este paciente o ya no existe.')
  }
  if (original?.status === 'cancelled') throw new Error('La cita está cancelada. Revisa su estado antes de cerrar la consulta.')
  const schedule = consultation.follow_up_schedule
  const existing = list.find(item => item.source_consultation_id === consultation.id)
  if (schedule && consultation.follow_up_date) {
    const start = new Date(`${consultation.follow_up_date}T${schedule.time}`).getTime()
    const end = start + schedule.duration_min * 60000
    const conflict = list.some(item => {
      if (item.id === existing?.id || item.id === original?.id || item.status === 'cancelled') return false
      if (item.doctor_id !== patient.doctor_id) return false
      const other = new Date(`${item.date}T${item.time}`).getTime()
      return start < other + item.duration_min * 60000 && end > other
    })
    if (!Number.isFinite(start) || ![30, 45, 60].includes(schedule.duration_min)) throw new Error('Revisa la fecha, hora y duración del seguimiento.')
    if (conflict) throw new Error('El horario de seguimiento se cruza con otra cita. Elige otra hora.')
    const followUp = {
      patient_id: patient.id, doctor_id: patient.doctor_id, patient_name: patient.full_name,
      patient_phone: patient.phone, date: consultation.follow_up_date, time: schedule.time,
      duration_min: schedule.duration_min, modality: schedule.modality,
      type: 'follow_up' as const, status: 'scheduled' as const,
      reason: consultation.follow_up_notes || `Seguimiento: ${consultation.chief_complaint}`,
      source_consultation_id: consultation.id,
    }
    if (existing && existing.status === 'completed') throw new Error('El seguimiento ya fue atendido. Agenda otra consulta desde la agenda.')
    if (existing) await updateAppointment(existing.id, followUp)
    else await createAppointment(followUp)
  }
  if (original && original.status !== 'completed') await updateAppointment(original.id, { status: 'completed' })
}

/**
 * Construye el mensaje y enlace directo a WhatsApp para recordatorio de consulta
 */
export function buildWhatsAppReminder(apt: Appointment): { message: string; whatsappUrl: string } {
  const firstName = apt.patient_name.split(' ')[0]
  const dateFormatted = new Date(apt.date + 'T12:00:00').toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const modalityText = apt.modality === 'in_person' ? '🏥 Presencial en Consultorio' : '💻 Videollamada en Línea'
  const prep = apt.prep_instructions || APPOINTMENT_TYPE_LABELS[apt.type].prep

  const message =
    `Hola *${firstName}* 👋, te recordamos tu próxima consulta de Nutrición Clínica en *NutriAI*:\n\n` +
    `📅 *Fecha:* ${dateFormatted}\n` +
    `⏰ *Hora:* ${apt.time} hrs (${apt.duration_min} min)\n` +
    `📍 *Modalidad:* ${modalityText}\n` +
    `🩺 *Tipo:* ${APPOINTMENT_TYPE_LABELS[apt.type].label}\n\n` +
    `📋 *Indicaciones previas:* ${prep}\n\n` +
    `Por favor responde *CONFIRMAR* a este mensaje. ¡Te esperamos!`

  const cleanPhone = (apt.patient_phone ?? '').replace(/[^\d]/g, '')
  const whatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`

  return { message, whatsappUrl }
}

/**
 * Redacta automáticamente la nota de evolución clínica SOAP con IA a partir de los datos del paciente
 */
export function generateAiSoapNote(
  patient: Patient,
  currentInputs: {
    weightKg: number
    bodyFatPct?: number
    muscleKg?: number
    waistCm?: number
    subjectiveText?: string
  },
): SoapNote {
  const age = calculateAge(patient.birth_date)
  const bmi = calculateBMI(currentInputs.weightKg, patient.height_cm)
  const bmr = calculateBMR(currentInputs.weightKg, patient.height_cm, age, patient.gender)
  const tdee = calculateTDEE(bmr, patient.activity_level ?? 'moderate')

  const prevWeight = patient.weight_kg
  const diff = Number((currentInputs.weightKg - prevWeight).toFixed(1))
  const diffText =
    diff < 0
      ? `reducción favorable de ${Math.abs(diff)} kg respecto a registro previo`
      : diff > 0
      ? `incremento de +${diff} kg respecto a registro previo`
      : `mantenimiento ponderal estable (${currentInputs.weightKg} kg)`

  const subjective =
    currentInputs.subjectiveText?.trim() ||
    `Paciente de ${age} años acude a control nutricional para "${patient.goal}". Refiere adecuada adherencia al menú prescrito (>85%), mejoría en niveles de energía diurna, buena tolerancia digestiva y cumplimiento de meta de hidratación (${(currentInputs.weightKg * 0.035).toFixed(1)} L/día).`

  const objective =
    `Peso actual: ${currentInputs.weightKg} kg (${diffText}) | Talla: ${patient.height_cm} cm | IMC: ${bmi.value} kg/m² (${bmi.category}). ` +
    `${currentInputs.bodyFatPct ? `% Grasa Corporal: ${currentInputs.bodyFatPct}% | ` : ''}` +
    `${currentInputs.muscleKg ? `Masa Muscular Esquelética: ${currentInputs.muscleKg} kg | ` : ''}` +
    `${currentInputs.waistCm ? `Circunferencia de Cintura: ${currentInputs.waistCm} cm. ` : ''}` +
    `TMB (Mifflin-St Jeor): ${bmr} kcal/día | GET estimado: ${tdee} kcal/día.`

  const analysis =
    `Paciente cursa con ${bmi.category.toLowerCase()} (IMC ${bmi.value}) y ${diffText}. ` +
    `${patient.conditions ? `En seguimiento activo por ${patient.conditions}. ` : ''}` +
    `La respuesta metabólica e indicadores antropométricos muestran adecuada adaptación a la intervención dietoterapéutica${patient.allergies ? `, manteniendo exclusión estricta de ${patient.allergies}` : ''}.`

  const targetKcal = Math.round((tdee * 0.85) / 10) * 10
  const plan =
    `1. Prescripción dietética ajustada a ${targetKcal} kcal/día con distribución de macronutrientes personalizada y alimentos de bajo índice glucémico.\n` +
    `2. Hidratación basal programada en ${(currentInputs.weightKg * 0.035).toFixed(1)} litros de agua natural al día.\n` +
    `3. ${patient.medications ? `Continuar esquema actual (${patient.medications}) y ` : ''}mantener actividad física estructurada + caminata postprandial de 15 min.\n` +
    `4. Próxima cita de control antropométrico en 3 a 4 semanas.`

  return {
    subjective,
    objective,
    analysis,
    plan,
    recorded_weight_kg: currentInputs.weightKg,
    recorded_body_fat_pct: currentInputs.bodyFatPct,
    recorded_muscle_kg: currentInputs.muscleKg,
    recorded_waist_cm: currentInputs.waistCm,
    updated_at: new Date().toISOString(),
  }
}

