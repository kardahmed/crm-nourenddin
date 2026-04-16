-- ================================================
-- CRM NOUREDDINE — Single-tenant schema
-- File 2/5: Projects, units, project_files
-- ================================================

-- 1. Projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  delivery_date DATE,
  avg_price_per_unit NUMERIC,
  cover_url TEXT,
  gallery_urls TEXT[],
  status project_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Units
CREATE TABLE IF NOT EXISTS units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  type unit_type NOT NULL DEFAULT 'apartment',
  subtype unit_subtype,
  building TEXT,
  floor INTEGER,
  surface NUMERIC,
  price NUMERIC,
  delivery_date DATE,
  plan_2d_url TEXT,
  status unit_status NOT NULL DEFAULT 'available',
  agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
  client_id UUID, -- FK added after clients table is created (file 3)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Project files (plans, images, brochures)
CREATE TABLE IF NOT EXISTS project_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─── Indexes ───
CREATE INDEX IF NOT EXISTS idx_units_project ON units(project_id);
CREATE INDEX IF NOT EXISTS idx_units_status ON units(status);
CREATE INDEX IF NOT EXISTS idx_units_agent ON units(agent_id);
CREATE INDEX IF NOT EXISTS idx_units_client ON units(client_id);
CREATE INDEX IF NOT EXISTS idx_project_files_project ON project_files(project_id);


-- ─── RLS ───
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read
CREATE POLICY "projects_select" ON projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "units_select" ON units FOR SELECT TO authenticated USING (true);
CREATE POLICY "project_files_select" ON project_files FOR SELECT TO authenticated USING (true);

-- Admin can manage
CREATE POLICY "projects_admin_insert" ON projects FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "projects_admin_update" ON projects FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "projects_admin_delete" ON projects FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY "units_admin_insert" ON units FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "units_admin_update" ON units FOR UPDATE TO authenticated USING (true);
CREATE POLICY "units_admin_delete" ON units FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY "project_files_admin_insert" ON project_files FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "project_files_admin_update" ON project_files FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "project_files_admin_delete" ON project_files FOR DELETE TO authenticated USING (public.is_admin());
