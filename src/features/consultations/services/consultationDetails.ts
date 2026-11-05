import type { ConsultationDiagnosis } from '@/types/consultation'

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
