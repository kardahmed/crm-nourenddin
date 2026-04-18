-- ================================================
-- CRM NOUREDDINE — File 13/N
-- Add the `reception` value to user_role.
--
-- Postgres forbids referencing a newly-added enum value in the SAME
-- transaction that creates it (SQLSTATE 55P04). The Supabase CLI wraps
-- every migration file in its own transaction, so this file does ONLY
-- the ALTER TYPE. Everything that uses `role = 'reception'` (the
-- is_reception() helper, the policies, the triggers, etc.) lives in
-- migration 014, which runs in a fresh transaction.
-- ================================================

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'reception';
