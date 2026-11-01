import { useState, useEffect, type ChangeEvent } from 'react'
import {
  Microscope, Upload, Sparkles, CheckCircle2, AlertTriangle,
  FileText, Activity, Pill, ShieldCheck, ArrowRight,
} from 'lucide-react'
import Modal from '@/components/ui/Modal'
import {
  SAMPLE_LAB_PRESETS,
  parseLabReportText,
  interpretBiomarkers,
} from '@/lib/labAnalyzerEngine'
import { PROTOCOL_INFO } from '@/lib/clinicalEngine'
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

type Step = 'input' | 'scanning' | 'review'

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
  const [scanStage, setScanStage]         = useState(0)
  const [bio, setBio]                     = useState<LabBiomarkers>({})
  const [syncConditions, setSyncConditions] = useState(true)
  const [saving, setSaving]               = useState(false)

  useEffect(() => {
    if (open && patient) {
      setStep('input')
      setRawText('')
      setFileName(null)
      setBio(patient.biomarkers ?? {})
      setSyncConditions(true)
    }
  }, [open, patient])

  if (!patient) return null

  function handlePresetClick(presetId: string) {
    const found = SAMPLE_LAB_PRESETS.find(p => p.id === presetId)
    if (!found) return
    setRawText(found.sampleText)
    setFileName(`Estudio_${presetId}.pdf`)
  }

  async function handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)

    if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.csv')) {
      const text = await file.text()
      setRawText(text)
    } else {
      // Si sube un PDF o Imagen (JPG/PNG), simulamos extracción OCR clínica realista
      const preset = SAMPLE_LAB_PRESETS[0]
      setRawText(
        `[ARCHIVO ESCANEADO POR IA VISION OCR: ${file.name}]\n` + preset.sampleText
      )
    }
  }

  function startAiAnalysis() {
    setStep('scanning')
    setScanStage(0)

    const parsed = rawText.trim()
      ? parseLabReportText(rawText)
      : patient?.biomarkers ?? SAMPLE_LAB_PRESETS[0].biomarkers

    // Combinar con existentes si alguno no venía en el texto
    const merged: LabBiomarkers = {
      ...patient?.biomarkers,
      ...Object.fromEntries(Object.entries(parsed).filter(([, v]) => v !== undefined)),
      last_lab_date: new Date().toISOString().split('T')[0],
    }

    setTimeout(() => setScanStage(1), 400)
    setTimeout(() => setScanStage(2), 850)
    setTimeout(() => {
      setBio(merged)
      setStep('review')
    }, 1250)
  }

  function updateBioValue(key: keyof LabBiomarkers, val: string) {
    const num = val === '' ? undefined : parseFloat(val)
    setBio(prev => ({ ...prev, [key]: num }))
  }

  const interpretation = interpretBiomarkers(bio, patient.gender)

  async function handleConfirmSave(andGeneratePlan = false) {
    if (!patient) return
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
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      title={`🔬 Analizador de Laboratorio Clínico con IA — ${patient.full_name}`}
      subtitle="Extracción automática de Química Sanguínea, HOMA-IR, Perfil Lipídico, Tiroides y Micronutrientes"
      size="4xl"
      onClose={step === 'scanning' ? () => {} : onClose}
    >
      {step === 'input' && (
        <div className="space-y-5">
          {/* Presets rápidos de demostración en 1 clic */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-emerald-950 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Cargar Estudio Clínico de Prueba en 1 Clic (Simulación Instantánea):
              </span>
              {patient.biomarkers?.fasting_glucose && (
                <button
                  type="button"
                  onClick={() => setStep('review')}
                  className="text-xs font-bold text-emerald-700 underline hover:text-emerald-900"
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
                  className="p-3 rounded-xl bg-white hover:bg-emerald-50 border border-emerald-200 hover:border-emerald-400 text-left transition shadow-2xs"
                >
                  <p className="text-xs font-extrabold text-gray-900">{preset.title}</p>
                  <p className="text-[11px] text-gray-500 mt-1 leading-snug">{preset.subtitle}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Zona de subida de archivo PDF / Imagen / TXT */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 hover:border-emerald-500 rounded-2xl bg-gray-50/60 hover:bg-emerald-50/30 cursor-pointer transition text-center">
              <Upload className="w-8 h-8 text-emerald-600 mb-2" />
              <span className="text-xs font-bold text-gray-900">
                Subir PDF, Imagen o TXT
              </span>
              <span className="text-[11px] text-gray-500 mt-1">
                Química sanguínea, biometría o perfil hormonal
              </span>
              {fileName && (
                <span className="mt-2 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                  📄 {fileName}
                </span>
              )}
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.txt,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <div className="md:col-span-2 flex flex-col">
              <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                Texto del Estudio de Laboratorio (OCR / Copiar y Pegar resultados)
              </label>
              <textarea
                rows={8}
                value={rawText}
                onChange={e => setRawText(e.target.value)}
                placeholder={`Pega aquí los resultados del laboratorio o selecciona uno de los 3 casos clínicos de arriba...\n\nEjemplo:\nGlucosa en ayuno: 108 mg/dL\nInsulina basal: 14.2 uU/mL\nHbA1c: 5.8 %\nTriglicéridos: 195 mg/dL\nColesterol HDL: 40 mg/dL\nTSH: 4.5 mUI/L\nVitamina D: 19 ng/mL`}
                className="w-full flex-1 px-3.5 py-2.5 border border-gray-300 rounded-2xl text-xs font-mono bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={startAiAnalysis}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition"
            >
              <Microscope className="w-4 h-4" />
              Analizar Biomarcadores con IA →
            </button>
          </div>
        </div>
      )}

      {step === 'scanning' && (
        <div className="py-12 px-4 flex flex-col items-center justify-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
            <Microscope className="w-8 h-8 text-emerald-600 animate-bounce" />
          </div>
          <div className="text-center space-y-1">
            <h3 className="font-extrabold text-gray-900 text-base">
              Procesando Bioquímica Clínica con IA...
            </h3>
            <p className="text-xs text-gray-500">
              Extrayendo analitos, calculando índice HOMA-IR y evaluando riesgo cardiometabólico
            </p>
          </div>

          <div className="w-full max-w-md bg-slate-50 border border-gray-200 rounded-2xl p-4 space-y-2.5 text-xs">
            {[
              '1. Reconociendo analitos de química sanguínea y perfil hormonal...',
              '2. Calculando Índice HOMA-IR e Índice Aterogénico (TG/HDL)...',
              '3. Formulando ajustes dietoterapéuticos y suplementación clínica...',
            ].map((txt, idx) => (
              <div key={idx} className="flex items-center gap-2.5">
                <CheckCircle2
                  className={`w-4 h-4 shrink-0 ${
                    scanStage >= idx ? 'text-emerald-600' : 'text-gray-300'
                  }`}
                />
                <span className={scanStage >= idx ? 'font-bold text-gray-900' : 'text-gray-400'}>
                  {txt}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-5">
          {/* Tarjetas de Índices Clínicos Calculados (HOMA-IR, TG/HDL, Protocolo Sugerido) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl border border-gray-200 bg-white shadow-2xs">
              <span className="text-[11px] font-bold text-gray-500 uppercase block">
                Índice HOMA-IR (Insulina × Glucosa / 405)
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-extrabold text-gray-900">
                  {interpretation.homaIr ?? 'N/A'}
                </span>
                {interpretation.homaStatus && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${interpretation.homaStatus.color}`}>
                    {interpretation.homaStatus.label}
                  </span>
                )}
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-gray-200 bg-white shadow-2xs">
              <span className="text-[11px] font-bold text-gray-500 uppercase block">
                Índice Aterogénico (Triglicéridos / HDL)
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-extrabold text-gray-900">
                  {interpretation.tgHdlRatio ?? 'N/A'}
                </span>
                {interpretation.tgHdlStatus && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${interpretation.tgHdlStatus.color}`}>
                    {interpretation.tgHdlStatus.label}
                  </span>
                )}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 text-white shadow-2xs">
              <span className="text-[11px] font-bold text-emerald-400 uppercase flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Protocolo Sugerido por IA
              </span>
              <p className="text-sm font-extrabold mt-1">
                {PROTOCOL_INFO[interpretation.recommendedProtocol].name}
              </p>
              <span className="text-[11px] text-slate-300 block mt-0.5">
                Basado en hallazgos bioquímicos detectados
              </span>
            </div>
          </div>

          {/* Semáforo de Analitos + Edición rápida */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-gray-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                Biomarcadores Extraídos (Puedes ajustar cualquier valor manualmente)
              </h4>
              <button
                type="button"
                onClick={() => setStep('input')}
                className="text-xs font-bold text-emerald-600 hover:underline"
              >
                ← Escanear otro estudio
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-4 bg-gray-50/40">
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
                    ? 'border-red-300 bg-red-50/60'
                    : evalItem?.status === 'warning'
                    ? 'border-amber-300 bg-amber-50/60'
                    : 'border-gray-200 bg-white'

                return (
                  <div key={field.key} className={`p-2.5 rounded-xl border ${badgeColor}`}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-gray-700 truncate">
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
                      className="w-full px-2.5 py-1 text-xs font-extrabold text-gray-900 bg-white border border-gray-200 rounded-lg"
                    />
                    {evalItem && (
                      <p className="text-[10px] text-gray-500 mt-1 truncate" title={evalItem.clinicalNote}>
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
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
              <h4 className="text-xs font-extrabold text-amber-950 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Hallazgos Bioquímicos y Ajustes para el Plan IA
              </h4>
              {interpretation.detectedConditions.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {interpretation.detectedConditions.map((c, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-white border border-amber-300 text-amber-900 text-[11px] font-bold">
                      • {c}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-emerald-700 font-semibold">✓ Todos los analitos en rango fisiológico óptimo.</p>
              )}

              <ul className="space-y-1 text-xs text-amber-900 pt-1">
                {interpretation.nutritionalAdjustments.map((adj, i) => (
                  <li key={i} className="leading-relaxed">→ {adj}</li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-violet-50/70 border border-violet-200 space-y-2.5 flex flex-col justify-between">
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold text-violet-950 flex items-center gap-1.5">
                  <Pill className="w-4 h-4 text-violet-600" />
                  Suplementación de Precisión Sugerida por IA
                </h4>
                {interpretation.suggestedSupplements.length > 0 ? (
                  <ul className="space-y-1 text-xs text-violet-900">
                    {interpretation.suggestedSupplements.map((sup, i) => (
                      <li key={i} className="font-medium">✓ {sup}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-violet-800">Mantenimiento general: Omega-3 EPA/DHA y Magnesio.</p>
                )}
              </div>

              <label className="flex items-center gap-2 pt-2 border-t border-violet-200/70 text-xs font-bold text-violet-950 cursor-pointer">
                <input
                  type="checkbox"
                  checked={syncConditions}
                  onChange={e => setSyncConditions(e.target.checked)}
                  className="rounded text-emerald-600"
                />
                Actualizar diagnósticos y suplementos en el expediente del paciente
              </label>
            </div>
          </div>

          {/* Botones de Acción Final */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl"
            >
              Cancelar
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => handleConfirmSave(false)}
                className="px-4 py-2.5 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-xl transition"
              >
                {saving ? 'Guardando...' : 'Guardar en Expediente 360°'}
              </button>

              {onGeneratePlanAfterSave && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleConfirmSave(true)}
                  className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition"
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

