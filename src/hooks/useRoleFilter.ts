import { useAuthStore } from '@/store/authStore'
import { usePermissions } from './usePermissions'

/**
 * Returns the filters to apply on queries based on user role.
 * - Admin: no additional filter (RLS handles security)
 * - Agent: automatic agent_id filter (enforced by RLS)
 *
 * RLS handles the actual security; these filters are for explicit query building.
 */
export function useRoleFilter() {
  const { session } = useAuthStore()
  const { isAgent } = usePermissions()

  const agentId = isAgent ? session?.user?.id ?? null : null

  return {
    agentId,
    isFiltered: isAgent,
  }
}
