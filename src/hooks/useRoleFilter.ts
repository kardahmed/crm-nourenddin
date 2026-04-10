import { useAuthStore } from '@/store/authStore'
import { usePermissions } from './usePermissions'

/**
 * Returns the filters to apply on queries based on user role.
 * - Super Admin: optional tenant filter (for multi-tenant view)
 * - Admin: automatic tenant_id filter (enforced by RLS)
 * - Agent: automatic agent_id filter (enforced by RLS)
 *
 * RLS handles the actual security; these filters are for explicit query building.
 */
export function useRoleFilter(selectedTenantId?: string) {
  const { tenantId, session } = useAuthStore()
  const { isSuperAdmin, isAgent } = usePermissions()

  const effectiveTenantId = isSuperAdmin && selectedTenantId
    ? selectedTenantId
    : tenantId

  const agentId = isAgent ? session?.user?.id ?? null : null

  return {
    tenantId: effectiveTenantId,
    agentId,
    isFiltered: isAgent,
  }
}
