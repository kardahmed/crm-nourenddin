-- ================================================
-- Seed initial staff users for MZ Immo.
-- Auth accounts were created manually in Supabase Auth beforehand.
-- This migration links each auth.users row to a public.users profile.
-- Idempotent: safe to re-run (ON CONFLICT DO NOTHING).
-- ================================================

INSERT INTO public.users (id, first_name, last_name, email, role, status)
VALUES
  ('e8526de6-d949-4d67-a853-2362bf8cb8cd', 'Lydia', 'Amalou',   'amalou.lydia@mz-immo.com',   'reception', 'active'),
  ('f56b9c91-7716-41da-be7d-462207f51ab3', 'Marwa', 'Khlelfat', 'khlelfat.marwa@mz-immo.com', 'agent',     'active')
ON CONFLICT (id) DO NOTHING;
