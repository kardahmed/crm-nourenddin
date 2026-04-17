-- ================================================
-- CRM NOUREDDINE — File 25/N
-- Phase 3: enforce phone uniqueness at DB level.
--
-- After migration 024 cleaned all duplicates, we now have
-- 0 groups with COUNT(*) > 1 on phone_normalized.
-- This constraint prevents any future duplicate from being inserted.
--
-- Partial UNIQUE: NULL phones are allowed (walk-ins without phone),
-- but two rows with the same non-NULL phone_normalized are rejected.
-- ================================================

-- Drop the old non-unique index and replace with a UNIQUE constraint.
DROP INDEX IF EXISTS idx_clients_phone_normalized;

ALTER TABLE public.clients
  ADD CONSTRAINT uq_clients_phone_normalized
  UNIQUE (phone_normalized);

-- The constraint implicitly creates a unique index.
-- NULLs are exempt (standard SQL UNIQUE behavior): multiple clients
-- with phone_normalized = NULL are allowed.
