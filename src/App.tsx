import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/features/auth/context/AuthContext'
import { ThemeProvider } from '@/context/ThemeContext'
import ProtectedRoute from '@/components/layout/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'
import LoginPage from '@/features/auth/pages/LoginPage'
import DashboardPage from '@/features/dashboard/pages/DashboardPage'
import PatientsPage from '@/features/patients/pages/PatientsPage'
import PlansPage from '@/features/plans/pages/PlansPage'
import AppointmentsPage from '@/features/appointments/pages/AppointmentsPage'
import HistoryPage from '@/features/history/pages/HistoryPage'
import PatientPortalPage from '@/features/portal/pages/PatientPortalPage'
import BackupsPage from '@/features/backups/pages/BackupsPage'
import StudyOrdersPage from '@/features/study-orders/pages/StudyOrdersPage'
import LocalDataRecovery from '@/features/backups/components/LocalDataRecovery'

function App() {
  return (
    <ThemeProvider>
      <LocalDataRecovery>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              {/* Ruta pública / móvil para el Portal del Paciente */}
              <Route path="/portal/:planId" element={<PatientPortalPage />} />
              <Route path="/portal/patient/:patientId" element={<PatientPortalPage />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard"    element={<DashboardPage />} />
                <Route path="/patients"     element={<PatientsPage />} />
                <Route path="/plans"        element={<PlansPage />} />
                <Route path="/appointments" element={<AppointmentsPage />} />
                <Route path="/history"      element={<HistoryPage />} />
                <Route path="/backups"      element={<BackupsPage />} />
                <Route path="/studies"      element={<StudyOrdersPage />} />
              </Route>
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </LocalDataRecovery>
    </ThemeProvider>
  )
}

export default App
