import { Outlet, NavLink } from 'react-router-dom'
import Sidebar, { navItems } from './Sidebar'
import Navbar from './Navbar'
import { cn } from '@/utils/cn'

export default function AppLayout() {
  return (
    <div className="min-h-screen pt-16 bg-[var(--bg-main)] text-[var(--text-primary)]">
      <Navbar />
      <div className="flex items-start">
        <Sidebar />
        <main id="main-content" className="min-w-0 flex-1 pb-24 md:pb-8">
          <div className="animate-wellness-in"><Outlet /></div>
        </main>
      </div>
      <nav aria-label="Navegacion movil" className="md:hidden fixed bottom-2 inset-x-3 z-30 liquid-glass-nav rounded-2xl flex justify-around p-2">
        {navItems.map(({ to, icon: Icon, label }) => <NavLink key={to} to={to} className={({ isActive }) => cn('flex flex-col items-center gap-1 p-2 text-[10px] rounded-xl', isActive && 'bg-[#245C47] text-white')}>
          <Icon className="h-4 w-4" /><span>{label.split(' ')[0]}</span>
        </NavLink>)}
      </nav>
    </div>
  )
}
