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
    const { patient, doctorNotes } = await req.json()

    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) throw new Error('Missing OPENAI_API_KEY secret')

    const age    = calculateAge(patient.birth_date)
    const bmi    = (patient.weight_kg / Math.pow(patient.height_cm / 100, 2)).toFixed(1)
    const gender = patient.gender === 'male' ? 'Masculino' : patient.gender === 'female' ? 'Femenino' : 'Otro'

    const prompt = `
Genera un plan nutricional detallado y profesional para el siguiente paciente:

**Datos del paciente:**
- Nombre: ${patient.full_name}
- Edad: ${age} años
- Género: ${gender}
- Peso: ${patient.weight_kg} kg
- Talla: ${patient.height_cm} cm
- IMC: ${bmi}
- Objetivo principal: ${patient.goal}
${patient.allergies  ? `- Alergias: ${patient.allergies}`           : ''}
${patient.conditions ? `- Condiciones médicas: ${patient.conditions}` : ''}
${patient.notes      ? `- Notas del paciente: ${patient.notes}`       : ''}
${doctorNotes        ? `\n**Instrucciones adicionales del doctor:**\n${doctorNotes}` : ''}

El plan debe incluir:
1. Evaluación nutricional del paciente (IMC, estado actual, recomendaciones generales)
2. Distribución calórica diaria recomendada (calorías totales, % proteínas, carbohidratos y grasas)
3. Plan de alimentación semanal estructurado (desayuno, colación AM, almuerzo, colación PM, cena)
4. Lista de alimentos recomendados y alimentos a evitar
5. Recomendaciones adicionales (hidratación, suplementación si aplica, hábitos)

Responde en español con formato claro, usando secciones bien definidas y lenguaje profesional.
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
            content: 'Eres un nutriólogo clínico experto con más de 15 años de experiencia. Generas planes nutricionales detallados, personalizados y basados en evidencia científica. Usas un tono profesional. Siempre respondes en español.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 2500,
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
