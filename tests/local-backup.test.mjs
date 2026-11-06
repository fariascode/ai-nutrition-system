import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createLocalBackup, backupCounts, BACKUP_STORES } from '../src/features/backups/services/localBackup.ts'
import { parseLocalBackup, backupWarnings } from '../src/features/backups/services/backupValidation.ts'
import { saveConsultation } from '../src/features/consultations/services/consultations.service.ts'

beforeEach(() => {
  const data = new Map()
  globalThis.localStorage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) }
})

test('exporta los datos demo visibles y omite sesiones y preferencias', async () => {
  localStorage.setItem('nutriai_demo_user', JSON.stringify({ token: 'privado' }))
  localStorage.setItem('sb-auth-token', 'secreto')
  localStorage.setItem('nutriai_theme_v1', 'dark')
  const backup = await createLocalBackup()
  assert.equal(backup.version, 2)
  assert.equal(backup.data.patients.length, 3)
  assert.equal(backup.data.plans.length, 2)
  assert.ok(backup.data.appointments.length > 0)
  assert.deepEqual(Object.keys(backup.data), Object.keys(BACKUP_STORES))
  assert.doesNotMatch(JSON.stringify(backup), /privado|secreto|nutriai_theme/)
  assert.equal(backupCounts(backup).find(([label]) => label === 'Pacientes')[1], 3)
})

test('incluye datos guardados sin cambiar consultas ni omitir sus versiones', async () => {
  const patient = (await createLocalBackup()).data.patients[0]
  const consultation = await saveConsultation({ patient_id: patient.id, date: '2026-11-05', status: 'draft', chief_complaint: 'Control', present_illness: '', vitals: {}, exam: {}, assessment: '', plan: '' })
  const before = localStorage.getItem(BACKUP_STORES.consultations)
  const backup = await createLocalBackup()
  assert.deepEqual(backup.data.consultations, [consultation])
  assert.equal(localStorage.getItem(BACKUP_STORES.consultations), before)
})

test('reporta JSON dañado en lugar de exportarlo como una lista vacía', async () => {
  localStorage.setItem(BACKUP_STORES.consultations, '{roto')
  await assert.rejects(createLocalBackup(), /no se pudieron leer/)
  assert.equal(localStorage.getItem(BACKUP_STORES.consultations), '{roto')
})

test('valida el respaldo exportado sin escribir datos y conserva los campos clínicos', async () => {
  const backup = await createLocalBackup()
  const before = Object.values(BACKUP_STORES).map(key => localStorage.getItem(key))
  const parsed = parseLocalBackup(JSON.stringify(backup))
  assert.deepEqual(parsed, backup)
  assert.notEqual(parsed, backup)
  assert.deepEqual(Object.values(BACKUP_STORES).map(key => localStorage.getItem(key)), before)
  assert.deepEqual(backupWarnings(parsed), [])
})

test('rechaza versiones desconocidas, datos incompletos, campos extra y tipos dañados', async () => {
  const backup = await createLocalBackup()
  const invalid = [
    { ...backup, version: 99 }, { ...backup, format: 'otro' },
    { ...backup, data: { patients: [] } },
    { ...backup, session: { token: 'no' } },
    { ...backup, data: { ...backup.data, patients: [{ ...backup.data.patients[0], weight_kg: '68' }] } },
    { ...backup, data: { ...backup.data, patients: [{ ...backup.data.patients[0], biomarkers: { fasting_glucose: {} } }] } },
    { ...backup, data: { ...backup.data, plans: [{ ...backup.data.plans[0], macros: { calories: 2000 } }] } },
    { ...backup, data: { ...backup.data, patients: [backup.data.patients[0], backup.data.patients[0]] } },
  ]
  for (const candidate of invalid) assert.throws(() => parseLocalBackup(JSON.stringify(candidate)), /inválido/)
  assert.throws(() => parseLocalBackup('{'), /JSON/)
  assert.throws(() => parseLocalBackup('{"__proto__":{"polluted":true}}'), /JSON/)
  assert.equal({}.polluted, undefined)
})

test('no oculta registros huérfanos de pacientes borrados y los señala para revisión', async () => {
  const backup = await createLocalBackup()
  backup.data.patients = []
  const parsed = parseLocalBackup(JSON.stringify(backup))
  assert.equal(parsed.data.plans.length, backup.data.plans.length)
  assert.ok(backupWarnings(parsed).some(warning => warning.includes('no tienen su paciente')))
})
