import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { saveConsultation, getConsultationsByPatient } from '../src/features/consultations/services/consultations.service.ts'
import { diagnosesToHtml } from '../src/features/consultations/services/consultationDetails.ts'

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
