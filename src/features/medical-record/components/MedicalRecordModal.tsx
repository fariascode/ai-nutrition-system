import { useEffect, useState, type FormEvent } from 'react'
import {
  Plus, Trash2, Save, ClipboardList, Users, Scissors, Building2,
  AlertTriangle, Pill, Activity, CheckCircle2,
} from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { withLocalRollback, storageError } from '@/lib/localStorage'
import { isDemo } from '@/lib/mockData'
import {
  getMedicalRecord, saveMedicalRecord, newId, getHistoryReview,
} from '../services/medicalRecord.service'
import type {
  MedicalRecord, PersonalHistoryItem, FamilyHistoryItem, SurgeryItem,
  HospitalizationItem, AllergyItem, MedicationItem,
  HistorySection, HistoryReview,
} from '@/types/medicalRecord'
import type { Patient } from '@/types/patient'
import type { PatientUpdate } from '@/types/patient'

interface Props {
  open: boolean
  patient: Patient | null
  onClose: () => void
  /** Sincroniza alergias y medicamentos con la ficha del paciente para que el motor clínico los siga respetando. */
  onSyncPatient?: (patientId: string, data: PatientUpdate) => Promise<void>
}

type Tab = 'history' | 'surgical' | 'allergies' | 'medications' | 'habits'

const inputClass = 'input-wellness w-full px-3 py-2 text-xs sm:text-sm font-medium'
const labelClass = 'block text-[11px] font-bold text-muted mb-1'

interface FieldDef {
  key: string
  label: string
  placeholder?: string
  options?: { value: string; label: string }[]
  span?: string
}

interface ListEditorProps<T extends { id: string }> {
  title: string
  icon: React.ReactNode
  items: T[]
  fields: FieldDef[]
  emptyText: string
  addLabel: string
  makeEmpty: () => T
  onChange: (items: T[]) => void
}

function ListEditor<T extends { id: string }>({
  title, icon, items, fields, emptyText, addLabel, makeEmpty, onChange,
}: ListEditorProps<T>) {
  function update(id: string, key: string, value: string) {
    onChange(items.map(it => (it.id === id ? { ...it, [key]: value } : it)))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-extrabold text-content flex items-center gap-2">
          {icon}
          {title} ({items.length})
        </h4>
        <button
          type="button"
          onClick={() => onChange([...items, makeEmpty()])}
          className="btn-forest flex items-center gap-1.5 px-3 py-1.5 text-xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-[#C8ED8F]" /> {addLabel}
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-muted bg-canvas border border-dashed border-line rounded-2xl p-4 text-center">
          {emptyText}
        </p>
      ) : (
        <div className="space-y-2.5">
          {items.map(item => (
            <div
              key={item.id}
              className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 p-3 rounded-2xl border border-line bg-canvas/70"
            >
              {fields.map(f => {
                const value = String((item as Record<string, unknown>)[f.key] ?? '')
                return (
                  <div key={f.key} className={f.span ?? 'sm:col-span-4'}>
                    <label className={labelClass}>{f.label}</label>
                    {f.options ? (
                      <select
                        value={value}
                        onChange={e => update(item.id, f.key, e.target.value)}
                        className={inputClass}
                      >
                        {f.options.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={value}
                        placeholder={f.placeholder}
                        onChange={e => update(item.id, f.key, e.target.value)}
                        className={inputClass}
                      />
                    )}
                  </div>
                )
              })}
              <div className="sm:col-span-12 flex justify-end -mt-1">
                <button
                  type="button"
                  onClick={() => onChange(items.filter(it => it.id !== item.id))}
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-muted hover:text-danger hover:bg-danger-soft rounded-lg transition cursor-pointer"
                  aria-label="Eliminar registro"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Quitar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function MedicalRecordModal({ open, patient, onClose, onSyncPatient }: Props) {
  const [record, setRecord] = useState<MedicalRecord | null>(null)
  const [tab, setTab]       = useState<Tab>('history')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (open && patient) {
      setTab('history')
      setSaved(false)
      setError(null)
      setDirty(false)
      setRecord(null)
      getMedicalRecord(patient).then(value => { if (!cancelled) setRecord(value) })
        .catch(err => { if (!cancelled) setError(storageError(err)) })
    }
    return () => { cancelled = true }
  }, [open, patient])

  if (!patient || !record) {
    return open && patient ? (
      <Modal open title="Expediente Médico Integral" onClose={onClose}>
        <div role={error ? 'alert' : 'status'} className="py-10 text-center text-sm text-muted">{error ?? 'Cargando expediente...'}</div>
      </Modal>
    ) : null
  }

  const rec = record
  const set = (patch: Partial<MedicalRecord>) => {
    const sections: HistorySection[] = ['personal', 'family', 'surgeries', 'hospitalizations', 'allergies', 'medications']
    const review_status = { ...rec.review_status, ...patch.review_status }
    for (const section of sections) {
      if (patch[section] !== undefined) review_status[section] = 'unknown'
    }
    setRecord({ ...rec, ...patch, review_status })
    setSaved(false)
    setDirty(true)
  }
  const setHabit = (patch: Partial<MedicalRecord['habits']>) => set({ habits: { ...rec.habits, ...patch } })

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!patient || saving) return
    setSaving(true)
    setError(null)
    try {
      // No guardar filas vacías
      const clean: MedicalRecord = {
        ...rec,
        personal:         rec.personal.filter(i => i.condition.trim()),
        family:           rec.family.filter(i => i.condition.trim()),
        surgeries:        rec.surgeries.filter(i => i.procedure.trim()),
        hospitalizations: rec.hospitalizations.filter(i => i.reason.trim()),
        allergies:        rec.allergies.filter(i => i.substance.trim()),
        medications:      rec.medications.filter(i => i.name.trim()),
      }
      const persisted = await withLocalRollback(async () => {
        const persisted = await saveMedicalRecord(clean)
        if (onSyncPatient && isDemo) {
          const join = (list: string[]) => (list.length ? list.join(', ') : null)
          await onSyncPatient(patient.id, {
            allergies:   join(persisted.allergies.map(a => a.substance)),
            medications: join(persisted.medications.filter(m => m.status === 'active').map(m => m.name)),
            conditions:  join(persisted.personal.filter(p => p.status === 'active').map(p => p.condition)),
            sleep_hours: persisted.habits.sleep_hours ?? null,
            water_liters: persisted.habits.water_liters ?? null,
          })
        }
        return persisted
      })
      setRecord(persisted)
      setSaved(true)
      setDirty(false)
    } catch (err) {
      setError(storageError(err))
    } finally {
      setSaving(false)
    }
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'history',     label: 'Antecedentes',   icon: <ClipboardList className="w-3.5 h-3.5" />, count: rec.personal.length + rec.family.length },
    { id: 'surgical',    label: 'Cirugías y hospitalizaciones', icon: <Scissors className="w-3.5 h-3.5" />, count: rec.surgeries.length + rec.hospitalizations.length },
    { id: 'allergies',   label: 'Alergias',       icon: <AlertTriangle className="w-3.5 h-3.5" />, count: rec.allergies.length },
    { id: 'medications', label: 'Medicamentos',   icon: <Pill className="w-3.5 h-3.5" />, count: rec.medications.length },
    { id: 'habits',      label: 'Hábitos',        icon: <Activity className="w-3.5 h-3.5" /> },
  ]

  const severeAllergies = rec.allergies.filter(a => a.severity === 'severe' && a.substance.trim())
  const sectionLabels: Record<HistorySection, string> = {
    personal: 'Antecedentes personales', family: 'Antecedentes familiares', surgeries: 'Cirugías',
    hospitalizations: 'Hospitalizaciones', allergies: 'Alergias', medications: 'Medicamentos',
  }
  const tabSections: Record<Tab, HistorySection[]> = {
    history: ['personal', 'family'], surgical: ['surgeries', 'hospitalizations'],
    allergies: ['allergies'], medications: ['medications'], habits: [],
  }

  return (
    <Modal
      open={open}
      title={`Expediente Médico Integral — ${patient.full_name}`}
      subtitle={rec.updated_at
        ? `Última actualización: ${new Date(rec.updated_at).toLocaleString('es-MX')}`
        : 'Expediente sin guardar — precargado con los datos de la ficha del paciente'}
      size="4xl"
      onClose={() => { if (!saving && (!dirty || confirm('¿Descartar los cambios sin guardar del expediente?'))) onClose() }}
    >
      <form onSubmit={handleSave} className="space-y-4">
        {error && <p role="alert" className="p-3 rounded-xl bg-danger-soft text-danger text-xs">{error}</p>}
        <fieldset disabled={saving} className="space-y-4 min-w-0">
        {severeAllergies.length > 0 && (
          <div role="alert" className="p-3 rounded-2xl bg-danger-soft border border-danger-line text-danger text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
            <span>
              <strong>Alergia grave registrada:</strong> {severeAllergies.map(a => a.substance).join(', ')}
            </span>
          </div>
        )}

        {/* Pestañas */}
        <div className="flex flex-wrap gap-1.5 p-1.5 rounded-2xl bg-canvas border border-line" role="tablist">
          {tabs.map(t => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                tab === t.id ? 'bg-[#245C47] text-white shadow-2xs' : 'text-muted hover:text-content'
              }`}
            >
              {t.icon}
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className={`px-1.5 rounded-full text-[10px] ${tab === t.id ? 'bg-surface/20' : 'bg-accent-soft text-accent'}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {tabSections[tab].map(section => <div key={section} className="p-3 rounded-xl border border-line text-xs">
          <label htmlFor={`review-${section}`} className={labelClass}>{sectionLabels[section]}: estado de la información</label>
          <select id={`review-${section}`} className={inputClass}
            value={getHistoryReview(rec, section)} disabled={rec[section].length > 0}
            onChange={e => set({ review_status: { ...rec.review_status, [section]: e.target.value as HistoryReview } })}>
            <option value="unknown">No interrogado / información pendiente</option>
            <option value="none">Interrogado: el paciente lo niega</option>
            {rec[section].length > 0 && <option value="recorded">Con registros</option>}
          </select>
        </div>)}

        {tab === 'history' && (
          <div className="space-y-6">
            <ListEditor<PersonalHistoryItem>
              title="Antecedentes personales patológicos"
              icon={<ClipboardList className="w-4 h-4 text-accent" />}
              items={rec.personal}
              fields={[
                { key: 'condition', label: 'Padecimiento', placeholder: 'Ej. Hipertensión arterial', span: 'sm:col-span-5' },
                { key: 'since', label: 'Desde (año)', placeholder: 'Ej. 2019', span: 'sm:col-span-2' },
                { key: 'status', label: 'Estado', span: 'sm:col-span-2', options: [
                  { value: 'active', label: 'Activo' }, { value: 'resolved', label: 'Resuelto' },
                ] },
                { key: 'notes', label: 'Notas', placeholder: 'Control, tratamiento...', span: 'sm:col-span-3' },
              ]}
              emptyText="Sin antecedentes personales registrados."
              addLabel="Agregar"
              makeEmpty={() => ({ id: newId('per'), condition: '', status: 'active' })}
              onChange={personal => set({ personal })}
            />
            <ListEditor<FamilyHistoryItem>
              title="Antecedentes heredofamiliares"
              icon={<Users className="w-4 h-4 text-accent" />}
              items={rec.family}
              fields={[
                { key: 'relative', label: 'Familiar', placeholder: 'Ej. Madre, abuelo paterno', span: 'sm:col-span-4' },
                { key: 'condition', label: 'Padecimiento', placeholder: 'Ej. Diabetes tipo 2', span: 'sm:col-span-4' },
                { key: 'notes', label: 'Notas', placeholder: 'Edad de inicio...', span: 'sm:col-span-4' },
              ]}
              emptyText="Sin antecedentes familiares registrados."
              addLabel="Agregar"
              makeEmpty={() => ({ id: newId('fam'), relative: '', condition: '' })}
              onChange={family => set({ family })}
            />
          </div>
        )}

        {tab === 'surgical' && (
          <div className="space-y-6">
            <ListEditor<SurgeryItem>
              title="Cirugías"
              icon={<Scissors className="w-4 h-4 text-accent" />}
              items={rec.surgeries}
              fields={[
                { key: 'procedure', label: 'Procedimiento', placeholder: 'Ej. Colecistectomía', span: 'sm:col-span-5' },
                { key: 'year', label: 'Año', placeholder: 'Ej. 2018', span: 'sm:col-span-2' },
                { key: 'notes', label: 'Notas', placeholder: 'Complicaciones, hospital...', span: 'sm:col-span-5' },
              ]}
              emptyText="Sin cirugías registradas."
              addLabel="Agregar cirugía"
              makeEmpty={() => ({ id: newId('sur'), procedure: '' })}
              onChange={surgeries => set({ surgeries })}
            />
            <ListEditor<HospitalizationItem>
              title="Hospitalizaciones"
              icon={<Building2 className="w-4 h-4 text-accent" />}
              items={rec.hospitalizations}
              fields={[
                { key: 'reason', label: 'Motivo', placeholder: 'Ej. Neumonía', span: 'sm:col-span-5' },
                { key: 'year', label: 'Año', placeholder: 'Ej. 2021', span: 'sm:col-span-2' },
                { key: 'notes', label: 'Notas', placeholder: 'Días de estancia, secuelas...', span: 'sm:col-span-5' },
              ]}
              emptyText="Sin hospitalizaciones registradas."
              addLabel="Agregar hospitalización"
              makeEmpty={() => ({ id: newId('hos'), reason: '' })}
              onChange={hospitalizations => set({ hospitalizations })}
            />
          </div>
        )}

        {tab === 'allergies' && (
          <ListEditor<AllergyItem>
            title="Alergias e intolerancias"
            icon={<AlertTriangle className="w-4 h-4 text-danger" />}
            items={rec.allergies}
            fields={[
              { key: 'substance', label: 'Sustancia / alimento / fármaco', placeholder: 'Ej. Penicilina, mariscos', span: 'sm:col-span-5' },
              { key: 'reaction', label: 'Reacción', placeholder: 'Ej. Urticaria, anafilaxia', span: 'sm:col-span-4' },
              { key: 'severity', label: 'Gravedad', span: 'sm:col-span-3', options: [
                  { value: 'unknown', label: 'Por confirmar' }, { value: 'mild', label: 'Leve' }, { value: 'moderate', label: 'Moderada' }, { value: 'severe', label: 'Grave' },
              ] },
            ]}
            emptyText="No hay alergias capturadas. Indica arriba si falta interrogar o si el paciente las niega."
            addLabel="Agregar alergia"
            makeEmpty={() => ({ id: newId('alg'), substance: '', severity: 'unknown' })}
            onChange={allergies => set({ allergies })}
          />
        )}

        {tab === 'medications' && (
          <ListEditor<MedicationItem>
            title="Medicamentos y suplementos actuales"
            icon={<Pill className="w-4 h-4 text-accent" />}
            items={rec.medications}
            fields={[
              { key: 'name', label: 'Medicamento', placeholder: 'Ej. Metformina XR 500 mg', span: 'sm:col-span-4' },
              { key: 'dose', label: 'Dosis', placeholder: 'Ej. 1 tableta', span: 'sm:col-span-2' },
              { key: 'frequency', label: 'Frecuencia', placeholder: 'Ej. Cada 24 h en cena', span: 'sm:col-span-3' },
              { key: 'status', label: 'Estado', span: 'sm:col-span-3', options: [
                { value: 'active', label: 'Vigente' }, { value: 'suspended', label: 'Suspendido' },
              ] },
            ]}
            emptyText="Sin medicamentos registrados."
            addLabel="Agregar medicamento"
            makeEmpty={() => ({ id: newId('med'), name: '', status: 'active' })}
            onChange={medications => set({ medications })}
          />
        )}

        {tab === 'habits' && (
          <div className="space-y-4">
            <h4 className="text-sm font-extrabold text-content flex items-center gap-2">
              <Activity className="w-4 h-4 text-accent" /> Hábitos y estilo de vida
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Tabaquismo</label>
                <select
                  value={rec.habits.smoking}
                  onChange={e => setHabit({ smoking: e.target.value as MedicalRecord['habits']['smoking'] })}
                  className={inputClass}
                >
                  <option value="unknown">No interrogado / desconocido</option>
                  <option value="never">Nunca ha fumado</option>
                  <option value="former">Exfumador</option>
                  <option value="current">Fumador actual</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Consumo de alcohol</label>
                <select
                  value={rec.habits.alcohol}
                  onChange={e => setHabit({ alcohol: e.target.value as MedicalRecord['habits']['alcohol'] })}
                  className={inputClass}
                >
                  <option value="unknown">No interrogado / desconocido</option>
                  <option value="none">Ninguno</option>
                  <option value="occasional">Ocasional</option>
                  <option value="frequent">Frecuente</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Ejercicio (días por semana)</label>
                <input
                  type="number" min={0} max={7}
                  value={rec.habits.exercise_per_week ?? ''}
                  onChange={e => setHabit({ exercise_per_week: e.target.value === '' ? undefined : Number(e.target.value) })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Horas de sueño</label>
                <input
                  type="number" step="0.5" min={0} max={24}
                  value={rec.habits.sleep_hours ?? ''}
                  onChange={e => setHabit({ sleep_hours: e.target.value === '' ? undefined : Number(e.target.value) })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Consumo de agua (litros/día)</label>
                <input
                  type="number" step="0.1" min={0}
                  value={rec.habits.water_liters ?? ''}
                  onChange={e => setHabit({ water_liters: e.target.value === '' ? undefined : Number(e.target.value) })}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Hábitos alimentarios</label>
              <textarea
                rows={3}
                value={rec.habits.diet_notes ?? ''}
                onChange={e => setHabit({ diet_notes: e.target.value })}
                placeholder="Horarios de comida, comidas fuera de casa, preferencias, aversiones..."
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Otros hábitos / observaciones</label>
              <textarea
                rows={2}
                value={rec.habits.other ?? ''}
                onChange={e => setHabit({ other: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-line">
          <p className="text-[11px] text-muted max-w-md">
            {isDemo ? 'Al guardar se actualizan también los datos de la ficha local del paciente.' : 'El expediente se conserva en este navegador. La sincronización con el servidor queda pendiente.'}
          </p>
          <div className="flex items-center gap-2">
            {saved && (
              <span role="status" className="flex items-center gap-1 text-xs font-bold text-accent">
                <CheckCircle2 className="w-4 h-4" /> Guardado
              </span>
            )}
            <button type="button" onClick={() => { if (!dirty || confirm('¿Descartar los cambios sin guardar del expediente?')) onClose() }} className="btn-secondary px-4 py-2 text-xs cursor-pointer">
              Cerrar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-forest flex items-center gap-1.5 px-5 py-2 text-xs disabled:opacity-60 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-[#C8ED8F]" />
              {saving ? 'Guardando...' : 'Guardar expediente'}
            </button>
          </div>
        </div>
        </fieldset>
      </form>
    </Modal>
  )
}

