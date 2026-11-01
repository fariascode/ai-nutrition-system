import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle, Archive, ShieldCheck, Copy, Check, Printer,
  Edit3, Eye, Flame, Droplets, Smartphone, Share2,
  ShoppingCart, Scale, FileText,
} from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { updatePlan } from '../services/plans.service'
import { getPatientById } from '@/features/patients/services/patients.service'
import { PROTOCOL_INFO, calculateClinicalMacros } from '@/lib/clinicalEngine'
import GroceryAndSmaeView from './GroceryAndSmaeView'
import type { NutritionPlan, PlanWithPatient, PlanStatus } from '@/types/plan'
import type { Patient } from '@/types/patient'

interface Props {
  open: boolean
  plan: PlanWithPatient | null
  onClose: () => void
  onUpdated: (plan: NutritionPlan) => void
}

const labelClass = 'block text-xs font-bold text-gray-700 mb-1'
const inputClass = 'w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition'

const statusLabel: Record<PlanStatus, string> = {
  draft:     'Borrador en Revisión',
  published: 'Publicado y Activo',
  archived:  'Archivado',
}

const statusColor: Record<PlanStatus, string> = {
  draft:     'bg-amber-100 text-amber-800 border-amber-200',
  published: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  archived:  'bg-gray-100 text-gray-600 border-gray-200',
}

type ModalTab = 'prescription' | 'grocery' | 'smae'

export default function PlanDetailModal({ open, plan, onClose, onUpdated }: Props) {
  const navigate = useNavigate()
  const [content, setContent]         = useState('')
  const [doctorNotes, setDoctorNotes] = useState('')
  const [activeTab, setActiveTab]     = useState<ModalTab>('prescription')
  const [mode, setMode]               = useState<'preview' | 'edit'>('preview')
  const [patient, setPatient]         = useState<Patient | null>(null)
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)
  const [copied, setCopied]           = useState(false)
  const [linkCopied, setLinkCopied]   = useState(false)

  useEffect(() => {
    if (plan) {
      setContent(plan.edited_content ?? plan.ai_generated_content)
      setDoctorNotes(plan.doctor_notes ?? '')
      setSaved(false)
      setMode('preview')
      setActiveTab('prescription')
      getPatientById(plan.patient_id).then(setPatient)
    }
  }, [plan])

  if (!plan) return null

  const fallbackPatient: Patient = patient ?? {
    id: plan.patient_id,
    created_at: plan.created_at,
    updated_at: plan.updated_at,
    doctor_id: plan.doctor_id,
    full_name: plan.patients.full_name,
    birth_date: '1990-01-01',
    gender: 'female',
    weight_kg: 70,
    height_cm: 165,
    goal: 'Salud metabólica',
    allergies: null,
    conditions: null,
    notes: null,
  }

  const macros = plan.macros ?? calculateClinicalMacros(fallbackPatient, plan.protocol ?? 'balanced', plan.calories_target ?? undefined)

  async function handleSave(newStatus?: PlanStatus) {
    if (!plan) return
    setSaving(true)
    try {
      const updated = await updatePlan(plan.id, {
        edited_content: content !== plan.ai_generated_content ? content : null,
        doctor_notes:   doctorNotes || null,
        ...(newStatus ? { status: newStatus } : {}),
      })
      onUpdated(updated)
      setSaved(true)
      if (newStatus) onClose()
    } finally {
      setSaving(false)
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleCopyPatientLink() {
    if (!plan) return
    const url = `${window.location.origin}/portal/${plan.id}`
    const msg = `Hola ${plan.patients.full_name.split(' ')[0]} 👋, aquí tienes el acceso a tu Plan Nutricional Interactivo en NutriAI (menú diario, lista de supermercado inteligente, intercambios SMAE y registro de progreso): ${url}`
    await navigator.clipboard.writeText(msg)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2500)
  }

  function handlePrint() {
    if (!plan) return
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <html>
        <head>
          <title>Plan Nutricional — ${plan.patients.full_name}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; max-width: 820px; margin: 0 auto; }
            h1, h2, h3 { color: #065f46; margin-top: 20px; }
            pre { white-space: pre-wrap; font-family: inherit; font-size: 13px; }
            .header { border-bottom: 2px solid #10b981; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 style="margin:0;">NutriAI — Prescripción Nutricional Clínica</h1>
              <p style="margin:4px 0 0; color:#64748b;">Paciente: <strong>${plan.patients.full_name}</strong> | Fecha: ${new Date(plan.created_at).toLocaleDateString('es-MX')}</p>
            </div>
          </div>
          <pre>${content}</pre>
        </body>
      </html>
    `)
    win.document.close()
    win.print()
  }

  return (
    <Modal
      open={open}
      title={`Prescripción Nutricional — ${plan.patients.full_name}`}
      subtitle={`Creado el ${new Date(plan.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}`}
      size="4xl"
      onClose={onClose}
    >
      <div className="space-y-4">
        {/* Barra superior de estado y acciones rápidas */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${statusColor[plan.status]}`}>
              {statusLabel[plan.status]}
            </span>

            {plan.clinical_efficacy_score && (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                {plan.clinical_efficacy_score}% Eficacia Clínica IA
              </span>
            )}

            {plan.protocol && PROTOCOL_INFO[plan.protocol] && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                {PROTOCOL_INFO[plan.protocol].badge}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {activeTab === 'prescription' && (
              <button
                type="button"
                onClick={() => setMode(mode === 'preview' ? 'edit' : 'preview')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                  mode === 'edit'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {mode === 'preview' ? (
                  <><Edit3 className="w-3.5 h-3.5" /> Editar Plan</>
                ) : (
                  <><Eye className="w-3.5 h-3.5" /> Vista Lectura</>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copiado' : 'Copiar Receta'}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
            >
              <Printer className="w-3.5 h-3.5" /> Imprimir / PDF
            </button>
          </div>
        </div>

        {/* Tarjeta del Portal Móvil Interactivo del Paciente */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-emerald-950">
                Portal Móvil Interactivo del Paciente (PWA)
              </h4>
              <p className="text-[11px] text-emerald-800">
                Checklist de comidas, lista del súper interactiva, equivalentes SMAE y reporte de peso
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyPatientLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-100/60 text-emerald-800 border border-emerald-300 text-xs font-bold transition"
            >
              {linkCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
              {linkCopied ? '¡Enlace copiado!' : 'Copiar Link p/ Paciente'}
            </button>

            <button
              type="button"
              onClick={() => {
                onClose()
                navigate(`/portal/${plan.id}`)
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition"
            >
              <Smartphone className="w-3.5 h-3.5" />
              Abrir App del Paciente →
            </button>
          </div>
        </div>

        {/* Resumen de Macros */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 bg-slate-900 text-white p-3.5 rounded-2xl text-xs">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-400 shrink-0" />
            <div>
              <span className="text-slate-400 block text-[10px]">Meta Diaria</span>
              <span className="font-bold text-sm">{macros.calories} kcal</span>
            </div>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Proteínas ({macros.protein_pct}%)</span>
            <span className="font-bold text-blue-300 text-sm">{macros.protein_g} g</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Carbohidratos ({macros.carbs_pct}%)</span>
            <span className="font-bold text-emerald-300 text-sm">{macros.carbs_g} g</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Lípidos ({macros.fat_pct}%)</span>
            <span className="font-bold text-amber-300 text-sm">{macros.fat_g} g</span>
          </div>
          <div className="flex items-center gap-1.5 col-span-2 sm:col-span-1">
            <Droplets className="w-4 h-4 text-sky-400 shrink-0" />
            <div>
              <span className="text-slate-400 block text-[10px]">Agua / Fibra</span>
              <span className="font-bold text-sky-200 text-sm">{macros.water_liters}L • {macros.fiber_g}g</span>
            </div>
          </div>
        </div>

        {/* Pestañas de Herramientas del Plan: Prescripción | Lista del Súper | Equivalentes SMAE */}
        <div className="flex border-b border-gray-200 gap-1">
          {[
            { id: 'prescription' as ModalTab, label: '1. Prescripción Clínica',           icon: FileText },
            { id: 'grocery' as ModalTab,      label: '2. Lista de Supermercado Inteligente', icon: ShoppingCart },
            { id: 'smae' as ModalTab,         label: '3. Equivalentes Clínicos SMAE',     icon: Scale },
          ].map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-extrabold border-b-2 transition-colors ${
                activeTab === t.id
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50/60 rounded-t-xl'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'prescription' ? (
          <>
            {/* Contenido del plan */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={labelClass}>
                  {mode === 'edit' ? 'Editor Clínico del Plan (Puedes modificar cualquier platillo o porción)' : 'Documento de Prescripción Nutricional'}
                </label>
                {content !== plan.ai_generated_content && (
                  <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                    ✓ Personalizado manualmente por el médico
                  </span>
                )}
              </div>

              {mode === 'edit' ? (
                <textarea
                  rows={14}
                  value={content}
                  onChange={e => { setContent(e.target.value); setSaved(false) }}
                  className={inputClass + ' font-mono leading-relaxed resize-y bg-white'}
                />
              ) : (
                <div className="p-5 rounded-2xl border border-gray-200 bg-slate-50/70 max-h-[380px] overflow-y-auto space-y-2 text-xs text-gray-800 leading-relaxed whitespace-pre-wrap font-sans">
                  {content}
                </div>
              )}
            </div>

            {/* Notas clínicas privadas */}
            <div>
              <label className={labelClass}>
                Notas Clínicas de Seguimiento <span className="text-gray-400 font-normal">(Internas del consultorio)</span>
              </label>
              <textarea
                rows={2}
                value={doctorNotes}
                onChange={e => { setDoctorNotes(e.target.value); setSaved(false) }}
                className={inputClass}
                placeholder="Observaciones de adherencia, laboratorios pendientes, ajustes para la próxima cita..."
              />
            </div>
          </>
        ) : (
          <GroceryAndSmaeView
            patient={fallbackPatient}
            macros={macros}
            protocol={plan.protocol}
            initialSubTab={activeTab === 'grocery' ? 'grocery' : 'smae'}
          />
        )}

        {saved && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium rounded-xl px-4 py-2.5">
            ✓ Cambios guardados en el expediente del paciente.
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100">
          <div>
            {plan.status !== 'archived' && (
              <button
                onClick={() => handleSave('archived')}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <Archive className="w-3.5 h-3.5" /> Archivar Plan
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSave()}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 rounded-xl transition-colors"
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>

            {plan.status === 'draft' && (
              <button
                onClick={() => handleSave('published')}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors"
              >
                <CheckCircle className="w-3.5 h-3.5" /> Validar y Publicar Plan
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
