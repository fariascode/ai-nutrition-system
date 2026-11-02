import type { MedicalRecord } from '@/types/medicalRecord'

export default function MedicalRecordSummary({ record }: { record: MedicalRecord }) {
  const active = record.personal.filter(item => item.status === 'active')
  const medications = record.medications.filter(item => item.status === 'active')
  return (
    <details open className="p-4 rounded-2xl border border-[#E7ECE6] bg-[#F7F8F4] space-y-2 text-xs">
      <summary className="font-extrabold cursor-pointer">Resumen del expediente médico</summary>
      {!record.updated_at && <p>Información precargada de la ficha; expediente aún sin guardar.</p>}
      <p><strong>Alergias registradas:</strong> {record.allergies.length ? record.allergies.map(item =>
        `${item.substance}${item.reaction ? ` (${item.reaction})` : ''}${item.severity === 'severe' ? ' — GRAVE' : ''}`,
      ).join('; ') : 'Sin registros; confirmar con el paciente.'}</p>
      <p><strong>Problemas activos:</strong> {active.map(item => item.condition).join('; ') || 'Sin registros.'}</p>
      <p><strong>Medicamentos vigentes:</strong> {medications.map(item =>
        [item.name, item.dose, item.frequency].filter(Boolean).join(' — '),
      ).join('; ') || 'Sin registros.'}</p>
      <p><strong>Familiares:</strong> {record.family.map(item => `${item.relative}: ${item.condition}`).join('; ') || 'Sin registros.'}</p>
      <p><strong>Cirugías:</strong> {record.surgeries.map(item => [item.procedure, item.year].filter(Boolean).join(' · ')).join('; ') || 'Sin registros.'}</p>
      <p><strong>Hospitalizaciones:</strong> {record.hospitalizations.map(item => [item.reason, item.year].filter(Boolean).join(' · ')).join('; ') || 'Sin registros.'}</p>
    </details>
  )
}
