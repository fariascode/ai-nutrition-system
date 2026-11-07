import { useEffect, useState, type ReactNode } from 'react'
import { recoverBeforeMount } from '../services/recoveryBootstrap'
import { storageError } from '@/lib/localStorage'

export default function LocalDataRecovery({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    recoverBeforeMount().then(() => { if (active) setReady(true) })
      .catch(err => { if (active) setError(storageError(err)) })
    return () => { active = false }
  }, [])

  async function retry() {
    setBusy(true)
    try { await recoverBeforeMount(); setReady(true) }
    catch (err) { setError(storageError(err)) }
    finally { setBusy(false) }
  }

  if (ready) return children
  return <main className="min-h-screen bg-canvas text-content p-6 flex items-center justify-center">
    <section className="bento-card max-w-xl p-6 space-y-4">
      <h1 className="text-xl font-bold">Recuperación de datos locales</h1>
      {error ? <>
        <p role="alert" className="text-sm text-danger">{error}</p>
        <p className="text-sm text-muted">Los módulos permanecen cerrados para evitar usar datos incompletos.</p>
        <button type="button" disabled={busy} onClick={retry} className="btn-forest min-h-11 px-4 py-2">Reintentar recuperación</button>
        <button type="button" disabled={busy} onClick={async () => {
          setBusy(true)
          try {
            const [{ pendingRecoveryBackup }, { downloadLocalBackup }] = await Promise.all([import('../services/backupRestore'), import('../services/localBackup')])
            downloadLocalBackup(pendingRecoveryBackup(), 'nutriai-recuperacion')
          }
          catch (err) { setError(storageError(err)) }
          finally { setBusy(false) }
        }} className="btn-secondary block min-h-11 px-4 py-2">Descargar los datos anteriores</button>
        <button type="button" disabled={busy} onClick={() => window.location.reload()} className="btn-secondary block min-h-11 px-4 py-2">Recargar aplicación</button>
      </> : <p role="status" className="text-sm text-muted">Comprobando si hay un guardado interrumpido…</p>}
    </section>
  </main>
}
