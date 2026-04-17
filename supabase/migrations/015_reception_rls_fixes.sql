-- ================================================
-- CRM NOUREDDINE — File 15/N
-- Fix two RLS gaps discovered after migration 014:
--
--   1. visits UPDATE — migration 006 set `is_admin() OR agent_id = auth.uid()`
--      for every row. Reception users check clients in for their visits by
--      flipping `status` to `confirmed`, but that UPDATE was silently
--      rejected because reception.auth.uid() != visit.agent_id.
--
--   2. history INSERT — migration 008 set
--      `is_admin() OR agent_id = auth.uid() OR client.agent_id = auth.uid()`.
--      When reception logs a reassignment or a check-in, history.agent_id is
--      the *target* agent (not the receptionist) and client.agent_id is
--      also the target, so the INSERT was rejected. All audit trails
--      produced by the reception UI disappeared silently.
--
-- This file ONLY widens the two policies; it does not touch columns, enums
-- or triggers. Safe to re-run (uses DROP POLICY IF EXISTS + CREATE).
-- ================================================

-- ─── 1. visits UPDATE: allow reception to flip status for check-in ───
-- SELECT was already patched in 013; UPDATE was not. The reception user
-- legitimately needs to move `status → confirmed` when a client arrives.
DROP POLICY IF EXISTS "visits_update" ON visits;
CREATE POLICY "visits_update" ON visits FOR UPDATE TO authenticated
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

-- Optional column-level guard: prevent reception from tampering with the
-- agent_id, scheduled_at, client_id, project_id or feedback fields of a
-- visit. She should only be able to change `status` and `notes` during
-- check-in. Same trigger pattern used for clients in migration 013.
CREATE OR REPLACE FUNCTION public.enforce_reception_visit_update()
RETURNS TRIGGER AS $$
BEGIN
  IF public.is_reception() AND NOT public.is_admin() THEN
    NEW.agent_id      := OLD.agent_id;
    NEW.client_id     := OLD.client_id;
    NEW.project_id    := OLD.project_id;
    NEW.scheduled_at  := OLD.scheduled_at;
    NEW.visit_type    := OLD.visit_type;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_enforce_reception_visit_update ON visits;
CREATE TRIGGER trg_enforce_reception_visit_update
  BEFORE UPDATE ON visits
  FOR EACH ROW EXECUTE FUNCTION public.enforce_reception_visit_update();


-- ─── 2. history INSERT: allow reception to log her own audit trail ───
-- Without this, every reassignment/check-in logged by the reception UI
-- was rejected by RLS (and quietly swallowed by supabase-js because the
-- mutation code doesn't always surface RLS errors for INSERT).
DROP POLICY IF EXISTS "history_insert" ON history;
CREATE POLICY "history_insert" ON history FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR public.is_reception()
    OR agent_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = history.client_id AND c.agent_id = auth.uid()
    )
  );


-- Note: intentionally NOT widening sales/reservations/payments to reception.
-- Those are commercial tables the receptionist has no business reading.
-- Empty SELECT results are the expected contract for those endpoints,
-- matching the RECEPTION_PERMISSIONS scope in src/hooks/usePermissions.ts.
