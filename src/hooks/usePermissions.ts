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
    const isAdm = role === 'admin'

    // Core permission check
    function can(permission: PermissionKey): boolean {
      // Admin bypass — always has all permissions
      if (isAdm) return true
      const perms = permissionProfile?.permissions
      if (!perms) return false
      if (perms[permission] === true) return true
      // view_all is a superset of view_own
      if (permission.endsWith('.view_own')) {
        const allKey = permission.replace('.view_own', '.view_all') as PermissionKey
        if (perms[allKey] === true) return true
      }
      return false
    }

    return {
      // Granular check
      can,

      // Legacy flags mapped to new granular permissions
      canManageAgents: can('agents.edit'),
      canManageSettings: can('settings.edit'),
      canViewAllClients: can('pipeline.view_all'),
      canViewAllAgents: can('agents.view'),
      canDeleteData: isAdm,
      canViewAllTenants: false,
      canManageProjects: can('projects.edit'),
      canManageGoals: can('goals.create'),
      canManageTemplates: can('documents.generate'),
      canExportData: can('reports.export'),

      // Role flags
      isSuperAdmin: false,
      isAdmin: isAdm,
      isAgent: role === 'agent',
      hasRole: (...roles: UserRole[]) => role !== null && roles.includes(role),
    }
  }, [role, permissionProfile])
}
