import { parseLabReportText } from './labAnalyzerEngine'
import type { LabBiomarkers } from '@/types/patient'

export async function readLabTextFile(file: Pick<File, 'name' | 'text'>): Promise<string> {
  if (!/\.(txt|csv)$/i.test(file.name)) {
    throw new Error('La lectura de PDF e imágenes aún no está disponible. Pega los resultados o carga un archivo TXT o CSV; no se han extraído valores del archivo.')
  }
  return file.text()
}

export function extractLabInput(text: string): LabBiomarkers {
  if (!text.trim()) throw new Error('Pega resultados o carga un archivo TXT o CSV antes de analizar.')
  const parsed = parseLabReportText(text)
  const entries = Object.entries(parsed).filter(([, value]) => typeof value === 'number' && Number.isFinite(value))
  if (!entries.length) throw new Error('No se reconocieron valores. Revisa el texto y las unidades del estudio antes de continuar.')
  // La fecha del estudio se confirma aparte; no se supone que sea hoy.
  return Object.fromEntries(entries)
}
