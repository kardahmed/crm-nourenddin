import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

export function SuperAdminRoute() {
  const { isAuthenticated, isLoading, role } = useAuth()

  // Wait until session check AND profile fetch are complete
  if (isLoading) {
    return <LoadingSpinner size="lg" className="h-screen" />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Profile loaded but role is null (fetch failed / RLS issue) → login
  // Or role is not super_admin → dashboard
  if (role === null) {
    console.warn('[SuperAdminRoute] Role is null after loading, redirecting to login')
    return <Navigate to="/login" replace />
  }

  if (role !== 'super_admin') {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
