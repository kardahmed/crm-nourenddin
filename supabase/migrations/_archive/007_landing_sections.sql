-- Landing page dynamic sections
CREATE TABLE IF NOT EXISTS landing_page_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('hero','gallery','features','video','pricing','testimonials','faq','cta','virtual_tour','contact')),
  sort_order INTEGER DEFAULT 0,
  title TEXT,
  content JSONB DEFAULT '{}',
  is_visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lp_sections_page ON landing_page_sections(page_id);
CREATE INDEX IF NOT EXISTS idx_lp_sections_order ON landing_page_sections(page_id, sort_order);

ALTER TABLE landing_page_sections ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'lp_sections_public_read') THEN
    CREATE POLICY "lp_sections_public_read" ON landing_page_sections FOR SELECT USING (
      EXISTS (SELECT 1 FROM landing_pages lp WHERE lp.id = page_id AND lp.is_active = TRUE)
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'lp_sections_tenant_all') THEN
    CREATE POLICY "lp_sections_tenant_all" ON landing_page_sections FOR ALL USING (
      EXISTS (SELECT 1 FROM landing_pages lp WHERE lp.id = page_id AND (lp.tenant_id = get_my_tenant_id() OR is_super_admin()))
    );
  END IF;
END $$;

ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS seo_title TEXT;
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS seo_description TEXT;
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS og_image_url TEXT;
