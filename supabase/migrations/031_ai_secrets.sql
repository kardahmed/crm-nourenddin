-- =================================================================
-- Admin-managed AI secrets (Anthropic API key).
--
-- Stored separately from app_settings so we can enforce strict RLS:
-- only admin / super_admin can SELECT or modify the key. The edge
-- functions read it via the service-role client, bypassing RLS.
-- =================================================================

CREATE TABLE IF NOT EXISTS public.app_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anthropic_api_key TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- Ensure a singleton row exists so UPDATEs from the UI always have a target.
INSERT INTO public.app_secrets (id) VALUES (gen_random_uuid())
ON CONFLICT DO NOTHING;

ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_secrets_admin_select" ON public.app_secrets;
CREATE POLICY "app_secrets_admin_select" ON public.app_secrets
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

DROP POLICY IF EXISTS "app_secrets_admin_update" ON public.app_secrets;
CREATE POLICY "app_secrets_admin_update" ON public.app_secrets
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

DROP POLICY IF EXISTS "app_secrets_admin_insert" ON public.app_secrets;
CREATE POLICY "app_secrets_admin_insert" ON public.app_secrets
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

-- RPC: admin-only setter. Upserts the Anthropic key on the singleton row.
CREATE OR REPLACE FUNCTION public.set_anthropic_api_key(new_key TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role TEXT;
BEGIN
  SELECT role INTO caller_role FROM public.users WHERE id = auth.uid();
  IF caller_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Forbidden: admin role required';
  END IF;

  UPDATE public.app_secrets
  SET anthropic_api_key = NULLIF(new_key, ''),
      updated_at = NOW(),
      updated_by = auth.uid();

  IF NOT FOUND THEN
    INSERT INTO public.app_secrets (anthropic_api_key, updated_by)
    VALUES (NULLIF(new_key, ''), auth.uid());
  END IF;
END;
$$;

-- RPC: returns only a masked preview (last 4 chars + length) so the UI
-- can display "sk-...xxxx" without ever leaking the full key over the wire.
CREATE OR REPLACE FUNCTION public.get_anthropic_api_key_preview()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role TEXT;
  key_val TEXT;
BEGIN
  SELECT role INTO caller_role FROM public.users WHERE id = auth.uid();
  IF caller_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Forbidden: admin role required';
  END IF;

  SELECT anthropic_api_key INTO key_val FROM public.app_secrets LIMIT 1;

  IF key_val IS NULL OR length(key_val) = 0 THEN
    RETURN jsonb_build_object('configured', false);
  END IF;

  RETURN jsonb_build_object(
    'configured', true,
    'preview', left(key_val, 7) || '...' || right(key_val, 4),
    'length', length(key_val)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_anthropic_api_key(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_anthropic_api_key_preview() TO authenticated;
