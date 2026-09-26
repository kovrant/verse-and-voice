-- ─────────────────────────────────────────────────────────────────────────────
-- RLS hardening (audit of 2026-09-26)
--
-- The anon key ships in the browser bundle, so any policy granted to the
-- `public` role is open to anyone on the internet, logged in or not. The live
-- database (checked via pg_policies) had four such holes:
--
--   1. storage `media` bucket          — anyone could upload / replace / delete
--                                         (all 30 Quran para PDFs live here)
--   2. storage `memorization-images`   — same; these "Allow … memorization
--                                         images" policies were added in the
--                                         dashboard and exist in no migration
--   3. quizzes, quiz_questions,
--      quiz_assignments, quiz_attempts — FOR ALL USING (true): anyone could
--                                         read every child's answers and scores,
--                                         forge attempts, or delete quizzes
--   4. class_sessions "Allow all"      — anyone could read/alter every child's
--                                         class history, including notes
--
-- Permissive policies are OR'd, so each open policy cancelled the correct
-- teacher/student policies sitting next to it. Dropping the open ones is the
-- whole fix; the correct policies already exist where noted.
--
-- Safe for the app: students only ever READ these tables (quiz attempts and
-- assignments are written server-side with the service role in
-- /api/quizzes/*), and only teacher pages write to storage.
--
-- Policy names below are the LIVE names from pg_policies, which differ from
-- the older migration files (drift). Idempotent: safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── 1 & 2. Storage: public reads stay, writes become teacher-only ───────────
DROP POLICY IF EXISTS "Allow upload media"                ON storage.objects;
DROP POLICY IF EXISTS "Allow update media"                ON storage.objects;
DROP POLICY IF EXISTS "Allow delete media"                ON storage.objects;
DROP POLICY IF EXISTS "Allow upload memorization images"  ON storage.objects;
DROP POLICY IF EXISTS "Allow update memorization images"  ON storage.objects;
DROP POLICY IF EXISTS "Allow delete memorization images"  ON storage.objects;

DROP POLICY IF EXISTS "Teacher upload on media" ON storage.objects;
DROP POLICY IF EXISTS "Teacher update on media" ON storage.objects;
DROP POLICY IF EXISTS "Teacher delete on media" ON storage.objects;

CREATE POLICY "Teacher upload on media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media' AND public.is_teacher());

CREATE POLICY "Teacher update on media"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'media' AND public.is_teacher())
  WITH CHECK (bucket_id = 'media' AND public.is_teacher());

CREATE POLICY "Teacher delete on media"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'media' AND public.is_teacher());

-- memorization-images already has "Teacher upload/update/delete on
-- memorization-images"; dropping the open policies above is enough.

-- ── 3. Quizzes: students read their own, teachers manage everything ────────
DROP POLICY IF EXISTS "quizzes_all"                 ON public.quizzes;
DROP POLICY IF EXISTS "quizzes_select_all"          ON public.quizzes;
DROP POLICY IF EXISTS "quiz_questions_all"          ON public.quiz_questions;
DROP POLICY IF EXISTS "quiz_questions_select_all"   ON public.quiz_questions;
DROP POLICY IF EXISTS "quiz_assignments_all"        ON public.quiz_assignments;
DROP POLICY IF EXISTS "quiz_assignments_select_all" ON public.quiz_assignments;
DROP POLICY IF EXISTS "quiz_attempts_insert_all"    ON public.quiz_attempts;
DROP POLICY IF EXISTS "quiz_attempts_select_all"    ON public.quiz_attempts;

DROP POLICY IF EXISTS "Teacher full access on quizzes"          ON public.quizzes;
DROP POLICY IF EXISTS "Student read quizzes"                    ON public.quizzes;
DROP POLICY IF EXISTS "Teacher full access on quiz_questions"   ON public.quiz_questions;
DROP POLICY IF EXISTS "Student read quiz_questions"             ON public.quiz_questions;
DROP POLICY IF EXISTS "Teacher full access on quiz_assignments" ON public.quiz_assignments;
DROP POLICY IF EXISTS "Student read own quiz_assignments"       ON public.quiz_assignments;
DROP POLICY IF EXISTS "Teacher full access on quiz_attempts"    ON public.quiz_attempts;
DROP POLICY IF EXISTS "Student read own quiz_attempts"          ON public.quiz_attempts;

CREATE POLICY "Teacher full access on quizzes"
  ON public.quizzes FOR ALL TO authenticated
  USING (public.is_teacher()) WITH CHECK (public.is_teacher());
CREATE POLICY "Student read quizzes"
  ON public.quizzes FOR SELECT TO authenticated
  USING (public.my_student_id() IS NOT NULL);

CREATE POLICY "Teacher full access on quiz_questions"
  ON public.quiz_questions FOR ALL TO authenticated
  USING (public.is_teacher()) WITH CHECK (public.is_teacher());
CREATE POLICY "Student read quiz_questions"
  ON public.quiz_questions FOR SELECT TO authenticated
  USING (public.my_student_id() IS NOT NULL);

CREATE POLICY "Teacher full access on quiz_assignments"
  ON public.quiz_assignments FOR ALL TO authenticated
  USING (public.is_teacher()) WITH CHECK (public.is_teacher());
CREATE POLICY "Student read own quiz_assignments"
  ON public.quiz_assignments FOR SELECT TO authenticated
  USING (student_id = public.my_student_id());

CREATE POLICY "Teacher full access on quiz_attempts"
  ON public.quiz_attempts FOR ALL TO authenticated
  USING (public.is_teacher()) WITH CHECK (public.is_teacher());
CREATE POLICY "Student read own quiz_attempts"
  ON public.quiz_attempts FOR SELECT TO authenticated
  USING (student_id = public.my_student_id());

-- ── 4. class_sessions: correct policies already exist ───────────────────────
-- "Teacher full access on class_sessions" and "Student read own sessions" stay.
DROP POLICY IF EXISTS "Allow all"                   ON public.class_sessions;
DROP POLICY IF EXISTS "Allow all on class_sessions" ON public.class_sessions;

COMMIT;

-- ── Verify (read-only). Expect: no row with roles = {public} except the two
-- "Public read …" storage SELECT policies.
-- select schemaname, tablename, policyname, roles, cmd, qual, with_check
-- from pg_policies
-- where (schemaname = 'public' and tablename in
--         ('class_sessions','quizzes','quiz_questions','quiz_assignments','quiz_attempts'))
--    or (schemaname = 'storage' and tablename = 'objects')
-- order by 1, 2, 3;
