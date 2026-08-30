-- Per-(student, para) last-read page for live class resume + debounced saves.
-- Run BEFORE migration_para_progress_rls.sql (that file only adds policies).
--
-- Also adds class_sessions page columns used by src/app/class/page.tsx on session end.
-- Safe on existing DBs: IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS public.student_para_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  para_number integer NOT NULL,
  last_page integer NOT NULL DEFAULT 1,
  total_pages integer,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_para_progress_student_para
  ON public.student_para_progress (student_id, para_number);

ALTER TABLE public.class_sessions
  ADD COLUMN IF NOT EXISTS ending_page integer,
  ADD COLUMN IF NOT EXISTS last_page integer;
