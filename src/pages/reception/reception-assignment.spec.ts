/**
 * PR1 — SPECIFICATION tests (SKIPPED on purpose; NOT failing).
 *
 * These describe the *target* (V2) behavior agreed in the design. They are
 * `it.skip` so `main` stays green: each later PR un-skips only the specs it
 * makes true. NOTHING here changes production behavior — the bodies are
 * placeholders documenting intent + the PR that will implement them.
 *
 * Most specs require a database (RPCs, triggers, constraints) and will be
 * implemented as SQL/integration/concurrency tests from PR2 onward; a few are
 * pure and will move to unit tests. Titles map 1:1 to the validated design.
 */
import { describe, it } from 'vitest'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const TODO = (_pr: string) => undefined // marks the PR that unskips a spec

describe.skip('SPEC (V2 target) — personal vs reception vs manual', () => {
  it('self_assigned: agent adds own client → agent_id=creator, no dispatch event', () => { TODO('PR2') })
  it('self_assigned does NOT move the round-robin pointer', () => { TODO('PR2/PR3') })
  it('self_assigned does NOT consume the daily cap', () => { TODO('PR2/PR3') })
  it('self_assigned is excluded from round-robin equity stats', () => { TODO('PR2/PR6') })
  it('admin creating for an agent uses manual_on_behalf, never self_assigned', () => { TODO('PR2') })
})

describe.skip('SPEC (V2 target) — reception dispatch is atomic and audited', () => {
  it('create_and_dispatch_reception_lead runs create+dispatch in ONE transaction', () => { TODO('PR2/PR4') })
  it('frontend never sends agent_id for a reception lead (rejected server-side)', () => { TODO('PR4/PR5') })
  it('a dispatched lead sets current_assigned_at and writes a dispatched event', () => { TODO('PR2') })
  it('every reception lead ends with an explicit outcome: dispatched | capacity_exhausted | traced failure', () => { TODO('PR4') })
  it('no reception lead stays silently pending after an interruption', () => { TODO('PR4') })
})

describe.skip('SPEC (V2 target) — round-robin selection is deterministic & monotone', () => {
  it('pickAgent (and server) tie-break equal timestamps by a stable id (total order)', () => { TODO('PR3') })
  it('pointer uses MAX(event_sequence), not MAX(created_at), so it never goes backwards', () => { TODO('PR3') })
  it('dispatch timestamp is captured once via clock_timestamp() after acquiring the lock', () => { TODO('PR3') })
})

describe.skip('SPEC (V2 target) — daily cap (Africa/Algiers, from events)', () => {
  it('cap counts only dispatched round_robin events', () => { TODO('PR3/PR6') })
  it('the 100th lead is accepted; the 101st is not assigned to a capped agent', () => { TODO('PR3') })
  it('cap boundaries use the Africa/Algiers day, not UTC', () => { TODO('PR3') })
  it('when all agents are at cap → capacity_exhausted event, lead kept unassigned', () => { TODO('PR3/PR4') })
  it('cap value comes from app_settings and each change is audited', () => { TODO('PR3') })
})

describe.skip('SPEC (V2 target) — concurrency & atomicity', () => {
  it('N concurrent dispatches keep max-min assignments <= 1 (fair)', () => { TODO('PR3') })
  it('concurrent dispatches never exceed the cap', () => { TODO('PR3') })
  it('advisory lock key comes from reception_lock_key() (64-bit, per-agency)', () => { TODO('PR3') })
})

describe.skip('SPEC (V2 target) — idempotency of every mutation', () => {
  it('retry with same key returns the same response (not a unique violation)', () => { TODO('PR2') })
  it('same key + different request_hash is rejected (no cross-request replay)', () => { TODO('PR2') })
  it('create_and_dispatch, assign_client_manually, create_personal_client, create_client_on_behalf, reassign_client, transfer all take an idempotency key', () => { TODO('PR2') })
})

describe.skip('SPEC (V2 target) — immutable audit & journal', () => {
  it('journal Method column is read from events, never re-inferred from current state', () => { TODO('PR6') })
  it('reception_assignment_events forbids UPDATE/DELETE for application roles', () => { TODO('PR7') })
  it('renaming/deleting an agent does not rewrite past events (snapshots frozen)', () => { TODO('PR7') })
  it('deleting a client does not cascade-delete its assignment events', () => { TODO('PR7') })
})

describe.skip('SPEC (V2 target) — reassignment semantics', () => {
  it('reassign_client keeps assigned_at unchanged and does not restitute a cap unit', () => { TODO('PR2') })
  it('reassignment is excluded from automatic equity', () => { TODO('PR2/PR6') })
})

describe.skip('SPEC (V2 target) — multi-tenant isolation (placeholder, mono-tenant today)', () => {
  it('two agencies dispatch concurrently without blocking each other or mixing agents', () => { TODO('future') })
})
