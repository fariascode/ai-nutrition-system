import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { renderPatientInstructions, getProfessionalProfile, saveProfessionalProfile } from '../src/features/consultations/services/patientInstructions.service.ts'

beforeEach(() => {
  const data = new Map()
  globalThis.localStorage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) }
})
const professional = { name: 'Profesional de prueba', registration: 'REG-PRUEBA', clinic: 'Consultorio', address: 'Dirección', phone: 'Teléfono', email: 'prueba@example.com' }
const source = { id: 'c1', date: '2026-11-04', status: 'closed', plan: 'Indicaciones revisadas\nSegunda línea', follow_up_date: '2026-11-20', follow_up_notes: 'Revisión de seguimiento', medications: [{ id: 'm1', name: 'Tratamiento de prueba', presentation: 'Presentación', dose: 'Dosis', route: 'Vía', frequency: 'Frecuencia', duration: 'Duración', instructions: 'Instrucciones' }] }

test('el documento incluye identidad, tratamiento e indicaciones sin exponer el interrogatorio', () => {
  const html = renderPatientInstructions({ ...source, present_illness: 'Texto privado' }, { full_name: 'Paciente de prueba', birth_date: '1990-01-02' }, professional)
  for (const text of ['Paciente de prueba', '1990-01-02', 'REG-PRUEBA', 'Profesional de prueba', 'Tratamiento de prueba', 'Vía', '2026-11-20', 'Indicaciones revisadas']) assert.ok(html.includes(text))
  assert.ok(!html.includes('Texto privado'))
  assert.ok(!html.includes('BORRADOR'))
})

test('los borradores y los documentos anulados no se presentan como indicaciones finalizadas', () => {
  const patient = { full_name: '<script>paciente</script>', birth_date: '1990-01-02' }
  assert.ok(renderPatientInstructions({ ...source, status: 'draft' }, patient, professional).includes('BORRADOR'))
  const html = renderPatientInstructions({ ...source, status: 'voided', plan: '<img onerror=prueba>' }, patient, { ...professional, name: '<script>profesional</script>' })
  assert.ok(html.includes('ANULADO'))
  assert.ok(!html.includes('<script>'))
  assert.ok(!html.includes('<img'))
})

test('los datos profesionales se conservan por usuario y no se inventa una cédula', () => {
  assert.equal(getProfessionalProfile('doctor1', { name: 'Nombre' }).registration, '')
  saveProfessionalProfile('doctor1', professional)
  assert.equal(getProfessionalProfile('doctor1').registration, 'REG-PRUEBA')
  assert.equal(getProfessionalProfile('doctor2').name, '')
  assert.throws(() => saveProfessionalProfile('doctor1', { ...professional, name: ' ' }), /nombre/)
  assert.equal(getProfessionalProfile('doctor1').name, professional.name)
})
