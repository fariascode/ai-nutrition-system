import { useState, useEffect, type ChangeEvent } from 'react'
import {
  Microscope, Upload, Sparkles, AlertTriangle,
  FileText, Activity, Pill, ShieldCheck, ArrowRight,
} from 'lucide-react'
import Modal from '@/components/ui/Modal'
import {
  SAMPLE_LAB_PRESETS,
  interpretBiomarkers,
} from '@/lib/labAnalyzerEngine'
import { PROTOCOL_INFO } from '@/lib/clinicalEngine'
import { extractLabInput, readLabTextFile } from '@/lib/labInput'
import type { Patient, LabBiomarkers } from '@/types/patient'

interface Props {
  open: boolean
  patient: Patient | null
  onClose: () => void
  onSaveBiomarkers: (
    patientId: string,
    biomarkers: LabBiomarkers,
    updatedConditions?: string,
    updatedMedications?: string,
  ) => Promise<void>
  onGeneratePlanAfterSave?: (patientId: string) => void
}

type Step = 'input' | 'review'

export default function LabScannerModal({
  open,
  patient,
  onClose,
  onSaveBiomarkers,
  onGeneratePlanAfterSave,
}: Props) {
  const [step, setStep]                   = useState<Step>('input')
  const [rawText, setRawText]             = useState('')
  const [fileName, setFileName]           = useState<string | null>(null)
  const [example, setExample]             = useState(false)
  const [error, setError]                 = useState<string | null>(null)
  const [reading, setReading]             = useState(false)
  const [bio, setBio]                     = useState<LabBiomarkers>({})
  const [syncConditions, setSyncConditions] = useState(false)
  const [saving, setSaving]               = useState(false)

  useEffect(() => {
    if (open && patient) {
      setStep('input')
      setRawText('')
      setFileName(null)
      setBio(patient.biomarkers ?? {})
      setSyncConditions(false)
      setExample(false)
      setError(null)
    }
  }, [open, patient])

  if (!patient) return null

  function handlePresetClick(presetId: string) {
    const found = SAMPLE_LAB_PRESETS.find(p => p.id === presetId)
    if (!found) return
    setRawText(found.sampleText)
    setFileName(null)
    setExample(true)
    setError(null)
  }

  async function handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setRawText('')
    setFileName(null)
    setExample(false)
    setError(null)
    setReading(true)
    try {
      const text = await readLabTextFile(file)
      setRawText(text)
      setFileName(file.name)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo leer el archivo.')
    } finally {
      setReading(false)
      e.target.value = ''
    }
  }

  function startAiAnalysis() {
    try {
      setBio(extractLabInput(rawText))
      setError(null)
      setStep('review')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo analizar el texto.')
    }
  }

  function updateBioValue(key: keyof LabBiomarkers, val: string) {
    const num = val === '' ? undefined : parseFloat(val)
    setBio(prev => ({ ...prev, [key]: num }))
  }

  const interpretation = interpretBiomarkers(bio, patient.gender)

  async function handleConfirmSave(andGeneratePlan = false) {
    if (!patient || example || !bio.last_lab_date) return
    setSaving(true)
    try {
      const newConditions =
        syncConditions && interpretation.detectedConditions.length > 0
          ? interpretation.detectedConditions.join(', ')
          : patient.conditions ?? undefined

      const newMedications =
        syncConditions && interpretation.suggestedSupplements.length > 0
          ? [patient.medications, ...interpretation.suggestedSupplements]
              .filter(Boolean)
              .join(' • ')
          : patient.medications ?? undefined

      await onSaveBiomarkers(patient.id, bio, newConditions, newMedications)
      onClose()
      if (andGeneratePlan && onGeneratePlanAfterSave) {
        onGeneratePlanAfterSave(patient.id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar los resultados.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      title={`🔬 Revisión de laboratorio — ${patient.full_name}`}
      subtitle="Lectura de texto y cálculos locales. Verifica valores, unidades y fecha con el estudio original."
      size="4xl"
      onClose={reading || saving ? () => {} : onClose}
    >
      {error && <p role="alert" className="mb-3 text-sm text-danger">{error}</p>}
      {example && <div className="mb-3 p-3 rounded-xl bg-warning-soft text-warning text-sm" role="status">
        Ejemplo ficticio: estos valores no pertenecen al paciente y no se pueden guardar.
        <button type="button" disabled={reading} onClick={() => { setExample(false); setRawText(''); setBio({}); setFileName(null); setError(null); setStep('input') }} className="block mt-2 font-bold underline">Iniciar captura de un estudio del paciente</button>
      </div>}
      {step === 'input' && (
        <div className="space-y-5">
          {/* Presets rápidos de demostración en 1 clic */}
          <div className="p-4 rounded-2xl bg-accent-soft/70 border border-accent-line space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-content flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-accent" />
                Explorar ejemplos ficticios (solo demostración):
              </span>
              {patient.biomarkers && Object.values(patient.biomarkers).some(v => typeof v === 'number') && (
                <button
                  type="button"
                  onClick={() => { setBio(patient.biomarkers ?? {}); setRawText(''); setFileName(null); setExample(false); setError(null); setStep('review') }}
                  disabled={reading}
                  className="text-xs font-bold text-accent underline hover:text-accent"
                >
                  Ver estudios actuales del paciente →
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {SAMPLE_LAB_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handlePresetClick(preset.id)}
                  disabled={reading}
                  className="p-3 rounded-xl bg-surface hover:bg-accent-soft border border-accent-line hover:border-emerald-400 text-left transition shadow-2xs"
                >
                  <p className="text-xs font-extrabold text-content">{preset.title}</p>
                  <p className="text-[11px] text-muted mt-1 leading-snug">{preset.subtitle}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Lectura de archivos de texto; OCR pendiente */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-line hover:border-emerald-500 rounded-2xl bg-subtle/60 hover:bg-accent-soft/30 cursor-pointer transition text-center">
              <Upload className="w-8 h-8 text-accent mb-2" />
              <span className="text-xs font-bold text-content">
                Cargar TXT o CSV
              </span>
              <span className="text-[11px] text-muted mt-1">
                PDF e imágenes: lectura aún no disponible. Copia su texto para revisarlo aquí.
              </span>
              {fileName && (
                <span className="mt-2 px-2.5 py-1 rounded-full bg-accent-soft text-accent text-[11px] font-bold">
                  📄 {fileName}
                </span>
              )}
              <input
                type="file"
                accept=".txt,.csv"
                disabled={reading}
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <div className="md:col-span-2 flex flex-col">
              <label className="block text-xs font-bold text-muted mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-accent" />
                Texto del estudio (copiar y pegar resultados)
              </label>
              <textarea
                rows={8}
                value={rawText}
                disabled={reading}
                onChange={e => setRawText(e.target.value)}
                placeholder={`Pega aquí los resultados del laboratorio o selecciona uno de los 3 casos clínicos de arriba...\n\nEjemplo:\nGlucosa en ayuno: 108 mg/dL\nInsulina basal: 14.2 uU/mL\nHbA1c: 5.8 %\nTriglicéridos: 195 mg/dL\nColesterol HDL: 40 mg/dL\nTSH: 4.5 mUI/L\nVitamina D: 19 ng/mL`}
                className="w-full flex-1 px-3.5 py-2.5 border border-line rounded-2xl text-xs font-mono bg-surface focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-line">
            <button
              type="button"
              onClick={onClose}
              disabled={reading}
              className="px-4 py-2 text-xs font-semibold text-muted bg-subtle hover:bg-subtle rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={startAiAnalysis}
              disabled={reading || !rawText.trim()}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-extrabold text-white bg-action hover:bg-action-hover rounded-xl shadow-sm transition"
            >
              <Microscope className="w-4 h-4" />
              {reading ? 'Leyendo archivo...' : 'Revisar valores del texto →'}
            </button>
          </div>
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-5">
          {/* Tarjetas de Índices Clínicos Calculados (HOMA-IR, TG/HDL, Protocolo Sugerido) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl border border-line bg-surface shadow-2xs">
              <span className="text-[11px] font-bold text-muted uppercase block">
                Índice HOMA-IR (Insulina × Glucosa / 405)
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-extrabold text-content">
                  {interpretation.homaIr ?? 'N/A'}
                </span>
                {interpretation.homaStatus && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${interpretation.homaStatus.color}`}>
                    {interpretation.homaStatus.label}
                  </span>
                )}
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-line bg-surface shadow-2xs">
              <span className="text-[11px] font-bold text-muted uppercase block">
                Índice Aterogénico (Triglicéridos / HDL)
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-extrabold text-content">
                  {interpretation.tgHdlRatio ?? 'N/A'}
                </span>
                {interpretation.tgHdlStatus && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${interpretation.tgHdlStatus.color}`}>
                    {interpretation.tgHdlStatus.label}
                  </span>
                )}
              </div>
            </div>

            <div className="p-4 rounded-2xl surface-inverse bg-slate-900 text-white shadow-2xs">
              <span className="text-[11px] font-bold text-emerald-400 uppercase flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Protocolo orientativo
              </span>
              <p className="text-sm font-extrabold mt-1">
                {PROTOCOL_INFO[interpretation.recommendedProtocol].name}
              </p>
              <span className="text-[11px] text-muted block mt-0.5">
                Basado en hallazgos bioquímicos detectados
              </span>
            </div>
          </div>

          {/* Semáforo de Analitos + Edición rápida */}
          <div className="bg-surface rounded-2xl border border-line overflow-hidden shadow-2xs">
            <div className="px-4 py-3 bg-subtle border-b border-line flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-content flex items-center gap-2">
                <Activity className="w-4 h-4 text-accent" />
                Valores para verificar con el estudio original
              </h4>
              <button
                type="button"
                onClick={() => setStep('input')}
                disabled={saving}
                className="text-xs font-bold text-accent hover:underline"
              >
                ← Revisar otro texto
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-4 bg-subtle/40">
              {[
                { key: 'fasting_glucose' as const,   label: 'Glucosa Ayuno (mg/dL)' },
                { key: 'fasting_insulin' as const,   label: 'Insulina Basal (µU/mL)' },
                { key: 'hba1c' as const,             label: 'HbA1c (%)' },
                { key: 'triglycerides' as const,     label: 'Triglicéridos (mg/dL)' },
                { key: 'cholesterol_total' as const, label: 'Colesterol Total (mg/dL)' },
                { key: 'ldl_cholesterol' as const,   label: 'Colesterol LDL (mg/dL)' },
                { key: 'hdl_cholesterol' as const,   label: 'Colesterol HDL (mg/dL)' },
                { key: 'uric_acid' as const,         label: 'Ácido Úrico (mg/dL)' },
                { key: 'tsh' as const,               label: 'TSH Tiroides (mUI/L)' },
                { key: 'vitamin_d' as const,         label: 'Vitamina D 25-OH (ng/mL)' },
                { key: 'ferritin' as const,          label: 'Ferritina (ng/mL)' },
                { key: 'systolic_bp' as const,       label: 'PA Sistólica (mmHg)' },
              ].map(field => {
                const evalItem = interpretation.evaluations.find(e => e.key === field.key)
                const badgeColor =
                  evalItem?.status === 'critical'
                    ? 'border-danger-line bg-danger-soft/60'
                    : evalItem?.status === 'warning'
                    ? 'border-warning-line bg-warning-soft/60'
                    : 'border-line bg-surface'

                return (
                  <div key={field.key} className={`p-2.5 rounded-xl border ${badgeColor}`}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-muted truncate">
                        {field.label}
                      </label>
                      {evalItem && (
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            evalItem.status === 'critical'
                              ? 'bg-red-500'
                              : evalItem.status === 'warning'
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                        />
                      )}
                    </div>
                    <input
                      type="number"
                      step="0.1"
                      value={bio[field.key] ?? ''}
                      onChange={e => updateBioValue(field.key, e.target.value)}
                      placeholder="—"
                      className="w-full px-2.5 py-1 text-xs font-extrabold text-content bg-surface border border-line rounded-lg"
                    />
                    {evalItem && (
                      <p className="text-[10px] text-muted mt-1 truncate" title={evalItem.clinicalNote}>
                        {evalItem.clinicalNote}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Diagnóstico Bioquímico IA y Recomendaciones Dietoterapéuticas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-warning-soft/70 border border-warning-line space-y-2">
              <h4 className="text-xs font-extrabold text-warning flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-warning" />
                Hallazgos Bioquímicos y Ajustes para el Plan IA
              </h4>
              {interpretation.detectedConditions.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {interpretation.detectedConditions.map((c, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-surface border border-warning-line text-warning text-[11px] font-bold">
                      • {c}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted">Sin alertas de estas reglas para los valores capturados. Verifica el estudio y su contexto clínico.</p>
              )}

              <ul className="space-y-1 text-xs text-warning pt-1">
                {interpretation.nutritionalAdjustments.map((adj, i) => (
                  <li key={i} className="leading-relaxed">→ {adj}</li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-purple-soft/70 border border-purple-line space-y-2.5 flex flex-col justify-between">
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold text-purple flex items-center gap-1.5">
                  <Pill className="w-4 h-4 text-purple" />
                  Suplementación de Precisión Sugerida por IA
                </h4>
                {interpretation.suggestedSupplements.length > 0 ? (
                  <ul className="space-y-1 text-xs text-purple">
                    {interpretation.suggestedSupplements.map((sup, i) => (
                      <li key={i} className="font-medium">✓ {sup}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-purple">Mantenimiento general: Omega-3 EPA/DHA y Magnesio.</p>
                )}
              </div>

              <label className="flex items-center gap-2 pt-2 border-t border-purple-line/70 text-xs font-bold text-purple cursor-pointer">
                <input
                  type="checkbox"
                  checked={syncConditions}
                  onChange={e => setSyncConditions(e.target.checked)}
                  className="rounded text-accent"
                />
                Actualizar diagnósticos y suplementos en el expediente del paciente
              </label>
            </div>
          </div>

          {/* Botones de Acción Final */}
          <label className="block text-xs font-bold text-muted">Fecha del estudio (confirma con el original)
            <input type="date" value={bio.last_lab_date ?? ''} onChange={e => setBio(prev => ({ ...prev, last_lab_date: e.target.value }))} className="block mt-1 p-2 rounded-lg bg-surface border border-line text-content" />
          </label>
          <p className="text-xs text-muted">Se guardará este conjunto de valores como el último estudio. Los valores ausentes quedan sin registrar; revisa cada dato antes de guardar.</p>
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-line">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-muted bg-subtle hover:bg-subtle rounded-xl"
            >
              Cancelar
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={saving || example || !bio.last_lab_date}
                onClick={() => handleConfirmSave(false)}
                className="px-4 py-2.5 text-xs font-bold text-accent bg-accent-soft hover:bg-accent-soft rounded-xl transition"
              >
                {saving ? 'Guardando...' : 'Guardar en Expediente 360°'}
              </button>

              {onGeneratePlanAfterSave && (
                <button
                  type="button"
                  disabled={saving || example || !bio.last_lab_date}
                  onClick={() => handleConfirmSave(true)}
                  className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-extrabold text-white bg-action hover:bg-action-hover rounded-xl shadow-sm transition"
                >
                  <Sparkles className="w-4 h-4" />
                  Guardar y Generar Plan IA con estos Estudios
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

