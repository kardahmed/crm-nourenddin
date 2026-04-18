-- ================================================
-- CRM NOUREDDINE — File 30/N
-- Push endpoint reclaim policy.
--
-- Problem: a single browser has ONE unique push endpoint (per install).
-- When user A opts into push on that browser, then logs out, and user B
-- logs in on the same browser, B's subscribe call tries to take over the
-- endpoint. But migration 020's policies scoped DELETE/UPDATE to
-- `user_id = auth.uid()` — so B can't touch A's row, and INSERT fails on
-- the UNIQUE(endpoint) constraint. Result: 403 + the user never gets push.
--
-- Fix: let any authenticated user DELETE a row for an endpoint (their own
-- browser). INSERT still requires user_id = auth.uid() via migration 020.
-- The client-side flow is: DELETE by endpoint, then INSERT fresh.
-- ================================================

DROP POLICY IF EXISTS push_subs_delete_own ON public.push_subscriptions;
DROP POLICY IF EXISTS push_subs_delete_reclaim ON public.push_subscriptions;
CREATE POLICY push_subs_delete_reclaim ON public.push_subscriptions
  FOR DELETE USING (auth.uid() IS NOT NULL);
