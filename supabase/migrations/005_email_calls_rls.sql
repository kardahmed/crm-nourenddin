-- ================================================
-- CRM NOUREDDINE — Single-tenant schema
-- File 5/5: Call scripts, call responses, email marketing,
--           email logs, cron functions, storage buckets
-- ================================================

-- ─── Call scripts & responses ───

CREATE TABLE IF NOT EXISTS call_scripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pipeline_stage TEXT NOT NULL,
  title TEXT NOT NULL,
  intro_text TEXT DEFAULT '',
  questions JSONB DEFAULT '[]',
  outro_text TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS call_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  script_id UUID REFERENCES call_scripts(id) ON DELETE SET NULL,
  responses JSONB DEFAULT '{}',
  ai_summary TEXT,
  ai_suggestion TEXT,
  duration_seconds INTEGER,
  result TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_scripts_stage ON call_scripts(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_call_responses_client ON call_responses(client_id);
CREATE INDEX IF NOT EXISTS idx_call_responses_agent ON call_responses(agent_id);
CREATE INDEX IF NOT EXISTS idx_call_responses_script ON call_responses(script_id);

ALTER TABLE call_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "call_scripts_select" ON call_scripts FOR SELECT TO authenticated USING (true);
CREATE POLICY "call_scripts_insert" ON call_scripts FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "call_scripts_update" ON call_scripts FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "call_scripts_delete" ON call_scripts FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY "call_responses_select" ON call_responses FOR SELECT TO authenticated USING (true);
CREATE POLICY "call_responses_insert" ON call_responses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "call_responses_update" ON call_responses FOR UPDATE TO authenticated USING (true);


-- ─── Email marketing ───

-- 1. Email templates (visual builder with JSON blocks)
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  blocks JSONB NOT NULL DEFAULT '[]',
  html_cache TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Email campaigns
CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  segment_rules JSONB NOT NULL DEFAULT '{}',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  total_recipients INT NOT NULL DEFAULT 0,
  total_sent INT NOT NULL DEFAULT 0,
  total_opened INT NOT NULL DEFAULT 0,
  total_clicked INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Campaign recipients
CREATE TABLE IF NOT EXISTS email_campaign_recipients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ
);

-- 4. Email events (opens, clicks, bounces)
CREATE TABLE IF NOT EXISTS email_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES email_campaign_recipients(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Email logs (all emails sent by the platform)
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template TEXT,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  provider TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Email indexes
CREATE INDEX IF NOT EXISTS idx_email_templates_name ON email_templates(name);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_ecr_campaign ON email_campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ecr_status ON email_campaign_recipients(status);
CREATE INDEX IF NOT EXISTS idx_email_events_campaign ON email_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_events_type ON email_events(event_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_created ON email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_template ON email_logs(template);

-- Email RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'email_templates', 'email_campaigns', 'email_campaign_recipients',
    'email_events', 'email_logs'
  ])
  LOOP
    EXECUTE format('CREATE POLICY "%s_select" ON %I FOR SELECT TO authenticated USING (true)', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_insert" ON %I FOR INSERT TO authenticated WITH CHECK (true)', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_update" ON %I FOR UPDATE TO authenticated USING (true)', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_delete" ON %I FOR DELETE TO authenticated USING (public.is_admin())', tbl, tbl);
  END LOOP;
END $$;


-- ─── Storage bucket for email assets ───
INSERT INTO storage.buckets (id, name, public)
VALUES ('email-assets', 'email-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "upload_email_assets" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'email-assets');
CREATE POLICY "read_email_assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'email-assets');


-- ─── Cron functions ───

-- Mark overdue payments as late (daily at 9:00 AM)
CREATE OR REPLACE FUNCTION check_overdue_payments()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  WITH late_payments AS (
    UPDATE payment_schedules
    SET status = 'late'
    WHERE status = 'pending'
      AND due_date < CURRENT_DATE
    RETURNING id
  )
  SELECT COUNT(*) INTO updated_count FROM late_payments;
  RAISE NOTICE 'Marked % payment(s) as late', updated_count;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Expire overdue reservations (hourly)
CREATE OR REPLACE FUNCTION check_expired_reservations()
RETURNS INTEGER AS $$
DECLARE
  expired_record RECORD;
  processed INTEGER := 0;
BEGIN
  FOR expired_record IN
    SELECT id, client_id, unit_id
    FROM reservations
    WHERE status = 'active' AND expires_at < NOW()
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE reservations SET status = 'expired' WHERE id = expired_record.id;
    UPDATE units SET status = 'available', client_id = NULL
      WHERE id = expired_record.unit_id AND status = 'reserved';
    INSERT INTO history (client_id, agent_id, type, title, description, metadata)
    VALUES (
      expired_record.client_id, NULL, 'stage_change',
      'Reservation expiree -- client passe en relancement',
      'Reservation ' || expired_record.id || ' expiree automatiquement',
      jsonb_build_object('reservation_id', expired_record.id, 'unit_id', expired_record.unit_id,
        'from', 'reservation', 'to', 'relancement', 'auto', true)
    );
    UPDATE clients SET pipeline_stage = 'relancement'
      WHERE id = expired_record.client_id AND pipeline_stage = 'reservation';
    processed := processed + 1;
  END LOOP;
  RAISE NOTICE 'Processed % expired reservations', processed;
  RETURN processed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Schedule cron jobs
SELECT cron.schedule('check-overdue-payments', '0 9 * * *', 'SELECT check_overdue_payments()');
SELECT cron.schedule('check-expired-reservations', '0 * * * *', 'SELECT check_expired_reservations()');
