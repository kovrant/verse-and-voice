-- Student Portal: roles, student↔auth link, and role-scoped RLS.
-- Run this in the Supabase SQL Editor AFTER migration_auth_rls.sql.
--
-- Model:
--   * Every auth user has a row in `profiles` with a role ('teacher' | 'student').
--   * A student profile links to exactly one `students` row via `student_id`.
--   * Teachers get full access (as before); students get READ-ONLY access to
--     only their own rows.
--   * `role` is also mirrored into auth.users.raw_app_meta_data so the Next.js
--     middleware can read it straight from the JWT without a DB round-trip.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Profiles table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('teacher', 'student')),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  username text UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- One auth account per student.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_student_id_key
  ON profiles(student_id) WHERE student_id IS NOT NULL;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Helper functions (SECURITY DEFINER so they bypass RLS on `profiles`
--    and never cause recursive policy evaluation).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_teacher()
  RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'teacher'
    );
$$;

CREATE OR REPLACE FUNCTION public.my_student_id()
  RETURNS uuid
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT student_id FROM public.profiles WHERE id = auth.uid();
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RLS on profiles
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Own profile read" ON profiles;
DROP POLICY IF EXISTS "Teacher manage profiles" ON profiles;

CREATE POLICY "Own profile read"
  ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Teacher manage profiles"
  ON profiles FOR ALL TO authenticated
  USING (is_teacher()) WITH CHECK (is_teacher());

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Replace the blanket "Authenticated full access" policies with
--    teacher-full + student-read-own.
-- ─────────────────────────────────────────────────────────────────────────────

-- students -------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated full access on students" ON students;
CREATE POLICY "Teacher full access on students"
  ON students FOR ALL TO authenticated
  USING (is_teacher()) WITH CHECK (is_teacher());
CREATE POLICY "Student read own record"
  ON students FOR SELECT TO authenticated
  USING (id = my_student_id());

-- quran_rounds ---------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated full access on quran_rounds" ON quran_rounds;
CREATE POLICY "Teacher full access on quran_rounds"
  ON quran_rounds FOR ALL TO authenticated
  USING (is_teacher()) WITH CHECK (is_teacher());
CREATE POLICY "Student read own quran_rounds"
  ON quran_rounds FOR SELECT TO authenticated
  USING (student_id = my_student_id());

-- student_memorization -------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated full access on student_memorization" ON student_memorization;
CREATE POLICY "Teacher full access on student_memorization"
  ON student_memorization FOR ALL TO authenticated
  USING (is_teacher()) WITH CHECK (is_teacher());
CREATE POLICY "Student read own memorization"
  ON student_memorization FOR SELECT TO authenticated
  USING (student_id = my_student_id());

-- fee_payments ---------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated full access on fee_payments" ON fee_payments;
CREATE POLICY "Teacher full access on fee_payments"
  ON fee_payments FOR ALL TO authenticated
  USING (is_teacher()) WITH CHECK (is_teacher());
CREATE POLICY "Student read own fees"
  ON fee_payments FOR SELECT TO authenticated
  USING (student_id = my_student_id());

-- class_sessions -------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated full access on class_sessions" ON class_sessions;
CREATE POLICY "Teacher full access on class_sessions"
  ON class_sessions FOR ALL TO authenticated
  USING (is_teacher()) WITH CHECK (is_teacher());
CREATE POLICY "Student read own sessions"
  ON class_sessions FOR SELECT TO authenticated
  USING (student_id = my_student_id());

-- memorization_catalog (shared reference — students read all) -----------------
DROP POLICY IF EXISTS "Authenticated full access on memorization_catalog" ON memorization_catalog;
CREATE POLICY "Teacher full access on memorization_catalog"
  ON memorization_catalog FOR ALL TO authenticated
  USING (is_teacher()) WITH CHECK (is_teacher());
CREATE POLICY "Student read catalog"
  ON memorization_catalog FOR SELECT TO authenticated
  USING (my_student_id() IS NOT NULL);

-- media_library (shared reference — students read all) ------------------------
DROP POLICY IF EXISTS "Authenticated full access on media_library" ON media_library;
CREATE POLICY "Teacher full access on media_library"
  ON media_library FOR ALL TO authenticated
  USING (is_teacher()) WITH CHECK (is_teacher());
CREATE POLICY "Student read media"
  ON media_library FOR SELECT TO authenticated
  USING (my_student_id() IS NOT NULL);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Storage: students may READ memorization images, only teachers may write.
--    (The "Auth read on memorization-images" SELECT policy from
--     migration_auth_rls.sql already allows all authenticated users to read.)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Auth upload on memorization-images" ON storage.objects;
DROP POLICY IF EXISTS "Auth update on memorization-images" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete on memorization-images" ON storage.objects;

CREATE POLICY "Teacher upload on memorization-images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'memorization-images' AND is_teacher());
CREATE POLICY "Teacher update on memorization-images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'memorization-images' AND is_teacher());
CREATE POLICY "Teacher delete on memorization-images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'memorization-images' AND is_teacher());

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. ONE-TIME: promote the existing teacher account.
--    Replace the email below with the teacher's login email, then run this
--    block once. (Student accounts are created by the app and get their role
--    set automatically.)
-- ─────────────────────────────────────────────────────────────────────────────
-- UPDATE auth.users
--   SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role":"teacher"}'::jsonb
--   WHERE email = 'REPLACE_WITH_TEACHER_EMAIL';
--
-- INSERT INTO profiles (id, role)
--   SELECT id, 'teacher' FROM auth.users WHERE email = 'REPLACE_WITH_TEACHER_EMAIL'
--   ON CONFLICT (id) DO UPDATE SET role = 'teacher';
