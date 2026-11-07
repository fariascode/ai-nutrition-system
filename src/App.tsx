import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy } from 'react'
import { AuthProvider } from '@/features/auth/context/AuthContext'
import { ThemeProvider } from '@/context/ThemeContext'
import ProtectedRoute from '@/components/layout/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'
import RouteContent from '@/components/layout/RouteContent'
import LocalDataRecovery from '@/features/backups/components/LocalDataRecovery'

const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'))
const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage'))
const PatientsPage = lazy(() => import('@/features/patients/pages/PatientsPage'))
const PlansPage = lazy(() => import('@/features/plans/pages/PlansPage'))
const AppointmentsPage = lazy(() => import('@/features/appointments/pages/AppointmentsPage'))
const HistoryPage = lazy(() => import('@/features/history/pages/HistoryPage'))
const PatientPortalPage = lazy(() => import('@/features/portal/pages/PatientPortalPage'))
const BackupsPage = lazy(() => import('@/features/backups/pages/BackupsPage'))
const StudyOrdersPage = lazy(() => import('@/features/study-orders/pages/StudyOrdersPage'))

function App() {
  return (
    <ThemeProvider>
      <LocalDataRecovery>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<RouteContent><LoginPage /></RouteContent>} />
              {/* Ruta pública / móvil para el Portal del Paciente */}
              <Route path="/portal/:planId" element={<RouteContent><PatientPortalPage /></RouteContent>} />
              <Route path="/portal/patient/:patientId" element={<RouteContent><PatientPortalPage /></RouteContent>} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard"    element={<RouteContent><DashboardPage /></RouteContent>} />
                <Route path="/patients"     element={<RouteContent><PatientsPage /></RouteContent>} />
                <Route path="/plans"        element={<RouteContent><PlansPage /></RouteContent>} />
                <Route path="/appointments" element={<RouteContent><AppointmentsPage /></RouteContent>} />
                <Route path="/history"      element={<RouteContent><HistoryPage /></RouteContent>} />
                <Route path="/backups"      element={<RouteContent><BackupsPage /></RouteContent>} />
                <Route path="/studies"      element={<RouteContent><StudyOrdersPage /></RouteContent>} />
              </Route>
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </LocalDataRecovery>
    </ThemeProvider>
  )
}

export default App
