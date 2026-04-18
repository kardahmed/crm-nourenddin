-- ================================================
-- CRM NOUREDDINE — File 030
-- Grant missing execution permissions on security helpers.
-- This resolves 403 Forbidden errors when calling these functions
-- as RPCs or when they are triggered via RLS by non-admin roles.
-- ================================================

-- 1. Grant execute on core role helpers
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_reception() TO authenticated;

-- 2. Grant execute on assignment helper (used in reception UI)
GRANT EXECUTE ON FUNCTION public.pick_agent_for_assignment() TO authenticated;

-- 3. Ensure search path is locked for security (already mostly done in migrations)
ALTER FUNCTION public.is_admin() SET search_path = public;
ALTER FUNCTION public.is_reception() SET search_path = public;
ALTER FUNCTION public.pick_agent_for_assignment() SET search_path = public;
