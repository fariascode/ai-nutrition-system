import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, FileText, Calendar, History, LogOut, Utensils, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/features/auth/context/AuthContext'
import { cn } from '@/utils/cn'

export const navItems = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Centro de Mando' },
  { to: '/patients',     icon: Users,           label: 'Pacientes 360°' },
  { to: '/plans',        icon: FileText,        label: 'Planes con IA' },
  { to: '/appointments', icon: Calendar,        label: 'Agenda y SOAP' },
  { to: '/history',      icon: History,         label: 'Historial Clínico' },
]

export default function Sidebar() {
  const { user, signOut } = useAuth()

  return (
    <aside className="hidden md:flex w-64 min-h-screen bg-white border-r border-gray-200 flex-col shrink-0">
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-xs">
            <Utensils className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-gray-900 block leading-none">NutriAI</span>
            <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">Clinical Suite</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all',
                isActive
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Tarjeta de estado clínico en el sidebar */}
      <div className="mx-3 mb-3 p-3.5 rounded-2xl bg-slate-900 text-white text-xs space-y-1.5">
        <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
          <ShieldCheck className="w-4 h-4" />
          Motor Clínico v2.5
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          Fórmulas Mifflin-St Jeor + validación de alergias y biomarcadores activa.
        </p>
      </div>

      <div className="px-3 py-4 border-t border-gray-100 space-y-2">
        <div className="px-3 py-1">
          <p className="text-xs font-bold text-gray-900 truncate">{user?.email || 'Dr. Especialista'}</p>
          <p className="text-[11px] text-gray-400">Nutrición Clínica y Metabolismo</p>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-3 w-full px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
