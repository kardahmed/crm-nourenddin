-- Migration 015 : single-tenant bootstrap
--
-- - Adds missing columns referenced by the app (avatar_url, archived_at,
--   permission_profile_id) to users.
-- - Adds 'reception' to user_role enum.
-- - Creates permission_profiles table + indexes + RLS.
-- - Seeds the fixed single-tenant row and default permission profiles.
-- - Backfills existing users to the single tenant, fixes any role='reception'
--   leftovers, and clears super_admin role (no longer used).
--
-- Idempotent: safe to re-run.

-- 1. user_role enum: add 'reception'
-- NB: ALTER TYPE ADD VALUE cannot run inside a DO block.
-- IF NOT EXISTS makes it idempotent (Postgres 12+).
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'reception';

-- 2. users: missing columns
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS permission_profile_id UUID;

-- 3. permission_profiles table
CREATE TABLE IF NOT EXISTS permission_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_permission_profiles_tenant ON permission_profiles(tenant_id);

-- FK from users.permission_profile_id now that the table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_permission_profile_id_fkey'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_permission_profile_id_fkey
      FOREIGN KEY (permission_profile_id) REFERENCES permission_profiles(id) ON DELETE SET NULL;
  END IF;
END$$;

ALTER TABLE permission_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "permission_profiles_select_all_auth" ON permission_profiles;
CREATE POLICY "permission_profiles_select_all_auth" ON permission_profiles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "permission_profiles_admin_write" ON permission_profiles;
CREATE POLICY "permission_profiles_admin_write" ON permission_profiles
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

-- 4. Seed single tenant row (fixed UUID to match SINGLE_TENANT_ID in src/lib/singleTenant.ts)
INSERT INTO tenants (id, name, email, phone, wilaya)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'MZ Immo',
  'contact@mz-immo.com',
  NULL,
  'Alger'
)
ON CONFLICT (id) DO NOTHING;

-- 5. Seed default permission profiles
-- Agent: sees own clients, plans visits, creates sales.
INSERT INTO permission_profiles (id, tenant_id, name, description, permissions, is_default)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'Agent',
  'Profil par defaut pour les agents commerciaux',
  '{
    "dashboard.view": true,
    "pipeline.view_own": true, "pipeline.create": true, "pipeline.edit": true, "pipeline.change_stage": true,
    "projects.view": true,
    "units.view": true,
    "visits.view_own": true, "visits.create": true, "visits.edit": true,
    "reservations.view": true, "reservations.create": true,
    "sales.view": true, "sales.create": true,
    "dossiers.view": true,
    "documents.view": true, "documents.generate": true, "documents.upload": true,
    "payments.view": true,
    "goals.view_own": true,
    "performance.view_own": true,
    "reports.view": true,
    "ai.call_script": true, "ai.suggestions": true, "ai.questions": true,
    "whatsapp.send": true, "whatsapp.view_history": true
  }'::jsonb,
  TRUE
)
ON CONFLICT (tenant_id, name) DO UPDATE SET permissions = EXCLUDED.permissions, is_default = TRUE;

-- Reception: only Accueil flow — pipeline create + minimal visit planning.
INSERT INTO permission_profiles (id, tenant_id, name, description, permissions, is_default)
VALUES (
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000001',
  'Reception',
  'Accueil et saisie initiale des leads',
  '{
    "dashboard.view": true,
    "pipeline.view_all": true, "pipeline.create": true,
    "visits.view_all": true, "visits.create": true,
    "projects.view": true,
    "units.view": true
  }'::jsonb,
  FALSE
)
ON CONFLICT (tenant_id, name) DO UPDATE SET permissions = EXCLUDED.permissions;

-- 6. Backfill : all existing users attach to single tenant
UPDATE users SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL OR tenant_id <> '00000000-0000-0000-0000-000000000001';

-- 7. Demote any super_admin to admin (no super_admin UI remaining).
UPDATE users SET role = 'admin' WHERE role = 'super_admin';

-- 8. Assign default permission profile to agents who don't have one
UPDATE users
SET permission_profile_id = '00000000-0000-0000-0000-000000000010'
WHERE role = 'agent' AND permission_profile_id IS NULL;

-- 9. Assign reception profile to reception users
UPDATE users
SET permission_profile_id = '00000000-0000-0000-0000-000000000011'
WHERE role = 'reception' AND permission_profile_id IS NULL;
