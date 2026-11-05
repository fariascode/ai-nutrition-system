import { useState, useEffect, type FormEvent } from 'react'
import { User, Activity, HeartPulse } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { calculateAge, calculateBMI, calculateBMR, calculateTDEE, ACTIVITY_LABELS } from '@/lib/clinicalEngine'
import type { Patient, PatientInsert, PatientUpdate, ActivityLevel } from '@/types/patient'

interface Props {
  open: boolean
  patient: Patient | null
  doctorId: string
  onClose: () => void
  onSave: (data: PatientInsert | PatientUpdate) => Promise<void>
}

type FormGender = 'male' | 'female' | 'other'
type Tab = 'general' | 'biometrics' | 'clinical'

const empty = {
  full_name: '', birth_date: '', gender: 'female' as FormGender,
  phone: '', email: '',
  weight_kg: '', height_cm: '', activity_level: 'moderate' as ActivityLevel,
  body_fat_pct: '', muscle_mass_kg: '', waist_cm: '',
  goal: '', allergies: '', conditions: '', medications: '', notes: '',
  fasting_glucose: '', hba1c: '', systolic_bp: '', diastolic_bp: '', triglycerides: '',
}

const inputClass = 'w-full px-3 py-2 border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition bg-surface'
const labelClass = 'block text-xs font-semibold text-muted mb-1'

export default function PatientModal({ open, patient, doctorId, onClose, onSave }: Props) {
  const [form, setForm] = useState(empty)
  const [tab, setTab] = useState<Tab>('general')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (patient) {
      setForm({
        full_name:       patient.full_name,
        birth_date:      patient.birth_date,
        gender:          patient.gender as FormGender,
        phone:           patient.phone ?? '',
        email:           patient.email ?? '',
        weight_kg:       String(patient.weight_kg),
        height_cm:       String(patient.height_cm),
        activity_level:  patient.activity_level ?? 'moderate',
        body_fat_pct:    patient.body_fat_pct ? String(patient.body_fat_pct) : '',
        muscle_mass_kg:  patient.muscle_mass_kg ? String(patient.muscle_mass_kg) : '',
        waist_cm:        patient.waist_cm ? String(patient.waist_cm) : '',
        goal:            patient.goal,
        allergies:       patient.allergies ?? '',
        conditions:      patient.conditions ?? '',
        medications:     patient.medications ?? '',
        notes:           patient.notes ?? '',
        fasting_glucose: patient.biomarkers?.fasting_glucose ? String(patient.biomarkers.fasting_glucose) : '',
        hba1c:           patient.biomarkers?.hba1c ? String(patient.biomarkers.hba1c) : '',
        systolic_bp:     patient.biomarkers?.systolic_bp ? String(patient.biomarkers.systolic_bp) : '',
        diastolic_bp:    patient.biomarkers?.diastolic_bp ? String(patient.biomarkers.diastolic_bp) : '',
        triglycerides:   patient.biomarkers?.triglycerides ? String(patient.biomarkers.triglycerides) : '',
      })
    } else {
      setForm(empty)
    }
    setTab('general')
    setError(null)
  }, [patient, open])

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  const w = parseFloat(form.weight_kg) || 0
  const h = parseFloat(form.height_cm) || 0
  const age = calculateAge(form.birth_date)
  const liveBmi = w > 0 && h > 0 ? calculateBMI(w, h) : null
  const liveBmr = w > 0 && h > 0 ? calculateBMR(w, h, age, form.gender) : null
  const liveTdee = liveBmr ? calculateTDEE(liveBmr, form.activity_level) : null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload: PatientInsert | PatientUpdate = {
        full_name:      form.full_name,
        birth_date:     form.birth_date,
        gender:         form.gender,
        phone:          form.phone || null,
        email:          form.email || null,
        weight_kg:      parseFloat(form.weight_kg),
        height_cm:      parseFloat(form.height_cm),
        activity_level: form.activity_level,
        body_fat_pct:   form.body_fat_pct ? parseFloat(form.body_fat_pct) : null,
        muscle_mass_kg: form.muscle_mass_kg ? parseFloat(form.muscle_mass_kg) : null,
        waist_cm:       form.waist_cm ? parseFloat(form.waist_cm) : null,
        goal:           form.goal,
        allergies:      form.allergies || null,
        conditions:     form.conditions || null,
        medications:    form.medications || null,
        notes:          form.notes || null,
        biomarkers: {
          ...patient?.biomarkers,
          fasting_glucose: form.fasting_glucose ? parseFloat(form.fasting_glucose) : undefined,
          hba1c:           form.hba1c ? parseFloat(form.hba1c) : undefined,
          systolic_bp:     form.systolic_bp ? parseFloat(form.systolic_bp) : undefined,
          diastolic_bp:    form.diastolic_bp ? parseFloat(form.diastolic_bp) : undefined,
          triglycerides:   form.triglycerides ? parseFloat(form.triglycerides) : undefined,
        },
        ...(patient ? {} : { doctor_id: doctorId }),
      }
      await onSave(payload)
      onClose()
    } catch {
      setError('Ocurrió un error al guardar. Verifica los campos obligatorios.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      title={patient ? `Editar Expediente — ${patient.full_name}` : 'Alta de Nuevo Paciente Clínico'}
      subtitle="Completa los datos antropométricos y clínicos para el motor de cálculo metabólico"
      size="2xl"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Pestañas */}
        <div className="flex border-b border-line gap-1">
          {[
            { id: 'general' as Tab,    label: '1. Datos y Antropometría', icon: User },
            { id: 'biometrics' as Tab, label: '2. Composición y Actividad', icon: Activity },
            { id: 'clinical' as Tab,   label: '3. Clínica y Laboratorio', icon: HeartPulse },
          ].map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-emerald-600 text-accent bg-accent-soft/50 rounded-t-lg'
                  : 'border-transparent text-muted hover:text-content'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Barra de previsualización metabólica en vivo */}
        {liveBmi && liveTdee && (
          <div className="p-3 rounded-xl surface-inverse bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-muted">Cálculo en vivo:</span>
              <span className="font-bold text-emerald-400">IMC {liveBmi.value} ({liveBmi.category})</span>
            </div>
            <div className="flex items-center gap-4">
              <span>TMB: <strong>{liveBmr} kcal</strong></span>
              <span>GET Estimado: <strong className="text-amber-300">{liveTdee} kcal/día</strong></span>
            </div>
          </div>
        )}

        {tab === 'general' && (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Nombre completo del paciente *</label>
              <input
                className={inputClass} required value={form.full_name}
                onChange={e => set('full_name', e.target.value)}
                placeholder="Ej. María Fernanda García López"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Fecha de nacimiento *</label>
                <input
                  type="date" className={inputClass} required value={form.birth_date}
                  onChange={e => set('birth_date', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Género biológico *</label>
                <select
                  className={inputClass} value={form.gender}
                  onChange={e => setForm(f => ({ ...f, gender: e.target.value as FormGender }))}
                >
                  <option value="female">Femenino</option>
                  <option value="male">Masculino</option>
                  <option value="other">Otro</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Teléfono / WhatsApp</label>
                <input
                  className={inputClass} value={form.phone}
                  onChange={e => set('phone', e.target.value)}
                  placeholder="+52 55 1234 5678"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Peso actual (kg) *</label>
                <input
                  type="number" step="0.1" min="1" className={inputClass} required
                  value={form.weight_kg} onChange={e => set('weight_kg', e.target.value)}
                  placeholder="70.5"
                />
              </div>
              <div>
                <label className={labelClass}>Talla / Estatura (cm) *</label>
                <input
                  type="number" step="0.1" min="1" className={inputClass} required
                  value={form.height_cm} onChange={e => set('height_cm', e.target.value)}
                  placeholder="165"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className={labelClass}>Correo electrónico</label>
                <input
                  type="email" className={inputClass} value={form.email}
                  onChange={e => set('email', e.target.value)}
                  placeholder="paciente@correo.com"
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Objetivo Clínico Principal *</label>
              <input
                className={inputClass} required value={form.goal}
                onChange={e => set('goal', e.target.value)}
                placeholder="Ej. Pérdida de grasa visceral, control de glucosa, hipertrofia muscular..."
              />
            </div>
          </div>
        )}

        {tab === 'biometrics' && (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Nivel de Actividad Física Diaria</label>
              <select
                className={inputClass}
                value={form.activity_level}
                onChange={e => setForm(f => ({ ...f, activity_level: e.target.value as ActivityLevel }))}
              >
                {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map(lvl => (
                  <option key={lvl} value={lvl}>
                    {ACTIVITY_LABELS[lvl].label} (Factor ×{ACTIVITY_LABELS[lvl].factor}) — {ACTIVITY_LABELS[lvl].desc}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>% Grasa Corporal</label>
                <input
                  type="number" step="0.1" className={inputClass}
                  value={form.body_fat_pct} onChange={e => set('body_fat_pct', e.target.value)}
                  placeholder="Ej. 24.5"
                />
              </div>
              <div>
                <label className={labelClass}>Masa Muscular (kg)</label>
                <input
                  type="number" step="0.1" className={inputClass}
                  value={form.muscle_mass_kg} onChange={e => set('muscle_mass_kg', e.target.value)}
                  placeholder="Ej. 28.2"
                />
              </div>
              <div>
                <label className={labelClass}>Cintura Abdominal (cm)</label>
                <input
                  type="number" step="0.1" className={inputClass}
                  value={form.waist_cm} onChange={e => set('waist_cm', e.target.value)}
                  placeholder="Ej. 78"
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Notas sobre estilo de vida, horarios y entrenamiento</label>
              <textarea
                rows={3} className={inputClass} value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Horarios de comida, tipo de ejercicio, calidad de sueño, presupuesto..."
              />
            </div>
          </div>
        )}

        {tab === 'clinical' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Alergias e Intolerancias Alimentarias</label>
                <input
                  className={inputClass} value={form.allergies}
                  onChange={e => set('allergies', e.target.value)}
                  placeholder="Lactosa, mariscos, gluten, nueces..."
                />
              </div>
              <div>
                <label className={labelClass}>Patologías / Condiciones Médicas</label>
                <input
                  className={inputClass} value={form.conditions}
                  onChange={e => set('conditions', e.target.value)}
                  placeholder="Resistencia a la insulina, hipertensión, hipotiroidismo..."
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Fármacos y Suplementos Actuales</label>
              <input
                className={inputClass} value={form.medications}
                onChange={e => set('medications', e.target.value)}
                placeholder="Metformina 500mg, Levotiroxina, Losartán, Omega-3..."
              />
            </div>

            <div className="p-3.5 rounded-xl bg-subtle border border-line">
              <p className="text-xs font-bold text-muted mb-2.5">Biomarcadores de Laboratorio Recientes (Opcional)</p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <div>
                  <label className="block text-[11px] text-muted mb-1">Glucosa (mg/dL)</label>
                  <input
                    type="number" step="1" className={inputClass}
                    value={form.fasting_glucose} onChange={e => set('fasting_glucose', e.target.value)}
                    placeholder="90"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-muted mb-1">HbA1c (%)</label>
                  <input
                    type="number" step="0.1" className={inputClass}
                    value={form.hba1c} onChange={e => set('hba1c', e.target.value)}
                    placeholder="5.4"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-muted mb-1">PA Sistólica</label>
                  <input
                    type="number" step="1" className={inputClass}
                    value={form.systolic_bp} onChange={e => set('systolic_bp', e.target.value)}
                    placeholder="120"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-muted mb-1">PA Diastólica</label>
                  <input
                    type="number" step="1" className={inputClass}
                    value={form.diastolic_bp} onChange={e => set('diastolic_bp', e.target.value)}
                    placeholder="80"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[11px] text-muted mb-1">Triglicéridos</label>
                  <input
                    type="number" step="1" className={inputClass}
                    value={form.triglycerides} onChange={e => set('triglycerides', e.target.value)}
                    placeholder="130"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-danger-soft border border-danger-line text-danger text-xs rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-line">
          <div className="flex gap-1.5">
            {tab !== 'general' && (
              <button
                type="button"
                onClick={() => setTab(tab === 'clinical' ? 'biometrics' : 'general')}
                className="px-3 py-2 text-xs font-medium text-muted hover:bg-subtle rounded-xl"
              >
                ← Anterior
              </button>
            )}
            {tab !== 'clinical' && (
              <button
                type="button"
                onClick={() => setTab(tab === 'general' ? 'biometrics' : 'clinical')}
                className="px-3 py-2 text-xs font-medium text-accent bg-accent-soft hover:bg-accent-soft rounded-xl"
              >
                Siguiente sección →
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button" onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-muted bg-subtle hover:bg-subtle rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit" disabled={saving}
              className="px-5 py-2 text-xs font-bold text-white bg-action hover:bg-action-hover disabled:opacity-60 rounded-xl shadow-xs transition-colors"
            >
              {saving ? 'Guardando...' : patient ? 'Guardar Cambios' : 'Registrar Paciente'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
