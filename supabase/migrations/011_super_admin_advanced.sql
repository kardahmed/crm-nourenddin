-- ================================================
-- Super Admin Advanced: AI config, billing, messaging, support, etc.
-- ================================================

-- AI config on platform_settings
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS anthropic_api_key TEXT;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS openai_api_key TEXT;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS default_ai_provider TEXT DEFAULT 'anthropic';

-- Tenant extensions
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS custom_domain TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free';

-- White-label + usage on tenant_settings
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS custom_logo_url TEXT;
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS custom_primary_color TEXT;
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS custom_app_name TEXT;
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS api_calls_count INTEGER DEFAULT 0;
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS storage_used_mb INTEGER DEFAULT 0;
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS last_usage_reset TIMESTAMPTZ DEFAULT NOW();

-- Plan limits with AI features
CREATE TABLE IF NOT EXISTS plan_limits (
  plan TEXT PRIMARY KEY,
  max_agents INTEGER NOT NULL, max_projects INTEGER NOT NULL,
  max_units INTEGER NOT NULL, max_clients INTEGER NOT NULL,
  max_storage_mb INTEGER NOT NULL, features JSONB DEFAULT '{}',
  price_monthly INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO plan_limits VALUES
  ('free', 2, 1, 20, 50, 100, '{"ai_suggestions":false,"ai_scripts":false,"export_csv":false}', 0, NOW()),
  ('starter', 5, 3, 100, 300, 500, '{"ai_suggestions":true,"ai_scripts":false,"export_csv":true}', 4900, NOW()),
  ('pro', 15, 10, 500, 2000, 2000, '{"ai_suggestions":true,"ai_scripts":true,"ai_documents":true,"export_csv":true}', 14900, NOW()),
  ('enterprise', 999, 999, 9999, 9999, 10000, '{"ai_suggestions":true,"ai_scripts":true,"ai_documents":true,"ai_custom":true,"custom_branding":true}', 0, NOW())
ON CONFLICT (plan) DO UPDATE SET features = EXCLUDED.features;

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  amount INTEGER NOT NULL, period TEXT NOT NULL,
  status TEXT DEFAULT 'pending', pdf_url TEXT,
  due_date DATE, paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platform messages
CREATE TABLE IF NOT EXISTS platform_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_admin_id UUID NOT NULL REFERENCES users(id),
  to_tenant_id UUID REFERENCES tenants(id),
  subject TEXT NOT NULL, body TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Changelogs
CREATE TABLE IF NOT EXISTS changelogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL, title TEXT NOT NULL,
  body TEXT NOT NULL, published_at TIMESTAMPTZ DEFAULT NOW()
);

-- Support tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  subject TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  priority TEXT DEFAULT 'normal',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platform alerts
CREATE TABLE IF NOT EXISTS platform_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL, threshold INTEGER DEFAULT 0,
  channel TEXT DEFAULT 'email',
  webhook_url TEXT, is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS + indexes (all tables)
-- [Applied in the SQL above via DO blocks]
