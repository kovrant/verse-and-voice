-- Class attendance: one explicit status per student per PKT class date.
-- See okf/domain/class-attendance.md. Idempotent.
--
-- present         the class happened (also written automatically when a class is saved)
-- student_absent  the teacher was there, the student didn't come
-- teacher_absent  the teacher couldn't teach (never counts against the student)
-- holiday         planned day off (not counted either way)
--
-- A class_sessions row with no mark still reads as present in the app.
-- UNIQUE (student_id, class_date) already provides the lookup index.

CREATE TABLE IF NOT EXISTS public.class_attendance (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_date  date NOT NULL,
  status      text NOT NULL
              CHECK (status IN ('present', 'student_absent', 'teacher_absent', 'holiday')),
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  CONSTRAINT class_attendance_student_date_key UNIQUE (student_id, class_date)
);

ALTER TABLE public.class_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teacher full access on class_attendance" ON public.class_attendance;
CREATE POLICY "Teacher full access on class_attendance"
  ON public.class_attendance
  FOR ALL
  TO authenticated
  USING (is_teacher())
  WITH CHECK (is_teacher());

DROP POLICY IF EXISTS "Student read own class_attendance" ON public.class_attendance;
CREATE POLICY "Student read own class_attendance"
  ON public.class_attendance
  FOR SELECT
  TO authenticated
  USING (student_id = my_student_id());
