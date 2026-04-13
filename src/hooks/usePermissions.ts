import { useMemo } from 'react'
import { useAuthStore } from '@/store/authStore'
import type { UserRole } from '@/types'
import type { PermissionKey } from '@/types/permissions'

export interface Permissions {
  // Granular permission check
  can: (permission: PermissionKey) => boolean

  // Legacy boolean flags (backward compat)
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

  // Role flags
  isSuperAdmin: boolean
  isAdmin: boolean
  isAgent: boolean
  hasRole: (...roles: UserRole[]) => boolean
}

export function usePermissions(): Permissions {
  const role = useAuthStore((s) => s.role)
  const permissionProfile = useAuthStore((s) => s.permissionProfile)

  return useMemo(() => {
    const isSuper = role === 'super_admin'
    const isAdm = role === 'admin'
    const isAdminOrAbove = isSuper || isAdm

    // Core permission check
    function can(permission: PermissionKey): boolean {
      // Admin and super_admin bypass — always have all permissions
      if (isAdminOrAbove) return true
      // Agent: check profile permissions
      return permissionProfile?.permissions?.[permission] === true
    }

    return {
      // Granular check
      can,

      // Legacy flags mapped to new granular permissions
      canManageAgents: can('agents.edit'),
      canManageSettings: can('settings.edit'),
      canViewAllClients: can('pipeline.view_all'),
      canViewAllAgents: can('agents.view'),
      canDeleteData: isSuper, // keep super_admin only
      canViewAllTenants: isSuper,
      canManageProjects: can('projects.edit'),
      canManageGoals: can('goals.create'),
      canManageTemplates: can('documents.generate'),
      canExportData: can('reports.export'),

      // Role flags (unchanged)
      isSuperAdmin: isSuper,
      isAdmin: isAdm,
      isAgent: role === 'agent',
      hasRole: (...roles: UserRole[]) => role !== null && roles.includes(role),
    }
  }, [role, permissionProfile])
}
