import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { saveConsultationWorkflow } from '../src/features/consultations/services/consultationWorkflow.ts'
import { getConsultationsByPatient, saveConsultation, deleteConsultation } from '../src/features/consultations/services/consultations.service.ts'
import { getMockPatients } from '../src/lib/mockData.ts'
import { getAppointments } from '../src/features/appointments/services/appointments.service.ts'
import { getMedicalRecord, saveMedicalRecord } from '../src/features/medical-record/services/medicalRecord.service.ts'
import { updatePatient } from '../src/features/patients/services/patients.service.ts'

let data
beforeEach(() => {
  data = new Map([['nutriai_demo_appointments_v1', '[]']])
  globalThis.localStorage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) }
})
const actor = { id: 'doctor', label: 'Médico de prueba' }
const input = patient => ({ patient_id: patient.id, date: '2027-01-10', status: 'closed', chief_complaint: 'Control', present_illness: '', vitals: { weight_kg: 70, glucose: 130 }, glucose_context: 'random', exam: {}, assessment: 'Evaluación registrada', plan: 'Seguimiento', follow_up_date: '2027-01-12', follow_up_schedule: { time: '10:00', duration_min: 30, modality: 'in_person' } })

test('el cierre local conserva el ayuno previo y reabrir no duplica el registro de peso', async () => {
  const patient = getMockPatients()[0]
  const initialGlucose = patient.biomarkers.fasting_glucose
  const saved = await saveConsultationWorkflow(input(patient), patient, true, actor)
  assert.equal(getMockPatients()[0].biomarkers.fasting_glucose, initialGlucose)
  await assert.rejects(saveConsultation({ ...saved, status: 'draft' }, actor), /motivo/)
  const reopened = await saveConsultation({ ...saved, status: 'draft' }, actor, 'Corregir peso')
  await saveConsultationWorkflow({ ...reopened, status: 'closed', vitals: { ...reopened.vitals, weight_kg: 71 }, glucose_context: 'fasting' }, getMockPatients()[0], true, actor)
  const updated = getMockPatients()[0]
  assert.equal(updated.biomarkers.fasting_glucose, 130)
  assert.equal(updated.weight_history.filter(item => item.notes === `Consulta médica: ${saved.id}`).length, 1)
  assert.equal((await getAppointments()).length, 1)
  const [consultation] = await getConsultationsByPatient(patient.id)
  assert.equal(consultation.revisions[1].action, 'reopened')
  assert.equal(consultation.revisions[1].previous.vitals.weight_kg, 70)
  assert.equal(consultation.revisions[1].actor.id, 'doctor')
})

test('un fallo posterior al agendado restaura consulta, citas y ficha para poder reintentar', async () => {
  const patient = getMockPatients()[0]
  const before = new Map(data)
  let failOnce = true
  localStorage.setItem = (key, value) => {
    if (key === 'nutriai_demo_patients_v2' && failOnce) {
      failOnce = false
      throw new DOMException('Sin espacio', 'QuotaExceededError')
    }
    data.set(key, value)
  }
  await assert.rejects(saveConsultationWorkflow(input(patient), patient, true, actor), /Sin espacio/)
  assert.deepEqual(data, before)
  await saveConsultationWorkflow(input(patient), patient, true, actor)
  assert.equal((await getConsultationsByPatient(patient.id)).length, 1)
  assert.equal((await getAppointments()).length, 1)
})

test('anular conserva las versiones y bloquea futuras modificaciones', async () => {
  const patient = getMockPatients()[0]
  const saved = await saveConsultation(input(patient), actor)
  await deleteConsultation(saved.id, 'Registro duplicado', actor)
  const [voided] = await getConsultationsByPatient(patient.id)
  assert.equal(voided.status, 'voided')
  assert.equal(voided.revisions.at(-1).previous.status, 'closed')
  assert.equal(voided.revisions.at(-1).reason, 'Registro duplicado')
  await assert.rejects(saveConsultation({ ...voided, status: 'draft' }, actor, 'Reabrir'), /anulada/)
})

test('un expediente ilegible no se reemplaza por datos vacíos', async () => {
  const patient = getMockPatients()[0]
  const record = await getMedicalRecord(patient)
  data.set('nutriai_medical_records_v1', '{invalid')
  await assert.rejects(saveMedicalRecord(record), /No se sobrescribieron/)
  assert.equal(data.get('nutriai_medical_records_v1'), '{invalid')
})

test('la sincronización desde el expediente conserva la negación explícita y los detalles', async () => {
  const patient = getMockPatients()[0]
  const record = await getMedicalRecord(patient)
  record.allergies = []
  record.review_status = { allergies: 'none' }
  record.medications[0].dose = 'Una tableta'
  await saveMedicalRecord(record)
  await updatePatient(patient.id, { allergies: null, medications: record.medications.map(item => item.name).join(', ') }, { fromMedicalRecord: true })
  const saved = await getMedicalRecord(getMockPatients()[0])
  assert.equal(saved.review_status.allergies, 'none')
  assert.equal(saved.medications[0].dose, 'Una tableta')
  assert.equal(getMockPatients()[0].allergies, null)
})

test('el tratamiento de una consulta no reemplaza los medicamentos habituales del paciente', async () => {
  const patient = getMockPatients()[0]
  const previous = patient.medications
  const saved = await saveConsultationWorkflow({ ...input(patient), follow_up_schedule: undefined,
    medications: [{ id: 'm1', name: 'Medicamento de prueba', presentation: 'Presentación', dose: 'Dosis', route: 'Vía', frequency: 'Frecuencia', duration: 'Duración', instructions: '' }],
  }, patient, false, actor)
  assert.equal(getMockPatients()[0].medications, previous)
  const [loaded] = await getConsultationsByPatient(patient.id)
  assert.deepEqual(loaded.medications, saved.medications)
})
