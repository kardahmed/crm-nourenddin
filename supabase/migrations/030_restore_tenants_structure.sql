-- ================================================
-- CRM NOUREDDINE — File 030 (Repair)
-- Restore tenants table and tenant isolation helper.
-- This is needed because the recently merged migrations (031, 032)
-- reference these structures which were archived in previous iterations.
-- ================================================

-- 1. Tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  logo_url TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  website TEXT,
  wilaya TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tenant isolation helper
CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS UUID AS $$
  -- In single-tenant mode, we always return the same fixed UUID.
  -- This ensures compatibility with RLS policies from the merged code.
  SELECT '00000000-0000-0000-0000-000000000001'::UUID;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- 3. Grant execute
GRANT EXECUTE ON FUNCTION public.get_my_tenant_id() TO authenticated;
