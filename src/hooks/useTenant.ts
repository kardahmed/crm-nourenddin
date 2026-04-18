import { SINGLE_TENANT_ID } from '@/lib/singleTenant'

/**
 * Returns the tenant id for the current installation.
 *
 * The app runs in single-tenant mode. This helper is kept for backward
 * compatibility with hooks that still reference `tenantId` — it now always
 * returns the fixed tenant UUID (never throws, never null).
 *
 * TODO: delete once all call sites stop filtering by tenant in app code
 * (RLS handles isolation).
 */
export function useTenant(): string {
  return SINGLE_TENANT_ID
}

/** Safe version kept for legacy call sites. Returns the same fixed UUID. */
export function useTenantSafe(): string {
  return SINGLE_TENANT_ID
}
