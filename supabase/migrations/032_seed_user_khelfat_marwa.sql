-- ================================================
-- Seed profile for khelfat.marwa@mz-immo.com.
-- Requires: the auth account already exists in auth.users
-- (created via Supabase Auth with password Mzimmo123@).
-- Links auth.users.id to public.users with role 'agent'.
-- Idempotent: safe to re-run.
-- ================================================

INSERT INTO public.users (id, first_name, last_name, email, role, status)
SELECT au.id, 'Marwa', 'Khelfat', 'khelfat.marwa@mz-immo.com', 'agent', 'active'
FROM auth.users au
WHERE au.email = 'khelfat.marwa@mz-immo.com'
ON CONFLICT (id) DO UPDATE
  SET first_name = EXCLUDED.first_name,
      last_name  = EXCLUDED.last_name,
      email      = EXCLUDED.email,
      role       = EXCLUDED.role,
      status     = EXCLUDED.status;
