import { useMemo } from 'react'
import { useAuthStore } from '@/store/authStore'
import type { UserRole } from '@/types'
import type { PermissionKey } from '@/types/permissions'

/**
 * Default permissions granted to any agent that does NOT have a custom
 * permission_profile_id assigned. Gives them everything they need to do
 * the day-to-day commercial work without admin intervention. Admins can
 * still create restrictive profiles and assign them to specific agents.
 */
const DEFAULT_AGENT_PERMISSIONS: PermissionKey[] = [
  'dashboard.view',
  'pipeline.view_own', 'pipeline.create', 'pipeline.edit', 'pipeline.change_stage',
  'projects.view', 'units.view',
  'visits.view_own', 'visits.create', 'visits.edit',
  'reservations.view', 'reservations.create',
  'sales.view', 'sales.create',
  'dossiers.view',
  'documents.view', 'documents.generate', 'documents.upload',
  'payments.view',
  'goals.view_own',
  'performance.view_own',
  'reports.view',
  'ai.call_script', 'ai.suggestions',
  'whatsapp.send', 'whatsapp.view_history',
]

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

    function can(permission: PermissionKey): boolean {
      // Admin bypass — full access
      if (isAdm) return true
      // Agent with a custom profile → use the profile
      if (permissionProfile?.permissions) {
        return permissionProfile.permissions[permission] === true
      }
      // Agent without a profile → grant defaults
      return DEFAULT_AGENT_PERMISSIONS.includes(permission)
    }

    return {
      can,
      // Managing agents (create/deactivate, edit role) is admin-only and
      // must match the router guard `<RoleRoute allowedRoles={['admin']}>`.
      // Using a permission key here would let an admin with a restrictive
      // custom profile lose access to a page the router still opens.
      canManageAgents: isAdm,
      canManageSettings: can('settings.edit'),
      canViewAllClients: can('pipeline.view_all'),
      canViewAllAgents: can('agents.view'),
      canDeleteData: isAdm,
      canViewAllTenants: false,
      canManageProjects: can('projects.edit'),
      canManageGoals: can('goals.create'),
      canManageTemplates: can('documents.generate'),
      canExportData: can('reports.export'),
      isSuperAdmin: false,
      isAdmin: isAdm,
      isAgent: role === 'agent',
      hasRole: (...roles: UserRole[]) => role !== null && roles.includes(role),
    }
  }, [role, permissionProfile])
}
