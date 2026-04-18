-- ================================================
-- CRM NOUREDDINE — File 6/N
-- Agent isolation: each agent sees only their own data,
-- admins see everything. This tightens the open SELECT/UPDATE/DELETE
-- policies created in files 003 and 004.
-- ================================================

-- ─── Helper: is the current user the agent for the given row ───
CREATE OR REPLACE FUNCTION public.owns_agent_id(agent_id UUID)
RETURNS BOOLEAN AS $$
  SELECT public.is_admin() OR agent_id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;


-- ─── CLIENTS ───
DROP POLICY IF EXISTS "clients_select" ON clients;
DROP POLICY IF EXISTS "clients_insert" ON clients;
DROP POLICY IF EXISTS "clients_update" ON clients;
DROP POLICY IF EXISTS "clients_delete" ON clients;

CREATE POLICY "clients_select" ON clients FOR SELECT TO authenticated
  USING (public.is_admin() OR agent_id = auth.uid());
CREATE POLICY "clients_insert" ON clients FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR agent_id = auth.uid());
CREATE POLICY "clients_update" ON clients FOR UPDATE TO authenticated
  USING (public.is_admin() OR agent_id = auth.uid());
CREATE POLICY "clients_delete" ON clients FOR DELETE TO authenticated
  USING (public.is_admin());


-- ─── VISITS / RESERVATIONS / SALES (direct agent_id) ───
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['visits', 'reservations', 'sales'])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_delete" ON %I', tbl, tbl);

    EXECUTE format(
      'CREATE POLICY "%s_select" ON %I FOR SELECT TO authenticated USING (public.is_admin() OR agent_id = auth.uid())',
      tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY "%s_insert" ON %I FOR INSERT TO authenticated WITH CHECK (public.is_admin() OR agent_id = auth.uid())',
      tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY "%s_update" ON %I FOR UPDATE TO authenticated USING (public.is_admin() OR agent_id = auth.uid())',
      tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY "%s_delete" ON %I FOR DELETE TO authenticated USING (public.is_admin())',
      tbl, tbl
    );
  END LOOP;
END $$;


-- ─── HISTORY (agent_id direct + linked via client) ───
DROP POLICY IF EXISTS "history_select" ON history;
DROP POLICY IF EXISTS "history_insert" ON history;
DROP POLICY IF EXISTS "history_update" ON history;
DROP POLICY IF EXISTS "history_delete" ON history;

CREATE POLICY "history_select" ON history FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR agent_id = auth.uid()
    OR EXISTS (SELECT 1 FROM clients c WHERE c.id = history.client_id AND c.agent_id = auth.uid())
  );
CREATE POLICY "history_insert" ON history FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "history_update" ON history FOR UPDATE TO authenticated
  USING (public.is_admin());
CREATE POLICY "history_delete" ON history FOR DELETE TO authenticated
  USING (public.is_admin());


-- ─── CHARGES / DOCUMENTS (via client.agent_id) ───
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['charges', 'documents'])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_delete" ON %I', tbl, tbl);

    EXECUTE format(
      $f$CREATE POLICY "%s_select" ON %I FOR SELECT TO authenticated USING (
        public.is_admin() OR EXISTS (
          SELECT 1 FROM clients c WHERE c.id = %I.client_id AND c.agent_id = auth.uid()
        )
      )$f$,
      tbl, tbl, tbl
    );
    EXECUTE format('CREATE POLICY "%s_insert" ON %I FOR INSERT TO authenticated WITH CHECK (true)', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_update" ON %I FOR UPDATE TO authenticated USING (public.is_admin())', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_delete" ON %I FOR DELETE TO authenticated USING (public.is_admin())', tbl, tbl);
  END LOOP;
END $$;


-- ─── PAYMENT SCHEDULES / SALE_AMENITIES / SALE_CHARGES (via sale.agent_id) ───
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['payment_schedules', 'sale_amenities', 'sale_charges'])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_delete" ON %I', tbl, tbl);

    EXECUTE format(
      $f$CREATE POLICY "%s_select" ON %I FOR SELECT TO authenticated USING (
        public.is_admin() OR EXISTS (
          SELECT 1 FROM sales s WHERE s.id = %I.sale_id AND s.agent_id = auth.uid()
        )
      )$f$,
      tbl, tbl, tbl
    );
    EXECUTE format('CREATE POLICY "%s_insert" ON %I FOR INSERT TO authenticated WITH CHECK (true)', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_update" ON %I FOR UPDATE TO authenticated USING (public.is_admin())', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_delete" ON %I FOR DELETE TO authenticated USING (public.is_admin())', tbl, tbl);
  END LOOP;
END $$;


-- ─── CLIENT_TASKS (agent_id direct + via client) ───
DROP POLICY IF EXISTS "client_tasks_select" ON client_tasks;
DROP POLICY IF EXISTS "client_tasks_insert" ON client_tasks;
DROP POLICY IF EXISTS "client_tasks_update" ON client_tasks;
DROP POLICY IF EXISTS "client_tasks_delete" ON client_tasks;

CREATE POLICY "client_tasks_select" ON client_tasks FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR agent_id = auth.uid()
    OR EXISTS (SELECT 1 FROM clients c WHERE c.id = client_tasks.client_id AND c.agent_id = auth.uid())
  );
CREATE POLICY "client_tasks_insert" ON client_tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "client_tasks_update" ON client_tasks FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR agent_id = auth.uid()
    OR EXISTS (SELECT 1 FROM clients c WHERE c.id = client_tasks.client_id AND c.agent_id = auth.uid())
  );
CREATE POLICY "client_tasks_delete" ON client_tasks FOR DELETE TO authenticated
  USING (public.is_admin());


-- ─── AGENT_GOALS (own goals only) ───
DROP POLICY IF EXISTS "agent_goals_select" ON agent_goals;
DROP POLICY IF EXISTS "agent_goals_insert" ON agent_goals;
DROP POLICY IF EXISTS "agent_goals_update" ON agent_goals;
DROP POLICY IF EXISTS "agent_goals_delete" ON agent_goals;

CREATE POLICY "agent_goals_select" ON agent_goals FOR SELECT TO authenticated
  USING (public.is_admin() OR agent_id = auth.uid());
CREATE POLICY "agent_goals_insert" ON agent_goals FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());
CREATE POLICY "agent_goals_update" ON agent_goals FOR UPDATE TO authenticated
  USING (public.is_admin());
CREATE POLICY "agent_goals_delete" ON agent_goals FOR DELETE TO authenticated
  USING (public.is_admin());


-- ─── SENT_MESSAGES_LOG (agent_id direct) ───
DROP POLICY IF EXISTS "sent_messages_log_select" ON sent_messages_log;
DROP POLICY IF EXISTS "sent_messages_log_insert" ON sent_messages_log;

CREATE POLICY "sent_messages_log_select" ON sent_messages_log FOR SELECT TO authenticated
  USING (public.is_admin() OR agent_id = auth.uid());
CREATE POLICY "sent_messages_log_insert" ON sent_messages_log FOR INSERT TO authenticated
  WITH CHECK (true);


-- ─── CALL_RESPONSES (agent_id direct) ───
DROP POLICY IF EXISTS "call_responses_select" ON call_responses;
CREATE POLICY "call_responses_select" ON call_responses FOR SELECT TO authenticated
  USING (public.is_admin() OR agent_id = auth.uid());


-- ─── PROJECTS / UNITS / DOCUMENT_TEMPLATES / CALL_SCRIPTS / ───
-- ─── SALE_PLAYBOOKS / TASK_TEMPLATES / TASK_BUNDLES / MESSAGE_TEMPLATES ───
-- These are "shared catalog" data — every agent should be able to see them,
-- only admins manage them. Read policies stay open; write/update/delete
-- are admin-only.

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'projects', 'units', 'project_files',
    'document_templates', 'sale_playbooks',
    'task_templates', 'task_bundles', 'message_templates'
  ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_delete" ON %I', tbl, tbl);

    EXECUTE format('CREATE POLICY "%s_insert" ON %I FOR INSERT TO authenticated WITH CHECK (public.is_admin())', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_update" ON %I FOR UPDATE TO authenticated USING (public.is_admin())', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_delete" ON %I FOR DELETE TO authenticated USING (public.is_admin())', tbl, tbl);
  END LOOP;
END $$;
