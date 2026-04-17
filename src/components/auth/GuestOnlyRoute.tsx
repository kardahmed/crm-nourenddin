import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

// Wraps public auth pages (/login, /register, /forgot-password,
// /reset-password). If a valid session is already loaded we redirect
// to /dashboard rather than re-rendering a form the user has no
// reason to see — keeps guest entrypoints consistent with LoginPage.
export function GuestOnlyRoute() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-immo-bg-primary">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-immo-accent-green border-t-transparent" />
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
