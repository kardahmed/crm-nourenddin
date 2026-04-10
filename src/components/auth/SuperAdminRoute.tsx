import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

export function SuperAdminRoute() {
  const { isAuthenticated, isLoading, role } = useAuth()

  // Wait until session AND profile are fully loaded
  if (isLoading) {
    return <LoadingSpinner size="lg" className="h-screen" />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (role !== 'super_admin') {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
