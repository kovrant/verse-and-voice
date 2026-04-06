-- Migration: Replace memorization_items with catalog + assignment model
-- Run in Supabase SQL Editor

-- Drop old table if it exists
DROP TABLE IF EXISTS memorization_items;

-- Shared catalog
CREATE TABLE IF NOT EXISTS memorization_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL UNIQUE,
  category text NOT NULL DEFAULT 'General' CHECK (category IN ('Surah', 'Dua', 'Namaz', 'General')),
  created_at timestamptz DEFAULT now()
);

-- Student assignments (many-to-many)
CREATE TABLE IF NOT EXISTS student_memorization (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  catalog_id uuid NOT NULL REFERENCES memorization_catalog(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'memorizing' CHECK (status IN ('memorizing', 'memorized')),
  last_revised_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE (student_id, catalog_id)
);

-- RLS
ALTER TABLE memorization_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_memorization ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on memorization_catalog" ON memorization_catalog FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on student_memorization" ON student_memorization FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_student_mem_student ON student_memorization(student_id);
CREATE INDEX IF NOT EXISTS idx_student_mem_catalog ON student_memorization(catalog_id);

-- Drop old column
ALTER TABLE students DROP COLUMN IF EXISTS memorizing;

-- Seed catalog
INSERT INTO memorization_catalog (title, category) VALUES
  ('Namaz',                'Namaz'),
  ('Ayat al-Kursi',        'Surah'),
  ('Surah Fatiha',         'Surah'),
  ('Surah Ikhlas',         'Surah'),
  ('Surah Falaq',          'Surah'),
  ('Surah Nas',            'Surah'),
  ('Surah Kausar',         'Surah'),
  ('Surah Lahab',          'Surah'),
  ('Surah Nasr',           'Surah'),
  ('Dua before eating',    'Dua'),
  ('Dua after eating',     'Dua'),
  ('Dua before sleeping',  'Dua'),
  ('Dua after waking up',  'Dua'),
  ('Dua entering masjid',  'Dua'),
  ('Six Kalimas',          'General')
ON CONFLICT (title) DO NOTHING;
