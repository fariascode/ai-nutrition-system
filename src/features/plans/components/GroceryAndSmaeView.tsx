import { useState, useEffect } from 'react'
import {
  ShoppingCart, Scale, Check, Copy, Printer, ShieldCheck,
  RefreshCw, Sparkles, CheckSquare, Square,
} from 'lucide-react'
import {
  AISLE_INFO,
  SMAE_GROUPS,
  generateSmartGroceryList,
  formatGroceryListForWhatsApp,
  calculateDailySmaeDistribution,
  type GroceryAisle,
  type SmaeGroupKey,
} from '@/lib/groceryAndSmaeEngine'
import type { Patient } from '@/types/patient'
import type { MacroTargets, ClinicalProtocol } from '@/types/plan'

interface Props {
  patient: Patient
  macros: MacroTargets
  protocol?: ClinicalProtocol
  initialSubTab?: 'grocery' | 'smae'
}

export default function GroceryAndSmaeView({
  patient,
  macros,
  protocol = 'balanced',
  initialSubTab = 'grocery',
}: Props) {
  const [subTab, setSubTab]             = useState<'grocery' | 'smae'>(initialSubTab)
  const [days, setDays]                 = useState<7 | 14 | 30>(7)
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})
  const [copiedList, setCopiedList]     = useState(false)

  // Conversor interactivo SMAE
  const [selectedGroup, setSelectedGroup] = useState<SmaeGroupKey>('aoa_magro')
  const [eqMultiplier, setEqMultiplier]   = useState<number>(4)

  const storageKey = `nutriai_grocery_${patient.id}_${days}`

  useEffect(() => {
    setSubTab(initialSubTab)
  }, [initialSubTab])

  useEffect(() => {
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        setCheckedItems(JSON.parse(saved))
      } catch {
        setCheckedItems({})
      }
    } else {
      setCheckedItems({})
    }
  }, [storageKey])

  const groceryItems = generateSmartGroceryList(patient, macros, days, protocol)
  const aisles = Object.keys(AISLE_INFO) as GroceryAisle[]
  const checkedCount = groceryItems.filter(i => checkedItems[i.id]).length
  const progressPct = Math.round((checkedCount / Math.max(1, groceryItems.length)) * 100)

  const dailySmae = calculateDailySmaeDistribution(macros)
  const activeSmaeGroup = SMAE_GROUPS.find(g => g.key === selectedGroup) ?? SMAE_GROUPS[0]

  function toggleGroceryItem(id: string) {
    const next = { ...checkedItems, [id]: !checkedItems[id] }
    setCheckedItems(next)
    localStorage.setItem(storageKey, JSON.stringify(next))
  }

  async function handleCopyGrocery() {
    const text = formatGroceryListForWhatsApp(patient.full_name, days, groceryItems)
    await navigator.clipboard.writeText(text)
    setCopiedList(true)
    setTimeout(() => setCopiedList(false), 2500)
  }

  function handlePrintGrocery() {
    const win = window.open('', '_blank')
    if (!win) return
    const htmlAisles = aisles
      .map(aisle => {
        const list = groceryItems.filter(i => i.category === aisle)
        if (list.length === 0) return ''
        return `
          <div style="margin-bottom: 18px;">
            <h3 style="margin: 0 0 8px; color: #065f46; border-bottom: 1px solid #d1fae5; padding-bottom: 4px;">
              ${AISLE_INFO[aisle].title}
            </h3>
            <ul style="margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.7;">
              ${list.map(item => `<li><strong>${item.quantity}</strong> — ${item.name} <span style="color:#64748b; font-size:11px;">(${item.clinicalNote})</span></li>`).join('')}
            </ul>
          </div>
        `
      })
      .join('')

    win.document.write(`
      <html>
        <head>
          <title>Lista de Supermercado — ${patient.full_name}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 36px; color: #1e293b; max-width: 800px; margin: 0 auto; }
          </style>
        </head>
        <body>
          <h1 style="margin:0; color:#065f46;">🛒 Lista de Supermercado Clínica (${days} días)</h1>
          <p style="margin:4px 0 20px; color:#475569; font-size:13px;">
            Paciente: <strong>${patient.full_name}</strong> • Meta Diaria: <strong>${macros.calories} kcal</strong> (${macros.protein_g}g P / ${macros.carbs_g}g C / ${macros.fat_g}g G)
          </p>
          ${htmlAisles}
        </body>
      </html>
    `)
    win.document.close()
    win.print()
  }

  return (
    <div className="space-y-4">
      {/* Selector superior de herramienta */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100 p-1.5 rounded-2xl">
        <div className="flex items-center gap-1 flex-1 sm:flex-initial">
          <button
            type="button"
            onClick={() => setSubTab('grocery')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
              subTab === 'grocery'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            Lista del Súper por Pasillos
          </button>

          <button
            type="button"
            onClick={() => setSubTab('smae')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
              subTab === 'smae'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Scale className="w-4 h-4" />
            Calculadora Equivalentes SMAE
          </button>
        </div>

        {patient.allergies && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-100/80 text-emerald-900 text-[11px] font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Filtrado sin: {patient.allergies}
          </span>
        )}
      </div>

      {subTab === 'grocery' ? (
        <div className="space-y-4">
          {/* Barra de control de días y acciones */}
          <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-600">Calcular abasto para:</span>
              <div className="inline-flex bg-gray-100 p-1 rounded-xl text-xs font-bold">
                {([7, 14, 30] as const).map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDays(d)}
                    className={`px-3 py-1 rounded-lg transition-colors ${
                      days === d ? 'bg-emerald-600 text-white shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {d === 7 ? '7 Días (Semanal)' : d === 14 ? '14 Días (Quincenal)' : '30 Días (Mensual)'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyGrocery}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition"
              >
                {copiedList ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedList ? '¡Copiada!' : 'Copiar Lista WhatsApp'}
              </button>

              <button
                type="button"
                onClick={handlePrintGrocery}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 text-xs font-semibold transition"
              >
                <Printer className="w-3.5 h-3.5" /> Imprimir Súper
              </button>
            </div>
          </div>

          {/* Barra de progreso del carrito */}
          <div className="bg-slate-900 text-white p-3.5 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex-1 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-emerald-300">
                  🛒 Progreso de Compra ({checkedCount} de {groceryItems.length} productos en el carrito)
                </span>
                <span className="font-extrabold">{progressPct}%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Lista por Pasillos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {aisles.map(aisle => {
              const items = groceryItems.filter(i => i.category === aisle)
              if (items.length === 0) return null
              const info = AISLE_INFO[aisle]

              return (
                <div key={aisle} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <h4 className="font-extrabold text-gray-900 text-xs">{info.title}</h4>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${info.badgeColor}`}>
                      {items.length} ítems
                    </span>
                  </div>

                  <div className="space-y-2">
                    {items.map(item => {
                      const done = !!checkedItems[item.id]
                      return (
                        <div
                          key={item.id}
                          onClick={() => toggleGroceryItem(item.id)}
                          className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
                            done
                              ? 'bg-emerald-50/60 border-emerald-200 text-gray-400'
                              : 'bg-gray-50/60 hover:bg-white border-gray-200/80 text-gray-800'
                          }`}
                        >
                          {done ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center justify-between gap-1">
                              <span className={`font-bold ${done ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                                {item.name}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-emerald-100/90 text-emerald-900 font-extrabold text-[11px] shrink-0">
                                {item.quantity}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                              {item.clinicalNote}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Tabla de Distribución Diaria de Equivalentes SMAE */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  Distribución Diaria de Equivalentes Clínicos SMAE
                </h3>
                <p className="text-xs text-gray-500">
                  Cuantificación exacta para cubrir <strong>{macros.calories} kcal/día</strong> ({macros.protein_g}g Proteína • {macros.carbs_g}g Carbohidratos • {macros.fat_g}g Grasas)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
              {SMAE_GROUPS.map(group => {
                const eqCount = dailySmae[group.key]
                const isSelected = selectedGroup === group.key
                return (
                  <button
                    key={group.key}
                    type="button"
                    onClick={() => {
                      setSelectedGroup(group.key)
                      setEqMultiplier(Math.max(1, Math.min(6, Math.round(eqCount / 2))))
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'ring-2 ring-emerald-600 bg-emerald-50/70 border-emerald-400 shadow-xs'
                        : 'bg-gray-50/70 hover:bg-white border-gray-200'
                    }`}
                  >
                    <span className="text-[10px] font-bold text-gray-500 block truncate">
                      {group.shortName}
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-xl font-extrabold text-gray-900">{eqCount}</span>
                      <span className="text-[10px] font-bold text-emerald-700">Eq/día</span>
                    </div>
                    <span className="text-[10px] text-gray-400 block mt-0.5">
                      ~{eqCount * group.kcalPerEq} kcal
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Conversor Interactivo de Platillos y Gramajes SMAE */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
              <div>
                <h4 className="font-extrabold text-gray-900 text-sm flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-emerald-600" />
                  Conversor Interactivo de Porciones: {activeSmaeGroup.name}
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  Selecciona cuántos equivalentes vas a consumir en tu comida para ver el peso exacto de cada opción intercambiable:
                </p>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-900 text-white p-1.5 rounded-xl shrink-0">
                <span className="text-[11px] font-semibold px-2 text-slate-300">Porción en comida:</span>
                {[1, 2, 3, 4, 5, 6].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setEqMultiplier(num)}
                    className={`w-7 h-7 rounded-lg text-xs font-extrabold transition ${
                      eqMultiplier === num
                        ? 'bg-emerald-500 text-slate-950'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {num}
                  </button>
                ))}
                <span className="text-[11px] font-bold px-1.5 text-emerald-300">Eq.</span>
              </div>
            </div>

            {/* Resumen nutricional de los N equivalentes seleccionados */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950">
              <span className="font-bold">
                Aporte nutricional de <strong>{eqMultiplier} Equivalente(s)</strong> de {activeSmaeGroup.shortName}:
              </span>
              <div className="flex items-center gap-3 font-extrabold">
                <span>🔥 {eqMultiplier * activeSmaeGroup.kcalPerEq} kcal</span>
                <span>• Proteína: {eqMultiplier * activeSmaeGroup.proteinG}g</span>
                <span>• Carbos: {eqMultiplier * activeSmaeGroup.carbsG}g</span>
                <span>• Grasas: {eqMultiplier * activeSmaeGroup.fatG}g</span>
              </div>
            </div>

            {/* Tarjetas de alimentos equivalentes multiplicados en tiempo real */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {activeSmaeGroup.foods.map((food, idx) => {
                const totalGrams = food.gramsOrMl * eqMultiplier
                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border flex flex-col justify-between gap-2 ${activeSmaeGroup.color}`}
                  >
                    <span className="font-bold text-xs leading-snug">{food.name}</span>
                    <div className="flex items-center justify-between pt-2 border-t border-black/10">
                      <span className="text-[10px] opacity-75">1 Eq = {food.portion}</span>
                      <span className="px-2 py-0.5 rounded-lg bg-white text-gray-900 font-extrabold text-xs shadow-2xs">
                        {totalGrams} {food.unit}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

