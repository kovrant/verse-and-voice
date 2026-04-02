-- Migration: Replace old para fields with desc/asc tracking
-- Run in Supabase SQL Editor

ALTER TABLE students ADD COLUMN IF NOT EXISTS is_qaida boolean NOT NULL DEFAULT true;
ALTER TABLE students ADD COLUMN IF NOT EXISTS desc_completed integer NOT NULL DEFAULT 0 CHECK (desc_completed >= 0 AND desc_completed <= 30);
ALTER TABLE students ADD COLUMN IF NOT EXISTS asc_completed integer NOT NULL DEFAULT 0 CHECK (asc_completed >= 0 AND asc_completed <= 30);

-- Drop old columns if they exist
ALTER TABLE students DROP COLUMN IF EXISTS para_number;
ALTER TABLE students DROP COLUMN IF EXISTS current_para;
ALTER TABLE students DROP COLUMN IF EXISTS completed_paras;
