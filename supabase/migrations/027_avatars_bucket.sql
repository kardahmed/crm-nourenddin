-- ================================================
-- CRM NOUREDDINE — File 27/N
-- Storage bucket for user avatars.
--
-- Path convention: `{auth.uid()}/avatar.{ext}`
--   → each user owns exactly one folder named after their UUID,
--     so RLS can scope reads/writes by matching the first path
--     segment against auth.uid().
--
-- Bucket is PUBLIC on read (so avatars can render in <img> tags
-- anywhere in the app) but INSERT / UPDATE / DELETE are locked
-- to the user's own folder.
-- ================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2 * 1024 * 1024,  -- 2 MB per upload
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public read so <img src="…avatars/{id}/avatar.jpg"> works for all.
DO $$ BEGIN
  CREATE POLICY "avatars_public_read" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- User can upload ONLY into their own folder.
DO $$ BEGIN
  CREATE POLICY "avatars_user_insert" ON storage.objects
    FOR INSERT WITH CHECK (
      bucket_id = 'avatars'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- User can overwrite ONLY their own avatar.
DO $$ BEGIN
  CREATE POLICY "avatars_user_update" ON storage.objects
    FOR UPDATE USING (
      bucket_id = 'avatars'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- User can delete ONLY their own avatar. Admins can delete any
-- avatar (for offboarding / cleanup).
DO $$ BEGIN
  CREATE POLICY "avatars_user_delete" ON storage.objects
    FOR DELETE USING (
      bucket_id = 'avatars'
      AND (
        auth.uid()::text = (storage.foldername(name))[1]
        OR public.is_admin()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
