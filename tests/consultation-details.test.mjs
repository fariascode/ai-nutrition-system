import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { saveConsultation, getConsultationsByPatient } from '../src/features/consultations/services/consultations.service.ts'
import { diagnosesToHtml, medicationsToHtml } from '../src/features/consultations/services/consultationDetails.ts'

beforeEach(() => {
  const data = new Map()
  globalThis.localStorage = {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: key => data.delete(key),
  }
})

const consultation = () => ({
  patient_id: 'p1', date: '2026-11-04', status: 'draft', chief_complaint: 'Consulta de prueba',
  present_illness: '', vitals: {}, exam: {}, assessment: '', plan: 'Seguimiento registrado',
})
const diagnosis = (patch = {}) => ({ id: 'd1', name: 'Hallazgo de prueba', role: 'primary', certainty: 'suspected', notes: '', ...patch })
const actor = { id: 'doctor', label: 'Médico de prueba' }
const medication = (patch = {}) => ({ id: 'm1', name: 'Medicamento de prueba', presentation: 'Presentación de prueba', dose: 'Dosis capturada', route: 'Vía capturada', frequency: 'Frecuencia capturada', duration: 'Duración capturada', instructions: 'Instrucción adicional', ...patch })

test('los diagnósticos se conservan al recargar y sus versiones mantienen la certeza anterior', async () => {
  const saved = await saveConsultation({ ...consultation(), status: 'closed', diagnoses: [diagnosis(), diagnosis({ id: 'd2', name: 'Otro hallazgo', role: 'secondary', certainty: 'confirmed' })] }, actor)
  const [loaded] = await getConsultationsByPatient('p1')
  assert.equal(loaded.diagnoses[0].certainty, 'suspected')
  assert.equal(loaded.diagnoses[1].role, 'secondary')
  const reopened = await saveConsultation({ ...loaded, status: 'draft' }, actor, 'Actualizar valoración')
  await saveConsultation({ ...reopened, status: 'closed', diagnoses: reopened.diagnoses.map(item => ({ ...item, certainty: 'confirmed' })) }, actor)
  const [updated] = await getConsultationsByPatient('p1')
  assert.equal(updated.revisions.at(-1).previous.diagnoses[0].certainty, 'suspected')
  assert.equal(updated.diagnoses[0].certainty, 'confirmed')
  assert.equal(updated.id, saved.id)
})

test('rechaza diagnósticos repetidos, filas vacías y selección principal ambigua sin guardar', async () => {
  const invalidLists = [
    [diagnosis({ name: ' ' })],
    [diagnosis({ role: 'secondary' })],
    [diagnosis(), diagnosis({ id: 'd2', name: 'Otro', role: 'primary' })],
    [diagnosis(), diagnosis({ id: 'd2', name: ' HALLAZGO DE PRUEBA ', role: 'secondary' })],
  ]
  for (const diagnoses of invalidLists) await assert.rejects(saveConsultation({ ...consultation(), diagnoses }, actor))
  assert.deepEqual(await getConsultationsByPatient('p1'), [])
})

test('las consultas anteriores conservan su evaluación sin inventar diagnósticos', async () => {
  const legacy = { ...consultation(), id: 'legacy', status: 'closed', assessment: 'Evaluación anterior', created_at: '2026-01-01', updated_at: '2026-01-01' }
  localStorage.setItem('nutriai_consultations_v1', JSON.stringify([legacy]))
  const [loaded] = await getConsultationsByPatient('p1')
  assert.equal(loaded.diagnoses, undefined)
  const reopened = await saveConsultation({ ...loaded, status: 'draft' }, actor, 'Revisión')
  assert.equal(reopened.assessment, 'Evaluación anterior')
  assert.deepEqual(reopened.diagnoses, [])
})

test('la impresión existente escapa el contenido capturado en diagnósticos', () => {
  const html = diagnosesToHtml([diagnosis({ name: '<script>ejemplo</script>', notes: '<img src=x onerror=alert(1)>' })])
  assert.ok(html.includes('&lt;script&gt;'))
  assert.ok(html.includes('&lt;img'))
  assert.ok(!html.includes('<script>'))
  assert.ok(html.includes('Sospecha'))
})

test('el borrador admite detalles pendientes pero el cierre no guarda tratamientos incompletos', async () => {
  const draft = await saveConsultation({ ...consultation(), assessment: 'Valoración', medications: [medication({ dose: '', route: '' })] }, actor)
  await assert.rejects(saveConsultation({ ...draft, status: 'closed' }, actor), /dosis, vía de administración/)
  const [loaded] = await getConsultationsByPatient('p1')
  assert.equal(loaded.status, 'draft')
  assert.equal(loaded.medications[0].dose, '')
  assert.equal(loaded.revisions.length, 1)
})

test('un tratamiento completo puede cerrar la consulta y se conserva al editar sus versiones', async () => {
  const saved = await saveConsultation({ ...consultation(), status: 'closed', plan: '', diagnoses: [diagnosis()], medications: [medication()] }, actor)
  const [loaded] = await getConsultationsByPatient('p1')
  assert.deepEqual(loaded.medications, [medication()])
  const reopened = await saveConsultation({ ...loaded, status: 'draft' }, actor, 'Ajustar instrucciones')
  await saveConsultation({ ...reopened, status: 'closed', medications: [medication({ instructions: 'Instrucción actualizada' })] }, actor)
  const [updated] = await getConsultationsByPatient('p1')
  assert.equal(updated.id, saved.id)
  assert.equal(updated.medications[0].instructions, 'Instrucción actualizada')
  assert.equal(updated.revisions.at(-1).previous.medications[0].instructions, 'Instrucción adicional')
})

test('quitar un medicamento actual no elimina su registro de las versiones anteriores', async () => {
  const saved = await saveConsultation({ ...consultation(), assessment: 'Valoración', medications: [medication(), medication({ id: 'm2', name: 'Otro medicamento' })] }, actor)
  await saveConsultation({ ...saved, medications: saved.medications.filter(item => item.id !== 'm1') }, actor)
  const [updated] = await getConsultationsByPatient('p1')
  assert.deepEqual(updated.medications.map(item => item.id), ['m2'])
  assert.equal(updated.revisions.at(-1).previous.medications.length, 2)
})

test('rechaza filas de medicamento vacías e identificadores repetidos', async () => {
  await assert.rejects(saveConsultation({ ...consultation(), medications: [medication({ name: ' ' })] }, actor), /nombre/)
  await assert.rejects(saveConsultation({ ...consultation(), medications: [medication(), medication()] }, actor), /repetidos/)
  assert.deepEqual(await getConsultationsByPatient('p1'), [])
})

test('todos los campos del tratamiento se escapan en la impresión existente', () => {
  const html = medicationsToHtml([medication({ name: '<script>prueba</script>', instructions: '<img onerror=prueba>', dose: 'A & B' })])
  assert.ok(!html.includes('<script>'))
  assert.ok(!html.includes('<img'))
  assert.ok(html.includes('&lt;script&gt;'))
  assert.ok(html.includes('A &amp; B'))
  assert.ok(html.includes('Vía capturada'))
})
