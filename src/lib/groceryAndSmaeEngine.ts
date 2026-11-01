import type { Patient } from '@/types/patient'
import type { MacroTargets, ClinicalProtocol } from '@/types/plan'

export interface GroceryItem {
  id: string
  name: string
  quantity: string
  category: GroceryAisle
  clinicalNote: string
  allergySafe?: boolean
}

export type GroceryAisle =
  | 'proteins'
  | 'produce'
  | 'grains'
  | 'fats'
  | 'dairy'
  | 'pantry'

export const AISLE_INFO: Record<GroceryAisle, { title: string; icon: string; badgeColor: string }> = {
  proteins: {
    title: '🥩 Carnes, Aves, Pescados y Huevo',
    icon: '🥩',
    badgeColor: 'bg-rose-50 text-rose-800 border-rose-200',
  },
  produce: {
    title: '🥦 Frutas, Verduras y Hojas Verdes',
    icon: '🥦',
    badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  grains: {
    title: '🌾 Cereales Integrales, Tubérculos y Legumbres',
    icon: '🌾',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  fats: {
    title: '🥑 Grasas Saludables, Semillas y Aceites',
    icon: '🥑',
    badgeColor: 'bg-teal-50 text-teal-800 border-teal-200',
  },
  dairy: {
    title: '🥛 Lácteos Clínicos y Bebidas Vegetales',
    icon: '🥛',
    badgeColor: 'bg-sky-50 text-sky-800 border-sky-200',
  },
  pantry: {
    title: '🌿 Condimentos Funcionales e Infusiones',
    icon: '🌿',
    badgeColor: 'bg-violet-50 text-violet-800 border-violet-200',
  },
}

/**
 * Genera una lista de supermercado cuantificada exacta para 7, 14 o 30 días
 * adaptada a los gramos de proteína, carbohidratos, grasas, alergias y protocolo del paciente.
 */
export function generateSmartGroceryList(
  patient: Patient,
  macros: MacroTargets,
  days: 7 | 14 | 30 = 7,
  protocol: ClinicalProtocol = 'balanced',
): GroceryItem[] {
  const mult = days / 7 // Factor semanal
  const allergies = (patient.allergies ?? '').toLowerCase()
  const isLactoseFree = allergies.includes('lactosa')
  const isSeafoodFree = allergies.includes('marisco')
  const isGlutenFree  = allergies.includes('gluten')
  const isNutFree     = allergies.includes('cacahuate') || allergies.includes('nuez') || allergies.includes('nueces')
  const isKeto        = protocol === 'ketogenic'
  const isDash        = protocol === 'dash_cardio'

  // Factor escalar según requerimiento proteico diario (base 120g/día)
  const pScale = Math.max(0.7, macros.protein_g / 120)
  // Factor escalar según carbohidratos diarios (base 150g/día)
  const cScale = isKeto ? 0.25 : Math.max(0.6, macros.carbs_g / 150)

  const fmtKg = (kgBase: number) => {
    const total = Number((kgBase * mult).toFixed(1))
    return total >= 1 ? `${total} kg` : `${Math.round(total * 1000)} g`
  }

  const fmtPcs = (pcsBase: number, unit = 'piezas') => {
    return `${Math.ceil(pcsBase * mult)} ${unit}`
  }

  const items: GroceryItem[] = [
    // 1. PROTEÍNAS
    {
      id: 'prot-chicken',
      name: 'Pechuga de pollo orgánica sin piel (fileteada)',
      quantity: fmtKg(1.2 * pScale),
      category: 'proteins',
      clinicalNote: 'Proteína magra de alto valor biológico (23g proteína / 100g)',
    },
    {
      id: 'prot-fish',
      name: isSeafoodFree
        ? 'Filete de salmón chileno y lomo de bacalao/tilapia (Sin crustáceos)'
        : 'Filete de salmón fresco y pescado blanco (robalo / huachinango)',
      quantity: fmtKg(0.9 * pScale),
      category: 'proteins',
      clinicalNote: isSeafoodFree
        ? 'Exclusión estricta de mariscos aplicada • Rico en EPA/DHA'
        : 'Aporte cardioprotector de ácidos grasos Omega-3',
      allergySafe: isSeafoodFree,
    },
    {
      id: 'prot-eggs',
      name: 'Huevo entero de libre pastoreo + 1 litro de claras pasteurizadas',
      quantity: `${Math.ceil(18 * pScale * mult)} huevos + ${Math.ceil(1 * mult)} L claras`,
      category: 'proteins',
      clinicalNote: 'Colina, leucina y albúmina de absorción óptima para el desayuno',
    },
    {
      id: 'prot-beef',
      name: isDash
        ? 'Pechuga de pavo natural horneada (baja en sodio) o lomo de atún fresco'
        : 'Bistec de res magro (filete / cuete) o lomo de cerdo sin grasa',
      quantity: fmtKg(0.6 * pScale),
      category: 'proteins',
      clinicalNote: isDash
        ? 'Protocolo DASH: libre de nitritos y bajo en sodio'
        : 'Fuente biodisponible de Hierro Hemo, Zinc y Vitamina B12',
    },

    // 2. FRUTAS Y VERDURAS
    {
      id: 'prod-greens',
      name: 'Espinaca baby, arúgula y mezcla de lechugas oscuras',
      quantity: fmtPcs(3, 'bolsas / manojos grandes'),
      category: 'produce',
      clinicalNote: 'Magnesio, folatos y nitratos naturales vasodilatadores',
    },
    {
      id: 'prod-cruciferous',
      name: 'Brócoli, espárragos verdes y calabacitas italianas',
      quantity: fmtKg(1.8),
      category: 'produce',
      clinicalNote: 'Sulforafano antioxidante y fibra prebiótica de alta saciedad',
    },
    {
      id: 'prod-veggies',
      name: 'Pepino, pimientos morrones, jitomate cherry, nopales y champiñones',
      quantity: fmtKg(2.2),
      category: 'produce',
      clinicalNote: 'Hidratación celular, potasio y volumen gástrico libre de calorías',
    },
    {
      id: 'prod-berries',
      name: 'Frutos rojos (fresas, zarzamoras, arándanos) y manzana verde',
      quantity: `${fmtKg(0.8)} bayas + ${fmtPcs(5, 'manzanas')}`,
      category: 'produce',
      clinicalNote: 'Polifenoles con mínima excursión de glucosa e insulina',
    },

    // 3. CEREALES Y LEGUMINOSAS
    ...(isKeto
      ? [
          {
            id: 'grain-keto',
            name: 'Harina de almendra y arroz de coliflor rallado',
            quantity: fmtKg(0.8),
            category: 'grains' as GroceryAisle,
            clinicalNote: 'Sustituto cetogénico <5g carbohidratos netos por porción',
          },
        ]
      : [
          {
            id: 'grain-oats',
            name: isGlutenFree
              ? 'Avena certificada libre de gluten y Quinoa real blanca/tricolor'
              : 'Avena integral laminada (hojuela entera) y Quinoa real',
            quantity: fmtKg(0.7 * cScale),
            category: 'grains' as GroceryAisle,
            clinicalNote: 'Beta-glucanos que reducen colesterol LDL y glucosa postprandial',
            allergySafe: isGlutenFree,
          },
          {
            id: 'grain-corn',
            name: isGlutenFree
              ? 'Tortillas de maíz nixtamalizado y tostadas horneadas Susalia'
              : 'Pan de masa madre integral y tortillas de maíz nixtamalizado',
            quantity: fmtPcs(2, 'paquetes'),
            category: 'grains' as GroceryAisle,
            clinicalNote: 'Fermentación lenta / nixtamalización con calcio biodisponible',
          },
          {
            id: 'grain-legumes',
            name: 'Lentejas, garbanzos, frijol negro en bola y camote amarillo',
            quantity: fmtKg(1.1 * cScale),
            category: 'grains' as GroceryAisle,
            clinicalNote: 'Almidón resistente para microbiota intestinal y saciedad prolongada',
          },
        ]),

    // 4. GRASAS SALUDABLES
    {
      id: 'fat-avocado',
      name: 'Aguacate Hass (en distintos puntos de maduración)',
      quantity: fmtPcs(6, 'piezas medianas'),
      category: 'fats',
      clinicalNote: 'Ácido oleico monoinsaturado y potasio cardioprotector',
    },
    {
      id: 'fat-olive',
      name: 'Aceite de Oliva Extra Virgen (prensado en frío, botella oscura)',
      quantity: `${Math.ceil(1 * (days >= 14 ? 2 : 1))} botella (500 ml)`,
      category: 'fats',
      clinicalNote: 'Oleocantal antiinflamatorio (usar preferentemente en crudo)',
    },
    {
      id: 'fat-seeds',
      name: isNutFree
        ? 'Semillas de chía, linaza molida y pepitas de calabaza (Libre de nueces/cacahuate)'
        : 'Nueces de castilla, almendras fileteadas y semillas de chía',
      quantity: fmtKg(0.45),
      category: 'fats',
      clinicalNote: isNutFree
        ? 'Seguro contra alergia a frutos secos/cacahuate • Rico en ALA Omega-3'
        : 'Ácido alfa-linolénico (ALA), fibra soluble y Vitamina E',
      allergySafe: isNutFree,
    },

    // 5. LÁCTEOS / BEBIDAS VEGETALES
    {
      id: 'dairy-yogurt',
      name: isLactoseFree
        ? 'Yogur griego deslactosado sin azúcar + Bebida de almendra sin endulzar'
        : 'Yogur griego natural sin azúcar (0% grasa) + Queso panela',
      quantity: `${fmtKg(1.0)} yogur + ${Math.ceil(1 * mult)} L bebida/queso`,
      category: 'dairy',
      clinicalNote: isLactoseFree
        ? '100% libre de lactosa • Probióticos activos para salud digestiva'
        : 'Caseína y probióticos con alto aporte de calcio',
      allergySafe: isLactoseFree,
    },

    // 6. DESPENSA FUNCIONAL
    {
      id: 'pantry-spices',
      name: 'Cúrcuma, canela Ceilán, jengibre fresco, ajo, limón y vinagre de manzana',
      quantity: 'Surtido semanal',
      category: 'pantry',
      clinicalNote: 'Sensibilizadores naturales de insulina (canela y ácido acético)',
    },
    {
      id: 'pantry-tea',
      name: 'Té verde matcha/sencha, manzanilla, jamaica natural y café de grano',
      quantity: fmtPcs(2, 'cajas / bolsas'),
      category: 'pantry',
      clinicalNote: 'Catequinas antioxidantes EGCG e hidratación libre de calorías',
    },
  ]

  return items
}

export function formatGroceryListForWhatsApp(
  patientName: string,
  days: number,
  items: GroceryItem[],
): string {
  const grouped = Object.keys(AISLE_INFO) as GroceryAisle[]
  let text = `🛒 *LISTA DE SUPERMERCADO CLÍNICA — NUTRIAI*\n`
  text += `👤 *Paciente:* ${patientName}\n`
  text += `📅 *Duración:* Abasto exacto para ${days} días\n\n`

  for (const aisle of grouped) {
    const aisleItems = items.filter(i => i.category === aisle)
    if (aisleItems.length === 0) continue
    text += `*${AISLE_INFO[aisle].title}*\n`
    for (const item of aisleItems) {
      text += `☐ *${item.quantity}* — ${item.name}\n`
    }
    text += `\n`
  }

  text += `✨ _Cantidades calculadas por tu especialista según tu fórmula dietosintética._`
  return text
}

/**
 * SISTEMA MEXICANO DE ALIMENTOS EQUIVALENTES (SMAE)
 */
export type SmaeGroupKey =
  | 'aoa_magro'
  | 'cereales'
  | 'leguminosas'
  | 'verduras'
  | 'frutas'
  | 'grasas'
  | 'lacteos'

export interface SmaeFoodEquivalent {
  name: string
  portion: string
  gramsOrMl: number
  unit: string
}

export interface SmaeGroupDefinition {
  key: SmaeGroupKey
  name: string
  shortName: string
  kcalPerEq: number
  proteinG: number
  carbsG: number
  fatG: number
  color: string
  foods: SmaeFoodEquivalent[]
}

export const SMAE_GROUPS: SmaeGroupDefinition[] = [
  {
    key: 'aoa_magro',
    name: 'Alimentos de Origen Animal (Bajo aporte de grasa)',
    shortName: 'Proteína Animal (AOA)',
    kcalPerEq: 45,
    proteinG: 7,
    carbsG: 0,
    fatG: 1.5,
    color: 'bg-rose-50 border-rose-200 text-rose-900',
    foods: [
      { name: 'Pechuga de pollo o pavo sin piel (cocida)', portion: '30 g', gramsOrMl: 30, unit: 'g' },
      { name: 'Filete de pescado blanco (robalo, tilapia, bacalao)', portion: '40 g', gramsOrMl: 40, unit: 'g' },
      { name: 'Salmón fresco o atún sellado', portion: '30 g', gramsOrMl: 30, unit: 'g' },
      { name: 'Bistec de res magro (filete / cuete)', portion: '30 g', gramsOrMl: 30, unit: 'g' },
      { name: 'Claras de huevo pasteurizadas', portion: '2 claras (66 g)', gramsOrMl: 66, unit: 'g' },
      { name: 'Huevo entero orgánico', portion: '1 pieza (50 g)', gramsOrMl: 50, unit: 'g' },
      { name: 'Queso panela o cottage bajo en grasa', portion: '40 g', gramsOrMl: 40, unit: 'g' },
      { name: 'Tofu firme orgánico (opción vegetal)', portion: '55 g', gramsOrMl: 55, unit: 'g' },
    ],
  },
  {
    key: 'cereales',
    name: 'Cereales y Tubérculos Complejos (Sin grasa)',
    shortName: 'Cereales y Tubérculos',
    kcalPerEq: 70,
    proteinG: 2,
    carbsG: 15,
    fatG: 0,
    color: 'bg-amber-50 border-amber-200 text-amber-900',
    foods: [
      { name: 'Avena en hojuelas integrales (en crudo)', portion: '1/3 taza (20 g)', gramsOrMl: 20, unit: 'g' },
      { name: 'Quinoa cocida o Arroz integral cocido', portion: '1/3 taza (45 g)', gramsOrMl: 45, unit: 'g' },
      { name: 'Tortilla de maíz nixtamalizado', portion: '1 pieza (30 g)', gramsOrMl: 30, unit: 'g' },
      { name: 'Tostadas de maíz horneadas (sin freír)', portion: '2 piezas (24 g)', gramsOrMl: 24, unit: 'g' },
      { name: 'Pan integral de masa madre o centeno', portion: '1 rebanada (30 g)', gramsOrMl: 30, unit: 'g' },
      { name: 'Camote horneado o Papa hervida', portion: '1/3 taza (70 g)', gramsOrMl: 70, unit: 'g' },
      { name: 'Elote amarillo desgranado cocido', portion: '1/2 taza (80 g)', gramsOrMl: 80, unit: 'g' },
    ],
  },
  {
    key: 'leguminosas',
    name: 'Leguminosas (Alto aporte de fibra y proteína vegetal)',
    shortName: 'Leguminosas',
    kcalPerEq: 120,
    proteinG: 8,
    carbsG: 20,
    fatG: 1,
    color: 'bg-orange-50 border-orange-200 text-orange-900',
    foods: [
      { name: 'Lentejas cocidas en caldo sin grasa', portion: '1/2 taza (90 g)', gramsOrMl: 90, unit: 'g' },
      { name: 'Frijol negro o peruano en bola cocido', portion: '1/2 taza (90 g)', gramsOrMl: 90, unit: 'g' },
      { name: 'Garbanzos cocidos o Edamames al vapor', portion: '1/2 taza (85 g)', gramsOrMl: 85, unit: 'g' },
      { name: 'Habas cocidas', portion: '1/2 taza (85 g)', gramsOrMl: 85, unit: 'g' },
    ],
  },
  {
    key: 'verduras',
    name: 'Verduras y Hortalizas Fibrosas',
    shortName: 'Verduras',
    kcalPerEq: 25,
    proteinG: 2,
    carbsG: 4,
    fatG: 0,
    color: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    foods: [
      { name: 'Espinaca, acelga, arúgula o lechuga cruda', portion: '2 tazas (120 g)', gramsOrMl: 120, unit: 'g' },
      { name: 'Brócoli o Coliflor al vapor', portion: '1 taza (100 g)', gramsOrMl: 100, unit: 'g' },
      { name: 'Calabacita, pepino, chayote o nopales', portion: '1 taza (110 g)', gramsOrMl: 110, unit: 'g' },
      { name: 'Espárragos, ejotes o champiñones fileteados', portion: '1 taza (100 g)', gramsOrMl: 100, unit: 'g' },
      { name: 'Jitomate bola/cherry o Pimiento morrón', portion: '1 taza (120 g)', gramsOrMl: 120, unit: 'g' },
    ],
  },
  {
    key: 'frutas',
    name: 'Frutas Frescas de Bajo y Medio Índice Glucémico',
    shortName: 'Frutas',
    kcalPerEq: 60,
    proteinG: 0,
    carbsG: 15,
    fatG: 0,
    color: 'bg-pink-50 border-pink-200 text-pink-900',
    foods: [
      { name: 'Fresas, zarzamoras o frambuesas enteras', portion: '1 taza (150 g)', gramsOrMl: 150, unit: 'g' },
      { name: 'Arándanos azules (blueberries)', portion: '3/4 taza (110 g)', gramsOrMl: 110, unit: 'g' },
      { name: 'Manzana verde o roja mediana', portion: '1 pieza (130 g)', gramsOrMl: 130, unit: 'g' },
      { name: 'Pera, durazno o guayaba', portion: '1 pieza mediana (130 g)', gramsOrMl: 130, unit: 'g' },
      { name: 'Papaya o Melón picado', portion: '1 taza (150 g)', gramsOrMl: 150, unit: 'g' },
      { name: 'Toronja o Naranja en gajos (con bagazo)', portion: '1 pieza (140 g)', gramsOrMl: 140, unit: 'g' },
    ],
  },
  {
    key: 'grasas',
    name: 'Aceites, Aguacate, Nueces y Semillas Cardioprotectoras',
    shortName: 'Grasas Saludables',
    kcalPerEq: 45,
    proteinG: 1,
    carbsG: 1,
    fatG: 5,
    color: 'bg-teal-50 border-teal-200 text-teal-900',
    foods: [
      { name: 'Aguacate Hass', portion: '1/3 pieza (35 g)', gramsOrMl: 35, unit: 'g' },
      { name: 'Aceite de Oliva Extra Virgen', portion: '1 cdita (5 ml)', gramsOrMl: 5, unit: 'ml' },
      { name: 'Almendras o Pistachos naturales', portion: '10 piezas (12 g)', gramsOrMl: 12, unit: 'g' },
      { name: 'Nueces de castilla o pecanas', portion: '3 mitades (10 g)', gramsOrMl: 10, unit: 'g' },
      { name: 'Semillas de chía, linaza o pepita de calabaza', portion: '1 cucharada (10 g)', gramsOrMl: 10, unit: 'g' },
      { name: 'Crema de almendra o cacahuate 100% natural', portion: '2 cditas (10 g)', gramsOrMl: 10, unit: 'g' },
    ],
  },
  {
    key: 'lacteos',
    name: 'Lácteos Descremados / Yogur Griego Clínico',
    shortName: 'Lácteos / Yogur',
    kcalPerEq: 95,
    proteinG: 9,
    carbsG: 12,
    fatG: 1,
    color: 'bg-sky-50 border-sky-200 text-sky-900',
    foods: [
      { name: 'Yogur griego natural sin azúcar (normal o deslactosado)', portion: '3/4 taza (150 g)', gramsOrMl: 150, unit: 'g' },
      { name: 'Leche descremada o deslactosada light', portion: '1 taza (240 ml)', gramsOrMl: 240, unit: 'ml' },
      { name: 'Kéfir natural sin azúcar añadida', portion: '1 taza (200 ml)', gramsOrMl: 200, unit: 'ml' },
    ],
  },
]

/**
 * Calcula la distribución diaria exacta de Equivalentes SMAE para cubrir los MacroTargets del paciente
 */
export function calculateDailySmaeDistribution(macros: MacroTargets): Record<SmaeGroupKey, number> {
  const verduras    = 5
  const frutas      = macros.carbs_g < 70 ? 1 : 2
  const lacteos     = 1
  const leguminosas = macros.carbs_g < 70 ? 0 : 1

  // Carbohidratos aportados hasta ahora:
  const carbsUsed = verduras * 4 + frutas * 15 + lacteos * 12 + leguminosas * 20
  const remainingCarbs = Math.max(0, macros.carbs_g - carbsUsed)
  const cereales = Math.max(1, Math.round(remainingCarbs / 15))

  // Proteínas aportadas hasta ahora:
  const protUsed = verduras * 2 + lacteos * 9 + leguminosas * 8 + cereales * 2
  const remainingProt = Math.max(21, macros.protein_g - protUsed)
  const aoa_magro = Math.max(4, Math.round(remainingProt / 7))

  // Grasas aportadas hasta ahora:
  const fatUsed = aoa_magro * 1.5 + leguminosas * 1 + lacteos * 1
  const remainingFat = Math.max(15, macros.fat_g - fatUsed)
  const grasas = Math.max(3, Math.round(remainingFat / 5))

  return {
    aoa_magro,
    cereales,
    leguminosas,
    verduras,
    frutas,
    grasas,
    lacteos,
  }
}

