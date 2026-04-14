-- ================================================
-- Consolidate crons: replace SQL-only crons with edge function calls
-- This avoids duplication between SQL functions and edge functions.
-- Edge functions handle DB operations + email notifications.
-- ================================================

-- 1. Remove old SQL-based cron jobs
SELECT cron.unschedule('check-expired-reservations');
SELECT cron.unschedule('check-overdue-payments');

-- 2. Enable pg_net for HTTP calls from Postgres
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 3. Helper: call an edge function via pg_net
-- Uses the service role key for authorization.
CREATE OR REPLACE FUNCTION call_edge_function(function_name TEXT)
RETURNS VOID AS $$
DECLARE
  base_url TEXT;
  service_key TEXT;
BEGIN
  -- These are set as Postgres secrets via Supabase dashboard
  base_url := current_setting('app.settings.supabase_url', true);
  service_key := current_setting('app.settings.service_role_key', true);

  -- If settings not configured, skip silently
  IF base_url IS NULL OR service_key IS NULL THEN
    RAISE NOTICE 'Edge function call skipped: app.settings not configured for %', function_name;
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := base_url || '/functions/v1/' || function_name,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := '{}'::jsonb
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

-- 4. Schedule edge function calls via pg_cron

-- Check expired reservations: every hour (edge function handles DB + emails)
SELECT cron.schedule(
  'check-reservations-edge',
  '0 * * * *',
  $$SELECT call_edge_function('check-reservations')$$
);

-- Check overdue payments: daily at 9:00 AM (edge function handles DB + emails)
SELECT cron.schedule(
  'check-payments-edge',
  '0 9 * * *',
  $$SELECT call_edge_function('check-payments')$$
);

-- Check reminders (payment due, reservation expiring, client relaunch): daily at 8:00 AM
SELECT cron.schedule(
  'check-reminders-edge',
  '0 8 * * *',
  $$SELECT call_edge_function('check-reminders')$$
);

-- ================================================
-- Note: The old SQL functions (check_expired_reservations, check_overdue_payments)
-- are kept for backward compatibility but no longer called by cron.
-- They can be removed in a future migration if desired.
-- ================================================
