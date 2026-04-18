-- ================================================
-- CRM NOUREDDINE — File 21/N
-- Auto-send push notifications on real CRM events.
--
-- How it works:
--   * `public.notify_push(user_id, title, body, url)` is a small helper
--     that POSTs to the send-push edge function via pg_net. Credentials
--     (edge URL + service role key) live in Vault so they never leak
--     through SHOW / pg_settings. The helper no-ops gracefully if they
--     aren't configured yet.
--   * Three AFTER triggers fire notify_push in response to:
--       - new task assigned to an agent (INSERT on tasks)
--       - new visit scheduled for an agent (INSERT on visits)
--       - client reassigned to a different agent (UPDATE on clients)
--   * Self-events are skipped (agent_id = auth.uid()).
--
-- One-time setup (run once in SQL Editor, NOT in this migration — we
-- don't want secrets in version control):
--
--     SELECT vault.create_secret(
--       'https://YOUR-REF.supabase.co/functions/v1',
--       'edge_url'
--     );
--     SELECT vault.create_secret(
--       'YOUR_SERVICE_ROLE_KEY',
--       'service_role_key'
--     );
--
-- If either secret is missing, notify_push logs a warning and returns
-- NULL — triggers never block the originating INSERT/UPDATE.
-- ================================================

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Helper -------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.notify_push(
  p_user_id UUID,
  p_title   TEXT,
  p_body    TEXT DEFAULT NULL,
  p_url     TEXT DEFAULT NULL
) RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_url         TEXT;
  v_key         TEXT;
  v_request_id  BIGINT;
BEGIN
  IF p_user_id IS NULL OR p_title IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT decrypted_secret INTO v_url
    FROM vault.decrypted_secrets WHERE name = 'edge_url' LIMIT 1;
  SELECT decrypted_secret INTO v_key
    FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;

  IF v_url IS NULL OR v_key IS NULL THEN
    RAISE WARNING 'notify_push skipped: vault secrets edge_url/service_role_key not set';
    RETURN NULL;
  END IF;

  SELECT net.http_post(
    url     := v_url || '/send-push',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body    := jsonb_build_object(
      'user_id', p_user_id,
      'title',   p_title,
      'body',    p_body,
      'url',     p_url
    )
  ) INTO v_request_id;

  RETURN v_request_id;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_push failed: %', SQLERRM;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_push(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_push(UUID, TEXT, TEXT, TEXT) TO authenticated;


-- Task assigned ------------------------------------------------------

CREATE OR REPLACE FUNCTION public.trg_notify_task_assigned() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_client_name TEXT;
BEGIN
  IF NEW.agent_id IS NULL OR NEW.agent_id = auth.uid() THEN
    RETURN NEW;
  END IF;

  SELECT full_name INTO v_client_name FROM clients WHERE id = NEW.client_id;

  PERFORM notify_push(
    NEW.agent_id,
    'Nouvelle tâche : ' || NEW.title,
    COALESCE('Client : ' || v_client_name, NULL),
    '/tasks'
  );
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tasks') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS on_task_insert_notify ON public.tasks';
    EXECUTE 'CREATE TRIGGER on_task_insert_notify AFTER INSERT ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.trg_notify_task_assigned()';
  ELSE
    RAISE NOTICE 'Skipping on_task_insert_notify: public.tasks does not exist';
  END IF;
END $$;


-- Visit scheduled ----------------------------------------------------

CREATE OR REPLACE FUNCTION public.trg_notify_visit_scheduled() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_client_name TEXT;
  v_when TEXT;
BEGIN
  IF NEW.agent_id IS NULL OR NEW.agent_id = auth.uid() THEN
    RETURN NEW;
  END IF;

  SELECT full_name INTO v_client_name FROM clients WHERE id = NEW.client_id;
  v_when := to_char(NEW.scheduled_at AT TIME ZONE 'Africa/Algiers', 'DD/MM à HH24:MI');

  PERFORM notify_push(
    NEW.agent_id,
    'Nouvelle visite',
    COALESCE(v_client_name, 'Client') || ' — ' || v_when,
    '/planning'
  );
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'visits') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS on_visit_insert_notify ON public.visits';
    EXECUTE 'CREATE TRIGGER on_visit_insert_notify AFTER INSERT ON public.visits FOR EACH ROW EXECUTE FUNCTION public.trg_notify_visit_scheduled()';
  ELSE
    RAISE NOTICE 'Skipping on_visit_insert_notify: public.visits does not exist';
  END IF;
END $$;


-- Client reassigned --------------------------------------------------

CREATE OR REPLACE FUNCTION public.trg_notify_client_reassigned() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.agent_id IS NULL
     OR NEW.agent_id IS NOT DISTINCT FROM OLD.agent_id
     OR NEW.agent_id = auth.uid() THEN
    RETURN NEW;
  END IF;

  PERFORM notify_push(
    NEW.agent_id,
    'Client assigné : ' || NEW.full_name,
    COALESCE('Tél : ' || NEW.phone, NULL),
    '/pipeline/clients/' || NEW.id
  );
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'clients') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS on_client_reassign_notify ON public.clients';
    EXECUTE 'CREATE TRIGGER on_client_reassign_notify AFTER UPDATE OF agent_id ON public.clients FOR EACH ROW WHEN (OLD.agent_id IS DISTINCT FROM NEW.agent_id) EXECUTE FUNCTION public.trg_notify_client_reassigned()';
  ELSE
    RAISE NOTICE 'Skipping on_client_reassign_notify: public.clients does not exist';
  END IF;
END $$;


-- Diagnostic helper: call from SQL Editor to send a test push to self
CREATE OR REPLACE FUNCTION public.test_notify_push() RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_req BIGINT;
BEGIN
  v_req := notify_push(
    auth.uid(),
    'Test IMMO PRO-X',
    'Si tu vois ça, les triggers et le push fonctionnent 🎉',
    '/today'
  );
  RETURN jsonb_build_object('request_id', v_req);
END;
$$;

GRANT EXECUTE ON FUNCTION public.test_notify_push() TO authenticated;
