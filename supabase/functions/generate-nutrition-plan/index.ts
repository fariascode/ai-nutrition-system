import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { patient, doctorNotes, protocol, mealsPerDay = 4, macros } = await req.json()

    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) throw new Error('Missing OPENAI_API_KEY secret')

    const age    = calculateAge(patient.birth_date)
    const bmi    = (patient.weight_kg / Math.pow(patient.height_cm / 100, 2)).toFixed(1)
    const bmr    = calculateBMR(patient.weight_kg, patient.height_cm, age, patient.gender)
    const gender = patient.gender === 'male' ? 'Masculino' : patient.gender === 'female' ? 'Femenino' : 'Otro'

    const prompt = `
Diseña un Plan Clínico Nutricional de Alta Precisión (>95% eficacia clínica) basado en evidencia médica y el Sistema Mexicano de Alimentos Equivalentes (SMAE):

**1. Ficha Clínica del Paciente:**
- Nombre: ${patient.full_name} (${age} años, ${gender})
- Antropometría: Peso ${patient.weight_kg} kg | Talla ${patient.height_cm} cm | IMC ${bmi} kg/m²
- Tasa Metabólica Basal (Mifflin-St Jeor): ${bmr} kcal/día
${patient.body_fat_pct ? `- Composición Corporal: ${patient.body_fat_pct}% grasa | ${patient.muscle_mass_kg ?? '--'} kg músculo | Cintura ${patient.waist_cm ?? '--'} cm` : ''}
- Objetivo clínico: ${patient.goal}
- Protocolo seleccionado: ${protocol ?? 'Personalizado'}
${patient.allergies   ? `- ⚠️ ALERGIAS / EXCLUSIÓN ESTRICTA: ${patient.allergies}` : ''}
${patient.conditions  ? `- Patologías / Condiciones médicas: ${patient.conditions}` : ''}
${patient.medications ? `- Fármacos actuales (cuidar interacción fármaco-nutriente): ${patient.medications}` : ''}
${patient.notes       ? `- Contexto y estilo de vida: ${patient.notes}` : ''}

${macros ? `**2. Fórmula Dietosintética Prescrita (Cumplimiento estricto):**
- Calorías Totales: ${macros.calories} kcal/día
- Proteínas: ${macros.protein_g} g (${macros.protein_pct}%)
- Carbohidratos: ${macros.carbs_g} g (${macros.carbs_pct}%)
- Lípidos: ${macros.fat_g} g (${macros.fat_pct}%)
- Fibra Dietética: ${macros.fiber_g} g/día | Hidratación: ${macros.water_liters} L/día` : ''}

${doctorNotes ? `**3. Indicaciones Especiales del Médico Tratante:**\n${doctorNotes}` : ''}

**Estructura obligatoria de respuesta (en Markdown limpio):**
1. Diagnóstico Antropométrico, Metabólico e Interpretación Clínica
2. Tabla de Fórmula Dietosintética Exacta (kcal, gramos, % y g/kg)
3. Menú Clínico Estructurado en ${mealsPerDay} tiempos de comida (con gramajes exactos en cocido/crudo y 2 opciones intercambiables Opción A y Opción B por tiempo)
4. Semáforo Clínico de Alimentos (Priorizar / Moderar / Evitar estrictamente)
5. Prescripción de Suplementación Basada en Evidencia, Hidratación y Crononutrición
    `.trim()

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Eres un nutriólogo clínico especialista en metabolismo, endocrinología nutricional y nutrición deportiva con 20 años de experiencia hospitalaria.Tus planes tienen una precisión dietosintética superior al 95%, respetan estrictamente alergias e interacciones fármaco-nutriente, y están redactados en español médico claro y estructurado.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.4,
        max_tokens: 3000,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error?.message ?? 'Error en OpenAI API')
    }

    const plan = result.choices[0].message.content

    return new Response(JSON.stringify({ plan }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

function calculateAge(birthDate: string): number {
  const today = new Date()
  const birth  = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

function calculateBMR(weightKg: number, heightCm: number, age: number, gender: string): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return Math.round(gender === 'male' ? base + 5 : base - 161)
}
