-- ─────────────────────────────────────────────────────────────────────────────
-- Qaida course: the card-based Noorani Qaida that replaces the Qaida PDF.
--
-- Content (units, steps, cards) lives in code: src/content/qaida. Card ids are
-- stable slugs (u3.word.kataba). This migration adds only what the code cannot
-- hold: the teacher's recordings, per-student progress, unit check results,
-- the two "where are we" columns, the unit badges and the audio bucket.
-- See okf/domain/qaida-course.md. Run AFTER migration_class_attendance.sql.
-- Idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Teacher recordings, one per audio key. Keys are shared across cards
--    (the syllable card بَ, the fatha drill grid and the listen exercise all
--    play `syl/ba-a`), so this is keyed by audio_key, not card id.
CREATE TABLE IF NOT EXISTS public.qaida_audio (
  audio_key   text PRIMARY KEY,
  audio_url   text NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.qaida_audio ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teacher full access on qaida_audio" ON public.qaida_audio;
CREATE POLICY "Teacher full access on qaida_audio"
  ON public.qaida_audio FOR ALL TO authenticated
  USING (public.is_teacher()) WITH CHECK (public.is_teacher());

DROP POLICY IF EXISTS "Student read qaida_audio" ON public.qaida_audio;
CREATE POLICY "Student read qaida_audio"
  ON public.qaida_audio FOR SELECT TO authenticated
  USING (public.my_student_id() IS NOT NULL);

-- 2. Per-card mastery. The child may write `seen` / `practising` and the two
--    counters on their own rows; `mastered` / `needs_work` are the teacher's.
CREATE TABLE IF NOT EXISTS public.student_qaida_progress (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  card_id      text NOT NULL,
  status       text NOT NULL DEFAULT 'seen'
               CHECK (status IN ('seen', 'practising', 'mastered', 'needs_work')),
  attempts     int  NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  correct      int  NOT NULL DEFAULT 0 CHECK (correct >= 0 AND correct <= attempts),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  mastered_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, card_id)
);

CREATE INDEX IF NOT EXISTS idx_student_qaida_progress_student
  ON public.student_qaida_progress(student_id);

ALTER TABLE public.student_qaida_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teacher full access on student_qaida_progress" ON public.student_qaida_progress;
CREATE POLICY "Teacher full access on student_qaida_progress"
  ON public.student_qaida_progress FOR ALL TO authenticated
  USING (public.is_teacher()) WITH CHECK (public.is_teacher());

DROP POLICY IF EXISTS "Student read own student_qaida_progress" ON public.student_qaida_progress;
CREATE POLICY "Student read own student_qaida_progress"
  ON public.student_qaida_progress FOR SELECT TO authenticated
  USING (student_id = public.my_student_id());

DROP POLICY IF EXISTS "Student insert own student_qaida_progress" ON public.student_qaida_progress;
CREATE POLICY "Student insert own student_qaida_progress"
  ON public.student_qaida_progress FOR INSERT TO authenticated
  WITH CHECK (
    student_id = public.my_student_id()
    AND status IN ('seen', 'practising')
    AND mastered_at IS NULL
  );

DROP POLICY IF EXISTS "Student update own student_qaida_progress" ON public.student_qaida_progress;
CREATE POLICY "Student update own student_qaida_progress"
  ON public.student_qaida_progress FOR UPDATE TO authenticated
  USING (student_id = public.my_student_id())
  WITH CHECK (student_id = public.my_student_id());

-- Column immutability for the child (same pattern as notifications.read_at):
-- a non-teacher update may touch attempts, correct, last_seen_at, and may move
-- status between `seen` and `practising`. Everything else snaps back to OLD.
CREATE OR REPLACE FUNCTION public.enforce_student_qaida_progress_columns()
  RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_teacher() THEN
    NEW.id          := OLD.id;
    NEW.student_id  := OLD.student_id;
    NEW.card_id     := OLD.card_id;
    NEW.mastered_at := OLD.mastered_at;
    NEW.created_at  := OLD.created_at;
    IF OLD.status IN ('mastered', 'needs_work') OR NEW.status NOT IN ('seen', 'practising') THEN
      NEW.status := OLD.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_student_qaida_progress_columns ON public.student_qaida_progress;
CREATE TRIGGER trg_enforce_student_qaida_progress_columns
  BEFORE UPDATE ON public.student_qaida_progress
  FOR EACH ROW EXECUTE FUNCTION public.enforce_student_qaida_progress_columns();

-- 3. Unit check results. One row per attempt; the latest passed row for unit N
--    unlocks unit N+1 for the child's self-practice.
CREATE TABLE IF NOT EXISTS public.student_qaida_checks (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  unit       smallint NOT NULL CHECK (unit BETWEEN 1 AND 10),
  score      smallint NOT NULL CHECK (score >= 0),
  total      smallint NOT NULL CHECK (total > 0 AND score <= total),
  passed     boolean NOT NULL,
  note       text,
  checked_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_qaida_checks_student
  ON public.student_qaida_checks(student_id, unit);

ALTER TABLE public.student_qaida_checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teacher full access on student_qaida_checks" ON public.student_qaida_checks;
CREATE POLICY "Teacher full access on student_qaida_checks"
  ON public.student_qaida_checks FOR ALL TO authenticated
  USING (public.is_teacher()) WITH CHECK (public.is_teacher());

DROP POLICY IF EXISTS "Student read own student_qaida_checks" ON public.student_qaida_checks;
CREATE POLICY "Student read own student_qaida_checks"
  ON public.student_qaida_checks FOR SELECT TO authenticated
  USING (student_id = public.my_student_id());

-- 4. Where the child is in the course, and where a Qaida class ended.
--    Null qaida_card_id means the start of Unit 1. Existing student policies
--    (teacher full, student read own) already cover the new column.
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS qaida_card_id text;

ALTER TABLE public.class_sessions
  ADD COLUMN IF NOT EXISTS ending_card_id text;

-- 5. Unit badges. `qaida_complete` already exists (migration_achievements_module.sql)
--    and is awarded on the Unit 10 check.
INSERT INTO public.achievement_definitions (slug, domain, kind, title, description, issues_certificate)
SELECT
  'qaida_unit_' || lpad(n::text, 2, '0'),
  'qaida',
  'badge',
  'Qaida Unit ' || n,
  'Passed the check for Unit ' || n || ' of the Noorani Qaida course',
  false
FROM generate_series(1, 10) AS n
ON CONFLICT (slug) DO NOTHING;

-- 6. Public `qaida-audio` bucket: teacher-only write, audio types, 10 MB.
--    Same shape as namaz-audio (migration_namaz_audio.sql). Objects are named
--    `<audio-key-slug>-<timestamp>.<ext>` and never overwritten.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'qaida-audio',
  'qaida-audio',
  true,
  10485760,
  ARRAY['audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/aac', 'audio/wav']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read qaida-audio" ON storage.objects;
CREATE POLICY "Public read qaida-audio"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'qaida-audio');

DROP POLICY IF EXISTS "Teacher upload on qaida-audio" ON storage.objects;
CREATE POLICY "Teacher upload on qaida-audio"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'qaida-audio' AND public.is_teacher());

DROP POLICY IF EXISTS "Teacher update on qaida-audio" ON storage.objects;
CREATE POLICY "Teacher update on qaida-audio"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'qaida-audio' AND public.is_teacher())
  WITH CHECK (bucket_id = 'qaida-audio' AND public.is_teacher());

DROP POLICY IF EXISTS "Teacher delete on qaida-audio" ON storage.objects;
CREATE POLICY "Teacher delete on qaida-audio"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'qaida-audio' AND public.is_teacher());
