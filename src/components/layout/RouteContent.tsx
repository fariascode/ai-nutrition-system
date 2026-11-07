import { Component, Suspense, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

class RouteErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() { return { failed: true } }

  render() {
    if (this.state.failed) return <section role="alert" className="m-4 sm:m-8 rounded-2xl border border-danger-line bg-danger-soft p-5 space-y-3">
      <h1 className="text-lg font-bold text-danger">No se pudo abrir esta pantalla</h1>
      <p className="text-sm text-content">Comprueba tu conexión y vuelve a cargar. Si hay una versión nueva del proyecto, la recarga también permitirá obtenerla.</p>
      <button type="button" onClick={() => window.location.reload()} className="btn-secondary min-h-11 px-4 py-2">Recargar pantalla</button>
    </section>
    return this.props.children
  }
}

/** El límite queda dentro de cada ruta: el navbar y la navegación permanecen disponibles. */
export default function RouteContent({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  return <RouteErrorBoundary key={pathname}>
    <Suspense fallback={<section role="status" aria-live="polite" className="min-h-64 p-6 sm:p-8 text-content">
      <p className="text-sm font-semibold">Cargando pantalla…</p>
      <div aria-hidden="true" className="mt-4 h-24 max-w-2xl rounded-2xl bg-subtle border border-line" />
    </section>}>
      {children}
    </Suspense>
  </RouteErrorBoundary>
}
