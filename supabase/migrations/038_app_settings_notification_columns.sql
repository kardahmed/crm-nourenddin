-- ============================================================================
-- 038_app_settings_notification_columns.sql
-- Fix: the Settings → Notifications section toggles columns that don't exist
-- in app_settings, so the whole UPDATE was rejected by PostgREST and no
-- notification preference could be saved. Add the missing columns:
--   * two extra in-app notifications (notif_payment_due, notif_reservation_expiry)
--   * one email_* flag per notification (mirrors the in-app set)
-- All default to TRUE so behaviour is unchanged until the admin opts out.
-- ============================================================================

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS notif_payment_due        boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_reservation_expiry boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_agent_inactive     boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_payment_late       boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_payment_due        boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_reservation_expired boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_reservation_expiry boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_new_client         boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_new_sale           boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_goal_achieved      boolean NOT NULL DEFAULT true;

-- Reload the PostgREST schema cache so the new columns are writable immediately.
NOTIFY pgrst, 'reload schema';
