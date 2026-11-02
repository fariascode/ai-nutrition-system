import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { X } from 'lucide-react'
import Sidebar from './Sidebar'
import Navbar from './Navbar'

export default function AppLayout() {
  const [desktopOpen, setDesktopOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 767px)').matches)
  const drawer = useRef<HTMLDialogElement>(null)
  const { pathname } = useLocation()

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)')
    const change = () => { setIsMobile(media.matches); drawer.current?.close() }
    media.addEventListener('change', change)
    return () => media.removeEventListener('change', change)
  }, [])

  useEffect(() => { drawer.current?.close() }, [pathname])

  useEffect(() => {
    if (!mobileOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [mobileOpen])

  function toggleNavigation() {
    if (!isMobile) { setDesktopOpen(value => !value); return }
    if (drawer.current?.open) drawer.current.close()
    else { drawer.current?.showModal(); setMobileOpen(true) }
  }

  return (
    <div className="min-h-screen pt-16 bg-[var(--bg-main)] text-[var(--text-primary)]">
      <a href="#main-content" className="skip-link">Saltar al contenido</a>
      <Navbar onToggleNavigation={toggleNavigation} navigationOpen={isMobile ? mobileOpen : desktopOpen} navigationId={isMobile ? 'mobile-navigation' : 'desktop-navigation'} />
      <div className="flex items-start">
        {desktopOpen && <Sidebar />}
        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 pb-8 scroll-mt-20">
          <div className="animate-wellness-in"><Outlet /></div>
        </main>
      </div>
      <dialog ref={drawer} id="mobile-navigation" aria-label="Navegación principal" className="navigation-drawer"
        onClose={() => setMobileOpen(false)}
        onClick={event => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX > rect.right || event.clientX < rect.left) event.currentTarget.close() } }}>
        <div className="flex justify-end p-2 border-b border-[var(--border-wellness)]">
          <button type="button" onClick={() => drawer.current?.close()} aria-label="Cerrar menú de navegación" className="btn-secondary p-3"><X className="h-5 w-5" /></button>
        </div>
        <Sidebar mobile onNavigate={() => drawer.current?.close()} />
      </dialog>
    </div>
  )
}
