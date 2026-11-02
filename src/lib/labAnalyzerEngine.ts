import type { LabBiomarkers } from '@/types/patient'
import type { ClinicalProtocol } from '@/types/plan'

export interface BiomarkerEvaluation {
  key: keyof LabBiomarkers
  label: string
  value: number
  unit: string
  refRange: string
  status: 'optimal' | 'warning' | 'critical'
  clinicalNote: string
}

export interface LabInterpretationResult {
  homaIr: number | null
  homaStatus: { label: string; color: string } | null
  tgHdlRatio: number | null
  tgHdlStatus: { label: string; color: string } | null
  evaluations: BiomarkerEvaluation[]
  detectedConditions: string[]
  nutritionalAdjustments: string[]
  suggestedSupplements: string[]
  recommendedProtocol: ClinicalProtocol
}

export const SAMPLE_LAB_PRESETS: {
  id: string
  title: string
  subtitle: string
  sampleText: string
  biomarkers: LabBiomarkers
}[] = [
  {
    id: 'insulin_resistance',
    title: '🧪 Síndrome Metabólico / HOMA-IR Elevado',
    subtitle: 'Glucosa 109 mg/dL, Insulina 14.8 uU/mL, TG 215 mg/dL, Vit D baja',
    sampleText: `LABORATORIO CLÍNICO MÉDICO — QUÍMICA SANGUÍNEA Y PERFIL HORMONAL
Fecha de estudio: ${new Date().toISOString().split('T')[0]}
-----------------------------------------------------------------
Glucosa en ayuno:          109 mg/dL      (Ref: 70 - 99 mg/dL)   *ALTO
Insulina basal:            14.8 uU/mL     (Ref: 2.0 - 10.0)      *ALTO
Hemoglobina Glicosilada:   5.9 %          (Ref: 4.0 - 5.6 %)     *PREDIABETES
Colesterol Total:          218 mg/dL      (Ref: < 200 mg/dL)
Colesterol HDL:            39 mg/dL       (Ref: > 45 mg/dL)      *BAJO
Colesterol LDL:            136 mg/dL      (Ref: < 100 mg/dL)
Triglicéridos:             215 mg/dL      (Ref: < 150 mg/dL)     *ALTO
Ácido Úrico:               6.4 mg/dL      (Ref: 3.5 - 7.0 mg/dL)
Creatinina sérica:         0.85 mg/dL     (Ref: 0.6 - 1.2 mg/dL)
TSH Ultrasensible:         2.3 mUI/L      (Ref: 0.5 - 4.0 mUI/L)
25-OH Vitamina D:          18.4 ng/mL     (Ref: 30 - 60 ng/mL)   *DEFICIENCIA
Ferritina sérica:          68 ng/mL       (Ref: 40 - 200 ng/mL)
Presión Arterial:          128/84 mmHg`,
    biomarkers: {
      fasting_glucose: 109,
      fasting_insulin: 14.8,
      hba1c: 5.9,
      cholesterol_total: 218,
      hdl_cholesterol: 39,
      ldl_cholesterol: 136,
      triglycerides: 215,
      uric_acid: 6.4,
      creatinine: 0.85,
      tsh: 2.3,
      vitamin_d: 18.4,
      ferritin: 68,
      systolic_bp: 128,
      diastolic_bp: 84,
      last_lab_date: new Date().toISOString().split('T')[0],
    },
  },
  {
    id: 'thyroid_anemia',
    title: '🦋 Hipotiroidismo Subclínico + Ferropenia',
    subtitle: 'TSH 5.6 mUI/L, Ferritina 19 ng/mL, Vitamina D 21 ng/mL',
    sampleText: `LABORATORIO CLÍNICO MÉDICO — PERFIL TIROIDEO Y NUTRICIONAL
Fecha de estudio: ${new Date().toISOString().split('T')[0]}
-----------------------------------------------------------------
Glucosa en ayuno:          88 mg/dL       (Ref: 70 - 99 mg/dL)
Insulina basal:            6.2 uU/mL      (Ref: 2.0 - 10.0)
Hemoglobina Glicosilada:   5.2 %          (Ref: 4.0 - 5.6 %)
Colesterol Total:          206 mg/dL      (Ref: < 200 mg/dL)
Colesterol HDL:            56 mg/dL       (Ref: > 50 mg/dL)
Colesterol LDL:            124 mg/dL      (Ref: < 100 mg/dL)
Triglicéridos:             118 mg/dL      (Ref: < 150 mg/dL)
Ácido Úrico:               4.6 mg/dL      (Ref: 3.5 - 7.0 mg/dL)
Creatinina sérica:         0.78 mg/dL     (Ref: 0.6 - 1.2 mg/dL)
TSH Ultrasensible:         5.6 mUI/L      (Ref: 0.5 - 4.0 mUI/L) *ALTO
25-OH Vitamina D:          21.0 ng/mL     (Ref: 30 - 60 ng/mL)   *INSUFICIENCIA
Ferritina sérica:          19.0 ng/mL     (Ref: 40 - 200 ng/mL)  *BAJO
Presión Arterial:          112/72 mmHg`,
    biomarkers: {
      fasting_glucose: 88,
      fasting_insulin: 6.2,
      hba1c: 5.2,
      cholesterol_total: 206,
      hdl_cholesterol: 56,
      ldl_cholesterol: 124,
      triglycerides: 118,
      uric_acid: 4.6,
      creatinine: 0.78,
      tsh: 5.6,
      vitamin_d: 21.0,
      ferritin: 19.0,
      systolic_bp: 112,
      diastolic_bp: 72,
      last_lab_date: new Date().toISOString().split('T')[0],
    },
  },
  {
    id: 'cardio_uric',
    title: '❤️ Dislipidemia + Hiperuricemia + Hipertensión',
    subtitle: 'Colesterol 248, LDL 162, Ácido Úrico 7.9 mg/dL, PA 142/90',
    sampleText: `LABORATORIO CLÍNICO MÉDICO — PERFIL CARDIOMETABÓLICO
Fecha de estudio: ${new Date().toISOString().split('T')[0]}
-----------------------------------------------------------------
Glucosa en ayuno:          97 mg/dL       (Ref: 70 - 99 mg/dL)
Insulina basal:            9.5 uU/mL      (Ref: 2.0 - 10.0)
Hemoglobina Glicosilada:   5.5 %          (Ref: 4.0 - 5.6 %)
Colesterol Total:          248 mg/dL      (Ref: < 200 mg/dL)     *ALTO
Colesterol HDL:            41 mg/dL       (Ref: > 45 mg/dL)      *BAJO
Colesterol LDL:            162 mg/dL      (Ref: < 100 mg/dL)     *ALTO
Triglicéridos:             198 mg/dL      (Ref: < 150 mg/dL)     *ALTO
Ácido Úrico:               7.9 mg/dL      (Ref: 3.5 - 7.0 mg/dL) *HIPERURICEMIA
Creatinina sérica:         1.05 mg/dL     (Ref: 0.6 - 1.2 mg/dL)
TSH Ultrasensible:         1.9 mUI/L      (Ref: 0.5 - 4.0 mUI/L)
25-OH Vitamina D:          31.5 ng/mL     (Ref: 30 - 60 ng/mL)
Ferritina sérica:          115 ng/mL      (Ref: 40 - 200 ng/dL)
Presión Arterial:          142/90 mmHg`,
    biomarkers: {
      fasting_glucose: 97,
      fasting_insulin: 9.5,
      hba1c: 5.5,
      cholesterol_total: 248,
      hdl_cholesterol: 41,
      ldl_cholesterol: 162,
      triglycerides: 198,
      uric_acid: 7.9,
      creatinine: 1.05,
      tsh: 1.9,
      vitamin_d: 31.5,
      ferritin: 115,
      systolic_bp: 142,
      diastolic_bp: 90,
      last_lab_date: new Date().toISOString().split('T')[0],
    },
  },
]

/**
 * Extrae valores bioquímicos desde texto libre de laboratorio (OCR / PDF / Texto pegado)
 */
export function parseLabReportText(text: string): LabBiomarkers {
  const findNum = (patterns: RegExp[]): number | undefined => {
    for (const reg of patterns) {
      const m = text.match(reg)
      if (m && m[1]) {
        const val = parseFloat(m[1].replace(',', '.'))
        if (!isNaN(val)) return val
      }
    }
    return undefined
  }

  const bpMatch = text.match(/(?:presi[oó]n|pa|ta)[^\d]*(\d{2,3})\s*\/\s*(\d{2,3})/i)

  return {
    fasting_glucose:   findNum([/glucosa[^\d]*(\d+(?:[.,]\d+)?)/i, /glucose[^\d]*(\d+(?:[.,]\d+)?)/i]),
    fasting_insulin:   findNum([/insulina[^\d]*(\d+(?:[.,]\d+)?)/i, /insulin[^\d]*(\d+(?:[.,]\d+)?)/i]),
    hba1c:             findNum([/(?:hba1c|glicosilada|hemoglobina\s+a1c)[^\d]*(\d+(?:[.,]\d+)?)/i]),
    cholesterol_total: findNum([/colesterol\s+total[^\d]*(\d+(?:[.,]\d+)?)/i]),
    hdl_cholesterol:   findNum([/(?:colesterol\s+hdl|hdl)[^\d]*(\d+(?:[.,]\d+)?)/i]),
    ldl_cholesterol:   findNum([/(?:colesterol\s+ldl|ldl)[^\d]*(\d+(?:[.,]\d+)?)/i]),
    triglycerides:     findNum([/triglic[eé]ridos[^\d]*(\d+(?:[.,]\d+)?)/i]),
    uric_acid:         findNum([/[aá]cido\s+[uú]rico[^\d]*(\d+(?:[.,]\d+)?)/i]),
    creatinine:        findNum([/creatinina[^\d]*(\d+(?:[.,]\d+)?)/i]),
    tsh:               findNum([/tsh[^\d]*(\d+(?:[.,]\d+)?)/i, /tirotropina[^\d]*(\d+(?:[.,]\d+)?)/i]),
    vitamin_d:         findNum([/(?:25-oh\s+vitamina\s+d|vitamina\s+d)[^\d]*(\d+(?:[.,]\d+)?)/i]),
    ferritin:          findNum([/ferritina[^\d]*(\d+(?:[.,]\d+)?)/i]),
    systolic_bp:       bpMatch ? parseFloat(bpMatch[1]) : undefined,
    diastolic_bp:      bpMatch ? parseFloat(bpMatch[2]) : undefined,
    last_lab_date:     new Date().toISOString().split('T')[0],
  }
}

export function interpretBiomarkers(
  bio: LabBiomarkers,
  gender: 'male' | 'female' | 'other' = 'female',
): LabInterpretationResult {
  const evaluations: BiomarkerEvaluation[] = []
  const detectedConditions: string[] = []
  const nutritionalAdjustments: string[] = []
  const suggestedSupplements: string[] = []

  // Cálculo HOMA-IR = (Glucosa * Insulina) / 405
  const homaIr =
    bio.fasting_glucose && bio.fasting_insulin
      ? Number(((bio.fasting_glucose * bio.fasting_insulin) / 405).toFixed(2))
      : null

  let homaStatus: { label: string; color: string } | null = null
  if (homaIr !== null) {
    if (homaIr < 2.0) {
      homaStatus = { label: 'Sensibilidad Insulínica Óptima (<2.0)', color: 'text-accent bg-accent-soft border-accent-line' }
    } else if (homaIr < 2.9) {
      homaStatus = { label: 'Resistencia a la Insulina Temprana', color: 'text-warning bg-warning-soft border-warning-line' }
      detectedConditions.push(`Resistencia a la insulina incipiente (HOMA-IR ${homaIr})`)
      nutritionalAdjustments.push('Restringir azúcares libres y aplicar secuencia de ingesta (fibra vegetal antes del almidón).')
      suggestedSupplements.push('Mio-Inositol 2,000 mg + Bisglicinato de Magnesio 300 mg')
    } else {
      homaStatus = { label: 'Resistencia a la Insulina Significativa (≥2.9)', color: 'text-danger bg-danger-soft border-danger-line' }
      detectedConditions.push(`Resistencia a la insulina clínica (HOMA-IR ${homaIr})`)
      nutritionalAdjustments.push('Protocolo de bajo índice glucémico estricto (carbohidratos ≤35% VCT) con almidón resistente.')
      suggestedSupplements.push('Mio-Inositol 2g + Berberina 500mg o Ácido Alfa Lipoico (según criterio médico)')
    }
  }

  // Cálculo Índice Aterogénico TG / HDL
  const tgHdlRatio =
    bio.triglycerides && bio.hdl_cholesterol && bio.hdl_cholesterol > 0
      ? Number((bio.triglycerides / bio.hdl_cholesterol).toFixed(2))
      : null

  let tgHdlStatus: { label: string; color: string } | null = null
  if (tgHdlRatio !== null) {
    if (tgHdlRatio < 2.0) {
      tgHdlStatus = { label: 'Bajo Riesgo Aterogénico (<2.0)', color: 'text-accent bg-accent-soft border-accent-line' }
    } else if (tgHdlRatio <= 3.5) {
      tgHdlStatus = { label: 'Riesgo Moderado (2.0 – 3.5)', color: 'text-warning bg-warning-soft border-warning-line' }
    } else {
      tgHdlStatus = { label: 'Patrón LDL Pequeño y Denso (>3.5)', color: 'text-danger bg-danger-soft border-danger-line' }
      detectedConditions.push(`Índice TG/HDL aterogénico elevado (${tgHdlRatio})`)
      nutritionalAdjustments.push('Incrementar EPA/DHA (pescado azul) y eliminar harinas refinadas y fructosa líquida.')
    }
  }

  // 1. Glucosa
  if (bio.fasting_glucose !== undefined) {
    const v = bio.fasting_glucose
    const status = v < 100 ? 'optimal' : v < 126 ? 'warning' : 'critical'
    evaluations.push({
      key: 'fasting_glucose',
      label: 'Glucosa en Ayuno',
      value: v,
      unit: 'mg/dL',
      refRange: '70 – 99 mg/dL',
      status,
      clinicalNote: status === 'optimal' ? 'Normoglucemia basal' : v < 126 ? 'Glucosa alterada en ayuno (Prediabetes)' : 'Hiperglucemia compatible con Diabetes',
    })
    if (v >= 100) {
      detectedConditions.push(v >= 126 ? `Hiperglucemia basal (${v} mg/dL)` : `Prediabetes / Glucosa en ayuno elevada (${v} mg/dL)`)
    }
  }

  // 2. Insulina
  if (bio.fasting_insulin !== undefined) {
    const v = bio.fasting_insulin
    const status = v <= 9 ? 'optimal' : v <= 14 ? 'warning' : 'critical'
    evaluations.push({
      key: 'fasting_insulin',
      label: 'Insulina Basal',
      value: v,
      unit: 'µU/mL',
      refRange: '2.0 – 9.0 µU/mL',
      status,
      clinicalNote: status === 'optimal' ? 'Secreción pancreática basal normal' : 'Hiperinsulinemia compensatoria',
    })
  }

  // 3. HbA1c
  if (bio.hba1c !== undefined) {
    const v = bio.hba1c
    const status = v < 5.7 ? 'optimal' : v < 6.5 ? 'warning' : 'critical'
    evaluations.push({
      key: 'hba1c',
      label: 'Hemoglobina Glicosilada (HbA1c)',
      value: v,
      unit: '%',
      refRange: '< 5.7 %',
      status,
      clinicalNote: status === 'optimal' ? 'Control glucémico trimestral óptimo' : v < 6.5 ? 'Rango de prediabetes (5.7 - 6.4%)' : 'Rango diabético (≥ 6.5%)',
    })
  }

  // 4. Colesterol Total
  if (bio.cholesterol_total !== undefined) {
    const v = bio.cholesterol_total
    const status = v < 200 ? 'optimal' : v < 240 ? 'warning' : 'critical'
    evaluations.push({
      key: 'cholesterol_total',
      label: 'Colesterol Total',
      value: v,
      unit: 'mg/dL',
      refRange: '< 200 mg/dL',
      status,
      clinicalNote: status === 'optimal' ? 'Deseable' : 'Hipercolesterolemia — priorizar esteroles vegetales y fibra soluble',
    })
  }

  // 5. LDL
  if (bio.ldl_cholesterol !== undefined) {
    const v = bio.ldl_cholesterol
    const status = v < 100 ? 'optimal' : v < 130 ? 'warning' : 'critical'
    evaluations.push({
      key: 'ldl_cholesterol',
      label: 'Colesterol LDL',
      value: v,
      unit: 'mg/dL',
      refRange: '< 100 mg/dL',
      status,
      clinicalNote: status === 'optimal' ? 'Óptimo cardioprotector' : 'Elevado — reducir grasas saturadas y sumar beta-glucanos (avena)',
    })
    if (v >= 130) {
      detectedConditions.push(`Colesterol LDL elevado (${v} mg/dL)`)
      nutritionalAdjustments.push('Incluir 3g/día de beta-glucanos de avena, chía molida y sustituir grasas saturadas por AOVE.')
    }
  }

  // 6. HDL
  if (bio.hdl_cholesterol !== undefined) {
    const v = bio.hdl_cholesterol
    const minOptimal = gender === 'male' ? 45 : 50
    const status = v >= minOptimal ? 'optimal' : v >= 38 ? 'warning' : 'critical'
    evaluations.push({
      key: 'hdl_cholesterol',
      label: 'Colesterol HDL',
      value: v,
      unit: 'mg/dL',
      refRange: `> ${minOptimal} mg/dL`,
      status,
      clinicalNote: status === 'optimal' ? 'Factor cardioprotector adecuado' : 'HDL hipoalfalipoproteinemia — aumentar aguacate, AOVE y ejercicio aeróbico',
    })
  }

  // 7. Triglicéridos
  if (bio.triglycerides !== undefined) {
    const v = bio.triglycerides
    const status = v < 150 ? 'optimal' : v < 200 ? 'warning' : 'critical'
    evaluations.push({
      key: 'triglycerides',
      label: 'Triglicéridos Séricos',
      value: v,
      unit: 'mg/dL',
      refRange: '< 150 mg/dL',
      status,
      clinicalNote: status === 'optimal' ? 'Normotrigliceridemia' : 'Hipertrigliceridemia — eliminar fructosa industrial y alcohol',
    })
    if (v >= 150) {
      detectedConditions.push(`Hipertrigliceridemia (${v} mg/dL)`)
      suggestedSupplements.push('Omega-3 EPA/DHA de grado farmacéutico (2,000 mg/día con alimentos)')
    }
  }

  // 8. Ácido Úrico
  if (bio.uric_acid !== undefined) {
    const v = bio.uric_acid
    const maxNormal = gender === 'male' ? 7.0 : 6.0
    const status = v <= maxNormal ? 'optimal' : v <= maxNormal + 1.0 ? 'warning' : 'critical'
    evaluations.push({
      key: 'uric_acid',
      label: 'Ácido Úrico',
      value: v,
      unit: 'mg/dL',
      refRange: `3.5 – ${maxNormal} mg/dL`,
      status,
      clinicalNote: status === 'optimal' ? 'Metabolismo de purinas normal' : 'Hiperuricemia — hidratación ≥2.8L y limitar vísceras/mariscos/fructosa',
    })
    if (v > maxNormal) {
      detectedConditions.push(`Hiperuricemia (${v} mg/dL)`)
      nutritionalAdjustments.push('Restringir carnes rojas ricas en purinas, mariscos y jarabe de alta fructosa; alcalinizar con cítricos y cerezas.')
    }
  }

  // 9. TSH
  if (bio.tsh !== undefined) {
    const v = bio.tsh
    const status = v >= 0.5 && v <= 3.5 ? 'optimal' : v <= 4.5 ? 'warning' : 'critical'
    evaluations.push({
      key: 'tsh',
      label: 'TSH Ultrasensible (Tiroides)',
      value: v,
      unit: 'mUI/L',
      refRange: '0.5 – 3.5 mUI/L',
      status,
      clinicalNote: status === 'optimal' ? 'Eutiroidismo funcional' : 'TSH elevada — vigilar conversión T4 a T3 (Selenio, Zinc, Yodo)',
    })
    if (v > 4.0) {
      detectedConditions.push(`Hipotiroidismo subclínico / TSH elevada (${v} mUI/L)`)
      nutritionalAdjustments.push('Asegurar cofactores tiroideos (Selenio, Zinc, Hierro) y cocinar crucíferas al vapor (evitar bociógenos crudos en exceso).')
      suggestedSupplements.push('Seleniometionina 100-200 mcg + Zinc Picolinato 15 mg')
    }
  }

  // 10. Vitamina D
  if (bio.vitamin_d !== undefined) {
    const v = bio.vitamin_d
    const status = v >= 30 ? 'optimal' : v >= 20 ? 'warning' : 'critical'
    evaluations.push({
      key: 'vitamin_d',
      label: '25-OH Vitamina D',
      value: v,
      unit: 'ng/mL',
      refRange: '30 – 60 ng/mL',
      status,
      clinicalNote: status === 'optimal' ? 'Suficiencia inmunometabólica' : v >= 20 ? 'Insuficiencia de Vitamina D' : 'Deficiencia clínica de Vitamina D (<20 ng/mL)',
    })
    if (v < 30) {
      detectedConditions.push(`Hipovitaminosis D (${v} ng/mL)`)
      suggestedSupplements.push(`Vitamina D3 (Colecalciferol) ${v < 20 ? '4,000 - 5,000' : '2,000 - 4,000'} UI/día + Vitamina K2 (MK-7)`)
    }
  }

  // 11. Ferritina
  if (bio.ferritin !== undefined) {
    const v = bio.ferritin
    const status = v >= 40 ? 'optimal' : v >= 25 ? 'warning' : 'critical'
    evaluations.push({
      key: 'ferritin',
      label: 'Ferritina Sérica (Reservas de Hierro)',
      value: v,
      unit: 'ng/mL',
      refRange: '40 – 200 ng/mL',
      status,
      clinicalNote: status === 'optimal' ? 'Depósitos férricos óptimos' : 'Reservas de hierro bajas — combinar hierro hemo/vegetal con Vitamina C',
    })
    if (v < 30) {
      detectedConditions.push(`Ferropenia / Reservas bajas de ferritina (${v} ng/mL)`)
      nutritionalAdjustments.push('Combinar fuentes de hierro (res magra, lentejas, espinaca) con cítricos (Vitamina C) y separar café/té 1 hora de las comidas.')
    }
  }

  // Protocolo recomendado según hallazgos
  let recommendedProtocol: ClinicalProtocol = 'balanced'
  if ((homaIr && homaIr >= 2.2) || (bio.fasting_glucose && bio.fasting_glucose >= 100) || (bio.hba1c && bio.hba1c >= 5.7)) {
    recommendedProtocol = 'glycemic_control'
  } else if ((bio.systolic_bp && bio.systolic_bp >= 130) || (bio.ldl_cholesterol && bio.ldl_cholesterol >= 130) || (bio.triglycerides && bio.triglycerides >= 170)) {
    recommendedProtocol = 'dash_cardio'
  } else if (bio.tsh && bio.tsh > 4.0) {
    recommendedProtocol = 'mediterranean'
  }

  if (nutritionalAdjustments.length === 0) {
    nutritionalAdjustments.push('Mantener dieta rica en antioxidantes, fibra prebiótica (28-35g/día) y adecuado balance de Omega-3.')
  }

  return {
    homaIr,
    homaStatus,
    tgHdlRatio,
    tgHdlStatus,
    evaluations,
    detectedConditions,
    nutritionalAdjustments,
    suggestedSupplements,
    recommendedProtocol,
  }
}

