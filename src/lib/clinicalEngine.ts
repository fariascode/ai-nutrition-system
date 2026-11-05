import type { ActivityLevel, Patient } from '@/types/patient'
import type { ClinicalProtocol, MacroTargets } from '@/types/plan'

export const ACTIVITY_LABELS: Record<ActivityLevel, { label: string; factor: number; desc: string }> = {
  sedentary: { label: 'Sedentario',          factor: 1.2,   desc: 'Trabajo de oficina, sin ejercicio formal' },
  light:     { label: 'Actividad Ligera',    factor: 1.375, desc: 'Ejercicio ligero 1 a 3 días/semana' },
  moderate:  { label: 'Actividad Moderada',  factor: 1.55,  desc: 'Entrenamiento 3 a 5 días/semana' },
  active:    { label: 'Activo / Intenso',    factor: 1.725, desc: 'Entrenamiento fuerte 6 a 7 días/semana' },
  athlete:   { label: 'Atleta Alto Rend.',   factor: 1.9,   desc: 'Doble sesión o trabajo físico extremo' },
}

export const PROTOCOL_INFO: Record<ClinicalProtocol, {
  name: string
  badge: string
  calFactor: number
  macros: { p: number; c: number; f: number } // porcentajes
  description: string
}> = {
  caloric_deficit: {
    name: 'Déficit Calórico Clínico (-20%)',
    badge: 'Pérdida de Grasa',
    calFactor: 0.80,
    macros: { p: 30, c: 40, f: 30 },
    description: 'Pérdida de tejido adiposo preservando masa muscular magra con alta saciedad.',
  },
  recomposition: {
    name: 'Recomposición Corporal (-10%)',
    badge: 'Hipertrofia + Oxidación',
    calFactor: 0.90,
    macros: { p: 35, c: 40, f: 25 },
    description: 'Alto aporte proteico (2.0-2.2 g/kg) con déficit ligero para oxidar grasa y ganar tono.',
  },
  muscle_gain: {
    name: 'Superávit Hipertrófico (+15%)',
    badge: 'Aumento Muscular',
    calFactor: 1.15,
    macros: { p: 25, c: 50, f: 25 },
    description: 'Superávit energético controlado para síntesis proteica y rendimiento deportivo.',
  },
  glycemic_control: {
    name: 'Control Glucémico / Sensibilidad Insulínica',
    badge: 'Bajo Índice Glucémico',
    calFactor: 0.85,
    macros: { p: 30, c: 35, f: 35 },
    description: 'Carbohidratos complejos de absorción lenta y fibra alta para resistencia a la insulina o Diabetes.',
  },
  dash_cardio: {
    name: 'Protocolo DASH Cardioprotector',
    badge: 'Control PA y Lípidos',
    calFactor: 0.90,
    macros: { p: 25, c: 45, f: 30 },
    description: 'Restricción de sodio (<1,500mg), alto en potasio, magnesio y Omega-3 para hipertensión/dislipidemia.',
  },
  mediterranean: {
    name: 'Dieta Mediterránea Antiinflamatoria',
    badge: 'Salud Longevidad',
    calFactor: 0.95,
    macros: { p: 22, c: 43, f: 35 },
    description: 'Rica en polifenoles, AOVE, pescado azul y antioxidantes para reducir inflamación sistémica.',
  },
  ketogenic: {
    name: 'Cetogénica Clínica Controlada',
    badge: 'Keto Terapéutica',
    calFactor: 0.85,
    macros: { p: 25, c: 10, f: 65 },
    description: 'Inducción de cetosis nutricional mediante restricción severa de carbohidratos (<50g/día).',
  },
  balanced: {
    name: 'Normocalórica Balanceada (OMS)',
    badge: 'Mantenimiento',
    calFactor: 1.0,
    macros: { p: 25, c: 45, f: 30 },
    description: 'Equilibrio energético óptimo para mantenimiento de peso y educación nutricional.',
  },
}

export function calculateAge(birthDate: string): number {
  if (!birthDate) return 30
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return Math.max(0, age)
}

export function calculateBMI(weightKg: number, heightCm: number) {
  const heightM = heightCm / 100
  const value = heightM > 0 ? Number((weightKg / (heightM * heightM)).toFixed(1)) : 0
  const idealMinKg = Number((18.5 * heightM * heightM).toFixed(1))
  const idealMaxKg = Number((24.9 * heightM * heightM).toFixed(1))

  if (value < 18.5) {
    return { value, category: 'Bajo Peso', color: 'text-warning bg-warning-soft border-warning-line', barColor: 'bg-amber-500', riskLevel: 'moderate' as const, idealMinKg, idealMaxKg }
  }
  if (value < 25) {
    return { value, category: 'Peso Normal', color: 'text-accent bg-accent-soft border-accent-line', barColor: 'bg-emerald-500', riskLevel: 'low' as const, idealMinKg, idealMaxKg }
  }
  if (value < 30) {
    return { value, category: 'Sobrepeso', color: 'text-warning bg-warning-soft border-warning-line', barColor: 'bg-amber-500', riskLevel: 'moderate' as const, idealMinKg, idealMaxKg }
  }
  if (value < 35) {
    return { value, category: 'Obesidad Grado I', color: 'text-warning bg-warning-soft border-warning-line', barColor: 'bg-orange-500', riskLevel: 'high' as const, idealMinKg, idealMaxKg }
  }
  return { value, category: 'Obesidad Grado II+', color: 'text-danger bg-danger-soft border-danger-line', barColor: 'bg-red-600', riskLevel: 'high' as const, idealMinKg, idealMaxKg }
}

/**
 * Ecuación clínica de Mifflin-St Jeor (Estándar de oro ADA)
 */
export function calculateBMR(weightKg: number, heightCm: number, age: number, gender: 'male' | 'female' | 'other'): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  if (gender === 'male') return Math.round(base + 5)
  if (gender === 'female') return Math.round(base - 161)
  return Math.round(base - 78)
}

export function calculateTDEE(bmr: number, activityLevel: ActivityLevel = 'moderate'): number {
  const factor = ACTIVITY_LABELS[activityLevel]?.factor ?? 1.55
  return Math.round(bmr * factor)
}

export function recommendProtocol(patient: Patient): ClinicalProtocol {
  const cond = (patient.conditions ?? '').toLowerCase()
  const goal = (patient.goal ?? '').toLowerCase()

  if (cond.includes('insulina') || cond.includes('diabetes') || cond.includes('glucosa') || (patient.biomarkers?.fasting_glucose ?? 0) >= 100) {
    return 'glycemic_control'
  }
  if (cond.includes('hipertens') || cond.includes('colesterol') || cond.includes(' presión') || (patient.biomarkers?.systolic_bp ?? 0) >= 130) {
    return 'dash_cardio'
  }
  if (goal.includes('masa') || goal.includes('músculo') || goal.includes('musculo') || goal.includes('hipertrofia') || goal.includes('volumen')) {
    return 'muscle_gain'
  }
  if (goal.includes('tonific') || goal.includes('recomposic')) {
    return 'recomposition'
  }
  if (goal.includes('bajar') || goal.includes('pérdida') || goal.includes('perdida') || goal.includes('grasa') || goal.includes('adelgazar')) {
    return 'caloric_deficit'
  }
  return 'balanced'
}

export function calculateClinicalMacros(
  patient: Patient,
  protocol: ClinicalProtocol,
  customCalories?: number,
  customSplit?: { p: number; c: number; f: number },
): MacroTargets {
  const age = calculateAge(patient.birth_date)
  const bmr = calculateBMR(patient.weight_kg, patient.height_cm, age, patient.gender)
  const tdee = calculateTDEE(bmr, patient.activity_level ?? 'moderate')
  const protoInfo = PROTOCOL_INFO[protocol]

  const calories = customCalories ?? Math.max(1200, Math.round((tdee * protoInfo.calFactor) / 10) * 10)
  const split = customSplit ?? protoInfo.macros

  const protein_g = Math.round((calories * (split.p / 100)) / 4)
  const carbs_g   = Math.round((calories * (split.c / 100)) / 4)
  const fat_g     = Math.round((calories * (split.f / 100)) / 9)
  const fiber_g   = Math.round((calories / 1000) * 14) // 14g por cada 1000 kcal
  const water_liters = Number((patient.weight_kg * 0.035).toFixed(1))

  return {
    calories,
    protein_g,
    carbs_g,
    fat_g,
    protein_pct: split.p,
    carbs_pct: split.c,
    fat_pct: split.f,
    fiber_g,
    water_liters,
  }
}

export interface ClinicalAlert {
  type: 'danger' | 'warning' | 'info' | 'success'
  title: string
  detail: string
}

export function evaluatePatientAlerts(patient: Patient): ClinicalAlert[] {
  const alerts: ClinicalAlert[] = []
  const bmi = calculateBMI(patient.weight_kg, patient.height_cm)
  const bio = patient.biomarkers

  if (bmi.value >= 30) {
    alerts.push({
      type: 'warning',
      title: `IMC en rango de ${bmi.category} (${bmi.value})`,
      detail: `Peso saludable estimado entre ${bmi.idealMinKg} kg y ${bmi.idealMaxKg} kg. Priorizar déficit sostenible y saciedad.`,
    })
  }

  if (bio?.fasting_glucose && bio.fasting_glucose >= 100) {
    alerts.push({
      type: bio.fasting_glucose >= 126 ? 'danger' : 'warning',
      title: `Glucosa en ayuno elevada (${bio.fasting_glucose} mg/dL)`,
      detail: bio.fasting_glucose >= 126
        ? 'Rango compatible con diabetes. Evitar azúcares simples y priorizar carga glucémica baja.'
        : 'Rango de prediabetes / resistencia a la insulina. Priorizar fibra soluble y orden de ingesta (vegetales -> proteína -> carbohidrato).',
    })
  }

  if (bio?.systolic_bp && bio.systolic_bp >= 130) {
    alerts.push({
      type: 'warning',
      title: `Tensión Arterial elevada (${bio.systolic_bp}/${bio.diastolic_bp ?? 85} mmHg)`,
      detail: 'Limitar sodio a < 1,500 mg/día. Incrementar aporte de potasio, magnesio y nitratos naturales (betabel, hojas verdes).',
    })
  }

  if (bio?.triglycerides && bio.triglycerides >= 150) {
    alerts.push({
      type: 'warning',
      title: `Hipertrigliceridemia (${bio.triglycerides} mg/dL)`,
      detail: 'Suprimir fructosa industrial, alcohol y harinas refinadas. Suplementar o priorizar EPA/DHA (Omega-3).',
    })
  }

  if (patient.allergies) {
    alerts.push({
      type: 'danger',
      title: `Restricción por Alergia / Intolerancia: ${patient.allergies}`,
      detail: 'El motor de IA excluye estrictamente estos alérgenos y trazas cruzadas del menú.',
    })
  }

  if (alerts.length === 0) {
    alerts.push({
      type: 'success',
      title: 'Biomarcadores en rango fisiológico óptimo',
      detail: 'El paciente no presenta alertas metabólicas agudas registradas.',
    })
  }

  return alerts
}

export function generateHighPrecisionAiPlan(
  patient: Patient,
  options: {
    protocol: ClinicalProtocol
    mealsPerDay: number
    macros: MacroTargets
    doctorNotes: string
  },
): string {
  const age = calculateAge(patient.birth_date)
  const bmi = calculateBMI(patient.weight_kg, patient.height_cm)
  const bmr = calculateBMR(patient.weight_kg, patient.height_cm, age, patient.gender)
  const tdee = calculateTDEE(bmr, patient.activity_level ?? 'moderate')
  const proto = PROTOCOL_INFO[options.protocol]
  const { macros, mealsPerDay, doctorNotes } = options

  const isLactoseFree = (patient.allergies ?? '').toLowerCase().includes('lactosa')
  const isSeafoodFree = (patient.allergies ?? '').toLowerCase().includes('marisco')
  const isGlutenFree  = (patient.allergies ?? '').toLowerCase().includes('gluten')

  const dairySub = isLactoseFree ? 'yogur griego deslactosado / bebida de almendra sin azúcar' : 'yogur griego natural sin azúcar (0% grasa)'
  const carbSource = isGlutenFree ? 'quinoa real, arroz basmati integral o tortilla de maíz nixtamalizado' : 'avena integral laminada, pan de masa madre integral o quinoa'
  const fishSource = isSeafoodFree ? 'pechuga de pavo, salmón chileno o lomo de bacalao (sin crustáceos)' : 'filete de salmón salvaje, robalo o atún fresco a la plancha'

  return `# BORRADOR DEMOSTRATIVO DE PLAN NUTRICIONAL
**Paciente:** ${patient.full_name} (${age} años) | **Protocolo:** ${proto.name}
**Origen:** plantilla local de demostración con cálculos energéticos. Requiere revisión profesional de alimentos, alergias, interacciones y objetivos antes de publicarse; no tiene validación clínica de eficacia.

---

## 1. DIAGNÓSTICO ANTROPOMÉTRICO Y METABÓLICO
* **Peso Actual:** ${patient.weight_kg} kg | **Talla:** ${patient.height_cm} cm | **IMC:** ${bmi.value} kg/m² (${bmi.category})
* **Rango de Peso Saludable Estimado:** ${bmi.idealMinKg} kg – ${bmi.idealMaxKg} kg
${patient.body_fat_pct ? `* **Composición Corporal:** ${patient.body_fat_pct}% Grasa Corporal | ${patient.muscle_mass_kg ?? '--'} kg Masa Muscular | Cintura: ${patient.waist_cm ?? '--'} cm\n` : ''}* **Tasa Metabólica Basal (TMB):** ${bmr} kcal/día
* **Gasto Energético Total (GET):** ${tdee} kcal/día (${ACTIVITY_LABELS[patient.activity_level ?? 'moderate'].label})
* **Meta Energética Prescrita:** **${macros.calories} kcal/día**
${patient.conditions ? `* **Condiciones Clínicas Activas:** ${patient.conditions}\n` : ''}${patient.allergies ? `* **⚠️ ALERGIAS / EXCLUSIÓN ESTRICTA:** ${patient.allergies}\n` : ''}${patient.medications ? `* **Fármacos / Interacción Nutriente-Fármaco:** ${patient.medications}\n` : ''}

---

## 2. FÓRMULA DIETOSINTÉTICA Y MACRONUTRIENTES DIARIOS
| Macronutriente | Porcentaje | Gramos / Día | Gramos / kg Peso | Calorías |
| :--- | :---: | :---: | :---: | :---: |
| **Proteínas de Alto Valor Biológico** | ${macros.protein_pct}% | **${macros.protein_g} g** | ${(macros.protein_g / patient.weight_kg).toFixed(2)} g/kg | ${macros.protein_g * 4} kcal |
| **Carbohidratos de Bajo Índice Glucémico** | ${macros.carbs_pct}% | **${macros.carbs_g} g** | ${(macros.carbs_g / patient.weight_kg).toFixed(2)} g/kg | ${macros.carbs_g * 4} kcal |
| **Lípidos Cardioprotectores (MUFAs/PUFAs)** | ${macros.fat_pct}% | **${macros.fat_g} g** | ${(macros.fat_g / patient.weight_kg).toFixed(2)} g/kg | ${macros.fat_g * 9} kcal |
| **Fibra Dietética Total** | — | **${macros.fiber_g} g** | — | Soluble e Insoluble |
| **Hidratación Basal (35 ml/kg)** | — | **${macros.water_liters} Litros** | — | Agua natural / infusiones |

---

## 3. ESTRUCTURA DE ALIMENTACIÓN (${mealsPerDay} TIEMPOS DE COMIDA)

### 🌅 TIEMPO 1: Desayuno Metabólico (07:30 - 09:00 hrs) — ~${Math.round(macros.calories * 0.25)} kcal
* **Opción A (Salada - Alta Saciedad):**
  * 2 huevos enteros orgánicos + 2 claras revueltos con 1 taza de espinaca baby, champiñones fileteados y jitomate cherry.
  * 1 porción de carbohidrato complejo: ${carbSource} (45g en crudo o 1 rebanada gruesa).
  * 1/3 de pieza de aguacate Hass (grasas monoinsaturadas).
  * Café americano o té verde antioxidante sin endulzantes calóricos.
* **Opción B (Bowl Proteico Funcional):**
  * 180g de ${dairySub} mezclado con 1 scoop (25g) de proteína aislada o 30g de claras pasteurizadas cocidas.
  * 40g de avena certificada + 1 cucharada de semillas de chía hidratadas y 1/2 taza de frutos rojos (fresas, zarzamoras, arándanos).
  * 10 almendras fileteadas.

${mealsPerDay >= 4 ? `### 🍏 TIEMPO 2: Colación Matutina (11:30 hrs) — ~${Math.round(macros.calories * 0.10)} kcal
* **Opción A:** 1 manzana verde o pera mediana con 15g de nueces de castilla (control de pico glucémico).
* **Opción B:** 1 taza de jícama y pepino con limón + 100g de pechuga de pavo baja en sodio o edamames al vapor.\n` : ''}
### ☀️ TIEMPO ${mealsPerDay >= 4 ? '3' : '2'}: Comida Principal (14:00 - 15:30 hrs) — ~${Math.round(macros.calories * (mealsPerDay >= 4 ? 0.35 : 0.40))} kcal
* **Regla del Plato Clínico:** Ingerir primero la ensalada de vegetales fibrosos, segundo la proteína y al final los carbohidratos complejos (reduce hasta un 35% la excursión glucémica postprandial).
* **Opción A:**
  * **Proteína:** 160g (peso en cocido) de pechuga de pollo a las finas hierbas o bistec de res magro.
  * **Vegetales Libres:** 2 tazas de ensalada fresca (lechuga sangría, arúgula, pepino, pimiento morrón) con 1 cucharada de aceite de oliva extra virgen (AOVE) y vinagre balsámico.
  * **Carbohidrato:** 120g de ${carbSource} cocido + 1/2 taza de lentejas o frijoles negros en bola.
* **Opción B:**
  * **Proteína:** 170g de ${fishSource} al horno con ajo, limón y eneldo.
  * **Vegetales:** Brócoli, espárragos y calabacitas asadas al vapor (2 tazas).
  * **Carbohidrato:** 140g de camote horneado con canela o arroz integral con cúrcuma.

${mealsPerDay >= 5 ? `### 🥜 TIEMPO 4: Colación Vespertina / Pre-Entreno (17:30 hrs) — ~${Math.round(macros.calories * 0.10)} kcal
* **Opción A:** 150g de ${dairySub} con canela en polvo y 1 cucharadita de crema de cacahuate 100% natural.
* **Opción B:** 2 tortitas de arroz inflado integral con 1/3 de aguacate y 60g de atún al agua o hummus de garbanzo.\n` : ''}
### 🌙 TIEMPO ${mealsPerDay}: Cena Ligera Reparadora (20:00 - 21:00 hrs) — ~${Math.round(macros.calories * (mealsPerDay >= 5 ? 0.20 : mealsPerDay === 4 ? 0.30 : 0.35))} kcal
* **Opción A:**
  * 140g de filete de pescado blanco o pechuga de pollo deshebrada.
  * Fajitas de pimientos, cebolla morada y nopales asados sin grasa añadida.
  * 1/4 de aguacate Hass y 1 tostada horneada de maíz.
* **Opción B:**
  * Omelette nocturno de 3 claras + 1 huevo entero relleno de flor de calabaza o espinacas al vapor.
  * Crema casera de calabacín y chayote (elaborada sin crema láctea ni féculas).
  * Infusión relajante de manzanilla, toronjil o pasiflora 45 min antes de dormir.

---

## 4. SEMÁFORO CLÍNICO DE ALIMENTOS
* 🟢 **Priorizar a diario:** Hojas verdes oscuras, crucíferas (brócoli, coliflor), bayas antioxidantes, aceite de oliva extra virgen, aguacate, pescados ricos en EPA/DHA, semillas de chía y linaza molida.
* 🟡 **Moderar (2-3 veces/semana):** Carnes rojas magras, tubérculos de alto índice glucémico (papa blanca), quesos madurados.
* 🔴 **Evitar estrictamente:** ${patient.allergies ? `**${patient.allergies.toUpperCase()}**, ` : ''}bebidas azucaradas, jarabe de maíz de alta fructosa, aceites vegetales refinados (soya, maíz, canola), bollería industrial y embutidos altos en nitritos/sodio.

---

## 5. PRESCRIPCIÓN DE SUPLEMENTACIÓN Y HÁBITOS CLÍNICOS
1. **Omega-3 de Grado Farmacéutico:** 1,000 a 2,000 mg de EPA/DHA combinados con la comida principal.
2. **Citrato o Bisglicinato de Magnesio:** 300-400 mg por la noche (mejora sensibilidad a la insulina y arquitectura del sueño).
3. **Vitamina D3 + K2:** Evaluar niveles séricos de 25(OH)D; dosis de mantenimiento sugerida 2,000 - 4,000 UI/día.
4. **Caminata Postprandial:** Realizar 10-15 minutos de caminata ligera inmediatamente después de la comida principal.
${doctorNotes ? `\n---\n## 6. INDICACIONES ESPECÍFICAS DEL MÉDICO TRATANTE\n> ${doctorNotes}` : ''}`
}

