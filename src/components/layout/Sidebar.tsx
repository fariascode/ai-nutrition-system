import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, FileText, Calendar, History,
  Utensils, Sparkles, ShieldCheck,
} from 'lucide-react'
import { cn } from '@/utils/cn'

export const navItems = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Centro de Mando' },
  { to: '/patients',     icon: Users,           label: 'Pacientes 360°' },
  { to: '/plans',        icon: FileText,        label: 'Planes con IA' },
  { to: '/appointments', icon: Calendar,        label: 'Agenda y SOAP' },
  { to: '/history',      icon: History,         label: 'Historial Clínico' },
]

export default function Sidebar({ mobile = false, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {

  return (
    <aside id={mobile ? undefined : 'desktop-navigation'} className={cn('bg-[var(--bg-surface)] text-[var(--text-primary)] flex-col shrink-0 select-none', mobile ? 'flex w-full min-h-full' : 'hidden md:flex w-68 sticky top-16 h-[calc(100dvh-4rem)] overflow-y-auto border-r border-[var(--border-wellness)]')}>
      {/* Cabecera de Marca */}
      <div className="flex items-center justify-between px-6 py-6 border-b border-[#E7ECE6]/80">
        <div className="flex items-center gap-3.5">
          <div className="relative flex items-center justify-center w-10 h-10 bg-[#245C47] rounded-2xl shadow-[0_6px_16px_rgba(36,92,71,0.22)]">
            <Utensils className="w-4 h-4 text-white" />
            <span
              className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#C8ED8F] border-2 border-white"
              title="Motor IA Activo"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-[#1D2924] text-base tracking-tight leading-none">
                NutriAI
              </span>
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-[#C8ED8F] text-[#1D2924] uppercase tracking-wider">
                PRO
              </span>
            </div>
            <span className="text-[11px] font-semibold text-[#76847B] block mt-1">
              Wellness &amp; Clinical AI
            </span>
          </div>
        </div>
      </div>

      {/* Navegación Principal */}
      <div className="px-4 pt-5 pb-2">
        <span className="px-3 text-[10px] font-bold uppercase tracking-widest text-[#76847B]">
          Plataforma Clínica
        </span>
      </div>

      <nav className="flex-1 px-3.5 space-y-1.5" aria-label="Navegación principal">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'group flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-200',
                isActive
                  ? 'bg-[#245C47] text-white shadow-[0_6px_18px_rgba(36,92,71,0.20)]'
                  : 'text-[#76847B] hover:bg-[#F7F8F4] hover:text-[#1D2924]'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      'w-4 h-4 shrink-0 transition-colors',
                      isActive ? 'text-[#C8ED8F]' : 'text-[#76847B] group-hover:text-[#245C47]'
                    )}
                  />
                  <span>{label}</span>
                </div>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C8ED8F]" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Tarjeta de Identidad IA en el Sidebar */}
      <div className="mx-4 mb-4 p-4 rounded-[20px] bg-[#1D2924] text-white space-y-2 relative overflow-hidden border border-[#245C47]">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#C8ED8F]/20 border border-[#C8ED8F]/35 text-[#C8ED8F] text-[10px] font-extrabold">
            <Sparkles className="w-3 h-3" />
            Motor IA v2.5
          </div>
          <ShieldCheck className="w-4 h-4 text-[#C8ED8F]" />
        </div>
        <p className="text-xs font-bold text-white leading-snug">
          Precisión Clínica &gt;95%
        </p>
        <p className="text-[11px] text-[#B8C4BC] leading-relaxed">
          Mifflin-St Jeor, SMAE, HOMA-IR y validación de alergias en tiempo real.
        </p>
      </div>

    </aside>
  )
}
