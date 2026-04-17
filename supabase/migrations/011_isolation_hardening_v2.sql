-- ================================================
-- CRM NOUREDDINE — File 11/N
-- Second pass on agent isolation:
--   1. Tighten audit_trail INSERT to admin-only. Nothing in the app
--      writes to this table from the authenticated client — triggers
--      and edge functions use the service role and bypass RLS. The
--      previous policy allowed any agent to inject arbitrary entries
--      with their own user_id.
-- ================================================

DROP POLICY IF EXISTS "audit_trail_insert" ON audit_trail;
CREATE POLICY "audit_trail_insert" ON audit_trail FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());
