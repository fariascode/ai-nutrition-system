export const CLINICAL_STORAGE_KEYS = [
  'nutriai_consultations_v1', 'nutriai_medical_records_v1',
  'nutriai_demo_patients_v2', 'nutriai_demo_appointments_v1',
  'nutriai_patient_instructions_v1',
]

export function readLocalJson<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key)
  if (raw === null) return fallback
  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed) !== Array.isArray(fallback)) throw new Error()
    return parsed as T
  } catch {
    throw new Error('Los datos locales no se pudieron leer. No se sobrescribieron; conserva una copia antes de intentar recuperarlos.')
  }
}

/** Revierte las escrituras locales de una operación si falla alguno de sus pasos. */
export async function withLocalRollback<T>(operation: () => Promise<T>): Promise<T> {
  const previous = CLINICAL_STORAGE_KEYS.map(key => [key, localStorage.getItem(key)] as const)
  try {
    return await operation()
  } catch (error) {
    try {
      for (const [key, value] of previous) {
        if (localStorage.getItem(key) === value) continue
        if (value === null) localStorage.removeItem(key)
        else localStorage.setItem(key, value)
      }
    } catch {
      throw new Error('No se pudo completar ni restaurar el guardado local. Conserva esta pantalla y revisa el almacenamiento del navegador.')
    }
    throw error
  }
}

export function storageError(error: unknown): string {
  if (error instanceof DOMException && (error.name === 'QuotaExceededError' || error.name === 'SecurityError')) {
    return 'El navegador bloqueó el almacenamiento o se quedó sin espacio. Tus cambios siguen en el formulario; libera espacio o habilita el almacenamiento e intenta de nuevo.'
  }
  return error instanceof Error ? error.message : 'No se pudo guardar. Conserva tus cambios e intenta de nuevo.'
}
