import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createAppointment, getAppointments, syncConsultationAppointments } from '../src/features/appointments/services/appointments.service.ts'

beforeEach(() => {
  const data = new Map([['nutriai_demo_appointments_v1', '[]']])
  globalThis.localStorage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) }
})
const patient = { id: 'p1', doctor_id: 'd1', full_name: 'Paciente' }
const consultation = { id: 'c1', patient_id: 'p1', status: 'closed', chief_complaint: 'Control', follow_up_date: '2027-01-12', follow_up_schedule: { time: '10:00', duration_min: 30, modality: 'in_person' } }

test('cerrar completa la cita y reintentar no duplica el seguimiento', async () => {
  const original = await createAppointment({ patient_id: 'p1', doctor_id: 'd1', date: '2027-01-10', time: '09:00', duration_min: 30, status: 'confirmed' })
  const input = { ...consultation, appointment_id: original.id }
  await syncConsultationAppointments(input, patient)
  await syncConsultationAppointments(input, patient)
  const all = await getAppointments()
  assert.equal(all.length, 2)
  assert.equal(all.find(item => item.id === original.id).status, 'completed')
  assert.equal(all.filter(item => item.source_consultation_id === 'c1').length, 1)
})

test('no reserva horario para borradores o fechas sin solicitud de agendar', async () => {
  await syncConsultationAppointments({ ...consultation, status: 'draft' }, patient)
  await syncConsultationAppointments({ ...consultation, follow_up_schedule: undefined }, patient)
  assert.equal((await getAppointments()).length, 0)
})

test('un conflicto de horario no crea el seguimiento ni concluye la cita original', async () => {
  const original = await createAppointment({ patient_id: 'p1', doctor_id: 'd1', date: '2027-01-10', time: '09:00', duration_min: 30, status: 'confirmed' })
  // IDs explícitos también comprueban llamadas creadas dentro del mismo milisegundo.
  localStorage.setItem('nutriai_demo_appointments_v1', JSON.stringify([
    original, { id: 'occupied', doctor_id: 'd1', date: '2027-01-12', time: '10:15', duration_min: 30, status: 'confirmed' },
  ]))
  await assert.rejects(syncConsultationAppointments({ ...consultation, appointment_id: original.id }, patient), /cruza/)
  assert.equal((await getAppointments()).find(item => item.id === original.id).status, 'confirmed')
  assert.equal((await getAppointments()).length, 2)
})
