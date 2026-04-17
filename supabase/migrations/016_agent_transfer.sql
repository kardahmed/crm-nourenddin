-- ================================================
-- CRM NOUREDDINE — File 16/N
-- Agent transfer workflow. Before today, `status := 'inactive'` left
-- every client, open task and upcoming visit silently attached to an
-- agent who can no longer log in. Those records became invisible:
-- not in the unassigned queue (agent_id is not null), not in any
-- active agent's pipeline. This migration provides an atomic transfer
-- RPC the admin calls *before* deactivating an agent.
--
-- Contract:
--   1. Client mapping (old → new agent) is provided by the caller,
--      one row per client. Partial transfers are rejected.
--   2. History rows are NEVER modified — they keep the original
--      agent_id so the timeline of past interactions stays faithful.
--      A new `reassignment` row is appended per client to make the
--      transfer visible on the client detail page.
--   3. Visits and client_tasks: only *future / open* ones are moved.
--      Past/completed records keep the old agent_id (they are facts).
--   4. Sales and reservations are never touched (commissions already
--      attributed, historical truth).
--   5. The agent's status is flipped to 'inactive' as the final step,
--      atomically with the transfers. If any check fails the whole
--      transaction rolls back — the admin never ends up with a
--      half-transferred agent.
-- ================================================

CREATE OR REPLACE FUNCTION public.transfer_agent_clients_and_deactivate(
  p_agent_id UUID,
  p_transfers JSONB,
  p_departure_reason TEXT
) RETURNS JSONB AS $$
DECLARE
  v_entry JSONB;
  v_client_id UUID;
  v_new_agent_id UUID;
  v_count INT := 0;
  v_visits_moved INT := 0;
  v_tasks_moved INT := 0;
  v_remaining INT;
  v_former_name TEXT;
BEGIN
  -- 1. Authorization
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Seul un admin peut transférer les clients d''un agent';
  END IF;

  -- 2. Sanity: the source must be an existing user (agent or admin)
  SELECT first_name || ' ' || last_name INTO v_former_name
  FROM users
  WHERE id = p_agent_id;

  IF v_former_name IS NULL THEN
    RAISE EXCEPTION 'Utilisateur source introuvable';
  END IF;

  -- 3. Validate inputs shape
  IF p_transfers IS NULL OR jsonb_typeof(p_transfers) <> 'array' THEN
    RAISE EXCEPTION 'Le paramètre p_transfers doit être un tableau JSON';
  END IF;

  -- 4. Loop the transfers atomically. A single RAISE aborts everything.
  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_transfers) LOOP
    v_client_id := (v_entry->>'client_id')::UUID;
    v_new_agent_id := (v_entry->>'new_agent_id')::UUID;

    IF v_client_id IS NULL OR v_new_agent_id IS NULL THEN
      RAISE EXCEPTION 'client_id et new_agent_id sont obligatoires dans chaque transfert';
    END IF;

    IF v_new_agent_id = p_agent_id THEN
      RAISE EXCEPTION 'Impossible de transférer le client % au même agent', v_client_id;
    END IF;

    -- The client must currently belong to the source agent
    IF NOT EXISTS (
      SELECT 1 FROM clients
      WHERE id = v_client_id AND agent_id = p_agent_id
    ) THEN
      RAISE EXCEPTION 'Le client % n''appartient pas à %', v_client_id, v_former_name;
    END IF;

    -- The target must be an active agent (not reception, not admin,
    -- not the same agent, not inactive)
    IF NOT EXISTS (
      SELECT 1 FROM users
      WHERE id = v_new_agent_id
        AND role = 'agent'
        AND status = 'active'
    ) THEN
      RAISE EXCEPTION 'L''agent cible % n''est pas actif', v_new_agent_id;
    END IF;

    -- 4a. Move the client
    UPDATE clients SET agent_id = v_new_agent_id WHERE id = v_client_id;

    -- 4b. Append a reassignment event (history rows themselves are NEVER
    --     rewritten — the old agent_id stays on every past interaction).
    INSERT INTO history (client_id, agent_id, type, title, description, metadata)
    VALUES (
      v_client_id,
      v_new_agent_id,
      'reassignment',
      format('Transfert suite au départ de %s', v_former_name),
      format(
        'Client transféré automatiquement suite au départ de %s (motif: %s).',
        v_former_name,
        COALESCE(NULLIF(TRIM(p_departure_reason), ''), 'non précisé')
      ),
      jsonb_build_object(
        'reason', 'agent_departure',
        'former_agent_id', p_agent_id,
        'former_agent_name', v_former_name,
        'new_agent_id', v_new_agent_id,
        'departure_reason', p_departure_reason,
        'transferred_by', auth.uid()
      )
    );

    -- 4c. Move FUTURE / still-actionable visits only
    WITH moved AS (
      UPDATE visits
      SET agent_id = v_new_agent_id
      WHERE client_id = v_client_id
        AND agent_id = p_agent_id
        AND scheduled_at >= NOW()
        AND status IN ('planned', 'confirmed')
      RETURNING 1
    )
    SELECT v_visits_moved + COUNT(*) INTO v_visits_moved FROM moved;

    -- 4d. Move OPEN tasks only (leave completed/cancelled intact so
    --     individual performance metrics stay clean)
    WITH moved AS (
      UPDATE client_tasks
      SET agent_id = v_new_agent_id
      WHERE client_id = v_client_id
        AND agent_id = p_agent_id
        AND status NOT IN ('completed', 'cancelled')
      RETURNING 1
    )
    SELECT v_tasks_moved + COUNT(*) INTO v_tasks_moved FROM moved;

    v_count := v_count + 1;
  END LOOP;

  -- 5. Safety net: refuse to deactivate if any client is still orphaned
  --    under this agent. Forces the admin to provide a complete mapping.
  SELECT COUNT(*) INTO v_remaining FROM clients WHERE agent_id = p_agent_id;
  IF v_remaining > 0 THEN
    RAISE EXCEPTION 'Il reste % client(s) non transféré(s)', v_remaining;
  END IF;

  -- 6. Deactivate the agent
  UPDATE users SET status = 'inactive' WHERE id = p_agent_id;

  RETURN jsonb_build_object(
    'agent_id', p_agent_id,
    'former_agent_name', v_former_name,
    'clients_transferred', v_count,
    'visits_transferred', v_visits_moved,
    'tasks_transferred', v_tasks_moved,
    'departure_reason', p_departure_reason
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.transfer_agent_clients_and_deactivate TO authenticated;
