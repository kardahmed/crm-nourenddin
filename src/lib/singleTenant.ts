/**
 * Single-tenant mode: one fixed tenant UUID for the whole installation.
 *
 * This constant replaces the historical multi-tenant `tenantId` coming from
 * `authStore`. All users, projects, clients, etc. belong to this tenant.
 * The tenant row must exist in the DB (see seed migration).
 */
export const SINGLE_TENANT_ID = '00000000-0000-0000-0000-000000000001'
