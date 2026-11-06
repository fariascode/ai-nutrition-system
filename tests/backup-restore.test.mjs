import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createLocalBackup, BACKUP_STORES } from '../src/features/backups/services/localBackup.ts'
import { prepareLocalRestore, restoreLocalBackup, recoverInterruptedRestore, pendingRecoveryBackup, RESTORE_JOURNAL_KEY } from '../src/features/backups/services/backupRestore.ts'
import { saveConsultation } from '../src/features/consultations/services/consultations.service.ts'
import { getMedicalRecord, saveMedicalRecord } from '../src/features/medical-record/services/medicalRecord.service.ts'
import { approvePatientInstructions, saveProfessionalProfile, getApprovedPatientInstructions } from '../src/features/consultations/services/patientInstructions.service.ts'
import { parseLocalBackup } from '../src/features/backups/services/backupValidation.ts'

let store
beforeEach(() => {
  store = new Map()
  globalThis.localStorage = { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, value), removeItem: key => store.delete(key) }
})
const raw = () => Object.fromEntries(Object.values(BACKUP_STORES).map(key => [key, localStorage.getItem(key)]))
const journal = previous => JSON.stringify({ format: 'nutriai-local-restore', version: 1, previous })

async function fullBackup() {
  const initial = await createLocalBackup()
  const patient = initial.data.patients[0]
  const actor = { id: patient.doctor_id, label: 'Profesional demo' }
  const record = await getMedicalRecord(patient)
  await saveMedicalRecord(record)
  const profile = { name: 'Profesional de prueba', registration: 'Registro QA', clinic: '', address: '', phone: '', email: '' }
  saveProfessionalProfile(actor.id, profile)
  const draft = await saveConsultation({ patient_id: patient.id, date: '2026-11-05', status: 'draft', chief_complaint: 'Revisión', present_illness: 'Nota privada', vitals: { weight_kg: 68 }, exam: {}, assessment: 'Evaluación', plan: 'Indicaciones de prueba' }, actor)
  // No pasar revisions al input: su historial se incorpora por el servicio.
  const { revisions, ...input } = draft
  assert.equal(revisions.length, 1)
  const closed = await saveConsultation({ ...input, status: 'closed' }, actor)
  await approvePatientInstructions(closed.id, patient, profile, actor)
  return createLocalBackup()
}

test('restaura todos los módulos y versiones sin alterar sesión, tema ni otros datos del navegador', async () => {
  const target = await fullBackup()
  parseLocalBackup(JSON.stringify(target))
  for (const key of Object.values(BACKUP_STORES)) localStorage.removeItem(key)
  localStorage.setItem('nutriai_demo_user', 'sesión-actual')
  localStorage.setItem('nutriai_theme_v1', 'dark')
  localStorage.setItem('otro-sistema', 'conservar')
  const prepared = await prepareLocalRestore()
  await restoreLocalBackup(target, prepared)
  assert.deepEqual((await createLocalBackup()).data, target.data)
  assert.equal(localStorage.getItem(RESTORE_JOURNAL_KEY), null)
  assert.equal(localStorage.getItem('nutriai_demo_user'), 'sesión-actual')
  assert.equal(localStorage.getItem('nutriai_theme_v1'), 'dark')
  assert.equal(localStorage.getItem('otro-sistema'), 'conservar')
  assert.equal((await getApprovedPatientInstructions(target.data.patients[0].id)).length, 1)
  assert.equal(target.data.consultations[0].revisions.length, 2)
})

test('un respaldo vacío se restaura sin reintroducir pacientes, planes ni citas demo', async () => {
  const target = await createLocalBackup()
  for (const name of Object.keys(BACKUP_STORES)) target.data[name] = Array.isArray(target.data[name]) ? [] : {}
  await restoreLocalBackup(target, await prepareLocalRestore())
  assert.deepEqual((await createLocalBackup()).data, target.data)
})

test('rechaza una vista previa inválida y una copia previa obsoleta sin tocar datos', async () => {
  const backup = await createLocalBackup()
  const prepared = await prepareLocalRestore()
  const patients = JSON.parse(localStorage.getItem(BACKUP_STORES.patients))
  patients[0].notes = 'Cambio posterior que debe conservarse'
  localStorage.setItem(BACKUP_STORES.patients, JSON.stringify(patients))
  const before = raw()
  await assert.rejects(restoreLocalBackup(backup, prepared), /cambiaron después/)
  await assert.rejects(restoreLocalBackup({ ...backup, version: 99 }, prepared), /inválido/)
  assert.deepEqual(raw(), before)
  assert.equal(localStorage.getItem(RESTORE_JOURNAL_KEY), null)
})

test('si no cabe el registro de protección no comienza a reemplazar datos', async () => {
  const backup = await createLocalBackup()
  const prepared = await prepareLocalRestore()
  const before = raw()
  localStorage.setItem = (key, value) => {
    if (key === RESTORE_JOURNAL_KEY) throw new DOMException('Sin espacio', 'QuotaExceededError')
    store.set(key, value)
  }
  await assert.rejects(restoreLocalBackup(backup, prepared), /Sin espacio/)
  assert.deepEqual(raw(), before)
})

test('un fallo a mitad del reemplazo revierte incluso claves que no existían', async () => {
  const backup = await fullBackup()
  localStorage.removeItem(BACKUP_STORES.consultations)
  localStorage.removeItem(BACKUP_STORES.medicalRecords)
  const prepared = await prepareLocalRestore()
  const before = raw()
  let failed = false
  localStorage.setItem = (key, value) => {
    if (key === BACKUP_STORES.medicalRecords && !failed) { failed = true; throw new DOMException('Sin espacio', 'QuotaExceededError') }
    store.set(key, value)
  }
  await assert.rejects(restoreLocalBackup(backup, prepared), /Se recuperaron los datos anteriores/)
  assert.deepEqual(raw(), before)
  assert.equal(localStorage.getItem(RESTORE_JOURNAL_KEY), null)
})

test('si falla también la reversión mantiene la recuperación y la completa en el siguiente arranque', async () => {
  const backup = await createLocalBackup()
  const prepared = await prepareLocalRestore()
  const before = raw()
  backup.data.patients[0].notes = 'Importado'
  backup.data.plans[0].doctor_notes = 'Cambio'
  let interrupted = false
  localStorage.setItem = (key, value) => {
    if (key === BACKUP_STORES.plans) { interrupted = true; throw new Error('Fallo de escritura') }
    if (interrupted && key === BACKUP_STORES.patients) throw new Error('Fallo de reversión')
    store.set(key, value)
  }
  await assert.rejects(restoreLocalBackup(backup, prepared), /recuperación sigue pendiente/)
  assert.notEqual(localStorage.getItem(RESTORE_JOURNAL_KEY), null)
  assert.deepEqual(pendingRecoveryBackup().data, prepared.safetyBackup.data)
  localStorage.setItem = (key, value) => store.set(key, value)
  assert.equal(await recoverInterruptedRestore(), true)
  assert.deepEqual(raw(), before)
  assert.equal(localStorage.getItem(RESTORE_JOURNAL_KEY), null)
  assert.equal(await recoverInterruptedRestore(), false)
})

test('la recuperación tras interrupción devuelve los valores originales antes de leer módulos', async () => {
  const prepared = await prepareLocalRestore()
  const before = raw()
  localStorage.setItem(RESTORE_JOURNAL_KEY, journal(prepared.baseline))
  localStorage.setItem(BACKUP_STORES.patients, '[]')
  assert.equal(await recoverInterruptedRestore(), true)
  assert.deepEqual(raw(), before)
})

test('no ejecuta claves arbitrarias de un registro de recuperación dañado ni lo borra', async () => {
  const prepared = await prepareLocalRestore()
  const forged = journal({ ...prepared.baseline, nutriai_demo_user: 'sesión ajena' })
  const before = raw()
  localStorage.setItem(RESTORE_JOURNAL_KEY, forged)
  await assert.rejects(recoverInterruptedRestore(), /validar el registro/)
  assert.deepEqual(raw(), before)
  assert.equal(localStorage.getItem(RESTORE_JOURNAL_KEY), forged)
  assert.equal(localStorage.getItem('nutriai_demo_user'), null)
})

test('recupera un registro de la versión anterior sin la colección de órdenes', async () => {
  const prepared = await prepareLocalRestore()
  const { studyOrders, ...previous } = prepared.baseline
  assert.equal(studyOrders, null)
  localStorage.setItem(RESTORE_JOURNAL_KEY, journal(previous))
  localStorage.setItem(BACKUP_STORES.patients, '[]')
  assert.equal(await recoverInterruptedRestore(), true)
  assert.deepEqual((await createLocalBackup()).data, prepared.safetyBackup.data)
})
