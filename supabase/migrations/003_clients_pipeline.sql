-- ================================================
-- CRM NOUREDDINE — Single-tenant schema
-- File 3/5: Clients, visits, reservations, sales, payments, charges,
--           sale_amenities, sale_charges, sale_playbooks,
--           history, documents, document_templates
-- ================================================

-- 1. Clients
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  nin_cin TEXT,
  cin_verified BOOLEAN NOT NULL DEFAULT FALSE,
  cin_doc_url TEXT,
  client_type client_type NOT NULL DEFAULT 'individual',
  birth_date DATE,
  nationality TEXT NOT NULL DEFAULT 'DZ',
  profession TEXT,
  address TEXT,
  pipeline_stage pipeline_stage NOT NULL DEFAULT 'accueil',
  source client_source NOT NULL,
  desired_unit_types TEXT[],
  interested_projects TEXT[],
  confirmed_budget NUMERIC,
  interest_level interest_level NOT NULL DEFAULT 'medium',
  visit_note NUMERIC,
  visit_feedback TEXT,
  payment_method payment_method,
  notes TEXT,
  is_priority BOOLEAN NOT NULL DEFAULT FALSE,
  last_contact_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add FK from units.client_id to clients
ALTER TABLE units ADD CONSTRAINT fk_units_client
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;

-- 2. Visits
CREATE TABLE IF NOT EXISTS visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  visit_type visit_type NOT NULL DEFAULT 'on_site',
  status visit_status NOT NULL DEFAULT 'planned',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Reservations
CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  nin_cin TEXT NOT NULL,
  duration_days INTEGER NOT NULL DEFAULT 30,
  expires_at TIMESTAMPTZ NOT NULL,
  deposit_amount NUMERIC NOT NULL DEFAULT 0,
  deposit_method deposit_method,
  deposit_reference TEXT,
  status reservation_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Sale playbooks (AI-driven sales methodology)
CREATE TABLE IF NOT EXISTS sale_playbooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  objective TEXT,
  methodology TEXT,
  tone TEXT,
  custom_instructions TEXT,
  objection_rules JSONB,
  closing_phrases JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- 5. Sales
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
  total_price NUMERIC NOT NULL,
  discount_type discount_type,
  discount_value NUMERIC NOT NULL DEFAULT 0,
  final_price NUMERIC NOT NULL,
  financing_mode financing_mode NOT NULL DEFAULT 'comptant',
  delivery_date DATE,
  internal_notes TEXT,
  status sale_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Payment schedules
CREATE TABLE IF NOT EXISTS payment_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  due_date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  status payment_status NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Charges
CREATE TABLE IF NOT EXISTS charges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  label TEXT NOT NULL,
  type charge_type NOT NULL DEFAULT 'autre',
  amount NUMERIC NOT NULL,
  charge_date DATE,
  status payment_status NOT NULL DEFAULT 'pending',
  doc_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Sale amenities
CREATE TABLE IF NOT EXISTS sale_amenities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Sale charges (per-sale cost breakdown)
CREATE TABLE IF NOT EXISTS sale_charges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  amount NUMERIC,
  charge_type TEXT NOT NULL,
  paid BOOLEAN DEFAULT FALSE,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. History (activity log)
CREATE TABLE IF NOT EXISTS history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
  type history_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Documents
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  type doc_type NOT NULL DEFAULT 'autre',
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Document templates
CREATE TABLE IF NOT EXISTS document_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type doc_type NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─── Indexes ───
CREATE INDEX IF NOT EXISTS idx_clients_agent ON clients(agent_id);
CREATE INDEX IF NOT EXISTS idx_clients_stage ON clients(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_visits_agent ON visits(agent_id);
CREATE INDEX IF NOT EXISTS idx_visits_scheduled ON visits(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_visits_project ON visits(project_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_agent ON reservations(agent_id);
CREATE INDEX IF NOT EXISTS idx_reservations_project ON reservations(project_id);
CREATE INDEX IF NOT EXISTS idx_sales_agent ON sales(agent_id);
CREATE INDEX IF NOT EXISTS idx_sales_project ON sales(project_id);
CREATE INDEX IF NOT EXISTS idx_sales_reservation ON sales(reservation_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_sale ON payment_schedules(sale_id);
CREATE INDEX IF NOT EXISTS idx_charges_sale ON charges(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_amenities_sale ON sale_amenities(sale_id);
CREATE INDEX IF NOT EXISTS idx_history_client ON history(client_id);
CREATE INDEX IF NOT EXISTS idx_history_agent ON history(agent_id);
CREATE INDEX IF NOT EXISTS idx_documents_sale ON documents(sale_id);


-- ─── RLS ───
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE history ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read all data (single-tenant)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'clients', 'visits', 'reservations', 'sales',
    'payment_schedules', 'charges', 'sale_amenities', 'sale_charges',
    'sale_playbooks', 'history', 'documents', 'document_templates'
  ])
  LOOP
    EXECUTE format(
      'CREATE POLICY "%s_select" ON %I FOR SELECT TO authenticated USING (true)',
      tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY "%s_insert" ON %I FOR INSERT TO authenticated WITH CHECK (true)',
      tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY "%s_update" ON %I FOR UPDATE TO authenticated USING (true)',
      tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY "%s_delete" ON %I FOR DELETE TO authenticated USING (public.is_admin())',
      tbl, tbl
    );
  END LOOP;
END $$;


-- ─── Trigger functions ───

-- Auto-update unit status when a sale is created
CREATE OR REPLACE FUNCTION update_unit_on_sale() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' THEN
    UPDATE units SET status = 'sold', client_id = NEW.client_id WHERE id = NEW.unit_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_sale_unit ON sales;
CREATE TRIGGER trg_sale_unit AFTER INSERT ON sales
  FOR EACH ROW EXECUTE FUNCTION update_unit_on_sale();

-- Auto-update unit status on reservation create/cancel/expire
CREATE OR REPLACE FUNCTION update_unit_on_reservation() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' THEN
    UPDATE units SET status = 'reserved', client_id = NEW.client_id WHERE id = NEW.unit_id;
  ELSIF NEW.status IN ('expired', 'cancelled') AND (OLD.status = 'active') THEN
    UPDATE units SET status = 'available', client_id = NULL WHERE id = NEW.unit_id AND status = 'reserved';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_reservation_unit ON reservations;
CREATE TRIGGER trg_reservation_unit AFTER INSERT OR UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION update_unit_on_reservation();

-- Log pipeline stage changes to history
CREATE OR REPLACE FUNCTION log_stage_change() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.pipeline_stage IS DISTINCT FROM NEW.pipeline_stage THEN
    INSERT INTO history (client_id, agent_id, type, title, metadata)
    VALUES (NEW.id, NEW.agent_id, 'stage_change',
      'Changement etape: ' || OLD.pipeline_stage || ' -> ' || NEW.pipeline_stage,
      jsonb_build_object('from', OLD.pipeline_stage, 'to', NEW.pipeline_stage));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_client_stage ON clients;
CREATE TRIGGER trg_client_stage AFTER UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION log_stage_change();

-- Update last_contact_at on new history entry
CREATE OR REPLACE FUNCTION update_last_contact() RETURNS TRIGGER AS $$
BEGIN
  UPDATE clients SET last_contact_at = NOW() WHERE id = NEW.client_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_history_contact ON history;
CREATE TRIGGER trg_history_contact AFTER INSERT ON history
  FOR EACH ROW EXECUTE FUNCTION update_last_contact();
