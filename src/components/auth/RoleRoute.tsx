import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import type { UserRole } from '@/types'

interface RoleRouteProps {
  allowedRoles: UserRole[]
}

export function RoleRoute({ allowedRoles }: RoleRouteProps) {
  const role = useAuthStore((s) => s.role)

  if (!role || !allowedRoles.includes(role)) {
    const target = role === 'reception' ? '/reception' : '/dashboard'
    return <Navigate to={target} replace />
  }

  return <Outlet />
}
