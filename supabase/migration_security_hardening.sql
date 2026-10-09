-- ─────────────────────────────────────────────────────────────────────────────
-- Security Hardening Migration (6-Vector AppSec Audit)
--
-- Remediates:
--   1. [HIGH / BOPLA] `student_hadith_progress` granted `FOR ALL` to students,
--      allowing students to self-mark all 50 Hadiths memorized via PostgREST.
--   2. [HIGH / BOPLA] `student_namaz_steps` blanket `FOR UPDATE` policy allowed
--      students to overwrite `unlocked_at`, `completed_at`, and `revision_count`
--      instead of only `last_viewed_at`.
--   3. [HIGH / Auth Revocation] `public.my_student_id()` and `public.is_teacher()`
--      did not reject JWTs with `app_metadata.login_disabled = true`, allowing
--      suspended sessions to query PostgREST/Realtime until token expiry.
--   4. [MEDIUM / BOPLA] `notifications` blanket `FOR UPDATE` policy allowed
--      recipients to rewrite `title`, `body`, `type`, `link`, and `priority`
--      instead of only `read_at`.
--   5. [MEDIUM / Info Disclosure] `quizzes` and `quiz_questions` student SELECT
--      policies did not filter by `is_published = true`.
--   6. [MEDIUM / Storage XSS] Storage buckets (`media`, `memorization-images`)
--      lacked `allowed_mime_types` and `file_size_limit` restrictions (allowing
--      `image/svg+xml` or `text/html` uploads).
--   7. [LOW / Least Privilege] Revoke `PUBLIC`/`anon` EXECUTE privileges on
--      `SECURITY DEFINER` helpers and add bounds check on `student_para_progress`.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── 1. Harden SECURITY DEFINER identity helpers & sync missing JWT roles ────
UPDATE auth.users u
SET raw_app_meta_data = COALESCE(u.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', p.role)
FROM public.profiles p
WHERE u.id = p.id
  AND (u.raw_app_meta_data ->> 'role') IS DISTINCT FROM p.role;

CREATE OR REPLACE FUNCTION public.is_teacher()
  RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT
      COALESCE((auth.jwt() -> 'app_metadata' ->> 'login_disabled')::boolean, false) = false
      AND (
        COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'teacher'
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role = 'teacher'
        )
      );
$$;

CREATE OR REPLACE FUNCTION public.my_student_id()
  RETURNS uuid
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT CASE
      WHEN COALESCE((auth.jwt() -> 'app_metadata' ->> 'login_disabled')::boolean, false) = true
        THEN NULL::uuid
      ELSE (SELECT student_id FROM public.profiles WHERE id = auth.uid())
    END;
$$;

REVOKE EXECUTE ON FUNCTION public.is_teacher() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_teacher() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.my_student_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_student_id() TO authenticated, service_role;

-- ── 2. Lock down Hadith RLS (remove student FOR ALL write access) ───────────
DROP POLICY IF EXISTS "Anyone can view published hadiths"    ON public.hadiths;
DROP POLICY IF EXISTS "Teachers can manage hadiths"          ON public.hadiths;
DROP POLICY IF EXISTS "Teacher full access on hadiths"       ON public.hadiths;
DROP POLICY IF EXISTS "Student read published hadiths"       ON public.hadiths;

CREATE POLICY "Teacher full access on hadiths"
  ON public.hadiths FOR ALL TO authenticated
  USING (public.is_teacher())
  WITH CHECK (public.is_teacher());

CREATE POLICY "Student read published hadiths"
  ON public.hadiths FOR SELECT TO authenticated
  USING (public.my_student_id() IS NOT NULL AND is_published = true);

DROP POLICY IF EXISTS "Students view own hadith progress"    ON public.student_hadith_progress;
DROP POLICY IF EXISTS "Students manage own hadith progress"  ON public.student_hadith_progress;
DROP POLICY IF EXISTS "Teacher full access on student_hadith_progress" ON public.student_hadith_progress;
DROP POLICY IF EXISTS "Student read own hadith progress"     ON public.student_hadith_progress;

CREATE POLICY "Teacher full access on student_hadith_progress"
  ON public.student_hadith_progress FOR ALL TO authenticated
  USING (public.is_teacher())
  WITH CHECK (public.is_teacher());

CREATE POLICY "Student read own hadith progress"
  ON public.student_hadith_progress FOR SELECT TO authenticated
  USING (student_id = public.my_student_id());

DROP POLICY IF EXISTS "Students view own hadith assignments" ON public.hadith_assignments;
DROP POLICY IF EXISTS "Teachers manage hadith assignments"   ON public.hadith_assignments;
DROP POLICY IF EXISTS "Teacher full access on hadith_assignments" ON public.hadith_assignments;
DROP POLICY IF EXISTS "Student read own hadith assignments"  ON public.hadith_assignments;

CREATE POLICY "Teacher full access on hadith_assignments"
  ON public.hadith_assignments FOR ALL TO authenticated
  USING (public.is_teacher())
  WITH CHECK (public.is_teacher());

CREATE POLICY "Student read own hadith assignments"
  ON public.hadith_assignments FOR SELECT TO authenticated
  USING (student_id = public.my_student_id());

-- ── 3. Column-level immutability trigger on student_namaz_steps ─────────────
-- Students may only update `last_viewed_at` on their own row; teacher-controlled
-- curriculum columns (`unlocked_at`, `completed_at`, `revision_*`) are locked.
CREATE OR REPLACE FUNCTION public.enforce_student_namaz_step_columns()
  RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_setting('role', true) = 'authenticated' AND NOT public.is_teacher() THEN
    NEW.id                   := OLD.id;
    NEW.student_id           := OLD.student_id;
    NEW.step_id              := OLD.step_id;
    NEW.unlocked_at          := OLD.unlocked_at;
    NEW.completed_at         := OLD.completed_at;
    NEW.revision_assigned_at := OLD.revision_assigned_at;
    NEW.last_revised_at      := OLD.last_revised_at;
    NEW.revision_count       := OLD.revision_count;
    NEW.created_at           := OLD.created_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_student_namaz_step_columns ON public.student_namaz_steps;
CREATE TRIGGER trg_enforce_student_namaz_step_columns
  BEFORE UPDATE ON public.student_namaz_steps
  FOR EACH ROW EXECUTE FUNCTION public.enforce_student_namaz_step_columns();

-- ── 4. Column-level immutability trigger on notifications ───────────────────
-- Recipients may only mark notifications read/unread (`read_at`); payload
-- columns (`title`, `body`, `type`, `link`, `priority`, `recipient_id`) cannot
-- be altered from the client.
CREATE OR REPLACE FUNCTION public.enforce_notification_update_columns()
  RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_setting('role', true) = 'authenticated' THEN
    NEW.id           := OLD.id;
    NEW.recipient_id := OLD.recipient_id;
    NEW.type         := OLD.type;
    NEW.title        := OLD.title;
    NEW.body         := OLD.body;
    NEW.link         := OLD.link;
    NEW.priority     := OLD.priority;
    NEW.created_by   := OLD.created_by;
    NEW.created_at   := OLD.created_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_notification_update_columns ON public.notifications;
CREATE TRIGGER trg_enforce_notification_update_columns
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.enforce_notification_update_columns();

-- ── 5. Quizzes & Quiz Questions: restrict student SELECT to published only ──
DROP POLICY IF EXISTS "Student read quizzes"        ON public.quizzes;
DROP POLICY IF EXISTS "Student read quiz_questions" ON public.quiz_questions;

CREATE POLICY "Student read quizzes"
  ON public.quizzes FOR SELECT TO authenticated
  USING (public.my_student_id() IS NOT NULL AND is_published = true);

CREATE POLICY "Student read quiz_questions"
  ON public.quiz_questions FOR SELECT TO authenticated
  USING (
    public.my_student_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.quizzes q
      WHERE q.id = quiz_questions.quiz_id AND q.is_published = true
    )
  );

-- ── 6. Storage buckets: enforce MIME whitelist (no SVG/HTML XSS) & size cap ─
UPDATE storage.buckets
SET
  file_size_limit = 52428800, -- 50 MB
  allowed_mime_types = ARRAY[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'image/heic',
    'image/heif',
    'image/bmp'
  ]
WHERE id IN ('media', 'memorization-images');

DROP POLICY IF EXISTS "Teacher update on memorization-images" ON storage.objects;
CREATE POLICY "Teacher update on memorization-images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'memorization-images' AND public.is_teacher())
  WITH CHECK (bucket_id = 'memorization-images' AND public.is_teacher());

-- ── 7. Range constraint on student_para_progress ────────────────────────────
DO $$
BEGIN
  ALTER TABLE public.student_para_progress
    DROP CONSTRAINT IF EXISTS student_para_progress_bounds_check;
  ALTER TABLE public.student_para_progress
    ADD CONSTRAINT student_para_progress_bounds_check
    CHECK (para_number BETWEEN 0 AND 30 AND last_page >= 1); -- 0 = Qaida sentinel
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END $$;

COMMIT;
