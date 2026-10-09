-- Para progress fixes for the deployed DB. Idempotent.
-- 1. student_para_progress_bounds_check (migration_security_hardening.sql) required
--    para_number 1..30, so every Qaida bookmark (sentinel para_number = 0) failed and
--    fell back to localStorage. Allow 0..30.
-- 2. The para PDFs are a 16-line mushaf, not 15: widen the line checks to 1..16.
-- 3. Production already has UNIQUE (student_id, para_number) but no committed file
--    declared it; add it only where missing.

BEGIN;

ALTER TABLE public.student_para_progress
  DROP CONSTRAINT IF EXISTS student_para_progress_bounds_check;
ALTER TABLE public.student_para_progress
  ADD CONSTRAINT student_para_progress_bounds_check
  CHECK (para_number BETWEEN 0 AND 30 AND last_page >= 1);

ALTER TABLE public.student_para_progress
  DROP CONSTRAINT IF EXISTS student_para_progress_last_line_check;
ALTER TABLE public.student_para_progress
  ADD CONSTRAINT student_para_progress_last_line_check
  CHECK (last_line >= 1 AND last_line <= 16);

ALTER TABLE public.class_sessions
  DROP CONSTRAINT IF EXISTS class_sessions_ending_line_check;
ALTER TABLE public.class_sessions
  ADD CONSTRAINT class_sessions_ending_line_check
  CHECK (ending_line >= 1 AND ending_line <= 16);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'student_para_progress_student_id_para_number_key'
      AND conrelid = 'public.student_para_progress'::regclass
  ) THEN
    ALTER TABLE public.student_para_progress
      ADD CONSTRAINT student_para_progress_student_id_para_number_key
      UNIQUE (student_id, para_number);
  END IF;
END $$;

COMMIT;
