import type { ConsultationDiagnosis, ConsultationMedication } from '@/types/consultation'

export const DIAGNOSIS_CERTAINTY = { suspected: 'Sospecha', confirmed: 'Confirmado' } as const

export function normalizeDiagnoses(items: ConsultationDiagnosis[] = []): ConsultationDiagnosis[] {
  const ids = new Set<string>()
  const names = new Set<string>()
  const normalized = items.map(item => {
    const name = item.name.trim()
    if (!item.id || !name) throw new Error('Completa el nombre de cada diagnóstico o elimina las filas vacías.')
    if (!['primary', 'secondary'].includes(item.role) || !['suspected', 'confirmed'].includes(item.certainty)) {
      throw new Error('Revisa el tipo y la certeza de los diagnósticos.')
    }
    const key = name.toLocaleLowerCase('es-MX')
    if (ids.has(item.id) || names.has(key)) throw new Error('Hay diagnósticos repetidos. Conserva una sola entrada por diagnóstico.')
    ids.add(item.id)
    names.add(key)
    return { ...item, name, notes: item.notes.trim() }
  })
  if (normalized.length && normalized.filter(item => item.role === 'primary').length !== 1) {
    throw new Error('Selecciona un único diagnóstico principal para esta consulta.')
  }
  return normalized
}

const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function diagnosesToHtml(items: ConsultationDiagnosis[] = []): string {
  if (!items.length) return ''
  return `<h2>Diagnósticos</h2>${items.map(item => `<p><b>${item.role === 'primary' ? 'Principal' : 'Secundario'} · ${DIAGNOSIS_CERTAINTY[item.certainty]}:</b> ${escapeHtml(item.name)}${item.notes ? `<br>${escapeHtml(item.notes)}` : ''}</p>`).join('')}`
}

export const MEDICATION_FIELDS = [
  { key: 'name', label: 'Medicamento' },
  { key: 'presentation', label: 'Presentación y concentración' },
  { key: 'dose', label: 'Dosis' },
  { key: 'route', label: 'Vía de administración' },
  { key: 'frequency', label: 'Frecuencia' },
  { key: 'duration', label: 'Duración' },
  { key: 'instructions', label: 'Instrucciones adicionales' },
] as const

export function normalizeMedications(items: ConsultationMedication[] = [], closing = false): ConsultationMedication[] {
  const ids = new Set<string>()
  return items.map(item => {
    if (!item.id || ids.has(item.id)) throw new Error('Hay registros de tratamiento repetidos. Revisa la lista.')
    ids.add(item.id)
    const normalized = { ...item }
    for (const { key } of MEDICATION_FIELDS) normalized[key] = item[key].trim()
    if (!normalized.name) throw new Error('Completa el nombre del medicamento o elimina la fila vacía.')
    if (closing) {
      const missing = MEDICATION_FIELDS.filter(field => field.key !== 'instructions' && !normalized[field.key])
      if (missing.length) throw new Error(`Completa el tratamiento de ${normalized.name}: ${missing.map(field => field.label.toLowerCase()).join(', ')}.`)
    }
    return normalized
  })
}

export function medicationsToHtml(items: ConsultationMedication[] = []): string {
  if (!items.length) return ''
  return `<h2>Tratamiento registrado</h2>${items.map((item, index) => `<p><b>${index + 1}. ${escapeHtml(item.name)}</b></p>${MEDICATION_FIELDS.filter(field => field.key !== 'name').map(field => `<p><b>${field.label}:</b> ${escapeHtml(item[field.key] || 'Sin registro')}</p>`).join('')}`).join('<br>')}`
}
