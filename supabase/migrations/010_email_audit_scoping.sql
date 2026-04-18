-- ================================================
-- CRM NOUREDDINE — File 10/N
-- Lock down INSERT/UPDATE on email marketing tables and audit_trail.
-- Service-role calls from edge functions bypass RLS, so these policies
-- only block direct writes coming through the authenticated API.
-- ================================================

-- ─── audit_trail: admin-only inserts or the acting user ───
DROP POLICY IF EXISTS "audit_trail_insert" ON audit_trail;
CREATE POLICY "audit_trail_insert" ON audit_trail FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR user_id = auth.uid());


-- ─── email_templates: admin-only writes ───
DROP POLICY IF EXISTS "email_templates_insert" ON email_templates;
DROP POLICY IF EXISTS "email_templates_update" ON email_templates;
CREATE POLICY "email_templates_insert" ON email_templates FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());
CREATE POLICY "email_templates_update" ON email_templates FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ─── email_campaigns: admin-only writes ───
DROP POLICY IF EXISTS "email_campaigns_insert" ON email_campaigns;
DROP POLICY IF EXISTS "email_campaigns_update" ON email_campaigns;
CREATE POLICY "email_campaigns_insert" ON email_campaigns FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());
CREATE POLICY "email_campaigns_update" ON email_campaigns FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ─── email_campaign_recipients / email_events / email_logs: admin-only writes ───
-- These are populated by edge functions running with the service-role key,
-- which bypasses RLS; the authenticated client has no reason to write them.
DO $$
DECLARE tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['email_campaign_recipients', 'email_events', 'email_logs'])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON %I', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_insert" ON %I FOR INSERT TO authenticated WITH CHECK (public.is_admin())', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_update" ON %I FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())', tbl, tbl);
  END LOOP;
END $$;


-- ─── email-assets storage bucket: upload = admin only, read stays public ───
DROP POLICY IF EXISTS "upload_email_assets" ON storage.objects;
CREATE POLICY "upload_email_assets" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'email-assets' AND public.is_admin()
  );

DROP POLICY IF EXISTS "delete_email_assets" ON storage.objects;
CREATE POLICY "delete_email_assets" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'email-assets' AND public.is_admin()
  );
