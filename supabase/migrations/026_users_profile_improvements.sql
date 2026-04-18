-- ================================================
-- CRM NOUREDDINE — File 26/N
-- User management quality-of-life improvements:
--
--   * avatar_url TEXT — points to a Supabase Storage object in
--     the `avatars` bucket; NULL falls back to auto-generated
--     initials in the UI.
--   * must_change_password BOOLEAN — set to TRUE for users
--     created with a temporary password; the front-end forces a
--     reset before granting access. Existing users default to
--     FALSE so we don't lock anyone out.
--
-- Both columns are additive and nullable (or have safe defaults),
-- so no data migration is needed.
-- ================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.users.avatar_url IS
  'Public URL of the user''s profile picture stored in the avatars bucket.';

COMMENT ON COLUMN public.users.must_change_password IS
  'When TRUE, the user is forced to set a new password on next login.';
