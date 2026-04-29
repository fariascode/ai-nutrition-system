import { useEffect, useState } from 'react'
import { Users, FileText, CheckCircle, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/context/AuthContext'

interface Stats {
  patients:  number
  published: number
  drafts:    number
  thisMonth: number
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats]     = useState<Stats>({ patients: 0, published: 0, drafts: 0, thisMonth: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadStats() {
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const [
        { count: patients },
        { count: published },
        { count: drafts },
        { count: thisMonth },
      ] = await Promise.all([
        supabase.from('patients').select('*', { count: 'exact', head: true }),
        supabase.from('nutrition_plans').select('*', { count: 'exact', head: true }).eq('status', 'published'),
        supabase.from('nutrition_plans').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
        supabase.from('nutrition_plans').select('*', { count: 'exact', head: true }).gte('created_at', startOfMonth.toISOString()),
      ])

      setStats({
        patients:  patients  ?? 0,
        published: published ?? 0,
        drafts:    drafts    ?? 0,
        thisMonth: thisMonth ?? 0,
      })
      setLoading(false)
    }
    loadStats()
  }, [])

  const cards = [
    { label: 'Pacientes',       value: stats.patients,  icon: Users,         color: 'bg-blue-50 text-blue-600' },
    { label: 'Planes publicados', value: stats.published, icon: CheckCircle,   color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Borradores',      value: stats.drafts,    icon: Clock,         color: 'bg-amber-50 text-amber-600' },
    { label: 'Planes este mes', value: stats.thisMonth, icon: FileText,      color: 'bg-violet-50 text-violet-600' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1 text-sm">{user?.email}</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="w-10 h-10 bg-gray-100 rounded-lg mb-3" />
              <div className="h-7 bg-gray-100 rounded w-12 mb-1" />
              <div className="h-4 bg-gray-100 rounded w-24" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg mb-3 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-1">NutriAI</h2>
        <p className="text-sm text-gray-500">
          Sistema de planes nutricionales con inteligencia artificial.
          Registra pacientes, genera planes personalizados y gestiona su historial.
        </p>
      </div>
    </div>
  )
}
