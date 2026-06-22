import { describe, it, expect, vi } from 'vitest'

// pickAgent is pure; stub the Supabase client so importing the hook module
// doesn't try to build a real client (which needs env vars) at load time.
vi.mock('@/lib/supabase', () => ({ supabase: {} }))

import { pickAgent, type AgentLoad } from './useReceptionAssignment'

function agent(over: Partial<AgentLoad> & { id: string }): AgentLoad {
  return {
    first_name: over.id,
    last_name: 'X',
    active_clients: 0,
    leads_today: 0,
    last_assigned: null,
    at_cap: false,
    ...over,
  }
}

describe('pickAgent', () => {
  it('manual mode never auto-picks', () => {
    const loads = [agent({ id: 'a' }), agent({ id: 'b' })]
    expect(pickAgent('manual', loads)).toBeNull()
  })

  it('returns null when every agent is at cap', () => {
    const loads = [agent({ id: 'a', at_cap: true }), agent({ id: 'b', at_cap: true })]
    expect(pickAgent('round_robin', loads)).toBeNull()
    expect(pickAgent('load_balanced', loads)).toBeNull()
    expect(pickAgent('leads_today', loads)).toBeNull()
  })

  it('round_robin prefers agents never assigned, then the oldest assignment', () => {
    const loads = [
      agent({ id: 'a', last_assigned: '2026-06-22T09:00:00Z' }),
      agent({ id: 'b', last_assigned: null }), // never assigned → first
      agent({ id: 'c', last_assigned: '2026-06-22T08:00:00Z' }),
    ]
    expect(pickAgent('round_robin', loads)?.id).toBe('b')

    const loads2 = [
      agent({ id: 'a', last_assigned: '2026-06-22T09:00:00Z' }),
      agent({ id: 'c', last_assigned: '2026-06-22T08:00:00Z' }), // oldest
    ]
    expect(pickAgent('round_robin', loads2)?.id).toBe('c')
  })

  it('round_robin skips capped agents even if they waited longest', () => {
    const loads = [
      agent({ id: 'a', last_assigned: null, at_cap: true }),
      agent({ id: 'b', last_assigned: '2026-06-22T08:00:00Z' }),
    ]
    expect(pickAgent('round_robin', loads)?.id).toBe('b')
  })

  it('load_balanced picks the fewest active clients', () => {
    const loads = [
      agent({ id: 'a', active_clients: 5 }),
      agent({ id: 'b', active_clients: 2 }),
      agent({ id: 'c', active_clients: 8 }),
    ]
    expect(pickAgent('load_balanced', loads)?.id).toBe('b')
  })

  it('leads_today picks the fewest leads received today', () => {
    const loads = [
      agent({ id: 'a', leads_today: 3 }),
      agent({ id: 'b', leads_today: 1 }),
      agent({ id: 'c', leads_today: 4 }),
    ]
    expect(pickAgent('leads_today', loads)?.id).toBe('b')
  })
})
