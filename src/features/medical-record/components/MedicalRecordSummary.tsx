import type { MedicalRecord, HistorySection, AllergySeverity } from '@/types/medicalRecord'
import { getHistoryReview } from '../services/medicalRecord.service'

export default function MedicalRecordSummary({ record }: { record: MedicalRecord }) {
  const active = record.personal.filter(item => item.status === 'active')
  const medications = record.medications.filter(item => item.status === 'active')
  const empty = (section: HistorySection) => getHistoryReview(record, section) === 'none'
    ? 'Interrogado: el paciente lo niega.' : 'Sin información confirmada; pendiente de interrogar.'
  const severity: Record<AllergySeverity, string> = { unknown: 'gravedad por confirmar', mild: 'leve', moderate: 'moderada', severe: 'GRAVE' }
  return (
    <details open className="p-4 rounded-2xl border border-[#E7ECE6] bg-[#F7F8F4] space-y-2 text-xs">
      <summary className="font-extrabold cursor-pointer">Resumen del expediente médico</summary>
      {!record.updated_at && <p>Información precargada de la ficha; expediente aún sin guardar.</p>}
      <p><strong>Alergias registradas:</strong> {record.allergies.length ? record.allergies.map(item =>
        `${item.substance}${item.reaction ? ` (${item.reaction})` : ''} — ${severity[item.severity] ?? severity.unknown}`,
      ).join('; ') : empty('allergies')}</p>
      <p><strong>Problemas activos:</strong> {active.map(item => item.condition).join('; ') || (record.personal.length ? 'Sin problemas activos; hay antecedentes resueltos.' : empty('personal'))}</p>
      <p><strong>Medicamentos vigentes:</strong> {medications.map(item =>
        [item.name, item.dose, item.frequency].filter(Boolean).join(' — '),
      ).join('; ') || (record.medications.length ? 'Sin medicamentos vigentes; hay registros suspendidos.' : empty('medications'))}</p>
      <p><strong>Familiares:</strong> {record.family.map(item => `${item.relative}: ${item.condition}`).join('; ') || empty('family')}</p>
      <p><strong>Cirugías:</strong> {record.surgeries.map(item => [item.procedure, item.year].filter(Boolean).join(' · ')).join('; ') || empty('surgeries')}</p>
      <p><strong>Hospitalizaciones:</strong> {record.hospitalizations.map(item => [item.reason, item.year].filter(Boolean).join(' · ')).join('; ') || empty('hospitalizations')}</p>
      <p><strong>Tabaco:</strong> {{ unknown: 'No interrogado', never: 'Nunca ha fumado', former: 'Exfumador', current: 'Fumador actual' }[record.habits.smoking] ?? 'No interrogado'}.
        {' '}<strong>Alcohol:</strong> {{ unknown: 'No interrogado', none: 'Niega consumo', occasional: 'Ocasional', frequent: 'Frecuente' }[record.habits.alcohol] ?? 'No interrogado'}.</p>
      <p><strong>Hábitos:</strong> Sueño: {record.habits.sleep_hours !== undefined ? `${record.habits.sleep_hours} h` : 'sin registro'}; agua: {record.habits.water_liters !== undefined ? `${record.habits.water_liters} L/día` : 'sin registro'}; ejercicio: {record.habits.exercise_per_week !== undefined ? `${record.habits.exercise_per_week} días/semana` : 'sin registro'}.</p>
      {record.habits.diet_notes && <p><strong>Alimentación:</strong> {record.habits.diet_notes}</p>}
      {record.habits.other && <p><strong>Otros hábitos:</strong> {record.habits.other}</p>}
    </details>
  )
}
