-- ================================================
-- CRM NOUREDDINE — File 9/N
-- Tighten units direct writes: only admins may UPDATE the units table
-- directly. Status / client_id transitions on sale or reservation still
-- flow through SECURITY DEFINER triggers.
--
-- Also harden the sale/reservation triggers so they cannot attach a unit
-- from a different project than the one declared on the sale/reservation.
-- ================================================

-- ─── Units UPDATE: admin only ───
DROP POLICY IF EXISTS "units_admin_update" ON units;
CREATE POLICY "units_admin_update" ON units FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ─── Trigger: update_unit_on_sale must match project ───
CREATE OR REPLACE FUNCTION update_unit_on_sale() RETURNS TRIGGER AS $$
DECLARE
  unit_project UUID;
BEGIN
  IF NEW.status = 'active' THEN
    SELECT project_id INTO unit_project FROM units WHERE id = NEW.unit_id;
    IF unit_project IS NULL THEN
      RAISE EXCEPTION 'Unit % not found', NEW.unit_id;
    END IF;
    IF NEW.project_id IS NOT NULL AND unit_project <> NEW.project_id THEN
      RAISE EXCEPTION 'Unit % does not belong to project %', NEW.unit_id, NEW.project_id;
    END IF;
    UPDATE units SET status = 'sold', client_id = NEW.client_id WHERE id = NEW.unit_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ─── Trigger: update_unit_on_reservation must match project ───
CREATE OR REPLACE FUNCTION update_unit_on_reservation() RETURNS TRIGGER AS $$
DECLARE
  unit_project UUID;
BEGIN
  IF NEW.status = 'active' THEN
    SELECT project_id INTO unit_project FROM units WHERE id = NEW.unit_id;
    IF unit_project IS NULL THEN
      RAISE EXCEPTION 'Unit % not found', NEW.unit_id;
    END IF;
    IF NEW.project_id IS NOT NULL AND unit_project <> NEW.project_id THEN
      RAISE EXCEPTION 'Unit % does not belong to project %', NEW.unit_id, NEW.project_id;
    END IF;
    UPDATE units SET status = 'reserved', client_id = NEW.client_id WHERE id = NEW.unit_id;
  ELSIF NEW.status IN ('expired', 'cancelled') AND (OLD.status = 'active') THEN
    UPDATE units SET status = 'available', client_id = NULL WHERE id = NEW.unit_id AND status = 'reserved';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
