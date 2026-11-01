import { Outlet, NavLink } from 'react-router-dom'
import { Utensils, LogOut } from 'lucide-react'
import Sidebar, { navItems } from './Sidebar'
import { useAuth } from '@/features/auth/context/AuthContext'
import { cn } from '@/utils/cn'

export default function AppLayout() {
  const { signOut } = useAuth()

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50/70">
      {/* Header Móvil */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl">
            <Utensils className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-gray-900 text-sm block leading-none">NutriAI</span>
            <span className="text-[9px] font-bold text-emerald-600 uppercase">Clinical Suite</span>
          </div>
        </div>
        <button
          onClick={signOut}
          className="p-2 text-gray-500 hover:text-red-600 rounded-lg"
          title="Cerrar sesión"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      <Sidebar />

      <main className="flex-1 overflow-auto pb-20 md:pb-0">
        <Outlet />
      </main>

      {/* Barra de Navegación Inferior Móvil ("En la palma de tu mano") */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-30 flex items-center justify-around py-1.5 px-2 shadow-lg">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-colors',
                isActive ? 'text-emerald-600 bg-emerald-50' : 'text-gray-500'
              )
            }
          >
            <Icon className="w-4 h-4" />
            <span>{label.split(' ')[0]}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
