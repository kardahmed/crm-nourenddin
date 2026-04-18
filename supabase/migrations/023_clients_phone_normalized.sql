-- ================================================
-- CRM NOUREDDINE — File 23/N
-- Phase 1 of duplicate-client prevention: add a normalized-phone
-- column so every duplicate query (and later the UNIQUE constraint)
-- operates on a canonical form.
--
-- Algerian numbers normalize to the last 9 digits after stripping all
-- non-digits — matches the client-side `useDuplicateCheck` hook so
-- front-end and back-end stay aligned:
--   "0542766068"        → "542766068"
--   "+213 542 766 068"  → "542766068"
--   "213542766068"      → "542766068"
--
-- This migration is PURELY ADDITIVE:
--   * no UNIQUE constraint yet (existing duplicates must be merged
--     first — see the diagnostic report + merge migration that
--     follow).
--   * no data is rewritten; the STORED generated column fills itself
--     on write. Existing rows get a value at next UPDATE, OR we can
--     trigger a one-shot backfill (commented below — run manually if
--     the table is large and you want to control timing).
-- ================================================

-- Shared helper used by the generated column AND by the forthcoming
-- find_duplicate_client RPC, so the normalization rule lives in one
-- single place.
CREATE OR REPLACE FUNCTION public.normalize_phone(p_phone TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
STRICT
PARALLEL SAFE
AS $$
  SELECT NULLIF(
    RIGHT(REGEXP_REPLACE(p_phone, '[^0-9]', '', 'g'), 9),
    ''
  );
$$;

REVOKE ALL ON FUNCTION public.normalize_phone(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.normalize_phone(TEXT) TO authenticated;

-- Generated column: always reflects the current `phone`, maintained
-- by PostgreSQL itself on INSERT/UPDATE, read cost ≈ 0.
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS phone_normalized TEXT
  GENERATED ALWAYS AS (public.normalize_phone(phone)) STORED;

-- Non-unique index. The UNIQUE variant ships in a later migration
-- once the duplicate cleanup is complete and you've signed off the
-- merge report.
CREATE INDEX IF NOT EXISTS idx_clients_phone_normalized
  ON public.clients(phone_normalized)
  WHERE phone_normalized IS NOT NULL;

-- ─────────────────────────────────────────────────
-- OPTIONAL one-shot backfill — uncomment and run MANUALLY in the SQL
-- Editor if rows predate the generated column and you want to force
-- recomputation without waiting for an UPDATE:
-- UPDATE public.clients SET phone = phone WHERE phone_normalized IS NULL;
-- ─────────────────────────────────────────────────
