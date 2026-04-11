-- A/B Testing + Multi-language support for landing pages
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS variant TEXT DEFAULT 'A';
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS ab_test_group TEXT;
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'fr';
