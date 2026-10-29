-- Add an optional boy/girl field to students.
-- Picks the teacher portal's student avatar (boy-N / girl-N). NULL = not set
-- yet, shown with a neutral avatar. Nothing in the student portal reads it.

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('boy', 'girl'));
