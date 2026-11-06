import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { getMockPatients } from '../src/lib/mockData.ts'
import { saveConsultation } from '../src/features/consultations/services/consultations.service.ts'
import { createStudyOrder, getStudyOrders, STUDY_ORDERS_KEY } from '../src/features/study-orders/services/studyOrders.service.ts'
import { renderStudyOrder } from '../src/features/study-orders/services/studyOrderDocument.ts'
import { createLocalBackup } from '../src/features/backups/services/localBackup.ts'
import { parseLocalBackup } from '../src/features/backups/services/backupValidation.ts'
import { prepareLocalRestore, restoreLocalBackup } from '../src/features/backups/services/backupRestore.ts'

beforeEach(() => {
  const data = new Map()
  globalThis.localStorage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) }
})
export async function studyFixture() {
  const patient = getMockPatients()[0]
  const actor = { id: patient.doctor_id, label: 'Profesional QA' }
  const consultation = await saveConsultation({ patient_id: patient.id, date: '2026-11-05', status: 'closed', chief_complaint: 'Control', present_illness: 'Interrogatorio privado', vitals: {}, exam: {}, assessment: 'Evaluación privada', plan: 'Seguimiento' }, actor)
  const input = { patient_id: patient.id, consultation_id: consultation.id, requested_date: '2026-11-05', reason: 'Motivo escrito por el profesional', studies: [{ id: 's1', kind: 'laboratory', name: 'Estudio de prueba', preparation: 'Preparación capturada' }], professional: { name: 'Profesional QA', registration: '', clinic: '', address: '', phone: '', email: '' } }
  return { patient, actor, consultation, input }
}

test('vincula la orden con paciente y consulta y conserva una copia de identidad y profesional', async () => {
  const { input, actor, patient } = await studyFixture()
  const order = await createStudyOrder(input, actor)
  input.professional.name = 'Cambió el formulario'
  assert.equal(order.patient.full_name, patient.full_name)
  assert.equal(order.professional.name, 'Profesional QA')
  assert.equal(order.status, 'requested')
  assert.deepEqual(getStudyOrders(actor.id), [order])
  assert.deepEqual(getStudyOrders('otro-profesional'), [])
})

test('rechaza solicitudes sin consulta propia, desde consultas anuladas o con estudios repetidos', async () => {
  const { input, actor, patient, consultation } = await studyFixture()
  const before = localStorage.getItem(STUDY_ORDERS_KEY)
  for (const invalid of [{ ...input, consultation_id: 'no-existe' }, { ...input, patient_id: getMockPatients()[1].id }, { ...input, reason: ' ' }, { ...input, requested_date: '2026-02-30' }, { ...input, requested_date: '2026-11-04' }, { ...input, studies: [] }, { ...input, studies: [...input.studies, { ...input.studies[0], id: 's2', name: 'ESTUDIO DE PRUEBA' }] }]) await assert.rejects(createStudyOrder(invalid, actor))
  await assert.rejects(createStudyOrder(input, { id: 'otro', label: 'Otro' }))
  await saveConsultation({ ...consultation, status: 'voided' }, actor, 'Prueba')
  await assert.rejects(createStudyOrder(input, actor), /anulada/)
  assert.equal(localStorage.getItem(STUDY_ORDERS_KEY), before)
  assert.equal(patient.id, input.patient_id)
})

test('el documento escapa campos, no expone la nota clínica y marca borradores y anulaciones', async () => {
  const { input, actor } = await studyFixture()
  const order = await createStudyOrder({ ...input, reason: '<script>alert(1)</script>', professional: { ...input.professional, name: '<img src=x onerror=alert(1)>' } }, actor)
  const document = renderStudyOrder(order, 'closed')
  assert.match(document, /&lt;script&gt;/)
  assert.doesNotMatch(document, /<script>|<img|Interrogatorio privado|Evaluación privada/)
  assert.match(renderStudyOrder(order, 'draft'), /BORRADOR/)
  assert.match(renderStudyOrder(order, 'voided'), /Sin vigencia/)
  assert.match(renderStudyOrder({ ...order, status: 'cancelled' }, 'closed'), /CANCELADA/)
})

test('las órdenes entran en respaldos v2 y se restauran sin desaparecer', async () => {
  const { input, actor } = await studyFixture()
  const order = await createStudyOrder(input, actor)
  const backup = await createLocalBackup()
  assert.deepEqual(parseLocalBackup(JSON.stringify(backup)).data.studyOrders, [order])
  localStorage.setItem(STUDY_ORDERS_KEY, '[]')
  await restoreLocalBackup(backup, await prepareLocalRestore())
  assert.deepEqual(getStudyOrders(actor.id), [order])
})

test('importa respaldos v1 sin inventar órdenes y rechaza v2 incompletos', async () => {
  const backup = await createLocalBackup()
  const { studyOrders, ...oldData } = backup.data
  assert.deepEqual(studyOrders, [])
  const legacy = parseLocalBackup(JSON.stringify({ ...backup, version: 1, data: oldData }))
  assert.equal(legacy.version, 2)
  assert.deepEqual(legacy.data.studyOrders, [])
  assert.throws(() => parseLocalBackup(JSON.stringify({ ...backup, data: oldData })), /studyOrders/)
})
