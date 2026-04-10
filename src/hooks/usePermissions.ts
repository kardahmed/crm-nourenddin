import { useMemo } from 'react'
import { useAuthStore } from '@/store/authStore'
import type { UserRole } from '@/types'

export interface Permissions {
  canManageAgents: boolean
  canManageSettings: boolean
  canViewAllClients: boolean
  canViewAllAgents: boolean
  canDeleteData: boolean
  canViewAllTenants: boolean
  canManageProjects: boolean
  canManageGoals: boolean
  canManageTemplates: boolean
  canExportData: boolean
  isSuperAdmin: boolean
  isAdmin: boolean
  isAgent: boolean
  hasRole: (...roles: UserRole[]) => boolean
}

export function usePermissions(): Permissions {
  const role = useAuthStore((s) => s.role)

  return useMemo(() => {
    const isSuper = role === 'super_admin'
    const isAdm = role === 'admin'
    const isAdminOrAbove = isSuper || isAdm

    return {
      canManageAgents: isAdminOrAbove,
      canManageSettings: isAdminOrAbove,
      canViewAllClients: isAdminOrAbove,
      canViewAllAgents: isAdminOrAbove,
      canDeleteData: isSuper,
      canViewAllTenants: isSuper,
      canManageProjects: isAdminOrAbove,
      canManageGoals: isAdminOrAbove,
      canManageTemplates: isAdminOrAbove,
      canExportData: isAdminOrAbove,
      isSuperAdmin: isSuper,
      isAdmin: isAdm,
      isAgent: role === 'agent',
      hasRole: (...roles: UserRole[]) => role !== null && roles.includes(role),
    }
  }, [role])
}
