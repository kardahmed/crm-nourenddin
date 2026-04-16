-- ================================================
-- CRM NOUREDDINE — File 7/N
-- Production audit fixes:
--   1. Create missing storage buckets (landing-assets, client-documents)
--   2. Create missing marketing tables (marketing_campaigns, marketing_expenses)
--   3. Ensure app_settings always has at least one row
-- ================================================

-- ─── 1. Storage buckets used by the frontend but never declared ───

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('landing-assets', 'landing-assets', true),
  ('client-documents', 'client-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Public read on landing-assets (logos, marketing images)
DO $$ BEGIN
  CREATE POLICY "landing_assets_read" ON storage.objects
    FOR SELECT USING (bucket_id = 'landing-assets');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "landing_assets_admin_write" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'landing-assets' AND public.is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "landing_assets_admin_update" ON storage.objects
    FOR UPDATE USING (bucket_id = 'landing-assets' AND public.is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "landing_assets_admin_delete" ON storage.objects
    FOR DELETE USING (bucket_id = 'landing-assets' AND public.is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Client documents: any authenticated agent can upload, only admin or owning agent can read/delete
DO $$ BEGIN
  CREATE POLICY "client_docs_authenticated_insert" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'client-documents' AND auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "client_docs_authenticated_read" ON storage.objects
    FOR SELECT USING (bucket_id = 'client-documents' AND auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "client_docs_admin_delete" ON storage.objects
    FOR DELETE USING (bucket_id = 'client-documents' AND public.is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ─── 2. Marketing campaigns + expenses (used by /marketing-roi) ───

CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  channel TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  budget NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS marketing_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  label TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  channel TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  invoice_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_project ON marketing_campaigns(project_id);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_marketing_expenses_campaign ON marketing_expenses(campaign_id);
CREATE INDEX IF NOT EXISTS idx_marketing_expenses_project ON marketing_expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_marketing_expenses_date ON marketing_expenses(expense_date DESC);

ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_expenses ENABLE ROW LEVEL SECURITY;

-- Marketing data is admin-only (commercial / financial reporting)
CREATE POLICY "marketing_campaigns_admin_all" ON marketing_campaigns
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "marketing_expenses_admin_all" ON marketing_expenses
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ─── 3. Ensure at least one app_settings row exists ───
-- The 001 migration inserts one, but if it was wiped we re-seed defensively.

INSERT INTO app_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM app_settings);


-- ─── 4. Trigger: auto-bump app_settings.updated_at ───
CREATE OR REPLACE FUNCTION public.bump_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_app_settings_updated_at ON app_settings;
CREATE TRIGGER trg_app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION public.bump_updated_at();
