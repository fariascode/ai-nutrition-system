import { BACKUP_STORES, createLocalBackup, requireLocalDemo } from './localBackup'
import type { BackupData, LocalBackup } from './localBackup'
import { parseLocalBackup } from './backupValidation'

export const RESTORE_JOURNAL_KEY = 'nutriai_local_restore_journal_v1'
export class PendingRestoreError extends Error {}
type RawSnapshot = Record<keyof BackupData, string | null>
export interface PreparedRestore {
  safetyBackup: LocalBackup
  baseline: RawSnapshot
}
const names = Object.keys(BACKUP_STORES) as (keyof BackupData)[]

function captureRaw(): RawSnapshot {
  return Object.fromEntries(names.map(name => [name, localStorage.getItem(BACKUP_STORES[name])])) as RawSnapshot
}

function backupFromRaw(raw: RawSnapshot): LocalBackup {
  const data = Object.fromEntries(names.map(name => [name, raw[name] === null
    ? (['patients', 'plans', 'appointments', 'consultations'].includes(name) ? [] : {})
    : JSON.parse(raw[name]!),
  ]))
  return parseLocalBackup(JSON.stringify({ format: 'nutriai-local-backup', version: 1, createdAt: new Date().toISOString(), mode: 'demo-local', data }))
}

function checkRaw(raw: unknown): asserts raw is RawSnapshot {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Registro de recuperación inválido.')
  const values = raw as Record<string, unknown>
  if (Object.keys(values).length !== names.length || names.some(name => !Object.hasOwn(values, name) || (values[name] !== null && typeof values[name] !== 'string'))) throw new Error('Registro de recuperación incompleto.')
  backupFromRaw(values as RawSnapshot)
}

function writeRaw(raw: RawSnapshot): void {
  for (const name of names) {
    const key = BACKUP_STORES[name]
    if (localStorage.getItem(key) === raw[name]) continue
    if (raw[name] === null) localStorage.removeItem(key)
    else localStorage.setItem(key, raw[name])
  }
}

function checkNoRecovery(): void {
  if (localStorage.getItem(RESTORE_JOURNAL_KEY) !== null) throw new Error('Hay una recuperación pendiente. Recarga la aplicación antes de continuar.')
}

/** Serializa restauración y recuperación entre pestañas que soportan Web Locks. */
async function withRestoreLock<T>(operation: () => T): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks) return navigator.locks.request('nutriai-local-restore', async () => operation())
  return operation()
}

export async function prepareLocalRestore(): Promise<PreparedRestore> {
  requireLocalDemo()
  checkNoRecovery()
  const safetyBackup = parseLocalBackup(JSON.stringify(await createLocalBackup()))
  const baseline = captureRaw()
  if (JSON.stringify(backupFromRaw(baseline).data) !== JSON.stringify(safetyBackup.data)) throw new Error('Los datos cambiaron durante la preparación. Vuelve a descargar la copia previa.')
  return { safetyBackup, baseline }
}

export async function restoreLocalBackup(backup: LocalBackup, prepared: PreparedRestore): Promise<void> {
  requireLocalDemo()
  // Se vuelve a validar al confirmar; la vista previa nunca autoriza escrituras por sí sola.
  const validated = parseLocalBackup(JSON.stringify(backup))
  checkRaw(prepared.baseline)
  if (JSON.stringify(backupFromRaw(prepared.baseline).data) !== JSON.stringify(prepared.safetyBackup.data)) throw new Error('La copia previa no coincide con los datos preparados.')
  const target = Object.fromEntries(names.map(name => [name, JSON.stringify(validated.data[name])])) as RawSnapshot
  await withRestoreLock(() => {
    checkNoRecovery()
    const current = captureRaw()
    if (names.some(name => current[name] !== prepared.baseline[name])) throw new Error('Los datos locales cambiaron después de la copia previa. Descarga una nueva copia antes de restaurar.')
    // Si no hay espacio para proteger los originales, no se inicia el reemplazo.
    localStorage.setItem(RESTORE_JOURNAL_KEY, JSON.stringify({ format: 'nutriai-local-restore', version: 1, previous: current }))
    try {
      writeRaw(target)
      localStorage.removeItem(RESTORE_JOURNAL_KEY)
    } catch {
      try {
        writeRaw(current)
        localStorage.removeItem(RESTORE_JOURNAL_KEY)
      } catch {
        throw new PendingRestoreError('La restauración se interrumpió y la recuperación sigue pendiente. Conserva la copia previa y recarga la aplicación para reintentar la recuperación.')
      }
      throw new Error('No se pudo completar la restauración. Se recuperaron los datos anteriores; no se aplicó el respaldo.')
    }
  })
}

function readJournal(): RawSnapshot | null {
  const raw = localStorage.getItem(RESTORE_JOURNAL_KEY)
  if (raw === null) return null
  try {
    const journal = JSON.parse(raw)
    if (!journal || journal.format !== 'nutriai-local-restore' || journal.version !== 1 || Object.keys(journal).sort().join(',') !== 'format,previous,version') throw new Error()
    checkRaw(journal.previous)
    return journal.previous
  } catch { throw new Error('No se pudo validar el registro de recuperación. No se borró ni se sobrescribió. Conserva tu copia previa antes de reparar el almacenamiento.') }
}

export function pendingRecoveryBackup(): LocalBackup {
  const previous = readJournal()
  if (!previous) throw new Error('No hay una recuperación pendiente.')
  return backupFromRaw(previous)
}

/** Se ejecuta antes de montar los módulos para no leer una restauración incompleta. */
export async function recoverInterruptedRestore(): Promise<boolean> {
  return withRestoreLock(() => {
    const previous = readJournal()
    if (!previous) return false
    try {
      writeRaw(previous)
      localStorage.removeItem(RESTORE_JOURNAL_KEY)
      return true
    } catch { throw new Error('No se pudo recuperar el guardado interrumpido. Los datos anteriores siguen en el registro de recuperación; libera espacio o habilita el almacenamiento y vuelve a intentar.') }
  })
}
