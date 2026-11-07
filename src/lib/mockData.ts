import type { Patient, PatientInsert, PatientUpdate, WeightRecord } from '@/types/patient'
import type { NutritionPlan, PlanInsert, PlanUpdate, PlanWithPatient, ClinicalProtocol, MacroTargets } from '@/types/plan'
import { generateHighPrecisionAiPlan, calculateClinicalMacros } from './clinicalEngine'

export { isDemo } from './demoMode'

const DEMO_PATIENTS_KEY = 'nutriai_demo_patients_v2'
const DEMO_PLANS_KEY = 'nutriai_demo_plans_v2'

const INITIAL_PATIENTS: Patient[] = [
  {
    id: 'pat-1',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    doctor_id: 'demo-doctor-uuid-1234',
    full_name: 'Ana María Gómez',
    email: 'ana.gomez@correo.com',
    phone: '+52 55 4123 8910',
    birth_date: '1992-04-15',
    gender: 'female',
    weight_kg: 68.5,
    height_cm: 165,
    activity_level: 'moderate',
    body_fat_pct: 26.4,
    muscle_mass_kg: 27.2,
    waist_cm: 76,
    goal: 'Pérdida de grasa visceral y recomposición muscular',
    allergies: 'Mariscos, Cacahuate',
    conditions: 'Resistencia a la insulina leve (HOMA-IR 2.8)',
    medications: 'Metformina XR 500mg (cena), Inositol 2g',
    sleep_hours: 7,
    water_liters: 2.4,
    notes: 'Entrena funcional 4 veces por semana. Horarios de oficina 9am a 6pm.',
    biomarkers: {
      fasting_glucose: 104,
      hba1c: 5.7,
      systolic_bp: 116,
      diastolic_bp: 74,
      cholesterol_total: 185,
      triglycerides: 132,
    },
    weight_history: [
      { date: '2026-08-01', weight_kg: 73.4, body_fat_pct: 29.8, muscle_mass_kg: 26.5, waist_cm: 82, notes: 'Valoración inicial' },
      { date: '2026-09-01', weight_kg: 71.8, body_fat_pct: 28.5, muscle_mass_kg: 26.8, waist_cm: 80, notes: 'Buena adherencia al menú' },
      { date: '2026-10-01', weight_kg: 70.1, body_fat_pct: 27.3, muscle_mass_kg: 27.0, waist_cm: 78, notes: 'Ajuste de carga glucémica' },
      { date: '2026-11-01', weight_kg: 68.5, body_fat_pct: 26.4, muscle_mass_kg: 27.2, waist_cm: 76, notes: 'Control actual (-4.9 kg total)' },
    ],
  },
  {
    id: 'pat-2',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 21).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
    doctor_id: 'demo-doctor-uuid-1234',
    full_name: 'Carlos Eduardo Ramírez',
    email: 'c.ramirez@empresa.mx',
    phone: '+52 33 1982 4411',
    birth_date: '1985-09-22',
    gender: 'male',
    weight_kg: 89.0,
    height_cm: 178,
    activity_level: 'light',
    body_fat_pct: 28.5,
    muscle_mass_kg: 36.8,
    waist_cm: 98,
    goal: 'Reducción de peso, control de hipertensión y triglicéridos',
    allergies: null,
    conditions: 'Hipertensión arterial grado 1, Dislipidemia mixta',
    medications: 'Losartán 50mg (mañana), Rosuvastatina 10mg',
    sleep_hours: 6,
    water_liters: 1.8,
    notes: 'Directivo, alto nivel de estrés laboral. Camina 30 min diarios.',
    biomarkers: {
      fasting_glucose: 96,
      hba1c: 5.5,
      systolic_bp: 136,
      diastolic_bp: 86,
      cholesterol_total: 224,
      triglycerides: 195,
    },
    weight_history: [
      { date: '2026-08-15', weight_kg: 94.5, body_fat_pct: 31.2, muscle_mass_kg: 36.4, waist_cm: 103, notes: 'Inicio protocolo DASH' },
      { date: '2026-09-15', weight_kg: 92.0, body_fat_pct: 30.0, muscle_mass_kg: 36.5, waist_cm: 101, notes: 'Reducción de sodio' },
      { date: '2026-10-15', weight_kg: 90.4, body_fat_pct: 29.1, muscle_mass_kg: 36.7, waist_cm: 99, notes: 'Mejora en PA' },
      { date: '2026-11-01', weight_kg: 89.0, body_fat_pct: 28.5, muscle_mass_kg: 36.8, waist_cm: 98, notes: 'Control actual (-5.5 kg)' },
    ],
  },
  {
    id: 'pat-3',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
    doctor_id: 'demo-doctor-uuid-1234',
    full_name: 'Sofía Valenzuela',
    email: 'sofia.val@studio.com',
    phone: '+52 81 8344 0921',
    birth_date: '1998-11-05',
    gender: 'female',
    weight_kg: 56.4,
    height_cm: 162,
    activity_level: 'athlete',
    body_fat_pct: 17.8,
    muscle_mass_kg: 26.9,
    waist_cm: 64,
    goal: 'Hipertrofia muscular limpia y máximo rendimiento en CrossFit',
    allergies: 'Lactosa',
    conditions: null,
    medications: 'Creatina Monohidratada 5g/día, Proteína Whey Isolate',
    sleep_hours: 8,
    water_liters: 3.2,
    notes: 'Atleta competitiva 6 días por semana. Requiere timing peri-entrenamiento.',
    biomarkers: {
      fasting_glucose: 82,
      hba1c: 5.1,
      systolic_bp: 108,
      diastolic_bp: 68,
      cholesterol_total: 168,
      triglycerides: 78,
    },
    weight_history: [
      { date: '2026-09-01', weight_kg: 54.0, body_fat_pct: 18.2, muscle_mass_kg: 25.1, waist_cm: 64, notes: 'Inicio fase volumen limpio' },
      { date: '2026-10-01', weight_kg: 55.2, body_fat_pct: 18.0, muscle_mass_kg: 26.0, waist_cm: 64, notes: 'Aumento de fuerza' },
      { date: '2026-11-01', weight_kg: 56.4, body_fat_pct: 17.8, muscle_mass_kg: 26.9, waist_cm: 64, notes: '+1.8 kg masa muscular magra' },
    ],
  },
]

const INITIAL_PLANS: PlanWithPatient[] = [
  {
    id: 'plan-1',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    patient_id: 'pat-1',
    doctor_id: 'demo-doctor-uuid-1234',
    status: 'published',
    protocol: 'glycemic_control',
    meals_per_day: 4,
    calories_target: 1680,
    macros: {
      calories: 1680,
      protein_g: 126,
      carbs_g: 147,
      fat_g: 65,
      protein_pct: 30,
      carbs_pct: 35,
      fat_pct: 35,
      fiber_g: 28,
      water_liters: 2.4,
    },
    valid_from: new Date().toISOString(),
    valid_until: null,
    doctor_notes: 'Priorizar orden de ingesta: fibra vegetal antes de almidones. Revisar HOMA-IR en 4 semanas.',
    ai_generated_content: generateHighPrecisionAiPlan(INITIAL_PATIENTS[0], {
      protocol: 'glycemic_control',
      mealsPerDay: 4,
      macros: {
        calories: 1680,
        protein_g: 126,
        carbs_g: 147,
        fat_g: 65,
        protein_pct: 30,
        carbs_pct: 35,
        fat_pct: 35,
        fiber_g: 28,
        water_liters: 2.4,
      },
      doctorNotes: 'Priorizar orden de ingesta: fibra vegetal antes de almidones. Revisar HOMA-IR en 4 semanas.',
    }),
    edited_content: null,
    patients: { full_name: 'Ana María Gómez' },
  },
  {
    id: 'plan-2',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    patient_id: 'pat-2',
    doctor_id: 'demo-doctor-uuid-1234',
    status: 'draft',
    protocol: 'dash_cardio',
    meals_per_day: 4,
    calories_target: 2050,
    macros: {
      calories: 2050,
      protein_g: 128,
      carbs_g: 230,
      fat_g: 68,
      protein_pct: 25,
      carbs_pct: 45,
      fat_pct: 30,
      fiber_g: 32,
      water_liters: 3.1,
    },
    valid_from: null,
    valid_until: null,
    doctor_notes: 'Restricción estricta de sodio (<1,500 mg/día). Aumentar potasio y EPA/DHA para control de triglicéridos.',
    ai_generated_content: generateHighPrecisionAiPlan(INITIAL_PATIENTS[1], {
      protocol: 'dash_cardio',
      mealsPerDay: 4,
      macros: {
        calories: 2050,
        protein_g: 128,
        carbs_g: 230,
        fat_g: 68,
        protein_pct: 25,
        carbs_pct: 45,
        fat_pct: 30,
        fiber_g: 32,
        water_liters: 3.1,
      },
      doctorNotes: 'Restricción estricta de sodio (<1,500 mg/día). Aumentar potasio y EPA/DHA para control de triglicéridos.',
    }),
    edited_content: null,
    patients: { full_name: 'Carlos Eduardo Ramírez' },
  },
]

export function getMockPatients(): Patient[] {
  const stored = localStorage.getItem(DEMO_PATIENTS_KEY)
  if (!stored) {
    localStorage.setItem(DEMO_PATIENTS_KEY, JSON.stringify(INITIAL_PATIENTS))
    return INITIAL_PATIENTS
  }
  return JSON.parse(stored)
}

export function saveMockPatients(patients: Patient[]): void {
  localStorage.setItem(DEMO_PATIENTS_KEY, JSON.stringify(patients))
}

export function createMockPatient(input: PatientInsert): Patient {
  const patients = getMockPatients()
  const today = new Date().toISOString().split('T')[0]
  const newPatient: Patient = {
    ...input,
    id: `pat-${Date.now()}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    weight_history: input.weight_history ?? [
      {
        date: today,
        weight_kg: input.weight_kg,
        body_fat_pct: input.body_fat_pct ?? undefined,
        muscle_mass_kg: input.muscle_mass_kg ?? undefined,
        waist_cm: input.waist_cm ?? undefined,
        notes: 'Registro inicial',
      },
    ],
  }
  patients.unshift(newPatient)
  saveMockPatients(patients)
  return newPatient
}

export function updateMockPatient(id: string, input: PatientUpdate): Patient {
  const patients = getMockPatients()
  const idx = patients.findIndex(p => p.id === id)
  if (idx === -1) throw new Error('Paciente no encontrado')
  const prev = patients[idx]

  // Si cambió el peso, agregar automáticamente un registro al historial si no viene incluido
  let history = input.weight_history ?? prev.weight_history ?? []
  if (input.weight_kg && input.weight_kg !== prev.weight_kg && !input.weight_history) {
    history = [
      ...history,
      {
        date: new Date().toISOString().split('T')[0],
        weight_kg: input.weight_kg,
        body_fat_pct: input.body_fat_pct ?? prev.body_fat_pct ?? undefined,
        muscle_mass_kg: input.muscle_mass_kg ?? prev.muscle_mass_kg ?? undefined,
        waist_cm: input.waist_cm ?? prev.waist_cm ?? undefined,
        notes: 'Actualización de control',
      },
    ]
  }

  const updated: Patient = {
    ...prev,
    ...input,
    weight_history: history,
    updated_at: new Date().toISOString(),
  }
  patients[idx] = updated
  saveMockPatients(patients)
  return updated
}

export function addMockWeightCheckin(id: string, record: WeightRecord): Patient {
  const patients = getMockPatients()
  const idx = patients.findIndex(p => p.id === id)
  if (idx === -1) throw new Error('Paciente no encontrado')
  const prev = patients[idx]
  const history = [...(prev.weight_history ?? []), record]
  const updated: Patient = {
    ...prev,
    weight_kg: record.weight_kg,
    body_fat_pct: record.body_fat_pct ?? prev.body_fat_pct,
    muscle_mass_kg: record.muscle_mass_kg ?? prev.muscle_mass_kg,
    waist_cm: record.waist_cm ?? prev.waist_cm,
    weight_history: history,
    updated_at: new Date().toISOString(),
  }
  patients[idx] = updated
  saveMockPatients(patients)
  return updated
}

export function deleteMockPatient(id: string): void {
  const patients = getMockPatients().filter(p => p.id !== id)
  saveMockPatients(patients)
}

export function getMockPlans(): PlanWithPatient[] {
  const stored = localStorage.getItem(DEMO_PLANS_KEY)
  if (!stored) {
    localStorage.setItem(DEMO_PLANS_KEY, JSON.stringify(INITIAL_PLANS))
    return INITIAL_PLANS
  }
  return JSON.parse(stored)
}

export function saveMockPlans(plans: PlanWithPatient[]): void {
  localStorage.setItem(DEMO_PLANS_KEY, JSON.stringify(plans))
}

export function createMockPlan(input: PlanInsert): NutritionPlan {
  const plans = getMockPlans()
  const patients = getMockPatients()
  const patient = patients.find(p => p.id === input.patient_id)

  const newPlan: PlanWithPatient = {
    ...input,
    id: `plan-${Date.now()}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    patients: { full_name: patient?.full_name || 'Paciente' },
  }
  plans.unshift(newPlan)
  saveMockPlans(plans)
  return newPlan
}

export function updateMockPlan(id: string, input: PlanUpdate): NutritionPlan {
  const plans = getMockPlans()
  const idx = plans.findIndex(p => p.id === id)
  if (idx === -1) throw new Error('Plan no encontrado')
  const updated: PlanWithPatient = {
    ...plans[idx],
    ...input,
    updated_at: new Date().toISOString(),
  }
  plans[idx] = updated
  saveMockPlans(plans)
  return updated
}

export function generateMockAiPlan(
  patient: Patient,
  doctorNotes: string,
  options?: {
    protocol?: ClinicalProtocol
    mealsPerDay?: number
    macros?: MacroTargets
  },
): string {
  const protocol = options?.protocol ?? 'caloric_deficit'
  const mealsPerDay = options?.mealsPerDay ?? 4
  const macros = options?.macros ?? calculateClinicalMacros(patient, protocol)

  return generateHighPrecisionAiPlan(patient, {
    protocol,
    mealsPerDay,
    macros,
    doctorNotes,
  })
}
