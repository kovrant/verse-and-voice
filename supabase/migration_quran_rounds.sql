-- Migration: Add quran_rounds table and migrate existing progress data
-- Run in Supabase SQL Editor

-- 1. Create quran_rounds table
CREATE TABLE IF NOT EXISTS quran_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('qaida', 'quran')),
  round_number integer NOT NULL DEFAULT 1,
  started_at date NOT NULL,
  completed_at date,
  desc_completed integer NOT NULL DEFAULT 0 CHECK (desc_completed >= 0 AND desc_completed <= 30),
  asc_completed integer NOT NULL DEFAULT 0 CHECK (asc_completed >= 0 AND asc_completed <= 30),
  created_at timestamptz DEFAULT now(),
  UNIQUE (student_id, type, round_number)
);

ALTER TABLE quran_rounds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on quran_rounds" ON quran_rounds;
CREATE POLICY "Allow all on quran_rounds" ON quran_rounds FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_quran_rounds_student ON quran_rounds(student_id);
CREATE INDEX IF NOT EXISTS idx_quran_rounds_student_type ON quran_rounds(student_id, type);

-- 2. Migrate existing student data into quran_rounds
-- Students on Qaida get a qaida round
INSERT INTO quran_rounds (student_id, type, round_number, started_at, desc_completed, asc_completed)
SELECT id, 'qaida', 1, started_at, 0, 0
FROM students
WHERE is_qaida = true
ON CONFLICT DO NOTHING;

-- Students reading Quran get a quran round with their current progress
INSERT INTO quran_rounds (student_id, type, round_number, started_at, desc_completed, asc_completed)
SELECT id, 'quran', 1, started_at, desc_completed, asc_completed
FROM students
WHERE is_qaida = false AND (desc_completed > 0 OR asc_completed > 0)
ON CONFLICT DO NOTHING;

-- Completed students who had Quran progress: mark their round as completed
UPDATE quran_rounds
SET completed_at = s.ended_at
FROM students s
WHERE quran_rounds.student_id = s.id
  AND quran_rounds.type = 'quran'
  AND s.status = 'Completed'
  AND s.ended_at IS NOT NULL
  AND (quran_rounds.desc_completed + GREATEST(quran_rounds.asc_completed - 1, 0)) >= 30;

-- 3. After verifying migration, you can optionally drop old columns:
-- ALTER TABLE students DROP COLUMN IF EXISTS is_qaida;
-- ALTER TABLE students DROP COLUMN IF EXISTS desc_completed;
-- ALTER TABLE students DROP COLUMN IF EXISTS asc_completed;
-- (Keep them for now as fallback)
