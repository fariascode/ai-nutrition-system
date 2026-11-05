import type { InstructionsSource, ProfessionalProfile } from '@/types/patientInstructions'
import type { Patient } from '@/types/patient'
import { readLocalJson } from '@/lib/localStorage'
import { diagnosesToHtml, medicationsToHtml } from './consultationDetails'
import type { Consultation, ClinicalActor } from '@/types/consultation'
import type { ApprovedPatientInstructions } from '@/types/patientInstructions'
import { getConsultationsByPatient } from './consultations.service'

const PROFILE_KEY = 'nutriai_professional_profiles_v1'
const APPROVAL_KEY = 'nutriai_patient_instructions_v1'
export const escapeDocumentText = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

export function getProfessionalProfile(actorId: string, defaults: Partial<ProfessionalProfile> = {}): ProfessionalProfile {
  return readLocalJson<Record<string, ProfessionalProfile>>(PROFILE_KEY, {})[actorId] ?? {
    name: '', registration: '', clinic: '', address: '', phone: '', email: '', ...defaults,
  }
}

export function saveProfessionalProfile(actorId: string, profile: ProfessionalProfile): ProfessionalProfile {
  const normalized = Object.fromEntries(Object.entries(profile).map(([key, value]) => [key, value.trim()])) as unknown as ProfessionalProfile
  if (!normalized.name) throw new Error('Captura el nombre del profesional antes de imprimir.')
  const profiles = readLocalJson<Record<string, ProfessionalProfile>>(PROFILE_KEY, {})
  localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...profiles, [actorId]: normalized }))
  return normalized
}

export function renderPatientInstructions(source: InstructionsSource, patient: Pick<Patient, 'full_name' | 'birth_date'>, professional: ProfessionalProfile): string {
  const e = escapeDocumentText
  const heading = source.status === 'draft' ? 'BORRADOR · Consulta sin cerrar' : source.status === 'voided' ? 'ANULADO · No vigente' : 'Indicaciones de consulta'
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Indicaciones — ${e(patient.full_name)}</title>
  <style>body{font:14px/1.55 system-ui,sans-serif;color:#17271e;background:white;max-width:760px;margin:0 auto;padding:28px}h1{font-size:22px;color:#245c47}h2{font-size:15px;border-bottom:1px solid #c9d5cd;padding-bottom:4px;margin-top:22px}p{white-space:pre-wrap;overflow-wrap:anywhere;margin:5px 0}header{border-bottom:2px solid #245c47;padding-bottom:14px}.muted{color:#52685b}.signature{margin-top:48px;border-top:1px solid #52685b;padding-top:8px;break-inside:avoid}h2{break-after:avoid}@page{size:A4;margin:16mm}@media print{body{padding:0;max-width:none}button{display:none}}</style></head><body>
  <header><p class="muted">NutriAI · ${e(heading)}</p><h1>${e(professional.clinic || 'Consultorio médico')}</h1><p><b>Profesional:</b> ${e(professional.name || 'Pendiente de capturar')}</p>
  ${professional.registration ? `<p><b>Cédula / registro profesional:</b> ${e(professional.registration)}</p>` : ''}
  ${professional.address ? `<p>${e(professional.address)}</p>` : ''}${professional.phone || professional.email ? `<p>${e([professional.phone, professional.email].filter(Boolean).join(' · '))}</p>` : ''}</header>
  <h2>Paciente y consulta</h2><p><b>Paciente:</b> ${e(patient.full_name)}</p><p><b>Nacimiento:</b> ${e(patient.birth_date)} · <b>Fecha de consulta:</b> ${e(source.date)}</p>
  ${diagnosesToHtml(source.diagnoses)}${medicationsToHtml(source.medications)}
  ${source.plan.trim() ? `<h2>Indicaciones generales</h2><p>${e(source.plan)}</p>` : ''}
  ${source.follow_up_date || source.follow_up_notes ? `<h2>Seguimiento</h2>${source.follow_up_date ? `<p><b>Fecha indicada:</b> ${e(source.follow_up_date)}</p>` : ''}<p>${e(source.follow_up_notes ?? '')}</p>` : ''}
  <div class="signature"><p>Nombre y firma del profesional: ${e(professional.name)}</p></div></body></html>`
}

function instructionsSource(consultation: InstructionsSource): InstructionsSource {
  const { id, date, status, diagnoses, medications, plan, follow_up_date, follow_up_notes } = consultation
  return { id, date, status, diagnoses: diagnoses ?? [], medications: medications ?? [], plan, follow_up_date: follow_up_date ?? '', follow_up_notes: follow_up_notes ?? '' }
}

function fingerprint(consultation: Consultation): string {
  return JSON.stringify([consultation.updated_at, consultation.revisions?.length ?? 0, instructionsSource(consultation)])
}

export async function approvePatientInstructions(consultationId: string, patient: Patient, professional: ProfessionalProfile, actor: ClinicalActor, expectedSource?: InstructionsSource): Promise<ApprovedPatientInstructions> {
  const consultation = (await getConsultationsByPatient(patient.id)).find(item => item.id === consultationId)
  if (!consultation || consultation.status !== 'closed') throw new Error('Guarda y cierra la consulta antes de aprobar sus indicaciones.')
  if (actor.id !== patient.doctor_id) throw new Error('Esta aprobación debe realizarla el profesional asociado al paciente.')
  if (!professional.name.trim()) throw new Error('Captura el nombre del profesional antes de aprobar.')
  if (expectedSource && JSON.stringify(instructionsSource(expectedSource)) !== JSON.stringify(instructionsSource(consultation))) throw new Error('La consulta cambió desde que abriste la vista previa. Vuelve a abrirla y revisa la versión guardada antes de aprobar.')
  const approval: ApprovedPatientInstructions = {
    consultation_id: consultation.id, patient_id: patient.id,
    patient: { full_name: patient.full_name, birth_date: patient.birth_date },
    approved_at: new Date().toISOString(), actor: { ...actor }, fingerprint: fingerprint(consultation),
    source: instructionsSource(consultation), professional: { ...professional },
  }
  const all = readLocalJson<Record<string, ApprovedPatientInstructions>>(APPROVAL_KEY, {})
  localStorage.setItem(APPROVAL_KEY, JSON.stringify({ ...all, [consultation.id]: approval }))
  return approval
}

export async function getApprovedPatientInstructions(patientId: string, doctorId?: string): Promise<ApprovedPatientInstructions[]> {
  const all = readLocalJson<Record<string, ApprovedPatientInstructions>>(APPROVAL_KEY, {})
  const consultations = await getConsultationsByPatient(patientId)
  return Object.values(all).filter(approval => {
    if (approval.patient_id !== patientId || (doctorId && approval.actor.id !== doctorId)) return false
    const source = consultations.find(item => item.id === approval.consultation_id)
    return source?.status === 'closed' && fingerprint(source) === approval.fingerprint
  }).sort((a, b) => b.source.date.localeCompare(a.source.date) || b.approved_at.localeCompare(a.approved_at))
}

export function revokePatientInstructions(consultationId: string): void {
  const all = readLocalJson<Record<string, ApprovedPatientInstructions>>(APPROVAL_KEY, {})
  delete all[consultationId]
  localStorage.setItem(APPROVAL_KEY, JSON.stringify(all))
}
