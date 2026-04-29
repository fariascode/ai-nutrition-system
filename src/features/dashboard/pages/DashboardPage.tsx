import { Users, FileText, History, TrendingUp } from 'lucide-react'
import { useAuth } from '@/features/auth/context/AuthContext'

const stats = [
  { label: 'Pacientes',      value: '—', icon: Users,      color: 'bg-blue-50 text-blue-600' },
  { label: 'Planes activos', value: '—', icon: FileText,   color: 'bg-emerald-50 text-emerald-600' },
  { label: 'Este mes',       value: '—', icon: TrendingUp, color: 'bg-violet-50 text-violet-600' },
  { label: 'Historial',      value: '—', icon: History,    color: 'bg-amber-50 text-amber-600' },
]

export default function DashboardPage() {
  const { user } = useAuth()

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1 text-sm">{user?.email}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg mb-3 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-1">Bienvenido a NutriAI</h2>
        <p className="text-sm text-gray-500">
          Comienza registrando tus primeros pacientes para generar planes nutricionales con IA.
        </p>
      </div>
    </div>
  )
}
