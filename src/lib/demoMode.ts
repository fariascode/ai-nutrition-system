/** Comprobar el modo no debe inicializar pacientes, planes ni plantillas de demostración. */
export const isDemo =
  import.meta.env.VITE_DEMO_MODE === 'true' ||
  !import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.VITE_SUPABASE_URL.includes('your-project')
