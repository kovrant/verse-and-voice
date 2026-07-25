-- Class days per student (for schedule-aware streaks + next-class countdown).
-- 0 = Sunday … 6 = Saturday (matches JS Date.getDay()).
-- NULL / empty = teacher hasn't set days yet → streak stays hidden until configured.
-- Run in Supabase SQL Editor.

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS class_days smallint[];

COMMENT ON COLUMN students.class_days IS
  'Days of week the student has class: 0=Sun … 6=Sat. Empty/null = not configured.';
