-- Call scripts + responses for guided calling
CREATE TABLE IF NOT EXISTS call_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  pipeline_stage TEXT NOT NULL,
  title TEXT NOT NULL,
  intro_text TEXT DEFAULT '',
  questions JSONB DEFAULT '[]',
  outro_text TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS call_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  agent_id UUID NOT NULL REFERENCES users(id),
  script_id UUID REFERENCES call_scripts(id),
  responses JSONB DEFAULT '{}',
  ai_summary TEXT,
  ai_suggestion TEXT,
  duration_seconds INTEGER,
  result TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_scripts_tenant ON call_scripts(tenant_id, pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_call_responses_client ON call_responses(client_id);
CREATE INDEX IF NOT EXISTS idx_call_responses_agent ON call_responses(agent_id);

ALTER TABLE call_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_responses ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'call_scripts_tenant') THEN
    CREATE POLICY "call_scripts_tenant" ON call_scripts FOR ALL USING (tenant_id = get_my_tenant_id() OR is_super_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'call_responses_tenant') THEN
    CREATE POLICY "call_responses_tenant" ON call_responses FOR ALL USING (tenant_id = get_my_tenant_id() OR is_super_admin());
  END IF;
END $$;
