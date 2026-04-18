-- Migration 016: Create 13 missing tables referenced in code
-- Idempotent: all CREATE TABLE IF NOT EXISTS, policies guarded by DO blocks.

-- ─── Tables ───

CREATE TABLE IF NOT EXISTS client_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
  template_id UUID,
  bundle_id UUID,
  title TEXT NOT NULL,
  stage TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT,
  channel TEXT,
  scheduled_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  message_sent TEXT,
  client_response TEXT,
  auto_cancelled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  source TEXT,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  planned_budget NUMERIC DEFAULT 0,
  target_leads INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marketing_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  amount NUMERIC NOT NULL,
  expense_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  trigger_type TEXT,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  body TEXT,
  mode TEXT DEFAULT 'template',
  variables_used TEXT[],
  attached_file_types TEXT[],
  sort_order INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sale_charges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  paid BOOLEAN DEFAULT FALSE,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sale_playbooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Playbook principal',
  methodology TEXT,
  objective TEXT,
  tone TEXT,
  closing_phrases JSONB DEFAULT '[]'::jsonb,
  objection_rules JSONB DEFAULT '[]'::jsonb,
  custom_instructions TEXT,
  is_active BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_bundles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  bundle_id UUID REFERENCES task_bundles(id) ON DELETE SET NULL,
  stage TEXT NOT NULL,
  title TEXT NOT NULL,
  auto_trigger TEXT,
  delay_minutes INTEGER DEFAULT 0,
  channel TEXT,
  message_mode TEXT,
  priority TEXT DEFAULT 'medium',
  attached_file_types TEXT[],
  is_active BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sent_messages_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
  task_id UUID REFERENCES client_tasks(id) ON DELETE SET NULL,
  channel TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  plan TEXT DEFAULT 'starter',
  monthly_quota INTEGER DEFAULT 1000,
  messages_sent INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  direction TEXT,
  message TEXT NOT NULL,
  status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Global table (no tenant_id): catalog of plans available to all tenants
CREATE TABLE IF NOT EXISTS whatsapp_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  monthly_quota INTEGER NOT NULL,
  price_da NUMERIC NOT NULL,
  features JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ───

CREATE INDEX IF NOT EXISTS idx_client_tasks_tenant ON client_tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_client_tasks_client ON client_tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_client_tasks_agent ON client_tasks(agent_id);
CREATE INDEX IF NOT EXISTS idx_client_tasks_status ON client_tasks(status);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_tenant ON marketing_campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_marketing_expenses_tenant ON marketing_expenses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_marketing_expenses_campaign ON marketing_expenses(campaign_id);
CREATE INDEX IF NOT EXISTS idx_message_templates_tenant ON message_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_sale_charges_tenant ON sale_charges(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sale_charges_sale ON sale_charges(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_playbooks_tenant ON sale_playbooks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_task_bundles_tenant ON task_bundles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_task_templates_tenant ON task_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_task_templates_bundle ON task_templates(bundle_id);
CREATE INDEX IF NOT EXISTS idx_sent_messages_log_tenant ON sent_messages_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sent_messages_log_client ON sent_messages_log(client_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_tenant ON whatsapp_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_client ON whatsapp_messages(client_id);

-- ─── RLS ───

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'client_tasks','marketing_campaigns','marketing_expenses','message_templates',
    'notifications','sale_charges','sale_playbooks','task_bundles','task_templates',
    'sent_messages_log','whatsapp_accounts','whatsapp_messages'
  ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);

    -- Drop if exists then recreate (idempotent)
    EXECUTE format('DROP POLICY IF EXISTS "%s_tenant_select" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_tenant_insert" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_tenant_update" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_tenant_delete" ON %I', tbl, tbl);

    EXECUTE format(
      'CREATE POLICY "%s_tenant_select" ON %I FOR SELECT USING (tenant_id = public.get_my_tenant_id())',
      tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY "%s_tenant_insert" ON %I FOR INSERT WITH CHECK (tenant_id = public.get_my_tenant_id())',
      tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY "%s_tenant_update" ON %I FOR UPDATE USING (tenant_id = public.get_my_tenant_id())',
      tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY "%s_tenant_delete" ON %I FOR DELETE USING (tenant_id = public.get_my_tenant_id())',
      tbl, tbl
    );
  END LOOP;
END $$;

-- whatsapp_plans: read-only catalog for all authenticated users
ALTER TABLE whatsapp_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "whatsapp_plans_select" ON whatsapp_plans;
CREATE POLICY "whatsapp_plans_select" ON whatsapp_plans FOR SELECT TO authenticated USING (true);

-- ─── Seed default WhatsApp plans ───

INSERT INTO whatsapp_plans (name, label, monthly_quota, price_da, sort_order)
VALUES
  ('starter', 'Starter', 1000, 3000, 1),
  ('pro', 'Pro', 5000, 10000, 2),
  ('business', 'Business', 20000, 30000, 3)
ON CONFLICT (name) DO NOTHING;
