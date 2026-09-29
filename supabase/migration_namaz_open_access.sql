-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Open Namaz Access for All Students & Drop Per-Student Namaz Tables
-- ═══════════════════════════════════════════════════════════════════════════════
-- Why:
--   1. Previously, RLS on `namaz_steps` and `namaz_step_parts` required a row in
--      `student_namaz` (`WHERE sn.student_id = my_student_id()`).
--      Now every authenticated student has access to the Namaz visual guide.
--   2. Memorization & revision of Namaz parts is handled by the unified
--      Memorization module (`memorization_catalog` with category = 'Namaz'),
--      making `student_namaz`, `student_namaz_steps`, and `student_namaz_parts`
--      redundant.
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Open read access on `namaz_steps` and `namaz_step_parts` to all authenticated users
DROP POLICY IF EXISTS "Student read namaz_steps when assigned" ON public.namaz_steps;
DROP POLICY IF EXISTS "Authenticated users read namaz_steps" ON public.namaz_steps;
CREATE POLICY "Authenticated users read namaz_steps"
  ON public.namaz_steps FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Student read namaz_step_parts when assigned" ON public.namaz_step_parts;
DROP POLICY IF EXISTS "Authenticated users read namaz_step_parts" ON public.namaz_step_parts;
CREATE POLICY "Authenticated users read namaz_step_parts"
  ON public.namaz_step_parts FOR SELECT TO authenticated
  USING (true);

-- 2. Drop obsolete per-student Namaz assignment & step-unlock tables and triggers
DROP TRIGGER IF EXISTS trg_enforce_student_namaz_step_columns ON public.student_namaz_steps;
DROP FUNCTION IF EXISTS public.enforce_student_namaz_step_columns();

DROP TABLE IF EXISTS public.student_namaz_parts CASCADE;
DROP TABLE IF EXISTS public.student_namaz_steps CASCADE;
DROP TABLE IF EXISTS public.student_namaz CASCADE;
