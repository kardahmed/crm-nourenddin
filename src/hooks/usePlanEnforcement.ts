/**
 * Single-tenant stub.
 *
 * The app used to enforce plan limits per tenant (agents, projects, units,
 * clients). Since we run single-tenant now, there is no plan to enforce —
 * everything is unlimited. This stub is kept so existing call sites keep
 * compiling; it will be removed when those callers are cleaned up.
 */
export function usePlanEnforcement() {
  return {
    plan: 'unlimited' as const,
    limits: {
      plan: 'unlimited',
      max_agents: Infinity,
      max_projects: Infinity,
      max_units: Infinity,
      max_clients: Infinity,
      max_storage_mb: Infinity,
      features: {} as Record<string, boolean>,
      price_monthly: 0,
    },
    usage: { agents: 0, projects: 0, units: 0, clients: 0 },
    canAddAgent: true,
    canAddProject: true,
    canAddUnit: true,
    canAddClient: true,
    hasFeature: (_feature: string) => true,
    isLimitReached: (_type: 'agents' | 'projects' | 'units' | 'clients') => false,
  }
}
