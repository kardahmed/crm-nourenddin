-- ================================================
-- CRM NOUREDDINE — Single-tenant schema
-- File 1/5: Extensions, enums, users, app_settings, permission_profiles
-- ================================================

-- ─── Extensions ───
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ─── Enums ───
DO $$ BEGIN CREATE TYPE user_role AS ENUM ('admin', 'agent'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE user_status AS ENUM ('active', 'inactive'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE project_status AS ENUM ('active', 'inactive', 'archived'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE unit_type AS ENUM ('apartment', 'local', 'villa', 'parking'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE unit_subtype AS ENUM ('F2', 'F3', 'F4', 'F5', 'F6'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE unit_status AS ENUM ('available', 'reserved', 'sold', 'blocked'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE pipeline_stage AS ENUM ('accueil', 'visite_a_gerer', 'visite_confirmee', 'visite_terminee', 'negociation', 'reservation', 'vente', 'relancement', 'perdue'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE client_source AS ENUM ('facebook_ads', 'google_ads', 'instagram_ads', 'appel_entrant', 'reception', 'bouche_a_oreille', 'reference_client', 'site_web', 'portail_immobilier', 'autre'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE client_type AS ENUM ('individual', 'company'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE interest_level AS ENUM ('low', 'medium', 'high'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payment_method AS ENUM ('comptant', 'credit', 'lpp', 'aadl', 'mixte'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE visit_type AS ENUM ('on_site', 'office', 'virtual'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE visit_status AS ENUM ('planned', 'confirmed', 'completed', 'cancelled', 'rescheduled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE deposit_method AS ENUM ('cash', 'bank_transfer', 'cheque'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE reservation_status AS ENUM ('active', 'expired', 'cancelled', 'converted'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE financing_mode AS ENUM ('comptant', 'credit', 'mixte'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE discount_type AS ENUM ('percentage', 'fixed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE sale_status AS ENUM ('active', 'cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'late'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE charge_type AS ENUM ('notaire', 'agence', 'promotion', 'enregistrement', 'autre'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE history_type AS ENUM ('stage_change', 'visit_planned', 'visit_confirmed', 'visit_completed', 'call', 'whatsapp_call', 'whatsapp_message', 'sms', 'email', 'reservation', 'sale', 'payment', 'document', 'note', 'ai_task'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE task_type AS ENUM ('ai_generated', 'manual'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE task_status AS ENUM ('pending', 'done', 'ignored'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE doc_type AS ENUM ('contrat_vente', 'echeancier', 'bon_reservation', 'cin', 'autre'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE goal_metric AS ENUM ('sales_count', 'reservations_count', 'visits_count', 'revenue', 'new_clients', 'conversion_rate'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE goal_period AS ENUM ('monthly', 'quarterly', 'yearly'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE goal_status AS ENUM ('in_progress', 'achieved', 'exceeded', 'not_achieved'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ─── Tables ───

-- 1. Permission profiles (created before users so FK can reference it)
CREATE TABLE IF NOT EXISTS permission_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- 2. Users (links to auth.users via id)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'agent',
  status user_status NOT NULL DEFAULT 'active',
  permission_profile_id UUID REFERENCES permission_profiles(id) ON DELETE SET NULL,
  last_activity TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. App settings (singleton — replaces tenant_settings)
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Branding
  custom_logo_url TEXT,
  custom_primary_color TEXT,
  custom_app_name TEXT,
  -- Alerts
  urgent_alert_days INTEGER NOT NULL DEFAULT 3,
  relaunch_alert_days INTEGER NOT NULL DEFAULT 7,
  -- Reservations
  reservation_duration_days INTEGER NOT NULL DEFAULT 30,
  min_deposit_amount NUMERIC NOT NULL DEFAULT 100000,
  -- Language
  language TEXT NOT NULL DEFAULT 'fr',
  -- Notifications
  notif_agent_inactive BOOLEAN NOT NULL DEFAULT TRUE,
  notif_payment_late BOOLEAN NOT NULL DEFAULT TRUE,
  notif_reservation_expired BOOLEAN NOT NULL DEFAULT TRUE,
  notif_new_client BOOLEAN NOT NULL DEFAULT TRUE,
  notif_new_sale BOOLEAN NOT NULL DEFAULT TRUE,
  notif_goal_achieved BOOLEAN NOT NULL DEFAULT TRUE,
  -- Feature toggles
  feature_payment_tracking BOOLEAN NOT NULL DEFAULT TRUE,
  feature_charges BOOLEAN NOT NULL DEFAULT TRUE,
  feature_documents BOOLEAN NOT NULL DEFAULT TRUE,
  feature_goals BOOLEAN NOT NULL DEFAULT TRUE,
  feature_landing_pages BOOLEAN NOT NULL DEFAULT FALSE,
  feature_ai_scripts BOOLEAN NOT NULL DEFAULT TRUE,
  feature_whatsapp BOOLEAN NOT NULL DEFAULT TRUE,
  feature_auto_tasks BOOLEAN NOT NULL DEFAULT TRUE,
  -- Timestamps
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default app_settings row
INSERT INTO app_settings (id) VALUES (uuid_generate_v4());


-- ─── RLS ───
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Users: all authenticated users can read all users
CREATE POLICY "users_select" ON users FOR SELECT TO authenticated USING (true);
-- Users: can insert own row
CREATE POLICY "users_insert" ON users FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
-- Users: can update own row
CREATE POLICY "users_update_self" ON users FOR UPDATE TO authenticated USING (id = auth.uid());
-- Users: admin can update any user
CREATE POLICY "users_admin_update" ON users FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'));

-- Permission profiles: all authenticated can read
CREATE POLICY "perm_profiles_select" ON permission_profiles FOR SELECT TO authenticated USING (true);
-- Permission profiles: admin can manage
CREATE POLICY "perm_profiles_admin" ON permission_profiles FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'));

-- App settings: all authenticated can read
CREATE POLICY "app_settings_select" ON app_settings FOR SELECT TO authenticated USING (true);
-- App settings: admin can update
CREATE POLICY "app_settings_admin_update" ON app_settings FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'));


-- ─── Helper functions ───

-- Check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Handle new user sign-in (update last_activity)
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  UPDATE users SET last_activity = NOW() WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
