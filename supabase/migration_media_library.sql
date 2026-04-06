-- Migration: Add media_library table
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS media_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('quran', 'memorization', 'general')),
  category text NOT NULL DEFAULT 'general',
  file_url text NOT NULL,
  file_type text NOT NULL CHECK (file_type IN ('pdf', 'image', 'audio', 'video')),
  meta jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE media_library ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on media_library" ON media_library;
CREATE POLICY "Allow all on media_library" ON media_library FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_media_type ON media_library(type);
CREATE INDEX IF NOT EXISTS idx_media_type_category ON media_library(type, category);

-- Create unified media bucket (run setup_storage.sql too)
