-- ================================================
-- CRM NOUREDDINE — File 19/N
-- Archive an agent permanently. Preconditions (enforced by the RPC):
--   * Caller must be admin.
--   * Agent must already be `inactive` (clients transferred via the
--     transfer_agent_clients_and_deactivate RPC first).
--   * Agent must own zero clients, zero open tasks, zero future
--     visits. Safety net in case something slipped through.
--
-- What archival does:
--   * Flips `users.status` to `archived`.
--   * Stamps `users.archived_at` with the current timestamp so we
--     can expose it in the UI ("archivé il y a 3 mois").
--   * Leaves every historical reference intact: history rows, past
--     sales, past reservations, closed tasks, completed visits all
--     keep the archived user's id as agent_id. That's the whole
--     point of soft-delete — the audit trail must not rot.
--
-- What archival does NOT do:
--   * Does not touch auth.users. Blocking login is handled at the
--     application level (users.status != 'active' is already the
--     gate for is_admin/is_reception/etc). If we ever want to burn
--     the credentials, that becomes an edge-function task because
--     migrations cannot touch the auth schema safely.
-- ================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.archive_agent(p_agent_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_agent RECORD;
  v_clients INT;
  v_tasks INT;
  v_visits INT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Seul un admin peut archiver un utilisateur';
  END IF;

  SELECT id, first_name, last_name, role, status
    INTO v_agent
  FROM users
  WHERE id = p_agent_id;

  IF v_agent.id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur introuvable';
  END IF;

  IF v_agent.status = 'archived' THEN
    RAISE EXCEPTION 'Cet utilisateur est déjà archivé';
  END IF;

  IF v_agent.status <> 'inactive' THEN
    RAISE EXCEPTION 'L''utilisateur doit être désactivé avant d''être archivé';
  END IF;

  -- Safety: refuse if anything still dangles on this user
  SELECT COUNT(*) INTO v_clients FROM clients WHERE agent_id = p_agent_id;
  IF v_clients > 0 THEN
    RAISE EXCEPTION '% client(s) encore assignés — transférez-les d''abord', v_clients;
  END IF;

  SELECT COUNT(*) INTO v_tasks FROM client_tasks
  WHERE agent_id = p_agent_id AND status NOT IN ('completed', 'cancelled');
  IF v_tasks > 0 THEN
    RAISE EXCEPTION '% tâche(s) ouverte(s) encore assignées', v_tasks;
  END IF;

  SELECT COUNT(*) INTO v_visits FROM visits
  WHERE agent_id = p_agent_id
    AND scheduled_at >= NOW()
    AND status IN ('planned', 'confirmed');
  IF v_visits > 0 THEN
    RAISE EXCEPTION '% visite(s) à venir encore assignées', v_visits;
  END IF;

  UPDATE users
    SET status = 'archived',
        archived_at = NOW()
  WHERE id = p_agent_id;

  RETURN jsonb_build_object(
    'user_id', p_agent_id,
    'archived_at', NOW(),
    'former_name', v_agent.first_name || ' ' || v_agent.last_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.archive_agent TO authenticated;

-- Unarchiving is NOT provided on purpose: archival is meant to be
-- the end of the road. If a user must come back, the admin creates
-- a fresh account (different email or re-enable in auth manually).


-- ─── Tighten role helpers to require status = 'active' ───
-- Without this, an archived admin whose JWT is still valid would
-- keep admin powers until token expiry. Now archived users bounce
-- off every RLS gate instantly.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin' AND status = 'active'
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_reception()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'reception' AND status = 'active'
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
