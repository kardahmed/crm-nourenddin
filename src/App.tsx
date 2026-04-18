import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { RoleRoute } from '@/components/auth/RoleRoute'
import { GuestOnlyRoute } from '@/components/auth/GuestOnlyRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useAuthStore } from '@/store/authStore'

// Lazy-loaded pages for code splitting
const LoginPage = lazy(() => import('@/pages/auth/LoginPage').then(m => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage').then(m => ({ default: m.RegisterPage })))
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })))
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })))
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })))
const ProjectsPage = lazy(() => import('@/pages/projects/ProjectsPage').then(m => ({ default: m.ProjectsPage })))
const ProjectDetailPage = lazy(() => import('@/pages/projects/ProjectDetailPage').then(m => ({ default: m.ProjectDetailPage })))
const PipelinePage = lazy(() => import('@/pages/pipeline/PipelinePage').then(m => ({ default: m.PipelinePage })))
const ClientDetailPage = lazy(() => import('@/pages/pipeline/ClientDetailPage').then(m => ({ default: m.ClientDetailPage })))
const PlanningPage = lazy(() => import('@/pages/planning/PlanningPage').then(m => ({ default: m.PlanningPage })))
const DossiersPage = lazy(() => import('@/pages/dossiers/DossiersPage').then(m => ({ default: m.DossiersPage })))
const GoalsPage = lazy(() => import('@/pages/goals/GoalsPage').then(m => ({ default: m.GoalsPage })))
const PerformancePage = lazy(() => import('@/pages/performance/PerformancePage').then(m => ({ default: m.PerformancePage })))
const AgentsPage = lazy(() => import('@/pages/agents/AgentsPage').then(m => ({ default: m.AgentsPage })))
const AgentDetailPage = lazy(() => import('@/pages/agents/AgentDetailPage').then(m => ({ default: m.AgentDetailPage })))
const ReportsPage = lazy(() => import('@/pages/reports/ReportsPage').then(m => ({ default: m.ReportsPage })))
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage').then(m => ({ default: m.SettingsPage })))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })))

const TasksPage = lazy(() => import('@/pages/tasks/TasksPage').then(m => ({ default: m.TasksPage })))
const MarketingROIPage = lazy(() => import('@/pages/marketing-roi/MarketingROIPage').then(m => ({ default: m.MarketingROIPage })))
const ReceptionPage = lazy(() => import('@/pages/reception/ReceptionPage').then(m => ({ default: m.ReceptionPage })))
const TodayPage = lazy(() => import('@/pages/today/TodayPage').then(m => ({ default: m.TodayPage })))
const ProfilePage = lazy(() => import('@/pages/profile/ProfilePage').then(m => ({ default: m.ProfilePage })))


function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-immo-bg-primary">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-immo-accent-green border-t-transparent" />
    </div>
  )
}


function HomeRedirect() {
  const hasSession = Object.keys(localStorage).some(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
  const role = useAuthStore(s => s.role)
  if (!hasSession) return <Navigate to="/login" replace />
  // Reception lands on /reception; everyone else on /dashboard.
  if (role === 'reception') return <Navigate to="/reception" replace />
  return <Navigate to="/dashboard" replace />
}

function App() {
  return (
    <ErrorBoundary>
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route element={<GuestOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        {/* App routes — /dashboard, /pipeline, etc. */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            {/* All roles: profile + projects (reception needs projects for phone answers) */}
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:projectId" element={<ProjectDetailPage />} />

            {/* Agent + admin */}
            <Route element={<RoleRoute allowedRoles={['agent', 'admin']} />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/today" element={<TodayPage />} />
              <Route path="/pipeline" element={<PipelinePage />} />
              <Route path="/pipeline/clients/:clientId" element={<ClientDetailPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/planning" element={<PlanningPage />} />
              <Route path="/dossiers" element={<DossiersPage />} />
              <Route path="/goals" element={<GoalsPage />} />
              <Route path="/performance" element={<PerformancePage />} />
              <Route path="/reports" element={<ReportsPage />} />
            </Route>

            {/* Reception + admin (front-desk hub) */}
            <Route element={<RoleRoute allowedRoles={['reception', 'admin']} />}>
              <Route path="/reception" element={<ReceptionPage />} />
            </Route>

            {/* Admin only */}
            <Route element={<RoleRoute allowedRoles={['admin']} />}>
              <Route path="/agents" element={<AgentsPage />} />
              <Route path="/agents/:agentId" element={<AgentDetailPage />} />
              <Route path="/marketing-roi" element={<MarketingROIPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
    </ErrorBoundary>
  )
}

export default App
