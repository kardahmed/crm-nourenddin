-- ================================================
-- CRM NOUREDDINE — File 8/N
-- Harden agent isolation: restrict INSERT/UPDATE policies so an agent
-- cannot write data that belongs to another agent (cross-agent
-- data poisoning). Also scope client-documents storage by client_id
-- in the object path.
-- ================================================

-- ─── HISTORY ───
-- Only admins OR rows where agent_id = self OR the client is mine
DROP POLICY IF EXISTS "history_insert" ON history;
CREATE POLICY "history_insert" ON history FOR INSERT TO authenticated WITH CHECK (
  public.is_admin()
  OR agent_id = auth.uid()
  OR EXISTS (SELECT 1 FROM clients c WHERE c.id = history.client_id AND c.agent_id = auth.uid())
);


-- ─── CHARGES / DOCUMENTS (scoped by parent client) ───
DO $$
DECLARE tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['charges', 'documents'])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON %I', tbl, tbl);
    EXECUTE format(
      $f$CREATE POLICY "%s_insert" ON %I FOR INSERT TO authenticated WITH CHECK (
        public.is_admin() OR EXISTS (
          SELECT 1 FROM clients c WHERE c.id = %I.client_id AND c.agent_id = auth.uid()
        )
      )$f$,
      tbl, tbl, tbl
    );
  END LOOP;
END $$;


-- ─── PAYMENT_SCHEDULES / SALE_AMENITIES / SALE_CHARGES (scoped by parent sale) ───
DO $$
DECLARE tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['payment_schedules', 'sale_amenities', 'sale_charges'])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON %I', tbl, tbl);
    EXECUTE format(
      $f$CREATE POLICY "%s_insert" ON %I FOR INSERT TO authenticated WITH CHECK (
        public.is_admin() OR EXISTS (
          SELECT 1 FROM sales s WHERE s.id = %I.sale_id AND s.agent_id = auth.uid()
        )
      )$f$,
      tbl, tbl, tbl
    );
  END LOOP;
END $$;


-- ─── CLIENT_TASKS ───
DROP POLICY IF EXISTS "client_tasks_insert" ON client_tasks;
CREATE POLICY "client_tasks_insert" ON client_tasks FOR INSERT TO authenticated WITH CHECK (
  public.is_admin()
  OR agent_id = auth.uid()
  OR EXISTS (SELECT 1 FROM clients c WHERE c.id = client_tasks.client_id AND c.agent_id = auth.uid())
);


-- ─── CALL_RESPONSES ───
DROP POLICY IF EXISTS "call_responses_insert" ON call_responses;
DROP POLICY IF EXISTS "call_responses_update" ON call_responses;
CREATE POLICY "call_responses_insert" ON call_responses FOR INSERT TO authenticated WITH CHECK (
  public.is_admin()
  OR agent_id = auth.uid()
  OR EXISTS (SELECT 1 FROM clients c WHERE c.id = call_responses.client_id AND c.agent_id = auth.uid())
);
CREATE POLICY "call_responses_update" ON call_responses FOR UPDATE TO authenticated USING (
  public.is_admin()
  OR agent_id = auth.uid()
  OR EXISTS (SELECT 1 FROM clients c WHERE c.id = call_responses.client_id AND c.agent_id = auth.uid())
);


-- ─── SENT_MESSAGES_LOG ───
DROP POLICY IF EXISTS "sent_messages_log_insert" ON sent_messages_log;
CREATE POLICY "sent_messages_log_insert" ON sent_messages_log FOR INSERT TO authenticated WITH CHECK (
  public.is_admin()
  OR agent_id = auth.uid()
  OR EXISTS (SELECT 1 FROM clients c WHERE c.id = sent_messages_log.client_id AND c.agent_id = auth.uid())
);


-- ─── STORAGE: client-documents scoped by path prefix ───
-- Frontend uploads documents under `<clientId>/<filename>` (see
-- src/lib/pdf/generateDocuments.ts and pipeline modals). We parse the
-- first path segment and match against clients.id + agent_id.
DROP POLICY IF EXISTS "client_docs_authenticated_read" ON storage.objects;
DROP POLICY IF EXISTS "client_docs_authenticated_insert" ON storage.objects;
DROP POLICY IF EXISTS "client_docs_admin_delete" ON storage.objects;

-- Helper: extract client_id uuid from the first path segment
CREATE OR REPLACE FUNCTION public.try_parse_uuid(txt TEXT)
RETURNS UUID AS $$
  SELECT CASE WHEN txt ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
              THEN txt::uuid ELSE NULL END
$$ LANGUAGE sql IMMUTABLE;

CREATE POLICY "client_docs_scoped_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'client-documents'
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM clients c
        WHERE c.agent_id = auth.uid()
          AND c.id = public.try_parse_uuid(split_part(name, '/', 1))
      )
    )
  );

CREATE POLICY "client_docs_scoped_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'client-documents'
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM clients c
        WHERE c.agent_id = auth.uid()
          AND c.id = public.try_parse_uuid(split_part(name, '/', 1))
      )
    )
  );

CREATE POLICY "client_docs_admin_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'client-documents' AND public.is_admin());
