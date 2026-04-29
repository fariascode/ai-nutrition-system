import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Users } from 'lucide-react'
import { useAuth } from '@/features/auth/context/AuthContext'
import { getPatients, createPatient, updatePatient, deletePatient } from '../services/patients.service'
import PatientModal from '../components/PatientModal'
import type { Patient, PatientInsert, PatientUpdate } from '@/types/patient'

const genderLabel = { male: 'Masculino', female: 'Femenino', other: 'Otro' }

function getAge(birthDate: string): number {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  if (
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  ) age--
  return age
}

export default function PatientsPage() {
  const { user } = useAuth()
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading]   = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]   = useState<Patient | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try { setPatients(await getPatients()) }
    finally { setLoading(false) }
  }

  async function handleSave(data: PatientInsert | PatientUpdate) {
    if (editing) {
      const updated = await updatePatient(editing.id, data as PatientUpdate)
      setPatients(ps => ps.map(p => p.id === updated.id ? updated : p))
    } else {
      const created = await createPatient(data as PatientInsert)
      setPatients(ps => [created, ...ps])
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este paciente? Esta acción no se puede deshacer.')) return
    setDeleting(id)
    try {
      await deletePatient(id)
      setPatients(ps => ps.filter(p => p.id !== id))
    } finally {
      setDeleting(null)
    }
  }

  function openCreate() { setEditing(null); setModalOpen(true) }
  function openEdit(p: Patient) { setEditing(p); setModalOpen(true) }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pacientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">{patients.length} registrados</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          Nuevo paciente
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : patients.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-gray-200 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
            <Users className="w-6 h-6 text-gray-400" />
          </div>
          <p className="font-medium text-gray-900">Sin pacientes aún</p>
          <p className="text-sm text-gray-500 mt-1">Crea tu primer paciente para comenzar</p>
          <button onClick={openCreate}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Nuevo paciente
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Paciente</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Edad</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Género</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Peso / Talla</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Objetivo</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {patients.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.full_name}</td>
                  <td className="px-4 py-3 text-gray-600">{getAge(p.birth_date)} años</td>
                  <td className="px-4 py-3 text-gray-600">{genderLabel[p.gender]}</td>
                  <td className="px-4 py-3 text-gray-600">{p.weight_kg} kg / {p.height_cm} cm</td>
                  <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">{p.goal}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(p)}
                        className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PatientModal
        open={modalOpen}
        patient={editing}
        doctorId={user!.id}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
    </div>
  )
}
