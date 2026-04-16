-- ================================================
-- CRM NOUREDDINE — Single-tenant schema
-- File 4/5: Task bundles, task templates, client tasks,
--           agent goals, notifications, audit trail,
--           message templates, sent messages log
-- ================================================

-- 1. Task bundles (groups of task templates per pipeline stage)
CREATE TABLE IF NOT EXISTS task_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  stage TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Task templates (reusable task definitions)
CREATE TABLE IF NOT EXISTS task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID REFERENCES task_bundles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  stage TEXT NOT NULL,
  description TEXT,
  channel TEXT,
  priority TEXT,
  message_template TEXT,
  message_mode TEXT,
  auto_trigger TEXT,
  delay_minutes NUMERIC,
  maps_to_field TEXT,
  next_task_on_success TEXT,
  next_task_on_failure TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order NUMERIC,
  attached_file_types TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Client tasks (actual task instances assigned to clients)
CREATE TABLE IF NOT EXISTS client_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
  template_id UUID REFERENCES task_templates(id) ON DELETE SET NULL,
  bundle_id UUID REFERENCES task_bundles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  stage TEXT,
  priority TEXT,
  channel TEXT,
  channel_used TEXT,
  scheduled_at TIMESTAMPTZ,
  reminder_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_days NUMERIC,
  message_sent TEXT,
  client_response TEXT,
  response TEXT,
  auto_cancelled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Agent goals
CREATE TABLE IF NOT EXISTS agent_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  metric goal_metric NOT NULL,
  period goal_period NOT NULL DEFAULT 'monthly',
  target_value NUMERIC NOT NULL,
  current_value NUMERIC NOT NULL DEFAULT 0,
  status goal_status NOT NULL DEFAULT 'in_progress',
  started_at DATE NOT NULL,
  ended_at DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  message TEXT,
  metadata JSONB,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Audit trail
CREATE TABLE IF NOT EXISTS audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Message templates (WhatsApp, SMS, email templates per stage)
CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  body TEXT NOT NULL,
  stage TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  subject TEXT,
  channel TEXT,
  ai_prompt TEXT,
  mode TEXT,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order NUMERIC,
  attached_file_types TEXT[],
  variables_used TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- 8. Sent messages log
CREATE TABLE IF NOT EXISTS sent_messages_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
  task_id UUID REFERENCES client_tasks(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  channel TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─── Indexes ───
CREATE INDEX IF NOT EXISTS idx_client_tasks_client ON client_tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_client_tasks_agent ON client_tasks(agent_id);
CREATE INDEX IF NOT EXISTS idx_client_tasks_status ON client_tasks(status);
CREATE INDEX IF NOT EXISTS idx_client_tasks_scheduled ON client_tasks(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_agent_goals_agent ON agent_goals(agent_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_audit_trail_table ON audit_trail(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_trail_user ON audit_trail(user_id);
CREATE INDEX IF NOT EXISTS idx_sent_messages_client ON sent_messages_log(client_id);
CREATE INDEX IF NOT EXISTS idx_task_templates_bundle ON task_templates(bundle_id);


-- ─── RLS ───
ALTER TABLE task_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sent_messages_log ENABLE ROW LEVEL SECURITY;

-- Read/write for all authenticated (single-tenant)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'task_bundles', 'task_templates', 'client_tasks',
    'agent_goals', 'message_templates', 'sent_messages_log'
  ])
  LOOP
    EXECUTE format('CREATE POLICY "%s_select" ON %I FOR SELECT TO authenticated USING (true)', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_insert" ON %I FOR INSERT TO authenticated WITH CHECK (true)', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_update" ON %I FOR UPDATE TO authenticated USING (true)', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_delete" ON %I FOR DELETE TO authenticated USING (public.is_admin())', tbl, tbl);
  END LOOP;
END $$;

-- Notifications: user sees own notifications only
CREATE POLICY "notifications_select" ON notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "notifications_insert" ON notifications FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "notifications_update" ON notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "notifications_delete" ON notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Audit trail: admin can read, service can insert
CREATE POLICY "audit_trail_select" ON audit_trail FOR SELECT TO authenticated
  USING (public.is_admin());
CREATE POLICY "audit_trail_insert" ON audit_trail FOR INSERT TO authenticated
  WITH CHECK (true);
