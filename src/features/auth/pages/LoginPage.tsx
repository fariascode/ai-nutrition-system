import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Utensils, Sparkles, ShieldCheck, Activity, ArrowRight, Lock, Mail } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { ThemeToggle } from '@/context/ThemeContext'
import { isDemo } from '@/lib/mockData'

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await signIn(email, password)

    if (error) {
      setError('Credenciales incorrectas. Verifica tu correo y contraseña.')
      setLoading(false)
    } else {
      navigate('/dashboard')
    }
  }

  async function handleDemoLogin() {
    setLoading(true)
    await signIn('doctor@nutriai.demo', 'demo1234')
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-canvas text-content flex items-center justify-center p-4 sm:p-6 lg:p-10">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch animate-wellness-in">
        {/* Panel Izquierdo: Bento Showcase de Identidad Wellness & IA */}
        <div className="hidden lg:flex lg:col-span-6 rounded-[28px] bg-[#245C47] text-white p-8 xl:p-10 flex-col justify-between relative overflow-hidden shadow-[0_24px_60px_-15px_rgba(36,92,71,0.35)]">
          {/* Acento orgánico sutil */}
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-lime-solid/15 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-surface/5 blur-xl pointer-events-none" />

          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-surface/10 border border-white/15 backdrop-blur-xs">
              <span className="w-2 h-2 rounded-full bg-lime-solid" />
              <span className="text-xs font-bold tracking-wide text-[#C8ED8F]">
                AI NUTRITION SYSTEM • CLINICAL SUITE
              </span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight leading-[1.15]">
                Nutrición clínica de precisión impulsada por IA.
              </h1>
              <p className="text-sm text-[#DCE7E1] leading-relaxed max-w-md">
                Diseña planes dietoterapéuticos con eficacia superior al 95%, interpreta biomarcadores de laboratorio y monitorea a tus pacientes en tiempo real.
              </p>
            </div>
          </div>

          {/* Mini Bento Grid de capacidades reales */}
          <div className="relative z-10 grid grid-cols-2 gap-3 pt-8">
            <div className="p-4 rounded-2xl bg-surface/10 border border-white/15 backdrop-blur-xs space-y-1.5">
              <div className="w-8 h-8 rounded-xl bg-lime-solid text-content flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <p className="text-lg font-extrabold text-white">&gt;95% Eficacia</p>
              <p className="text-[11px] text-[#DCE7E1]">
                Motor Mifflin-St Jeor + validación de alergias y SMAE.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-surface/10 border border-white/15 backdrop-blur-xs space-y-1.5">
              <div className="w-8 h-8 rounded-xl bg-surface/15 text-[#C8ED8F] flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
              <p className="text-lg font-extrabold text-white">Expediente 360°</p>
              <p className="text-[11px] text-[#DCE7E1]">
                Curvas antropométricas, HOMA-IR, notas SOAP y PWA móvil.
              </p>
            </div>
          </div>
        </div>

        {/* Panel Derecho: Formulario de Acceso */}
        <div className="lg:col-span-6 bento-card p-6 sm:p-10 flex flex-col justify-center">
          <div className="mb-7">
            <div className="flex items-center justify-between mb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-[#245C47] rounded-2xl shadow-[0_8px_20px_rgba(36,92,71,0.22)]">
                <Utensils className="w-6 h-6 text-[#C8ED8F]" />
              </div>
              <div className="flex items-center gap-2">
                {isDemo && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-lime-tint border border-[#C8ED8F] text-content text-xs rounded-full font-extrabold">
                    <Sparkles className="w-3.5 h-3.5 text-accent" />
                    Modo Demo Interactivo
                  </span>
                )}
                <ThemeToggle compact />
              </div>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-content tracking-tight">
              Bienvenido a NutriAI
            </h2>
            <p className="text-muted mt-1 text-sm font-medium">
              Ingresa a tu consultorio digital de nutrición y bienestar
            </p>
          </div>

          {isDemo && (
            <div className="mb-6 p-4 bg-canvas border border-line rounded-2xl space-y-3">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <p className="text-xs text-content font-medium leading-relaxed">
                  <strong>Acceso rápido sin configuración:</strong> Explora todos los módulos clínicos, pacientes demo y el motor de IA con un clic.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDemoLogin}
                disabled={loading}
                className="btn-lime w-full py-2.5 px-4 text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-accent" />
                Entrar directamente como Especialista Demo
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-xs font-bold text-content uppercase tracking-wider mb-1.5">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="doctor@clinica.com"
                  className="input-wellness w-full pl-10 pr-4 py-3 text-sm font-medium"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-bold text-content uppercase tracking-wider mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-password"
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-wellness w-full pl-10 pr-4 py-3 text-sm font-medium"
                />
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="bg-danger-soft border border-danger-line text-danger text-xs font-semibold rounded-xl px-4 py-3"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-forest w-full py-3 px-4 text-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer mt-2"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión en Consultorio'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
