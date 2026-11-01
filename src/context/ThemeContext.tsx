import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Moon, Sun } from 'lucide-react'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  isDark: boolean
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const STORAGE_KEY = 'nutriai_theme_v1'

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'dark' || saved === 'light') return saved
    return 'light'
  })

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
      root.setAttribute('data-theme', 'dark')
    } else {
      root.classList.remove('dark')
      root.setAttribute('data-theme', 'light')
    }
    localStorage.setItem(STORAGE_KEY, theme)

    const metaTheme = document.querySelector('meta[name="theme-color"]')
    if (metaTheme) {
      metaTheme.setAttribute('content', theme === 'dark' ? '#0F1613' : '#F7F8F4')
    }
  }, [theme])

  function toggleTheme() {
    setThemeState(prev => (prev === 'dark' ? 'light' : 'dark'))
  }

  function setTheme(next: Theme) {
    setThemeState(next)
  }

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === 'dark', toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme debe usarse dentro de ThemeProvider')
  return ctx
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { isDark, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? 'Cambiar a modo claro Wellness' : 'Cambiar a modo oscuro Carbón & Bosque'}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className={`inline-flex items-center gap-2 rounded-xl border transition-all cursor-pointer select-none ${
        compact ? 'p-2' : 'px-3 py-1.5 text-xs font-bold'
      } ${
        isDark
          ? 'bg-[#1C2923] border-[#2C3F37] text-[#C8ED8F] hover:bg-[#24352D]'
          : 'bg-white border-[#E7ECE6] text-[#1D2924] hover:bg-[#F7F8F4]'
      }`}
    >
      {isDark ? (
        <>
          <Sun className="w-4 h-4 text-[#C8ED8F]" />
          {!compact && <span>Modo Claro</span>}
        </>
      ) : (
        <>
          <Moon className="w-4 h-4 text-[#245C47]" />
          {!compact && <span>Modo Oscuro</span>}
        </>
      )}
    </button>
  )
}

