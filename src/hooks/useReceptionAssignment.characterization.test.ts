/**
 * PR1 — CHARACTERIZATION tests (GREEN).
 *
 * These tests FREEZE the *current* behavior of the reception assignment code
 * so later PRs (V2) can't change it silently. They document facts — including
 * known limitations — WITHOUT changing any production behavior.
 *
 * Scope note: `pickAgent` is the only unit-testable piece of the current
 * assignment path. It is DISPLAY-ONLY — it computes the "suggested agent"
 * shown in the UI and used to detect an override. The authoritative decision
 * (agent pick, daily cap, audit event) happens server-side in the
 * `assign_client_to_agent` / `pick_agent_for_assignment` RPCs (migration 039).
 * Those server behaviors are covered by SKIPPED target specs in
 * `src/pages/reception/reception-assignment.spec.ts` (they need a database and
 * are implemented from PR2 onward).
 */
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

describe('CHARACTERIZATION — pickAgent (current, display-only)', () => {
  // ── Known limitation A7/round-robin: no stable tie-break by id ──
  // The server RPC (039) orders by `… , u.id` as a total order. The frontend
  // pickAgent does NOT: when two eligible agents share the same last_assigned
  // (or both are null), Array.prototype.sort is stable, so the winner is simply
  // the FIRST one in input order. This is a real client/server divergence and
  // is frozen here as current behavior. The V2 target (stable id tie-break)
  // lives as a skipped spec.
  it('round_robin does NOT tie-break equal timestamps by id — input order wins', () => {
    const ts = '2026-06-22T09:00:00Z'
    const ba = [agent({ id: 'b', last_assigned: ts }), agent({ id: 'a', last_assigned: ts })]
    const ab = [agent({ id: 'a', last_assigned: ts }), agent({ id: 'b', last_assigned: ts })]
    expect(pickAgent('round_robin', ba)?.id).toBe('b') // first in array
    expect(pickAgent('round_robin', ab)?.id).toBe('a') // order-dependent
  })

  it('round_robin with all-null last_assigned returns the first in input order', () => {
    const loads = [agent({ id: 'z', last_assigned: null }), agent({ id: 'a', last_assigned: null })]
    expect(pickAgent('round_robin', loads)?.id).toBe('z')
  })

  // ── load_balanced / leads_today: numeric asc, then first_name.localeCompare ──
  it('load_balanced tie-breaks equal active_clients by first_name', () => {
    const loads = [
      agent({ id: 'x', first_name: 'Zoe', active_clients: 2 }),
      agent({ id: 'y', first_name: 'Ana', active_clients: 2 }),
    ]
    expect(pickAgent('load_balanced', loads)?.first_name).toBe('Ana')
  })

  it('leads_today tie-breaks equal leads_today by first_name', () => {
    const loads = [
      agent({ id: 'x', first_name: 'Zoe', leads_today: 1 }),
      agent({ id: 'y', first_name: 'Ana', leads_today: 1 }),
    ]
    expect(pickAgent('leads_today', loads)?.first_name).toBe('Ana')
  })

  // ── Eligibility: only at_cap filters here; role/status/tenant are pre-filtered
  //    upstream by the reception_agent_loads RPC (039). ──
  it('only at_cap removes an agent from the eligible set', () => {
    const loads = [
      agent({ id: 'a', last_assigned: null, at_cap: true }),
      agent({ id: 'b', last_assigned: '2026-06-22T08:00:00Z' }),
    ]
    expect(pickAgent('round_robin', loads)?.id).toBe('b')
    expect(pickAgent('load_balanced', [agent({ id: 'a', active_clients: 0, at_cap: true })])).toBeNull()
  })

  it('manual mode returns null even when eligible agents exist', () => {
    expect(pickAgent('manual', [agent({ id: 'a' }), agent({ id: 'b' })])).toBeNull()
  })

  // ── Purity: pickAgent must not mutate its input (it spreads before sort). ──
  it('does not mutate the input array order', () => {
    const loads = [
      agent({ id: 'a', active_clients: 9 }),
      agent({ id: 'b', active_clients: 1 }),
      agent({ id: 'c', active_clients: 5 }),
    ]
    const snapshot = loads.map(l => l.id)
    pickAgent('load_balanced', loads)
    expect(loads.map(l => l.id)).toEqual(snapshot)
  })
})
