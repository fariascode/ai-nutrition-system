import { useState } from 'react'
import { Download } from 'lucide-react'
import { isDemo } from '@/lib/mockData'
import { storageError } from '@/lib/localStorage'
import { backupCounts, createLocalBackup, downloadLocalBackup } from '../services/localBackup'
import type { LocalBackup } from '../services/localBackup'

export default function BackupsPage() {
  const [backup, setBackup] = useState<LocalBackup | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function exportBackup() {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const snapshot = await createLocalBackup()
      const name = downloadLocalBackup(snapshot)
      setBackup(snapshot)
      setMessage(`Descarga solicitada: ${name}. Comprueba que el archivo se guardó en tu dispositivo.`)
    } catch (err) { setError(storageError(err)) }
    finally { setBusy(false) }
  }

  return <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-6">
    <header>
      <h1 className="text-2xl font-extrabold text-content">Respaldos locales</h1>
      <p className="text-sm text-muted mt-2">Conserva los datos de este navegador o transfiérelos a otro dispositivo en modo demo.</p>
    </header>
    <p className="p-4 rounded-2xl bg-warning-soft border border-warning-line text-warning text-sm">El archivo incluye información clínica de todos los pacientes locales y datos profesionales. Se descarga sin cifrar: guárdalo en un lugar privado. No incluye la sesión, contraseñas ni credenciales de servicios.</p>
    {!isDemo && <p role="status" className="text-sm text-muted">Disponible únicamente en modo demo local. Los datos de Supabase requieren un respaldo independiente.</p>}
    {error && <p role="alert" className="text-danger text-sm">{error}</p>}
    {message && <p role="status" className="text-accent text-sm break-words">{message}</p>}
    <section aria-labelledby="export-title" className="bento-card p-5 space-y-3">
      <h2 id="export-title" className="font-bold text-content">1. Exportar respaldo</h2>
      <p className="text-sm text-muted">Incluye pacientes y mediciones, planes, agenda y notas SOAP, consultas con sus versiones, expedientes, perfiles profesionales e indicaciones aprobadas. El tema y las casillas de compras son preferencias y quedan fuera.</p>
      <button type="button" disabled={busy || !isDemo} onClick={exportBackup} className="btn-forest min-h-11 px-4 py-2 flex items-center gap-2 disabled:opacity-50">
        <Download className="w-4 h-4" />{busy ? 'Preparando respaldo…' : 'Descargar respaldo JSON'}
      </button>
      {backup && <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        {backupCounts(backup).map(([label, count]) => <div key={label} className="flex justify-between gap-3 bg-subtle rounded-lg p-2"><dt>{label}</dt><dd className="font-bold">{count}</dd></div>)}
      </dl>}
    </section>
  </div>
}
