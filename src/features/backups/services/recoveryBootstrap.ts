export const RESTORE_JOURNAL_KEY = 'nutriai_local_restore_journal_v1'

/** No descarga las herramientas de respaldo si no hay una restauración por recuperar. */
export async function recoverBeforeMount(): Promise<boolean> {
  if (localStorage.getItem(RESTORE_JOURNAL_KEY) === null) return false
  let recovery: typeof import('./backupRestore')
  try { recovery = await import('./backupRestore') }
  catch { throw new Error('No se pudo cargar la recuperación. Comprueba tu conexión y recarga la aplicación; los módulos permanecen cerrados y el registro se conserva.') }
  return recovery.recoverInterruptedRestore()
}
