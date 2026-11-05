import { Menu, Utensils } from 'lucide-react'
import ProfileMenu from './ProfileMenu'
import { ThemeToggle } from '@/context/ThemeContext'

export default function Navbar({ onToggleNavigation, navigationOpen, navigationId }: { onToggleNavigation: () => void; navigationOpen: boolean; navigationId: string }) {
  return (
    <header className="app-navbar fixed inset-x-0 top-0 z-40 h-16 liquid-glass flex items-center justify-between gap-3 px-4 sm:px-6 border-b border-[var(--border-wellness)]">
      <div className="flex items-center gap-3 min-w-0">
        <button type="button" onClick={onToggleNavigation} aria-expanded={navigationOpen} aria-controls={navigationId}
          aria-label={navigationOpen ? 'Ocultar menú de navegación' : 'Abrir menú de navegación'} className="btn-secondary p-2.5 min-h-11 min-w-11">
          <Menu className="h-5 w-5" />
        </button>
        <span className="hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#245C47] text-white"><Utensils className="h-4 w-4" /></span>
        <div className="min-w-0">
          <p className="font-extrabold text-sm">NutriAI</p>
          <p className="hidden sm:block text-xs text-[var(--text-secondary)]">Consultorio médico integral</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <ThemeToggle compact />
        <ProfileMenu />
      </div>
    </header>
  )
}
