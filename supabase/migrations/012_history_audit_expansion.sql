-- ================================================
-- CRM NOUREDDINE — File 12/N
-- Expand the activity-history + audit-trail coverage.
--
--  * Add new history_type values: client_created, reassignment,
--    priority_change, budget_change. These surface in the client
--    timeline so both the losing and receiving agents (and admin)
--    can see what happened.
--
--  * Trigger log_client_created: writes a history row on INSERT.
--
--  * Trigger log_client_changes: on UPDATE, emits history rows for
--    agent_id / is_priority / confirmed_budget changes. The existing
--    log_stage_change handles pipeline_stage separately.
--
--  * Generic audit_trail triggers on clients / reservations / sales /
--    units, filtered to watched columns to avoid row inflation from
--    last_contact_at bumps and the like.
--
-- All functions are SECURITY DEFINER + search_path locked so they
-- can write to history / audit_trail even when the caller is
-- sand-boxed by RLS on those tables.
-- ================================================


-- ─── 1. Extend history_type enum ───
DO $$ BEGIN
  ALTER TYPE history_type ADD VALUE IF NOT EXISTS 'client_created';
  ALTER TYPE history_type ADD VALUE IF NOT EXISTS 'reassignment';
  ALTER TYPE history_type ADD VALUE IF NOT EXISTS 'priority_change';
  ALTER TYPE history_type ADD VALUE IF NOT EXISTS 'budget_change';
EXCEPTION WHEN others THEN NULL; END $$;


-- ─── 2. Log client creation ───
CREATE OR REPLACE FUNCTION public.log_client_created() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO history (client_id, agent_id, type, title, metadata)
  VALUES (
    NEW.id,
    COALESCE(NEW.agent_id, auth.uid()),
    'client_created',
    'Client ajoute: ' || NEW.full_name,
    jsonb_build_object(
      'created_by', auth.uid(),
      'assigned_to', NEW.agent_id,
      'source', NEW.source,
      'pipeline_stage', NEW.pipeline_stage
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_client_created ON clients;
CREATE TRIGGER trg_client_created AFTER INSERT ON clients
  FOR EACH ROW EXECUTE FUNCTION public.log_client_created();


-- ─── 3. Log reassignment / priority / budget changes ───
CREATE OR REPLACE FUNCTION public.log_client_changes() RETURNS TRIGGER AS $$
DECLARE
  actor UUID := auth.uid();
BEGIN
  -- Reassignment (agent change)
  IF NEW.agent_id IS DISTINCT FROM OLD.agent_id THEN
    INSERT INTO history (client_id, agent_id, type, title, metadata)
    VALUES (
      NEW.id,
      actor,
      'reassignment',
      'Reassignation',
      jsonb_build_object(
        'from_agent_id', OLD.agent_id,
        'to_agent_id',   NEW.agent_id,
        'reassigned_by', actor
      )
    );
  END IF;

  -- Priority flag toggle
  IF NEW.is_priority IS DISTINCT FROM OLD.is_priority THEN
    INSERT INTO history (client_id, agent_id, type, title, metadata)
    VALUES (
      NEW.id,
      COALESCE(actor, NEW.agent_id),
      'priority_change',
      CASE WHEN NEW.is_priority THEN 'Marque prioritaire' ELSE 'Priorite retiree' END,
      jsonb_build_object('from', OLD.is_priority, 'to', NEW.is_priority, 'changed_by', actor)
    );
  END IF;

  -- Confirmed budget change
  IF NEW.confirmed_budget IS DISTINCT FROM OLD.confirmed_budget THEN
    INSERT INTO history (client_id, agent_id, type, title, metadata)
    VALUES (
      NEW.id,
      COALESCE(actor, NEW.agent_id),
      'budget_change',
      'Budget confirme mis a jour',
      jsonb_build_object(
        'from', OLD.confirmed_budget,
        'to',   NEW.confirmed_budget,
        'changed_by', actor
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_client_changes ON clients;
CREATE TRIGGER trg_client_changes AFTER UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION public.log_client_changes();


-- ─── 4. Generic audit_trail writer ───
-- Writes an entry in audit_trail for watched mutations. We only
-- include the watched column deltas in new_data / old_data to keep
-- the table compact.
CREATE OR REPLACE FUNCTION public.audit_row_change() RETURNS TRIGGER AS $$
DECLARE
  watched TEXT[] := TG_ARGV::TEXT[];
  col TEXT;
  old_rec JSONB := '{}'::JSONB;
  new_rec JSONB := '{}'::JSONB;
  old_row JSONB;
  new_row JSONB;
  changed BOOLEAN := FALSE;
BEGIN
  IF TG_OP = 'DELETE' THEN
    old_row := to_jsonb(OLD);
    INSERT INTO audit_trail (user_id, action, table_name, record_id, old_data, new_data)
    VALUES (auth.uid(), 'delete', TG_TABLE_NAME, OLD.id::TEXT, old_row, NULL);
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    new_row := to_jsonb(NEW);
    INSERT INTO audit_trail (user_id, action, table_name, record_id, old_data, new_data)
    VALUES (auth.uid(), 'insert', TG_TABLE_NAME, NEW.id::TEXT, NULL, new_row);
    RETURN NEW;
  END IF;

  -- UPDATE: only log when a watched column actually changed
  old_row := to_jsonb(OLD);
  new_row := to_jsonb(NEW);

  IF array_length(watched, 1) IS NULL THEN
    -- No watched list → log every update (fallback; prefer a list).
    changed := old_row <> new_row;
    old_rec := old_row;
    new_rec := new_row;
  ELSE
    FOREACH col IN ARRAY watched LOOP
      IF old_row->col IS DISTINCT FROM new_row->col THEN
        changed := TRUE;
        old_rec := old_rec || jsonb_build_object(col, old_row->col);
        new_rec := new_rec || jsonb_build_object(col, new_row->col);
      END IF;
    END LOOP;
  END IF;

  IF changed THEN
    INSERT INTO audit_trail (user_id, action, table_name, record_id, old_data, new_data)
    VALUES (auth.uid(), 'update', TG_TABLE_NAME, NEW.id::TEXT, old_rec, new_rec);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ─── 5. Attach audit triggers ───
-- clients: watch ownership, pipeline, budget, priority, contact info.
DROP TRIGGER IF EXISTS trg_audit_clients ON clients;
CREATE TRIGGER trg_audit_clients
  AFTER INSERT OR UPDATE OR DELETE ON clients
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change(
    'agent_id', 'pipeline_stage', 'confirmed_budget', 'is_priority',
    'phone', 'email', 'interest_level', 'payment_method'
  );

-- reservations: status + financial amount matter.
DROP TRIGGER IF EXISTS trg_audit_reservations ON reservations;
CREATE TRIGGER trg_audit_reservations
  AFTER INSERT OR UPDATE OR DELETE ON reservations
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change(
    'status', 'unit_id', 'deposit_amount', 'expires_at', 'agent_id'
  );

-- sales: price / discount / status changes are the sensitive ones.
DROP TRIGGER IF EXISTS trg_audit_sales ON sales;
CREATE TRIGGER trg_audit_sales
  AFTER INSERT OR UPDATE OR DELETE ON sales
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change(
    'status', 'unit_id', 'client_id', 'agent_id',
    'total_price', 'discount_type', 'discount_value', 'final_price', 'financing_mode'
  );

-- units: price and status catches admin writes to the catalog.
DROP TRIGGER IF EXISTS trg_audit_units ON units;
CREATE TRIGGER trg_audit_units
  AFTER INSERT OR UPDATE OR DELETE ON units
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change(
    'status', 'price', 'client_id', 'project_id'
  );
