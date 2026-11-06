import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createLocalBackup, backupCounts, BACKUP_STORES } from '../src/features/backups/services/localBackup.ts'

beforeEach(() => {
  const data = new Map()
  globalThis.localStorage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) }
})

test('exporta los datos demo visibles y omite sesiones y preferencias', async () => {
  localStorage.setItem('nutriai_demo_user', JSON.stringify({ token: 'privado' }))
  localStorage.setItem('sb-auth-token', 'secreto')
  localStorage.setItem('nutriai_theme_v1', 'dark')
  const backup = await createLocalBackup()
  assert.equal(backup.version, 1)
  assert.equal(backup.data.patients.length, 3)
  assert.equal(backup.data.plans.length, 2)
  assert.ok(backup.data.appointments.length > 0)
  assert.deepEqual(Object.keys(backup.data), Object.keys(BACKUP_STORES))
  assert.doesNotMatch(JSON.stringify(backup), /privado|secreto|nutriai_theme/)
  assert.equal(backupCounts(backup).find(([label]) => label === 'Pacientes')[1], 3)
})

test('incluye datos guardados sin cambiar consultas ni omitir sus versiones', async () => {
  const consultations = [{ id: 'c1', revisions: [{ action: 'created' }] }]
  localStorage.setItem(BACKUP_STORES.consultations, JSON.stringify(consultations))
  const before = localStorage.getItem(BACKUP_STORES.consultations)
  const backup = await createLocalBackup()
  assert.deepEqual(backup.data.consultations, consultations)
  assert.equal(localStorage.getItem(BACKUP_STORES.consultations), before)
})

test('reporta JSON dañado en lugar de exportarlo como una lista vacía', async () => {
  localStorage.setItem(BACKUP_STORES.consultations, '{roto')
  await assert.rejects(createLocalBackup(), /no se pudieron leer/)
  assert.equal(localStorage.getItem(BACKUP_STORES.consultations), '{roto')
})
