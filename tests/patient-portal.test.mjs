import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { getMockPatients } from '../src/lib/mockData.ts'
import { getPlanById, updatePlan } from '../src/features/plans/services/plans.service.ts'
import { publishedPlanContent, getPatientPortalData } from '../src/features/portal/services/patientPortal.service.ts'
import { saveConsultation } from '../src/features/consultations/services/consultations.service.ts'
import { approvePatientInstructions, getApprovedPatientInstructions, revokePatientInstructions } from '../src/features/consultations/services/patientInstructions.service.ts'

beforeEach(() => {
  const data = new Map()
  globalThis.localStorage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) }
})
const professional = { name: 'Profesional de prueba', registration: '', clinic: '', address: '', phone: '', email: '' }
const actor = { id: 'demo-doctor-uuid-1234', label: 'Médico demo' }
const consultation = patient => ({ patient_id: patient.id, date: '2026-11-04', status: 'closed', chief_complaint: 'Control', present_illness: 'Texto privado', vitals: {}, exam: {}, assessment: 'Evaluación privada', plan: 'Indicación revisada', diagnoses: [], medications: [] })

test('el portal usa exactamente la edición publicada y no permite borradores, archivados o contenido vacío', () => {
  const plan = { status: 'published', edited_content: 'Texto revisado\nSin sustituciones', ai_generated_content: 'Texto IA anterior' }
  assert.equal(publishedPlanContent(plan), plan.edited_content)
  assert.equal(publishedPlanContent({ ...plan, status: 'draft' }), null)
  assert.equal(publishedPlanContent({ ...plan, status: 'archived' }), null)
  assert.equal(publishedPlanContent({ ...plan, edited_content: ' ' }), null)
})

test('editar un plan publicado retira el acceso hasta su publicación explícita', async () => {
  await updatePlan('plan-1', { edited_content: 'Versión aprobada de prueba', status: 'published' })
  assert.equal((await getPatientPortalData({ planId: 'plan-1' })).content, 'Versión aprobada de prueba')
  await updatePlan('plan-1', { edited_content: 'Versión nueva en revisión' })
  assert.equal((await getPlanById('plan-1')).status, 'draft')
  assert.equal(await getPatientPortalData({ planId: 'plan-1' }), null)
  await updatePlan('plan-1', { status: 'published' })
  assert.equal((await getPatientPortalData({ planId: 'plan-1' })).content, 'Versión nueva en revisión')
})

test('las notas internas no alteran la publicación y una prescripción vacía no se puede publicar', async () => {
  await updatePlan('plan-1', { doctor_notes: 'Nota interna' })
  assert.equal((await getPlanById('plan-1')).status, 'published')
  await assert.rejects(updatePlan('plan-1', { edited_content: '', status: 'published' }), /vacía/)
  assert.ok((await getPatientPortalData({ planId: 'plan-1' })).content)
  const portal = await getPatientPortalData({ planId: 'plan-1' })
  assert.equal(portal.plan.doctor_notes, undefined)
  assert.equal(portal.patient.conditions, undefined)
  assert.ok(portal.patient.weight_history.every(record => record.notes === undefined))
})

test('el acceso por paciente admite indicaciones aprobadas aunque no exista un plan nutricional', async () => {
  const patient = getMockPatients()[2]
  const saved = await saveConsultation(consultation(patient), actor)
  assert.equal(await getPatientPortalData({ patientId: patient.id }), null)
  const approval = await approvePatientInstructions(saved.id, patient, professional, actor)
  const portal = await getPatientPortalData({ patientId: patient.id })
  assert.equal(portal.plan, null)
  assert.equal(portal.instructions[0].source.plan, 'Indicación revisada')
  assert.equal(portal.instructions[0].source.present_illness, undefined)
  assert.equal(portal.instructions[0].source.assessment, undefined)
  assert.equal(approval.patient_id, patient.id)
  assert.deepEqual(await getApprovedPatientInstructions(patient.id, 'otro-doctor'), [])
})

test('reabrir, modificar y volver a cerrar exige una nueva aprobación de indicaciones', async () => {
  const patient = getMockPatients()[2]
  const saved = await saveConsultation(consultation(patient), actor)
  await approvePatientInstructions(saved.id, patient, professional, actor)
  const reopened = await saveConsultation({ ...saved, status: 'draft' }, actor, 'Revisar indicaciones')
  assert.deepEqual(await getApprovedPatientInstructions(patient.id), [])
  const closed = await saveConsultation({ ...reopened, status: 'closed', plan: 'Indicación nueva' }, actor)
  assert.deepEqual(await getApprovedPatientInstructions(patient.id), [])
  await approvePatientInstructions(closed.id, patient, professional, actor)
  assert.equal((await getApprovedPatientInstructions(patient.id))[0].source.plan, 'Indicación nueva')
  revokePatientInstructions(closed.id)
  assert.equal(await getPatientPortalData({ patientId: patient.id }), null)
})

test('no aprueba borradores ni indicaciones de un paciente ajeno al profesional', async () => {
  const patient = getMockPatients()[2]
  const saved = await saveConsultation({ ...consultation(patient), status: 'draft' }, actor)
  await assert.rejects(approvePatientInstructions(saved.id, patient, professional, actor), /cierra/)
  const closed = await saveConsultation({ ...saved, status: 'closed' }, actor)
  await assert.rejects(approvePatientInstructions(closed.id, patient, professional, { id: 'other', label: 'Otro' }), /asociado/)
  assert.deepEqual(await getApprovedPatientInstructions(patient.id), [])
})

test('una vista previa antigua no aprueba cambios que el profesional todavía no ha revisado', async () => {
  const patient = getMockPatients()[2]
  const first = await saveConsultation(consultation(patient), actor)
  const reopened = await saveConsultation({ ...first, status: 'draft' }, actor, 'Cambiar indicaciones')
  await saveConsultation({ ...reopened, status: 'closed', plan: 'Cambio de otra pestaña' }, actor)
  await assert.rejects(approvePatientInstructions(first.id, patient, professional, actor, first), /cambió/)
  assert.deepEqual(await getApprovedPatientInstructions(patient.id), [])
})
