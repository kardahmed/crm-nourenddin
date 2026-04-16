-- ================================================
-- Tenant subscription plans
-- ================================================

-- Add plan column to tenants
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'plan'
  ) THEN
    ALTER TABLE tenants ADD COLUMN plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'enterprise'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'plan_expires_at'
  ) THEN
    ALTER TABLE tenants ADD COLUMN plan_expires_at TIMESTAMPTZ DEFAULT NULL;
  END IF;
END $$;

-- Plan limits reference table
CREATE TABLE IF NOT EXISTS plan_limits (
  plan TEXT PRIMARY KEY CHECK (plan IN ('free', 'starter', 'pro', 'enterprise')),
  max_agents INTEGER NOT NULL,
  max_projects INTEGER NOT NULL,
  max_units INTEGER NOT NULL,
  max_clients INTEGER NOT NULL,
  max_storage_mb INTEGER NOT NULL,
  features JSONB DEFAULT '{}',
  price_monthly INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE plan_limits ENABLE ROW LEVEL SECURITY;

-- Readable by all authenticated, writable by super_admin only
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'plan_limits_read_all') THEN
    CREATE POLICY "plan_limits_read_all" ON plan_limits FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'plan_limits_super_admin_write') THEN
    CREATE POLICY "plan_limits_super_admin_write" ON plan_limits FOR ALL USING (
      EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
    );
  END IF;
END $$;

-- Insert default plan limits
INSERT INTO plan_limits (plan, max_agents, max_projects, max_units, max_clients, max_storage_mb, price_monthly, features)
VALUES
  ('free',       2,   1,   20,   50,   100,  0,     '{"pdf_generation": false, "ai_suggestions": false, "export_csv": false}'),
  ('starter',    5,   3,   100,  300,  500,  4900,  '{"pdf_generation": true, "ai_suggestions": false, "export_csv": true}'),
  ('pro',        15,  10,  500,  2000, 2000, 14900, '{"pdf_generation": true, "ai_suggestions": true, "export_csv": true}'),
  ('enterprise', 999, 999, 9999, 9999, 10000, 0,    '{"pdf_generation": true, "ai_suggestions": true, "export_csv": true, "custom_branding": true, "api_access": true}')
ON CONFLICT (plan) DO NOTHING;
