-- ================================================
-- CRM NOUREDDINE — File 13/N
-- Add the `reception` user role.
--
-- The receptionist is the agency's front desk: she creates new
-- clients (walk-ins, incoming calls), assigns them to commercial
-- agents, and welcomes clients arriving for scheduled visits.
--
-- What she can do:
--   * SELECT on clients           — see the whole book to dispatch.
--   * INSERT on clients           — register a new lead.
--   * UPDATE on clients           — reassign + edit contact info.
--                                   Commercial fields (pipeline_stage,
--                                   confirmed_budget, visit feedback,
--                                   interest_level, payment_method,
--                                   cin_*) stay read-only via a trigger.
--   * SELECT on visits            — know who is expected today.
--   * SELECT on users             — list agents for the assignment UI.
--   * SELECT on history           — audit her own dispatches.
--
-- What she cannot do:
--   * Touch sales, reservations, payments, charges, goals.
--   * Delete anything.
--   * Change a client's pipeline stage, budget, or ID documents.
--
-- Assignment policy is centralised in `app_settings`:
--   * reception_assignment_mode     — manual | round_robin |
--                                     load_balanced | leads_today
--   * reception_max_leads_per_day   — hard cap per agent to prevent
--                                     favoritism even in manual mode.
--   * reception_override_requires_reason — force a motif when the
--                                          receptionist bypasses the
--                                          suggested agent.
-- ================================================


-- ─── 1. Extend user_role enum ───
DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'reception';
EXCEPTION WHEN others THEN NULL; END $$;


-- ─── 2. Helper: is_reception() ───
-- Mirrors the shape of is_admin(); SECURITY DEFINER so RLS policies
-- can invoke it without the caller needing SELECT on users.
CREATE OR REPLACE FUNCTION public.is_reception()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'reception'
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;


-- ─── 3. app_settings: assignment policy columns ───
ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS reception_assignment_mode TEXT
    NOT NULL DEFAULT 'manual'
    CHECK (reception_assignment_mode IN ('manual', 'round_robin', 'load_balanced', 'leads_today')),
  ADD COLUMN IF NOT EXISTS reception_max_leads_per_day INTEGER
    NOT NULL DEFAULT 10
    CHECK (reception_max_leads_per_day > 0),
  ADD COLUMN IF NOT EXISTS reception_override_requires_reason BOOLEAN
    NOT NULL DEFAULT TRUE;


-- ─── 4. RLS: clients ───
-- Replace SELECT/INSERT/UPDATE policies so reception is included.
-- DELETE stays admin-only.
DROP POLICY IF EXISTS "clients_select" ON clients;
CREATE POLICY "clients_select" ON clients FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR public.is_reception()
    OR agent_id = auth.uid()
  );

DROP POLICY IF EXISTS "clients_insert" ON clients;
CREATE POLICY "clients_insert" ON clients FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR public.is_reception()
    OR agent_id = auth.uid()
  );

DROP POLICY IF EXISTS "clients_update" ON clients;
CREATE POLICY "clients_update" ON clients FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR public.is_reception()
    OR agent_id = auth.uid()
  )
  WITH CHECK (
    public.is_admin()
    OR public.is_reception()
    OR agent_id = auth.uid()
  );


-- ─── 5. Column-level guard for reception UPDATE ───
-- RLS cannot restrict individual columns; a BEFORE UPDATE trigger
-- reverts commercial fields if a non-admin reception user tries to
-- modify them. Keeps the contract enforceable even if the UI gets
-- it wrong or the call comes from a scripted client.
CREATE OR REPLACE FUNCTION public.enforce_reception_client_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Only applies to reception users. Admin and agents are unchanged.
  IF public.is_reception() AND NOT public.is_admin() THEN
    NEW.pipeline_stage    := OLD.pipeline_stage;
    NEW.confirmed_budget  := OLD.confirmed_budget;
    NEW.visit_note        := OLD.visit_note;
    NEW.visit_feedback    := OLD.visit_feedback;
    NEW.interest_level    := OLD.interest_level;
    NEW.payment_method    := OLD.payment_method;
    NEW.nin_cin           := OLD.nin_cin;
    NEW.cin_verified      := OLD.cin_verified;
    NEW.cin_doc_url       := OLD.cin_doc_url;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_enforce_reception_client_update ON clients;
CREATE TRIGGER trg_enforce_reception_client_update
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION public.enforce_reception_client_update();


-- ─── 6. RLS: visits (read-only for reception) ───
DROP POLICY IF EXISTS "visits_select" ON visits;
CREATE POLICY "visits_select" ON visits FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR public.is_reception()
    OR agent_id = auth.uid()
    OR EXISTS (SELECT 1 FROM clients c WHERE c.id = visits.client_id AND c.agent_id = auth.uid())
  );


-- ─── 7. RLS: users (reception sees agent roster for assignment) ───
-- The existing policy likely already allows authenticated users to
-- read the user list; we tighten it here to explicitly include
-- reception if a future migration locks it down.
DROP POLICY IF EXISTS "users_select_for_reception" ON users;
CREATE POLICY "users_select_for_reception" ON users FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR public.is_reception()
    OR id = auth.uid()
  );


-- ─── 8. RLS: history (reception reads reassignment/creation trail) ───
DROP POLICY IF EXISTS "history_select" ON history;
CREATE POLICY "history_select" ON history FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR public.is_reception()
    OR agent_id = auth.uid()
    OR EXISTS (SELECT 1 FROM clients c WHERE c.id = history.client_id AND c.agent_id = auth.uid())
  );


-- ─── 9. Assignment helpers ───
-- Return the next agent to receive a lead, respecting the configured
-- mode and the daily cap. NULL when every agent has hit the cap.
--
-- * manual         → caller must pick; this function returns NULL.
-- * round_robin    → pick agent whose last assignment is oldest.
-- * load_balanced  → pick agent with the fewest active clients.
-- * leads_today    → pick agent with the fewest leads received today.
CREATE OR REPLACE FUNCTION public.pick_agent_for_assignment()
RETURNS UUID AS $$
DECLARE
  mode        TEXT;
  day_cap     INTEGER;
  chosen      UUID;
BEGIN
  SELECT reception_assignment_mode, reception_max_leads_per_day
    INTO mode, day_cap
  FROM app_settings
  LIMIT 1;

  IF mode IS NULL OR mode = 'manual' THEN
    RETURN NULL;
  END IF;

  IF mode = 'round_robin' THEN
    SELECT u.id INTO chosen
    FROM users u
    LEFT JOIN LATERAL (
      SELECT MAX(h.created_at) AS last_assigned
      FROM history h
      WHERE h.agent_id = u.id AND h.type = 'client_created'
    ) lh ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS today_count
      FROM clients c
      WHERE c.agent_id = u.id
        AND c.created_at >= date_trunc('day', NOW())
    ) tc ON TRUE
    WHERE u.role = 'agent' AND u.status = 'active'
      AND tc.today_count < day_cap
    ORDER BY lh.last_assigned NULLS FIRST
    LIMIT 1;

  ELSIF mode = 'load_balanced' THEN
    SELECT u.id INTO chosen
    FROM users u
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS active_count
      FROM clients c
      WHERE c.agent_id = u.id
        AND c.pipeline_stage NOT IN ('vente', 'perdue')
    ) ac ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS today_count
      FROM clients c
      WHERE c.agent_id = u.id
        AND c.created_at >= date_trunc('day', NOW())
    ) tc ON TRUE
    WHERE u.role = 'agent' AND u.status = 'active'
      AND tc.today_count < day_cap
    ORDER BY ac.active_count ASC, u.first_name ASC
    LIMIT 1;

  ELSIF mode = 'leads_today' THEN
    SELECT u.id INTO chosen
    FROM users u
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS today_count
      FROM clients c
      WHERE c.agent_id = u.id
        AND c.created_at >= date_trunc('day', NOW())
    ) tc ON TRUE
    WHERE u.role = 'agent' AND u.status = 'active'
      AND tc.today_count < day_cap
    ORDER BY tc.today_count ASC, u.first_name ASC
    LIMIT 1;
  END IF;

  RETURN chosen;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;


-- ─── 10. Grant execute on helpers ───
GRANT EXECUTE ON FUNCTION public.is_reception() TO authenticated;
GRANT EXECUTE ON FUNCTION public.pick_agent_for_assignment() TO authenticated;
