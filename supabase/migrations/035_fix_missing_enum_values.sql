-- Migration 035: Add missing enum values for user_role and history_type
--
-- CONTEXT: Frontend code references 'reception' role and additional history types
-- ('client_created', 'reassignment', 'priority_change', 'budget_change') that
-- were missing from the PostgreSQL enums. This caused constraint violations when
-- the system tried to insert these values.

-- 1. Add 'reception' to user_role enum (used by reception staff and RLS policies)
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'reception';

-- 2. Extend history_type enum with 4 missing values used by the application
ALTER TYPE public.history_type ADD VALUE IF NOT EXISTS 'client_created';
ALTER TYPE public.history_type ADD VALUE IF NOT EXISTS 'reassignment';
ALTER TYPE public.history_type ADD VALUE IF NOT EXISTS 'priority_change';
ALTER TYPE public.history_type ADD VALUE IF NOT EXISTS 'budget_change';

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
