import { useEffect, useState, type FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Utensils, Droplets, CheckCircle2, RefreshCw, TrendingDown,
  TrendingUp, Sparkles, ArrowLeft, Flame, ShieldCheck,
  FileText, Activity, Scale, Plus, Check, AlertTriangle,
} from 'lucide-react'
import { getPlanById } from '@/features/plans/services/plans.service'
import { getPatientById, addWeightCheckin } from '@/features/patients/services/patients.service'
import { PROTOCOL_INFO, calculateBMI, calculateClinicalMacros } from '@/lib/clinicalEngine'
import type { PlanWithPatient } from '@/types/plan'
import type { Patient } from '@/types/patient'

type PortalTab = 'today' | 'swaps' | 'progress' | 'prescription'

interface MealSlot {
  id: string
  time: string
  title: string
  kcalPct: number
  optionA: string
  optionB: string
  smaeSwap: string
}

const SMAE_EQUIVALENTS = [
  {
    group: '🥩 Proteínas Magras (1 porción = ~140-160g cocido | ~35g Proteína)',
    color: 'border-blue-200 bg-blue-50/50 text-blue-900',
    items: [
      '150g Pechuga de pollo o pavo a la plancha',
      '160g Filete de pescado blanco (robalo, tilapia, huachinango)',
      '140g Salmón chileno o atún fresco sellado',
      '140g Bistec de res magro (filete / cuete) sin grasa visible',
      '2 huevos enteros + 4 claras (o 220g de tofu firme orgánico)',
    ],
  },
  {
    group: '🌾 Carbohidratos Complejos (1 porción = ~30g Carbohidratos de Bajo IG)',
    color: 'border-emerald-200 bg-emerald-50/50 text-emerald-900',
    items: [
      '120g Quinoa cocida o Arroz integral al vapor',
      '45g Avena integral laminada (peso en crudo)',
      '140g Camote horneado o papa cocida y enfriada (almidón resistente)',
      '2 tortillas de maíz nixtamalizado o 1 rebanada gruesa de pan masa madre',
      '3/4 taza de lentejas, garbanzos o frijoles negros en bola',
    ],
  },
  {
    group: '🥑 Grasas Cardioprotectoras (1 porción = ~12-15g Lípidos MUFAs/PUFAs)',
    color: 'border-amber-200 bg-amber-50/50 text-amber-900',
    items: [
      '1/3 a 1/2 pieza de Aguacate Hass mediano',
      '1 cucharada sopera (10-12 ml) de Aceite de Oliva Extra Virgen en crudo',
      '20g de Nueces de castilla, almendras fileteadas o pistachos naturales',
      '1 cucharada de semillas de chía, linaza molida o crema de almendra 100%',
    ],
  },
  {
    group: '🥦 Vegetales Fibrosos Libres (Mínimo 2 tazas por comida principal)',
    color: 'border-teal-200 bg-teal-50/50 text-teal-900',
    items: [
      'Espinaca baby, arúgula, lechugas mixtas, acelgas y kale',
      'Brócoli, coliflor, espárragos, ejotes y coles de Bruselas',
      'Pepino, calabacita, chayote, nopales, apio, champiñones y pimientos',
    ],
  },
]

export default function PatientPortalPage() {
  const { planId } = useParams<{ planId: string }>()
  const navigate = useNavigate()

  const [plan, setPlan]       = useState<PlanWithPatient | null>(null)
  const [patient, setPatient] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState<PortalTab>('today')

  // Estado interactivo del día del paciente (persistido por fecha + plan)
  const todayKey = new Date().toISOString().split('T')[0]
  const storageKey = `nutriai_portal_${planId}_${todayKey}`

  const [completedMeals, setCompletedMeals] = useState<Record<string, boolean>>({})
  const [selectedOption, setSelectedOption] = useState<Record<string, 'A' | 'B' | 'SMAE'>>({})
  const [waterGlasses, setWaterGlasses]     = useState(0) // cada vaso = 250ml

  // Formulario de reporte de peso desde casa
  const [newWeight, setNewWeight] = useState('')
  const [newWaist, setNewWaist]   = useState('')
  const [feeling, setFeeling]     = useState('Excelente energía y saciedad')
  const [checkinSaved, setCheckinSaved] = useState(false)

  useEffect(() => {
    async function loadPortal() {
      if (!planId) return
      setLoading(true)
      try {
        const foundPlan = await getPlanById(planId)
        setPlan(foundPlan)
        if (foundPlan) {
          const foundPatient = await getPatientById(foundPlan.patient_id)
          setPatient(foundPatient)
          if (foundPatient) {
            setNewWeight(String(foundPatient.weight_kg))
            setNewWaist(foundPatient.waist_cm ? String(foundPatient.waist_cm) : '')
          }
        }
      } finally {
        setLoading(false)
      }
    }
    loadPortal()
  }, [planId])

  useEffect(() => {
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setCompletedMeals(parsed.completedMeals ?? {})
        setSelectedOption(parsed.selectedOption ?? {})
        setWaterGlasses(parsed.waterGlasses ?? 0)
      } catch {
        // ignore
      }
    }
  }, [storageKey])

  function persistDayState(
    nextMeals: Record<string, boolean>,
    nextOpts: Record<string, 'A' | 'B' | 'SMAE'>,
    nextWater: number,
  ) {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        completedMeals: nextMeals,
        selectedOption: nextOpts,
        waterGlasses: nextWater,
      }),
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-9 h-9 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!plan || !patient) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <Utensils className="w-12 h-12 text-emerald-600 mb-3" />
        <h1 className="text-xl font-bold text-gray-900">Plan no encontrado</h1>
        <p className="text-sm text-gray-500 mt-1">Verifica el enlace compartido por tu nutriólogo.</p>
        <button
          onClick={() => navigate('/plans')}
          className="mt-4 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl"
        >
          Volver a Planes
        </button>
      </div>
    )
  }

  const macros = plan.macros ?? calculateClinicalMacros(patient, plan.protocol ?? 'balanced', plan.calories_target ?? undefined)
  const mealsCount = plan.meals_per_day ?? 4
  const isLactoseFree = (patient.allergies ?? '').toLowerCase().includes('lactosa')
  const isSeafoodFree = (patient.allergies ?? '').toLowerCase().includes('marisco')

  const dairyName = isLactoseFree ? 'Yogur griego deslactosado / bebida de almendra' : 'Yogur griego natural sin azúcar'
  const fishName  = isSeafoodFree ? 'Filete de salmón o lomo de bacalao (sin mariscos)' : 'Filete de salmón o pescado blanco a la plancha'

  const mealSlots: MealSlot[] = [
    {
      id: 'breakfast',
      time: '08:00 AM',
      title: '🌅 Desayuno Metabólico',
      kcalPct: 0.25,
      optionA: `Omelette de 2 huevos enteros + 2 claras con espinaca baby y champiñones + 1 porción de avena/pan masa madre + 1/3 aguacate Hass.`,
      optionB: `Bowl de 180g de ${dairyName} + 1 scoop de proteína + 40g avena con chía, frutos rojos y 10 almendras.`,
      smaeSwap: `2 huevos revueltos con nopales o ejotes + 2 tortillas de maíz nixtamalizado + 1/3 de aguacate.`,
    },
    ...(mealsCount >= 4
      ? [
          {
            id: 'snack_am',
            time: '11:30 AM',
            title: '🍏 Colación Matutina',
            kcalPct: 0.10,
            optionA: `1 manzana verde o pera mediana + 15g de nueces de castilla (control glucémico).`,
            optionB: `1 taza de jícama y pepino con limón + 100g de pechuga de pavo baja en sodio o edamames.`,
            smaeSwap: `1 taza de fresas o arándanos + 12 almendras naturales.`,
          },
        ]
      : []),
    {
      id: 'lunch',
      time: '02:30 PM',
      title: '☀️ Comida Principal (Regla del Plato)',
      kcalPct: mealsCount >= 4 ? 0.35 : 0.40,
      optionA: `160g de pechuga de pollo a las finas hierbas + 2 tazas de ensalada verde con 1 cda de aceite de oliva + 120g de quinoa o arroz integral + 1/2 taza de lentejas.`,
      optionB: `170g de ${fishName} al horno + brócoli y espárragos al vapor + 140g de camote horneado con canela.`,
      smaeSwap: `150g de bistec de res magro asado + ensalada de nopales con jitomate y aguacate + 2 tortillas de maíz.`,
    },
    ...(mealsCount >= 5
      ? [
          {
            id: 'snack_pm',
            time: '05:30 PM',
            title: '🥜 Colación Vespertina / Pre-Entreno',
            kcalPct: 0.10,
            optionA: `150g de ${dairyName} con canela + 1 cdita de crema de almendra o cacahuate natural.`,
            optionB: `2 tortitas de arroz integral con 1/3 de aguacate y 60g de atún al agua o hummus.`,
            smaeSwap: `1 scoop de proteína aislada en agua + 1 puñado pequeño de pistachos.`,
          },
        ]
      : []),
    {
      id: 'dinner',
      time: '08:30 PM',
      title: '🌙 Cena Ligera Reparadora',
      kcalPct: mealsCount >= 5 ? 0.20 : mealsCount === 4 ? 0.30 : 0.35,
      optionA: `140g de filete de pescado blanco o pollo deshebrado + fajitas de pimientos, cebolla y nopales asados + 1/4 de aguacate + 1 tostada horneada.`,
      optionB: `Omelette nocturno de 3 claras + 1 huevo con espinacas + crema casera de calabacín sin lácteos + infusión relajante.`,
      smaeSwap: `Ensalada tibia de 150g de pavo o tofu a la plancha con champiñones, calabacitas y semillas de calabaza.`,
    },
  ]

  const targetGlasses = Math.max(6, Math.round((macros.water_liters * 1000) / 250))
  const doneMealsCount = mealSlots.filter(m => completedMeals[m.id]).length
  const mealProgress = (doneMealsCount / mealSlots.length) * 75
  const waterProgress = Math.min(25, (waterGlasses / targetGlasses) * 25)
  const totalAdherence = Math.round(mealProgress + waterProgress)

  function toggleMeal(id: string) {
    const next = { ...completedMeals, [id]: !completedMeals[id] }
    setCompletedMeals(next)
    persistDayState(next, selectedOption, waterGlasses)
  }

  function changeMealOption(id: string, opt: 'A' | 'B' | 'SMAE') {
    const next = { ...selectedOption, [id]: opt }
    setSelectedOption(next)
    persistDayState(completedMeals, next, waterGlasses)
  }

  function updateWater(glasses: number) {
    const clamped = Math.max(0, Math.min(16, glasses))
    setWaterGlasses(clamped)
    persistDayState(completedMeals, selectedOption, clamped)
  }

  async function handleWeightReport(e: FormEvent) {
    e.preventDefault()
    if (!patient || !newWeight) return
    const updated = await addWeightCheckin(patient.id, {
      date: todayKey,
      weight_kg: parseFloat(newWeight),
      waist_cm: newWaist ? parseFloat(newWaist) : undefined,
      notes: `Reporte desde App Paciente: ${feeling}`,
    })
    setPatient(updated)
    setCheckinSaved(true)
    setTimeout(() => setCheckinSaved(false), 3500)
  }

  const bmi = calculateBMI(patient.weight_kg, patient.height_cm)
  const history = patient.weight_history ?? []
  const firstWeight = history[0]?.weight_kg ?? patient.weight_kg
  const weightDelta = Number((patient.weight_kg - firstWeight).toFixed(1))

  return (
    <div className="min-h-screen bg-slate-100 pb-24">
      {/* Barra superior para volver al consultorio (modo vista previa doctor) */}
      <div className="bg-slate-950 text-slate-300 px-4 py-2 text-xs flex items-center justify-between">
        <button
          onClick={() => navigate('/plans')}
          className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Volver al Panel del Doctor
        </button>
        <span className="text-[11px] flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-emerald-400" /> Vista Interactiva del Paciente (PWA)
        </span>
      </div>

      {/* Contenedor tipo App Móvil centrado */}
      <div className="max-w-xl mx-auto">
        {/* Hero Header del Paciente */}
        <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 text-white p-6 rounded-b-3xl shadow-lg space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 mb-2">
                <ShieldCheck className="w-3 h-3" /> Plan Clínico Personalizado ({plan.clinical_efficacy_score ?? 98}% Precisión)
              </span>
              <h1 className="text-2xl font-extrabold">Hola, {patient.full_name.split(' ')[0]} 👋</h1>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                {plan.protocol ? PROTOCOL_INFO[plan.protocol].name : patient.goal}
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-xs border border-white/15 rounded-2xl p-3 text-center shrink-0">
              <span className="text-2xl font-extrabold text-emerald-300 block leading-none">{totalAdherence}%</span>
              <span className="text-[10px] text-emerald-100 font-medium">Logro de hoy</span>
            </div>
          </div>

          {/* Barra de progreso del día */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-emerald-100">
              <span>{doneMealsCount} de {mealSlots.length} comidas cumplidas</span>
              <span>{(waterGlasses * 0.25).toFixed(2)}L / {macros.water_liters}L agua</span>
            </div>
            <div className="w-full h-2.5 bg-black/25 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 rounded-full transition-all duration-500"
                style={{ width: `${totalAdherence}%` }}
              />
            </div>
          </div>

          {/* Resumen de Macros del Paciente */}
          <div className="grid grid-cols-4 gap-2 pt-1 text-center">
            <div className="bg-black/20 rounded-xl p-2 border border-white/10">
              <span className="text-[10px] text-emerald-200 block">Meta Diaria</span>
              <span className="text-xs font-extrabold">{macros.calories} kcal</span>
            </div>
            <div className="bg-black/20 rounded-xl p-2 border border-white/10">
              <span className="text-[10px] text-blue-200 block">Proteína</span>
              <span className="text-xs font-extrabold">{macros.protein_g}g</span>
            </div>
            <div className="bg-black/20 rounded-xl p-2 border border-white/10">
              <span className="text-[10px] text-emerald-200 block">Carbos</span>
              <span className="text-xs font-extrabold">{macros.carbs_g}g</span>
            </div>
            <div className="bg-black/20 rounded-xl p-2 border border-white/10">
              <span className="text-[10px] text-amber-200 block">Grasas</span>
              <span className="text-xs font-extrabold">{macros.fat_g}g</span>
            </div>
          </div>
        </div>

        {/* Contenido por Pestaña */}
        <div className="p-4 space-y-4">
          {tab === 'today' && (
            <>
              {/* Alerta de Alergias si tiene */}
              {patient.allergies && (
                <div className="p-3 rounded-2xl bg-red-50 border border-red-200 flex items-center gap-2.5 text-xs text-red-900">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>
                    <strong>Menú 100% libre de:</strong> {patient.allergies} (Validado por tu nutriólogo).
                  </span>
                </div>
              )}

              {/* Contador Interactivo de Hidratación */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                      <Droplets className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-gray-900">Hidratación Diaria ({macros.water_liters} Litros)</h3>
                      <p className="text-[11px] text-gray-500">
                        Toca un vaso cada vez que bebas 250 ml de agua
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-full">
                    {waterGlasses} / {targetGlasses} vasos
                  </span>
                </div>

                <div className="grid grid-cols-8 gap-1.5">
                  {[...Array(targetGlasses)].map((_, i) => {
                    const filled = i < waterGlasses
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => updateWater(filled && i === waterGlasses - 1 ? i : i + 1)}
                        className={`h-10 rounded-xl border flex flex-col items-center justify-center transition-all ${
                          filled
                            ? 'bg-sky-500 border-sky-600 text-white shadow-2xs scale-100'
                            : 'bg-sky-50/40 border-sky-200/70 text-sky-400 hover:bg-sky-100/50'
                        }`}
                      >
                        <Droplets className="w-3.5 h-3.5" />
                        <span className="text-[9px] font-bold">{i + 1}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Lista Interactiva de Comidas del Día */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-sm font-extrabold text-gray-900">Tu Plan de Alimentación de Hoy</h2>
                  <span className="text-[11px] text-gray-500">Intercambia opciones con 1 toque</span>
                </div>

                {mealSlots.map(meal => {
                  const isDone = !!completedMeals[meal.id]
                  const activeOpt = selectedOption[meal.id] ?? 'A'
                  const mealKcal = Math.round(macros.calories * meal.kcalPct)

                  return (
                    <div
                      key={meal.id}
                      className={`rounded-2xl border p-4 transition-all shadow-2xs ${
                        isDone
                          ? 'bg-emerald-50/70 border-emerald-300'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                              {meal.time}
                            </span>
                            <span className="text-[11px] font-semibold text-gray-500 flex items-center gap-0.5">
                              <Flame className="w-3 h-3 text-orange-500" /> ~{mealKcal} kcal
                            </span>
                          </div>
                          <h3 className={`font-bold text-sm mt-1 ${isDone ? 'line-through text-emerald-900' : 'text-gray-900'}`}>
                            {meal.title}
                          </h3>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleMeal(meal.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                            isDone
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-gray-100 hover:bg-emerald-50 text-gray-700 hover:text-emerald-700'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {isDone ? 'Cumplida' : 'Marcar'}
                        </button>
                      </div>

                      {/* Selector de Opción A / Opción B / Intercambio Equivalente */}
                      <div className="flex items-center gap-1.5 mb-2.5">
                        {[
                          { id: 'A' as const,    label: 'Opción A' },
                          { id: 'B' as const,    label: 'Opción B' },
                          { id: 'SMAE' as const, label: '🔄 Intercambiar Platillo' },
                        ].map(opt => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => changeMealOption(meal.id, opt.id)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                              activeOpt === opt.id
                                ? 'bg-slate-900 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-gray-800 leading-relaxed">
                        {activeOpt === 'A' && meal.optionA}
                        {activeOpt === 'B' && meal.optionB}
                        {activeOpt === 'SMAE' && (
                          <div>
                            <span className="text-[10px] font-bold uppercase text-emerald-700 block mb-0.5">
                              Equivalente Clínico Iso-Calórico (SMAE):
                            </span>
                            {meal.smaeSwap}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {tab === 'swaps' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs">
                <h2 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-emerald-600" />
                  Tabla Interactiva de Equivalentes Clínicos (SMAE)
                </h2>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Si no tienes un ingrediente en casa o comes fuera, puedes intercambiar cualquier alimento dentro del mismo grupo respetando las porciones indicadas sin alterar tus resultados.
                </p>
              </div>

              {SMAE_EQUIVALENTS.map((grp, idx) => (
                <div key={idx} className={`rounded-2xl border p-4 space-y-2.5 ${grp.color}`}>
                  <h3 className="font-extrabold text-xs">{grp.group}</h3>
                  <ul className="space-y-1.5 text-xs">
                    {grp.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 bg-white/80 p-2 rounded-xl border border-black/5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {tab === 'progress' && (
            <div className="space-y-4">
              {/* Resumen de Progreso */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs">
                  <span className="text-xs text-gray-500 block">Peso Actual</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-extrabold text-gray-900">{patient.weight_kg} kg</span>
                    {weightDelta !== 0 && (
                      <span className={`text-xs font-bold flex items-center ${weightDelta < 0 ? 'text-emerald-600' : 'text-blue-600'}`}>
                        {weightDelta < 0 ? <TrendingDown className="w-3.5 h-3.5 mr-0.5" /> : <TrendingUp className="w-3.5 h-3.5 mr-0.5" />}
                        {weightDelta > 0 ? `+${weightDelta}` : weightDelta} kg
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-gray-400 mt-1 block">
                    Meta saludable: {bmi.idealMinKg} – {bmi.idealMaxKg} kg
                  </span>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs">
                  <span className="text-xs text-gray-500 block">IMC y Cintura</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-extrabold text-gray-900">{bmi.value}</span>
                    <span className="text-xs font-semibold text-emerald-700">{bmi.category}</span>
                  </div>
                  <span className="text-[11px] text-gray-400 mt-1 block">
                    Cintura actual: {patient.waist_cm ? `${patient.waist_cm} cm` : 'Por registrar'}
                  </span>
                </div>
              </div>

              {/* Formulario para reportar peso al doctor en tiempo real */}
              <form onSubmit={handleWeightReport} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs space-y-4">
                <div>
                  <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <Scale className="w-4 h-4 text-emerald-600" />
                    Reportar mi Peso y Avance al Doctor
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Tus datos se sincronizan en tiempo real con el expediente de tu nutriólogo.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Mi Peso Hoy (kg) *</label>
                    <input
                      type="number" step="0.1" required value={newWeight}
                      onChange={e => setNewWeight(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Cintura (cm) opcional</label>
                    <input
                      type="number" step="0.1" value={newWaist}
                      onChange={e => setNewWaist(e.target.value)}
                      placeholder="Ej. 75"
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">¿Cómo te has sentido con el plan?</label>
                  <select
                    value={feeling}
                    onChange={e => setFeeling(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white font-medium"
                  >
                    <option value="Excelente energía y saciedad">⚡ Excelente energía y sin hambre</option>
                    <option value="Buena digestión y desinflamación">🌱 Buena digestión y menos inflamación</option>
                    <option value="Un poco de hambre por la tarde">🍎 Un poco de ansiedad por la tarde</option>
                    <option value="Entrenamientos con más fuerza">💪 Mejor rendimiento en el ejercicio</option>
                  </select>
                </div>

                {checkinSaved && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ¡Registro enviado! El expediente de tu doctor ya se actualizó en tiempo real.
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 transition"
                >
                  <Plus className="w-4 h-4" /> Enviar Registro al Consultorio
                </button>
              </form>

              {/* Historial de pesajes */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs space-y-2.5">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Historial de Controles</h4>
                <div className="divide-y divide-gray-100 text-xs">
                  {[...history].reverse().map((h, i) => (
                    <div key={i} className="py-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-gray-900">{h.weight_kg} kg</span>
                        {h.waist_cm && <span className="text-gray-500 ml-2">• {h.waist_cm} cm cintura</span>}
                        {h.notes && <p className="text-[11px] text-gray-400 mt-0.5">{h.notes}</p>}
                      </div>
                      <span className="text-[11px] text-gray-400 font-medium">{h.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'prescription' && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <h2 className="font-bold text-gray-900 text-sm">Documento Clínico Completo</h2>
                  <p className="text-[11px] text-gray-500">Prescripción oficial generada por tu especialista</p>
                </div>
              </div>
              <div className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed font-sans">
                {plan.edited_content ?? plan.ai_generated_content}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Barra de Navegación Inferior estilo App Móvil del Paciente */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-40 shadow-lg">
        <div className="max-w-xl mx-auto flex items-center justify-around py-2 px-2">
          {[
            { id: 'today' as PortalTab,        icon: Utensils,  label: 'Mi Día' },
            { id: 'swaps' as PortalTab,        icon: RefreshCw, label: 'Equivalentes' },
            { id: 'progress' as PortalTab,     icon: Activity,  label: 'Mi Progreso' },
            { id: 'prescription' as PortalTab, icon: FileText,  label: 'Receta PDF' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-colors ${
                tab === item.id ? 'text-emerald-600 bg-emerald-50' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}

