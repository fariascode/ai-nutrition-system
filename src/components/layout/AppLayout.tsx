import { Outlet, NavLink } from 'react-router-dom'
import { Utensils, LogOut, Sparkles } from 'lucide-react'
import Sidebar, { navItems } from './Sidebar'
import { useAuth } from '@/features/auth/context/AuthContext'
import { ThemeToggle } from '@/context/ThemeContext'
import { cn } from '@/utils/cn'

export default function AppLayout() {
  const { signOut } = useAuth()

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#F7F8F4] text-[#1D2924]">
      {/* Barra Superior Móvil con Liquid Glass Sutil */}
      <header className="md:hidden liquid-glass flex items-center justify-between px-4 py-3 sticky top-0 z-30 border-b border-[#E7ECE6]">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-9 h-9 bg-[#245C47] rounded-xl shadow-xs">
            <Utensils className="w-4 h-4 text-white" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#C8ED8F] border border-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-[#1D2924] text-sm leading-none">NutriAI</span>
              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-[#C8ED8F] text-[#1D2924] uppercase">
                AI Suite
              </span>
            </div>
            <span className="text-[10px] font-medium text-[#76847B] block mt-0.5">
              Wellness &amp; Clinical Intelligence
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <ThemeToggle compact />
          <button
            type="button"
            onClick={signOut}
            className="p-2 text-[#76847B] hover:text-red-700 hover:bg-red-50/70 rounded-xl transition-colors"
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <Sidebar />

      <main className="flex-1 overflow-x-hidden pb-24 md:pb-8">
        {/* Barra superior de contexto en Desktop con Liquid Glass sutil */}
        <div className="hidden md:flex liquid-glass sticky top-0 z-20 px-8 py-3 border-b border-[#E7ECE6] items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[#76847B] font-medium">
            <span className="w-2 h-2 rounded-full bg-[#245C47]" />
            <span>Sistema Clínico de Nutrición e Inteligencia Artificial</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F2FAE4] border border-[#C8ED8F] text-[#1D2924] text-[11px] font-bold">
              <Sparkles className="w-3 h-3 text-[#245C47]" />
              IA Dietoterapéutica Activa
            </span>
            <ThemeToggle />
          </div>
        </div>

        <div className="animate-wellness-in">
          <Outlet />
        </div>
      </main>

      {/* Barra de Navegación Inferior Flotante Móvil con Liquid Glass ("En la palma de tu mano") */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-30 px-3 pb-safe pointer-events-none">
        <nav
          aria-label="Navegación móvil"
          className="liquid-glass-nav pointer-events-auto rounded-2xl flex items-center justify-around py-1.5 px-1.5 mb-2"
        >
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all',
                  isActive
                    ? 'bg-[#245C47] text-white shadow-xs'
                    : 'text-[#76847B] hover:text-[#1D2924]'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn('w-4 h-4', isActive ? 'text-[#C8ED8F]' : 'text-[#76847B]')} />
                  <span>{label.split(' ')[0]}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
