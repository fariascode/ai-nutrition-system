import { escapeDocumentText as e } from '@/features/consultations/services/patientInstructions.service'
import { STUDY_KIND_LABELS } from '@/types/studyOrder'
import type { StudyOrder } from '@/types/studyOrder'
import type { ConsultationStatus } from '@/types/consultation'

export function renderStudyOrder(order: StudyOrder, consultationStatus: ConsultationStatus): string {
  const heading = order.status === 'cancelled' || consultationStatus === 'voided' ? 'CANCELADA · Sin vigencia' : consultationStatus === 'draft' ? 'BORRADOR · Consulta sin cerrar' : 'Solicitud de estudios'
  const p = order.professional
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Estudios — ${e(order.patient.full_name)}</title>
  <style>body{font:14px/1.6 system-ui,sans-serif;color:#17271e;background:white;max-width:760px;margin:auto;padding:28px}h1{font-size:22px;color:#245c47}h2{font-size:16px;border-bottom:1px solid #ccd8cf;margin-top:24px}p{white-space:pre-wrap;overflow-wrap:anywhere}li{margin:14px 0;break-inside:avoid}.muted{color:#52685b}.signature{margin-top:48px;border-top:1px solid;padding-top:10px}@page{size:A4;margin:16mm}@media print{body{padding:0}}</style></head><body>
  <header><p class="muted">NutriAI · ${e(heading)}</p><h1>${e(p.clinic || 'Consultorio médico')}</h1><p><b>Profesional solicitante:</b> ${e(p.name)}</p>
  ${p.registration ? `<p><b>Cédula / registro:</b> ${e(p.registration)}</p>` : ''}${p.address ? `<p>${e(p.address)}</p>` : ''}${p.phone || p.email ? `<p>${e([p.phone, p.email].filter(Boolean).join(' · '))}</p>` : ''}</header>
  <h2>Paciente y solicitud</h2><p><b>Paciente:</b> ${e(order.patient.full_name)}<br><b>Nacimiento:</b> ${e(order.patient.birth_date)}<br><b>Fecha:</b> ${e(order.requested_date)}<br><b>Folio:</b> ${e(order.id)}</p>
  <h2>Motivo de la solicitud</h2><p>${e(order.reason)}</p>
  <h2>Estudios solicitados</h2><ol>${order.studies.map(study => `<li><b>${e(study.name)}</b> · ${e(STUDY_KIND_LABELS[study.kind])}${study.preparation ? `<p>Indicaciones de preparación: ${e(study.preparation)}</p>` : ''}</li>`).join('')}</ol>
  <div class="signature">Nombre y firma del profesional: ${e(p.name)}</div></body></html>`
}
