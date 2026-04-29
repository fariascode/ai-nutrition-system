import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/features/auth/context/AuthContext'
import ProtectedRoute from '@/components/layout/ProtectedRoute'
import LoginPage from '@/features/auth/pages/LoginPage'
import PatientsPage from '@/features/patients/pages/PatientsPage'
import PlansPage from '@/features/plans/pages/PlansPage'
import HistoryPage from '@/features/history/pages/HistoryPage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div className="flex items-center justify-center min-h-screen bg-gray-50">
                  <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-900">NutriAI</h1>
                    <p className="mt-2 text-gray-500">Dashboard — próximamente</p>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />

          <Route
            path="/patients"
            element={
              <ProtectedRoute>
                <PatientsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/plans"
            element={
              <ProtectedRoute>
                <PlansPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <HistoryPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
