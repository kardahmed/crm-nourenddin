-- ================================================
-- CRM NOUREDDINE — File 18/N
-- Add the `archived` value to user_status so we can distinguish:
--   * active    → currently working, can log in
--   * inactive  → temporarily disabled (transferred their clients,
--                 can be reactivated later)
--   * archived  → permanently retired, removed from the default
--                 list, never reactivated. Historical records keep
--                 pointing at this user so the audit trail stays
--                 intact (first_name + last_name + history rows).
--
-- SPLIT FILE: same reason as 013 — Postgres refuses to reference
-- a newly-added enum value inside the same transaction that added
-- it (SQLSTATE 55P04). Migration 019 consumes the new value.
-- ================================================

ALTER TYPE user_status ADD VALUE IF NOT EXISTS 'archived';
