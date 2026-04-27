-- Migration 034: Fix payment_method column for clients table
--
-- CONTEXT: The `clients` table is defined in migration 003 with a
-- `payment_method` column, but the live database (previously initialized
-- via the archived multi-tenant schema) was missing this column.
--
-- This migration ensures the column exists and the PostgREST schema cache
-- is reloaded so the column is immediately visible to the API.

-- Ensure the payment_method enum exists (idempotent)
DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('comptant', 'credit', 'lpp', 'aadl', 'mixte');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add the payment_method column if missing (idempotent)
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS payment_method payment_method;

-- Reload PostgREST schema cache so the new column is visible
-- (This notification is picked up by pg_net or PostgREST's introspection)
NOTIFY pgrst, 'reload schema';
