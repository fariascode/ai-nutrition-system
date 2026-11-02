import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { getMedicalRecord, saveMedicalRecord, syncMedicalRecordFromPatient } from '../src/features/medical-record/services/medicalRecord.service.ts'

beforeEach(() => {
  const data = new Map()
  globalThis.localStorage = {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: key => data.delete(key),
  }
})

test('actualiza la ficha sin perder reacciones, dosis ni antecedentes resueltos', async () => {
  const patient = { id: 'p1', allergies: 'Penicilina', conditions: 'Asma', medications: 'A, B' }
  const record = await getMedicalRecord(patient)
  record.allergies[0] = { ...record.allergies[0], reaction: 'Urticaria', severity: 'severe' }
  record.medications[0].dose = '1 tableta'
  await saveMedicalRecord(record)
  syncMedicalRecordFromPatient(patient, { allergies: 'Penicilina, Látex', conditions: 'Migraña', medications: 'A' })
  const updated = await getMedicalRecord(patient)
  assert.equal(updated.allergies[0].reaction, 'Urticaria')
  assert.equal(updated.allergies[0].severity, 'severe')
  assert.equal(updated.medications[0].dose, '1 tableta')
  assert.equal(updated.medications[1].status, 'suspended')
  assert.equal(updated.personal.find(item => item.condition === 'Asma').status, 'resolved')
  assert.equal(updated.personal.find(item => item.condition === 'Migraña').status, 'active')
})

test('una lista vacía explícita limpia alergias sin borrar otros antecedentes', async () => {
  const patient = { id: 'p1', allergies: 'Látex', conditions: 'Asma' }
  const record = await getMedicalRecord(patient)
  record.family = [{ id: 'f', relative: 'Madre', condition: 'Asma' }]
  await saveMedicalRecord(record)
  syncMedicalRecordFromPatient(patient, { allergies: null })
  const updated = await getMedicalRecord(patient)
  assert.deepEqual(updated.allergies, [])
  assert.equal(updated.family.length, 1)
})
