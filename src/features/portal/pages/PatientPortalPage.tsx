import { useEffect, useState, type FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Utensils, Droplets, CheckCircle2, RefreshCw, TrendingDown,
  TrendingUp, Sparkles, ArrowLeft, Flame, ShieldCheck,
  FileText, Activity, Scale, Plus, AlertTriangle, ShoppingCart,
} from 'lucide-react'
import { getPlanById } from '@/features/plans/services/plans.service'
import { getPatientById, addWeightCheckin } from '@/features/patients/services/patients.service'
import { PROTOCOL_INFO, calculateBMI, calculateClinicalMacros } from '@/lib/clinicalEngine'
import GroceryAndSmaeView from '@/features/plans/components/GroceryAndSmaeView'
import type { PlanWithPatient } from '@/types/plan'
import type { Patient } from '@/types/patient'

type PortalTab = 'today' | 'grocery' | 'swaps' | 'progress' | 'prescription'

interface MealSlot {
  id: string
  time: string
  title: string
  kcalPct: number
  optionA: string
  optionB: string
  smaeSwap: string
}

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
  const [newWeight, setNewWeight]       = useState('')
  const [newWaist, setNewWaist]         = useState('')
  const [feeling, setFeeling]           = useState('Excelente energía y saciedad')
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
      <div className="min-h-screen bg-[#F7F8F4] flex items-center justify-center p-4">
        <div className="w-9 h-9 border-4 border-[#245C47] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!plan || !patient) {
    return (
      <div className="min-h-screen bg-[#F7F8F4] flex flex-col items-center justify-center p-6 text-center">
        <Utensils className="w-12 h-12 text-[#245C47] mb-3" />
        <h1 className="text-xl font-extrabold text-[#1D2924]">Plan no encontrado</h1>
        <p className="text-sm text-[#76847B] mt-1">Verifica el enlace compartido por tu nutriólogo.</p>
        <button
          type="button"
          onClick={() => navigate('/plans')}
          className="btn-forest mt-4 px-5 py-2.5 text-xs cursor-pointer"
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
    <div className="min-h-screen bg-[#F7F8F4] text-[#1D2924] pb-28">
      {/* Barra superior con Liquid Glass para volver al consultorio */}
      <div className="liquid-glass sticky top-0 z-30 px-4 py-2.5 text-xs flex items-center justify-between border-b border-[#E7ECE6]">
        <button
          type="button"
          onClick={() => navigate('/plans')}
          className="flex items-center gap-1.5 text-[#245C47] hover:underline font-extrabold cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Volver al Consultorio
        </button>
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F2FAE4] border border-[#C8ED8F] text-[#1D2924] text-[10px] font-extrabold">
          <Sparkles className="w-3 h-3 text-[#245C47]" /> App Móvil Paciente (PWA)
        </span>
      </div>

      {/* Contenedor Móvil / Tablet Centrado */}
      <div className="max-w-xl mx-auto p-3.5 sm:p-5 space-y-4 animate-wellness-in">
        {/* Tarjeta Hero del Paciente en Verde Bosque + Lima */}
        <div className="bg-[#245C47] text-white p-6 rounded-[26px] shadow-[0_18px_40px_-12px_rgba(36,92,71,0.32)] space-y-4 relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-[#C8ED8F]/15 blur-xl pointer-events-none" />

          <div className="relative z-10 flex items-start justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-white/10 text-[#C8ED8F] border border-white/15 mb-2">
                <ShieldCheck className="w-3 h-3" /> Plan Personalizado ({plan.clinical_efficacy_score ?? 98}% Precisión)
              </span>
              <h1 className="text-2xl font-extrabold tracking-tight">Hola, {patient.full_name.split(' ')[0]} 👋</h1>
              <p className="text-xs text-[#DCE7E1] mt-0.5 font-medium">
                {plan.protocol ? PROTOCOL_INFO[plan.protocol].name : patient.goal}
              </p>
            </div>

            <div className="bg-white/12 backdrop-blur-xs border border-white/15 rounded-2xl p-3 text-center shrink-0">
              <span className="text-2xl font-extrabold text-[#C8ED8F] block leading-none">{totalAdherence}%</span>
              <span className="text-[10px] text-[#DCE7E1] font-semibold mt-0.5 block">Logro hoy</span>
            </div>
          </div>

          {/* Barra de progreso del día en Verde Lima */}
          <div className="relative z-10 space-y-1.5">
            <div className="flex justify-between text-[11px] text-[#DCE7E1] font-semibold">
              <span>{doneMealsCount} de {mealSlots.length} comidas cumplidas</span>
              <span>{(waterGlasses * 0.25).toFixed(2)}L / {macros.water_liters}L agua</span>
            </div>
            <div className="w-full h-2.5 bg-black/25 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#C8ED8F] rounded-full transition-all duration-500"
                style={{ width: `${totalAdherence}%` }}
              />
            </div>
          </div>

          {/* Resumen Bento de Macros del Paciente */}
          <div className="relative z-10 grid grid-cols-4 gap-2 pt-1 text-center">
            <div className="bg-white/10 rounded-2xl p-2.5 border border-white/10">
              <span className="text-[10px] text-[#C8ED8F] font-semibold block">Calorías</span>
              <span className="text-xs font-extrabold">{macros.calories}</span>
            </div>
            <div className="bg-white/10 rounded-2xl p-2.5 border border-white/10">
              <span className="text-[10px] text-[#DCE7E1] font-semibold block">Proteína</span>
              <span className="text-xs font-extrabold">{macros.protein_g}g</span>
            </div>
            <div className="bg-white/10 rounded-2xl p-2.5 border border-white/10">
              <span className="text-[10px] text-[#DCE7E1] font-semibold block">Carbos</span>
              <span className="text-xs font-extrabold">{macros.carbs_g}g</span>
            </div>
            <div className="bg-white/10 rounded-2xl p-2.5 border border-white/10">
              <span className="text-[10px] text-[#DCE7E1] font-semibold block">Grasas</span>
              <span className="text-xs font-extrabold">{macros.fat_g}g</span>
            </div>
          </div>
        </div>

        {/* Contenido por Pestaña */}
        <div className="space-y-4">
          {tab === 'today' && (
            <>
              {patient.allergies && (
                <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 flex items-center gap-2.5 text-xs text-red-900 font-medium">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>
                    <strong>Menú 100% libre de:</strong> {patient.allergies} (Validado por tu nutriólogo).
                  </span>
                </div>
              )}

              {/* Contador Interactivo de Hidratación Bento */}
              <div className="bento-card p-4 sm:p-5 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-2xl bg-[#EBF3EE] text-[#245C47] flex items-center justify-center">
                      <Droplets className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-extrabold text-[#1D2924]">
                        Hidratación Diaria ({macros.water_liters} Litros)
                      </h3>
                      <p className="text-[11px] text-[#76847B]">
                        Toca un vaso cada vez que bebas 250 ml de agua
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-[#245C47] bg-[#F2FAE4] border border-[#C8ED8F] px-2.5 py-1 rounded-full">
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
                        className={`h-11 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                          filled
                            ? 'bg-[#245C47] border-[#245C47] text-[#C8ED8F] shadow-2xs'
                            : 'bg-[#F7F8F4] border-[#E7ECE6] text-[#76847B] hover:border-[#245C47]/40'
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
                  <h2 className="text-sm font-extrabold text-[#1D2924]">Tu Plan de Alimentación de Hoy</h2>
                  <span className="text-[11px] text-[#76847B] font-medium">Intercambia opciones con 1 toque</span>
                </div>

                {mealSlots.map(meal => {
                  const isDone = !!completedMeals[meal.id]
                  const activeOpt = selectedOption[meal.id] ?? 'A'
                  const mealKcal = Math.round(macros.calories * meal.kcalPct)

                  return (
                    <div
                      key={meal.id}
                      className={`bento-card p-4 sm:p-5 transition-all ${
                        isDone ? 'bg-[#F2FAE4]/60 border-[#C8ED8F]' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-extrabold text-[#245C47] bg-[#EBF3EE] px-2.5 py-0.5 rounded-lg">
                              {meal.time}
                            </span>
                            <span className="text-[11px] font-bold text-[#76847B] flex items-center gap-0.5">
                              <Flame className="w-3 h-3 text-[#245C47]" /> ~{mealKcal} kcal
                            </span>
                          </div>
                          <h3 className={`font-extrabold text-sm sm:text-base mt-1 ${isDone ? 'line-through text-[#245C47]' : 'text-[#1D2924]'}`}>
                            {meal.title}
                          </h3>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleMeal(meal.id)}
                          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all shrink-0 cursor-pointer ${
                            isDone
                              ? 'bg-[#245C47] text-[#C8ED8F] shadow-xs'
                              : 'bg-[#F7F8F4] hover:bg-[#EBF3EE] text-[#1D2924] border border-[#E7ECE6]'
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
                            className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-colors cursor-pointer ${
                              activeOpt === opt.id
                                ? 'bg-[#1D2924] text-[#C8ED8F]'
                                : 'bg-[#F7F8F4] text-[#76847B] hover:text-[#1D2924] border border-[#E7ECE6]'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      <div className="p-3.5 rounded-2xl bg-[#F7F8F4] border border-[#E7ECE6] text-xs text-[#1D2924] leading-relaxed font-medium">
                        {activeOpt === 'A' && meal.optionA}
                        {activeOpt === 'B' && meal.optionB}
                        {activeOpt === 'SMAE' && (
                          <div>
                            <span className="text-[10px] font-extrabold uppercase text-[#245C47] block mb-0.5">
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

          {(tab === 'grocery' || tab === 'swaps') && (
            <GroceryAndSmaeView
              patient={patient}
              macros={macros}
              protocol={plan.protocol}
              initialSubTab={tab === 'grocery' ? 'grocery' : 'smae'}
            />
          )}

          {tab === 'progress' && (
            <div className="space-y-4">
              {/* Resumen de Progreso */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bento-card p-4">
                  <span className="text-xs font-semibold text-[#76847B] block">Peso Actual</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-extrabold text-[#1D2924]">{patient.weight_kg} kg</span>
                    {weightDelta !== 0 && (
                      <span className={`text-xs font-extrabold flex items-center ${weightDelta < 0 ? 'text-[#245C47]' : 'text-blue-600'}`}>
                        {weightDelta < 0 ? <TrendingDown className="w-3.5 h-3.5 mr-0.5" /> : <TrendingUp className="w-3.5 h-3.5 mr-0.5" />}
                        {weightDelta > 0 ? `+${weightDelta}` : weightDelta} kg
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-[#76847B] mt-1 block">
                    Meta saludable: {bmi.idealMinKg} – {bmi.idealMaxKg} kg
                  </span>
                </div>

                <div className="bento-card p-4">
                  <span className="text-xs font-semibold text-[#76847B] block">IMC y Cintura</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-extrabold text-[#1D2924]">{bmi.value}</span>
                    <span className="text-xs font-bold text-[#245C47]">{bmi.category}</span>
                  </div>
                  <span className="text-[11px] text-[#76847B] mt-1 block">
                    Cintura actual: {patient.waist_cm ? `${patient.waist_cm} cm` : 'Por registrar'}
                  </span>
                </div>
              </div>

              {/* Formulario para reportar peso al doctor en tiempo real */}
              <form onSubmit={handleWeightReport} className="bento-card p-5 space-y-4">
                <div>
                  <h3 className="font-extrabold text-[#1D2924] text-sm flex items-center gap-2">
                    <Scale className="w-4 h-4 text-[#245C47]" />
                    Reportar mi Peso y Avance al Especialista
                  </h3>
                  <p className="text-xs text-[#76847B] mt-0.5">
                    Tus mediciones se sincronizan al instante con tu Expediente 360°.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#1D2924] mb-1">Mi Peso Hoy (kg) *</label>
                    <input
                      type="number" step="0.1" required value={newWeight}
                      onChange={e => setNewWeight(e.target.value)}
                      className="input-wellness w-full px-3 py-2 text-sm font-extrabold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#1D2924] mb-1">Cintura (cm) opcional</label>
                    <input
                      type="number" step="0.1" value={newWaist}
                      onChange={e => setNewWaist(e.target.value)}
                      placeholder="Ej. 75"
                      className="input-wellness w-full px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1D2924] mb-1">¿Cómo te has sentido con el plan?</label>
                  <select
                    value={feeling}
                    onChange={e => setFeeling(e.target.value)}
                    className="input-wellness w-full px-3 py-2.5 text-xs font-semibold"
                  >
                    <option value="Excelente energía y saciedad">⚡ Excelente energía y sin hambre</option>
                    <option value="Buena digestión y desinflamación">🌱 Buena digestión y menos inflamación</option>
                    <option value="Un poco de hambre por la tarde">🍎 Un poco de ansiedad por la tarde</option>
                    <option value="Entrenamientos con más fuerza">💪 Mejor rendimiento en el ejercicio</option>
                  </select>
                </div>

                {checkinSaved && (
                  <div className="p-3 rounded-xl bg-[#F2FAE4] border border-[#C8ED8F] text-[#1D2924] text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#245C47] shrink-0" />
                    ¡Registro enviado! El expediente de tu especialista ya se actualizó.
                  </div>
                )}

                <button
                  type="submit"
                  className="btn-forest w-full py-2.5 text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-[#C8ED8F]" /> Enviar Registro al Consultorio
                </button>
              </form>

              {/* Historial de pesajes */}
              <div className="bento-card p-5 space-y-2.5">
                <h4 className="text-xs font-extrabold text-[#76847B] uppercase tracking-wider">Historial de Controles</h4>
                <div className="divide-y divide-[#E7ECE6] text-xs">
                  {[...history].reverse().map((h, i) => (
                    <div key={i} className="py-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-extrabold text-[#1D2924]">{h.weight_kg} kg</span>
                        {h.waist_cm && <span className="text-[#76847B] ml-2">• {h.waist_cm} cm cintura</span>}
                        {h.notes && <p className="text-[11px] text-[#76847B] mt-0.5">{h.notes}</p>}
                      </div>
                      <span className="text-[11px] text-[#76847B] font-semibold">{h.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'prescription' && (
            <div className="bento-card p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-[#E7ECE6] pb-3">
                <div>
                  <h2 className="font-extrabold text-[#1D2924] text-sm">Documento Clínico Completo</h2>
                  <p className="text-[11px] text-[#76847B]">Prescripción oficial generada por tu especialista</p>
                </div>
              </div>
              <div className="text-xs text-[#1D2924] whitespace-pre-wrap leading-relaxed font-sans">
                {plan.edited_content ?? plan.ai_generated_content}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Barra de Navegación Inferior Flotante Liquid Glass para el Paciente */}
      <div className="fixed bottom-0 inset-x-0 z-40 px-3 pb-safe pointer-events-none">
        <nav
          aria-label="Navegación del portal del paciente"
          className="liquid-glass-nav pointer-events-auto max-w-xl mx-auto rounded-2xl flex items-center justify-around py-1.5 px-1.5 mb-2"
        >
          {[
            { id: 'today' as PortalTab,        icon: Utensils,     label: 'Mi Día' },
            { id: 'grocery' as PortalTab,      icon: ShoppingCart, label: 'Mi Súper' },
            { id: 'swaps' as PortalTab,        icon: RefreshCw,    label: 'SMAE' },
            { id: 'progress' as PortalTab,     icon: Activity,     label: 'Progreso' },
            { id: 'prescription' as PortalTab, icon: FileText,     label: 'Receta' },
          ].map(item => {
            const active = tab === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer ${
                  active
                    ? 'bg-[#245C47] text-white shadow-xs'
                    : 'text-[#76847B] hover:text-[#1D2924]'
                }`}
              >
                <item.icon className={`w-4 h-4 ${active ? 'text-[#C8ED8F]' : 'text-[#76847B]'}`} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
