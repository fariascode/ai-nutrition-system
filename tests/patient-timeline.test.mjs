import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildPatientTimeline } from '../src/features/history/services/patientTimeline.service.ts'

const patient = { id: 'p1', updated_at: '2026-11-04T10:00:00Z', weight_history: [{ date: '2026-11-01', weight_kg: 70 }] }
const consultation = { id: 'c1', patient_id: 'p1', date: '2026-11-03', status: 'closed', chief_complaint: 'Control', vitals: { weight_kg: 71 }, diagnoses: [{ name: 'Hallazgo' }], medications: [{ name: 'Tratamiento' }] }
const plan = { id: 'plan1', patient_id: 'p1', created_at: '2026-11-02T14:00:00Z', status: 'published', edited_content: 'Prescripción revisada' }

test('ordena eventos de distintas fuentes y conserva los detalles de la consulta', () => {
  const events = buildPatientTimeline(patient, [consultation], [plan])
  assert.deepEqual(events.map(item => item.kind), ['consultation', 'plan', 'measurement'])
  assert.equal(events[0].data.diagnoses[0].name, 'Hallazgo')
  assert.equal(events[0].data.medications[0].name, 'Tratamiento')
  assert.equal(events[1].data.edited_content, 'Prescripción revisada')
})

test('excluye eventos de otro paciente sin modificar las fuentes', () => {
  const consultations = [consultation, { ...consultation, id: 'other', patient_id: 'p2' }]
  const plans = [plan, { ...plan, id: 'other-plan', patient_id: 'p2' }]
  const snapshot = JSON.stringify({ patient, consultations, plans })
  const events = buildPatientTimeline(patient, consultations, plans)
  assert.equal(events.length, 3)
  assert.equal(JSON.stringify({ patient, consultations, plans }), snapshot)
})

test('el pesaje vinculado a una consulta cerrada aparece una sola vez', () => {
  const p = { ...patient, weight_history: [{ date: consultation.date, weight_kg: 71, notes: 'Consulta médica: c1' }] }
  assert.equal(buildPatientTimeline(p, [consultation], []).length, 1)
  assert.equal(buildPatientTimeline(p, [{ ...consultation, status: 'voided' }], []).length, 2)
})

test('laboratorio representa solo el último conjunto de valores con su fecha registrada', () => {
  const events = buildPatientTimeline({ ...patient, biomarkers: { last_lab_date: '2026-10-10', fasting_glucose: 90 } }, [], [])
  const labs = events.filter(item => item.kind === 'laboratory')
  assert.equal(labs.length, 1)
  assert.equal(labs[0].date, '2026-10-10')
  assert.equal(labs[0].data.fasting_glucose, 90)
})

test('incluye notas SOAP previas y conserva mediciones con datos corporales adicionales', () => {
  const p = { ...patient, weight_history: [{ date: consultation.date, weight_kg: 71, waist_cm: 80, notes: 'Consulta médica: c1' }] }
  const events = buildPatientTimeline(p, [consultation], [], [{ id: 'apt1', patient_id: 'p1', date: '2026-10-01', reason: 'Control anterior', soap_note: { plan: 'Plan anterior' } }, { id: 'apt2', patient_id: 'p2', date: '2026-10-02', soap_note: { plan: 'Otro paciente' } }])
  assert.equal(events.filter(item => item.kind === 'soap').length, 1)
  assert.equal(events.find(item => item.kind === 'measurement').data.waist_cm, 80)
})
