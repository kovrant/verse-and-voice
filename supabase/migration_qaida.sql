-- Migration: Qaida content + per-student assignment
-- Run in Supabase SQL Editor

-- Allow 'qaida' as a media_library type (single multi-page PDF per qaida).
ALTER TABLE media_library DROP CONSTRAINT IF EXISTS media_library_type_check;
ALTER TABLE media_library
  ADD CONSTRAINT media_library_type_check
  CHECK (type IN ('quran', 'memorization', 'general', 'qaida'));

-- One assigned qaida per student (nullable). Clears if the media row is deleted.
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS qaida_media_id uuid REFERENCES media_library(id) ON DELETE SET NULL;
