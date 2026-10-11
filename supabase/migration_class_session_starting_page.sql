-- Page each class opened on, so the monthly parent report can count pages read
-- exactly (ending_page alone only gives an estimate). Nullable: older sessions
-- don't have it. The app saves without it if this hasn't been applied yet.
-- Idempotent.

ALTER TABLE public.class_sessions
  ADD COLUMN IF NOT EXISTS starting_page integer CHECK (starting_page >= 1);
