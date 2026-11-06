import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown, LogOut, Download } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/context/AuthContext'

export default function ProfileMenu() {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const container = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const logout = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  const name = typeof user?.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : 'Mi cuenta'
  const initials = name === 'Mi cuenta' ? (user?.email?.slice(0, 2) ?? 'DR') : name.split(/\s+/).filter(Boolean).slice(0, 2).map((part: string) => part[0]).join('')

  useEffect(() => {
    if (!open) return
    logout.current?.focus()
    function outside(event: PointerEvent | FocusEvent) {
      if (!container.current?.contains(event.target as Node)) setOpen(false)
    }
    function keyboard(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        trigger.current?.focus()
      }
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('focusin', outside)
    document.addEventListener('keydown', keyboard)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('focusin', outside)
      document.removeEventListener('keydown', keyboard)
    }
  }, [open])

  async function logoutUser() {
    if (busy) return
    setBusy(true)
    setError('')
    try { await signOut() }
    catch { setError('No se pudo cerrar la sesión. Intenta de nuevo.') }
    finally { setBusy(false) }
  }

  return <div ref={container} className="relative">
    <button ref={trigger} type="button" aria-label="Abrir perfil" aria-expanded={open} aria-controls={panelId}
      onClick={() => setOpen(value => !value)} className="btn-secondary flex items-center gap-2 p-1.5 pr-2 min-h-11">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-forest-soft)] text-[var(--text-accent)] text-xs font-extrabold uppercase">{initials}</span>
      <span className="hidden lg:block max-w-36 truncate text-xs">{name}</span>
      <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />
    </button>
    {open && <section id={panelId} aria-label="Perfil y sesión" className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-[var(--border-wellness)] bg-[var(--bg-surface)] p-3 shadow-xl">
      <div className="p-2 border-b border-[var(--border-wellness)] mb-2">
        <p className="text-sm font-bold break-words">{name}</p>
        <p className="text-xs text-[var(--text-secondary)] break-all mt-1">{user?.email}</p>
      </div>
      {error && <p role="alert" className="text-xs text-[var(--status-danger-text)] p-2">{error}</p>}
      <Link to="/backups" onClick={() => setOpen(false)} className="flex items-center gap-2 w-full rounded-xl p-3 text-sm font-semibold hover:bg-subtle min-h-11">
        <Download className="h-4 w-4" />Respaldos locales
      </Link>
      <button ref={logout} type="button" disabled={busy} onClick={logoutUser}
        className="account-logout flex items-center gap-2 w-full rounded-xl p-3 text-sm font-semibold disabled:opacity-60">
        <LogOut className="h-4 w-4" />{busy ? 'Cerrando sesión...' : 'Cerrar sesión'}
      </button>
    </section>}
  </div>
}
