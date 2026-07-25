-- One-time backfill: mark all pre-existing students' historical fees as paid.
-- Rationale: the app was built after these students had already been paying,
-- so every month from started_at up to (but not including) the current month
-- is considered already settled. The current month is left untouched so it can
-- be marked manually as normal.
--
-- Safe to re-run: existing paid rows keep their original paid_at; only missing
-- or still-unpaid historical rows are created/flipped to paid.
-- Run this in the Supabase SQL Editor.

INSERT INTO fee_payments (student_id, month, year, is_paid, paid_at)
SELECT
  s.id,
  EXTRACT(MONTH FROM gs)::int,
  EXTRACT(YEAR FROM gs)::int,
  true,
  now()
FROM students s
CROSS JOIN LATERAL generate_series(
  date_trunc('month', s.started_at),
  LEAST(
    -- last fully-elapsed month
    date_trunc('month', CURRENT_DATE) - interval '1 month',
    -- never past a departed student's end month
    date_trunc('month', COALESCE(s.ended_at, CURRENT_DATE))
  ),
  interval '1 month'
) AS gs
ON CONFLICT (student_id, month, year) DO UPDATE
  SET is_paid = true,
      paid_at = COALESCE(fee_payments.paid_at, now())
  WHERE fee_payments.is_paid = false;
