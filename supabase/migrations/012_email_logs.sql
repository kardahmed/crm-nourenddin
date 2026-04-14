-- Email logs table for tracking all emails sent by the platform
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  template TEXT,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',  -- sent, failed, test
  provider TEXT,                         -- resend, none
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for admin queries
CREATE INDEX idx_email_logs_created_at ON email_logs(created_at DESC);
CREATE INDEX idx_email_logs_tenant_id ON email_logs(tenant_id);
CREATE INDEX idx_email_logs_template ON email_logs(template);

-- RLS
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Super admins can read all email logs
CREATE POLICY "super_admin_read_email_logs" ON email_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'super_admin'
    )
  );

-- Service role can insert (edge functions)
CREATE POLICY "service_insert_email_logs" ON email_logs
  FOR INSERT
  WITH CHECK (true);
