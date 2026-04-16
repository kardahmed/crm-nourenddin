import { useAuthStore } from '@/store/authStore'

/**
 * Returns the tenant id for the current user.
 *
 * NOTE: This app runs in single-tenant mode. The helper is kept for backward
 * compatibility with hooks that still reference `tenantId`, but will be
 * removed once all call sites stop filtering by tenant.
 */
export function useTenant() {
  const tenantId = useAuthStore((s) => s.tenantId)
  if (!tenantId) {
    throw new Error('useTenant must be used within an authenticated context')
  }
  return tenantId
}

/** Safe version that returns null instead of throwing */
export function useTenantSafe(): string | null {
  return useAuthStore((s) => s.tenantId)
}
