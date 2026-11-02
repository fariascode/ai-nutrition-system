import { test } from 'node:test'
import assert from 'node:assert/strict'
import { evaluateVitals } from '../src/features/consultations/services/consultations.service.ts'

test('las mediciones sin contexto no se interpretan como glucosa en ayuno', () => {
  assert.equal(evaluateVitals({ glucose: 130 }).length, 0)
  assert.equal(evaluateVitals({ glucose: 130 }, 'random').length, 0)
  assert.equal(evaluateVitals({ glucose: 130 }, 'postprandial').length, 0)
  assert.equal(evaluateVitals({ glucose: 130 }, 'fasting').length, 1)
})
