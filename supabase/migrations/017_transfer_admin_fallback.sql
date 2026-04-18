-- ================================================
-- CRM NOUREDDINE — File 17/N
-- Widen the agent transfer RPC to accept an admin as the temporary
-- client holder. In some offices the only other active user is the
-- admin (while a replacement agent is being recruited). The original
-- migration (016) rejected any target with role != 'agent', leaving
-- the UI dropdown empty and blocking the deactivation flow.
--
-- Only changes the target validation step inside
-- transfer_agent_clients_and_deactivate. Everything else (history
-- append, visits/tasks move, final status flip) is unchanged.
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
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Seul un admin peut transférer les clients d''un agent';
  END IF;

  SELECT first_name || ' ' || last_name INTO v_former_name
  FROM users
  WHERE id = p_agent_id;

  IF v_former_name IS NULL THEN
    RAISE EXCEPTION 'Utilisateur source introuvable';
  END IF;

  IF p_transfers IS NULL OR jsonb_typeof(p_transfers) <> 'array' THEN
    RAISE EXCEPTION 'Le paramètre p_transfers doit être un tableau JSON';
  END IF;

  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_transfers) LOOP
    v_client_id := (v_entry->>'client_id')::UUID;
    v_new_agent_id := (v_entry->>'new_agent_id')::UUID;

    IF v_client_id IS NULL OR v_new_agent_id IS NULL THEN
      RAISE EXCEPTION 'client_id et new_agent_id sont obligatoires dans chaque transfert';
    END IF;

    IF v_new_agent_id = p_agent_id THEN
      RAISE EXCEPTION 'Impossible de transférer le client % au même agent', v_client_id;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM clients
      WHERE id = v_client_id AND agent_id = p_agent_id
    ) THEN
      RAISE EXCEPTION 'Le client % n''appartient pas à %', v_client_id, v_former_name;
    END IF;

    -- Target may be an active agent OR an admin (temporary holder
    -- while a replacement is being recruited). Reception is excluded:
    -- commercial ownership of a client is not part of her scope.
    IF NOT EXISTS (
      SELECT 1 FROM users
      WHERE id = v_new_agent_id
        AND role IN ('agent', 'admin')
        AND status = 'active'
    ) THEN
      RAISE EXCEPTION 'La cible % n''est pas un agent ou admin actif', v_new_agent_id;
    END IF;

    UPDATE clients SET agent_id = v_new_agent_id WHERE id = v_client_id;

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

  SELECT COUNT(*) INTO v_remaining FROM clients WHERE agent_id = p_agent_id;
  IF v_remaining > 0 THEN
    RAISE EXCEPTION 'Il reste % client(s) non transféré(s)', v_remaining;
  END IF;

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
