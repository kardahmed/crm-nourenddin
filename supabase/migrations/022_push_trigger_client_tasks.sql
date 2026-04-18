-- ================================================
-- CRM NOUREDDINE — File 22/N
-- Re-point the task-assigned push trigger from the legacy `tasks`
-- table (now deprecated) to `client_tasks`, which the app actually
-- writes to. `tasks` may not even exist in fresh deployments.
-- ================================================

-- Drop the old trigger if the legacy table is still present, so we
-- don't end up firing twice during the transition.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tasks') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS on_task_insert_notify ON public.tasks';
  END IF;
END $$;

-- Attach the existing trg_notify_task_assigned function to client_tasks.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'client_tasks') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS on_client_task_insert_notify ON public.client_tasks';
    EXECUTE 'CREATE TRIGGER on_client_task_insert_notify AFTER INSERT ON public.client_tasks FOR EACH ROW EXECUTE FUNCTION public.trg_notify_task_assigned()';
  ELSE
    RAISE NOTICE 'Skipping on_client_task_insert_notify: public.client_tasks does not exist';
  END IF;
END $$;
