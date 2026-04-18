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
 * Fetch all active agents with the metrics needed by every assignment
 * mode: number of active clients (for load_balanced), number of leads
 * created today (for the cap + leads_today mode), and the last time
 * the agent received a new lead (for round_robin).
 */
export function useAgentLoads(maxLeadsPerDay: number) {
  return useQuery({
    queryKey: ['reception-agent-loads', maxLeadsPerDay],
    queryFn: async (): Promise<AgentLoad[]> => {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const [agentsRes, clientsRes] = await Promise.all([
        supabase.from('users')
          .select('id, first_name, last_name')
          .eq('role', 'agent')
          .eq('status', 'active')
          .order('first_name'),
        supabase.from('clients')
          .select('id, agent_id, pipeline_stage, created_at')
          .not('agent_id', 'is', null),
      ])

      if (agentsRes.error) throw agentsRes.error
      if (clientsRes.error) throw clientsRes.error

      const agents = (agentsRes.data ?? []) as Array<{ id: string; first_name: string; last_name: string }>
      const clients = (clientsRes.data ?? []) as Array<{ agent_id: string; pipeline_stage: string; created_at: string }>

      return agents.map(a => {
        const owned = clients.filter(c => c.agent_id === a.id)
        const active = owned.filter(c => c.pipeline_stage !== 'vente' && c.pipeline_stage !== 'perdue').length
        const createdToday = owned.filter(c => new Date(c.created_at) >= todayStart)
        const lastAssigned = createdToday
          .map(c => c.created_at)
          .sort()
          .reverse()[0] ?? null
        return {
          id: a.id,
          first_name: a.first_name,
          last_name: a.last_name,
          active_clients: active,
          leads_today: createdToday.length,
          last_assigned: lastAssigned,
          at_cap: createdToday.length >= maxLeadsPerDay,
        }
      })
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
  round_robin: 'Rotation stricte: l\'agent qui a attendu le plus longtemps reçoit le prochain lead.',
  load_balanced: 'L\'agent avec le moins de clients actifs en pipeline reçoit le prochain lead.',
  leads_today: 'L\'agent avec le moins de nouveaux leads aujourd\'hui reçoit le prochain lead.',
}
