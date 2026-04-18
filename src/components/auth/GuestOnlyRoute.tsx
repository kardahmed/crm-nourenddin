import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export function GuestOnlyRoute() {
  const { isAuthenticated, isLoading, role } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-immo-bg-primary">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-immo-accent-green border-t-transparent" />
      </div>
    )
  }

  if (isAuthenticated) {
    const target = role === 'reception' ? '/reception' : '/dashboard'
    return <Navigate to={target} replace />
  }

  return <Outlet />
}
