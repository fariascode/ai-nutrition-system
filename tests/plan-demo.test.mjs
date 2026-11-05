import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getMockPatients } from '../src/lib/mockData.ts'
import { generateAndSavePlan } from '../src/features/plans/services/plans.service.ts'

test('los nuevos planes demo son borradores sin puntuaciones de eficacia inventadas', async () => {
  const data = new Map()
  globalThis.localStorage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) }
  const patient = getMockPatients()[0]
  const plan = await generateAndSavePlan(patient, patient.doctor_id, '')
  assert.equal(plan.status, 'draft')
  assert.equal(plan.clinical_efficacy_score, undefined)
  assert.match(plan.ai_generated_content, /BORRADOR DEMOSTRATIVO/)
  assert.match(plan.ai_generated_content, /Requiere revisión profesional/)
  assert.doesNotMatch(plan.ai_generated_content, /Índice de Eficacia|\d+%.*eficacia/i)
})
