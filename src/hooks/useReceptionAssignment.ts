import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type AssignmentMode = 'manual' | 'round_robin' | 'load_balanced' | 'leads_today'

export interface ReceptionSettings {
  mode: AssignmentMode
  maxLeadsPerDay: number
  overrideRequiresReason: boolean
}

export interface AgentLoad {
  id: string
  first_name: string
  last_name: string
  active_clients: number
  leads_today: number
  last_assigned: string | null
  at_cap: boolean
}

/**
 * Read the receptionist assignment policy from app_settings. Callers use
 * this to display the current mode, render the admin selector, and know
 * whether an override must include a reason.
 */
export function useReceptionSettings() {
  return useQuery({
    queryKey: ['reception-settings'],
    queryFn: async (): Promise<ReceptionSettings> => {
      const { data, error } = await supabase
        .from('app_settings' as never)
        .select('reception_assignment_mode, reception_max_leads_per_day, reception_override_requires_reason')
        .limit(1)
        .maybeSingle()
      if (error) throw error
      const row = (data ?? {}) as {
        reception_assignment_mode?: AssignmentMode
        reception_max_leads_per_day?: number
        reception_override_requires_reason?: boolean
      }
      return {
        mode: row.reception_assignment_mode ?? 'manual',
        maxLeadsPerDay: row.reception_max_leads_per_day ?? 10,
        overrideRequiresReason: row.reception_override_requires_reason ?? true,
      }
    },
    staleTime: 60_000,
  })
}

/**
 * Fetch every active agent with the metrics each assignment mode needs:
 * active clients (load_balanced), leads received today (cap + leads_today)
 * and the last time the agent was dispatched a lead (round_robin).
 *
 * The aggregation runs in Postgres (`reception_agent_loads` RPC) so the
 * browser only receives one small row per agent instead of the whole
 * clients table. Crucially, the RPC counts **dispatched leads only**
 * (clients.assigned_at IS NOT NULL): a client an agent created for himself
 * never inflates his load nor pushes him out of the rotation.
 */
export function useAgentLoads(maxLeadsPerDay: number) {
  return useQuery({
    queryKey: ['reception-agent-loads', maxLeadsPerDay],
    queryFn: async (): Promise<AgentLoad[]> => {
      const { data, error } = await supabase.rpc('reception_agent_loads' as never)
      if (error) throw error
      return ((data ?? []) as AgentLoad[]).map(a => ({
        id: a.id,
        first_name: a.first_name,
        last_name: a.last_name,
        active_clients: a.active_clients ?? 0,
        leads_today: a.leads_today ?? 0,
        last_assigned: a.last_assigned ?? null,
        at_cap: a.at_cap ?? false,
      }))
    },
    staleTime: 15_000,
  })
}

/**
 * Pick the best agent given the configured mode and the per-day cap.
 * Returns null when every agent is saturated or when the mode is manual.
 */
export function pickAgent(
  mode: AssignmentMode,
  loads: AgentLoad[],
): AgentLoad | null {
  const eligible = loads.filter(a => !a.at_cap)
  if (eligible.length === 0) return null

  if (mode === 'manual') return null

  if (mode === 'round_robin') {
    // Oldest last_assigned wins; nulls (never assigned today) go first.
    return [...eligible].sort((a, b) => {
      if (a.last_assigned === null && b.last_assigned === null) return 0
      if (a.last_assigned === null) return -1
      if (b.last_assigned === null) return 1
      return a.last_assigned.localeCompare(b.last_assigned)
    })[0]
  }

  if (mode === 'load_balanced') {
    return [...eligible].sort((a, b) =>
      a.active_clients - b.active_clients || a.first_name.localeCompare(b.first_name)
    )[0]
  }

  // leads_today
  return [...eligible].sort((a, b) =>
    a.leads_today - b.leads_today || a.first_name.localeCompare(b.first_name)
  )[0]
}

export const MODE_LABELS: Record<AssignmentMode, string> = {
  manual: 'Manuel',
  round_robin: 'Round-robin',
  load_balanced: 'Équilibré (charge)',
  leads_today: 'Équitable (leads du jour)',
}

export const MODE_DESCRIPTIONS: Record<AssignmentMode, string> = {
  manual: 'La réception choisit librement. Un motif est loggué à chaque attribution.',
  round_robin: 'Rotation stricte: l\'agent dont le dernier lead reçu de la réception est le plus ancien reçoit le prochain. Les clients qu\'un agent ajoute lui-même ne comptent pas.',
  load_balanced: 'L\'agent avec le moins de leads réception actifs en pipeline reçoit le prochain. Les clients auto-ajoutés par l\'agent ne comptent pas.',
  leads_today: 'L\'agent avec le moins de leads reçus de la réception aujourd\'hui reçoit le prochain. Les clients auto-ajoutés ne comptent pas.',
}
